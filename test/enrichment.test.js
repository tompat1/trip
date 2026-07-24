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
