import { composeEditorialProfile, createPlaceProfileEnvelope, createVerifiedFactBundle } from "./editorialComposer.js";
import { enrichPlaceMedia } from "./mediaAggregator.js";
import { normalizeOsmElement, normalizeWorkerNearbyPlace } from "./normalizers.js";
import { resolveLocationContext } from "./placeResolver.js";
import { createPlaceProfileContract, createProviderStatus, PROVIDER_STATUS } from "./schemas.js";

const DEFAULT_WORKER_API_BASE = "https://trip.thomasrynell.workers.dev";

export function createEnrichmentService(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || (() => new Date());
  const apiBase = options.apiBase ?? getDefaultApiBase();

  return {
    async resolveLocation(input = {}) {
      const workerLocation = await resolveWorkerLocation(input, { apiBase, fetchImpl, now }).catch(() => null);
      if (workerLocation) return workerLocation;
      return resolveLocationContext({ ...input, fetchImpl });
    },

    normalizeNearbyElement(element, origin, helpers = {}) {
      return normalizeOsmElement(element, origin, helpers);
    },

    async discoverNearby(input = {}) {
      const coordinates = normalizeCoordinates(input.coordinates);
      if (!coordinates) {
        return {
          status: "error",
          updatedAt: now().toISOString(),
          error: "Location is needed before scanning nearby places.",
          places: [],
          providerStatus: [createProviderStatus({ provider: "trip-worker", status: PROVIDER_STATUS.error, error: "invalid-coordinates" })],
        };
      }

      try {
        const url = buildApiUrl(apiBase, "/api/places/nearby");
        url.searchParams.set("lat", String(coordinates[0]));
        url.searchParams.set("lng", String(coordinates[1]));
        url.searchParams.set("radius", String(input.radiusMeters || 1500));
        url.searchParams.set("intent", input.intent || "traveler");
        if (input.force) url.searchParams.set("refresh", "1");

        const response = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`worker-nearby-http-${response.status}`);
        const payload = await response.json();
        const places = (payload.places || [])
          .map((place) => normalizeWorkerNearbyPlace(place, coordinates))
          .filter(Boolean);

        return {
          status: "ready",
          updatedAt: payload.generatedAt || now().toISOString(),
          refreshAfter: payload.refreshAfter || "",
          error: places.length ? "" : "No strong nearby traveler places found yet. Try a wider area later.",
          places,
          providerStatus: payload.providerStatus || [],
          coverage: payload.coverage || "partial",
          source: "trip-worker",
        };
      } catch (error) {
        if (typeof input.fallback === "function") return input.fallback(error);
        return {
          status: "error",
          updatedAt: now().toISOString(),
          error: "Nearby scan could not reach the Trip Worker right now.",
          places: [],
          providerStatus: [createProviderStatus({ provider: "trip-worker", status: PROVIDER_STATUS.error, error: error?.message || "worker-nearby-failed" })],
        };
      }
    },

    createFacts(place, context = {}) {
      return createVerifiedFactBundle(place, context);
    },

    composeEditorial(place, options = {}) {
      const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
      return composeEditorialProfile(place, { ...options, facts });
    },

    async generateEditorial(place, options = {}) {
      const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
      const localEditorial = composeEditorialProfile(place, { ...options, facts });
      return generateWorkerEditorial(place, {
        ...options,
        facts,
        apiBase,
        fetchImpl,
        now,
        fallbackEditorial: localEditorial,
      }).catch(() => localEditorial);
    },

    async refreshMedia(place, options = {}) {
      const workerMedia = await refreshWorkerMedia(place, { ...options, apiBase, fetchImpl, now }).catch((error) => ({
        hero: null,
        gallery: [],
        roles: {},
        attributions: [],
        coverage: { images: "fallback" },
        providerStatus: [createProviderStatus({ provider: "trip-worker-media", status: PROVIDER_STATUS.error, error: error?.message || "worker-media-failed" })],
        generatedAt: now().toISOString(),
        refreshAfter: new Date(now().getTime() + 1000 * 60 * 30).toISOString(),
      }));
      if (workerMedia.hero?.imageUrl || options.workerOnly) return workerMedia;

      const fallbackMedia = await enrichPlaceMedia(place, { ...options, fetchImpl }).catch((error) => createMediaFailure(error, now));
      return {
        ...fallbackMedia,
        providerStatus: [...(workerMedia.providerStatus || []), ...(fallbackMedia.providerStatus || [])],
      };
    },

    async enrichPlace(place, options = {}) {
      const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
      const media = options.media || await enrichPlaceMedia(place, { fetchImpl }).catch((error) => createMediaFailure(error, now));
      const envelope = createPlaceProfileEnvelope(place, {
        ...options,
        facts,
        media,
        attributions: options.attributions || media.attributions || [],
      });

      return createPlaceProfileContract({
        ...envelope,
        media,
        providerStatus: media.providerStatus || [],
      });
    },

    createProfileContract(input = {}) {
      return createPlaceProfileContract(input);
    },
  };
}

export const enrichmentService = createEnrichmentService();

function getDefaultApiBase() {
  const envBase = import.meta.env?.VITE_TRIP_API_BASE;
  if (envBase) return envBase;
  if (typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname)) return DEFAULT_WORKER_API_BASE;
  return "";
}

function buildApiUrl(base, path) {
  if (!base) return new URL(path, typeof window !== "undefined" ? window.location.origin : "https://trip.rynell.org");
  return new URL(path, base.endsWith("/") ? base : `${base}/`);
}

function normalizeCoordinates(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lat, lng] = value.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

