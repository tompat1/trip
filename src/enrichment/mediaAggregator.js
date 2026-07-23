const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const WIKIDATA_ENTITY_DATA = "https://www.wikidata.org/wiki/Special:EntityData/";
const OPENVERSE_IMAGES_API = "https://api.openverse.org/v1/images/";

export async function enrichPlaceMedia(place, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const providerStatus = [];
  const commons = await runProvider("commons", providerStatus, () => searchCommonsMedia(place, fetchImpl));
  const openverse = await runProvider("openverse", providerStatus, () => searchOpenverseMedia(place, fetchImpl));
  const candidates = dedupeImages([...(commons || []), ...(openverse || [])])
    .map((image) => rankImageCandidate(image, place))
    .filter((image) => !image.rejected)
    .sort((a, b) => b.finalScore - a.finalScore);
  const hero =
    candidates.find((image) => image.visualRole === "hero" && image.finalScore >= 68 && !image.illustrativeOnly) ||
    candidates.find((image) => image.finalScore >= 62 && image.relevanceScore >= 0.35) ||
    candidates.find((image) => image.finalScore >= 70 && image.exactLocation && image.distanceMeters <= getNearbyImageRadius(place)) ||
    createDesignedFallbackImage(place);
  const gallery = candidates.filter((image) => image.id !== hero.id).slice(0, 8);

  return {
    hero,
    gallery,
    roles: groupImagesByRole([hero, ...gallery]),
    attributions: [hero, ...gallery].filter((image) => image.sourcePageUrl).map((image) => ({
      imageId: image.id,
      text: image.attributionText || image.creatorName || image.provider,
      sourcePageUrl: image.sourcePageUrl,
      licenseUrl: image.licenseUrl || "",
    })),
    coverage: {
      images: hero.illustrativeOnly ? "fallback" : gallery.length ? "complete" : "partial",
    },
    providerStatus,
    generatedAt: new Date().toISOString(),
    refreshAfter: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
}

export function calculateImageScore(input) {
  const score =
    input.exactNameMatch * 30 +
    input.geotagDistanceScore * 25 +
    input.landmarkMatch * 15 +
    input.sourceTrust * 10 +
    input.resolutionScore * 8 +
    input.aspectFit * 5 +
    input.visualQuality * 5 +
    input.recencyScore * 2 -
    input.duplicatePenalty * 30 -
    input.genericStockPenalty * 20 -
    input.possibleMismatch * 50;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function dedupeImages(images = []) {
  const seen = new Map();
  images.forEach((image) => {
    if (!image?.imageUrl || !image.sourcePageUrl) return;
    const key = [image.provider, image.providerId || "", normalizeUrl(image.sourcePageUrl), normalizeUrl(image.imageUrl)].join("|");
    const existing = seen.get(key);
    if (!existing || getLongEdge(image) > getLongEdge(existing)) seen.set(key, image);
  });
  return [...seen.values()];
}

async function runProvider(provider, providerStatus, fn) {
  const startedAt = performance.now?.() || Date.now();
  try {
    const result = await fn();
    providerStatus.push({
      provider,
      status: "ok",
      latencyMs: Math.round((performance.now?.() || Date.now()) - startedAt),
      count: result.length,
    });
    return result;
  } catch (error) {
    providerStatus.push({
      provider,
      status: "error",
      latencyMs: Math.round((performance.now?.() || Date.now()) - startedAt),
      error: error?.name === "AbortError" ? "timeout" : "provider-error",
    });
    return [];
  }
}

async function searchCommonsMedia(place, fetchImpl) {
  const strategies = [
    ...await getCommonsFromWikidata(place, fetchImpl),
    ...await searchCommonsGeosearch(place, fetchImpl),
    ...await searchCommonsText(place, fetchImpl),
  ];
  return dedupeImages(strategies);
}

async function getCommonsFromWikidata(place, fetchImpl) {
  const wikidataId = place.wikidataId || place.identity?.wikidataId;
  if (!wikidataId) return [];
  const response = await fetchWithTimeout(`${WIKIDATA_ENTITY_DATA}${wikidataId}.json`, fetchImpl, 8000);
  if (!response.ok) return [];
  const data = await response.json();
  const entity = data.entities?.[wikidataId];
  const claims = entity?.claims || {};
  const p18 = claims.P18?.[0]?.mainsnak?.datavalue?.value;
  const p373 = claims.P373?.[0]?.mainsnak?.datavalue?.value;
  const files = [];
  if (p18) files.push(...await searchCommonsText({ ...place, mediaQueries: [`File:${p18}`] }, fetchImpl, { sourceTrust: 0.92, visualRole: "hero" }));
  if (p373) files.push(...await searchCommonsText({ ...place, mediaQueries: [`incategory:"${p373}"`] }, fetchImpl, { sourceTrust: 0.88 }));
  return files;
}

async function searchCommonsGeosearch(place, fetchImpl) {
  if (!Array.isArray(place.coordinates)) return [];
  const [lat, lng] = place.coordinates;
  const url = new URL(COMMONS_API);
  url.searchParams.set("origin", "*");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "geosearch");
  url.searchParams.set("ggsprimary", "all");
  url.searchParams.set("ggsnamespace", "6");
  url.searchParams.set("ggsradius", "5000");
  url.searchParams.set("ggscoord", `${lat}|${lng}`);
  url.searchParams.set("ggslimit", "30");
  url.searchParams.set("prop", "imageinfo|coordinates");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "1600");

  const response = await fetchWithTimeout(url, fetchImpl, 9000);
  if (!response.ok) return [];
  const data = await response.json();
  return normalizeCommonsPages(Object.values(data.query?.pages || {}), place, { sourceTrust: 0.95 });
}

