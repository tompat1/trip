const API_PREFIX = "/api/";
const API_VERSION = "overpass-nearby-v1";
const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const WIKIDATA_ENTITY_DATA = "https://www.wikidata.org/wiki/Special:EntityData/";
const OPENVERSE_IMAGES_API = "https://api.openverse.org/v1/images/";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const ROLE = Object.freeze({
  anonymous: "anonymous",
  traveler: "traveler",
  admin: "admin",
});
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Accept,Authorization,X-Trip-User-Id",
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
    ["GET", /^\/api\/session$/, sessionHandler],
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
    principal: createRequestPrincipal(request, env),
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

function sessionHandler(context) {
  return json(partialResponse("session", {
    principal: redactPrincipal(context.principal),
    roles: {
      canReviewMedia: isAdmin(context.principal),
      canLockHero: isAdmin(context.principal),
      canUseTravelerFeatures: [ROLE.traveler, ROLE.admin].includes(context.principal.role),
    },
  }, context));
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

async function mediaRefreshHandler(context) {
  const [placeId] = context.params;
  const url = new URL(context.request.url);
  const body = await readJson(context.request);
  const forceRefresh = url.searchParams.get("refresh") === "1" || body.force === true;
  const inputPlace = { ...body.place, id: placeId };
  const storedMedia = await getStoredPlaceMedia(context, placeId);
  const curatedMedia = forceRefresh || storedMedia.hero ? createEmptyMedia("fallback") : createCuratedPlaceMedia(inputPlace, context);
  const providerStatus = [
    {
      ...createStorageStatus(context),
      provider: "d1-place-images",
      status: storedMedia.hero ? forceRefresh ? "skipped" : "ok" : "empty",
      error: storedMedia.hero && forceRefresh ? "force-refresh-requested" : "",
      count: [storedMedia.hero, ...(storedMedia.gallery || [])].filter((image) => image?.imageUrl).length,
    },
  ];
  let media = !forceRefresh && storedMedia.hero ? storedMedia : curatedMedia.hero ? curatedMedia : null;
  let mediaProvider = !forceRefresh && storedMedia.hero ? "d1-place-images" : curatedMedia.hero ? "curated-place-media" : "";

  if (!media) {
    const providerMedia = await fetchAndPersistProviderMedia(context, inputPlace);
    providerStatus.push(...providerMedia.providerStatus);
    if (providerMedia.media.hero) {
      media = providerMedia.media;
      mediaProvider = providerMedia.provider;
    }
  }

  if (!media && storedMedia.hero) {
    media = storedMedia;
    mediaProvider = "d1-place-images";
    providerStatus.push({
      provider: "d1-place-images",
      status: "ok",
      error: "live-refresh-empty-using-stored-media",
      count: [storedMedia.hero, ...(storedMedia.gallery || [])].filter((image) => image?.imageUrl).length,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
    });
  }

  if (!media) {
    media = createFallbackPlaceMedia(inputPlace, context);
    mediaProvider = "designed-fallback-media";
  }

  return json(partialResponse("places.mediaRefresh", {
    placeId,
    media,
    providerStatus: [
      ...providerStatus,
      {
        provider: mediaProvider,
        status: storedMedia.hero || media.hero ? "ok" : "empty",
        error: "",
        count: [media.hero, ...(media.gallery || [])].filter((image) => image?.imageUrl).length,
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
      },
    ],
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

async function editorialGenerateHandler(context) {
  const [placeId] = context.params;
  const body = await readJson(context.request);
  const place = normalizeEditorialPlace({ ...body.place, id: placeId });
  const facts = normalizeEditorialFacts(body.facts || createCoreFacts(place));
  const media = body.media || {};
  const editorial = createGeneratedEditorial(place, {
    facts,
    media,
    travellerProfile: body.travellerProfile || {},
    routeContext: body.routeContext || {},
  });

  if (context.hasDb) {
    const storedPlace = createPlaceFromInput({
      ...body.place,
      id: place.id,
      title: place.canonicalName,
      category: place.category,
      categories: [place.category].filter(Boolean),
      coordinates: place.coordinates,
      website: place.website,
    });
    await persistPlaceProfile(context, {
      place: storedPlace,
      facts,
      editorial,
      source: {
        provider: "worker-editorial",
        providerId: place.id,
        name: "Trip Worker Editorial",
        type: "editorial",
        url: "",
        confidence: editorial.confidence,
      },
    });
  }

  return json(partialResponse("places.editorialGenerate", {
    placeId,
    editorial,
    providerStatus: [
      createStorageStatus(context),
      {
        provider: "worker-editorial",
        status: "ok",
        error: "",
        count: 1,
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
      },
    ],
  }, context));
}

async function placeImagePatchHandler(context) {
  const forbidden = requireAdmin(context);
  if (forbidden) return forbidden;
  const [imageId] = context.params;
  const body = await readJson(context.request);
  return json(partialResponse("placeImages.patch", {
    imageId,
    reviewState: body.reviewState || body.reviewStatus || "pending",
    principal: redactPrincipal(context.principal),
  }, context));
}

function heroLockHandler(context) {
  const forbidden = requireAdmin(context);
  if (forbidden) return forbidden;
  const [placeId] = context.params;
  return json(partialResponse("places.heroLock", {
    placeId,
    locked: true,
    principal: redactPrincipal(context.principal),
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

export function createRequestPrincipal(request, env = {}) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const adminToken = env.TRIP_ADMIN_TOKEN || "";
  if (adminToken && bearer && constantTimeStringEqual(bearer, adminToken)) {
    return {
      role: ROLE.admin,
      userId: request.headers.get("x-trip-user-id") || "admin",
      authType: "admin-token",
    };
  }

  const userId = cleanPrincipalId(request.headers.get("x-trip-user-id") || "");
  if (userId) {
    return {
      role: ROLE.traveler,
      userId,
      authType: "traveler-header",
    };
  }

  return {
    role: ROLE.anonymous,
    userId: "",
    authType: "none",
  };
}

function requireAdmin(context) {
  if (isAdmin(context.principal)) return null;
  return jsonError("forbidden", "Admin role is required for this action.", 403);
}

function isAdmin(principal = {}) {
  return principal.role === ROLE.admin;
}

function redactPrincipal(principal = {}) {
  return {
    role: principal.role || ROLE.anonymous,
    userId: principal.userId || "",
    authType: principal.authType || "none",
  };
}

function cleanPrincipalId(value = "") {
  const id = String(value || "").trim();
  if (!id || id.length > 80) return "";
  return /^[a-zA-Z0-9_.:@-]+$/.test(id) ? id : "";
}

function constantTimeStringEqual(a = "", b = "") {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  const length = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] || 0) ^ (right[index] || 0);
  }
  return mismatch === 0;
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

async function getStoredPlaceMedia(context, placeId) {
  if (!context.hasDb || !placeId) return createEmptyMedia("fallback");
  const imagesResult = await context.env.TRIP_DB.prepare(`
    SELECT * FROM place_images
    WHERE place_id = ?
    ORDER BY hero_locked DESC, final_score DESC
    LIMIT 12
  `).bind(placeId).all();
  const images = (imagesResult.results || []).map(normalizeStoredImage);
  if (!images.length) return createEmptyMedia("fallback");
  const hero = images.find((image) => image.visualRole === "hero") || images[0];
  const gallery = images.filter((image) => image.id !== hero.id);
  return createMediaPayload(hero, gallery, hero.illustrativeOnly ? "fallback" : gallery.length ? "complete" : "partial");
}

async function fetchAndPersistProviderMedia(context, place = {}) {
  try {
    const normalizedPlace = createPlaceFromInput({
      ...place,
      title: place.canonicalName || place.title || place.name || place.id,
      coordinates: place.coordinates || place.identity?.coordinates,
      wikidataId: place.wikidataId || place.identity?.wikidataId,
      categories: place.categories || [place.category || place.tag].filter(Boolean),
      website: place.website || place.officialWebsite || place.identity?.officialWebsite,
    });
    const providerResults = await Promise.all([
      runWorkerMediaProvider("commons", () => searchCommonsMediaForPlace(normalizedPlace, context.request)),
      runWorkerMediaProvider("openverse", () => searchOpenverseMediaForPlace(normalizedPlace, context.request)),
    ]);
    const candidates = dedupeWorkerImages(providerResults.flatMap((result) => result.images));
    const ranked = candidates
      .map((image) => rankWorkerImageCandidate(image, normalizedPlace))
      .filter((image) => !image.rejected)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 10);

    if (context.hasDb && ranked.length) {
      await persistPlaceProfile(context, {
        place: normalizedPlace,
        facts: createCoreFacts(normalizedPlace),
        editorial: null,
        source: {
          provider: "trip-media-router",
          providerId: normalizedPlace.id,
          name: "Trip media provider router",
          type: "media",
          url: "",
          confidence: 0.7,
        },
      });
      await persistPlaceImages(context, normalizedPlace.id, ranked);
    }

    const hero = ranked.find((image) => image.visualRole === "hero" && image.finalScore >= 58) || ranked[0] || null;
    const gallery = hero ? ranked.filter((image) => image.id !== hero.id).slice(0, 8) : [];
    const winnerProvider = hero?.provider || providerResults.find((result) => result.images.length)?.provider || "";
    return {
      media: hero ? createMediaPayload(hero, gallery, gallery.length ? "complete" : "partial") : createEmptyMedia("fallback"),
      provider: winnerProvider,
      providerStatus: providerResults.map((result) => ({
        ...result.status,
        status: result.status.status === "ok" && !ranked.some((image) => image.provider === result.provider) ? "empty" : result.status.status,
        error: result.status.status === "ok" && !ranked.some((image) => image.provider === result.provider) ? "no-reviewed-candidates" : result.status.error,
      })),
    };
  } catch (error) {
    return {
      media: createEmptyMedia("fallback"),
      provider: "",
      providerStatus: [{
        provider: "trip-media-router",
        status: "error",
        error: error?.name === "AbortError" ? "timeout" : "media-router-failed",
        count: 0,
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
      }],
    };
  }
}

async function runWorkerMediaProvider(provider, fn) {
  const startedAt = Date.now();
  try {
    const images = await fn();
    return {
      provider,
      images,
      status: {
        provider,
        status: images.length ? "ok" : "empty",
        error: "",
        count: images.length,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      provider,
      images: [],
      status: {
        provider,
        status: "error",
        error: error?.name === "AbortError" ? "timeout" : `${provider}-media-failed`,
        count: 0,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
    };
  }
}

async function persistPlaceImages(context, placeId, images = []) {
  const now = new Date().toISOString();
  for (const image of images) {
    await context.env.TRIP_DB.prepare(`
      INSERT INTO place_images (
        id, place_id, provider, provider_id, image_url, thumbnail_url, source_page_url,
        creator_name, creator_url, license_code, license_name, license_url, attribution_text,
        width, height, exact_location, approximate_location, illustrative_only, visual_role,
        relevance_score, quality_score, final_score, perceptual_hash, review_status,
        hero_locked, checked_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        image_url = excluded.image_url,
        thumbnail_url = excluded.thumbnail_url,
        source_page_url = excluded.source_page_url,
        creator_name = excluded.creator_name,
        creator_url = excluded.creator_url,
        license_code = excluded.license_code,
        license_name = excluded.license_name,
        license_url = excluded.license_url,
        attribution_text = excluded.attribution_text,
        width = excluded.width,
        height = excluded.height,
        exact_location = excluded.exact_location,
        approximate_location = excluded.approximate_location,
        illustrative_only = excluded.illustrative_only,
        visual_role = excluded.visual_role,
        relevance_score = excluded.relevance_score,
        quality_score = excluded.quality_score,
        final_score = excluded.final_score,
        review_status = excluded.review_status,
        checked_at = excluded.checked_at,
        updated_at = excluded.updated_at
    `).bind(
      image.id,
      placeId,
      image.provider,
      image.providerId || "",
      image.imageUrl || "",
      image.thumbnailUrl || image.imageUrl || "",
      image.sourcePageUrl || "",
      image.creatorName || "",
      image.creatorUrl || "",
      image.licenseCode || "",
      image.licenseName || "",
      image.licenseUrl || "",
      image.attributionText || "",
      Number(image.width || 0),
      Number(image.height || 0),
      image.exactLocation ? 1 : 0,
      image.approximateLocation ? 1 : 0,
      image.illustrativeOnly ? 1 : 0,
      image.visualRole || "illustrative",
      Number(image.relevanceScore || 0),
      Number(image.qualityScore || 0),
      Number(image.finalScore || 0),
      image.perceptualHash || "",
      image.reviewStatus || "pending",
      image.heroLocked ? 1 : 0,
      image.checkedAt || now,
      now,
      now
    ).run();
  }
}

async function searchCommonsMediaForPlace(place, request) {
  const fromWikidata = await searchCommonsFromWikidata(place, request);
  const fromGeo = await searchCommonsGeosearch(place, request);
  const fromText = await searchCommonsText(place, request);
  return dedupeWorkerImages([...fromWikidata, ...fromGeo, ...fromText]);
}

async function searchCommonsFromWikidata(place, request) {
  const wikidataId = normalizeWikidataId(place.wikidataId || "");
  if (!wikidataId) return [];
  const response = await fetchWithTimeout(`${WIKIDATA_ENTITY_DATA}${wikidataId}.json`, request, 6500);
  if (!response.ok) return [];
  const data = await response.json();
  const entity = data.entities?.[wikidataId];
  const claims = entity?.claims || {};
  const p18 = claims.P18?.[0]?.mainsnak?.datavalue?.value;
  const p373 = claims.P373?.[0]?.mainsnak?.datavalue?.value;
  const images = [];
  if (p18) images.push(...await searchCommonsText({ ...place, mediaQueries: [`File:${p18}`] }, request, { sourceTrust: 0.94, visualRole: "hero" }));
  if (p373) images.push(...await searchCommonsText({ ...place, mediaQueries: [`incategory:"${p373}"`] }, request, { sourceTrust: 0.88 }));
  return images;
}

async function searchCommonsGeosearch(place, request) {
  if (!Array.isArray(place.coordinates)) return [];
  const [lat, lng] = place.coordinates;
  const url = new URL(COMMONS_API);
  url.searchParams.set("origin", "*");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "geosearch");
  url.searchParams.set("ggsprimary", "all");
  url.searchParams.set("ggsnamespace", "6");
  url.searchParams.set("ggsradius", String(getWorkerImageSearchRadius(place)));
  url.searchParams.set("ggscoord", `${lat}|${lng}`);
  url.searchParams.set("ggslimit", "24");
  url.searchParams.set("prop", "imageinfo|coordinates");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "1600");
  const response = await fetchWithTimeout(url, request, 7000);
  if (!response.ok) return [];
  const data = await response.json();
  return normalizeCommonsPages(Object.values(data.query?.pages || {}), place, { sourceTrust: 0.92 });
}

async function searchCommonsText(place, request, defaults = {}) {
  const all = [];
  for (const query of getWorkerMediaQueries(place).slice(0, 4)) {
    const url = new URL(COMMONS_API);
    url.searchParams.set("origin", "*");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "10");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("prop", "imageinfo|coordinates");
    url.searchParams.set("iiprop", "url|size|mime|extmetadata");
    url.searchParams.set("iiurlwidth", "1600");
    const response = await fetchWithTimeout(url, request, 7000);
    if (!response.ok) continue;
    const data = await response.json();
    all.push(...normalizeCommonsPages(Object.values(data.query?.pages || {}), place, defaults));
  }
  return all;
}

async function searchOpenverseMediaForPlace(place, request) {
  const all = [];
  for (const query of getWorkerMediaQueries(place).slice(0, 3)) {
    const url = new URL(OPENVERSE_IMAGES_API);
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", "10");
    url.searchParams.set("mature", "false");
    const response = await fetchWithTimeout(url, request, 7000);
    if (!response.ok) continue;
    const data = await response.json();
    all.push(...(data.results || []).map((result) => normalizeOpenverseImage(result, place)));
  }
  return dedupeWorkerImages(all);
}

function normalizeCommonsPages(pages = [], place = {}, defaults = {}) {
  return pages.map((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.url || !/^image\//.test(info.mime || "")) return null;
    const metadata = info.extmetadata || {};
    const width = Number(info.width || 0);
    const height = Number(info.height || 0);
    const sourcePageUrl = info.descriptionurl || "";
    return {
      id: stableId("commons-image", [page.pageid, page.title, info.url]),
      placeId: place.id || "",
      provider: "commons",
      providerId: String(page.pageid || page.title || ""),
      imageUrl: info.url,
      thumbnailUrl: info.thumburl || info.url,
      sourcePageUrl,
      creatorName: truncateText(stripHtml(metadata.Artist?.value || metadata.Credit?.value || ""), 180),
      creatorUrl: "",
      licenseCode: truncateText(stripHtml(metadata.LicenseShortName?.value || ""), 80),
      licenseName: truncateText(stripHtml(metadata.License?.value || metadata.UsageTerms?.value || ""), 120),
      licenseUrl: sanitizeUrl(metadata.LicenseUrl?.value || ""),
      attributionText: truncateText(stripHtml(metadata.Attribution?.value || metadata.Credit?.value || metadata.Artist?.value || "Wikimedia Commons"), 180),
      width,
      height,
      aspectRatio: width && height ? width / height : 0,
      exactLocation: Boolean(page.coordinates?.length),
      approximateLocation: !page.coordinates?.length,
      illustrativeOnly: false,
      latitude: page.coordinates?.[0]?.lat,
      longitude: page.coordinates?.[0]?.lon,
      visualRole: defaults.visualRole || inferWorkerVisualRole(place, width, height),
      sourceTrust: defaults.sourceTrust || 0.84,
      checkedAt: new Date().toISOString(),
      reviewStatus: "pending",
      rawTitle: page.title || "",
    };
  }).filter(Boolean);
}

function normalizeOpenverseImage(result = {}, place = {}) {
  const width = Number(result.width || 0);
  const height = Number(result.height || 0);
  const title = result.title || "";
  const sourceName = result.source || result.provider || "Openverse";
  return {
    id: stableId("openverse-image", [result.id, result.url, result.foreign_landing_url]),
    placeId: place.id || "",
    provider: "openverse",
    providerId: String(result.id || result.url || ""),
    imageUrl: sanitizeUrl(result.url || result.thumbnail || ""),
    thumbnailUrl: sanitizeUrl(result.thumbnail || result.url || ""),
    sourcePageUrl: sanitizeUrl(result.foreign_landing_url || result.url || ""),
    creatorName: truncateText(result.creator || "", 180),
    creatorUrl: sanitizeUrl(result.creator_url || ""),
    licenseCode: truncateText(result.license || "", 80),
    licenseName: truncateText(result.license || "", 120),
    licenseUrl: sanitizeUrl(result.license_url || ""),
    attributionText: truncateText([result.creator, sourceName, result.license].filter(Boolean).join(" · "), 180),
    width,
    height,
    aspectRatio: width && height ? width / height : 0,
    exactLocation: false,
    approximateLocation: true,
    illustrativeOnly: false,
    visualRole: inferWorkerVisualRole(place, width, height),
    sourceTrust: 0.72,
    checkedAt: new Date().toISOString(),
    reviewStatus: "pending",
    rawTitle: title,
  };
}

function rankWorkerImageCandidate(image, place) {
  const longEdge = Math.max(Number(image.width || 0), Number(image.height || 0));
  const aspect = image.aspectRatio || (image.width && image.height ? image.width / image.height : 0);
  const exactNameMatch = getWorkerNameMatchScore(image.rawTitle || image.sourcePageUrl, place);
  const distanceMeters = getWorkerImageDistanceMeters(image, place);
  const nearbyRadius = getWorkerImageSearchRadius(place);
  const weakNameMatch = exactNameMatch < 0.25;
  const possibleMismatch = weakNameMatch && (!image.exactLocation || distanceMeters > nearbyRadius) ? 1 : 0;
  const genericStockPenalty = isGenericWorkerRegionalImage(image, place) ? 1 : 0;
  const rejectionReason = getWorkerImageRejectionReason(image, longEdge, { weakNameMatch, distanceMeters, nearbyRadius });
  const finalScore = clampNumber(
    exactNameMatch * 30 +
    getWorkerGeotagScore(distanceMeters, image.exactLocation) * 25 +
    exactNameMatch * 15 +
    (image.sourceTrust || 0.7) * 10 +
    Math.min(1, longEdge / 1800) * 8 +
    (aspect >= 1.2 && aspect <= 2.5 ? 1 : 0.35) * 5 +
    0.75 * 5 +
    0.3 * 2 -
    genericStockPenalty * 20 -
    possibleMismatch * 50,
    0,
    100,
    0
  );

  return {
    ...image,
    visualRole: image.visualRole === "hero" || (aspect >= 1.2 && aspect <= 2.5 && longEdge >= 1200) ? "hero" : image.visualRole,
    relevanceScore: exactNameMatch,
    qualityScore: Math.min(1, longEdge / 1800),
    finalScore: Math.round(finalScore),
    distanceMeters,
    rejected: Boolean(rejectionReason),
    rejectionReason,
    illustrativeOnly: Boolean(image.illustrativeOnly || genericStockPenalty),
    approximateLocation: !image.exactLocation,
  };
}

function getWorkerMediaQueries(place = {}) {
  if (Array.isArray(place.mediaQueries) && place.mediaQueries.length) return place.mediaQueries;
  const title = place.canonicalName || place.title || "";
  const aliases = place.aliases || [];
  const area = place.municipality || place.region || "";
  return [
    [title, area].filter(Boolean).join(" "),
    [title, "Crete"].filter(Boolean).join(" "),
    ...aliases.slice(0, 3).map((alias) => [alias, area || "Crete"].filter(Boolean).join(" ")),
    title,
  ].filter(Boolean).filter((query, index, all) => all.indexOf(query) === index);
}

function dedupeWorkerImages(images = []) {
  const seen = new Map();
  for (const image of images) {
    if (!image?.imageUrl || !image.sourcePageUrl) continue;
    const key = normalizeMediaIdentity(image);
    const existing = seen.get(key);
    const edge = Math.max(Number(image.width || 0), Number(image.height || 0));
    const existingEdge = Math.max(Number(existing?.width || 0), Number(existing?.height || 0));
    const trust = Number(image.sourceTrust || 0);
    const existingTrust = Number(existing?.sourceTrust || 0);
    if (!existing || trust > existingTrust || (trust === existingTrust && edge > existingEdge)) seen.set(key, image);
  }
  return [...seen.values()];
}

function normalizeMediaIdentity(image = {}) {
  const imageUrl = normalizeUrl(image.imageUrl || "");
  if (imageUrl) return imageUrl;
  return normalizeUrl(image.sourcePageUrl || image.providerId || "");
}

function getWorkerNameMatchScore(value = "", place = {}) {
  const haystack = normalizeSearchText(value);
  const aliases = [place.canonicalName, place.title, ...(place.aliases || [])].filter(Boolean);
  const tokens = aliases.flatMap((alias) => normalizeSearchText(alias).split(" ").filter((token) => token.length > 3));
  if (!tokens.length) return 0;
  const unique = [...new Set(tokens)];
  const matches = unique.filter((token) => haystack.includes(token)).length;
  return Math.min(1, matches / Math.min(3, unique.length));
}

function getWorkerImageRejectionReason(image, longEdge, context = {}) {
  const visualText = `${image.rawTitle || ""} ${image.sourcePageUrl || ""}`;
  if (!image.imageUrl || !image.sourcePageUrl) return "missing-source-provenance";
  if (longEdge && longEdge < 900) return "too-small";
  if (/watermark|screenshot|map/i.test(visualText)) return "blocked-visual-type";
  if (/\b(parking|car park|carpark|automobile|vehicle|rental car|garage|traffic)\b/i.test(visualText)) return "irrelevant-vehicle-or-parking";
  if (context.weakNameMatch && Number.isFinite(context.distanceMeters) && context.distanceMeters > context.nearbyRadius) return "nearby-but-not-this-place";
  return "";
}

function getWorkerImageDistanceMeters(image, place) {
  if (!Number.isFinite(image.latitude) || !Number.isFinite(image.longitude) || !Array.isArray(place.coordinates)) return Infinity;
  return getDistanceMeters(place.coordinates, [image.latitude, image.longitude]);
}

function getWorkerImageSearchRadius(place = {}) {
  const key = `${place.categories?.join(" ") || ""} ${place.category || ""} ${place.canonicalName || ""}`.toLowerCase();
  if (key.includes("coffee") || key.includes("cafe") || key.includes("restaurant") || key.includes("shop")) return 160;
  if (key.includes("museum") || key.includes("fountain")) return 260;
  if (key.includes("beach") || key.includes("wall") || key.includes("fortress") || key.includes("harbor")) return 900;
  return 360;
}

function getWorkerGeotagScore(distanceMeters, exactLocation) {
  if (!exactLocation || !Number.isFinite(distanceMeters)) return 0.25;
  if (distanceMeters <= 90) return 1;
  if (distanceMeters <= 260) return 0.82;
  if (distanceMeters <= 900) return 0.56;
  if (distanceMeters <= 1500) return 0.28;
  return 0.08;
}

function isGenericWorkerRegionalImage(image, place) {
  const haystack = normalizeSearchText(`${image.rawTitle || ""} ${image.sourcePageUrl || ""}`);
  const placeName = normalizeSearchText(place.canonicalName || "");
  return haystack.includes("crete") && placeName && !placeName.split(" ").some((token) => token.length > 3 && haystack.includes(token));
}

function inferWorkerVisualRole(place, width, height) {
  const key = `${place.categories?.join(" ") || ""} ${place.category || ""}`.toLowerCase();
  if (key.includes("coffee") || key.includes("cafe")) return "coffee";
  if (key.includes("beach")) return "beach";
  if (key.includes("museum")) return "museum";
  if (key.includes("restaurant") || key.includes("food")) return "food";
  return width > height ? "hero" : "gallery";
}

async function fetchWithTimeout(url, request, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        Accept: "application/json",
        Referer: new URL(request.url).origin,
        "User-Agent": "Trip Planner Deluxe/0.1 (https://trip.rynell.org)",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(value = "") {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

function truncateText(value = "", maxLength = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function normalizeUrl(value = "") {
  return String(value || "").split("?")[0].toLowerCase();
}

function normalizeSearchText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9α-ωάέήίόύώϊϋΐΰ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createCuratedPlaceMedia(place = {}, context = {}) {
  const imageUrl = sanitizeMediaUrl(place.imageUrl || place.image?.url || "");
  if (!imageUrl) return createEmptyMedia("fallback");
  const title = place.title || place.canonicalName || place.name || place.id || "Place";
  const provider = imageUrl.startsWith("/assets/") ? "trip-curated-asset" : inferMediaProvider(imageUrl);
  const hero = {
    id: stableId("image", [place.id, imageUrl]),
    placeId: place.id || "",
    provider,
    providerId: imageUrl,
    imageUrl,
    thumbnailUrl: imageUrl,
    sourcePageUrl: sanitizeUrl(place.imageSourceUrl || place.website || place.officialWebsite || place.sourceUrl || ""),
    creatorName: place.imageCreator || "",
    creatorUrl: "",
    licenseCode: "",
    licenseName: provider === "trip-curated-asset" ? "Curated reference asset" : "",
    licenseUrl: "",
    attributionText: place.imageAttribution || place.source || (provider === "trip-curated-asset" ? "Curated traveler reference" : provider),
    width: 0,
    height: 0,
    exactLocation: Boolean(place.userAdded || place.sourceRole === "user"),
    approximateLocation: !place.userAdded,
    illustrativeOnly: false,
    visualRole: "hero",
    relevanceScore: 0.82,
    qualityScore: 0.7,
    finalScore: 82,
    reviewStatus: "pending",
    checkedAt: new Date().toISOString(),
    caption: title,
  };
  return createMediaPayload(hero, [], context.hasLightMedia ? "partial" : "fallback");
}

function createFallbackPlaceMedia(place = {}, context = {}) {
  const title = place.title || place.canonicalName || place.name || place.id || "Place";
  const hero = {
    id: stableId("fallback-image", [place.id || title]),
    placeId: place.id || "",
    provider: "editorial",
    providerId: "designed-fallback",
    imageUrl: "",
    thumbnailUrl: "",
    sourcePageUrl: "",
    creatorName: "Trip Planner Deluxe",
    creatorUrl: "",
    licenseCode: "",
    licenseName: "Designed fallback",
    licenseUrl: "",
    attributionText: "Designed fallback, no reviewed photo available",
    width: 0,
    height: 0,
    exactLocation: false,
    approximateLocation: false,
    illustrativeOnly: true,
    visualRole: "hero",
    relevanceScore: 0,
    qualityScore: 0,
    finalScore: 0,
    reviewStatus: "pending",
    checkedAt: new Date().toISOString(),
    caption: title,
  };
  return createMediaPayload(hero, [], context.hasLightMedia ? "fallback" : "fallback");
}

function createEmptyMedia(images = "fallback") {
  return {
    hero: null,
    gallery: [],
    roles: {},
    attributions: [],
    coverage: { images },
    generatedAt: new Date().toISOString(),
    refreshAfter: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
}

function createMediaPayload(hero, gallery = [], imagesCoverage = "partial") {
  const images = [hero, ...gallery].filter(Boolean);
  return {
    hero,
    gallery,
    roles: images.reduce((roles, image) => {
      const role = image.visualRole || "illustrative";
      roles[role] = [...(roles[role] || []), image];
      return roles;
    }, {}),
    attributions: images.filter((image) => image.sourcePageUrl || image.attributionText).map((image) => ({
      imageId: image.id,
      text: image.attributionText || image.provider,
      sourcePageUrl: image.sourcePageUrl || "",
      licenseUrl: image.licenseUrl || "",
    })),
    coverage: { images: imagesCoverage },
    generatedAt: new Date().toISOString(),
    refreshAfter: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
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

function normalizeEditorialPlace(input = {}) {
  const coordinates = normalizeCoordinates(input.coordinates || [input.latitude, input.longitude]);
  const title = String(input.canonicalName || input.title || input.name || input.id || "This stop").trim();
  return {
    id: input.id || stableId("place", [title, coordinates?.join(",")]),
    canonicalName: title,
    title,
    localName: String(input.localName || ""),
    category: String(input.category || input.tag || input.categories?.[0] || "place"),
    tag: String(input.tag || input.category || input.categories?.[0] || "place"),
    area: String(input.area || input.municipality || input.identity?.municipality || ""),
    coordinates,
    openingHours: input.openingHours || "",
    website: input.website || input.officialWebsite || input.identity?.officialWebsite || "",
    identity: input.identity || {},
  };
}

function normalizeEditorialFacts(facts = []) {
  return facts.map((fact) => ({
    id: fact.id || stableId("fact", [fact.key, JSON.stringify(fact.value)]),
    key: fact.key || "fact",
    label: fact.label || labelFromKey(fact.key || "fact"),
    value: fact.value,
    confidence: Number(fact.confidence ?? 0.5),
    volatile: Boolean(fact.volatile || fact.volatility === "volatile"),
    sourceIds: Array.isArray(fact.sourceIds) ? fact.sourceIds : [fact.sourceId].filter(Boolean),
  })).filter((fact) => fact.value !== undefined && fact.value !== null && fact.value !== "");
}

function createGeneratedEditorial(place, options = {}) {
  const facts = normalizeEditorialFacts(options.facts || []);
  const name = getEditorialFactValue(facts, "name") || place.canonicalName || place.title || "This stop";
  const category = getEditorialFactValue(facts, "category") || place.category || place.tag || "place";
  const area = getEditorialFactValue(facts, "area") || place.area || "";
  const travellerProfile = options.travellerProfile || {};
  const routeContext = options.routeContext || {};
  const sourceIds = [...new Set(facts.flatMap((fact) => fact.sourceIds || [fact.id]).filter(Boolean))];
  const routeRole = inferEditorialRouteRole(category, travellerProfile);
  const hasRealHero = Boolean(options.media?.hero && !options.media.hero.illustrativeOnly && options.media.hero.imageUrl);

  return {
    standfirst: [name, area ? `in ${area}` : "", category ? `works as a ${String(category).toLowerCase()} stop` : ""].filter(Boolean).join(" "),
    whyStop: buildEditorialWhyStop(name, category, area, travellerProfile, routeContext),
    atmosphere: buildEditorialAtmosphere(category, hasRealHero),
    essentialExperience: buildEditorialEssentialExperience(name, category),
    dontMiss: buildEditorialDontMiss(category),
    hiddenDetails: [
      place.localName ? `Local name: ${place.localName}` : "",
      place.identity?.wikidataId ? `Linked identity: ${place.identity.wikidataId}` : "",
      getEditorialFactValue(facts, "openingHours") ? "Opening hours are volatile; refresh before relying on them." : "",
    ].filter(Boolean).slice(0, 3),
    idealFor: buildEditorialIdealFor(category, travellerProfile),
    skipIf: buildEditorialSkipIf(category),
    suggestedDurationMinutes: inferEditorialDurationMinutes(category),
    bestArrivalWindow: inferEditorialBestArrivalWindow(category),
    routeRole,
    coffeeSummary: editorialTextIncludes(category, ["coffee", "cafe", "roaster"]) ? `${name} belongs in the coffee shortlist.` : "",
    foodSummary: editorialTextIncludes(category, ["restaurant", "food", "bakery"]) ? `${name} is useful as a food stop.` : "",
    nextBestStop: routeContext.nextStop || "",
    localTip: buildEditorialLocalTip(category, routeContext),
    practicalWarnings: facts.filter((fact) => fact.volatile).map((fact) => `${labelFromKey(fact.key)} can change; refresh before relying on it.`),
    sourceIds,
    generatedAt: new Date().toISOString(),
    editorialVersion: "worker-deterministic-v1",
    confidence: calculateWorkerEditorialConfidence(facts, hasRealHero),
  };
}

function buildEditorialWhyStop(name, category, area, travellerProfile, routeContext) {
  const base = editorialTextIncludes(category, ["coffee", "cafe", "roaster"])
    ? `${name} is a focused coffee stop${area ? ` around ${area}` : ""}.`
    : editorialTextIncludes(category, ["museum", "gallery", "archaeolog", "historic", "sight"])
      ? `${name} gives the route a cultural anchor${area ? ` around ${area}` : ""}.`
      : editorialTextIncludes(category, ["beach", "harbor", "water"])
        ? `${name} works as a slower coastal pause${area ? ` around ${area}` : ""}.`
        : `${name} is a practical nearby stop${area ? ` around ${area}` : ""}.`;
  const focus = getEditorialTravellerAngle(category, travellerProfile);
  return [base, focus, routeContext.previousStop ? `It can sit after ${routeContext.previousStop}.` : ""].filter(Boolean).join(" ");
}

function buildEditorialAtmosphere(category, hasRealHero) {
  if (!hasRealHero) return "Use the map and notes first; imagery may still be waiting for review.";
  if (editorialTextIncludes(category, ["coffee", "cafe"])) return "Small-scale, useful for a reset and a closer look at the neighbourhood.";
  if (editorialTextIncludes(category, ["museum", "gallery", "archaeolog"])) return "Quiet, context-rich, and best when you want the place to explain itself.";
  if (editorialTextIncludes(category, ["beach", "harbor"])) return "Open-air, slower, and shaped by light, wind, and the waterline.";
  return "A nearby waypoint with enough context to decide quickly.";
}

function buildEditorialEssentialExperience(name, category) {
  if (editorialTextIncludes(category, ["coffee", "cafe", "roaster"])) return ["Order coffee", "Check beans or brew style", "Save notes if it fits your taste"];
  if (editorialTextIncludes(category, ["restaurant", "food", "bakery"])) return ["Check the menu", "Mark it for lunch or dinner", "Save one food note"];
  if (editorialTextIncludes(category, ["museum", "gallery", "archaeolog"])) return ["Start with the main collection", "Save one detail for the story", "Pair it with a calmer nearby stop"];
  if (editorialTextIncludes(category, ["beach", "harbor"])) return ["Check wind and shade", "Walk the edge", "Use it as a slower route break"];
  return [`Visit ${name}`, "Check the map context", "Decide whether to save it"];
}

function buildEditorialDontMiss(category) {
  if (editorialTextIncludes(category, ["coffee", "cafe", "roaster"])) return ["Coffee quality", "Beans", "Neighbourhood feel"];
  if (editorialTextIncludes(category, ["museum", "gallery", "archaeolog"])) return ["Core exhibits", "Architecture", "Context before the next stop"];
  if (editorialTextIncludes(category, ["beach", "harbor"])) return ["Light", "Waterfront walk", "Shade"];
  return ["Map position", "Nearby context"];
}

function buildEditorialIdealFor(category, travellerProfile) {
  const focus = travellerProfile.focus || "nearby";
  if (editorialTextIncludes(category, ["coffee", "cafe", "roaster"])) return ["coffee reset", "short detour", focus];
  if (editorialTextIncludes(category, ["museum", "gallery", "archaeolog"])) return ["culture", "rain-safe planning", focus];
  if (editorialTextIncludes(category, ["beach", "harbor"])) return ["slow break", "photos", focus];
  return ["nearby discovery", "quick decision", focus];
}

function buildEditorialSkipIf(category) {
  if (editorialTextIncludes(category, ["beach", "harbor"])) return ["weather is rough", "you need an indoor stop"];
  if (editorialTextIncludes(category, ["museum", "gallery"])) return ["you only want outdoor time"];
  return ["it pulls you too far off route"];
}

function buildEditorialLocalTip(category, routeContext) {
  if (routeContext.availableHours && routeContext.availableHours < 2) return "Keep this as a short stop unless it is already on your route.";
  if (editorialTextIncludes(category, ["coffee", "cafe"])) return "Save it if the coffee matches your taste; that signal should influence the next scan.";
  if (editorialTextIncludes(category, ["beach", "harbor"])) return "Check wind and sun before committing time.";
  return "Open the map first and decide from distance, category, and route fit.";
}

function getEditorialTravellerAngle(category, travellerProfile) {
  if (travellerProfile.focus === "coffee" && editorialTextIncludes(category, ["coffee", "cafe", "roaster"])) return "Good fit for the current coffee focus.";
  if (travellerProfile.focus === "shopper" && editorialTextIncludes(category, ["shop", "market", "bakery"])) return "Good fit for the current shopper focus.";
  if (travellerProfile.focus === "arty" && editorialTextIncludes(category, ["museum", "gallery", "archaeolog", "art"])) return "Good fit for the current arty focus.";
  if (travellerProfile.focus === "beachy" && editorialTextIncludes(category, ["beach", "harbor", "water"])) return "Good fit for the current beachy focus.";
  return "";
}

function inferEditorialRouteRole(category, travellerProfile) {
  if (editorialTextIncludes(category, ["coffee", "cafe", "roaster"])) return "coffee-stop";
  if (editorialTextIncludes(category, ["restaurant", "food", "bakery"])) return "lunch-stop";
  if (editorialTextIncludes(category, ["beach"])) return "swim-stop";
  if (editorialTextIncludes(category, ["museum", "archaeolog", "historic"])) return "major-destination";
  if (travellerProfile.focus === "beachy") return "sunset-stop";
  return "quick-stop";
}

function inferEditorialDurationMinutes(category) {
  if (editorialTextIncludes(category, ["coffee", "cafe", "bakery"])) return 35;
  if (editorialTextIncludes(category, ["restaurant", "food"])) return 75;
  if (editorialTextIncludes(category, ["museum", "archaeolog"])) return 120;
  if (editorialTextIncludes(category, ["beach"])) return 150;
  return 45;
}

function inferEditorialBestArrivalWindow(category) {
  if (editorialTextIncludes(category, ["beach", "harbor"])) return "morning or late afternoon";
  if (editorialTextIncludes(category, ["coffee", "cafe"])) return "morning or mid-afternoon";
  if (editorialTextIncludes(category, ["restaurant", "food"])) return "lunch or dinner";
  return "";
}

function calculateWorkerEditorialConfidence(facts, hasRealHero) {
  const factConfidence = facts.length ? facts.reduce((sum, fact) => sum + Number(fact.confidence || 0.5), 0) / facts.length : 0.35;
  return Math.max(0.2, Math.min(0.96, Number((factConfidence + (hasRealHero ? 0.08 : 0)).toFixed(2))));
}

function getEditorialFactValue(facts, key) {
  return facts.find((fact) => fact.key === key)?.value;
}

function editorialTextIncludes(category = "", terms = []) {
  const value = String(category || "").toLowerCase();
  return terms.some((term) => value.includes(term));
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

function sanitizeMediaUrl(value = "") {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("/assets/")) return url;
  return sanitizeUrl(url);
}

function inferMediaProvider(url = "") {
  if (url.includes("commons.wikimedia.org") || url.includes("wikimedia.org")) return "commons";
  if (url.startsWith("data:image/")) return "upload";
  if (url.startsWith("http")) return "external";
  if (url.startsWith("/assets/")) return "trip-curated-asset";
  return "unknown";
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
