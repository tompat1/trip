import { DEFAULT_LANGUAGE, IMAGE_PROVIDERS, ROUTE_ROLES, VISUAL_ROLES } from "./schemas.js";
import { buildPlaceAliases, createResolvedPlaceIdentity } from "./placeResolver.js";

export function commonsFileUrl(fileName) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

export function createPlaceImage(input = {}) {
  const url = input.url || input.imageUrl || "";
  const provider = input.provider || inferImageProvider(url);
  return {
    url,
    provider,
    sourceUrl: input.sourceUrl || getDefaultImageSource(url),
    attribution: input.attribution || getDefaultImageAttribution(provider),
    visualRole: input.visualRole || inferVisualRole(provider),
    caption: input.caption || "",
    uploadedAt: input.uploadedAt || "",
  };
}

export function createPlaceFact(input = {}) {
  return {
    label: input.label || "",
    value: input.value || "",
    source: input.source || "",
    sourceUrl: input.sourceUrl || "",
    updatedAt: input.updatedAt || "",
  };
}

export function createPlaceProfile(input = {}) {
  return {
    identity: createPlaceIdentity(input.place || input),
    editorial: {
      shortDescription: input.editorial?.shortDescription || input.note || "",
      travelerAngle: input.editorial?.travelerAngle || "",
      language: input.editorial?.language || DEFAULT_LANGUAGE,
    },
    facts: input.facts || [],
    media: input.media || [],
  };
}

export function createPlaceIdentity(place = {}, defaults = {}) {
  return {
    id: place.id || defaults.id || slugify(place.title || place.name || "place"),
    title: place.title || place.name || defaults.title || "Untitled place",
    englishTitle: place.englishTitle || place["name:en"] || "",
    category: place.category || place.tag || defaults.category || "Nearby",
    coordinates: normalizeCoordinates(place.coordinates, defaults.coordinates),
    area: place.area || defaults.area || "",
    source: place.source || defaults.source || "",
    sourceUrl: place.website || place.sourceUrl || defaults.sourceUrl || "",
  };
}

export function normalizeSeedPlace(place = {}, defaults = {}) {
  const image = createPlaceImage({
    url: place.imageUrl || place.image?.url || "",
    provider: place.imageProvider,
    sourceUrl: place.imageSourceUrl || place.website || place.sourceUrl,
    attribution: place.imageAttribution || place.source,
    visualRole: place.visualRole,
  });
  const identity = createResolvedPlaceIdentity({
    canonicalName: place.title || defaults.title || "",
    localName: place.localName || "",
    aliases: buildPlaceAliases({
      canonicalName: place.title || defaults.title || "",
      localName: place.localName || "",
      namedetails: place.aliases ? Object.fromEntries(place.aliases.map((alias, index) => [`alt_name:${index}`, alias])) : {},
    }),
    latitude: place.coordinates?.[0] ?? defaults.coordinates?.[0],
    longitude: place.coordinates?.[1] ?? defaults.coordinates?.[1],
    countryCode: place.countryCode || "GR",
    region: place.region || "Crete",
    municipality: place.municipality || "",
    osmType: place.osmType || "",
    osmId: place.osmId || "",
    wikidataId: place.wikidataId || "",
    wikipediaUrl: place.wikipediaUrl || "",
    officialWebsite: place.website || "",
    categories: [place.category || place.tag].filter(Boolean),
  });

  return {
    ...place,
    id: place.id || slugify(place.title || defaults.title || "place"),
    coordinates: normalizeCoordinates(place.coordinates, defaults.coordinates),
    identity,
    canonicalName: identity.canonicalName,
    localName: identity.localName,
    aliases: identity.aliases,
    sourceRole: place.sourceRole || ROUTE_ROLES.seed,
    image,
    imageUrl: image.url,
    profile: createPlaceProfile({
      place,
      editorial: {
        shortDescription: place.note || "",
        travelerAngle: place.coffeeNerd ? "Coffee nerd shortlist" : "",
      },
      media: image.url ? [image] : [],
      facts: [
        place.rating ? createPlaceFact({ label: "Rating", value: place.rating, source: place.source || "Seed data" }) : null,
        place.website ? createPlaceFact({ label: "Website", value: place.website, source: "Official site", sourceUrl: place.website }) : null,
      ].filter(Boolean),
    }),
  };
}

