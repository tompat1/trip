import { state } from "../state.js";

let L = null;
if (typeof window !== "undefined") {
  import("leaflet").then(m => { L = m.default || m; });
}

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
  berlin: [52.5200, 13.4050],
  germany: [52.5200, 13.4050],
  amsterdam: [52.3676, 4.9041],
  netherlands: [52.3676, 4.9041],
  lisbon: [38.7223, -9.1393],
  portugal: [38.7223, -9.1393],
  heraklion: [35.3391, 25.132],
  crete: [35.3391, 25.132],
  greece: [35.3391, 25.132],
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

  if (document.getElementById("poi-map-container")) {
    initPoiOverviewMap(trip);
  }
}

export function resolveTripCenter(destination = "") {
  const key = normalizeMapLookupKey(destination);
  const match = Object.entries(TRIP_DESTINATION_COORDS).find(([name]) => key.includes(name) || name.includes(key));
  if (match) return match[1];

  import("../services/airportService.js").then(({ resolveAirportInput }) => {
    const airport = resolveAirportInput(destination);
    if (airport && airport.lat && airport.lng) return [airport.lat, airport.lng];
  }).catch(() => {});

  return [51.5072, -0.1276]; // Default to London if completely unknown rather than hardcoded Paris
}

function initHomeMap(trip) {
  if (typeof window === "undefined" || !L) return;
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
  if (typeof window === "undefined" || !L) return;
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
  if (typeof window === "undefined" || !L) return;
  const container = document.getElementById("live-map-container");
  if (!container) return;

  const map = L.map(container, { zoomControl: true }).setView(trip.center, 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
  activeMaps.set("live", map);
}

function initPlanMap(trip) {
  if (typeof window === "undefined" || !L) return;
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
  if (directionsBtn) directionsBtn.dataset.spotName = poi.title;

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

function initPoiOverviewMap(trip) {
  if (typeof window === "undefined" || !L) return;
  const container = document.getElementById("poi-map-container");
  if (!container) return;

  if (activeMaps.has("poi-overview")) {
    try { activeMaps.get("poi-overview").remove(); } catch {}
    activeMaps.delete("poi-overview");
  }

  const center = trip.center || resolveTripCenter(trip.destination);
  const map = L.map(container, { zoomControl: false, attributionControl: false }).setView(center, 14);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  const defaultOffsets = [
    { dLat: 0.0035, dLng: -0.012, icon: "🏛️" },
    { dLat: 0.008,  dLng: -0.006, icon: "📍" },
    { dLat: -0.002, dLng: -0.025, icon: "🗼" },
    { dLat: -0.002, dLng: -0.003, icon: "☕" },
    { dLat: -0.005, dLng: 0.008,  icon: "🍷" }
  ];

  let rawSpots = [...(trip.tourismPois || []), ...(trip.ideas || []), ...(trip.explorePlaces || [])];
  if (!rawSpots.length && typeof window !== "undefined" && window.__getTopAttractionsForTrip) {
    rawSpots = window.__getTopAttractionsForTrip(trip);
  }

  const pois = (rawSpots.length ? rawSpots.slice(0, 5) : [
    { title: `${trip.destination || 'City'} Central Landmark`, category: "Landmark", rating: 4.9, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80" },
    { title: `${trip.destination || 'City'} Historic Quarter`, category: "Historic", rating: 4.8, image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80" },
    { title: `${trip.destination || 'City'} Art & Culture Hub`, category: "Culture", rating: 4.8, image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=400&q=80" },
    { title: `${trip.destination || 'City'} Artisanal Cafe`, category: "Cafe", rating: 4.7, image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80" },
    { title: `${trip.destination || 'City'} Harbor & Sunset View`, category: "Scenic", rating: 4.9, image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80" }
  ]).map((spot, idx) => {
    const offset = defaultOffsets[idx % defaultOffsets.length];
    return {
      id: spot.id || `poi-${idx}`,
      title: spot.title || spot.name || `${trip.destination} Spot`,
      lat: spot.lat || spot.latitude || (center[0] + offset.dLat),
      lng: spot.lng || spot.longitude || (center[1] + offset.dLng),
      icon: spot.icon || (spot.category?.includes("Cafe") ? "☕" : spot.category?.includes("Wine") ? "🍷" : offset.icon),
      rating: spot.rating || 4.8,
      category: spot.category || spot.tag || "Attraction",
      distance: spot.geoLabel || `${(0.5 + idx * 0.4).toFixed(1)} km away`,
      img: spot.image || spot.photoUrl || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80"
    };
  });

  currentPoiOverviewList = pois;

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
    [center[0] + 0.0035, center[1] - 0.012]
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
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        pointer-events: auto;
        line-height: 1.2;
        transition: all 0.2s ease;
        ${shadow}
      ">
        <span style="font-size: 13px;">${poi.icon}</span>
        <span>${escapeHtml(poi.title)}</span>
        <span style="color: #E9C76B; font-weight: 800; font-size: 11px; background: rgba(0,0,0,0.25); padding: 1px 6px; border-radius: 10px;">★ ${poi.rating || 4.8}</span>
      </div>
    `;

    const pillIcon = L.divIcon({
      className: "poi-leaflet-marker-wrapper",
      html: pillHtml,
      iconSize: null
    });

    const marker = L.marker([poi.lat, poi.lng], { icon: pillIcon, zIndexOffset: isActive ? 1000 : 100 }).addTo(map);

    marker.on("click", () => {
      selectPoiOnOverviewMap(idx, poi.title);
    });
  });

  activeMaps.set("poi-overview", map);
}
