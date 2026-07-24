const API_PREFIX = "/api/";
const API_VERSION = "d1-profile-v1";
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
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
  const title = body.title || body.name || "Current location";
  const place = createPlaceFromInput({ ...body, title, coordinates });
  if (context.hasDb) {
    await persistPlaceProfile(context, {
      place,
      facts: createCoreFacts(place, { accuracyMeters: body.accuracyMeters }),
      editorial: createPendingEditorial(place.canonicalName),
    });
  }

  return json(partialResponse("location.resolve", {
    location: {
      placeId: place.id,
      coordinates,
      confidence: body.accuracyMeters ? Math.max(0.2, Math.min(1, 1 - Number(body.accuracyMeters) / 5000)) : 0.65,
      matchLevel: "coordinates-only",
    },
    placeProfile: await getStoredPlaceProfile(context, place.id) || createCoordinatesOnlyProfile({ id: place.id, coordinates, title }),
  }, context));
}

function nearbyPlacesHandler(context) {
  const url = new URL(context.request.url);
  const coordinates = normalizeCoordinates([url.searchParams.get("lat"), url.searchParams.get("lng")]);
  if (!coordinates) return jsonError("invalid_coordinates", "Provide lat and lng query parameters.", 400);

  return json(partialResponse("places.nearby", {
    places: [],
    query: {
      coordinates,
      intent: url.searchParams.get("intent") || "traveler",
      radiusMeters: Number(url.searchParams.get("radius") || 1200),
    },
  }, context));
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
    providerStatus: [
      {
        provider: "worker-storage",
        status: missingBindings.length ? "disabled" : "ok",
        error: missingBindings.length ? `Missing bindings: ${missingBindings.join(", ")}` : "",
        count: 0,
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
      },
    ],
    generatedAt: new Date().toISOString(),
    refreshAfter: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    ...payload,
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

async function persistPlaceProfile(context, { place, facts = [], editorial = null }) {
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
  const source = await persistSource(context, place, {
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

function createCoreFacts(place, options = {}) {
  const now = new Date().toISOString();
  return [
    createFact("name", place.canonicalName, 0.82, false, now),
    createFact("coordinates", place.coordinates, 0.78, false, now),
    createFact("category", place.categories?.[0] || "coordinates", 0.62, false, now),
    options.accuracyMeters ? createFact("accuracyMeters", Number(options.accuracyMeters), 0.58, true, now) : null,
  ].filter(Boolean);
}

function createFact(key, value, confidence, volatile, retrievedAt) {
  return {
    id: stableId("fact", [key, JSON.stringify(value), retrievedAt.slice(0, 10)]),
    key,
    label: labelFromKey(key),
    value,
    confidence,
    volatile,
    retrievedAt,
  };
}

function normalizeStoredPlace(row) {
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
    categories: parseJson(row.categories, []),
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
