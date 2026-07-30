import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { state } from "../state.js";

const activeMaps = new Map();

const PLAN_EVENT_LOCATION_COORDS = {
  "cdg airport": [49.0097, 2.5479],
  "1st arrondissement": [48.8606, 2.3376],
  "louvre museum": [48.8606, 2.3376],
  versailles: [48.8049, 2.1204],
  "versailles palace": [48.8049, 2.1204],
  "3rd arrondissement": [48.8635, 2.3591],
  "le marais": [48.8575, 2.3592],
  "saint-germain": [48.8542, 2.3332],
  "cafe de flore": [48.8542, 2.3332],
  "champ de mars": [48.8556, 2.2986],
  "eiffel tower": [48.8584, 2.2945],
  "9th arrondissement": [48.8719, 2.3316],
  "opera garnier": [48.8719, 2.3316],
  "latin quarter": [48.8518, 2.3450],
  "la latina, madrid": [40.4114, -3.7088],
  "la latina": [40.4114, -3.7088],
  "plaza mayor, madrid": [40.4155, -3.7074],
  "sagrada familia": [41.4036, 2.1744],
  "knossos palace": [35.298, 25.1631],
  "heraklion museum": [35.339, 25.1373],
  "archaeological museum": [35.339, 25.1373],
  "koules fortress": [35.3444, 25.137],
  "old venetian harbor": [35.3444, 25.137],
  "ammoudara beach": [35.333, 25.085],
  "lions square": [35.3391, 25.132],
};

const TRIP_DESTINATION_COORDS = {
  paris: [48.8566, 2.3522],
  france: [48.8566, 2.3522],
  copenhagen: [55.6761, 12.5683],
  denmark: [55.6761, 12.5683],
  tokyo: [35.6762, 139.6503],
  japan: [35.6762, 139.6503],
  madrid: [40.4168, -3.7038],
  barcelona: [41.3874, 2.1686],
  spain: [40.4168, -3.7038],
  heraklion: [35.3391, 25.132],
  crete: [35.3391, 25.132],
  london: [51.5072, -0.1276],
  "new york": [40.7128, -74.0060],
  rome: [41.9028, 12.4964],
  lisbon: [38.7223, -9.1393],
  berlin: [52.5200, 13.4050],
  amsterdam: [52.3676, 4.9041],
};

export function initMapsForView(view) {
  activeMaps.forEach((map) => {
    try { map.remove(); } catch {}
  });
  activeMaps.clear();

  const trip = state.activeTrip;

  if (view === "home") {
    initHomeMap(trip);
  } else if (view === "search") {
    initSearchMap(trip);
  } else if (view === "live") {
    initLiveMap(trip);
  } else if (view === "plan" && state.planViewMode === "map") {
    initPlanMap(trip);
  }
}

export function resolveTripCenter(destination = "") {
  const key = normalizeMapLookupKey(destination);
  const match = Object.entries(TRIP_DESTINATION_COORDS).find(([name]) => key.includes(name) || name.includes(key));
  return match ? match[1] : [48.8566, 2.3522];
}

