import assert from "node:assert/strict";
import test from "node:test";
import { composeEditorialProfile, createVerifiedFactBundle, validateEditorialProfile } from "../src/enrichment/editorialComposer.js";
import { createEnrichmentService } from "../src/enrichment/enrichmentService.js";
import { calculateImageScore, dedupeImages } from "../src/enrichment/mediaAggregator.js";
import { normalizeOpenTripMapPlaces } from "../src/services/openTripMapService.js";
import { areAliasesEquivalent, buildPlaceAliases, createResolvedPlaceIdentity } from "../src/enrichment/placeResolver.js";
import { createNormalizedFact, createNormalizedImage, createPlaceProfileContract, ENRICHMENT_COVERAGE } from "../src/enrichment/schemas.js";
import worker, { createRequestPrincipal } from "../worker/index.js";

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

test("Worker request principal distinguishes anonymous, traveler, and admin", () => {
  const anonymous = createRequestPrincipal(new Request("https://trip.test/api/session"), { TRIP_ADMIN_TOKEN: "secret" });
  assert.equal(anonymous.role, "anonymous");

  const traveler = createRequestPrincipal(new Request("https://trip.test/api/session", {
    headers: { "X-Trip-User-Id": "thomas" },
  }), { TRIP_ADMIN_TOKEN: "secret" });
  assert.equal(traveler.role, "traveler");
  assert.equal(traveler.userId, "thomas");

  const admin = createRequestPrincipal(new Request("https://trip.test/api/session", {
    headers: { Authorization: "Bearer secret", "X-Trip-User-Id": "thomas" },
  }), { TRIP_ADMIN_TOKEN: "secret" });
  assert.equal(admin.role, "admin");
  assert.equal(admin.authType, "admin-token");
});

test("Worker force media refresh requires admin", async () => {
  const response = await worker.fetch(new Request("https://trip.test/api/places/lions-square/media/refresh?refresh=1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Trip-User-Id": "thomas",
    },
    body: JSON.stringify({ place: { id: "lions-square", title: "Lions Square" }, force: true }),
  }), { TRIP_ADMIN_TOKEN: "secret" }, {});

  assert.equal(response.status, 403);
  const payload = await response.json();
  assert.equal(payload.error.code, "forbidden");
});

test("Worker user moments preserves uploaded media URLs", async () => {
  const rows = [];
  const env = {
    TRIP_DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() {
                assert.match(sql, /INSERT INTO user_moments/);
                rows.push({
                  id: args[0],
                  trip_id: args[1],
                  type: args[2],
                  title: args[3],
                  text: args[4],
                  media_url: args[5],
                  date: args[6],
                });
                return { success: true };
              },
              async all() {
                assert.match(sql, /FROM user_moments/);
                return { results: rows };
              },
            };
          },
          async all() {
            assert.match(sql, /FROM user_moments/);
            return { results: rows };
          },
        };
      },
    },
  };

  const dataUrl = "data:image/png;base64,abc123";
  const createResponse = await worker.fetch(new Request("https://trip.test/api/user/moments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "m-heraklion-photo",
      tripId: "crete",
      type: "photo",
      title: "Heraklion photo",
      media_url: dataUrl,
      date: "2026-07-26",
    }),
  }), env, {});

  assert.equal(createResponse.status, 200);
  const created = await createResponse.json();
  assert.equal(created.moment.media_url, dataUrl);

  const listResponse = await worker.fetch(new Request("https://trip.test/api/user/moments"), env, {});
  const listed = await listResponse.json();
  assert.equal(listed.moments[0].media_url, dataUrl);
  assert.equal(listed.moments[0].trip_id, "crete");
});