export function normalizeOsmElement(element = {}, origin, helpers = {}) {
  const tags = element.tags || {};
  const englishTitle = tags["name:en"] || "";
  const title = englishTitle || tags.name;
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (!title || !lat || !lng) return null;

  const category = helpers.classify?.(tags) || "Nearby";
  const meters = helpers.distance?.(origin, [lat, lng]) ?? null;
  const image = createPlaceImage({
    url: helpers.imageUrl?.(tags) || tags.image || tags.wikimedia_commons || "",
    provider: IMAGE_PROVIDERS.osm,
    sourceUrl: tags.website || tags.wikidata || "",
    attribution: "OpenStreetMap contributors",
    visualRole: VISUAL_ROLES.approximate,
  });
  const identity = createResolvedPlaceIdentity({
    canonicalName: title,
    localName: tags["name:el"] || tags.name || "",
    aliases: buildPlaceAliases({
      canonicalName: title,
      localName: tags["name:el"] || tags.name || "",
      namedetails: tags,
    }),
    latitude: lat,
    longitude: lng,
    countryCode: "",
    osmType: element.type,
    osmId: element.id,
    wikidataId: tags.wikidata || "",
    wikipediaUrl: "",
    officialWebsite: tags.website || "",
    categories: [category, tags.amenity, tags.tourism, tags.historic, tags.shop].filter(Boolean),
  });

  return {
    id: `osm-${element.type}-${element.id}`,
    title,
    englishTitle,
    localName: identity.localName,
    aliases: identity.aliases,
    identity,
    canonicalName: identity.canonicalName,
    osmType: identity.osmType,
    osmId: identity.osmId,
    wikidataId: identity.wikidataId,
    tag: category,
    category,
    coordinates: [lat, lng],
    sourceRole: ROUTE_ROLES.osm,
    source: "OpenStreetMap",
    sourceUrl: tags.website || "",
    openingHours: tags.opening_hours || "",
    image,
    imageUrl: image.url,
    distanceMeters: meters,
  };
}

export function normalizeWorkerNearbyPlace(place = {}, origin = null) {
  const coordinates = normalizeCoordinates(place.coordinates);
  if (!coordinates) return null;
  const title = place.title || place.canonicalName || place.name || "";
  if (!title) return null;

  const category = place.category || place.tag || place.categories?.[0] || "Nearby";
  const meters = Number.isFinite(Number(place.distanceMeters))
    ? Number(place.distanceMeters)
    : origin ? Math.round(getDistanceMeters(origin, coordinates)) : null;
  const sourceUrl = place.officialWebsite || place.sourceUrl || place.website || "";
  const source = place.source || "Trip Worker";
  const identity = createResolvedPlaceIdentity({
    canonicalName: title,
    localName: place.localName || "",
    aliases: buildPlaceAliases({
      canonicalName: title,
      localName: place.localName || "",
      namedetails: Object.fromEntries((place.aliases || []).map((alias, index) => [`alt_name:${index}`, alias])),
    }),
    latitude: coordinates[0],
    longitude: coordinates[1],
    countryCode: place.countryCode || "",
    region: place.region || "",
    municipality: place.municipality || "",
    osmType: place.osmType || "",
    osmId: place.osmId || "",
    wikidataId: place.wikidataId || "",
    wikipediaUrl: place.wikipediaUrl || "",
    officialWebsite: sourceUrl,
    categories: place.categories || [category],
  });
  const image = createPlaceImage({
    url: place.imageUrl || "",
    provider: place.imageProvider || IMAGE_PROVIDERS.fallback,
    sourceUrl,
    attribution: place.imageAttribution || source,
    visualRole: VISUAL_ROLES.approximate,
  });

  return {
    ...place,
    id: place.id || slugify(title),
    title,
    canonicalName: identity.canonicalName,
    localName: identity.localName,
    aliases: identity.aliases,
    identity,
    category,
    tag: category,
    coordinates,
    sourceRole: place.sourceRole || ROUTE_ROLES.osm,
    source,
    sourceUrl,
    openingHours: place.openingHours || "",
    image,
    imageUrl: image.url,
    distanceMeters: meters,
    distance: place.distance || formatDistance(meters),
    reason: place.reason || `${category} nearby.`,
    score: Number(place.score ?? meters ?? 999999),
  };
}