async function searchCommonsText(place, fetchImpl, defaults = {}) {
  const queries = getMediaQueries(place);
  const all = [];
  for (const query of queries.slice(0, 5)) {
    const url = new URL(COMMONS_API);
    url.searchParams.set("origin", "*");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "12");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("prop", "imageinfo|coordinates");
    url.searchParams.set("iiprop", "url|size|mime|extmetadata");
    url.searchParams.set("iiurlwidth", "1600");

    const response = await fetchWithTimeout(url, fetchImpl, 9000);
    if (!response.ok) continue;
    const data = await response.json();
    all.push(...normalizeCommonsPages(Object.values(data.query?.pages || {}), place, defaults));
  }
  return all;
}

async function searchOpenverseMedia(place, fetchImpl) {
  const queries = getMediaQueries(place).slice(0, 3);
  const all = [];
  for (const query of queries) {
    const url = new URL(OPENVERSE_IMAGES_API);
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", "10");
    url.searchParams.set("mature", "false");

    const response = await fetchWithTimeout(url, fetchImpl, 9000);
    if (!response.ok) continue;
    const data = await response.json();
    all.push(...(data.results || []).map((result) => normalizeOpenverseImage(result, place)));
  }
  return all;
}

function normalizeCommonsPages(pages, place, defaults = {}) {
  return pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.url || !/^image\//.test(info.mime || "")) return null;
      const metadata = info.extmetadata || {};
      const width = Number(info.width || 0);
      const height = Number(info.height || 0);
      const sourcePageUrl = info.descriptionurl || "";
      return {
        id: `commons-${page.pageid}`,
        placeId: place.id || place.identity?.id || "",
        provider: "commons",
        providerId: String(page.pageid || page.title || ""),
        imageUrl: info.url,
        thumbnailUrl: info.thumburl || info.url,
        sourcePageUrl,
        creatorName: stripHtml(metadata.Artist?.value || metadata.Credit?.value || ""),
        creatorUrl: "",
        licenseCode: metadata.LicenseShortName?.value || "",
        licenseName: metadata.License?.value || metadata.UsageTerms?.value || "",
        licenseUrl: metadata.LicenseUrl?.value || "",
        attributionText: stripHtml(metadata.Attribution?.value || metadata.Credit?.value || metadata.Artist?.value || "Wikimedia Commons"),
        width,
        height,
        aspectRatio: width && height ? width / height : 0,
        exactLocation: Boolean(page.coordinates?.length),
        approximateLocation: !page.coordinates?.length,
        illustrativeOnly: false,
        latitude: page.coordinates?.[0]?.lat,
        longitude: page.coordinates?.[0]?.lon,
        subjects: getImageSubjects(page.title, place),
        visualRole: defaults.visualRole || inferVisualRole(place, width, height),
        sourceTrust: defaults.sourceTrust || 0.88,
        checkedAt: new Date().toISOString(),
        reviewStatus: "pending",
        rawTitle: page.title || "",
      };
    })
    .filter(Boolean);
}

