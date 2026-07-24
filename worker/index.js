const API_PREFIX = "/api/";
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

  return json(partialResponse("location.resolve", {
    location: {
      coordinates,
      confidence: body.accuracyMeters ? Math.max(0.2, Math.min(1, 1 - Number(body.accuracyMeters) / 5000)) : 0.65,
      matchLevel: "coordinates-only",
    },
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

  return json(partialResponse("places.enrichLocation", {
    placeProfile: createCoordinatesOnlyProfile({ coordinates, title: body.title || "Current location" }),
  }, context));
}

function enrichPlaceHandler(context) {
  const url = new URL(context.request.url);
  const placeId = url.searchParams.get("id") || "";
  if (!placeId) return jsonError("missing_place_id", "Provide a place id.", 400);

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
