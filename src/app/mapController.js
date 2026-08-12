import { state } from "../state.js";
import { resolveAirportInput } from "../services/airportService.js";
import { renderIcon } from "../utils/icons.js";

let L = null;
if (typeof window !== "undefined") {
  import("leaflet").then(m => { L = m.default || m; });
}

const activeMaps = new Map();
let currentPoiOverviewSelectionIndex = 0;
let poiRoutePreviewLayer = null;

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
  ortigia: [37.0594, 15.2933],
  syracuse: [37.0755, 15.2866],
  siracusa: [37.0755, 15.2866],
  sicilia: [37.0594, 15.2933],
  sicily: [37.0594, 15.2933],
  catania: [37.5025, 15.0873],
  palermo: [38.1157, 13.3615],
  taormina: [37.8516, 15.2853],
  gdansk: [54.3520, 18.6466],
  poland: [52.2297, 21.0122],
  warsaw: [52.2297, 21.0122],
  krakow: [50.0647, 19.9450],
  wroclaw: [51.1079, 17.0385],
  paris: [48.8566, 2.3522],
  france: [48.8566, 2.3522],
  london: [51.5072, -0.1276],
  uk: [51.5072, -0.1276],
  "united kingdom": [51.5072, -0.1276],
  "new york": [40.7128, -74.0060],
  usa: [40.7128, -74.0060],
  tokyo: [35.6762, 139.6503],
  japan: [35.6762, 139.6503],
  stockholm: [59.3293, 18.0686],
  sweden: [59.3293, 18.0686],
  copenhagen: [55.6761, 12.5683],
  denmark: [55.6761, 12.5683],
  madrid: [40.4168, -3.7038],
  barcelona: [41.3874, 2.1686],
  spain: [40.4168, -3.7038],
  rome: [41.9028, 12.4964],
  italy: [41.9028, 12.4964],
  florence: [43.7696, 11.2558],
  venice: [45.4408, 12.3155],
  naples: [40.8518, 14.2681],
  bologna: [44.4949, 11.3426],
  milan: [45.4642, 9.1900],
  berlin: [52.5200, 13.4050],
  germany: [52.5200, 13.4050],
  amsterdam: [52.3676, 4.9041],
  netherlands: [52.3676, 4.9041],
  lisbon: [38.7223, -9.1393],
  portugal: [38.7223, -9.1393],
  heraklion: [35.3391, 25.132],
  crete: [35.3391, 25.132],
  greece: [35.3391, 25.132],
  santorini: [36.3932, 25.4615],
  mykonos: [37.4467, 25.3289],
  sydney: [-33.8688, 151.2093],
  australia: [-33.8688, 151.2093],
  bangkok: [13.7563, 100.5018],
  thailand: [13.7563, 100.5018],
  vienna: [48.2082, 16.3738],
  prague: [50.0755, 14.4378],
  dublin: [53.3498, -6.2603],
  oslo: [59.9139, 10.7522],
  helsinki: [60.1699, 24.9384],
  zurich: [47.3769, 8.5417],
  dubai: [25.2048, 55.2708],
  bali: [-8.4095, 115.1889],
  singapore: [1.3521, 103.8198],
};

export function initMapsForView(view) {
  activeMaps.forEach((map) => {
    try { map.remove(); } catch {}
  });
  activeMaps.clear();
  poiRoutePreviewLayer = null;

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

  if (document.getElementById("poi-map-container")) {
    initPoiOverviewMap(trip);
  }
}

export function resolveTripCenter(destination = "") {
  if (!destination || typeof destination !== "string") return [37.0594, 15.2933];
  const key = normalizeMapLookupKey(destination);

  const match = Object.entries(TRIP_DESTINATION_COORDS).find(([name]) => key.includes(name) || name.includes(key));
  if (match) return match[1];

  if (key.includes("ortig") || key.includes("sicil") || key.includes("siracus")) {
    return [37.0594, 15.2933];
  }

  return [37.0594, 15.2933];
}

