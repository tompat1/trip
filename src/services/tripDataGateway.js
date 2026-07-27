const EONET_EVENTS_API = "https://eonet.gsfc.nasa.gov/api/v3/events";
const OPEN_METEO_ELEVATION_API = "https://api.open-meteo.com/v1/elevation";
const OPEN_METEO_MARINE_API = "https://marine-api.open-meteo.com/v1/marine";
const OPEN_METEO_FLOOD_API = "https://flood-api.open-meteo.com/v1/flood";
const OPENAGENDA_API_BASE = "https://api.openagenda.com/v2";

const GBFS_FEEDS = [
  {
    id: "velib-paris",
    cities: ["paris"],
    name: "Vélib' Métropole",
    url: "https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/gbfs.json",
  },
];

const DESTINATION_HEADS_UPS = [
  {
    match: ["paris", "france"],
    coastal: false,
    water: "Paris tap water is closely monitored and generally drinkable; refill fountains are useful for city days.",
    speed: "Typical France limits: 50 km/h urban, 80 km/h rural, 110 km/h expressway, 130 km/h motorway; rain lowers motorway and rural limits.",
    commute: "Metro and RER coverage is strong, but strikes, works and late-night service gaps can affect transfers.",
    rules: "Validate transit tickets and keep them until exit; central Paris driving can involve parking, bus-lane and low-emission-zone rules.",
    sources: ["Eau de Paris", "European Commission road-safety guidance"],
  },
  {
    match: ["crete", "heraklion", "greece"],
    coastal: true,
    water: "Beach water is usually strong across Greece, but check local beach flags and post-rain advisories before swimming.",
    speed: "Typical Greece limits: 50 km/h urban, 90 km/h rural and up to 130 km/h on motorways unless signs say otherwise.",
    commute: "Island travel leans on buses, taxis and rental cars; build in buffer time outside main towns.",
    rules: "For beaches, monasteries and archaeological sites, check local opening times, dress expectations and access restrictions.",
    sources: ["EEA bathing-water assessment", "European road-safety guidance"],
  },
  {
    match: ["copenhagen", "denmark"],
    coastal: true,
    water: "Harbour swimming depends on official swim-zone status; check local signs before entering the water.",
    speed: "Typical city driving is heavily cyclist-aware; follow posted limits and watch turning rules around bike lanes.",
    commute: "Cycling and metro are usually excellent; bikes may beat cars for short central trips.",
    rules: "Use marked harbour baths for swimming, and keep to bike-lane etiquette if renting a bike.",
    sources: ["Local guidance profile"],
  },
  {
    match: ["barcelona", "lisbon", "amsterdam", "rome"],
    coastal: true,
    water: "For beach or canal-adjacent stays, check local bathing notices before swimming.",
    speed: "Urban speed and low-emission rules vary by city; rental drivers should check posted limits before entering the center.",
    commute: "Public transport is usually useful, but airport transfers and late-night service need a quick check.",
    rules: "Tourist taxes, beach rules, transit validation and restricted driving zones can apply.",
    sources: ["Local guidance profile"],
  },
];

