const API_PREFIX = "/api/";
const API_VERSION = "overpass-nearby-v1";
const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith(API_PREFIX)) {
      return handleApiRequest(request, env, ctx).catch((error) => jsonError("internal_error", error?.message || "Unexpected API error", 500));
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const route = matchRoute(request.method, url.pathname);

  if (request.method === "OPTIONS") return json({}, 204);
  if (!route) return jsonError("not_found", "API route not found", 404);

  const context = createApiContext(request, env, ctx, route.params);
  return route.handler(context);
}

function matchRoute(method, pathname) {
  const routes = [
    ["GET", /^\/api\/health$/, healthHandler],
    ["POST", /^\/api\/location\/resolve$/, locationResolveHandler],
    ["GET", /^\/api\/places\/nearby$/, nearbyPlacesHandler],
    ["POST", /^\/api\/places\/enrich-location$/, enrichLocationHandler],
    ["GET", /^\/api\/places\/enrich$/, enrichPlaceHandler],
    ["POST", /^\/api\/places\/([^/]+)\/media\/refresh$/, mediaRefreshHandler],
    ["POST", /^\/api\/media\/light$/, lightMediaPutHandler],
    ["GET", /^\/api\/media\/light\/([^/]+)$/, lightMediaGetHandler],
    ["POST", /^\/api\/places\/([^/]+)\/editorial\/generate$/, editorialGenerateHandler],
    ["PATCH", /^\/api\/place-images\/([^/]+)$/, placeImagePatchHandler],
    ["POST", /^\/api\/places\/([^/]+)\/hero\/lock$/, heroLockHandler],
    ["GET", /^\/api\/places\/([^/]+)\/attributions$/, attributionHandler],
  ];

  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue;
    const match = pathname.match(pattern);
    if (!match) continue;
    return { handler, params: match.slice(1).map(decodeURIComponent) };
  }

  return null;
}

function createApiContext(request, env, ctx, params) {
  return {
    request,
    env,
    ctx,
    params,
    hasDb: Boolean(env.TRIP_DB),
    hasCache: Boolean(env.TRIP_CACHE),
    hasMedia: Boolean(env.TRIP_MEDIA),
    hasLightMedia: Boolean(env.TRIP_DB),
  };
}

function healthHandler({ hasDb, hasCache, hasMedia, hasLightMedia }) {
  return json({
    ok: true,
    service: "trip-enrichment-api",
    apiVersion: API_VERSION,
    bindings: {
      d1: hasDb ? "ready" : "missing",
      kv: hasCache ? "ready" : "missing",
      r2: hasMedia ? "ready" : "missing",
      lightMedia: hasLightMedia ? "ready-d1" : "missing",
    },
    generatedAt: new Date().toISOString(),
  });
}

async function locationResolveHandler(context) {
  const body = await readJson(context.request);
  const coordinates = normalizeCoordinates(body.coordinates || [body.latitude, body.longitude]);
  if (!coordinates) return jsonError("invalid_coordinates", "Provide latitude/longitude or coordinates.", 400);
  const nominatimResult = await reverseGeocodeCoordinates(coordinates, context.request);
  const nominatim = nominatimResult.data;
  const place = nominatim
    ? createPlaceFromNominatim(nominatim, { ...body, coordinates })
    : createPlaceFromInput({ ...body, title: body.title || body.name || "Current location", coordinates });
  const facts = [
    ...createCoreFacts(place, { accuracyMeters: body.accuracyMeters }),
    ...createNominatimFacts(place, nominatim),
  ];
  if (context.hasDb) {
    await persistPlaceProfile(context, {
      place,
      facts,
      editorial: createPendingEditorial(place.canonicalName),
      source: createNominatimSource(place, nominatim),
    });
  }
  const profile = await getStoredPlaceProfile(context, place.id);

  return json(partialResponse("location.resolve", {
    location: {
      placeId: place.id,
      coordinates,
      confidence: body.accuracyMeters ? Math.max(0.2, Math.min(1, 1 - Number(body.accuracyMeters) / 5000)) : 0.65,
      matchLevel: nominatim ? getNominatimMatchLevel(nominatim) : "coordinates-only",
      city: place.municipality || "",
      region: place.region || "",
      countryCode: place.countryCode || "",
      provider: nominatim ? "nominatim" : "coordinates",
    },
    providerStatus: [
      createStorageStatus(context),
      {
        provider: "nominatim",
        status: nominatim ? "ok" : "error",
        error: nominatim ? "" : nominatimResult.error || "reverse-geocode-unavailable",
        count: nominatim ? 1 : 0,
        latencyMs: nominatimResult.latencyMs,
        checkedAt: new Date().toISOString(),
      },
    ],
    placeProfile: profile || createCoordinatesOnlyProfile({ id: place.id, coordinates, title: place.canonicalName }),
  }, context));
}