export async function fetchDestinationCoordinates(destination) {
  if (!destination || typeof destination !== "string") return null;
  const clean = destination.trim();
  const key = normalizeMapLookupKey(clean);

  if (TRIP_DESTINATION_COORDS[key]) return TRIP_DESTINATION_COORDS[key];

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=1`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      TRIP_DESTINATION_COORDS[key] = coords;
      return coords;
    }
  } catch {}

  return null;
}

function attachMapActionOverlay(container, map, trip, options = {}) {
  if (!container || !map) return;

  const existingOverlay = container.querySelector(".map-floating-controls");
  if (existingOverlay) existingOverlay.remove();

  const showFullscreen = options.showFullscreen !== false;
  const overlay = document.createElement("div");
  overlay.className = "map-floating-controls";
  overlay.innerHTML = `
    <button class="map-floating-btn map-recenter-btn" type="button" title="Recenter on ${escapeHtml(trip?.destination || "destination")}" aria-label="Recenter destination">
      ${renderIcon("crosshair")}
    </button>
    <button class="map-floating-btn map-layer-btn" type="button" title="Switch Map Layer" aria-label="Switch map layer">
      ${renderIcon("layers")}
    </button>
    ${showFullscreen ? `
      <button class="map-floating-btn map-fullscreen-btn" type="button" title="Toggle Fullscreen Map" aria-label="Toggle fullscreen map">
        ${renderIcon("arrowsOut")}
      </button>
    ` : ""}
  `;

  container.appendChild(overlay);

  const recenterBtn = overlay.querySelector(".map-recenter-btn");
  if (recenterBtn) {
    recenterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const center = trip?.center || resolveTripCenter(trip?.destination);
      if (center && map) {
        map.flyTo(center, trip?.zoom || 14, { animate: true, duration: 0.8 });
      }
    });
  }

  let layerIndex = 0;
  const tileLayers = [
    { name: "CARTO Voyager", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", subdomains: "abcd", attribution: '&copy; OpenStreetMap &copy; CARTO' },
    { name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '&copy; OpenStreetMap contributors' },
    { name: "CARTO Dark", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", subdomains: "abcd", attribution: '&copy; OpenStreetMap &copy; CARTO' }
  ];

  const layerBtn = overlay.querySelector(".map-layer-btn");
  if (layerBtn) {
    layerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      layerIndex = (layerIndex + 1) % tileLayers.length;
      const selected = tileLayers[layerIndex];

      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });

      L.tileLayer(selected.url, {
        maxZoom: 19,
        subdomains: selected.subdomains || "abc",
        attribution: selected.attribution
      }).addTo(map);
    });
  }

  const fullscreenBtn = overlay.querySelector(".map-fullscreen-btn");
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const parentShell = container.closest(".home-map-card, .search-map-card, .plan-map-shell, .poi-map-hero-card") || container;
      const isFs = parentShell.classList.toggle("is-fullscreen-map");
      fullscreenBtn.innerHTML = renderIcon(isFs ? "arrowsIn" : "arrowsOut");
      fullscreenBtn.title = isFs ? "Exit Fullscreen" : "Toggle Fullscreen Map";
      fullscreenBtn.classList.toggle("is-active", isFs);

      if (isFs) {
        document.body.classList.add("has-fullscreen-map-open");
      } else {
        document.body.classList.remove("has-fullscreen-map-open");
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    });
  }
}

function initHomeMap(trip) {
  if (typeof window === "undefined" || !L) return;
  const container = document.getElementById("home-map-container");
  if (!container) return;

  if (activeMaps.has("home")) {
    try { activeMaps.get("home").remove(); } catch {}
    activeMaps.delete("home");
  }

  const map = L.map(container, { zoomControl: true, attributionControl: true }).setView(trip.center, trip.zoom || 13);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  const homePins = (trip.mapPins && trip.mapPins.length)
    ? trip.mapPins
    : (trip.tourismPois || trip.ideas || []).slice(0, 5);

  const bounds = L.latLngBounds();

  homePins.forEach((pin, index) => {
    const lat = pin.lat || pin.latitude || pin.coordinates?.[0];
    const lng = pin.lng || pin.longitude || pin.coordinates?.[1];
    if (!lat || !lng) return;

    bounds.extend([lat, lng]);

    const name = pin.name || pin.title || "Highlight";
    const category = pin.category || pin.tag || "Sight";
    const iconSymbol = category.includes("shopping") || category.includes("store") ? "🛍️" :
                       category.includes("cafe") || category.includes("food") ? "☕" :
                       category.includes("sight") || category.includes("landmark") || category.includes("historic") ? "🗼" : "📍";

    const customIcon = L.divIcon({
      className: "home-map-custom-marker-wrapper",
      html: `
        <div class="home-map-poi-badge" style="
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(23, 24, 23, 0.92);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          border: 2px solid #d94a3a;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
          cursor: pointer;
          user-select: none;
          pointer-events: auto;
          transition: transform 0.2s ease, background 0.2s ease;
        ">
          <span style="font-size: 12px; color: #e9c76b;">${iconSymbol}</span>
          <span>${escapeHtml(name)}</span>
        </div>
      `,
      iconSize: null,
      iconAnchor: [45, 18]
    });

    const marker = L.marker([lat, lng], { icon: customIcon, zIndexOffset: 1000 - index * 10 }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 4px; color: #171817;">
        <strong style="font-size: 13px; color: #171817;">${escapeHtml(name)}</strong>
        <div style="font-size: 11px; color: #65705B; margin-top: 2px;">${escapeHtml(category)}</div>
      </div>
    `);
  });

  if (homePins.length > 1 && bounds.isValid()) {
    map.fitBounds(bounds.pad(0.22));
  } else {
    map.setView(trip.center || resolveTripCenter(trip.destination), 13);
  }

  attachMapActionOverlay(container, map, trip, { showFullscreen: false });
  activeMaps.set("home", map);
}