test("OpenTripMap service normalizes tourism POIs", () => {
  const places = normalizeOpenTripMapPlaces([{
    xid: "W123",
    name: "Arc de Triomphe",
    kinds: "interesting_places,architecture,historic,monuments",
    rate: "3",
    dist: 240,
    point: { lat: 48.8738, lon: 2.2950 },
  }], [48.872, 2.297]);

  assert.equal(places.length, 1);
  assert.equal(places[0].id, "otm-W123");
  assert.equal(places[0].title, "Arc de Triomphe");
  assert.equal(places[0].category, "Sight");
  assert.deepEqual(places[0].coordinates, [48.8738, 2.295]);
  assert.equal(places[0].source, "OpenTripMap");
});

test("Worker OpenTripMap route reports missing key clearly", async () => {
  const response = await worker.fetch(new Request("https://trip.test/api/opentripmap/places?lat=48.8566&lng=2.3522"), {}, {});
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.error.code, "missing_opentripmap_key");
});

test("Worker nearby route queries OpenStreetMap open-first categories through Overpass", async () => {
  const originalFetch = globalThis.fetch;
  let overpassQuery = "";
  globalThis.fetch = async (_url, options = {}) => {
    overpassQuery = options.body?.get ? options.body.get("data") : String(options.body || "");
    return {
      ok: true,
      async json() {
        return {
          elements: [
            {
              type: "node",
              id: 101,
              lat: 48.8568,
              lon: 2.3524,
              tags: { name: "Rue Cafe", amenity: "cafe", opening_hours: "Mo-Fr 08:00-18:00" },
            },
            {
              type: "node",
              id: 102,
              lat: 48.857,
              lon: 2.353,
              tags: { name: "Pocket Fountain", amenity: "drinking_water", wheelchair: "yes" },
            },
          ],
        };
      },
    };
  };

  try {
    const response = await worker.fetch(new Request("https://trip.test/api/places/nearby?lat=48.8566&lng=2.3522&radius=1500"), {}, {});
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.match(overpassQuery, /\["amenity"~"cafe\|restaurant/);
    assert.match(overpassQuery, /\["tourism"~"attraction\|museum\|viewpoint\|gallery"/);
    assert.match(overpassQuery, /\["historic"\]/);
    assert.match(overpassQuery, /\["leisure"~"park\|garden"/);
    assert.match(overpassQuery, /\["shop"\]/);
    assert.match(overpassQuery, /\["amenity"~"toilets\|drinking_water"/);
    assert.match(overpassQuery, /\["entrance"\]/);
    assert.match(overpassQuery, /\["wheelchair"\]/);
    assert.match(overpassQuery, /\["opening_hours"\]/);
    assert.equal(payload.places[0].source.startsWith("OpenStreetMap"), true);
    assert.equal(payload.places.some((place) => place.category === "Water"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Worker event discovery combines Ticketmaster and Bandsintown providers", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (String(url).includes("ticketmaster.com")) {
      return {
        ok: true,
        async json() {
          return {
            _embedded: {
              events: [{
                id: "tm-1",
                name: "Major Paris Concert",
                url: "https://ticketmaster.test/event",
                images: [{ url: "https://ticketmaster.test/image.jpg", width: 1200 }],
                dates: { start: { localDate: "2026-10-03", localTime: "20:00:00" } },
                classifications: [{ genre: { name: "Rock" }, segment: { name: "Music" } }],
                _embedded: {
                  venues: [{
                    name: "Paris Arena",
                    city: { name: "Paris" },
                    country: { name: "France" },
                    location: { latitude: "48.8566", longitude: "2.3522" },
                  }],
                },
              }],
            },
          };
        },
      };
    }
    if (String(url).includes("bandsintown.com")) {
      return {
        ok: true,
        async json() {
          return [{
            id: "bit-1",
            title: "Artist Night",
            datetime: "2026-10-04T21:00:00",
            url: "https://bandsintown.test/event",
            venue: {
              name: "Small Paris Club",
              city: "Paris",
              country: "France",
              latitude: "48.86",
              longitude: "2.35",
            },
            offers: [{ url: "https://bandsintown.test/tickets" }],
          }];
        },
      };
    }
    throw new Error(`unexpected url ${url}`);
  };

  try {
    const response = await worker.fetch(new Request("https://trip.test/api/events/discover?lat=48.8566&lng=2.3522&destination=Paris&artist=Phoenix"), {
      TICKETMASTER_API_KEY: "tm-key",
      BANDSINTOWN_APP_ID: "bit-app",
    }, {});
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.events.length, 2);
    assert.ok(requestedUrls.some((url) => url.includes("app.ticketmaster.com/discovery/v2/events.json")));
    assert.ok(requestedUrls.some((url) => url.includes("rest.bandsintown.com/artists/Phoenix/events/")));
    assert.equal(payload.providerStatus.some((status) => status.provider === "ticketmaster" && status.status === "ok"), true);
    assert.equal(payload.providerStatus.some((status) => status.provider === "bandsintown" && status.status === "ok"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Worker attribution endpoint returns stored image provenance", async () => {
  const imageRows = [{
    id: "image-1",
    place_id: "koules",
    provider: "commons",
    provider_id: "123",
    image_url: "https://upload.wikimedia.org/example.jpg",
    thumbnail_url: "https://upload.wikimedia.org/thumb/example.jpg",
    source_page_url: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    creator_name: "Example Creator",
    creator_url: "https://example.com/creator",
    license_code: "CC BY-SA 4.0",
    license_name: "Creative Commons Attribution-ShareAlike 4.0",
    license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution_text: "Example Creator · CC BY-SA 4.0",
    width: 1600,
    height: 1000,
    exact_location: 1,
    approximate_location: 0,
    illustrative_only: 0,
    visual_role: "hero",
    relevance_score: 0.9,
    quality_score: 0.8,
    final_score: 92,
    perceptual_hash: "",
    review_status: "approved",
    hero_locked: 1,
    checked_at: "2026-07-24T12:00:00.000Z",
  }];
  const env = {
    TRIP_DB: {
      prepare(sql) {
        assert.match(sql, /FROM place_images/);
        return {
          bind(placeId) {
            assert.equal(placeId, "koules");
            return {
              async all() {
                return { results: imageRows };
              },
            };
          },
        };
      },
    },
  };

  const response = await worker.fetch(new Request("https://trip.test/api/places/koules/attributions"), env, {});

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.attributions.length, 1);
  assert.equal(payload.attributions[0].creator, "Example Creator");
  assert.equal(payload.attributions[0].source, "Wikimedia Commons");
  assert.equal(payload.attributions[0].licenseUrl, "https://creativecommons.org/licenses/by-sa/4.0/");
  assert.equal(payload.attributions[0].sourcePageUrl, "https://commons.wikimedia.org/wiki/File:Example.jpg");
});

test("Worker admin image review persists status, role, and audit row", async () => {
  const db = createMediaReviewDb({
    id: "image-1",
    place_id: "koules",
    provider: "commons",
    provider_id: "123",
    image_url: "https://upload.wikimedia.org/example.jpg",
    thumbnail_url: "https://upload.wikimedia.org/thumb/example.jpg",
    visual_role: "gallery",
    review_status: "pending",
    hero_locked: 0,
    final_score: 72,
  });

  const response = await worker.fetch(new Request("https://trip.test/api/place-images/image-1", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
      "X-Trip-User-Id": "thomas@rynell.org",
    },
    body: JSON.stringify({ reviewStatus: "approved", visualRole: "hero", heroLocked: true, notes: "Correct landmark." }),
  }), { TRIP_ADMIN_TOKEN: "secret", TRIP_DB: db }, {});

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.image.reviewStatus, "approved");
  assert.equal(payload.image.visualRole, "hero");
  assert.equal(payload.image.heroLocked, true);
  assert.equal(db.reviews.length, 1);
  assert.equal(db.reviews[0].decision, "approved");
  assert.equal(db.reviews[0].reviewer, "thomas@rynell.org");
});

test("Worker admin hero lock promotes one selected place image", async () => {
  const db = createMediaReviewDb({
    id: "image-1",
    place_id: "koules",
    provider: "commons",
    image_url: "https://upload.wikimedia.org/example.jpg",
    thumbnail_url: "https://upload.wikimedia.org/thumb/example.jpg",
    visual_role: "gallery",
    review_status: "pending",
    hero_locked: 0,
  });

  const response = await worker.fetch(new Request("https://trip.test/api/places/koules/hero/lock", {
    method: "POST",
    headers: {
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageId: "image-1" }),
  }), { TRIP_ADMIN_TOKEN: "secret", TRIP_DB: db }, {});

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.locked, true);
  assert.equal(payload.image.reviewStatus, "approved");
  assert.equal(payload.image.visualRole, "hero");
  assert.equal(payload.image.heroLocked, true);
  assert.equal(db.reviews[0].decision, "hero_locked");
});

test("Worker stored place profile prefers admin-locked hero image", async () => {
  const env = {
    TRIP_DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() {
                if (/SELECT \* FROM places WHERE id = \?/.test(sql)) {
                  assert.equal(args[0], "koules");
                  return {
                    id: "koules",
                    canonical_name: "Koules Fortress",
                    local_name: "",
                    country_code: "GR",
                    region: "Crete",
                    municipality: "Heraklion",
                    latitude: 35.3447,
                    longitude: 25.1367,
                    categories: "[\"Sight\"]",
                    confidence: 0.8,
                  };
                }
                if (/SELECT editorial_json FROM place_editorial_profiles/.test(sql)) return null;
                throw new Error(`Unexpected first SQL: ${sql}`);
              },
              async all() {
                if (/FROM place_facts/.test(sql)) {
                  return {
                    results: [
                      { id: "fact-name", key: "name", label: "Name", value_json: "\"Koules Fortress\"", source_id: "source-koules", source_name: "Trip seed", source_type: "curated", source_url: "", confidence: 0.8, volatility: "stable", retrieved_at: "2026-07-24T12:00:00.000Z" },
                      { id: "fact-category", key: "category", label: "Category", value_json: "\"Sight\"", source_id: "source-koules", source_name: "Trip seed", source_type: "curated", source_url: "", confidence: 0.8, volatility: "stable", retrieved_at: "2026-07-24T12:00:00.000Z" },
                      { id: "fact-area", key: "area", label: "Area", value_json: "\"Old Harbor\"", source_id: "source-koules", source_name: "Trip seed", source_type: "curated", source_url: "", confidence: 0.7, volatility: "stable", retrieved_at: "2026-07-24T12:00:00.000Z" },
                    ],
                  };
                }
                if (/FROM place_images/.test(sql)) {
                  assert.match(sql, /ORDER BY hero_locked DESC/);
                  return {
                    results: [
                      { id: "locked-gallery", place_id: "koules", provider: "commons", image_url: "https://example.com/locked.jpg", thumbnail_url: "", visual_role: "gallery", hero_locked: 1, review_status: "approved", final_score: 70 },
                      { id: "old-hero", place_id: "koules", provider: "commons", image_url: "https://example.com/old.jpg", thumbnail_url: "", visual_role: "hero", hero_locked: 0, review_status: "approved", final_score: 99 },
                    ],
                  };
                }
                throw new Error(`Unexpected all SQL: ${sql}`);
              },
            };
          },
        };
      },
    },
  };

  const response = await worker.fetch(new Request("https://trip.test/api/places/enrich?id=koules"), env, {});

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.placeProfile.media.hero.id, "locked-gallery");
  assert.equal(payload.placeProfile.media.hero.heroLocked, true);
  assert.equal(payload.placeProfile.media.gallery[0].id, "old-hero");
  assert.doesNotMatch(payload.placeProfile.editorial.standfirst, /ready for enrichment/);
  assert.match(payload.placeProfile.editorial.whyStop, /Koules Fortress/);
});

