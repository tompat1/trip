export const IMAGE_PROVIDERS = Object.freeze({
  commons: "commons",
  osm: "osm",
  user: "user",
  upload: "upload",
  official: "official",
  external: "external",
  fallback: "fallback",
});

export const VISUAL_ROLES = Object.freeze({
  exact: "exact",
  approximate: "approximate",
  illustrative: "illustrative",
});

export const ROUTE_ROLES = Object.freeze({
  seed: "seed",
  osm: "osm",
  user: "user",
});

export const DEFAULT_LANGUAGE = "en";

export const ENRICHMENT_COVERAGE = Object.freeze({
  complete: "complete",
  partial: "partial",
  fallback: "fallback",
  coordinatesOnly: "coordinates-only",
});

export const PROVIDER_STATUS = Object.freeze({
  ok: "ok",
  error: "error",
  skipped: "skipped",
  disabled: "disabled",
});

export const FACT_VOLATILITY = Object.freeze({
  stable: "stable",
  volatile: "volatile",
});

export function createNormalizedSource(input = {}) {
  return {
    id: input.id || createStableId("source", [input.provider, input.url, input.providerId]),
    provider: input.provider || "unknown",
    providerId: input.providerId || "",
    name: input.name || input.provider || "Unknown source",
    type: input.type || "external",
    url: sanitizeExternalUrl(input.url || input.sourceUrl || ""),
    retrievedAt: input.retrievedAt || new Date().toISOString(),
    confidence: clamp01(input.confidence ?? 0.5),
  };
}

export function createNormalizedFact(input = {}) {
  const source = createNormalizedSource(input.source || {
    provider: input.sourceType || input.sourceName || "unknown",
    name: input.sourceName || "",
    url: input.sourceUrl || "",
  });
  return {
    id: input.id || createStableId("fact", [input.key, input.value, source.id]),
    key: input.key || input.label || "fact",
    label: input.label || labelFromKey(input.key || "fact"),
    value: input.value ?? "",
    sourceId: source.id,
    source,
    sourceUrl: source.url,
    sourceName: source.name,
    sourceType: source.type,
    retrievedAt: input.retrievedAt || source.retrievedAt,
    confidence: clamp01(input.confidence ?? source.confidence),
    volatility: input.volatile || input.volatility === FACT_VOLATILITY.volatile ? FACT_VOLATILITY.volatile : FACT_VOLATILITY.stable,
    volatile: Boolean(input.volatile || input.volatility === FACT_VOLATILITY.volatile),
  };
}

export function createNormalizedImage(input = {}) {
  const sourcePageUrl = sanitizeExternalUrl(input.sourcePageUrl || input.sourceUrl || "");
  return {
    id: input.id || createStableId("image", [input.provider, input.providerId, sourcePageUrl, input.imageUrl || input.url]),
    placeId: input.placeId || "",
    provider: input.provider || IMAGE_PROVIDERS.fallback,
    providerId: input.providerId || "",
    imageUrl: sanitizeExternalUrl(input.imageUrl || input.url || ""),
    thumbnailUrl: sanitizeExternalUrl(input.thumbnailUrl || input.thumbUrl || input.imageUrl || input.url || ""),
    sourcePageUrl,
    creatorName: input.creatorName || input.creator || "",
    creatorUrl: sanitizeExternalUrl(input.creatorUrl || ""),
    licenseCode: input.licenseCode || input.license || "",
    licenseName: input.licenseName || input.license || "",
    licenseUrl: sanitizeExternalUrl(input.licenseUrl || ""),
    attributionText: input.attributionText || input.attribution || "",
    width: Number(input.width || 0),
    height: Number(input.height || 0),
    exactLocation: Boolean(input.exactLocation),
    approximateLocation: Boolean(input.approximateLocation),
    illustrativeOnly: Boolean(input.illustrativeOnly),
    visualRole: input.visualRole || VISUAL_ROLES.illustrative,
    relevanceScore: Number(input.relevanceScore || 0),
    qualityScore: Number(input.qualityScore || 0),
    finalScore: Number(input.finalScore || 0),
    reviewStatus: input.reviewStatus || "pending",
    checkedAt: input.checkedAt || input.retrievedAt || new Date().toISOString(),
  };
}

