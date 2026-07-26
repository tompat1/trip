const DEFAULT_OPENTRIPMAP_API_BASE = "https://api.opentripmap.com/0.1";
export const OPENTRIPMAP_TOURISM_KINDS = [
  "interesting_places",
  "cultural",
  "architecture",
  "historic",
  "museums",
  "monuments",
  "natural",
].join(",");

export const OPENTRIPMAP_HIDDEN_GEMS_KINDS = [
  "interesting_places",
  "historic",
  "architecture",
  "natural",
  "urban_environment",
].join(",");

export async function fetchOpenTripMapPlaces(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const apiKey = options.apiKey || import.meta.env?.VITE_OPENTRIPMAP_API_KEY || "";
  const coordinates = normalizeCoordinates(options.coordinates || [options.lat, options.lng]);

  if (!coordinates) {
    return createOpenTripMapResult({ status: "error", error: "invalid-coordinates" });
  }
  if (!apiKey) {
    return createOpenTripMapResult({ status: "not-configured", error: "missing-opentripmap-api-key" });
  }

  const [lat, lng] = coordinates;
  const url = new URL(`${options.apiBase || DEFAULT_OPENTRIPMAP_API_BASE}/${options.lang || "en"}/places/radius`);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("radius", String(options.radiusMeters || options.radius || 1500));
  url.searchParams.set("limit", String(options.limit || 24));
  url.searchParams.set("format", "json");
  url.searchParams.set("kinds", options.kinds || OPENTRIPMAP_TOURISM_KINDS);
  if (options.rate) url.searchParams.set("rate", String(options.rate));

  const startedAt = Date.now();
  try {
    const response = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`opentripmap-http-${response.status}`);
    const payload = await response.json();
    const places = normalizeOpenTripMapPlaces(payload, coordinates).slice(0, Number(options.limit) || 24);
    return createOpenTripMapResult({
      status: "ok",
      places,
      count: places.length,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return createOpenTripMapResult({
      status: "error",
      error: error?.message || "opentripmap-failed",
      latencyMs: Date.now() - startedAt,
    });
  }
}

export async function fetchOpenTripMapPlaceDetails(xid, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const apiKey = options.apiKey || import.meta.env?.VITE_OPENTRIPMAP_API_KEY || "";
  if (!xid) return null;
  if (!apiKey) return null;

  const url = new URL(`${options.apiBase || DEFAULT_OPENTRIPMAP_API_BASE}/${options.lang || "en"}/places/xid/${encodeURIComponent(xid)}`);
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`opentripmap-details-http-${response.status}`);
    const details = await response.json();
    return normalizeOpenTripMapDetails(details);
  } catch (error) {
    console.warn("OpenTripMap details fallback:", error);
    return null;
  }
}

export function normalizeOpenTripMapPlaces(payload, origin = null) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.features)
      ? payload.features.map((feature) => ({ ...feature.properties, point: feature.geometry }))
      : [];

  return items
    .map((item) => normalizeOpenTripMapPlace(item, origin))
    .filter(Boolean);
}

export function normalizeOpenTripMapPlace(item = {}, origin = null) {
  const point = item.point || item.geometry || {};
  const coordinates = normalizeCoordinates([
    point.lat ?? item.lat ?? point.coordinates?.[1],
    point.lon ?? item.lon ?? point.lng ?? point.coordinates?.[0],
  ]);
  const title = item.name || item.title || "";
  if (!title || !coordinates) return null;

  const distanceMeters = Number.isFinite(Number(item.dist))
    ? Math.round(Number(item.dist))
    : origin ? Math.round(getDistanceMeters(origin, coordinates)) : null;
  const kinds = String(item.kinds || "").split(",").map((kind) => kind.trim()).filter(Boolean);
  const category = classifyOpenTripMapKinds(kinds);

  return {
    id: item.xid ? `otm-${item.xid}` : `otm-${slugify(`${title}-${coordinates.join("-")}`)}`,
    xid: item.xid || "",
    title,
    canonicalName: title,
    category,
    tag: category,
    categories: kinds,
    coordinates,
    lat: coordinates[0],
    lng: coordinates[1],
    distanceMeters,
    distance: formatDistance(distanceMeters),
    rating: item.rate ? String(item.rate).replace("h", "") : "",
    score: Number(item.rate || 0) * -100 + (distanceMeters || 0),
    source: "OpenTripMap",
    sourceRole: "opentripmap",
    sourceUrl: item.xid ? `https://opentripmap.com/en/card/${encodeURIComponent(item.xid)}` : "",
    reason: `${category} from OpenTripMap.`,
  };
}

export function normalizeOpenTripMapDetails(details = {}) {
  const coordinates = normalizeCoordinates([details.point?.lat, details.point?.lon]);
  return {
    xid: details.xid || "",
    title: details.name || "",
    canonicalName: details.name || "",
    address: details.address || {},
    wikipedia: details.wikipedia || "",
    website: details.url || "",
    sourceUrl: details.otm || (details.xid ? `https://opentripmap.com/en/card/${encodeURIComponent(details.xid)}` : ""),
    imageUrl: details.preview?.source || "",
    description: details.wikipedia_extracts?.text || details.info?.descr || "",
    coordinates,
    categories: String(details.kinds || "").split(",").map((kind) => kind.trim()).filter(Boolean),
    source: "OpenTripMap",
  };
}

function createOpenTripMapResult(input = {}) {
  return {
    status: input.status || "ok",
    places: input.places || [],
    error: input.error || "",
    providerStatus: [{
      provider: "opentripmap",
      status: input.status || "ok",
      error: input.error || "",
      count: input.count || input.places?.length || 0,
      latencyMs: input.latencyMs || 0,
      checkedAt: new Date().toISOString(),
    }],
  };
}

function classifyOpenTripMapKinds(kinds = []) {
  const key = kinds.join(" ").toLowerCase();
  if (/foods|restaurants|cafes|bars/.test(key)) return "Food";
  if (/museums|galleries|cultural/.test(key)) return "Museum";
  if (/historic|architecture|monuments|fortifications/.test(key)) return "Sight";
  if (/natural|beaches|parks/.test(key)) return "Nature";
  if (/shops|market/.test(key)) return "Shopping";
  return "Place";
}

function normalizeCoordinates(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lat, lng] = value.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function formatDistance(meters) {
  if (!Number.isFinite(Number(meters))) return "";
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

function slugify(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