function initSearchMap(trip) {
  if (typeof window === "undefined" || !L) return;
  const container = document.getElementById("search-map-container");
  if (!container) return;

  if (activeMaps.has("search")) {
    try { activeMaps.get("search").remove(); } catch {}
    activeMaps.delete("search");
  }

  const map = L.map(container, { zoomControl: true, attributionControl: true }).setView(trip.center, trip.zoom || 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  (trip.mapPins || []).slice(0, 5).forEach((pin, index) => {
    const icon = L.divIcon({
      className: "custom-map-num-pin",
      html: `<div style="background:#171817; color:#fff; font-weight:800; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; border:2px solid #fff;">${index + 1}</div>`,
      iconSize: [24, 24],
    });
    L.marker([pin.lat, pin.lng], { icon }).addTo(map);
  });

  attachMapActionOverlay(container, map, trip);
  activeMaps.set("search", map);
}

function initLiveMap(trip) {
  if (typeof window === "undefined" || !L) return;
  const container = document.getElementById("live-map-container");
  if (!container) return;

  if (activeMaps.has("live")) {
    try { activeMaps.get("live").remove(); } catch {}
    activeMaps.delete("live");
  }

  const map = L.map(container, { zoomControl: true, attributionControl: true }).setView(trip.center, 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
  attachMapActionOverlay(container, map, trip);
  activeMaps.set("live", map);
}

function initPlanMap(trip) {
  if (typeof window === "undefined" || !L) return;
  const container = document.getElementById("plan-map-container");
  if (!container) return;

  if (activeMaps.has("plan")) {
    try { activeMaps.get("plan").remove(); } catch {}
    activeMaps.delete("plan");
  }

  const map = L.map(container, { zoomControl: true, attributionControl: true }).setView(trip.center, trip.zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
  attachMapActionOverlay(container, map, trip);
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

let currentPoiOverviewList = [];

export function selectPoiOnOverviewMap(spotIdx, spotName = "") {
  const map = activeMaps.get("poi-overview");
  const container = document.getElementById("poi-map-container");
  if (!map || !container) return;

  container.scrollIntoView({ behavior: "smooth", block: "nearest" });

  let idx = spotIdx;
  if ((idx === undefined || idx < 0 || isNaN(idx)) && spotName) {
    const titleLower = spotName.toLowerCase().trim();
    idx = currentPoiOverviewList.findIndex(p => p.title.toLowerCase().includes(titleLower) || titleLower.includes(p.title.toLowerCase()));
  }
  if (idx < 0 || idx === undefined || isNaN(idx) || !currentPoiOverviewList[idx]) idx = 0;

  const poi = currentPoiOverviewList[idx];
  if (!poi) return;
  currentPoiOverviewSelectionIndex = idx;

  const cardTitle = document.getElementById("poi-floating-title");
  if (cardTitle) cardTitle.textContent = poi.title;
  const cardDetail = document.getElementById("poi-floating-detail");
  if (cardDetail) cardDetail.textContent = `★ ${poi.rating || 4.8} · ${poi.distance || '1.2 km away'} · Open until 18:00`;
  const cardImg = document.getElementById("poi-floating-img");
  if (cardImg && poi.img) {
    cardImg.src = poi.img;
    cardImg.onerror = function() {
      this.onerror = null;
      this.src = "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80";
    };
  }
  const cardTag = document.getElementById("poi-floating-tag");
  if (cardTag) cardTag.textContent = poi.category || "Landmark";

  const directionsBtn = document.querySelector(".poi-map-floating-card [data-action='open-directions']");
  if (directionsBtn) setPoiDirectionsButtonData(directionsBtn, poi);

  const planBtn = document.getElementById("poi-floating-plan-btn");
  if (planBtn) planBtn.dataset.spotName = poi.title;

  document.querySelectorAll(".poi-leaflet-pill").forEach(el => {
    el.style.background = "#385C73";
    el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.3);";
  });
  const currentPill = document.getElementById(`poi-pill-marker-${idx}`);
  if (currentPill) {
    currentPill.style.background = "#D94A3A";
    currentPill.style.boxShadow = "0 4px 16px rgba(217, 74, 58, 0.6), 0 0 0 2px #ffffff";
  }

  map.panTo([poi.lat, poi.lng], { animate: true });
}

export function getSelectedPoiRouteTarget() {
  const poi = currentPoiOverviewList[currentPoiOverviewSelectionIndex] || currentPoiOverviewList[0] || null;
  if (!poi) return null;
  const coordinates = normalizeMapCoordinates([poi.lat, poi.lng]);
  return {
    id: poi.id || "",
    label: poi.title || poi.name || "Destination",
    coordinates,
    lat: coordinates?.[0],
    lng: coordinates?.[1],
  };
}

export function previewPoiOverviewRoute(routePlan = {}, fallbackOrigin = null, fallbackDestination = null) {
  if (typeof window === "undefined" || !L) return;
  const map = activeMaps.get("poi-overview");
  if (!map) return;
  if (poiRoutePreviewLayer) {
    try { map.removeLayer(poiRoutePreviewLayer); } catch {}
    poiRoutePreviewLayer = null;
  }

  const itinerary = routePlan.bestItinerary || routePlan.itineraries?.[0] || routePlan;
  const coordinates = normalizeRouteCoordinateList(itinerary.coordinates || []);
  const origin = normalizeMapCoordinates(fallbackOrigin);
  const destination = normalizeMapCoordinates(fallbackDestination);
  const routePoints = coordinates.length ? coordinates : [origin, destination].filter(Boolean);
  if (routePoints.length < 2) return;

  poiRoutePreviewLayer = L.layerGroup().addTo(map);
  L.polyline(routePoints, {
    color: "#ff6d2d",
    weight: 5,
    opacity: 0.92,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(poiRoutePreviewLayer);
  L.polyline(routePoints, {
    color: "#ffffff",
    weight: 2,
    opacity: 0.75,
    dashArray: "2, 10",
    lineCap: "round",
  }).addTo(poiRoutePreviewLayer);

  const bounds = L.latLngBounds(routePoints);
  map.fitBounds(bounds.pad(0.18), { maxZoom: 15, animate: true });
}

function isTravelerSight(spot) {
  if (!spot) return false;
  const title = String(spot.title || spot.name || "").toLowerCase().trim();
  const category = String(spot.category || spot.tag || spot.kind || "").toLowerCase().trim();

  const invalidKeywords = [
    "airport", "aeroporto", "aerodrome", "flygplats", "lufthavn", "aeroway",
    "autonomous port", "port of", "prefecture", "police station", "consulate", "embassy",
    "office", "administrative", "utility", "bus stop", "tram stop",
    "olympic", "olympics", "opening ceremony", "closing ceremony", "ceremony",
    "paralympics", "championship", "tournament", "world cup", "expo 20", "marathon 20",
    "festival 20", "summit 20", "conference", "press conference", "parade 20"
  ];

  if (invalidKeywords.some((kw) => title.includes(kw) || category.includes(kw))) {
    return false;
  }

  if (/^(19\d\d|20[0-2]\d)\b/.test(title) || /\b(202[0-9])\s+(summer|winter|games|ceremony|cup|match)\b/.test(title)) {
    return false;
  }

  return true;
}

function initPoiOverviewMap(trip) {
  if (typeof window === "undefined" || !L) return;
  const container = document.getElementById("poi-map-container");
  if (!container) return;

  if (activeMaps.has("poi-overview")) {
    try { activeMaps.get("poi-overview").remove(); } catch {}
    activeMaps.delete("poi-overview");
  }

  const center = trip.center || resolveTripCenter(trip.destination);
  const map = L.map(container, { zoomControl: true, attributionControl: true }).setView(center, 14);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  const defaultOffsets = [
    { dLat: 0.0035, dLng: -0.012, icon: "🏛️" },
    { dLat: 0.008,  dLng: -0.006, icon: "📍" },
    { dLat: -0.002, dLng: -0.025, icon: "🗼" },
    { dLat: -0.002, dLng: -0.003, icon: "☕" },
    { dLat: -0.005, dLng: 0.008,  icon: "🍷" }
  ];

  let rawSpots = [];
  if (typeof window !== "undefined" && window.__getTopAttractionsForTrip) {
    rawSpots = window.__getTopAttractionsForTrip(trip);
  }
  if (!rawSpots.length) {
    rawSpots = [
      ...(trip.mapPins || []),
      ...(trip.tourismPois || []),
      ...(trip.ideas || []),
      ...(trip.explorePlaces || []),
      ...(trip.osmPlaces || []),
      ...(trip.hiddenGems || [])
    ];
  }

  const travelerSpots = rawSpots.filter(isTravelerSight);

  const rawPois = (travelerSpots.length ? travelerSpots.slice(0, 18) : [
    { title: `${trip.destination || 'City'} Central Landmark`, category: "Landmark", rating: 4.9, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80" },
    { title: `${trip.destination || 'City'} Historic Quarter`, category: "Historic", rating: 4.8, image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80" },
    { title: `${trip.destination || 'City'} Art & Culture Hub`, category: "Culture", rating: 4.8, image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=400&q=80" },
    { title: `${trip.destination || 'City'} Artisanal Cafe`, category: "Cafe", rating: 4.7, image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80" },
    { title: `${trip.destination || 'City'} Harbor & Sunset View`, category: "Scenic", rating: 4.9, image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80" }
  ]).map((spot, idx) => {
    const offset = defaultOffsets[idx % defaultOffsets.length];
    const spotLat = spot.lat || spot.latitude || spot.coordinates?.[0] || (center[0] + offset.dLat);
    const spotLng = spot.lng || spot.longitude || spot.coordinates?.[1] || (center[1] + offset.dLng);

    const title = spot.title || spot.name || `${trip.destination} Spot`;
    const catLower = String(spot.category || spot.tag || "").toLowerCase();
    const icon = spot.icon || (catLower.includes("museum") || catLower.includes("art") ? "🏛️" :
                               catLower.includes("church") || catLower.includes("basilica") ? "⛪" :
                               catLower.includes("bridge") || catLower.includes("river") ? "🌉" :
                               catLower.includes("monument") || catLower.includes("grave") ? "🌹" :
                               catLower.includes("cafe") || catLower.includes("bistro") ? "☕" :
                               catLower.includes("market") || catLower.includes("wine") ? "🍷" : offset.icon);

    return {
      id: spot.id || `poi-${idx}`,
      title,
      lat: spotLat,
      lng: spotLng,
      icon,
      rating: spot.rating || 4.8,
      category: spot.category || spot.tag || "Attraction",
      distance: spot.geoLabel || `${(0.5 + idx * 0.4).toFixed(1)} km away`,
      img: spot.image || spot.photoUrl || getMapFallbackImage(trip.destination)
    };
  });

  // Apply Radial Collision Avoidance Spacing so markers never overlap on top of each other
  const coordBuckets = new Map();
  const PRECISION = 800; // Grid cell ~120m
  const bounds = L.latLngBounds();

  const pois = rawPois.map((poi, idx) => {
    let lat = poi.lat;
    let lng = poi.lng;
    const key = `${Math.round(lat * PRECISION)},${Math.round(lng * PRECISION)}`;
    const count = coordBuckets.get(key) || 0;
    coordBuckets.set(key, count + 1);

    if (count > 0) {
      const angle = (count * (2 * Math.PI / 5)) + (idx * 0.4);
      const radius = 0.0028 * Math.ceil(count / 5);
      lat += radius * Math.cos(angle);
      lng += radius * Math.sin(angle);
    }

    bounds.extend([lat, lng]);
    return { ...poi, lat, lng };
  });

  currentPoiOverviewList = pois;
  currentPoiOverviewSelectionIndex = 0;
  const initialDirectionsBtn = document.querySelector(".poi-map-floating-card [data-action='open-directions']");
  if (initialDirectionsBtn && pois[0]) setPoiDirectionsButtonData(initialDirectionsBtn, pois[0]);

  const userLat = center[0] - 0.006;
  const userLng = center[1] - 0.007;

  const userIcon = L.divIcon({
    className: "poi-leaflet-marker-wrapper",
    html: `<div style="display:flex; flex-direction:column; align-items:center;">
             <div style="width:20px; height:20px; border-radius:50%; background:#fff; border:3px solid #385C73; box-shadow:0 0 0 4px rgba(56,92,115,0.35); display:flex; align-items:center; justify-content:center;">
               <div style="width:8px; height:8px; border-radius:50%; background:#385C73;"></div>
             </div>
             <span style="font-size:10px; font-weight:700; color:#fff; background:rgba(0,0,0,0.65); padding:1px 6px; border-radius:10px; margin-top:2px;">You</span>
           </div>`,
    iconSize: null
  });
  L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

  const routePoints = [
    [userLat, userLng],
    [center[0] - 0.002, center[1] - 0.003],
    [pois[0]?.lat || (center[0] + 0.0035), pois[0]?.lng || (center[1] - 0.012)]
  ];
  L.polyline(routePoints, {
    color: '#D94A3A',
    dashArray: '6, 6',
    weight: 4,
    opacity: 0.9
  }).addTo(map);

  pois.forEach((poi, idx) => {
    const isActive = idx === 0;
    const bg = isActive ? '#D94A3A' : (poi.icon === '☕' ? '#D2682B' : (poi.icon === '🍷' ? '#9C6E55' : '#385C73'));
    const shadow = isActive ? 'box-shadow: 0 4px 16px rgba(217, 74, 58, 0.6), 0 0 0 2px #ffffff;' : 'box-shadow: 0 2px 10px rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.3);';

    const pillHtml = `
      <div class="poi-leaflet-pill" id="poi-pill-marker-${idx}" style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: ${bg};
        color: #ffffff;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        max-width: 160px;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        user-select: none;
        pointer-events: auto;
        line-height: 1.2;
        transition: all 0.2s ease;
        ${shadow}
      ">
        <span style="font-size: 12px; flex-shrink: 0;">${poi.icon}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(poi.title)}</span>
        <span style="color: #E9C76B; font-weight: 800; font-size: 10px; background: rgba(0,0,0,0.25); padding: 1px 5px; border-radius: 8px; flex-shrink: 0;">★ ${poi.rating || 4.8}</span>
      </div>
    `;

    const pillIcon = L.divIcon({
      className: "poi-leaflet-marker-wrapper",
      html: pillHtml,
      iconSize: null
    });

    const marker = L.marker([poi.lat, poi.lng], { icon: pillIcon, zIndexOffset: isActive ? 2000 : (1000 - idx * 10) }).addTo(map);

    marker.on("click", () => {
      selectPoiOnOverviewMap(idx, poi.title);
    });
  });

  if (pois.length > 1 && bounds.isValid()) {
    map.fitBounds(bounds.pad(0.25));
  }

  attachMapActionOverlay(container, map, trip);
  activeMaps.set("poi-overview", map);
}

function setPoiDirectionsButtonData(button, poi = {}) {
  button.dataset.spotName = poi.title || poi.name || "Destination";
  const coordinates = normalizeMapCoordinates([poi.lat, poi.lng]);
  if (coordinates) {
    button.dataset.destinationLat = String(coordinates[0]);
    button.dataset.destinationLng = String(coordinates[1]);
  } else {
    delete button.dataset.destinationLat;
    delete button.dataset.destinationLng;
  }
}

function normalizeRouteCoordinateList(points = []) {
  return points
    .map((point) => normalizeMapCoordinates(point))
    .filter(Boolean);
}

function normalizeMapCoordinates(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lat, lng] = value.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function getMapFallbackImage(destination = "") {
  const lower = String(destination || "").toLowerCase();
  if (lower.includes("madrid")) return "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=400&q=80";
  if (lower.includes("barcelona")) return "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=400&q=80";
  if (lower.includes("crete") || lower.includes("heraklion")) return "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80";
  if (lower.includes("paris")) return "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80";
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80";
}
