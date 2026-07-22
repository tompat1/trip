const NOMINATIM_SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIDATA_ENTITY_DATA = "https://www.wikidata.org/wiki/Special:EntityData/";

const KNOWN_ALIAS_GROUPS = [
  ["heraklion", "iraklio", "iraklion", "ηράκλειο", "ηρακλειο"],
  ["rethymno", "rethymnon", "rethimno", "réthymnon", "ρέθυμνο", "ρεθυμνο"],
];

export async function resolveLocationContext(input = {}) {
  const { coordinates, accuracyMeters, nominatimData, fetchImpl = fetch } = input;
  const [latitude, longitude] = coordinates || [nominatimData?.lat, nominatimData?.lon].map(Number);
  const address = nominatimData?.address || {};
  const namedetails = nominatimData?.namedetails || {};
  const extratags = nominatimData?.extratags || {};
  const primaryName = getPrimaryLocationName(address, nominatimData);
  const wikidataId = normalizeWikidataId(extratags.wikidata);
  const wikidata = wikidataId
    ? await fetchWikidataEntity(wikidataId, fetchImpl).catch(() => null)
    : await findWikidataByName(primaryName, fetchImpl).catch(() => null);
  const aliases = buildPlaceAliases({
    canonicalName: primaryName,
    localName: namedetails.name || namedetails["name:el"] || address.city || address.town || "",
    namedetails,
    wikidata,
    address,
  });
  const countryCode = String(address.country_code || "").toUpperCase();

  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
    countryCode,
    countryName: address.country || "",
    region: address.state || address.region || address.county || "",
    county: address.county || "",
    municipality: address.municipality || address.city || address.town || "",
    locality: address.city || address.town || address.village || address.suburb || "",
    neighbourhood: address.neighbourhood || address.suburb || address.city_district || "",
    postcode: address.postcode || "",
    timezone: "",
    primaryLanguage: inferPrimaryLanguage(countryCode),
    localLanguages: inferLocalLanguages(countryCode),
    confidence: getLocationConfidence(nominatimData, accuracyMeters),
    matchLevel: getLocationMatchLevel(nominatimData),
    sourceIds: [
      nominatimData?.osm_type && nominatimData?.osm_id ? `osm:${nominatimData.osm_type}:${nominatimData.osm_id}` : "",
      wikidata?.id ? `wikidata:${wikidata.id}` : "",
    ].filter(Boolean),
    place: createResolvedPlaceIdentity({
      canonicalName: primaryName,
      localName: namedetails["name:el"] || namedetails.name || "",
      aliases,
      latitude,
      longitude,
      countryCode,
      region: address.state || address.region || address.county || "",
      municipality: address.municipality || address.city || address.town || "",
      osmType: nominatimData?.osm_type || "",
      osmId: nominatimData?.osm_id || "",
      wikidataId: wikidata?.id || wikidataId || "",
      wikipediaUrl: getWikipediaUrl(extratags, wikidata),
      officialWebsite: extratags.website || extratags.url || "",
      categories: [nominatimData?.category, nominatimData?.type].filter(Boolean),
    }),
  };
}

export async function resolvePlaceIdentity(input = {}) {
  const fetchImpl = input.fetchImpl || fetch;
  const osmTags = input.osmTags || input.tags || {};
  const coordinates = input.coordinates || [];
  const canonicalName = input.canonicalName || input.title || osmTags["name:en"] || osmTags.name || "";
  const wikidataId = normalizeWikidataId(input.wikidataId || osmTags.wikidata);
  const wikidata = wikidataId
    ? await fetchWikidataEntity(wikidataId, fetchImpl).catch(() => null)
    : await findWikidataByName(canonicalName, fetchImpl).catch(() => null);
  const aliases = buildPlaceAliases({
    canonicalName,
    localName: input.localName || osmTags["name:el"] || osmTags.name || "",
    namedetails: osmTags,
    wikidata,
  });

  return createResolvedPlaceIdentity({
    canonicalName,
    localName: input.localName || osmTags["name:el"] || "",
    aliases,
    latitude: coordinates[0],
    longitude: coordinates[1],
    countryCode: input.countryCode || "",
    region: input.region || "",
    municipality: input.municipality || "",
    osmType: input.osmType || "",
    osmId: input.osmId || "",
    wikidataId: wikidata?.id || wikidataId || "",
    wikipediaUrl: getWikipediaUrl(osmTags, wikidata),
    officialWebsite: input.officialWebsite || osmTags.website || "",
    categories: input.categories || [],
  });
}