async function resolveWorkerLocation(input = {}, options = {}) {
  const coordinates = normalizeCoordinates(input.coordinates);
  if (!coordinates) return null;
  const url = buildApiUrl(options.apiBase, "/api/location/resolve");
  const response = await options.fetchImpl(url.href, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates,
      accuracyMeters: input.accuracyMeters,
      title: input.title,
      category: input.category,
    }),
  });
  if (!response.ok) throw new Error(`worker-location-http-${response.status}`);
  const payload = await response.json();
  return normalizeWorkerLocationPayload(payload, coordinates);
}

function normalizeWorkerLocationPayload(payload = {}, coordinates) {
  const location = payload.location || {};
  const profilePlace = payload.placeProfile?.place || {};
  const city = cleanAreaName(location.city || profilePlace.municipality || profilePlace.canonicalName || "");
  const region = cleanAreaName(location.region || profilePlace.region || "");
  const countryCode = String(location.countryCode || profilePlace.countryCode || "").toUpperCase();
  return {
    latitude: coordinates[0],
    longitude: coordinates[1],
    countryCode,
    countryName: getFactValue(payload.placeProfile?.facts, "country") || "",
    region,
    county: "",
    municipality: city,
    locality: city,
    neighbourhood: "",
    postcode: "",
    timezone: "",
    primaryLanguage: countryCode === "GR" ? "el" : "en",
    localLanguages: countryCode === "GR" ? ["el", "en"] : ["en"],
    confidence: Number(location.confidence || profilePlace.confidence || 0.65),
    matchLevel: location.matchLevel || "",
    sourceIds: (payload.placeProfile?.sources || []).map((source) => source.id).filter(Boolean),
    providerStatus: payload.providerStatus || [],
    placeProfile: payload.placeProfile || null,
    area: {
      city,
      town: "",
      village: "",
      suburb: "",
      county: "",
      region,
      island: inferIsland(region),
      country: getFactValue(payload.placeProfile?.facts, "country") || "",
      countryCode,
      locality: city,
      neighbourhood: "",
      postcode: "",
      displayName: getFactValue(payload.placeProfile?.facts, "displayName") || [city, region].filter(Boolean).join(", "),
      osmId: profilePlace.osmId || "",
      osmType: cleanAreaType(profilePlace.categories?.[0] || profilePlace.osmType || "OpenStreetMap area"),
      placeType: profilePlace.categories?.[0] || "",
      boundingBox: [],
      resolvedPlaceId: location.placeId || profilePlace.id || "",
      canonicalName: profilePlace.canonicalName || city,
      localName: profilePlace.localName || "",
      aliases: profilePlace.aliases || [],
      wikidataId: profilePlace.wikidataId || "",
      wikipediaUrl: profilePlace.wikipediaUrl || "",
      matchLevel: location.matchLevel || "",
      confidence: Number(location.confidence || profilePlace.confidence || 0.65),
    },
    place: {
      ...profilePlace,
      id: profilePlace.id || location.placeId || "current-location",
      canonicalName: profilePlace.canonicalName || city || "Current location",
      coordinates,
    },
  };
}

function getFactValue(facts = [], key) {
  return (facts || []).find((fact) => fact.key === key)?.value || "";
}

function cleanAreaName(value = "") {
  return String(value || "")
    .replace(/^municipal unit of\s+/i, "")
    .replace(/^municipality of\s+/i, "")
    .replace(/\bmunicipal unit\b/gi, "city")
    .replace(/\bmunicipality\b/gi, "city")
    .trim();
}

function cleanAreaType(value = "") {
  const normalized = String(value || "");
  if (/municipal/i.test(normalized)) return "City";
  return normalized || "OpenStreetMap area";
}

function inferIsland(region = "") {
  return /crete/i.test(String(region)) ? "Crete" : "";
}

async function refreshWorkerMedia(place = {}, options = {}) {
  const placeId = place.id || place.identity?.id || place.canonicalName || place.title || "place";
  const url = buildApiUrl(options.apiBase, `/api/places/${encodeURIComponent(placeId)}/media/refresh`);
  const response = await options.fetchImpl(url.href, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ place }),
  });
  if (!response.ok) throw new Error(`worker-media-http-${response.status}`);
  const payload = await response.json();
  return {
    ...(payload.media || {}),
    providerStatus: payload.providerStatus || payload.media?.providerStatus || [],
    generatedAt: payload.media?.generatedAt || payload.generatedAt || options.now().toISOString(),
    refreshAfter: payload.media?.refreshAfter || payload.refreshAfter || new Date(options.now().getTime() + 1000 * 60 * 30).toISOString(),
  };
}

async function generateWorkerEditorial(place = {}, options = {}) {
  const placeId = place.id || place.identity?.id || place.canonicalName || place.title || "place";
  const url = buildApiUrl(options.apiBase, `/api/places/${encodeURIComponent(placeId)}/editorial/generate`);
  const response = await options.fetchImpl(url.href, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      place,
      facts: options.facts || [],
      media: options.media || {},
      travellerProfile: options.travellerProfile || {},
      routeContext: options.routeContext || {},
    }),
  });
  if (!response.ok) throw new Error(`worker-editorial-http-${response.status}`);
  const payload = await response.json();
  return payload.editorial || options.fallbackEditorial;
}

function createMediaFailure(error, now) {
  return {
    hero: null,
    gallery: [],
    roles: {},
    attributions: [],
    coverage: { images: "fallback" },
    providerStatus: [
      createProviderStatus({
        provider: "media",
        status: PROVIDER_STATUS.error,
        error: error?.name === "AbortError" ? "timeout" : "media-refresh-failed",
        checkedAt: now().toISOString(),
      }),
    ],
    generatedAt: now().toISOString(),
    refreshAfter: new Date(now().getTime() + 1000 * 60 * 30).toISOString(),
  };
}