function createMediaReviewDb(initialImage) {
  const state = {
    image: { ...initialImage },
    reviews: [],
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              assert.match(sql, /SELECT \* FROM place_images WHERE id = \?/);
              return args[0] === state.image.id ? { ...state.image } : null;
            },
            async all() {
              return { results: [] };
            },
            async run() {
              if (/UPDATE place_images\s+SET review_status/.test(sql)) {
                const [reviewStatus, visualRole, heroLocked, updatedAt, imageId] = args;
                assert.equal(imageId, state.image.id);
                state.image = { ...state.image, review_status: reviewStatus, visual_role: visualRole, hero_locked: heroLocked, updated_at: updatedAt };
                return { success: true, meta: { changes: 1 } };
              }
              if (/UPDATE place_images\s+SET hero_locked = 0/.test(sql)) {
                state.image = { ...state.image, hero_locked: 0, visual_role: state.image.visual_role === "hero" ? "gallery" : state.image.visual_role, updated_at: args[0] };
                return { success: true, meta: { changes: 1 } };
              }
              if (/UPDATE place_images\s+SET hero_locked = 1/.test(sql)) {
                const [updatedAt, imageId, placeId] = args;
                assert.equal(imageId, state.image.id);
                assert.equal(placeId, state.image.place_id);
                state.image = { ...state.image, hero_locked: 1, visual_role: "hero", review_status: "approved", updated_at: updatedAt };
                return { success: true, meta: { changes: 1 } };
              }
              if (/INSERT INTO media_reviews/.test(sql)) {
                const [, imageId, reviewer, decision, notes, createdAt] = args;
                state.reviews.push({ imageId, reviewer, decision, notes, createdAt });
                return { success: true, meta: { changes: 1 } };
              }
              throw new Error(`Unexpected SQL: ${sql}`);
            },
          };
        },
      };
    },
  };
  return state;
}

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

