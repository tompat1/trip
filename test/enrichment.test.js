import assert from "node:assert/strict";
import test from "node:test";
import { composeEditorialProfile, createVerifiedFactBundle, validateEditorialProfile } from "../src/enrichment/editorialComposer.js";
import { createEnrichmentService } from "../src/enrichment/enrichmentService.js";
import { calculateImageScore, dedupeImages } from "../src/enrichment/mediaAggregator.js";
import { areAliasesEquivalent, buildPlaceAliases, createResolvedPlaceIdentity } from "../src/enrichment/placeResolver.js";
import { createNormalizedFact, createNormalizedImage, createPlaceProfileContract, ENRICHMENT_COVERAGE } from "../src/enrichment/schemas.js";

const heraklionPlace = {
  id: "heraklion-test",
  title: "Heraklion",
  category: "City",
  area: "Crete",
  coordinates: [35.3391, 25.132],
  identity: createResolvedPlaceIdentity({
    canonicalName: "Heraklion",
    localName: "Ηράκλειο",
    aliases: ["Iraklio"],
    latitude: 35.3391,
    longitude: 25.132,
    countryCode: "GR",
    wikidataId: "Q160544",
    categories: ["city"],
  }),
};

test("resolver keeps known Greek and Latin aliases equivalent", () => {
  const aliases = buildPlaceAliases({
    canonicalName: "Rethymno",
    localName: "Ρέθυμνο",
    namedetails: {
      "name:en": "Rethymno",
      "alt_name:0": "Rethymnon",
    },
  });

  assert.ok(aliases.includes("Rethymnon"));
  assert.equal(areAliasesEquivalent("Rethymnon", "Rethymno"), true);
  assert.equal(areAliasesEquivalent("Ηράκλειο", "Iraklio"), true);
});

test("image scoring rewards strong candidates and penalizes mismatch signals", () => {
  const strong = calculateImageScore({
    exactNameMatch: 1,
    geotagDistanceScore: 1,
    landmarkMatch: 0.8,
    sourceTrust: 0.9,
    resolutionScore: 0.9,
    aspectFit: 1,
    visualQuality: 0.8,
    recencyScore: 0.4,
    duplicatePenalty: 0,
    genericStockPenalty: 0,
    possibleMismatch: 0,
  });
  const weak = calculateImageScore({
    exactNameMatch: 0,
    geotagDistanceScore: 0.1,
    landmarkMatch: 0,
    sourceTrust: 0.5,
    resolutionScore: 0.2,
    aspectFit: 0.2,
    visualQuality: 0.4,
    recencyScore: 0,
    duplicatePenalty: 0,
    genericStockPenalty: 1,
    possibleMismatch: 1,
  });

  assert.ok(strong > 80);
  assert.ok(weak < 20);
});

test("image dedupe preserves provenance and keeps the larger duplicate", () => {
  const images = dedupeImages([
    {
      provider: "commons",
      providerId: "1",
      imageUrl: "https://example.com/a.jpg?width=400",
      sourcePageUrl: "https://example.com/page",
      width: 400,
      height: 300,
    },
    {
      provider: "commons",
      providerId: "1",
      imageUrl: "https://example.com/a.jpg?width=1200",
      sourcePageUrl: "https://example.com/page",
      width: 1200,
      height: 800,
    },
    {
      provider: "commons",
      providerId: "2",
      imageUrl: "https://example.com/no-source.jpg",
      width: 1200,
      height: 800,
    },
  ]);

  assert.equal(images.length, 1);
  assert.equal(images[0].width, 1200);
  assert.equal(images[0].sourcePageUrl, "https://example.com/page");
});

test("editorial profile uses verified facts and strips unsupported volatile summaries", () => {
  const facts = createVerifiedFactBundle(heraklionPlace);
  const profile = composeEditorialProfile(heraklionPlace, {
    facts,
    travellerProfile: { focus: "arty" },
    routeContext: { nextStop: "Knossos Palace" },
  });
  const validation = validateEditorialProfile({
    ...profile,
    parkingSummary: "Invented parking claim",
  }, facts);

  assert.match(profile.whyStop, /Heraklion/);
  assert.equal(validation.correctedDraft.parkingSummary, "");
  assert.ok(validation.confidence > 0);
});

test("normalized profile contract preserves facts, images, sources, status, and coverage", () => {
  const fact = createNormalizedFact({
    key: "name",
    value: "Heraklion",
    sourceName: "OpenStreetMap",
    sourceUrl: "https://www.openstreetmap.org/",
    confidence: 0.9,
  });
  const hero = createNormalizedImage({
    id: "hero-1",
    provider: "commons",
    providerId: "File:Heraklion.jpg",
    imageUrl: "https://upload.wikimedia.org/example.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Heraklion.jpg",
    attributionText: "Creator · CC BY-SA",
    exactLocation: true,
    visualRole: "hero",
    relevanceScore: 0.9,
  });
  const contract = createPlaceProfileContract({
    place: heraklionPlace.identity,
    facts: [fact],
    editorial: { standfirst: "Heraklion is a major Crete hub.", sourceIds: [fact.sourceId], confidence: 0.8 },
    media: { hero, gallery: [], providerStatus: [{ provider: "commons", status: "ok", count: 1 }] },
  });

  assert.equal(contract.schemaVersion, "place-profile-v1");
  assert.equal(contract.media.hero.provider, "commons");
  assert.ok(contract.sources.length >= 2);
  assert.equal(contract.coverage, ENRICHMENT_COVERAGE.complete);
});

