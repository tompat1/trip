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