export async function fetchTripIntelligence(trip = {}, options = {}) {
  const coordinates = normalizeCoordinates(trip.center);
  if (!coordinates) {
    return {
      status: "error",
      error: "invalid-trip-center",
      outdoor: null,
      signals: [],
      mobility: [],
      civicEvents: [],
      headsUps: [],
      providerStatus: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const [outdoor, signals, mobility, civicEvents] = await Promise.all([
    fetchOutdoorConditions(trip, coordinates),
    fetchTravelSignals(coordinates),
    fetchSharedMobility(trip, coordinates),
    fetchOpenAgendaEvents(trip, coordinates, options),
  ]);
  const headsUps = buildHeadsUps(trip, outdoor, signals.signals || [], mobility.mobility || []);

  const providerStatus = [
    ...(outdoor.providerStatus || []),
    ...(signals.providerStatus || []),
    ...(mobility.providerStatus || []),
    ...(civicEvents.providerStatus || []),
  ];

  return {
    status: "ready",
    outdoor,
    signals: signals.signals || [],
    mobility: mobility.mobility || [],
    civicEvents: civicEvents.events || [],
    headsUps,
    providerStatus,
    updatedAt: new Date().toISOString(),
  };
}

async function fetchOutdoorConditions(trip, [lat, lng]) {
  const coastal = isCoastalDestination(trip);
  const [elevation, marine, flood] = await Promise.all([
    fetchElevation(lat, lng),
    coastal ? fetchMarine(lat, lng) : Promise.resolve({
      marine: null,
      status: createStatus("open-meteo-marine", "skipped", "destination-not-coastal", 0),
    }),
    fetchFlood(lat, lng),
  ]);
  return {
    elevation: elevation.elevation,
    terrainLabel: Number.isFinite(elevation.elevation) ? getTerrainLabel(elevation.elevation) : "Terrain unknown",
    coastal,
    marine: marine.marine,
    flood: flood.flood,
    providerStatus: [elevation.status, marine.status, flood.status],
  };
}

async function fetchElevation(lat, lng) {
  const startedAt = Date.now();
  try {
    const url = new URL(OPEN_METEO_ELEVATION_API);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    const res = await fetch(url.href, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`elevation-http-${res.status}`);
    const data = await res.json();
    const elevation = Array.isArray(data.elevation) ? Number(data.elevation[0]) : Number(data.elevation);
    return {
      elevation: Number.isFinite(elevation) ? Math.round(elevation) : null,
      status: createStatus("open-meteo-elevation", "ok", "", Number.isFinite(elevation) ? 1 : 0, startedAt),
    };
  } catch (error) {
    return { elevation: null, status: createStatus("open-meteo-elevation", "error", error?.message || "failed", 0, startedAt) };
  }
}

async function fetchMarine(lat, lng) {
  const startedAt = Date.now();
  try {
    const url = new URL(OPEN_METEO_MARINE_API);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("daily", "wave_height_max,swell_wave_height_max,wave_period_max");
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("timezone", "auto");
    const res = await fetch(url.href, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`marine-http-${res.status}`);
    const data = await res.json();
    const daily = data.daily || {};
    const wave = firstFinite(daily.wave_height_max);
    const swell = firstFinite(daily.swell_wave_height_max);
    const period = firstFinite(daily.wave_period_max);
    const hasMarine = [wave, swell, period].some((value) => value !== null);
    return {
      marine: hasMarine ? {
        waveHeightMax: wave,
        swellHeightMax: swell,
        wavePeriodMax: period,
        label: getMarineLabel(wave),
      } : null,
      status: createStatus("open-meteo-marine", hasMarine ? "ok" : "empty", "", hasMarine ? 1 : 0, startedAt),
    };
  } catch (error) {
    return { marine: null, status: createStatus("open-meteo-marine", "error", error?.message || "failed", 0, startedAt) };
  }
}

async function fetchFlood(lat, lng) {
  const startedAt = Date.now();
  try {
    const url = new URL(OPEN_METEO_FLOOD_API);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("daily", "river_discharge,river_discharge_mean");
    url.searchParams.set("forecast_days", "3");
    const res = await fetch(url.href, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`flood-http-${res.status}`);
    const data = await res.json();
    const daily = data.daily || {};
    const discharge = firstFinite(daily.river_discharge);
    const mean = firstFinite(daily.river_discharge_mean);
    const ratio = discharge && mean ? discharge / mean : null;
    return {
      flood: discharge ? {
        riverDischarge: discharge,
        riverDischargeMean: mean,
        severity: ratio && ratio > 2 ? "minor" : "info",
        label: ratio && ratio > 2 ? "River levels above normal" : "No unusual river signal",
      } : null,
      status: createStatus("open-meteo-flood", discharge ? "ok" : "empty", "", discharge ? 1 : 0, startedAt),
    };
  } catch (error) {
    return { flood: null, status: createStatus("open-meteo-flood", "error", error?.message || "failed", 0, startedAt) };
  }
}

async function fetchTravelSignals([lat, lng]) {
  const startedAt = Date.now();
  try {
    const delta = 2.5;
    const url = new URL(EONET_EVENTS_API);
    url.searchParams.set("status", "open");
    url.searchParams.set("days", "30");
    url.searchParams.set("limit", "12");
    url.searchParams.set("bbox", `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`);
    const res = await fetch(url.href, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`eonet-http-${res.status}`);
    const data = await res.json();
    const signals = (data.events || []).map((event) => normalizeEonetSignal(event, [lat, lng])).filter(Boolean).slice(0, 5);
    return {
      signals,
      providerStatus: [createStatus("nasa-eonet", "ok", "", signals.length, startedAt)],
    };
  } catch (error) {
    return { signals: [], providerStatus: [createStatus("nasa-eonet", "error", error?.message || "failed", 0, startedAt)] };
  }
}

async function fetchSharedMobility(trip, coordinates) {
  const startedAt = Date.now();
  const feed = GBFS_FEEDS.find((item) => item.cities.some((city) => String(trip.destination || "").toLowerCase().includes(city)));
  if (!feed) {
    return { mobility: [], providerStatus: [createStatus("gbfs", "not-configured", "no-local-feed-for-destination", 0, startedAt)] };
  }

  try {
    const root = await fetchJson(feed.url);
    const feeds = Object.values(root.data || {})[0]?.feeds || root.data?.feeds || [];
    const stationInfoUrl = getGbfsFeedUrl(feeds, "station_information");
    const stationStatusUrl = getGbfsFeedUrl(feeds, "station_status");
    if (!stationInfoUrl || !stationStatusUrl) throw new Error("missing-gbfs-station-feeds");
    const [info, status] = await Promise.all([fetchJson(stationInfoUrl), fetchJson(stationStatusUrl)]);
    const statusById = new Map((status.data?.stations || []).map((station) => [station.station_id, station]));
    const mobility = (info.data?.stations || [])
      .map((station) => normalizeGbfsStation(station, statusById.get(station.station_id), coordinates, feed))
      .filter((station) => station.distanceMeters <= 1500)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 5);
    return { mobility, providerStatus: [createStatus("gbfs", "ok", "", mobility.length, startedAt)] };
  } catch (error) {
    return { mobility: [], providerStatus: [createStatus("gbfs", "error", error?.message || "failed", 0, startedAt)] };
  }
}

async function fetchOpenAgendaEvents(trip, coordinates, options = {}) {
  const startedAt = Date.now();
  const key = options.openAgendaKey || import.meta.env?.VITE_OPENAGENDA_API_KEY;
  if (!key) {
    return { events: [], providerStatus: [createStatus("openagenda", "not-configured", "missing-openagenda-key", 0, startedAt)] };
  }

  try {
    const agendaUrl = new URL(`${OPENAGENDA_API_BASE}/agendas`);
    agendaUrl.searchParams.set("key", key);
    agendaUrl.searchParams.set("official", "1");
    agendaUrl.searchParams.set("search", trip.destination || "");
    agendaUrl.searchParams.set("limit", "3");
    const agendaData = await fetchJson(agendaUrl.href);
    const agendas = agendaData.agendas || agendaData.items || [];
    const batches = await Promise.all(agendas.slice(0, 3).map(async (agenda) => {
      const uid = agenda.uid || agenda.id;
      if (!uid) return [];
      const eventUrl = new URL(`${OPENAGENDA_API_BASE}/agendas/${uid}/events`);
      eventUrl.searchParams.set("key", key);
      eventUrl.searchParams.set("limit", "8");
      eventUrl.searchParams.set("search", trip.destination || "");
      const eventData = await fetchJson(eventUrl.href);
      return (eventData.events || eventData.items || []).map((event) => normalizeOpenAgendaEvent(event, coordinates)).filter(Boolean);
    }));
    const events = dedupeByTitle(batches.flat()).slice(0, 10);
    return { events, providerStatus: [createStatus("openagenda", "ok", "", events.length, startedAt)] };
  } catch (error) {
    return { events: [], providerStatus: [createStatus("openagenda", "error", error?.message || "failed", 0, startedAt)] };
  }
}

function buildHeadsUps(trip, outdoor = {}, signals = [], mobility = []) {
  const profile = getDestinationHeadsUpProfile(trip);
  const headsUps = [];
  const floodWarning = outdoor.flood?.severity && outdoor.flood.severity !== "info";
  const naturalSignal = signals[0];

  headsUps.push({
    id: "water-quality",
    type: "water",
    icon: "droplets",
    severity: floodWarning ? "caution" : "info",
    title: outdoor.coastal ? "Water quality" : "Tap water and rain runoff",
    detail: profile.water || "Check local tap-water and bathing advisories, especially after heavy rain.",
    source: (profile.sources || [])[0] || "Local guidance profile",
  });

  headsUps.push({
    id: "speed-limits",
    type: "driving",
    icon: "gauge",
    severity: "info",
    title: "Speed limits",
    detail: profile.speed || "Driving limits, tolls and low-emission zones vary locally; follow posted signs.",
    source: (profile.sources || [])[1] || "Road-safety guidance",
  });

  headsUps.push({
    id: "local-commute",
    type: "commute",
    icon: "train",
    severity: mobility.length ? "positive" : "info",
    title: "Local commute",
    detail: mobility.length
      ? `${mobility[0].provider} has nearby availability; nearest station is ${mobility[0].distance}.`
      : profile.commute || "Check transit frequency and late-night coverage before committing to transfers.",
    source: mobility.length ? "GBFS" : "Local guidance profile",
  });

  headsUps.push({
    id: "tourist-rules",
    type: "rules",
    icon: "info",
    severity: naturalSignal ? "caution" : "info",
    title: naturalSignal ? "Active local signal" : "Tourist rules",
    detail: naturalSignal
      ? `${naturalSignal.title}${naturalSignal.distance ? ` around ${naturalSignal.distance} away` : ""}.`
      : profile.rules || "Check local transit validation, tourist taxes, opening hours and restricted zones.",
    source: naturalSignal?.source || "Local guidance profile",
  });

  return headsUps;
}

function getDestinationHeadsUpProfile(trip = {}) {
  const destination = String(trip.destination || "").toLowerCase();
  return DESTINATION_HEADS_UPS.find((profile) => profile.match.some((key) => destination.includes(key))) || {
    coastal: false,
    water: "Check local tap-water and bathing advisories, especially after heavy rain.",
    speed: "Driving limits, tolls and low-emission zones vary locally; follow posted signs.",
    commute: "Check transit frequency, airport transfers and late-night coverage before committing to a route.",
    rules: "Look for local tourist taxes, transit validation rules, access restrictions and opening-hour changes.",
    sources: ["Local guidance profile"],
  };
}

function isCoastalDestination(trip = {}) {
  return Boolean(getDestinationHeadsUpProfile(trip).coastal);
}

function normalizeEonetSignal(event = {}, origin) {
  const geometry = [...(event.geometry || [])].reverse().find((item) => Array.isArray(item.coordinates));
  const coordinates = normalizeEonetCoordinates(geometry?.coordinates);
  const category = event.categories?.[0]?.id || event.categories?.[0]?.title || "natural-event";
  return {
    id: `eonet-${event.id}`,
    type: mapEonetType(category),
    severity: "info",
    title: event.title || "Natural event",
    source: "NASA EONET",
    sourceUrl: event.link || "",
    updatedAt: geometry?.date || new Date().toISOString(),
    distance: coordinates ? formatDistance(getDistanceKm(origin, coordinates) * 1000) : "",
    coordinates,
  };
}

function normalizeGbfsStation(station = {}, status = {}, origin, feed) {
  const coordinates = [Number(station.lat), Number(station.lon)];
  const distanceMeters = Math.round(getDistanceKm(origin, coordinates) * 1000);
  const bikes = Number(status.num_bikes_available || 0);
  const docks = Number(status.num_docks_available || 0);
  return {
    id: `${feed.id}-${station.station_id}`,
    title: station.name || "Shared mobility station",
    provider: feed.name,
    type: "station",
    bikes,
    docks,
    distance: formatDistance(distanceMeters),
    distanceMeters,
    coordinates,
  };
}

function normalizeOpenAgendaEvent(event = {}, origin) {
  const title = readLocalized(event.title) || readLocalized(event.longDescription) || "Civic event";
  const location = event.location || event.locations?.[0] || {};
  const coordinates = location.latitude && location.longitude ? [Number(location.latitude), Number(location.longitude)] : null;
  if (coordinates && getDistanceKm(origin, coordinates) > 80) return null;
  const timing = event.firstTiming || event.timings?.[0] || {};
  return {
    id: event.uid ? `openagenda-${event.uid}` : `openagenda-${slugify(title)}`,
    title,
    artist: title,
    venue: readLocalized(location.name) || location.name || "Official event venue",
    city: location.city || "",
    dates: timing.begin ? `${String(timing.begin).slice(0, 10)} • ${String(timing.begin).slice(11, 16) || "All day"}` : "Upcoming",
    icon: "🏛️",
    genre: "Civic / Culture",
    source: "OpenAgenda",
    sourceRole: "openagenda",
    ticketUrl: event.registration?.[0]?.value || event.onlineAccessLink || event.canonicalUrl || "",
    lat: coordinates?.[0] || 0,
    lng: coordinates?.[1] || 0,
  };
}

function getGbfsFeedUrl(feeds = [], name) {
  return feeds.find((feed) => feed.name === name)?.url || "";
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`http-${res.status}`);
  return res.json();
}