export async function lookupNominatimPlace(query, options = {}) {
  if (!query) return null;
  const url = new URL(NOMINATIM_SEARCH_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("accept-language", options.language || "en");

  const response = await fetchWithTimeout(url, options.fetchImpl || fetch, options.timeoutMs || 8000);
  if (!response.ok) return null;
  const [match] = await response.json();
  return match || null;
}

export function buildPlaceAliases(input = {}) {
  const rawAliases = [
    input.canonicalName,
    input.localName,
    input.address?.city,
    input.address?.town,
    input.address?.village,
    input.address?.municipality,
    ...Object.entries(input.namedetails || {})
      .filter(([key]) => key === "name" || key.startsWith("name:") || key.includes("alt_name"))
      .map(([, value]) => value),
    ...getWikidataAliases(input.wikidata),
  ];
  const aliases = dedupeAliases(rawAliases);
  return expandKnownAliases(aliases);
}

export function createResolvedPlaceIdentity(input = {}) {
  const canonicalName = cleanPlaceName(input.canonicalName || input.localName || "Unknown place");
  const aliases = expandKnownAliases(dedupeAliases([canonicalName, input.localName, ...(input.aliases || [])]));
  return {
    id: makeInternalPlaceId({
      wikidataId: input.wikidataId,
      osmType: input.osmType,
      osmId: input.osmId,
      canonicalName,
      latitude: input.latitude,
      longitude: input.longitude,
    }),
    canonicalName,
    localName: cleanPlaceName(input.localName || ""),
    aliases,
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    countryCode: input.countryCode || "",
    region: cleanPlaceName(input.region || ""),
    municipality: cleanPlaceName(input.municipality || ""),
    osmType: normalizeOsmType(input.osmType),
    osmId: input.osmId ? String(input.osmId) : "",
    wikidataId: normalizeWikidataId(input.wikidataId),
    wikipediaUrl: input.wikipediaUrl || "",
    officialWebsite: input.officialWebsite || "",
    categories: [...new Set((input.categories || []).filter(Boolean).map(String))],
  };
}

export function areAliasesEquivalent(a = "", b = "") {
  const normalizedA = normalizeAlias(a);
  const normalizedB = normalizeAlias(b);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;
  return KNOWN_ALIAS_GROUPS.some((group) => group.includes(normalizedA) && group.includes(normalizedB));
}

async function findWikidataByName(name, fetchImpl) {
  if (!name) return null;
  const url = new URL(WIKIDATA_API);
  url.searchParams.set("origin", "*");
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en");
  url.searchParams.set("uselang", "en");
  url.searchParams.set("limit", "1");
  url.searchParams.set("search", name);

  const response = await fetchWithTimeout(url, fetchImpl, 8000);
  if (!response.ok) return null;
  const data = await response.json();
  const match = data.search?.[0];
  return match?.id ? fetchWikidataEntity(match.id, fetchImpl) : null;
}

async function fetchWikidataEntity(id, fetchImpl) {
  const entityId = normalizeWikidataId(id);
  if (!entityId) return null;
  const response = await fetchWithTimeout(`${WIKIDATA_ENTITY_DATA}${entityId}.json`, fetchImpl, 8000);
  if (!response.ok) return null;
  const data = await response.json();
  const entity = data.entities?.[entityId];
  return entity ? { id: entityId, entity } : null;
}

async function fetchWithTimeout(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { headers: { Accept: "application/json" }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function getPrimaryLocationName(address = {}, data = {}) {
  return cleanPlaceName(address.city || address.town || address.village || address.suburb || address.municipality || (data.display_name || "").split(",")[0] || "Current location");
}

function getLocationConfidence(data, accuracyMeters) {
  const accuracyScore = Number.isFinite(Number(accuracyMeters)) ? Math.max(0, Math.min(1, 1 - Number(accuracyMeters) / 5000)) : 0.65;
  const sourceScore = data?.osm_id ? 0.25 : 0;
  const nameScore = data?.display_name ? 0.1 : 0;
  return Math.max(0.2, Math.min(1, accuracyScore * 0.65 + sourceScore + nameScore));
}

function getLocationMatchLevel(data = {}) {
  if (["amenity", "tourism", "historic", "shop"].includes(data.category)) return "exact-poi";
  if (["city", "town", "village", "suburb"].includes(data.type)) return "exact-locality";
  if (data.address?.city || data.address?.town || data.address?.village) return "nearby-locality";
  if (data.address?.state || data.address?.country) return "regional-context";
  return "coordinates-only";
}

function getWikipediaUrl(tags = {}, wikidata) {
  if (tags.wikipedia) {
    const [language, title] = String(tags.wikipedia).split(":");
    if (language && title) return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  }
  const sitelinks = wikidata?.entity?.sitelinks || {};
  const page = sitelinks.enwiki || sitelinks.elwiki;
  return page?.url || "";
}

function getWikidataAliases(wikidata) {
  const entity = wikidata?.entity;
  if (!entity) return [];
  const labels = Object.values(entity.labels || {}).map((label) => label.value);
  const aliases = Object.values(entity.aliases || {}).flatMap((list) => list.map((item) => item.value));
  return [...labels, ...aliases];
}

function expandKnownAliases(aliases) {
  const normalized = new Set(aliases.map(normalizeAlias).filter(Boolean));
  const expanded = [...aliases];
  KNOWN_ALIAS_GROUPS.forEach((group) => {
    if (group.some((alias) => normalized.has(alias))) expanded.push(...group);
  });
  return dedupeAliases(expanded);
}

function dedupeAliases(values = []) {
  const seen = new Set();
  return values
    .map(cleanPlaceName)
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeAlias(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeAlias(value = "") {
  return cleanPlaceName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanPlaceName(value = "") {
  return String(value || "")
    .replace(/^municipal unit of\s+/i, "")
    .replace(/^municipality of\s+/i, "")
    .replace(/\bmunicipal unit\b/gi, "city")
    .replace(/\bmunicipality\b/gi, "city")
    .replace(/\s+/g, " ")
    .trim();
}

function makeInternalPlaceId(input = {}) {
  if (input.wikidataId) return `wd-${normalizeWikidataId(input.wikidataId).toLowerCase()}`;
  if (input.osmType && input.osmId) return `osm-${normalizeOsmType(input.osmType)}-${input.osmId}`;
  const lat = Number.isFinite(Number(input.latitude)) ? Number(input.latitude).toFixed(4) : "";
  const lng = Number.isFinite(Number(input.longitude)) ? Number(input.longitude).toFixed(4) : "";
  return `place-${slugify([input.canonicalName, lat, lng].filter(Boolean).join("-"))}`;
}

function normalizeOsmType(value = "") {
  const type = String(value || "").toLowerCase();
  if (["node", "way", "relation"].includes(type)) return type;
  return type;
}

function normalizeWikidataId(value = "") {
  const match = String(value || "").match(/Q\d+/i);
  return match ? match[0].toUpperCase() : "";
}

function inferPrimaryLanguage(countryCode) {
  if (countryCode === "GR") return "el";
  return "en";
}

function inferLocalLanguages(countryCode) {
  if (countryCode === "GR") return ["el", "en"];
  return ["en"];
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