async function nearbyPlacesHandler(context) {
  const url = new URL(context.request.url);
  const coordinates = normalizeCoordinates([url.searchParams.get("lat"), url.searchParams.get("lng")]);
  if (!coordinates) return jsonError("invalid_coordinates", "Provide lat and lng query parameters.", 400);
  const radiusMeters = clampNumber(url.searchParams.get("radius"), 250, 3000, 1500);
  const intent = url.searchParams.get("intent") || "traveler";
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const cachedPlaces = await getStoredNearbyPlaces(context, coordinates, radiusMeters, intent);
  let overpass = {
    ok: false,
    elements: [],
    error: cachedPlaces.length ? "refreshing-in-background" : "",
    latencyMs: 0,
    endpoint: "",
  };
  let overpassPlaces = [];

  if (cachedPlaces.length && !forceRefresh) {
    context.ctx?.waitUntil(refreshNearbyCache(context, coordinates, radiusMeters, intent));
  } else {
    overpass = await fetchOverpassNearby(coordinates, radiusMeters, context.request);
    overpassPlaces = normalizeOverpassElements(overpass.elements, coordinates, { intent }).slice(0, 12);
  }
  const places = overpassPlaces.length ? overpassPlaces : cachedPlaces.slice(0, 12);

  if (context.hasDb) {
    for (const place of overpassPlaces) {
      await persistPlaceProfile(context, {
        place,
        facts: createOsmPlaceFacts(place),
        editorial: createPendingEditorial(place.canonicalName),
        source: createOsmSource(place),
      });
    }
  }

  return json(partialResponse("places.nearby", {
    places,
    query: {
      coordinates,
      intent,
      radiusMeters,
    },
    providerStatus: [
      createStorageStatus(context),
      {
        provider: "overpass",
        status: overpass.ok ? "ok" : cachedPlaces.length && !forceRefresh ? "refreshing" : "error",
        error: overpass.error,
        count: overpassPlaces.length,
        latencyMs: overpass.latencyMs,
        endpoint: overpass.endpoint || "",
        checkedAt: new Date().toISOString(),
      },
      {
        provider: "d1-nearby-cache",
        status: cachedPlaces.length ? "ok" : "empty",
        error: cachedPlaces.length ? "" : "no-stored-places-nearby",
        count: cachedPlaces.length,
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
      },
    ],
  }, context));
}

async function refreshNearbyCache(context, coordinates, radiusMeters, intent) {
  const request = new Request(`https://trip.rynell.org/api/places/nearby?intent=${encodeURIComponent(intent)}`);
  const overpass = await fetchOverpassNearby(coordinates, radiusMeters, request);
  if (!overpass.ok) return;
  const places = normalizeOverpassElements(overpass.elements, coordinates, { intent }).slice(0, 12);
  if (!places.length || !context.hasDb) return;
  for (const place of places) {
    await persistPlaceProfile(context, {
      place,
      facts: createOsmPlaceFacts(place),
      editorial: createPendingEditorial(place.canonicalName),
      source: createOsmSource(place),
    });
  }
}

async function enrichLocationHandler(context) {
  const body = await readJson(context.request);
  const coordinates = normalizeCoordinates(body.coordinates || [body.latitude, body.longitude]);
  if (!coordinates) return jsonError("invalid_coordinates", "Provide coordinates for enrichment.", 400);
  const place = createPlaceFromInput({ ...body, coordinates, title: body.title || body.name || "Current location" });
  const facts = createCoreFacts(place, { accuracyMeters: body.accuracyMeters });
  const editorial = createPendingEditorial(place.canonicalName);

  if (context.hasDb) await persistPlaceProfile(context, { place, facts, editorial });

  return json(partialResponse("places.enrichLocation", {
    placeProfile: await getStoredPlaceProfile(context, place.id) || createCoordinatesOnlyProfile({ id: place.id, coordinates, title: place.canonicalName }),
  }, context));
}

async function enrichPlaceHandler(context) {
  const url = new URL(context.request.url);
  const placeId = url.searchParams.get("id") || "";
  if (!placeId) return jsonError("missing_place_id", "Provide a place id.", 400);
  const profile = await getStoredPlaceProfile(context, placeId);
  if (profile) {
    return json(partialResponse("places.enrich", {
      placeProfile: profile,
    }, context));
  }

  return json(partialResponse("places.enrich", {
    placeProfile: createCoordinatesOnlyProfile({ id: placeId, title: placeId }),
  }, context));
}

function mediaRefreshHandler(context) {
  const [placeId] = context.params;
  return json(partialResponse("places.mediaRefresh", {
    placeId,
    media: {
      hero: null,
      gallery: [],
      coverage: { images: context.hasLightMedia ? "partial" : "fallback" },
    },
  }, context));
}