function initHomeMap(trip) {
  const container = document.getElementById("home-map-container");
  if (!container) return;

  const map = L.map(container, { zoomControl: false, attributionControl: false }).setView(trip.center, trip.zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  (trip.mapPins || []).forEach((pin) => {
    const marker = L.marker([pin.lat, pin.lng]).addTo(map);
    marker.bindPopup(`<b>${escapeHtml(pin.name)}</b>`);
  });

  activeMaps.set("home", map);
}

function initSearchMap(trip) {
  const container = document.getElementById("search-map-container");
  if (!container) return;

  const map = L.map(container, { zoomControl: false, attributionControl: false }).setView(trip.center, trip.zoom || 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  (trip.mapPins || []).slice(0, 5).forEach((pin, index) => {
    const icon = L.divIcon({
      className: "custom-map-num-pin",
      html: `<div style="background:#171817; color:#fff; font-weight:800; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; border:2px solid #fff;">${index + 1}</div>`,
      iconSize: [24, 24],
    });
    L.marker([pin.lat, pin.lng], { icon }).addTo(map);
  });

  activeMaps.set("search", map);
}

function initLiveMap(trip) {
  const container = document.getElementById("live-map-container");
  if (!container) return;

  const map = L.map(container, { zoomControl: true }).setView(trip.center, 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
  activeMaps.set("live", map);
}

function initPlanMap(trip) {
  const container = document.getElementById("plan-map-container");
  if (!container) return;

  const map = L.map(container, { zoomControl: true }).setView(trip.center, trip.zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
  const mappedEvents = getMappedCalendarEvents(trip, state.mapDayFilter);

  mappedEvents.forEach(({ event, coordinates }) => {
    const marker = L.marker(coordinates, {
      icon: createPlanEventMarkerIcon(event),
    }).addTo(map);

    marker.bindPopup(`
      <div class="plan-map-popup">
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(event.dayName || `Day ${Number(event.dayIndex || 0) + 1}`)} · ${escapeHtml(event.startTime || "")}${event.endTime ? ` - ${escapeHtml(event.endTime)}` : ""}</span>
        ${event.location ? `<span>${escapeHtml(event.location)}</span>` : ""}
        <button class="btn btn--primary btn--xs" data-action="open-edit-drawer" data-event-id="${escapeHtml(event.id)}">Edit</button>
      </div>
    `);
  });

  if (mappedEvents.length) {
    const bounds = L.latLngBounds(mappedEvents.map(({ coordinates }) => coordinates));
    map.fitBounds(bounds.pad(0.18), { maxZoom: 14 });
  }

  activeMaps.set("plan", map);
}

function getMappedCalendarEvents(trip, dayIndex = null) {
  return (trip.calendarEvents || [])
    .filter((event) => dayIndex === null || dayIndex === undefined || Number(event.dayIndex) === Number(dayIndex))
    .map((event, index) => ({
      event,
      index,
      coordinates: resolveCalendarEventCoordinates(event, trip) || createFallbackEventCoordinates(trip, index),
    }))
    .filter((item) => item.coordinates);
}

function resolveCalendarEventCoordinates(event, trip) {
  const directLat = Number(event.lat ?? event.latitude);
  const directLng = Number(event.lng ?? event.longitude);
  if (Number.isFinite(directLat) && Number.isFinite(directLng)) return [directLat, directLng];

  const eventKeys = [
    event.location,
    event.title,
    `${event.title || ""} ${event.location || ""}`,
  ].map(normalizeMapLookupKey).filter(Boolean);

  for (const key of eventKeys) {
    if (PLAN_EVENT_LOCATION_COORDS[key]) return PLAN_EVENT_LOCATION_COORDS[key];
  }

  const pins = trip.mapPins || [];
  const matchedPin = pins.find((pin) => {
    const pinKey = normalizeMapLookupKey(pin.name);
    return eventKeys.some((key) => key.includes(pinKey) || pinKey.includes(key));
  });

  if (matchedPin && Number.isFinite(Number(matchedPin.lat)) && Number.isFinite(Number(matchedPin.lng))) {
    return [Number(matchedPin.lat), Number(matchedPin.lng)];
  }

  return null;
}

function createFallbackEventCoordinates(trip, index) {
  const center = trip.center || [];
  const lat = Number(center[0]);
  const lng = Number(center[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const angle = index * 0.9;
  const radius = 0.008 + (index % 4) * 0.002;
  return [lat + Math.sin(angle) * radius, lng + Math.cos(angle) * radius];
}

function normalizeMapLookupKey(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function createPlanEventMarkerIcon(event) {
  const dayNumber = Number(event.dayIndex || 0) + 1;
  return L.divIcon({
    className: "plan-map-event-marker",
    html: `
      <div class="plan-map-event-marker__pin event-card--${event.colorScheme || "peach"}">
        <span>${dayNumber}</span>
      </div>
    `,
    iconSize: [34, 40],
    iconAnchor: [17, 36],
    popupAnchor: [0, -34],
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