export function normalizeUserPlace(place = {}) {
  const image = createPlaceImage({
    url: place.imageUrl || "",
    provider: place.imageUrl?.startsWith("data:") ? IMAGE_PROVIDERS.upload : IMAGE_PROVIDERS.user,
    sourceUrl: place.imageUrl?.startsWith("http") ? place.imageUrl : "",
    attribution: "Traveler added",
    visualRole: VISUAL_ROLES.exact,
    uploadedAt: place.updatedAt || "",
  });

  return {
    ...place,
    id: place.id || `user-${Date.now()}`,
    identity: createResolvedPlaceIdentity({
      canonicalName: place.title || "Traveler place",
      localName: place.localName || "",
      aliases: buildPlaceAliases({ canonicalName: place.title || "Traveler place", localName: place.localName || "" }),
      latitude: place.coordinates?.[0],
      longitude: place.coordinates?.[1],
      countryCode: place.countryCode || "",
      categories: [place.category || place.tag].filter(Boolean),
    }),
    sourceRole: ROUTE_ROLES.user,
    source: place.source || "Traveler added",
    image,
    imageUrl: image.url,
  };
}

function normalizeCoordinates(coordinates, fallback = null) {
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const [lat, lng] = coordinates.map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  return fallback;
}

function formatDistance(meters) {
  if (!Number.isFinite(Number(meters))) return "";
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

function getDistanceMeters(from, to) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const deltaLat = toRadians(to[0] - from[0]);
  const deltaLng = toRadians(to[1] - from[1]);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function inferImageProvider(url = "") {
  if (!url) return IMAGE_PROVIDERS.fallback;
  if (url.startsWith("data:")) return IMAGE_PROVIDERS.upload;
  if (url.includes("commons.wikimedia.org")) return IMAGE_PROVIDERS.commons;
  if (url.includes("wikimedia.org")) return IMAGE_PROVIDERS.commons;
  if (url.startsWith("/assets/")) return IMAGE_PROVIDERS.user;
  if (url.startsWith("http")) return IMAGE_PROVIDERS.external;
  return IMAGE_PROVIDERS.fallback;
}

function getDefaultImageSource(url = "") {
  if (!url) return "";
  if (url.startsWith("/assets/")) return "User-provided reference asset";
  return url;
}

function getDefaultImageAttribution(provider) {
  if (provider === IMAGE_PROVIDERS.commons) return "Wikimedia Commons";
  if (provider === IMAGE_PROVIDERS.osm) return "OpenStreetMap contributors";
  if (provider === IMAGE_PROVIDERS.upload) return "Traveler upload";
  if (provider === IMAGE_PROVIDERS.user) return "Traveler reference";
  if (provider === IMAGE_PROVIDERS.fallback) return "Generated interface fallback";
  return "External source";
}

function inferVisualRole(provider) {
  if (provider === IMAGE_PROVIDERS.upload) return VISUAL_ROLES.exact;
  if (provider === IMAGE_PROVIDERS.user) return VISUAL_ROLES.approximate;
  if (provider === IMAGE_PROVIDERS.fallback) return VISUAL_ROLES.illustrative;
  return VISUAL_ROLES.approximate;
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
