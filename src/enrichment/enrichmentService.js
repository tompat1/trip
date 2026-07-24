import { composeEditorialProfile, createPlaceProfileEnvelope, createVerifiedFactBundle } from "./editorialComposer.js";
import { enrichPlaceMedia } from "./mediaAggregator.js";
import { normalizeOsmElement } from "./normalizers.js";
import { resolveLocationContext } from "./placeResolver.js";
import { createPlaceProfileContract, createProviderStatus, PROVIDER_STATUS } from "./schemas.js";

export function createEnrichmentService(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || (() => new Date());

  return {
    async resolveLocation(input = {}) {
      return resolveLocationContext({ ...input, fetchImpl });
    },

    normalizeNearbyElement(element, origin, helpers = {}) {
      return normalizeOsmElement(element, origin, helpers);
    },

    createFacts(place, context = {}) {
      return createVerifiedFactBundle(place, context);
    },

    composeEditorial(place, options = {}) {
      const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
      return composeEditorialProfile(place, { ...options, facts });
    },

    async refreshMedia(place, options = {}) {
      return enrichPlaceMedia(place, { ...options, fetchImpl });
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