test("editorial profile avoids internal route placeholder copy", () => {
  const facts = createVerifiedFactBundle({
    id: "nearby-cafe",
    title: "Tiny Cafe",
    category: "Coffee",
    area: "Old Town",
    coordinates: [35.3391, 25.132],
  });
  const profile = composeEditorialProfile({
    id: "nearby-cafe",
    title: "Tiny Cafe",
    category: "Coffee",
    area: "Old Town",
  }, {
    facts,
    travellerProfile: { focus: "coffee" },
    routeContext: { previousStop: "confirmed visit" },
  });

  assert.doesNotMatch(profile.whyStop, /It can sit|confirmed visit/);
  assert.match(profile.whyStop, /your last confirmed stop/);
});

test("Worker editorial avoids internal route placeholder copy", async () => {
  const response = await worker.fetch(new Request("https://trip.test/api/places/tiny-cafe/editorial/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      place: { id: "tiny-cafe", title: "Tiny Cafe", category: "Coffee", area: "Old Town" },
      facts: [
        { key: "name", value: "Tiny Cafe", confidence: 0.9 },
        { key: "category", value: "Coffee", confidence: 0.8 },
        { key: "area", value: "Old Town", confidence: 0.7 },
      ],
      travellerProfile: { focus: "coffee" },
      routeContext: { previousStop: "confirmed visit" },
      media: {},
    }),
  }), {}, {});

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.doesNotMatch(payload.editorial.whyStop, /It can sit|confirmed visit/);
  assert.match(payload.editorial.whyStop, /your last confirmed stop/);
});