function normalizeOpenverseImage(result, place) {
  const width = Number(result.width || 0);
  const height = Number(result.height || 0);
  return {
    id: `openverse-${result.id}`,
    placeId: place.id || place.identity?.id || "",
    provider: "openverse",
    providerId: result.id || "",
    imageUrl: result.url || result.thumbnail || "",
    thumbnailUrl: result.thumbnail || result.url || "",
    sourcePageUrl: result.foreign_landing_url || result.url || "",
    creatorName: result.creator || "",
    creatorUrl: result.creator_url || "",
    licenseCode: result.license || "",
    licenseName: result.license || "",
    licenseUrl: result.license_url || "",
    attributionText: [result.creator, result.source, result.license].filter(Boolean).join(" · "),
    width,
    height,
    aspectRatio: width && height ? width / height : 0,
    exactLocation: false,
    approximateLocation: true,
    illustrativeOnly: false,
    subjects: getImageSubjects(result.title, place),
    visualRole: inferVisualRole(place, width, height),
    sourceTrust: 0.78,
    checkedAt: new Date().toISOString(),
    reviewStatus: "pending",
    rawTitle: result.title || "",
  };
}

function rankImageCandidate(image, place) {
  const longEdge = getLongEdge(image);
  const aspect = image.aspectRatio || (image.width && image.height ? image.width / image.height : 0);
  const exactNameMatch = getNameMatchScore(image.rawTitle || image.sourcePageUrl, place);
  const distanceMeters = getImageDistanceMeters(image, place);
  const nearbyRadius = getNearbyImageRadius(place);
  const weakNameMatch = exactNameMatch < 0.25;
  const possibleMismatch = weakNameMatch && (!image.exactLocation || distanceMeters > nearbyRadius) ? 1 : 0;
  const genericStockPenalty = isGenericRegionalImage(image, place) ? 1 : 0;
  const rejectionReason = getHardRejectionReason(image, longEdge, { weakNameMatch, distanceMeters, nearbyRadius });
  const finalScore = calculateImageScore({
    exactNameMatch,
    geotagDistanceScore: getGeotagDistanceScore(distanceMeters, image.exactLocation),
    landmarkMatch: exactNameMatch,
    sourceTrust: image.sourceTrust || 0.7,
    resolutionScore: Math.min(1, longEdge / 1800),
    aspectFit: aspect >= 1.35 && aspect <= 2.3 ? 1 : 0.35,
    visualQuality: 0.75,
    recencyScore: 0.3,
    duplicatePenalty: 0,
    genericStockPenalty,
    possibleMismatch,
  });

  return {
    ...image,
    visualRole: image.visualRole === "hero" || (aspect >= 1.35 && aspect <= 2.3 && longEdge >= 1400) ? "hero" : image.visualRole,
    relevanceScore: exactNameMatch,
    qualityScore: Math.min(1, longEdge / 1800),
    editorialScore: finalScore / 100,
    finalScore,
    distanceMeters,
    rejected: Boolean(rejectionReason),
    rejectionReason,
    illustrativeOnly: image.illustrativeOnly || genericStockPenalty > 0,
    approximateLocation: !image.exactLocation,
  };
}

function createDesignedFallbackImage(place) {
  return {
    id: `fallback-${place.id || place.identity?.id || "place"}`,
    placeId: place.id || place.identity?.id || "",
    provider: "editorial",
    providerId: "designed-fallback",
    imageUrl: "",
    thumbnailUrl: "",
    sourcePageUrl: "",
    creatorName: "Trip Planner Deluxe",
    creatorUrl: "",
    licenseCode: "",
    licenseName: "Designed fallback",
    licenseUrl: "",
    attributionText: "Designed fallback, no external photo available",
    width: 0,
    height: 0,
    aspectRatio: 0,
    exactLocation: false,
    approximateLocation: false,
    illustrativeOnly: true,
    subjects: [place.category || place.tag || "place"],
    visualRole: "hero",
    relevanceScore: 0,
    qualityScore: 0,
    editorialScore: 0,
    finalScore: 0,
    checkedAt: new Date().toISOString(),
    reviewStatus: "pending",
  };
}

function getMediaQueries(place) {
  if (Array.isArray(place.mediaQueries) && place.mediaQueries.length) return place.mediaQueries;
  const title = place.identity?.canonicalName || place.canonicalName || place.title || "";
  const aliases = place.identity?.aliases || place.aliases || [];
  const area = place.area || place.identity?.municipality || "";
  return [
    [title, area].filter(Boolean).join(" "),
    [title, "Crete"].filter(Boolean).join(" "),
    ...aliases.slice(0, 4).map((alias) => [alias, area || "Crete"].filter(Boolean).join(" ")),
    title,
  ].filter(Boolean).filter((query, index, all) => all.indexOf(query) === index);
}

