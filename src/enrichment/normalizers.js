import { DEFAULT_LANGUAGE, IMAGE_PROVIDERS, ROUTE_ROLES, VISUAL_ROLES } from "./schemas.js";

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

  return {
    ...place,
    id: place.id || slugify(place.title || defaults.title || "place"),
    coordinates: normalizeCoordinates(place.coordinates, defaults.coordinates),
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

  return {
    id: `osm-${element.type}-${element.id}`,
    title,
    englishTitle,
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