test("Worker editorial uses grammatical standfirst articles", async () => {
  const response = await worker.fetch(new Request("https://trip.test/api/places/chania/editorial/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      place: { id: "chania", title: "Chania", category: "Old town city", area: "Western Crete" },
      facts: [
        { key: "name", value: "Chania", confidence: 0.9 },
        { key: "category", value: "Old town city", confidence: 0.8 },
        { key: "area", value: "Western Crete", confidence: 0.7 },
      ],
      media: {},
    }),
  }), {}, {});

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.doesNotMatch(payload.editorial.standfirst, /\ba old\b/);
  assert.match(payload.editorial.standfirst, /an old town city stop/);
  assert.match(payload.editorial.whyStop, /route anchor/);
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

test("enrichment service enriches a place through the Worker profile contract first", async () => {
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url) => {
      assert.match(url, /\/api\/places\/enrich\?id=seed-lions-square$/);
      return {
        ok: true,
        async json() {
          return {
            generatedAt: "2026-07-24T12:00:00.000Z",
            refreshAfter: "2026-07-24T12:30:00.000Z",
            providerStatus: [{ provider: "worker-storage", status: "ok", count: 0 }],
            placeProfile: {
              schemaVersion: "place-profile-v1",
              place: {
                id: "seed-lions-square",
                canonicalName: "Lions Square",
                coordinates: [35.3391, 25.132],
              },
              facts: [{ key: "category", value: "Coffee", sourceName: "Trip curated seed", confidence: 0.7 }],
              editorial: { standfirst: "Lions Square is useful for coffee.", confidence: 0.7 },
              media: { hero: null, gallery: [], coverage: { images: "fallback" } },
              sources: [],
              attributions: [],
              coverage: "partial",
            },
          };
        },
      };
    },
  });

  const profile = await service.enrichPlace({ id: "seed-lions-square", title: "Lions Square" });
  assert.equal(profile.place.canonicalName, "Lions Square");
  assert.equal(profile.facts[0].key, "category");
  assert.equal(profile.providerStatus[0].provider, "worker-storage");
});