function getImageSubjects(title = "", place = {}) {
  return normalizeText([title, place.category, place.tag].filter(Boolean).join(" "))
    .split(" ")
    .filter((token) => token.length > 3)
    .slice(0, 10);
}

function getNameMatchScore(value = "", place = {}) {
  const haystack = normalizeText(value);
  const aliases = [place.title, place.canonicalName, place.identity?.canonicalName, ...(place.aliases || []), ...(place.identity?.aliases || [])].filter(Boolean);
  const tokens = aliases.flatMap((alias) => normalizeText(alias).split(" ").filter((token) => token.length > 3));
  if (!tokens.length) return 0;
  const unique = [...new Set(tokens)];
  const matches = unique.filter((token) => haystack.includes(token)).length;
  return Math.min(1, matches / Math.min(3, unique.length));
}

function getHardRejectionReason(image, longEdge, context = {}) {
  const visualText = `${image.rawTitle || ""} ${image.sourcePageUrl || ""}`;
  if (!image.imageUrl || !image.sourcePageUrl) return "missing-source-provenance";
  if (longEdge && longEdge < 900) return "too-small";
  if (/watermark|screenshot|map/i.test(visualText)) return "blocked-visual-type";
  if (/\b(parking|car park|carpark|automobile|vehicle|rental car|garage|traffic)\b/i.test(visualText)) return "irrelevant-vehicle-or-parking";
  if (context.weakNameMatch && Number.isFinite(context.distanceMeters) && context.distanceMeters > context.nearbyRadius) return "nearby-but-not-this-place";
  return "";
}

function getImageDistanceMeters(image, place) {
  if (!Number.isFinite(image.latitude) || !Number.isFinite(image.longitude) || !Array.isArray(place.coordinates)) return Infinity;
  const [lat, lng] = place.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Infinity;
  return getDistanceMeters([lat, lng], [image.latitude, image.longitude]);
}

function getNearbyImageRadius(place = {}) {
  const key = `${place.category || ""} ${place.tag || ""} ${place.title || ""}`.toLowerCase();
  if (key.includes("coffee") || key.includes("cafe") || key.includes("restaurant") || key.includes("shop")) return 90;
  if (key.includes("museum") || key.includes("fountain")) return 180;
  if (key.includes("beach") || key.includes("walls") || key.includes("fortress") || key.includes("harbor")) return 650;
  return 240;
}

function getGeotagDistanceScore(distanceMeters, exactLocation) {
  if (!exactLocation || !Number.isFinite(distanceMeters)) return 0.25;
  if (distanceMeters <= 90) return 1;
  if (distanceMeters <= 240) return 0.82;
  if (distanceMeters <= 650) return 0.56;
  if (distanceMeters <= 1500) return 0.28;
  return 0.08;
}

function getDistanceMeters(origin, destination) {
  const [lat1, lon1] = origin;
  const [lat2, lon2] = destination;
  const earthRadius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isGenericRegionalImage(image, place) {
  const haystack = normalizeText(`${image.rawTitle || ""} ${image.sourcePageUrl || ""}`);
  const placeName = normalizeText(place.title || place.identity?.canonicalName || "");
  return haystack.includes("crete") && placeName && !placeName.split(" ").some((token) => token.length > 3 && haystack.includes(token));
}

function inferVisualRole(place, width, height) {
  const key = `${place.category || ""} ${place.tag || ""}`.toLowerCase();
  if (key.includes("coffee") || key.includes("cafe")) return "coffee";
  if (key.includes("beach")) return "beach";
  if (key.includes("museum")) return "museum";
  if (key.includes("restaurant") || key.includes("food")) return "food";
  return width > height ? "hero" : "gallery";
}

function groupImagesByRole(images) {
  return images.reduce((roles, image) => {
    roles[image.visualRole] = [...(roles[image.visualRole] || []), image];
    return roles;
  }, {});
}

function getLongEdge(image) {
  return Math.max(Number(image.width || 0), Number(image.height || 0));
}

function normalizeUrl(value = "") {
  return String(value).split("?")[0].toLowerCase();
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9α-ωάέήίόύώϊϋΐΰ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, "").trim();
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