test("enrichment service returns a normalized PlaceProfile when media is supplied", async () => {
  const service = createEnrichmentService({
    fetchImpl: async () => {
      throw new Error("network should not be used when media is supplied");
    },
  });
  const profile = await service.enrichPlace(heraklionPlace, {
    media: {
      hero: {
        provider: "fallback",
        imageUrl: "",
        sourcePageUrl: "",
        illustrativeOnly: true,
        visualRole: "hero",
      },
      gallery: [],
      providerStatus: [{ provider: "test", status: "skipped" }],
    },
    travellerProfile: { focus: "coffee" },
  });

  assert.equal(profile.schemaVersion, "place-profile-v1");
  assert.equal(profile.place.canonicalName, "Heraklion");
  assert.equal(profile.providerStatus[0].provider, "test");
});

test("enrichment service discovers nearby places through the Worker contract", async () => {
  let requestedUrl = "";
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        async json() {
          return {
            generatedAt: "2026-07-24T12:00:00.000Z",
            refreshAfter: "2026-07-24T12:30:00.000Z",
            coverage: "partial",
            providerStatus: [{ provider: "d1-nearby-cache", status: "ok", count: 1 }],
            places: [{
              id: "seed-lions-square",
              canonicalName: "Lions Square",
              localName: "Morosini Fountain",
              category: "Coffee",
              categories: ["Coffee", "Sight"],
              coordinates: [35.3391, 25.132],
              distanceMeters: 0,
              source: "Trip D1 nearby cache",
            }],
          };
        },
      };
    },
  });

  const result = await service.discoverNearby({
    coordinates: [35.3391, 25.132],
    intent: "coffee",
    radiusMeters: 1500,
  });

  const url = new URL(requestedUrl);
  assert.equal(url.origin, "https://trip.test");
  assert.equal(url.pathname, "/api/places/nearby");
  assert.equal(url.searchParams.get("intent"), "coffee");
  assert.equal(result.status, "ready");
  assert.equal(result.places[0].title, "Lions Square");
  assert.equal(result.places[0].identity.canonicalName, "Lions Square");
  assert.equal(result.providerStatus[0].provider, "d1-nearby-cache");
});

test("enrichment service falls back when the Worker nearby request fails", async () => {
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });

  const result = await service.discoverNearby({
    coordinates: [35.3391, 25.132],
    fallback: async () => ({
      status: "ready",
      places: [{ id: "fallback", title: "Fallback Cafe", coordinates: [35.3392, 25.1321] }],
      providerStatus: [{ provider: "browser-overpass", status: "ok", count: 1 }],
    }),
  });

  assert.equal(result.status, "ready");
  assert.equal(result.places[0].title, "Fallback Cafe");
  assert.equal(result.providerStatus[0].provider, "browser-overpass");
});

test("enrichment service refreshes media through the Worker first", async () => {
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url, options = {}) => {
      assert.match(url, /\/api\/places\/koules\/media\/refresh$/);
      assert.equal(options.method, "POST");
      return {
        ok: true,
        async json() {
          return {
            media: {
              hero: {
                id: "hero-koules",
                provider: "trip-curated-asset",
                imageUrl: "/assets/crete/koules.webp",
                thumbnailUrl: "/assets/crete/koules.webp",
                sourcePageUrl: "",
                visualRole: "hero",
                illustrativeOnly: false,
              },
              gallery: [],
              coverage: { images: "partial" },
            },
            providerStatus: [{ provider: "curated-place-media", status: "ok", count: 1 }],
          };
        },
      };
    },
  });

  const media = await service.refreshMedia({ id: "koules", title: "Koules Fortress" });
  assert.equal(media.hero.imageUrl, "/assets/crete/koules.webp");
  assert.equal(media.providerStatus[0].provider, "curated-place-media");
});

test("enrichment service falls back to local media providers after empty Worker media", async () => {
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url) => {
      if (String(url).includes("/api/places/")) {
        return {
          ok: true,
          async json() {
            return {
              media: {
                hero: { id: "fallback", imageUrl: "", illustrativeOnly: true, visualRole: "hero" },
                gallery: [],
                coverage: { images: "fallback" },
              },
              providerStatus: [{ provider: "designed-fallback-media", status: "ok", count: 0 }],
            };
          },
        };
      }
      throw new Error("local providers unavailable");
    },
  });

  const media = await service.refreshMedia({ id: "missing", title: "Missing Place" });
  assert.equal(media.hero.illustrativeOnly, true);
  assert.equal(media.providerStatus[0].provider, "designed-fallback-media");
  assert.ok(media.providerStatus.some((status) => status.provider === "commons"));
  assert.ok(media.providerStatus.some((status) => status.provider === "openverse"));
});