test("enrichment service ignores coordinates-only Worker profiles and falls back locally", async () => {
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url) => {
      if (String(url).includes("/api/places/enrich")) {
        return {
          ok: true,
          async json() {
            return {
              placeProfile: {
                schemaVersion: "place-profile-v1",
                place: { id: "unknown", canonicalName: "unknown" },
                facts: [],
                editorial: {},
                media: { hero: null, gallery: [], coverage: { images: "fallback" } },
                sources: [],
                attributions: [],
                coverage: "coordinates-only",
              },
            };
          },
        };
      }
      throw new Error("media providers unavailable");
    },
  });

  const profile = await service.enrichPlace({
    id: "local-cafe",
    title: "Local Cafe",
    category: "Coffee",
    coordinates: [35.3391, 25.132],
  });

  assert.equal(profile.place.title, "Local Cafe");
  assert.ok(profile.facts.some((fact) => fact.key === "category"));
  assert.equal(profile.media.hero.illustrativeOnly, true);
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

test("enrichment service resolves location through the Worker contract", async () => {
  let requestedBody = null;
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url, options = {}) => {
      assert.match(url, /\/api\/location\/resolve$/);
      requestedBody = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            location: {
              placeId: "place-heraklion",
              coordinates: [35.3391, 25.132],
              confidence: 0.92,
              matchLevel: "nearby-locality",
              city: "Heraklion",
              region: "Crete",
              countryCode: "GR",
              provider: "nominatim",
            },
            providerStatus: [{ provider: "nominatim", status: "ok", count: 1 }],
            placeProfile: {
              place: {
                id: "place-heraklion",
                canonicalName: "Heraklion",
                localName: "Ηράκλειο",
                countryCode: "GR",
                region: "Crete",
                municipality: "Heraklion",
                coordinates: [35.3391, 25.132],
                categories: ["boundary", "administrative"],
              },
              facts: [
                { key: "displayName", value: "Heraklion, Crete, Greece" },
                { key: "country", value: "Greece" },
              ],
              sources: [],
            },
          };
        },
      };
    },
  });

  const resolved = await service.resolveLocation({
    coordinates: [35.3391, 25.132],
    accuracyMeters: 12,
  });

  assert.deepEqual(requestedBody.coordinates, [35.3391, 25.132]);
  assert.equal(requestedBody.accuracyMeters, 12);
  assert.equal(resolved.locality, "Heraklion");
  assert.equal(resolved.region, "Crete");
  assert.equal(resolved.area.city, "Heraklion");
  assert.equal(resolved.area.island, "Crete");
  assert.equal(resolved.place.canonicalName, "Heraklion");
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