export function createProviderStatus(input = {}) {
  return {
    provider: input.provider || "unknown",
    status: Object.values(PROVIDER_STATUS).includes(input.status) ? input.status : PROVIDER_STATUS.skipped,
    latencyMs: Number(input.latencyMs || 0),
    count: Number(input.count || 0),
    error: input.error || "",
    checkedAt: input.checkedAt || new Date().toISOString(),
  };
}

export function createNormalizedEditorial(input = {}) {
  return {
    standfirst: input.standfirst || input.shortDescription || "",
    whyStop: input.whyStop || "",
    atmosphere: input.atmosphere || "",
    essentialExperience: arrayOfStrings(input.essentialExperience).slice(0, 4),
    dontMiss: arrayOfStrings(input.dontMiss).slice(0, 4),
    hiddenDetails: arrayOfStrings(input.hiddenDetails).slice(0, 3),
    idealFor: arrayOfStrings(input.idealFor).slice(0, 4),
    skipIf: arrayOfStrings(input.skipIf).slice(0, 3),
    suggestedDurationMinutes: Number(input.suggestedDurationMinutes || 45),
    bestArrivalWindow: input.bestArrivalWindow || "",
    routeRole: input.routeRole || "quick-stop",
    coffeeSummary: input.coffeeSummary || "",
    foodSummary: input.foodSummary || "",
    nextBestStop: input.nextBestStop || "",
    localTip: input.localTip || "",
    practicalWarnings: arrayOfStrings(input.practicalWarnings),
    sourceIds: arrayOfStrings(input.sourceIds),
    generatedAt: input.generatedAt || new Date().toISOString(),
    editorialVersion: input.editorialVersion || "deterministic-v1",
    confidence: clamp01(input.confidence ?? 0.5),
  };
}

export function createPlaceProfileContract(input = {}) {
  const media = input.media || {};
  const hero = media.hero ? createNormalizedImage(media.hero) : null;
  const gallery = (media.gallery || []).map(createNormalizedImage);
  const facts = (input.facts || []).map(createNormalizedFact);
  const providerStatus = (input.providerStatus || media.providerStatus || []).map(createProviderStatus);
  return {
    schemaVersion: "place-profile-v1",
    place: input.place || {},
    facts,
    editorial: createNormalizedEditorial(input.editorial || {}),
    media: {
      hero,
      gallery,
      roles: media.roles || {},
      coverage: media.coverage || { images: hero ? ENRICHMENT_COVERAGE.partial : ENRICHMENT_COVERAGE.fallback },
    },
    sources: normalizeSources(input.sources, facts, [hero, ...gallery]),
    attributions: input.attributions || media.attributions || [],
    providerStatus,
    coverage: input.coverage || getProfileCoverage({ facts, hero, providerStatus }),
    generatedAt: input.generatedAt || new Date().toISOString(),
    refreshAfter: input.refreshAfter || new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  };
}

export function sanitizeExternalUrl(value = "") {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("data:image/")) return url;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function normalizeSources(inputSources, facts, images) {
  const sources = new Map();
  (inputSources || []).forEach((source) => {
    const normalized = createNormalizedSource(source);
    sources.set(normalized.id, normalized);
  });
  facts.forEach((fact) => sources.set(fact.source.id, fact.source));
  images.filter(Boolean).forEach((image) => {
    if (!image.sourcePageUrl) return;
    const source = createNormalizedSource({
      provider: image.provider,
      providerId: image.providerId,
      name: image.provider,
      type: "media",
      url: image.sourcePageUrl,
      retrievedAt: image.checkedAt,
      confidence: image.relevanceScore || 0.5,
    });
    sources.set(source.id, source);
  });
  return [...sources.values()];
}

function getProfileCoverage({ facts, hero, providerStatus }) {
  if (!hero && !facts.length) return ENRICHMENT_COVERAGE.coordinatesOnly;
  if (hero?.illustrativeOnly || providerStatus.some((status) => status.status === PROVIDER_STATUS.error)) return ENRICHMENT_COVERAGE.partial;
  return facts.length && hero ? ENRICHMENT_COVERAGE.complete : ENRICHMENT_COVERAGE.partial;
}

function createStableId(prefix, parts = []) {
  return `${prefix}-${hashValue(parts.filter(Boolean).join("|"))}`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value)));
}

function arrayOfStrings(values) {
  return Array.isArray(values) ? values.filter(Boolean).map(String) : [];
}

function labelFromKey(key = "") {
  return String(key).replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function hashValue(value = "") {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