function createStatus(provider, status, error = "", count = 0, startedAt = Date.now()) {
  return {
    provider,
    status,
    error,
    count,
    latencyMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  };
}

function normalizeCoordinates(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lat = Number(value[0]);
  const lng = Number(value[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function normalizeEonetCoordinates(value) {
  if (!Array.isArray(value)) return null;
  if (typeof value[0] === "number" && typeof value[1] === "number") return [value[1], value[0]];
  if (Array.isArray(value[0])) return normalizeEonetCoordinates(value[0]);
  return null;
}

function firstFinite(values) {
  const value = (values || []).find((item) => Number.isFinite(Number(item)));
  return value === undefined ? null : Number(value);
}

function getTerrainLabel(elevation) {
  if (elevation < 30) return "Flat / low elevation";
  if (elevation < 250) return "Gentle terrain";
  if (elevation < 800) return "Hilly terrain";
  return "Mountain terrain";
}

function getMarineLabel(waveHeight) {
  if (waveHeight === null || waveHeight === undefined) return "Marine conditions unavailable";
  if (waveHeight < 0.6) return "Calm sea";
  if (waveHeight < 1.5) return "Moderate sea";
  return "Rougher sea";
}

function mapEonetType(category = "") {
  const key = String(category).toLowerCase();
  if (key.includes("wildfire")) return "wildfire";
  if (key.includes("storm")) return "weather";
  if (key.includes("volcano")) return "volcano";
  if (key.includes("earthquake")) return "earthquake";
  if (key.includes("flood")) return "flood";
  return "natural-event";
}

function getDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const deltaLat = toRadians(to[0] - from[0]);
  const deltaLng = toRadians(to[1] - from[1]);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function readLocalized(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.en || value.fr || value.da || value.el || Object.values(value)[0] || "";
}

function dedupeByTitle(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = slugify(`${item.title}-${item.venue}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slugify(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