test("enrichment service forwards forced media refresh to the Worker", async () => {
  let requestedUrl = "";
  let postedBody = null;
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url, options = {}) => {
      requestedUrl = String(url);
      postedBody = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            media: {
              hero: {
                id: "commons-koules",
                provider: "commons",
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Venitian_Fortress_of_Koules.jpg",
                visualRole: "hero",
                illustrativeOnly: false,
              },
              gallery: [],
              coverage: { images: "partial" },
            },
            providerStatus: [{ provider: "commons", status: "ok", count: 1 }],
          };
        },
      };
    },
  });

  const media = await service.refreshMedia({ id: "koules", title: "Koules Fortress" }, { force: true });

  assert.match(requestedUrl, /\/api\/places\/koules\/media\/refresh\?refresh=1$/);
  assert.equal(postedBody.force, true);
  assert.equal(media.hero.provider, "commons");
});

test("enrichment service locks a selected Worker image as hero", async () => {
  let requestedUrl = "";
  let postedBody = null;
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url, options = {}) => {
      requestedUrl = String(url);
      postedBody = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            generatedAt: "2026-07-24T12:00:00.000Z",
            providerStatus: [{ provider: "worker-storage", status: "ok", count: 1 }],
            image: {
              id: "image-1",
              imageUrl: "https://example.com/hero.jpg",
              thumbnailUrl: "https://example.com/thumb.jpg",
              visualRole: "hero",
              reviewStatus: "approved",
              heroLocked: true,
            },
          };
        },
      };
    },
  });

  const result = await service.lockHeroImage({ id: "koules" }, { id: "image-1" });

  assert.match(requestedUrl, /\/api\/places\/koules\/hero\/lock$/);
  assert.equal(postedBody.imageId, "image-1");
  assert.equal(result.image.heroLocked, true);
  assert.equal(result.image.reviewStatus, "approved");
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

test("enrichment service generates editorial through the Worker", async () => {
  let postedBody = null;
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url, options = {}) => {
      assert.match(url, /\/api\/places\/lions-square\/editorial\/generate$/);
      postedBody = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            editorial: {
              standfirst: "Lions Square in Heraklion works as a coffee stop",
              whyStop: "Lions Square is a focused coffee stop around Heraklion.",
              atmosphere: "Small-scale.",
              essentialExperience: ["Order coffee"],
              dontMiss: ["Coffee quality"],
              hiddenDetails: [],
              idealFor: ["coffee reset"],
              skipIf: ["it pulls you too far off route"],
              suggestedDurationMinutes: 35,
              bestArrivalWindow: "morning or mid-afternoon",
              routeRole: "coffee-stop",
              coffeeSummary: "Lions Square belongs in the coffee shortlist.",
              foodSummary: "",
              nextBestStop: "",
              localTip: "Save it if the coffee matches your taste.",
              practicalWarnings: [],
              sourceIds: ["place:lions-square"],
              generatedAt: "2026-07-24T12:00:00.000Z",
              editorialVersion: "worker-deterministic-v1",
              confidence: 0.82,
            },
          };
        },
      };
    },
  });

  const editorial = await service.generateEditorial({
    id: "lions-square",
    title: "Lions Square",
    category: "Coffee",
    area: "Heraklion",
  }, {
    travellerProfile: { focus: "coffee" },
  });

  assert.equal(postedBody.place.title, "Lions Square");
  assert.equal(editorial.routeRole, "coffee-stop");
  assert.equal(editorial.editorialVersion, "worker-deterministic-v1");
});

test("enrichment service falls back to local editorial when Worker generation fails", async () => {
  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async () => {
      throw new Error("worker unavailable");
    },
  });

  const editorial = await service.generateEditorial({
    id: "museum",
    title: "Heraklion Archaeological Museum",
    category: "Museum",
    area: "City center",
  }, {
    travellerProfile: { focus: "arty" },
  });

  assert.match(editorial.whyStop, /cultural anchor/);
  assert.equal(editorial.editorialVersion, "deterministic-v1");
});