async function lightMediaPutHandler(context) {
  if (!context.hasDb) return jsonError("missing_d1", "TRIP_DB is required for D1 light media storage.", 503);

  const body = await readJson(context.request);
  const key = normalizeMediaKey(body.key);
  if (!key) return jsonError("invalid_media_key", "Provide a safe media key.", 400);

  const bodyText = String(body.bodyText || body.dataUrl || "");
  const contentType = String(body.contentType || inferContentType(bodyText) || "text/plain").slice(0, 120);
  const byteSize = byteLength(bodyText);
  if (!bodyText) return jsonError("empty_media", "Provide bodyText or dataUrl.", 400);
  if (byteSize > 256 * 1024) return jsonError("media_too_large", "D1 light media is limited to 256 KB per object.", 413);

  const now = new Date().toISOString();
  await context.env.TRIP_DB.prepare(`
    INSERT INTO light_media_objects (
      key, content_type, byte_size, body_text, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      content_type = excluded.content_type,
      byte_size = excluded.byte_size,
      body_text = excluded.body_text,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).bind(
    key,
    contentType,
    byteSize,
    bodyText,
    JSON.stringify({
      ...(body.metadata || {}),
      placeId: body.placeId || "",
      imageId: body.imageId || "",
    }),
    now,
    now
  ).run();

  return json({
    ok: true,
    operation: "media.light.put",
    media: {
      key,
      url: `/api/media/light/${encodeURIComponent(key)}`,
      contentType,
      byteSize,
      storage: "d1-light",
    },
    generatedAt: now,
  });
}

async function lightMediaGetHandler(context) {
  if (!context.hasDb) return jsonError("missing_d1", "TRIP_DB is required for D1 light media storage.", 503);

  const [rawKey] = context.params;
  const key = normalizeMediaKey(rawKey);
  if (!key) return jsonError("invalid_media_key", "Provide a safe media key.", 400);

  const row = await context.env.TRIP_DB.prepare(`
    SELECT key, content_type, byte_size, body_text, metadata_json, updated_at
    FROM light_media_objects
    WHERE key = ?
  `).bind(key).first();

  if (!row) return jsonError("media_not_found", "Light media object was not found.", 404);

  return new Response(row.body_text || "", {
    headers: {
      "Content-Type": row.content_type || "text/plain",
      "Cache-Control": "public, max-age=300",
      "X-Trip-Media-Key": row.key,
      "X-Trip-Media-Size": String(row.byte_size || 0),
      "X-Trip-Media-Storage": "d1-light",
      "X-Trip-Media-Updated": row.updated_at || "",
    },
  });
}

function editorialGenerateHandler(context) {
  const [placeId] = context.params;
  return json(partialResponse("places.editorialGenerate", {
    placeId,
    editorial: createPendingEditorial(placeId),
  }, context));
}

async function placeImagePatchHandler(context) {
  const [imageId] = context.params;
  const body = await readJson(context.request);
  return json(partialResponse("placeImages.patch", {
    imageId,
    reviewState: body.reviewState || body.reviewStatus || "pending",
  }, context));
}

function heroLockHandler(context) {
  const [placeId] = context.params;
  return json(partialResponse("places.heroLock", {
    placeId,
    locked: false,
  }, context));
}

function attributionHandler(context) {
  const [placeId] = context.params;
  return json(partialResponse("places.attributions", {
    placeId,
    attributions: [],
  }, context));
}

function partialResponse(operation, payload, context) {
  const missingBindings = [];
  if (!context.hasDb) missingBindings.push("TRIP_DB");
  if (!context.hasCache) missingBindings.push("TRIP_CACHE");
  if (!context.hasMedia && !context.hasLightMedia) missingBindings.push("TRIP_MEDIA");

  return {
    ok: true,
    operation,
    coverage: missingBindings.length ? "coordinates-only" : "partial",
    providerStatus: [createStorageStatus(context)],
    generatedAt: new Date().toISOString(),
    refreshAfter: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    ...payload,
  };
}

function createStorageStatus(context) {
  const missingBindings = [];
  if (!context.hasDb) missingBindings.push("TRIP_DB");
  if (!context.hasCache) missingBindings.push("TRIP_CACHE");
  if (!context.hasMedia && !context.hasLightMedia) missingBindings.push("TRIP_MEDIA");

  return {
    provider: "worker-storage",
    status: missingBindings.length ? "disabled" : "ok",
    error: missingBindings.length ? `Missing bindings: ${missingBindings.join(", ")}` : "",
    count: 0,
    latencyMs: 0,
    checkedAt: new Date().toISOString(),
  };
}

function createCoordinatesOnlyProfile({ id = "coordinates-only", title = "Current location", coordinates = null } = {}) {
  return {
    schemaVersion: "place-profile-v1",
    place: {
      id,
      canonicalName: title,
      coordinates,
    },
    facts: [],
    editorial: createPendingEditorial(title),
    media: {
      hero: null,
      gallery: [],
      roles: {},
      coverage: { images: "fallback" },
    },
    sources: [],
    attributions: [],
    providerStatus: [],
    coverage: "coordinates-only",
    generatedAt: new Date().toISOString(),
    refreshAfter: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
  };
}

async function persistPlaceProfile(context, { place, facts = [], editorial = null, source: inputSource = null }) {
  if (!context.hasDb) return;
  const now = new Date().toISOString();
  await context.env.TRIP_DB.prepare(`
    INSERT INTO places (
      id, canonical_name, local_name, country_code, region, municipality, latitude, longitude,
      osm_type, osm_id, wikidata_id, wikipedia_url, official_website, categories, confidence, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      local_name = excluded.local_name,
      country_code = excluded.country_code,
      region = excluded.region,
      municipality = excluded.municipality,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      categories = excluded.categories,
      confidence = excluded.confidence,
      updated_at = excluded.updated_at
  `).bind(
    place.id,
    place.canonicalName,
    place.localName || "",
    place.countryCode || "",
    place.region || "",
    place.municipality || "",
    place.coordinates?.[0] ?? null,
    place.coordinates?.[1] ?? null,
    place.osmType || "",
    place.osmId || "",
    place.wikidataId || "",
    place.wikipediaUrl || "",
    place.officialWebsite || "",
    JSON.stringify(place.categories || []),
    place.confidence ?? 0.55,
    now,
    now
  ).run();

  await persistAliases(context, place, now);
  const source = await persistSource(context, place, inputSource || {
    provider: "trip-worker",
    providerId: place.id,
    name: "Trip Worker",
    type: "system",
    url: "",
    confidence: 0.55,
    retrievedAt: now,
  });
  await persistFacts(context, place.id, facts, source.id, now);
  if (editorial) await persistEditorial(context, place.id, editorial, now);
}

async function persistAliases(context, place, now) {
  const aliases = [...new Set([place.canonicalName, place.localName, ...(place.aliases || [])].filter(Boolean))];
  for (const alias of aliases) {
    await context.env.TRIP_DB.prepare(`
      INSERT OR IGNORE INTO place_aliases (id, place_id, alias, language, normalized_alias, source_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      stableId("alias", [place.id, alias]),
      place.id,
      alias,
      "",
      normalizeLookupText(alias),
      "",
      now
    ).run();
  }
}

async function persistSource(context, place, source) {
  const id = stableId("source", [place.id, source.provider, source.providerId, source.url]);
  await context.env.TRIP_DB.prepare(`
    INSERT INTO place_sources (id, place_id, provider, provider_id, name, type, url, confidence, retrieved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      url = excluded.url,
      confidence = excluded.confidence,
      retrieved_at = excluded.retrieved_at
  `).bind(
    id,
    place.id,
    source.provider,
    source.providerId || "",
    source.name || source.provider,
    source.type || "external",
    source.url || "",
    source.confidence ?? 0.5,
    source.retrievedAt || new Date().toISOString()
  ).run();
  return { ...source, id };
}

async function persistFacts(context, placeId, facts, sourceId, now) {
  for (const fact of facts) {
    await context.env.TRIP_DB.prepare(`
      INSERT INTO place_facts (id, place_id, key, label, value_json, source_id, confidence, volatility, retrieved_at, refresh_after)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        value_json = excluded.value_json,
        confidence = excluded.confidence,
        volatility = excluded.volatility,
        retrieved_at = excluded.retrieved_at,
        refresh_after = excluded.refresh_after
    `).bind(
      fact.id || stableId("fact", [placeId, fact.key, JSON.stringify(fact.value)]),
      placeId,
      fact.key,
      fact.label || labelFromKey(fact.key),
      JSON.stringify(fact.value),
      sourceId,
      fact.confidence ?? 0.55,
      fact.volatile ? "volatile" : "stable",
      fact.retrievedAt || now,
      fact.refreshAfter || null
    ).run();
  }
}

async function persistEditorial(context, placeId, editorial, now) {
  const id = stableId("editorial", [placeId, editorial.editorialVersion || "worker", editorial.generatedAt || now]);
  await context.env.TRIP_DB.prepare(`
    INSERT INTO place_editorial_profiles (
      id, place_id, editorial_json, source_ids_json, validation_json, route_context_hash,
      traveller_context_hash, confidence, editorial_version, review_status, generated_at, refresh_after
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    placeId,
    JSON.stringify(editorial),
    JSON.stringify(editorial.sourceIds || []),
    "{}",
    "",
    "",
    editorial.confidence ?? 0.2,
    editorial.editorialVersion || "worker-placeholder-v1",
    "generated",
    editorial.generatedAt || now,
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
  ).run();
}

async function getStoredPlaceProfile(context, placeId) {
  if (!context.hasDb || !placeId) return null;
  const place = await context.env.TRIP_DB.prepare(`
    SELECT * FROM places WHERE id = ?
  `).bind(placeId).first();
  if (!place) return null;

  const factsResult = await context.env.TRIP_DB.prepare(`
    SELECT f.*, s.provider, s.name AS source_name, s.type AS source_type, s.url AS source_url
    FROM place_facts f
    LEFT JOIN place_sources s ON s.id = f.source_id
    WHERE f.place_id = ?
    ORDER BY f.created_at ASC
  `).bind(placeId).all();
  const imagesResult = await context.env.TRIP_DB.prepare(`
    SELECT * FROM place_images WHERE place_id = ? ORDER BY final_score DESC LIMIT 12
  `).bind(placeId).all();
  const editorial = await context.env.TRIP_DB.prepare(`
    SELECT editorial_json FROM place_editorial_profiles
    WHERE place_id = ?
    ORDER BY generated_at DESC
    LIMIT 1
  `).bind(placeId).first();

  const images = imagesResult.results || [];
  const hero = images.find((image) => image.visual_role === "hero") || null;
  const gallery = images.filter((image) => image.id !== hero?.id);
  return {
    schemaVersion: "place-profile-v1",
    place: normalizeStoredPlace(place),
    facts: (factsResult.results || []).map(normalizeStoredFact),
    editorial: parseJson(editorial?.editorial_json, createPendingEditorial(place.canonical_name)),
    media: {
      hero: hero ? normalizeStoredImage(hero) : null,
      gallery: gallery.map(normalizeStoredImage),
      roles: {},
      coverage: { images: hero ? "partial" : "fallback" },
    },
    sources: [],
    attributions: [],
    providerStatus: [],
    coverage: "partial",
    generatedAt: new Date().toISOString(),
    refreshAfter: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
  };
}

function createPendingEditorial(name) {
  return {
    standfirst: `${name} is ready for enrichment once providers are configured.`,
    whyStop: "",
    atmosphere: "",
    essentialExperience: [],
    dontMiss: [],
    hiddenDetails: [],
    idealFor: [],
    skipIf: [],
    suggestedDurationMinutes: 45,
    bestArrivalWindow: "",
    routeRole: "quick-stop",
    coffeeSummary: "",
    foodSummary: "",
    nextBestStop: "",
    localTip: "",
    practicalWarnings: ["Provider storage is not configured yet."],
    sourceIds: [],
    generatedAt: new Date().toISOString(),
    editorialVersion: "worker-placeholder-v1",
    confidence: 0.2,
  };
}

function createPlaceFromInput(input = {}) {
  const coordinates = normalizeCoordinates(input.coordinates || [input.latitude, input.longitude]);
  const canonicalName = String(input.canonicalName || input.title || input.name || "Current location").trim() || "Current location";
  const id = input.id || stableId("place", [
    input.wikidataId,
    input.osmType,
    input.osmId,
    canonicalName,
    coordinates?.map((value) => Number(value).toFixed(5)).join(","),
  ]);
  return {
    id,
    canonicalName,
    localName: String(input.localName || ""),
    aliases: Array.isArray(input.aliases) ? input.aliases.map(String) : [],
    countryCode: String(input.countryCode || ""),
    region: String(input.region || ""),
    municipality: String(input.municipality || input.city || ""),
    coordinates,
    osmType: String(input.osmType || ""),
    osmId: String(input.osmId || ""),
    wikidataId: String(input.wikidataId || ""),
    wikipediaUrl: sanitizeUrl(input.wikipediaUrl || ""),
    officialWebsite: sanitizeUrl(input.officialWebsite || input.website || ""),
    categories: Array.isArray(input.categories) ? input.categories.map(String) : [input.category || "coordinates"].filter(Boolean),
    confidence: Number(input.confidence || 0.55),
  };
}

async function reverseGeocodeCoordinates(coordinates, request) {
  const startedAt = Date.now();
  const [lat, lng] = coordinates;
  const url = new URL(NOMINATIM_REVERSE_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "12");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("accept-language", "en");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        Referer: new URL(request.url).origin,
        "User-Agent": "Trip Planner Deluxe/0.1 (https://trip.rynell.org)",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        data: null,
        error: `nominatim-http-${response.status}`,
        latencyMs: Date.now() - startedAt,
      };
    }
    return {
      data: await response.json(),
      error: "",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      data: null,
      error: error?.name === "AbortError" ? "nominatim-timeout" : "nominatim-fetch-failed",
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function createPlaceFromNominatim(data = {}, input = {}) {
  const address = data.address || {};
  const extratags = data.extratags || {};
  const namedetails = data.namedetails || {};
  const coordinates = normalizeCoordinates(input.coordinates || [data.lat, data.lon]);
  const canonicalName = cleanAreaName(
    input.title ||
    getAddressCity(address) ||
    namedetails.name ||
    data.name ||
    String(data.display_name || "").split(",")[0] ||
    "Current location"
  );
  const localName = cleanAreaName(namedetails["name:el"] || namedetails.name || data.name || "");
  const osmType = normalizeOsmType(data.osm_type);
  const osmId = data.osm_id ? String(data.osm_id) : "";
  const wikidataId = normalizeWikidataId(extratags.wikidata);

  return {
    id: input.id || stableId("place", [wikidataId, osmType, osmId, canonicalName, coordinates?.join(",")]),
    canonicalName,
    localName,
    aliases: buildNominatimAliases({ canonicalName, localName, namedetails, address }),
    countryCode: String(address.country_code || input.countryCode || "").toUpperCase(),
    region: cleanAreaName(address.state || address.region || address.county || input.region || ""),
    municipality: cleanAreaName(getAddressCity(address) || input.municipality || input.city || ""),
    coordinates,
    osmType,
    osmId,
    wikidataId,
    wikipediaUrl: getWikipediaUrl(extratags),
    officialWebsite: sanitizeUrl(extratags.website || extratags.url || input.officialWebsite || input.website || ""),
    categories: [data.category, data.type, input.category].filter(Boolean).map(String),
    confidence: getNominatimConfidence(data, input.accuracyMeters),
  };
}

function createNominatimSource(place, data) {
  if (!data) {
    return {
      provider: "trip-worker",
      providerId: place.id,
      name: "Trip Worker",
      type: "system",
      url: "",
      confidence: 0.55,
    };
  }

  return {
    provider: "nominatim",
    providerId: [data.osm_type, data.osm_id].filter(Boolean).join(":"),
    name: "OpenStreetMap Nominatim",
    type: "geocoder",
    url: getOpenStreetMapObjectUrl(data),
    confidence: getNominatimConfidence(data),
  };
}

function createNominatimFacts(place, data) {
  if (!data) return [];
  const address = data.address || {};
  const extratags = data.extratags || {};
  const now = new Date().toISOString();
  return [
    createFact(place.id, "displayName", data.display_name || "", 0.74, false, now),
    createFact(place.id, "city", cleanAreaName(getAddressCity(address)), 0.76, false, now),
    createFact(place.id, "region", cleanAreaName(address.state || address.region || address.county || ""), 0.72, false, now),
    createFact(place.id, "country", address.country || "", 0.78, false, now),
    createFact(place.id, "countryCode", String(address.country_code || "").toUpperCase(), 0.78, false, now),
    createFact(place.id, "osmObject", [data.osm_type, data.osm_id].filter(Boolean).join(":"), 0.82, false, now),
    createFact(place.id, "wikidataId", normalizeWikidataId(extratags.wikidata), 0.7, false, now),
    createFact(place.id, "website", extratags.website || extratags.url || "", 0.58, true, now),
  ].filter((fact) => fact.value !== "");
}

function buildNominatimAliases({ canonicalName, localName, namedetails = {}, address = {} }) {
  return [...new Set([
    canonicalName,
    localName,
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.suburb,
    ...Object.entries(namedetails)
      .filter(([key]) => key === "name" || key.startsWith("name:") || key.includes("alt_name"))
      .map(([, value]) => value),
  ].filter(Boolean).map((value) => cleanAreaName(value)))];
}

function getAddressCity(address = {}) {
  return address.city || address.town || address.village || address.municipality || address.suburb || "";
}

function getNominatimMatchLevel(data = {}) {
  if (["amenity", "tourism", "historic", "shop"].includes(data.category)) return "exact-poi";
  if (["city", "town", "village", "suburb"].includes(data.type)) return "exact-locality";
  if (data.address?.city || data.address?.town || data.address?.village || data.address?.municipality) return "nearby-locality";
  if (data.address?.state || data.address?.country) return "regional-context";
  return "coordinates-only";
}

function getNominatimConfidence(data = {}, accuracyMeters) {
  const accuracyScore = Number.isFinite(Number(accuracyMeters)) ? Math.max(0, Math.min(1, 1 - Number(accuracyMeters) / 5000)) : 0.65;
  const sourceScore = data.osm_id ? 0.22 : 0;
  const displayScore = data.display_name ? 0.1 : 0;
  return Math.max(0.2, Math.min(1, accuracyScore * 0.68 + sourceScore + displayScore));
}

async function getStoredNearbyPlaces(context, coordinates, radiusMeters, intent = "traveler") {
  if (!context.hasDb) return [];
  const [lat, lng] = coordinates;
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const result = await context.env.TRIP_DB.prepare(`
    SELECT *
    FROM places
    WHERE latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
      AND canonical_name != ''
    ORDER BY updated_at DESC
    LIMIT 80
  `).bind(
    lat - latDelta,
    lat + latDelta,
    lng - lngDelta,
    lng + lngDelta
  ).all();

  return (result.results || [])
    .map((row) => {
      const place = normalizeStoredPlace(row);
      if (!place.coordinates) return null;
      if (!isStoredTravelPoi(place)) return null;
      const distanceMeters = Math.round(getDistanceMeters(coordinates, place.coordinates));
      if (distanceMeters > radiusMeters) return null;
      const category = place.category || place.categories?.[0] || "Nearby";
      const tags = storedPlaceTags(place);
      return {
        ...place,
        distanceMeters,
        distance: formatDistance(distanceMeters),
        category,
        tag: category,
        reason: `Stored nearby profile · ${formatDistance(distanceMeters)} away`,
        source: "Trip D1 nearby cache",
        openingHours: "",
        score: scoreNearbyPlace(tags, distanceMeters, intent),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
}

function isStoredTravelPoi(place = {}) {
  const categories = (place.categories || []).map((category) => String(category).toLowerCase());
  if (!categories.length) return false;
  if (categories.some((category) => ["coordinates", "boundary", "administrative", "city", "place"].includes(category))) return false;
  return categories.some((category) => (
    category.includes("coffee") ||
    category.includes("cafe") ||
    category.includes("restaurant") ||
    category.includes("food") ||
    category.includes("museum") ||
    category.includes("sight") ||
    category.includes("walk") ||
    category.includes("beach") ||
    category.includes("archaeology") ||
    category.includes("historic")
  ));
}

async function fetchOverpassNearby(coordinates, radiusMeters, request) {
  const startedAt = Date.now();
  const queries = buildOverpassQueries(coordinates, radiusMeters, request);
  let firstError = null;

  for (const query of queries) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      const result = await runOverpassQuery(query.query, request, startedAt, endpoint);
      if (result.ok) {
        return {
          ...result,
          error: firstError ? `${query.name}-after-${firstError}` : "",
        };
      }
      firstError ||= result.error;
      if (Date.now() - startedAt > 11000) return result;
    }
  }

  return {
    ok: false,
    elements: [],
    error: firstError || "overpass-unavailable",
    latencyMs: Date.now() - startedAt,
    endpoint: "",
  };
}

async function runOverpassQuery(query, request, startedAt = Date.now(), endpoint) {
  const body = new URLSearchParams({ data: query });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Referer: new URL(request.url).origin,
        "User-Agent": "Trip Planner Deluxe/0.1 (https://trip.rynell.org)",
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, elements: [], error: `overpass-http-${response.status}`, latencyMs: Date.now() - startedAt, endpoint };
    }
    const data = await response.json();
    return { ok: true, elements: data.elements || [], error: "", latencyMs: Date.now() - startedAt, endpoint };
  } catch (error) {
    return {
      ok: false,
      elements: [],
      error: error?.name === "AbortError" ? "overpass-timeout" : "overpass-fetch-failed",
      latencyMs: Date.now() - startedAt,
      endpoint,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildOverpassQueries(coordinates, radiusMeters, request) {
  const intent = new URL(request.url).searchParams.get("intent") || "traveler";
  if (intent === "coffee") {
    return [
      { name: "coffee", query: buildCoffeeOverpassQuery(coordinates, radiusMeters) },
      { name: "fallback", query: buildFallbackOverpassQuery(coordinates) },
    ];
  }
  return [
    { name: "traveler", query: buildNearbyOverpassQuery(coordinates, radiusMeters) },
    { name: "fallback", query: buildFallbackOverpassQuery(coordinates) },
  ];
}

function buildCoffeeOverpassQuery([lat, lng], radius) {
  const primaryRadius = Math.min(radius, 900);
  return `
    [out:json][timeout:6];
    (
      node(around:${primaryRadius},${lat},${lng})["amenity"="cafe"];
      way(around:${primaryRadius},${lat},${lng})["amenity"="cafe"];
      node(around:${primaryRadius},${lat},${lng})["shop"~"coffee|bakery"];
      way(around:${primaryRadius},${lat},${lng})["shop"~"coffee|bakery"];
      node(around:${primaryRadius},${lat},${lng})["craft"="roastery"];
      way(around:${primaryRadius},${lat},${lng})["craft"="roastery"];
    );
    out center tags 24;
  `;
}

function buildFallbackOverpassQuery([lat, lng]) {
  return `
    [out:json][timeout:6];
    (
      node(around:550,${lat},${lng})["amenity"="cafe"];
      node(around:550,${lat},${lng})["amenity"="restaurant"];
      node(around:550,${lat},${lng})["shop"="bakery"];
    );
    out center tags 18;
  `;
}

function buildNearbyOverpassQuery([lat, lng], radius) {
  const primaryRadius = Math.min(radius, 1100);
  return `
    [out:json][timeout:8];
    (
      node(around:${primaryRadius},${lat},${lng})["amenity"~"cafe|restaurant|bar|pub|ice_cream|food_court"];
      way(around:${primaryRadius},${lat},${lng})["amenity"~"cafe|restaurant|bar|pub|ice_cream|food_court"];
      node(around:${primaryRadius},${lat},${lng})["tourism"~"attraction|museum|viewpoint|gallery"];
      way(around:${primaryRadius},${lat},${lng})["tourism"~"attraction|museum|viewpoint|gallery"];
      node(around:${primaryRadius},${lat},${lng})["historic"];
      way(around:${primaryRadius},${lat},${lng})["historic"];
      node(around:${primaryRadius},${lat},${lng})["shop"~"bakery|coffee|books|deli"];
      way(around:${primaryRadius},${lat},${lng})["shop"~"bakery|coffee|books|deli"];
      node(around:${primaryRadius},${lat},${lng})["amenity"~"toilets|drinking_water"];
    );
    out center tags 36;
  `;
}

function normalizeOverpassElements(elements = [], origin, options = {}) {
  const seen = new Set();
  return elements
    .map((element) => normalizeOverpassElement(element, origin, options))
    .filter(Boolean)
    .filter((place) => {
      const key = `${normalizeLookupText(place.canonicalName)}-${Math.round(place.coordinates[0] * 10000)}-${Math.round(place.coordinates[1] * 10000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.score - b.score);
}

function normalizeOverpassElement(element = {}, origin, options = {}) {
  const tags = element.tags || {};
  const title = tags["name:en"] || tags.name;
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  if (!title || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const coordinates = [lat, lng];
  const category = classifyNearbyPlace(tags);
  const distanceMeters = Math.round(getDistanceMeters(origin, coordinates));
  const score = scoreNearbyPlace(tags, distanceMeters, options.intent);
  const osmType = normalizeOsmType(element.type);
  const osmId = element.id ? String(element.id) : "";
  const wikidataId = normalizeWikidataId(tags.wikidata);
  const place = {
    id: stableId("osm", [osmType, osmId, title, coordinates.join(",")]),
    canonicalName: cleanAreaName(title),
    localName: cleanAreaName(tags["name:el"] || tags.name || ""),
    aliases: buildOsmAliases(tags, title),
    countryCode: "",
    region: "",
    municipality: "",
    coordinates,
    osmType,
    osmId,
    wikidataId,
    wikipediaUrl: getWikipediaUrl(tags),
    officialWebsite: sanitizeUrl(tags.website || tags.contact?.website || ""),
    categories: [category, tags.amenity, tags.tourism, tags.historic, tags.shop].filter(Boolean).map(String),
    confidence: wikidataId || tags.website ? 0.72 : 0.62,
    distanceMeters,
    distance: formatDistance(distanceMeters),
    category,
    tag: category,
    reason: buildNearbyReason(tags, category),
    source: buildNearbySource(tags),
    openingHours: tags.opening_hours || "",
    score,
  };
  return place;
}

function classifyNearbyPlace(tags) {
  if (tags.craft === "roastery" || tags.roastery === "yes") return "Coffee roastery";
  if (tags.coffee === "specialty") return "Specialty coffee";
  if (tags.amenity === "cafe" || tags.shop === "coffee") return "Coffee";
  if (["restaurant", "food_court"].includes(tags.amenity)) return "Food";
  if (["bar", "pub"].includes(tags.amenity)) return "Drink";
  if (tags.amenity === "toilets") return "Toilets";
  if (tags.amenity === "drinking_water") return "Water";
  if (["museum", "gallery"].includes(tags.tourism)) return "Culture";
  if (["viewpoint", "attraction"].includes(tags.tourism) || tags.historic) return "Sight";
  if (["park", "garden"].includes(tags.leisure)) return "Reset";
  if (tags.shop) return "Shop";
  return "Nearby";
}

function scoreNearbyPlace(tags, meters, intent = "traveler") {
  const categoryBoost = tags.tourism || tags.historic ? 0.78 : 1;
  const foodBoost = ["cafe", "restaurant"].includes(tags.amenity) ? 0.86 : 1;
  const coffeeNerdBoost = tags.craft === "roastery" || tags.roastery === "yes" || tags.coffee === "specialty" ? 0.42 : 1;
  const utilityBoost = ["toilets", "drinking_water"].includes(tags.amenity) ? 0.82 : 1;
  const namedBoost = tags.wikidata || tags.website ? 0.9 : 1;
  const intentBoost = intent === "coffee" && (tags.amenity === "cafe" || tags.shop === "coffee" || tags.craft === "roastery") ? 0.55 : 1;
  return meters * categoryBoost * foodBoost * coffeeNerdBoost * utilityBoost * namedBoost * intentBoost;
}

function storedPlaceTags(place = {}) {
  const categories = (place.categories || []).map((category) => String(category).toLowerCase());
  return {
    amenity: categories.some((category) => category.includes("coffee") || category.includes("cafe")) ? "cafe" : "",
    shop: categories.some((category) => category.includes("shop") || category.includes("bakery")) ? "coffee" : "",
    tourism: categories.some((category) => category.includes("culture") || category.includes("sight")) ? "attraction" : "",
    historic: categories.some((category) => category.includes("historic")) ? "yes" : "",
    wikidata: place.wikidataId || "",
    website: place.officialWebsite || "",
  };
}

function createOsmPlaceFacts(place) {
  const now = new Date().toISOString();
  return [
    createFact(place.id, "name", place.canonicalName, 0.78, false, now),
    createFact(place.id, "coordinates", place.coordinates, 0.76, false, now),
    createFact(place.id, "category", place.category, 0.68, false, now),
    createFact(place.id, "distanceMeters", place.distanceMeters, 0.62, true, now),
    createFact(place.id, "openingHours", place.openingHours, 0.46, true, now),
    createFact(place.id, "wikidataId", place.wikidataId, 0.7, false, now),
    createFact(place.id, "website", place.officialWebsite, 0.56, true, now),
  ].filter((fact) => fact.value !== "" && fact.value !== undefined && fact.value !== null);
}

function createOsmSource(place) {
  return {
    provider: "openstreetmap",
    providerId: [place.osmType, place.osmId].filter(Boolean).join(":"),
    name: "OpenStreetMap",
    type: "places",
    url: getOpenStreetMapObjectUrl({ osm_type: place.osmType, osm_id: place.osmId }),
    confidence: place.confidence || 0.62,
  };
}

function buildOsmAliases(tags = {}, title = "") {
  return [...new Set([
    title,
    tags.name,
    tags["name:en"],
    tags["name:el"],
    tags.alt_name,
    tags.official_name,
  ].filter(Boolean).map(cleanAreaName))];
}

function buildNearbyReason(tags, category) {
  const details = [tags.coffee, tags.craft, tags.roastery === "yes" ? "roastery" : "", tags.cuisine, tags.opening_hours, tags.tourism, tags.historic, tags.shop, tags.wheelchair ? `wheelchair ${tags.wheelchair}` : ""].filter(Boolean).slice(0, 2);
  if (details.length) return `${category} nearby · ${details.join(" · ")}`;
  return `${category} nearby, found from OpenStreetMap traveler tags.`;
}

function buildNearbySource(tags) {
  const bits = ["OpenStreetMap"];
  if (tags.wikidata) bits.push(`Wikidata ${tags.wikidata}`);
  if (tags.website) bits.push("website");
  if (tags.opening_hours) bits.push("opening hours");
  return bits.join(" · ");
}

function formatDistance(meters) {
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

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function getOpenStreetMapObjectUrl(data = {}) {
  const osmType = normalizeOsmType(data.osm_type);
  if (!osmType || !data.osm_id) return "";
  return `https://www.openstreetmap.org/${osmType}/${data.osm_id}`;
}

function normalizeOsmType(value = "") {
  const key = String(value || "").toLowerCase();
  if (key === "n") return "node";
  if (key === "w") return "way";
  if (key === "r") return "relation";
  if (["node", "way", "relation"].includes(key)) return key;
  return "";
}

function normalizeWikidataId(value = "") {
  const match = String(value || "").match(/Q\d+/i);
  return match ? match[0].toUpperCase() : "";
}

function getWikipediaUrl(tags = {}) {
  if (!tags.wikipedia) return "";
  const [language, ...titleParts] = String(tags.wikipedia).split(":");
  const title = titleParts.join(":");
  if (!language || !title) return "";
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function cleanAreaName(value = "") {
  return String(value || "")
    .replace(/^municipal unit of\s+/i, "")
    .replace(/^municipality of\s+/i, "")
    .replace(/\s+municipal unit$/i, "")
    .replace(/^region of\s+/i, "")
    .replace(/\s+regional unit$/i, "")
    .replace(/^municipality of\s+/i, "")
    .replace(/\s+municipality$/i, "")
    .replace(/\bmunicipal unit\b/gi, "city")
    .replace(/\bmunicipality\b/gi, "city")
    .trim();
}

function createCoreFacts(place, options = {}) {
  const now = new Date().toISOString();
  return [
    createFact(place.id, "name", place.canonicalName, 0.82, false, now),
    createFact(place.id, "coordinates", place.coordinates, 0.78, false, now),
    createFact(place.id, "category", place.categories?.[0] || "coordinates", 0.62, false, now),
    options.accuracyMeters ? createFact(place.id, "accuracyMeters", Number(options.accuracyMeters), 0.58, true, now) : null,
  ].filter(Boolean);
}

function createFact(placeId, key, value, confidence, volatile, retrievedAt) {
  return {
    id: stableId("fact", [placeId, key, JSON.stringify(value), retrievedAt.slice(0, 10)]),
    key,
    label: labelFromKey(key),
    value,
    confidence,
    volatile,
    retrievedAt,
  };
}

function normalizeStoredPlace(row) {
  const categories = parseJson(row.categories, []);
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    localName: row.local_name || "",
    countryCode: row.country_code || "",
    region: row.region || "",
    municipality: row.municipality || "",
    coordinates: normalizeCoordinates([row.latitude, row.longitude]),
    osmType: row.osm_type || "",
    osmId: row.osm_id || "",
    wikidataId: row.wikidata_id || "",
    wikipediaUrl: row.wikipedia_url || "",
    officialWebsite: row.official_website || "",
    categories,
    category: categories[0] || "Nearby",
    confidence: Number(row.confidence || 0.5),
  };
}

function normalizeStoredFact(row) {
  return {
    id: row.id,
    key: row.key,
    label: row.label || labelFromKey(row.key),
    value: parseJson(row.value_json, row.value_json),
    sourceId: row.source_id || "",
    sourceName: row.source_name || "Trip Worker",
    sourceType: row.source_type || "system",
    sourceUrl: row.source_url || "",
    confidence: Number(row.confidence || 0.5),
    volatility: row.volatility || "stable",
    volatile: row.volatility === "volatile",
    retrievedAt: row.retrieved_at,
  };
}

function normalizeStoredImage(row) {
  return {
    id: row.id,
    placeId: row.place_id,
    provider: row.provider,
    providerId: row.provider_id || "",
    imageUrl: row.image_url || "",
    thumbnailUrl: row.thumbnail_url || row.image_url || "",
    sourcePageUrl: row.source_page_url || "",
    creatorName: row.creator_name || "",
    creatorUrl: row.creator_url || "",
    licenseCode: row.license_code || "",
    licenseName: row.license_name || "",
    licenseUrl: row.license_url || "",
    attributionText: row.attribution_text || "",
    width: Number(row.width || 0),
    height: Number(row.height || 0),
    exactLocation: Boolean(row.exact_location),
    approximateLocation: Boolean(row.approximate_location),
    illustrativeOnly: Boolean(row.illustrative_only),
    visualRole: row.visual_role || "illustrative",
    relevanceScore: Number(row.relevance_score || 0),
    qualityScore: Number(row.quality_score || 0),
    finalScore: Number(row.final_score || 0),
    reviewStatus: row.review_status || "pending",
    checkedAt: row.checked_at || "",
  };
}

async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return {};
  return request.json().catch(() => ({}));
}

function normalizeCoordinates(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lat, lng] = value.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function sanitizeUrl(value = "") {
  const url = String(value || "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function normalizeMediaKey(value = "") {
  const key = String(value || "").trim().replace(/^\/+/, "");
  if (!key || key.length > 180) return "";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.,:@-]*$/.test(key)) return "";
  if (key.includes("..")) return "";
  return key;
}

function inferContentType(value = "") {
  const match = String(value).match(/^data:([^;,]+)[;,]/);
  return match?.[1] || "";
}

function byteLength(value = "") {
  return new TextEncoder().encode(String(value)).byteLength;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stableId(prefix, parts = []) {
  return `${prefix}-${hashValue(parts.filter(Boolean).join("|"))}`;
}

function normalizeLookupText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9α-ωάέήίόύώϊϋΐΰ]+/gi, " ")
    .trim();
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

function json(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function jsonError(code, message, status = 400) {
  return json({
    ok: false,
    error: {
      code,
      message,
    },
    generatedAt: new Date().toISOString(),
  }, status);
}
