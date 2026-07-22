import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { creteSeed } from "./data/creteSeed.js";
import { composeEditorialProfile, createPlaceProfileEnvelope, createVerifiedFactBundle } from "./enrichment/editorialComposer.js";
import { enrichPlaceMedia } from "./enrichment/mediaAggregator.js";
import { normalizeOsmElement, normalizeSeedPlace, normalizeUserPlace } from "./enrichment/normalizers.js";
import { resolveLocationContext } from "./enrichment/placeResolver.js";
import "./styles.css";

const placeColors = {
  blue: "#385c73",
  green: "#65705b",
  sun: "#e9c76b",
  red: "#d94a3a",
  clay: "#9c6e55",
};

const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const LOCATION_CACHE_KEY = "trip-location-context-v1";
const LOCATION_CACHE_MAX_AGE = 1000 * 60 * 60 * 12;
const PLACE_INTEL_CACHE_KEY = "trip-place-intel-v1";
const PLACE_INTEL_CACHE_MAX_AGE = 1000 * 60 * 60 * 24;
const WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const WIKIPEDIA_SEARCH_API = "https://en.wikipedia.org/w/api.php";
const REST_COUNTRIES_API = "https://restcountries.com/v3.1/name/";
const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const NEARBY_DISCOVERY_CACHE_KEY = "trip-nearby-discovery-v1";
const NEARBY_DISCOVERY_CACHE_MAX_AGE = 1000 * 60 * 30;
const OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast";
const WEATHER_CACHE_KEY = "trip-weather-context-v1";
const WEATHER_CACHE_MAX_AGE = 1000 * 60 * 20;
const USER_PLACES_STORAGE_KEY = "trip-user-nearby-places-v1";
const HIDDEN_NEARBY_STORAGE_KEY = "trip-hidden-nearby-v1";
const PLACE_IMAGE_CACHE_KEY = "trip-place-images-v1";
const PLACE_IMAGE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const HERAKLION_CENTER = [35.3391, 25.132];

let leafletMaps = new Map();
let leafletInitFrame = null;
let liveClockTimer = null;
let liveDeviceHooksReady = false;
let imageLookupInFlight = false;
let isRendering = false;
let pendingRender = false;

const state = {
  activeView: "home",
  activeDay: 0,
  savedIds: new Set(["koules", "knossos", "museum"]),
  confirmedIds: new Set(["koules"]),
  filters: "All",
  shareEnabled: false,
  tripMode: true,
  offlineReady: true,
  travelFocus: "coffee",
  mediaOrganized: false,
  storyDrafted: false,
  guideQuery: "What should I do if rain starts after lunch?",
  guideWeatherMode: "mixed",
  routeOptimized: false,
  acknowledgedAlerts: new Set(),
  selectedMapPlaceId: null,
  locationContext: {
    automatic: true,
    attempted: false,
    status: "idle",
    coordinates: null,
    accuracy: null,
    updatedAt: null,
    area: null,
    resolved: null,
    error: "",
  },
  placeIntel: {
    activeTab: "place",
    status: "idle",
    updatedAt: null,
    error: "",
    tabs: {
      place: null,
      city: null,
      region: null,
      island: null,
      country: null,
    },
  },
  nearbyDiscovery: {
    status: "idle",
    updatedAt: null,
    error: "",
    places: [],
  },
  weatherContext: {
    status: "idle",
    updatedAt: null,
    error: "",
    current: null,
  },
  placeEditorOpen: false,
  placeImageCache: readCachedPlaceImages(),
  userPlaces: readStoredUserPlaces(),
  hiddenNearbyIds: readStoredHiddenNearbyIds(),
  trip: { ...creteSeed.trip },
  live: { ...creteSeed.live, connection: navigator.onLine ? "Online" : "Offline" },
  collaborators: creteSeed.collaborators.map((collaborator) => ({ ...collaborator })),
  places: creteSeed.places.map((place) => normalizeSeedPlace(place)),
  recommendations: creteSeed.recommendations.map((recommendation) => ({ ...recommendation })),
  mediaQueue: creteSeed.mediaQueue.map((item) => ({ ...item })),
  guideSources: [
    { name: "Visit Heraklion", type: "Destination", freshness: "Source hook", status: "Planned" },
    { name: "Incredible Crete", type: "Region", freshness: "Source hook", status: "Planned" },
    { name: "OpenStreetMap nearby", type: "Places", freshness: "Live scan", status: "Connected" },
    { name: "Weather and transit", type: "Live context", freshness: "15 min", status: "Connected" },
  ],
  guidePicks: [
    { title: "Heraklion Archaeological Museum", score: "96%", reason: "Strong indoor anchor and the cleanest context before Knossos.", source: "Museum and destination hooks", weather: "rain" },
    { title: "Koules Fortress", score: "91%", reason: "Best late afternoon when the harbor light softens.", source: "Visit Heraklion hook", weather: "sun" },
    { title: "Lions Square", score: "88%", reason: "Matches coffee, old town wandering, and short transition time.", source: "OpenStreetMap nearby", weather: "mixed" },
  ],
  guideSummaries: [
    {
      title: "Heraklion city block",
      text: "Group Lions Square, the Archaeological Museum, Koules Fortress, and the old harbor into one city day. Keep Knossos as an early-start half day.",
      citations: ["Visit Heraklion", "OpenStreetMap"],
    },
    {
      title: "Personal fit",
      text: "Your saved cafes and photography moments suggest slower transitions, fewer landmark hops, and one protected reset window after lunch.",
      citations: ["Neighborhood food notes", "Trip memory"],
    },
  ],
  guideRoute: [
    { time: "09:30", stop: "Lions Square", note: "Coffee and an easy city-center start." },
    { time: "10:30", stop: "Heraklion Archaeological Museum", note: "Minoan context before the heat peaks." },
    { time: "13:00", stop: "Old town lunch", note: "Stay close to shade and short walks." },
    { time: "18:30", stop: "Koules Fortress", note: "Harbor light and a cooler walk." },
  ],
  guideAlerts: [
    { id: "museum-window", title: "Museum first", detail: "Use the Archaeological Museum as a heat or rain-safe morning anchor.", level: "Guide" },
    { id: "harbor-light", title: "Harbor light", detail: "Favor Koules and the old harbor later in the day when the walk is cooler.", level: "Photo" },
    { id: "knossos-heat", title: "Knossos heat", detail: "Start early, carry water, and keep the palace visit flexible on hot days.", level: "Weather" },
  ],
  visualGuide: {
    id: "crete-amoudara-10-days",
    title: "Crete 10-Day Visual Guide",
    base: "Ammoudara",
    purpose: [
      "What is worth seeing?",
      "How can I reach it comfortably?",
      "Does it suit my interests, time, transport options and comfort level?",
    ],
    modules: ["Beaches", "Spectacular views", "Hidden gems", "Food", "Transport", "Driving comfort", "Flexible alternatives"],
    day: {
      day: 5,
      title: "Matala and Kommos",
      summary: "The most spectacular beach and landscape day.",
      image: "image4.jpg",
      transport: ["rental car", "organised excursion"],
      drivingLevel: "easy-moderate",
      ratings: { beach: 5, views: 5, sunset: 5 },
      places: ["Matala", "Matala Caves", "Kommos Beach"],
      safetyNotes: ["Check heat exposure", "Avoid rough sea at Kommos", "Keep flexible return timing"],
    },
    endpoints: [
      "GET /api/guides",
      "GET /api/guides/crete-amoudara-10-days",
      "GET /api/guides/crete-amoudara-10-days/days/5",
      "GET /api/search?beach=5&driving=easy",
      "POST /api/guides/crete-amoudara-10-days/personalise",
    ],
    personalization: ["7 days instead of 10", "public transport only", "beaches and architecture", "no mountain driving", "family-friendly", "accessible walking distances", "Polish, English or Swedish", "rainy-day alternatives", "low-budget or premium", "start from another hotel"],
    stack: ["Sanity or database", "Image CDN", "Leaflet and OpenStreetMap", "Local transport sources", "Weather provider", "OpenAI API", "Backend API", "React / Next / mobile app"],
  },
  moments: [
    { title: "Old town evening walk", type: "Video", date: "18 Jul", length: "0:52", tone: "street" },
    { title: "Lions Square coffee", type: "Photo", date: "18 Jul", length: "12 photos", tone: "coffee" },
    { title: "Koules at blue hour", type: "Moment", date: "19 Jul", length: "0:39", tone: "river" },
  ],
  notes: [
    "Carry water and keep Knossos early if the day is hot.",
    "Try to keep one unscheduled beach or coffee block every day.",
    "Share link should hide private notes before sending.",
  ],
};

const navItems = [
  ["home", "Home", "home"],
  ["live", "Live", "navigation"],
  ["trip", "Trips", "calendar"],
  ["profile", "Profile", "user"],
];

const searchNavItem = ["search", "Search", "search"];

const travelFocusOptions = [
  { id: "coffee", label: "Coffee", icon: "coffee" },
  { id: "shopper", label: "Shopper", icon: "saved" },
  { id: "arty", label: "Arty/Muse", icon: "walk" },
  { id: "beachy", label: "Beachy", icon: "navigation" },
];

const dayLabels = ["Sat 3", "Sun 4", "Mon 5", "Tue 6", "Wed 7", "Thu 8", "Fri 9"];

const icons = {
  home: `<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.8 10.2v8.3h4.1v-5h4.2v5h4.1v-8.3"/>`,
  navigation: `<path d="M12 3.8 20 20.2l-8-3.6-8 3.6L12 3.8Z"/><path d="M12 3.8v12.8"/>`,
  spark: `<path d="M12 3.8 13.9 9l5.3 1.8-5.3 1.9L12 18l-1.9-5.3-5.3-1.9L10.1 9 12 3.8Z"/><path d="M18.5 15.5 20 19.2"/><path d="M5.5 15.5 4 19.2"/>`,
  calendar: `<path d="M5 6.5h14v13H5z"/><path d="M8 4v5"/><path d="M16 4v5"/><path d="M5 10h14"/><path d="M8.3 14h3.2"/><path d="M8.3 17h5.8"/>`,
  search: `<circle cx="10.5" cy="10.5" r="5.8"/><path d="m15 15 4.5 4.5"/>`,
  map: `<path d="m4.5 6.5 5-2 5 2 5-2v13l-5 2-5-2-5 2v-13Z"/><path d="M9.5 4.5v13"/><path d="M14.5 6.5v13"/>`,
  share: `<path d="M12 4v10"/><path d="m8.5 7.5 3.5-3.5 3.5 3.5"/><path d="M6 12.5v6h12v-6"/>`,
  plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
  filter: `<path d="M5 6h14l-5.2 6v4.4l-3.6 1.8V12L5 6Z"/>`,
  bookmark: `<path d="M7 4.8h10v15l-5-3.1-5 3.1v-15Z"/>`,
  coffee: `<path d="M6 8h9.5v5.2a4.2 4.2 0 0 1-4.2 4.2H9.2A4.2 4.2 0 0 1 5 13.2V8Z"/><path d="M15.5 9.2h1.2a2.1 2.1 0 0 1 0 4.2h-1.2"/><path d="M8 4.8c.8.7.8 1.4 0 2.1"/><path d="M11 4.5c.8.7.8 1.5 0 2.2"/><path d="M5 20h12"/>`,
  restaurant: `<path d="M7 4.5v6.2"/><path d="M4.8 4.5v6.2"/><path d="M9.2 4.5v6.2"/><path d="M4.8 10.7h4.4"/><path d="M7 10.7v8.8"/><path d="M16.5 4.8c-1.6 1.3-2.3 3-2.2 5.1.1 1.6.8 2.7 2.2 3.2v6.4"/><path d="M18.8 4.8v14.7"/>`,
  walk: `<circle cx="12" cy="5.4" r="2"/><path d="m10.6 8.8-1.8 4 3.3 2.2 2.2 4.5"/><path d="m12.5 9 2.1 2.6 3 .7"/><path d="m9.4 14.1-2.3 5.1"/><path d="m12.1 15 2.7-2.1"/>`,
  saved: `<path d="M12 20.2s-7-4.3-7-10.1A4 4 0 0 1 12 7.4a4 4 0 0 1 7 2.7c0 5.8-7 10.1-7 10.1Z"/><path d="m9.7 12.1 1.5 1.5 3.4-3.7"/>`,
  chevron: `<path d="m9 5 7 7-7 7"/>`,
  timeline: `<path d="M5 6h5"/><path d="M14 6h5"/><path d="M5 12h14"/><path d="M5 18h5"/><path d="M14 18h5"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>`,
  camera: `<path d="M4.5 8.5h4l1.4-2h4.2l1.4 2h4v10h-15z"/><circle cx="12" cy="13.5" r="3.2"/><path d="M17 11h.1"/>`,
  user: `<circle cx="12" cy="8.2" r="3.5"/><path d="M5.5 20c1.2-3.4 3.4-5.1 6.5-5.1s5.3 1.7 6.5 5.1"/>`,
  photo: `<path d="M4.5 6.5h15v11h-15z"/><circle cx="9" cy="10" r="1.5"/><path d="m6.8 16 4.1-4 2.6 2.5 1.5-1.5 2.5 3"/>`,
  video: `<path d="M4.5 7.5h10v9h-10z"/><path d="m14.5 10.5 5-2.8v8.6l-5-2.8z"/>`,
  note: `<path d="M6.5 4.8h9.2l2.8 2.8v11.6h-12z"/><path d="M15.5 4.8v3h3"/><path d="M9 11.5h6"/><path d="M9 15h4"/>`,
  moment: `<circle cx="12" cy="12" r="7.5"/><path d="M12 7.5v4.8l3.5 2.1"/><path d="M5.8 5.8 4.2 4.2"/><path d="m19.8 4.2-1.6 1.6"/>`,
};

function renderIcon(name) {
  return `
    <svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      ${icons[name] || icons.home}
    </svg>
  `;
}

function render() {
  if (isRendering) {
    pendingRender = true;
    return;
  }

  isRendering = true;
  try {
    destroyLeafletMaps();
    const app = document.querySelector("#app");
    app.innerHTML = `
      <div class="app-shell">
        ${renderSidebar()}
        <main id="main" class="workspace" tabindex="-1">
          ${renderHeader()}
          ${renderView()}
        </main>
        ${renderMobileNav()}
      </div>
    `;
    bindEvents();
    scheduleLeafletMaps();
    initAutomaticPositioning();
    initWeatherContext();
    initNearbyDiscovery();
    initPlaceImageLookup();
    syncLiveClock();
    initLiveDeviceHooks();
  } finally {
    isRendering = false;
  }

  if (pendingRender) {
    pendingRender = false;
    requestAnimationFrame(render);
  }
}

function renderSidebar() {
  return `
    <aside class="sidebar" aria-label="Primary">
      <button class="brand" data-view="home" aria-label="TRIP home">
        <span class="brand-mark">T</span>
        <span>
          <strong>TRIP</strong>
          <small>Travel Planner Deluxe</small>
        </span>
      </button>
      ${renderSearchAction("sidebar-search")}
      <nav class="nav-list">
        ${navItems
          .map(
            ([id, label, icon]) => `
              <button class="nav-item ${state.activeView === id ? "is-active" : ""}" data-view="${id}">
                <span class="nav-icon">${renderIcon(icon)}</span><em>${label}</em>
              </button>`
          )
          .join("")}
      </nav>
      <div class="profile-chip">
        <span class="avatar">TR</span>
        <span><strong>${state.trip.profile}</strong><small>Premium</small></span>
      </div>
    </aside>
  `;
}

function renderHeader() {
  const isLive = state.activeView === "live";
  const title = isLive ? getLiveHeaderTitle() : state.trip.destination;
  const headerMeta = isLive
    ? `<span id="live-date-time" data-live-clock>${formatLiveDateTime()}</span>`
    : `<span>${state.trip.dates}</span>`;
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">${isLive ? "Live journey" : state.activeView === "guide" ? "Intelligent guide" : state.tripMode ? "Live journey" : "Plan and remember"}</p>
        <h1>${escapeHtml(title)}</h1>
        ${headerMeta}
      </div>
      <div class="top-actions">
        <button class="icon-action" data-view="map" aria-label="Open map">${renderIcon("map")}</button>
        <button class="ghost-button" data-copy-share>${renderIcon("share")} Share</button>
        <button class="primary-button" data-open-create>${renderIcon("plus")} New trip</button>
      </div>
    </header>
  `;
}

function renderView() {
  const views = {
    home: renderHome,
    live: renderLive,
    guide: renderGuide,
    trip: renderTrip,
    search: renderSearch,
    map: renderMap,
    timeline: renderTimeline,
    moments: renderMoments,
    profile: renderProfile,
  };
  return `<section class="view-panel">${views[state.activeView]()}</section>`;
}

function renderGuide() {
  const visibleAlerts = state.guideAlerts.filter((alert) => !state.acknowledgedAlerts.has(alert.id));
  const route = state.guideRoute;
  const weatherHint = {
    mixed: "Balanced for changing skies: one outdoor window, one indoor anchor, one cafe reset.",
    rain: "Rain-aware mode favors museums, covered passages, and short walks between saved stops.",
    sun: "Sun-aware mode pulls stained glass, gardens, and riverside photos earlier in the day.",
  }[state.guideWeatherMode];

  return `
    <div class="guide-page">
      <section class="guide-hero">
        <div>
          <p class="eyebrow">Visual guide · Structured travel research</p>
          <h2>Calm, practical guides from real destination research.</h2>
          <p>TRIP turns visual travel guides into modular day-by-day data: inspiring places, comfort-aware transport, ratings, safety notes, flexible alternatives, and personalized versions.</p>
          <div class="guide-purpose-list">
            ${state.visualGuide.purpose.map((item) => `<span>${item}</span>`).join("")}
          </div>
        </div>
        <form class="guide-search" data-guide-search>
          <label>
            Personalize this guide
            <div>
              ${renderIcon("spark")}
              <input name="guideQuery" value="${state.guideQuery}" aria-label="Ask the intelligent guide"/>
            </div>
          </label>
          <button class="primary-button">Ask guide</button>
        </form>
      </section>
      <section class="visual-guide-panel">
        <div class="section-head"><h2>${state.visualGuide.title}</h2><button>${state.visualGuide.base}</button></div>
        <p>Stored as guide, day, place, rating, transport, driving-comfort, image, and safety-note data instead of only as a PDF.</p>
        <div class="module-chip-row">
          ${state.visualGuide.modules.map((module) => `<span>${module}</span>`).join("")}
        </div>
      </section>
      <section class="day-module-panel">
        ${renderVisualGuideDay(state.visualGuide.day)}
      </section>
      <section class="source-panel">
        <div class="section-head"><h2>Sources</h2><button data-sync-sources>Sync</button></div>
        <div class="source-grid">
          ${state.guideSources.map(renderGuideSource).join("")}
        </div>
      </section>
      <section class="answer-panel">
        <div class="section-head"><h2>Guide answer</h2><button data-view="search">Open search</button></div>
        <p>${renderGuideAnswer()}</p>
        <div class="citation-row">
          ${["Visit Heraklion", "OpenStreetMap", "Weather and transit"].map((source) => `<span>${source}</span>`).join("")}
        </div>
      </section>
      <section class="personalized-panel">
        <div class="section-head"><h2>Personalized recommendations</h2><button data-weather-mode>${state.guideWeatherMode}</button></div>
        <p class="guide-hint">${weatherHint}</p>
        <div class="guide-pick-list">
          ${getWeatherPicks().map(renderGuidePick).join("")}
        </div>
      </section>
      <section class="summary-panel">
        <h2>Cited guide summaries</h2>
        <div class="summary-list">
          ${state.guideSummaries.map(renderGuideSummary).join("")}
        </div>
      </section>
      <section class="api-panel">
        <h2>Guide API shape</h2>
        <div class="endpoint-list">
          ${state.visualGuide.endpoints.map((endpoint) => `<code>${endpoint}</code>`).join("")}
        </div>
      </section>
      <section class="personalise-panel">
        <h2>AI personalization paths</h2>
        <div class="personalise-grid">
          ${state.visualGuide.personalization.map((option) => `<span>${option}</span>`).join("")}
        </div>
      </section>
      <section class="route-panel">
        <div class="section-head"><h2>Optimized route</h2><button data-optimize-route>${state.routeOptimized ? "Optimized" : "Optimize"}</button></div>
        <div class="route-metrics">
          <span><strong>${state.routeOptimized ? "31" : "44"}</strong> min walking</span>
          <span><strong>${state.routeOptimized ? "3" : "5"}</strong> backtracks</span>
          <span><strong>${state.routeOptimized ? "92" : "74"}</strong> fit score</span>
        </div>
        <div class="optimized-route">
          ${route.map(renderRouteStop).join("")}
        </div>
      </section>
      <section class="alert-panel">
        <div class="section-head"><h2>Event alerts</h2><button data-reset-alerts>Reset</button></div>
        <div class="alert-list">
          ${visibleAlerts.length ? visibleAlerts.map(renderGuideAlert).join("") : `<p class="empty-state">All alerts acknowledged. You are weirdly calm and I respect it.</p>`}
        </div>
      </section>
      <section class="weather-aware-panel">
        <h2>Production guide stack</h2>
        <div class="weather-advice">
          ${state.visualGuide.stack.map((item) => `<article><strong>${item}</strong><span>${renderStackNote(item)}</span></article>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderHome() {
  const weather = state.weatherContext.current;
  const weatherPlace = getLiveHeaderTitle();
  const nearYouNow = getNearYouNowPlaces();
  const localTime = formatLiveDateTime();
  const accuracy = state.locationContext.accuracy ? `${Math.round(state.locationContext.accuracy)} m` : "Waiting";
  return `
    <div class="home-dashboard">
      <section class="home-trip-banner">
        <div>
          <p class="eyebrow">Live journey</p>
          <h2>${escapeHtml(weatherPlace)}</h2>
          <span>${escapeHtml(localTime)}</span>
          <small class="currency-chip">EUR (€)</small>
        </div>
        <div class="top-actions">
          <button class="icon-action" data-view="map" aria-label="Open map">${renderIcon("map")}</button>
          <button class="ghost-button" data-copy-share>${renderIcon("share")} Share</button>
          <button class="primary-button" data-view="trip">${renderIcon("plus")} New trip</button>
          <button class="mode-button is-active">Trip Mode</button>
        </div>
      </section>

      ${renderDestinationStoryPanel()}

      <section class="home-greeting-panel">
        <p class="eyebrow">Good ${getDayPeriod()}</p>
        <h2>${escapeHtml(state.trip.profile.split(" ")[0] || "traveler")}</h2>
        <p><span class="live-dot"></span>${state.locationContext.coordinates ? `You are in ${escapeHtml(weatherPlace)}` : "Enable location to personalize this dashboard."}</p>
        <span>${weather ? `${escapeHtml(weather.label)} · ${Math.round(weather.temperature)}°C` : "Weather hook waiting"} · ${accuracy} accuracy</span>
      </section>

      ${renderRecommendedNextPanel(nearYouNow)}

      <section class="task-card">
        <h3>Continue planning</h3>
        ${renderHomeChecklist()}
      </section>

      <section class="home-map-card">
        ${renderHomeMap()}
        <div class="map-status-card">
          <strong>${state.locationContext.coordinates ? `Near ${escapeHtml(weatherPlace)}` : "Location pending"}</strong>
          <span>Accuracy: ${accuracy}</span>
        </div>
      </section>

      <section class="weather-card">
        ${renderCompactWeatherCard(weather, weatherPlace)}
      </section>

      <section class="home-ideas-panel">
        <div class="section-head"><h3>Ideas near you</h3><button data-refresh-nearby>Scan</button></div>
        <div class="home-idea-strip">
          ${nearYouNow.slice(0, 5).map(renderHomeIdeaCard).join("")}
        </div>
      </section>

      <section class="home-hook-panel">
        <h3>Events and official sources</h3>
        <div class="hook-card-grid">
          ${renderHomeHookCard("Events", "Heraklion Culture", "Connector planned · no fake events shown")}
          ${renderHomeHookCard("Transport", "Urban Bus / KTEL", "Approved endpoint needed")}
          ${renderHomeHookCard("Guide", "Visit Heraklion / Incredible Crete", "Curated pull source")}
        </div>
      </section>

      <section class="home-nearby-panel">
        <div class="section-head"><h3>Nearby now</h3><button data-view="live">Open live</button></div>
        <div class="recommendation-list">
          ${nearYouNow.slice(0, 3).map(renderRecommendation).join("")}
        </div>
      </section>

      <section class="quick-card">
        <h3>Quick capture</h3>
        <button data-action="photo">${renderIcon("photo")} Photo</button>
        <button data-action="video">${renderIcon("video")} Video</button>
        <button data-action="note">${renderIcon("note")} Note</button>
        <button data-action="moment">${renderIcon("moment")} Moment</button>
        <button data-action="expense">${renderIcon("plus")} Expense</button>
      </section>
    </div>
  `;
}

function renderDestinationStoryPanel() {
  const title = state.locationContext.area?.city || "Heraklion";
  const region = state.locationContext.area?.region || "Crete";
  return `
    <section class="destination-story-panel" aria-labelledby="destination-story-title">
      <div class="story-copy">
        <p class="eyebrow">First read</p>
        <h2 id="destination-story-title">${escapeHtml(title)}, ${escapeHtml(region)}</h2>
        <p>Heraklion is Crete's busy capital and old harbor city, a practical base for Knossos, the Archaeological Museum, Venetian walls, Koules Fortress, market streets, coffee stops, and beach breaks west of town.</p>
        <div class="story-facts">
          <span>Capital of Crete</span>
          <span>Knossos gateway</span>
          <span>Old harbor walks</span>
          <span>EUR (€)</span>
        </div>
      </div>
      <div class="story-image-grid" aria-label="Heraklion and Crete visual highlights">
        ${renderStoryImage("Koules Fortress", "https://commons.wikimedia.org/wiki/Special:FilePath/Heraklion%20Koules%20fortress.jpg")}
        ${renderStoryImage("Knossos Palace", "https://commons.wikimedia.org/wiki/Special:FilePath/Knossos%20Palace%20North%20Entrance.jpg")}
        ${renderStoryImage("Heraklion Museum", "https://commons.wikimedia.org/wiki/Special:FilePath/Heraklion%20Archaeological%20Museum.jpg")}
      </div>
    </section>
  `;
}

function renderStoryImage(label, imageUrl) {
  return `
    <figure class="story-image" style="background-image: linear-gradient(180deg, transparent 38%, rgba(23,24,23,.76)), url('${escapeHtml(imageUrl)}');">
      <figcaption>${escapeHtml(label)}</figcaption>
    </figure>
  `;
}

function renderCompactWeatherCard(weather, weatherPlace) {
  const forecast = weather?.forecast?.length ? weather.forecast : buildFallbackForecast(weather);
  return `
    <div class="weather-card-head">
      <div>
        <h3>${escapeHtml(weatherPlace)} weather</h3>
        <span>${weather ? escapeHtml(weather.label) : "Open-Meteo waiting for location"}</span>
      </div>
      <strong>${weather ? `${Math.round(weather.temperature)}°C` : "—"}</strong>
    </div>
    <div class="weather-row">
      ${forecast.map((day) => `<span><em>${escapeHtml(day.day)}</em><strong>${escapeHtml(day.temp)}</strong><small>${escapeHtml(day.label)}</small></span>`).join("")}
    </div>
    <small class="weather-source">${weather ? `${Math.round(weather.windSpeed)} km/h wind · Open-Meteo` : "Allow location to load the forecast"}</small>
  `;
}

function buildFallbackForecast(weather) {
  const temp = weather ? Math.round(weather.temperature) : 28;
  const label = weather?.label || "Sunny";
  return ["Today", "Thu", "Fri", "Sat"].map((day, index) => ({
    day,
    temp: `${temp - Math.min(index, 2)}°`,
    label,
  }));
}

function renderRecommendedNextPanel(places) {
  const picks = places.slice(0, 3);
  return `
    <section class="upcoming-panel">
      <div>
        <p class="eyebrow">Recommended next</p>
        <h2>${picks[0] ? escapeHtml(picks[0].title) : "Scan nearby places"}</h2>
        <p>${picks[0] ? escapeHtml(picks[0].reason) : "Use OpenStreetMap nearby tags to find cafes, food, sights, water, toilets, museums and viewpoints around you."}</p>
        <div class="recommended-next-list">
          ${picks.map(renderRecommendedNextItem).join("")}
        </div>
      </div>
      <button class="icon-button" data-refresh-nearby aria-label="Refresh nearby places">⌖</button>
    </section>
  `;
}

function renderRecommendedNextItem(place) {
  return `
    <a class="recommended-next-item" href="${escapeHtml(getMobileMapUrl(place))}" data-map-focus="${escapeHtml(place.id)}" aria-label="Focus ${escapeHtml(place.title)} on the trip map">
      <span class="category-badge ${getPlaceIconName(place)}" aria-hidden="true">${renderIcon(getPlaceIconName(place))}</span>
      <strong>${escapeHtml(place.title)}</strong>
      <small>${escapeHtml(place.distance || place.category || "Nearby")}</small>
    </a>
  `;
}

function renderLive() {
  const nearbySaved = state.places.filter((place) => state.savedIds.has(place.id) || place.nearby).slice(0, 5);
  const livePanelPlaces = getClosestNearYouNowPlaces(5);
  const area = state.locationContext.area;
  return `
    <div class="live-page">
      <section class="live-hero">
        <div>
          <p class="eyebrow">Live journey · ${state.live.lastSync}</p>
          <h2>${state.live.location}</h2>
          <p>${area ? `Positioned near ${area.city || area.region || area.country}. Live routing, visit confirmations, saved places, media, and collaborators stay together while you move.` : "Live routing, visit confirmations, saved places, media, and collaborators stay together while you move."}</p>
        </div>
        <div class="live-meter" aria-label="Live trip status">
          <span>${state.live.battery}</span>
          <small>${state.live.connection} · pack ready</small>
        </div>
      </section>
      <section class="live-map-card">
        ${renderLiveMap(nearbySaved)}
      </section>
      <section class="recommendation-panel">
        <div class="section-head"><h2>Near you now</h2><button data-refresh-nearby>${state.nearbyDiscovery.status === "loading" ? "Scanning" : "Scan"}</button></div>
        <p class="panel-note">${renderNearbyDiscoveryStatus()}</p>
        <div class="recommendation-list">
          ${livePanelPlaces.map(renderRecommendation).join("")}
        </div>
        <div class="nearby-add-row">
          <button class="nearby-add-button" data-toggle-place-editor aria-expanded="${state.placeEditorOpen}" aria-controls="nearby-place-drawer">
            ${renderIcon("plus")} Add cool place
          </button>
        </div>
        ${state.placeEditorOpen ? renderKnownPlaceManager() : ""}
      </section>
      <section class="nearby-panel">
        <h2>Nearby saved places</h2>
        ${nearbySaved.map(renderNearbyPlace).join("")}
      </section>
      <section class="media-panel">
        <div class="section-head"><h2>Media organizer</h2><button data-organize-media>${state.mediaOrganized ? "Organized" : "Organize"}</button></div>
        <div class="media-stack">
          ${state.mediaQueue.map((item) => `<article><strong>${item.title}</strong><span>${item.bucket}</span><small>${state.mediaOrganized ? item.status : "Waiting for automatic sorting"}</small></article>`).join("")}
        </div>
      </section>
      <section class="story-panel">
        <div class="section-head"><h2>Daily story draft</h2><button data-draft-story>${state.storyDrafted ? "Draft ready" : "Draft today"}</button></div>
        <p>${state.storyDrafted ? "Draft: coffee near Lions Square, a Minoan museum block, blue-hour harbor clips, and Koules Fortress at sunset." : "Pulls confirmed visits, uploaded media, and notes into a private story draft at the end of the day."}</p>
      </section>
      <section class="offline-panel">
        <div class="section-head"><h2>Offline access</h2><button data-toggle-offline>${state.offlineReady ? "Cached" : "Cache now"}</button></div>
        <p>${state.offlineReady ? "Saved itinerary, map shell, and trip notes are available without a connection." : "Prepare the saved itinerary and map shell for unreliable signal."}</p>
      </section>
      <section class="collab-panel">
        <div class="section-head"><h2>Collaborative trip</h2><button data-invite-collab>Invite</button></div>
        <div class="collab-list">
          ${state.collaborators.map((person) => `<article><span class="avatar">${person.initials}</span><div><strong>${person.name}</strong><small>${person.status}</small></div></article>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderKnownPlaceManager() {
  const [defaultLat, defaultLng] = state.locationContext.coordinates || HERAKLION_CENTER;
  return `
    <div id="nearby-place-drawer" class="nearby-place-drawer">
      <div class="section-head">
      <div>
        <h2>Add or edit places</h2>
        <p class="panel-note">Saved locally as JSON for now. Later this can move to the database without changing the shape.</p>
      </div>
      <button data-toggle-place-editor aria-label="Close add place panel">×</button>
    </div>
    <form class="known-place-form" data-known-place-form>
      <label>Name<input name="title" required placeholder="Great coffee, view, restaurant..." /></label>
      <label>Type
        <select name="category">
          <option>Coffee</option>
          <option>Restaurant</option>
          <option>Walk</option>
          <option>Saved</option>
        </select>
      </label>
      <label>Latitude<input name="lat" type="number" step="any" required value="${escapeHtml(defaultLat)}" /></label>
      <label>Longitude<input name="lng" type="number" step="any" required value="${escapeHtml(defaultLng)}" /></label>
      <label>Image URL<input name="imageUrl" type="url" placeholder="https://..." /></label>
      <label>Upload image<input name="imageFile" type="file" accept="image/*" /></label>
      <label class="wide-field">Short description<textarea name="description" rows="2" placeholder="Why it is worth knowing about"></textarea></label>
      <button class="primary-button" type="submit">${renderIcon("plus")} Add to Near you now</button>
    </form>
    <div class="known-place-list">
      ${state.userPlaces.length ? state.userPlaces.map(renderUserPlaceEditor).join("") : `<p class="empty-state">No custom places yet. Add the cafe, restaurant, walk, or saved spot you just found.</p>`}
    </div>
    </div>
  `;
}

function renderUserPlaceEditor(place) {
  const [lat, lng] = place.coordinates || HERAKLION_CENTER;
  return `
    <form class="known-place-edit" data-user-place-edit="${escapeHtml(place.id)}">
      <span class="category-badge ${getPlaceIconName(place)}" aria-hidden="true">${renderIcon(getPlaceIconName(place))}</span>
      <label>Name<input name="title" required value="${escapeHtml(place.title)}" /></label>
      <label>Type
        <select name="category">
          ${["Coffee", "Restaurant", "Walk", "Saved"].map((category) => `<option ${place.category === category ? "selected" : ""}>${category}</option>`).join("")}
        </select>
      </label>
      <label>Lat<input name="lat" type="number" step="any" required value="${escapeHtml(lat)}" /></label>
      <label>Lng<input name="lng" type="number" step="any" required value="${escapeHtml(lng)}" /></label>
      <label>Image URL<input name="imageUrl" type="url" value="${escapeHtml(isDataImage(place.imageUrl) ? "" : place.imageUrl || "")}" /></label>
      <label>Upload image<input name="imageFile" type="file" accept="image/*" /></label>
      <label class="wide-field">Description<textarea name="description" rows="2">${escapeHtml(place.description || place.reason || "")}</textarea></label>
      <div class="known-place-actions">
        <a class="ghost-button" href="${escapeHtml(getExternalMapUrl(place))}" target="_blank" rel="noreferrer">Open map</a>
        <button type="submit">Save</button>
        <button type="button" data-delete-user-place="${escapeHtml(place.id)}">Delete</button>
      </div>
    </form>
  `;
}

function getWeatherPicks() {
  if (state.guideWeatherMode === "mixed") return state.guidePicks;
  return [
    ...state.guidePicks.filter((pick) => pick.weather === state.guideWeatherMode),
    ...state.guidePicks.filter((pick) => pick.weather !== state.guideWeatherMode),
  ];
}

function renderGuideAnswer() {
  const query = state.guideQuery.toLowerCase();
  if (query.includes("mountain") || query.includes("driving") || query.includes("comfort")) {
    return "Use the visual guide as structured data: filter for easy or easy-moderate driving, keep Matala and Kommos as a rental-car or organised-excursion day, and hide alternatives with steep mountain roads.";
  }
  if (query.includes("crete") || query.includes("beach") || query.includes("family")) {
    return "For Crete, the guide should rank beach, views, sunset, driving comfort, transport options, and safety notes together. Day 5 works as a high-impact beach day with Matala, the caves, and Kommos.";
  }
  if (query.includes("rain") || state.guideWeatherMode === "rain") {
    return "If weather changes, generate a rainy-day guide variant: preserve the traveller's interests, reduce exposed beach or viewpoint time, and suggest nearby indoor food, culture, or transport-safe alternatives.";
  }
  if (query.includes("event") || query.includes("tonight")) {
    return "Tonight is better for the old harbor, Koules Fortress, or a short old-town food walk. Use official event hooks before showing a dated event.";
  }
  return "The best next move is a compact Heraklion loop: Lions Square, the Archaeological Museum, old-town lunch, then Koules Fortress and the harbor. It matches coffee, culture, photos, and lower backtracking.";
}

function renderVisualGuideDay(day) {
  return `
    <article class="visual-day-card">
      <div class="visual-day-image" aria-label="${day.title} visual guide image preview">
        <span>Day ${day.day}</span>
      </div>
      <div>
        <p class="eyebrow">Day module · ${day.drivingLevel}</p>
        <h2>${day.title}</h2>
        <p>${day.summary}</p>
        <div class="rating-grid">
          ${Object.entries(day.ratings).map(([label, value]) => `<span><strong>${value}/5</strong>${label}</span>`).join("")}
        </div>
        <div class="module-chip-row">
          ${day.transport.map((item) => `<span>${item}</span>`).join("")}
        </div>
        <ul class="place-list">
          ${day.places.map((place) => `<li>${place}</li>`).join("")}
        </ul>
      </div>
    </article>
  `;
}

function renderStackNote(item) {
  const notes = {
    "Sanity or database": "Editorial guide content and structured day data.",
    "Image CDN": "Licensed destination photography.",
    "Leaflet and OpenStreetMap": "Coordinates, maps, nearby discovery, and routing context.",
    "Local transport sources": "Current schedules and practical alternatives.",
    "Weather provider": "Live conditions and rainy-day variants.",
    "OpenAI API": "Personalization, translation, and structured itinerary variants.",
    "Backend API": "Security, orchestration, and environment-held API keys.",
    "React / Next / mobile app": "Traveller-facing guide experience.",
  };
  return notes[item] || "Production integration point.";
}

function renderGuideSource(source) {
  return `
    <article class="source-card">
      <span>${source.type}</span>
      <h3>${source.name}</h3>
      <p>${source.freshness}</p>
      <strong>${source.status}</strong>
    </article>
  `;
}

function renderGuidePick(pick) {
  return `
    <article class="guide-pick">
      <div>
        <span>${pick.score}</span>
        <h3>${pick.title}</h3>
        <p>${pick.reason}</p>
      </div>
      <small>${pick.source}</small>
    </article>
  `;
}

function renderGuideSummary(summary) {
  return `
    <article class="summary-card">
      <h3>${summary.title}</h3>
      <p>${summary.text}</p>
      <div class="citation-row">
        ${summary.citations.map((citation) => `<span>${citation}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderRouteStop(stop, index) {
  return `
    <article class="route-stop">
      <time>${stop.time}</time>
      <span>${index + 1}</span>
      <div>
        <h3>${stop.stop}</h3>
        <p>${state.routeOptimized ? stop.note.replace("Short", "Efficient") : stop.note}</p>
      </div>
    </article>
  `;
}

function renderGuideAlert(alert) {
  return `
    <article class="guide-alert">
      <span>${alert.level}</span>
      <div>
        <h3>${alert.title}</h3>
        <p>${alert.detail}</p>
      </div>
      <button class="icon-button" data-ack-alert="${alert.id}" aria-label="Acknowledge ${alert.title}">×</button>
    </article>
  `;
}

function renderTrip() {
  return `
    <div class="trip-layout">
      <section class="form-panel">
        <h2>Create a trip</h2>
        <div class="field-grid">
          <label>Trip name<input value="Heraklion summer base" aria-label="Trip name"/></label>
          <label>Destination<input value="${state.trip.destination}" aria-label="Destination"/></label>
          <label>Start date<input type="date" value="2026-07-17" aria-label="Start date"/></label>
          <label>End date<input type="date" value="2026-07-24" aria-label="End date"/></label>
        </div>
        <div class="companion-row">
          <span class="avatar">TR</span><span class="avatar">MR</span><button class="icon-button" aria-label="Invite companion">+</button>
        </div>
      </section>
      <section class="itinerary-panel">
        <div class="section-head"><h2>Basic itinerary</h2><button data-add-block>+ Add time block</button></div>
        <div class="day-tabs" role="tablist">
          ${dayLabels.map((day, index) => `<button class="${state.activeDay === index ? "is-active" : ""}" data-day="${index}">${day}</button>`).join("")}
        </div>
        <div class="agenda">
          ${renderAgendaItems(state.activeDay)}
        </div>
      </section>
      <section class="notes-panel">
        <h2>Personal notes</h2>
        <textarea aria-label="Personal trip notes">${state.notes.join("\n")}</textarea>
      </section>
    </div>
  `;
}

function renderSearch() {
  const categories = ["All", "Cafe", "Museum", "Landmark", "Hidden gems", "Neighborhood"];
  const places = state.filters === "All" ? state.places.slice(0, 4) : state.places.filter((place) => place.category === state.filters);
  return `
    <div class="search-page">
      <section class="search-panel">
        <div class="search-command-row">
          <label class="search-box">
            ${renderIcon("search")}
            <input placeholder="Search places, cafes, museums, neighborhoods..." aria-label="Search places"/>
          </label>
          <button class="filter-button" aria-label="Filter places">${renderIcon("filter")}</button>
        </div>
        <div class="filter-row">
          ${categories.map((category) => `<button class="${state.filters === category ? "is-active" : ""}" data-filter="${category}">${category}</button>`).join("")}
        </div>
      </section>
      <section class="search-results-panel">
        <div class="result-list">
          ${places.map(renderPlaceResult).join("")}
        </div>
        <button class="vibe-card" data-view="guide">
          <span>${renderIcon("spark")}</span>
          <strong>Find places that fit your vibe</strong>
          <small>Try “quiet coffee shops in Le Marais”</small>
          <em>${renderIcon("chevron")}</em>
        </button>
      </section>
    </div>
  `;
}

function renderMap() {
  const nearYouNow = getNearYouNowPlaces();
  return `
    <div class="map-page">
      <section class="map-panel large">
        ${renderMapCanvas()}
      </section>
      <aside class="saved-panel">
        <h2>Saved places</h2>
        ${state.places.filter((place) => state.savedIds.has(place.id)).map(renderSavedPlace).join("")}
        <div class="area-divider"></div>
        <div class="section-head"><h2>Near you now</h2><button data-refresh-nearby>${state.nearbyDiscovery.status === "loading" ? "Scanning" : "Scan"}</button></div>
        <p class="panel-note">${renderNearbyDiscoveryStatus()}</p>
        <div class="recommendation-list">
          ${nearYouNow.map(renderRecommendation).join("")}
        </div>
      </aside>
    </div>
  `;
}

function getLiveHeaderTitle() {
  const area = state.locationContext.area;
  return getTravelerCityName(area) || state.live.location || "Near you now";
}

function getTravelerCityName(area) {
  if (!area) return "";
  return area.city || area.town || area.village || area.suburb || area.county || area.region || area.country || "";
}

function renderTimeline() {
  const items = [
    ["17 Jul", "Trip created", "Heraklion, Crete became your planning home."],
    ["18 Jul", "3 places saved", "Koules Fortress, Knossos Palace, and the museum added."],
    ["19 Jul", "First moment", "Old harbor blue-hour clips assembled from 9 captures."],
    ["20 Jul", "Share link prepared", "Public view can include itinerary and moments."],
  ];
  return `
    <div class="timeline-page">
      <section>
        <h2>Trip timeline</h2>
        <div class="timeline">
          ${items.map(([date, title, text]) => `<article><time>${date}</time><div><h3>${title}</h3><p>${text}</p></div></article>`).join("")}
        </div>
      </section>
      <section class="share-card">
        <h2>Basic share link</h2>
        <p>${state.shareEnabled ? "Sharing is active. Private notes stay hidden." : "Create a lightweight public page for friends or collaborators."}</p>
        <code>${state.trip.link}</code>
        <button class="primary-button" data-copy-share>${state.shareEnabled ? "Copy link" : "Enable sharing"}</button>
      </section>
    </div>
  `;
}

function renderMoments() {
  return `
    <div class="moments-page">
      <section class="upload-panel">
        <h2>Photo and video upload</h2>
        <label class="drop-zone">
          <input data-media-upload type="file" multiple accept="image/*,video/*" aria-label="Upload photos and videos"/>
          <span>Drop memories here</span>
          <small>Photos, video clips, captions, and location notes</small>
        </label>
        <div class="moment-composer">
          <input value="Morning coffee near the canal" aria-label="Moment title"/>
          <button class="primary-button" data-action="moment">Create quick Moment</button>
        </div>
      </section>
      <section>
        <div class="section-head"><h2>Your moments</h2><button>Newest</button></div>
        <div class="moment-grid">
          ${state.moments.map(renderMoment).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderProfile() {
  const activeFocus = travelFocusOptions.find((option) => option.id === state.travelFocus) || travelFocusOptions[0];
  return `
    <div class="profile-page">
      <section class="profile-panel">
        <span class="avatar big">TR</span>
        <h2>${state.trip.profile}</h2>
        <p>${state.trip.handle} · ${escapeHtml(activeFocus.label)} focus</p>
        <div class="stats">
          <span><strong>1</strong> trip</span>
          <span><strong>${state.savedIds.size}</strong> saved</span>
          <span><strong>${state.moments.length}</strong> moments</span>
        </div>
      </section>
      <section class="preferences-panel">
        <h2>Account and profile</h2>
        <label>Display name<input value="${state.trip.profile}" aria-label="Display name"/></label>
        <label>Email<input value="thomas@example.com" aria-label="Email"/></label>
        <label>Home base<input value="Warsaw, Poland" aria-label="Home base"/></label>
        <div class="profile-focus-group">
          <div>
            <h3>Travel focus</h3>
            <p class="panel-note">Tune nearby suggestions to how you want to explore right now.</p>
          </div>
          <div class="profile-focus-toggle" role="group" aria-label="Travel focus">
            ${travelFocusOptions.map((option) => `
              <button
                class="${state.travelFocus === option.id ? "is-active" : ""}"
                data-travel-focus="${option.id}"
                aria-pressed="${state.travelFocus === option.id}"
              >
                ${renderIcon(option.icon)}
                <span>${escapeHtml(option.label)}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderMobileNav() {
  const items = [navItems[0], navItems[1], searchNavItem, navItems[2], navItems[3]];
  return `
    <div class="mobile-nav-shell">
      <nav class="mobile-nav" aria-label="Mobile primary">
        ${items.map(([id, label, icon]) => `<button class="${state.activeView === id ? "is-active" : ""}" data-view="${id}"><span class="nav-icon">${renderIcon(icon)}</span><em>${label}</em></button>`).join("")}
      </nav>
    </div>
  `;
}

function renderSearchAction(extraClass = "") {
  const [id, label, icon] = searchNavItem;
  return `
    <button class="nav-search ${extraClass} ${state.activeView === id ? "is-active" : ""}" data-view="${id}" aria-label="Open trip search">
      <span class="nav-icon">${renderIcon(icon)}</span>
      <em>${label}</em>
    </button>
  `;
}

function renderTinyPlace(place) {
  return `
    <button class="tiny-place ${place.color}" data-place="${place.id}">
      <span></span>
      <strong>${place.title}</strong>
      <small>${place.category}</small>
    </button>
  `;
}

function renderHomeMap() {
  return `<div id="home-map" class="leaflet-map leaflet-home-map" role="img" aria-label="Live map preview with nearby places"></div>`;
}

function renderHomeChecklist() {
  const items = [
    ["Location permission", state.locationContext.status === "located"],
    ["Nearby places scanned", state.nearbyDiscovery.status === "ready"],
    ["Weather checked", state.weatherContext.status === "ready"],
    ["Offline shell ready", state.offlineReady],
  ];

  return items
    .map(([label, checked]) => `<label><input type="checkbox" ${checked ? "checked" : ""}/> ${label}<span>···</span></label>`)
    .join("");
}

function renderHomeIdeaCard(place) {
  const editorial = getPlaceEditorial(place);
  return `
    <a class="home-idea-card" href="${escapeHtml(getMobileMapUrl(place))}" data-map-focus="${escapeHtml(place.id)}" aria-label="Focus ${escapeHtml(place.title)} on the trip map">
      ${renderPlaceImage(place, "home-idea-image")}
      <h3>${escapeHtml(place.title)}</h3>
      <p>${escapeHtml(editorial.whyStop || place.reason)}</p>
      <small>★ ${escapeHtml(place.tag)} · ${escapeHtml(place.distance)}</small>
    </a>
  `;
}

function renderHomeHookCard(title, source, status) {
  return `
    <article>
      <strong>${title}</strong>
      <span>${source}</span>
      <small>${status}</small>
    </article>
  `;
}

function getIdeaTone(category = "") {
  const key = category.toLowerCase();
  if (key.includes("coffee") || key.includes("food")) return "sun";
  if (key.includes("culture") || key.includes("sight")) return "blue";
  if (key.includes("water") || key.includes("reset")) return "green";
  return "clay";
}

function getDayPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function renderPlaceResult(place) {
  const saved = state.savedIds.has(place.id);
  const editorial = getPlaceEditorial(place);
  return `
    <article class="place-result">
      <div class="place-photo ${place.color}"></div>
      <div class="place-copy">
        <h3>${place.title}</h3>
        <p>${place.area}</p>
        <span>★ ${place.rating} · ${place.category}</span>
        <small>${escapeHtml(editorial.whyStop || place.note)}</small>
      </div>
      <div class="place-actions">
        <button class="save-button ${saved ? "is-saved" : ""}" data-save="${place.id}">${saved ? "Saved" : "Save"}</button>
        <button class="bookmark-button ${saved ? "is-saved" : ""}" data-save="${place.id}" aria-label="${saved ? "Remove" : "Save"} ${place.title}">${renderIcon("bookmark")}</button>
      </div>
    </article>
  `;
}

function renderRecommendation(item) {
  const translation = item.englishTitle && item.englishTitle !== item.title ? `<small>English: ${escapeHtml(item.englishTitle)}</small>` : "";
  const source = item.source ? `<small>${escapeHtml(item.source)}</small>` : "";
  const iconName = getPlaceIconName(item);
  const editorial = getPlaceEditorial(item);
  return `
    <article class="recommendation-card">
      <a class="recommendation-link" href="${escapeHtml(getMobileMapUrl(item))}" data-map-focus="${escapeHtml(item.id)}" aria-label="Focus ${escapeHtml(item.title)} on the trip map">
      <div class="recommendation-media">
        ${renderPlaceImage(item, "recommendation-image")}
        <span class="category-badge ${iconName}" title="${escapeHtml(item.tag || item.category || "Nearby")}">${renderIcon(iconName)}</span>
      </div>
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        ${translation}
        <p>${escapeHtml(editorial.whyStop || item.reason)}</p>
        ${source}
      </div>
      <strong>${item.distance}</strong>
      </a>
      <div class="recommendation-actions">
        <button data-edit-user-place="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(item.title)}">${renderIcon("note")}</button>
        <button data-hide-nearby="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)} as not relevant">−</button>
      </div>
    </article>
  `;
}

function renderPlaceImage(place, className) {
  const imageUrl = getPlaceImageUrl(place);
  const imageAttribution = getPlaceImageAttribution(place, imageUrl);
  const tone = getIdeaTone(place?.category || place?.tag || "");
  const style = imageUrl ? ` style="background-image: linear-gradient(180deg, transparent 44%, rgba(23,24,23,.45)), url('${escapeHtml(imageUrl)}');"` : "";
  return `
    <div
      class="${className} ${tone}"
      ${style}
      data-image-provider="${escapeHtml(imageAttribution.provider)}"
      data-image-source="${escapeHtml(imageAttribution.sourceUrl)}"
      data-image-attribution="${escapeHtml(imageAttribution.attribution)}"
      data-visual-role="${escapeHtml(imageAttribution.visualRole)}"
      aria-hidden="true"
    ></div>
  `;
}

function getPlaceImageAttribution(place = {}, imageUrl = "") {
  if (place.image?.url === imageUrl) return place.image;
  const cached = state.placeImageCache[getPlaceImageKey(place)];
  const cachedHero = cached?.hero;
  if (cachedHero && [cachedHero.imageUrl, cachedHero.thumbnailUrl].includes(imageUrl)) {
    return {
      provider: cachedHero.provider,
      sourceUrl: cachedHero.sourcePageUrl,
      attribution: cachedHero.attributionText || cachedHero.creatorName || cachedHero.provider,
      visualRole: cachedHero.illustrativeOnly ? "illustrative" : cachedHero.exactLocation ? "exact" : "approximate",
    };
  }
  if (!imageUrl) {
    return {
      provider: "fallback",
      sourceUrl: "",
      attribution: "Generated interface fallback",
      visualRole: "illustrative",
    };
  }
  if (imageUrl.startsWith("data:")) {
    return {
      provider: "upload",
      sourceUrl: "",
      attribution: "Traveler upload",
      visualRole: "exact",
    };
  }
  if (imageUrl.startsWith("/assets/")) {
    return {
      provider: "user",
      sourceUrl: "User-provided reference asset",
      attribution: place.imageAttribution || "Traveler reference",
      visualRole: "approximate",
    };
  }
  if (imageUrl.includes("commons.wikimedia.org") || imageUrl.includes("wikimedia.org")) {
    return {
      provider: "commons",
      sourceUrl: imageUrl,
      attribution: "Wikimedia Commons",
      visualRole: "approximate",
    };
  }
  return {
    provider: "external",
    sourceUrl: imageUrl,
    attribution: place.source || "External source",
    visualRole: "approximate",
  };
}

function getPlaceEditorial(place = {}) {
  return composeEditorialProfile(place, {
    facts: createVerifiedFactBundle(place, state.locationContext.resolved || state.locationContext.area || {}),
    media: state.placeImageCache[getPlaceImageKey(place)],
    travellerProfile: getTravellerProfile(),
    routeContext: getRouteContext(place),
  });
}

function getPlaceProfile(place = {}) {
  const media = state.placeImageCache[getPlaceImageKey(place)];
  return createPlaceProfileEnvelope(place, {
    media,
    attributions: media?.attributions || [],
    locationContext: state.locationContext.resolved || state.locationContext.area || {},
    travellerProfile: getTravellerProfile(),
    routeContext: getRouteContext(place),
  });
}

function getTravellerProfile() {
  return {
    focus: state.travelFocus,
    interests: [state.travelFocus],
    transport: "mixed",
    preferShortDetours: true,
  };
}

function getRouteContext(place = {}) {
  return {
    origin: getLiveHeaderTitle(),
    destination: state.trip.destination,
    availableHours: 3,
    travellerProfile: getTravellerProfile(),
    previousStop: state.confirmedIds.size ? "confirmed visit" : "",
    nextStop: state.live.nextStop && state.live.nextStop !== place.title ? state.live.nextStop : "",
    weatherContext: state.weatherContext.current || {},
  };
}

function getExternalMapUrl(place) {
  const coordinates = place?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const [lat, lng] = coordinates;
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=18/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
  }
  return "https://www.openstreetmap.org/search?query=" + encodeURIComponent(place?.title || "nearby places");
}

function getMobileMapUrl(place) {
  const coordinates = place?.coordinates;
  const label = place?.title || "Nearby place";
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const [lat, lng] = coordinates;
    return `https://maps.apple.com/?ll=${encodeURIComponent(`${lat},${lng}`)}&q=${encodeURIComponent(label)}`;
  }
  return `https://maps.apple.com/?q=${encodeURIComponent(label)}`;
}

function shouldOpenNativeMaps() {
  return window.matchMedia("(max-width: 900px)").matches || /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getPlaceIconName(place = {}) {
  const key = `${place.tag || place.category || ""}`.toLowerCase();
  if (key.includes("coffee") || key.includes("cafe")) return "coffee";
  if (key.includes("restaurant") || key.includes("food") || key.includes("drink")) return "restaurant";
  if (key.includes("walk") || key.includes("sight") || key.includes("reset") || key.includes("culture")) return "walk";
  if (key.includes("saved") || place.saved) return "saved";
  return "walk";
}

function renderPlaceIntelTabs() {
  const tabs = [
    ["place", "Place"],
    ["city", "City"],
    ["region", "Region"],
    ["island", "Island"],
    ["country", "Country"],
  ];
  const active = state.placeIntel.activeTab;
  const item = state.placeIntel.tabs[active];
  const updated = state.placeIntel.updatedAt ? new Date(state.placeIntel.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return `
    <div class="section-head">
      <div>
        <h2>Live place intelligence</h2>
        <p class="panel-note">${renderPlaceIntelStatus()}${updated ? ` · ${updated}` : ""}</p>
      </div>
      <button data-refresh-intel>${state.placeIntel.status === "loading" ? "Loading" : "Refresh"}</button>
    </div>
    <div class="intel-tabs" role="tablist" aria-label="Place intelligence tabs">
      ${tabs.map(([id, label]) => `<button role="tab" aria-selected="${active === id}" class="${active === id ? "is-active" : ""}" data-intel-tab="${id}">${label}</button>`).join("")}
    </div>
    ${renderPlaceIntelCard(active, item)}
  `;
}

function renderPlaceIntelStatus() {
  if (state.placeIntel.error) return escapeHtml(state.placeIntel.error);
  return {
    idle: "Waiting for area context",
    loading: "Searching public sources",
    ready: "Public source hooks ready",
  }[state.placeIntel.status] || "Waiting for area context";
}

function renderPlaceIntelCard(tab, item) {
  if (!item) {
    return `
      <article class="intel-card is-empty">
        <h3>${escapeHtml(getIntelQuery(tab) || tab)}</h3>
        <p>Allow location access, then TRIP can collect public context for this layer.</p>
        <span>Source hooks: Wikipedia, REST Countries, OpenStreetMap address data</span>
      </article>
    `;
  }

  return `
    <article class="intel-card">
      <span>${escapeHtml(item.source)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="intel-fact-row">
        ${item.facts.map((fact) => `<small>${escapeHtml(fact)}</small>`).join("")}
      </div>
      ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open source</a>` : ""}
    </article>
  `;
}

function renderVisitRow(place) {
  const confirmed = state.confirmedIds.has(place.id);
  return `
    <article class="visit-row">
      <div>
        <h3>${place.title}</h3>
        <p>${place.time} · ${place.area}</p>
      </div>
      <button class="save-button ${confirmed ? "is-saved" : ""}" data-confirm-visit="${place.id}">${confirmed ? "Visited" : "Confirm"}</button>
    </article>
  `;
}

function renderNearbyPlace(place) {
  const distance = place.distance || `${Math.max(4, 14 - place.day * 2)} min`;
  return `
    <article class="nearby-place">
      <span class="nearby-dot ${place.color}"></span>
      <div>
        <h3>${place.title}</h3>
        <p>${place.category} · ${distance}</p>
      </div>
      <button class="icon-button" data-place="${place.id}" aria-label="Focus ${place.title}">⌖</button>
    </article>
  `;
}

function renderSavedPlace(place) {
  return `
    <article class="saved-place">
      <div><h3>${place.title}</h3><p>${place.time} · ${place.category}</p></div>
      <button class="icon-button" data-save="${place.id}" aria-label="Remove ${place.title}">×</button>
    </article>
  `;
}

function renderLiveMap(places) {
  return `
    <div id="live-map" class="leaflet-map leaflet-live-map" role="img" aria-label="Live OpenStreetMap view with current location and saved places"></div>
  `;
}

function renderAgendaItems(dayIndex) {
  const items = state.places.filter((place) => place.day === dayIndex || (dayIndex === 0 && state.savedIds.has(place.id))).slice(0, 4);
  if (!items.length) {
    return `<p class="empty-state">No blocks yet. Search and save a place to start this day.</p>`;
  }
  return items
    .map(
      (place) => `
        <article class="agenda-item ${place.color}">
          <time>${place.time}</time>
          <div><h3>${place.title}</h3><p>${place.note}</p></div>
        </article>`
    )
    .join("");
}

function renderMapCanvas() {
  return `
    <div id="trip-map" class="leaflet-map leaflet-trip-map" role="img" aria-label="OpenStreetMap view of trip places"></div>
  `;
}

function renderMoment(moment) {
  return `
    <article class="moment-card ${moment.tone}">
      <div class="play-badge">${moment.type === "Photo" ? "▧" : "▶"}</div>
      <div>
        <h3>${moment.title}</h3>
        <p>${moment.date} · ${moment.length}</p>
      </div>
    </article>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-toggle-trip-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tripMode = !state.tripMode;
      state.activeView = state.tripMode ? "live" : "home";
      render();
    });
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      render();
    });
  });

  document.querySelectorAll("[data-map-focus]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (shouldOpenNativeMaps()) return;
      event.preventDefault();
      state.selectedMapPlaceId = link.dataset.mapFocus;
      state.activeView = "map";
      render();
    });
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("[data-travel-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      state.travelFocus = button.dataset.travelFocus;
      render();
    });
  });

  document.querySelectorAll("[data-day]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDay = Number(button.dataset.day);
      render();
    });
  });

  document.querySelectorAll("[data-save]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.save;
      state.savedIds.has(id) ? state.savedIds.delete(id) : state.savedIds.add(id);
      render();
    });
  });

  document.querySelectorAll("[data-toggle-place-editor]").forEach((button) => {
    button.addEventListener("click", () => {
      state.placeEditorOpen = !state.placeEditorOpen;
      render();
    });
  });

  document.querySelectorAll("[data-edit-user-place]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.editUserPlace;
      if (!state.userPlaces.some((place) => place.id === id)) {
        const place = getNearYouNowPlaces().find((item) => item.id === id);
        if (place) {
          state.userPlaces = [buildUserPlaceFromNearby(place), ...state.userPlaces];
          state.hiddenNearbyIds.delete(id);
          writeStoredUserPlaces(state.userPlaces);
          writeStoredHiddenNearbyIds(state.hiddenNearbyIds);
        }
      }
      state.placeEditorOpen = true;
      render();
      requestAnimationFrame(() => {
        document.querySelector(`[data-user-place-edit="${CSS.escape(id)}"] input[name="title"]`)?.focus();
      });
    });
  });

  document.querySelectorAll("[data-hide-nearby]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.hideNearby;
      state.hiddenNearbyIds.add(id);
      writeStoredHiddenNearbyIds(state.hiddenNearbyIds);
      render();
    });
  });

  document.querySelectorAll("[data-known-place-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const place = await buildUserPlaceFromForm(new FormData(form));
      state.userPlaces = [place, ...state.userPlaces];
      writeStoredUserPlaces(state.userPlaces);
      state.placeEditorOpen = true;
      render();
    });
  });

  document.querySelectorAll("[data-user-place-edit]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const id = form.dataset.userPlaceEdit;
      const existing = state.userPlaces.find((place) => place.id === id);
      const updated = await buildUserPlaceFromForm(new FormData(form), existing);
      state.userPlaces = state.userPlaces.map((place) => (place.id === id ? updated : place));
      writeStoredUserPlaces(state.userPlaces);
      state.placeEditorOpen = true;
      render();
    });
  });

  document.querySelectorAll("[data-delete-user-place]").forEach((button) => {
    button.addEventListener("click", () => {
      state.userPlaces = state.userPlaces.filter((place) => place.id !== button.dataset.deleteUserPlace);
      writeStoredUserPlaces(state.userPlaces);
      state.placeEditorOpen = true;
      render();
    });
  });

  document.querySelectorAll("[data-confirm-visit]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.confirmVisit;
      state.confirmedIds.has(id) ? state.confirmedIds.delete(id) : state.confirmedIds.add(id);
      render();
    });
  });

  document.querySelectorAll("[data-confirm-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSaved = state.places.find((place) => state.savedIds.has(place.id) && !state.confirmedIds.has(place.id));
      if (nextSaved) state.confirmedIds.add(nextSaved.id);
      render();
    });
  });

  document.querySelectorAll("[data-refresh-location]").forEach((button) => {
    button.addEventListener("click", () => {
      state.live.location = state.live.location === "Heraklion" ? "Old Harbor" : "Heraklion";
      state.live.lastSync = "just now";
      state.recommendations = [...state.recommendations].reverse();
      render();
    });
  });

  document.querySelectorAll("[data-refresh-position]").forEach((button) => {
    button.addEventListener("click", () => {
      requestCurrentPosition({ force: true });
    });
  });

  document.querySelectorAll("[data-intel-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.placeIntel.activeTab = button.dataset.intelTab;
      render();
    });
  });

  document.querySelectorAll("[data-refresh-intel]").forEach((button) => {
    button.addEventListener("click", () => {
      fetchPlaceIntelligence({ force: true });
    });
  });

  document.querySelectorAll("[data-refresh-nearby]").forEach((button) => {
    button.addEventListener("click", () => {
      fetchNearbyDiscoveries({ force: true });
    });
  });

  document.querySelectorAll("[data-refresh-weather]").forEach((button) => {
    button.addEventListener("click", () => {
      fetchWeatherContext({ force: true });
    });
  });

  document.querySelectorAll("[data-organize-media]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mediaOrganized = true;
      state.moments.unshift({ title: "Auto-sorted live journey media", type: "Moment", date: "Today", length: "43 items", tone: "river" });
      render();
    });
  });

  document.querySelectorAll("[data-draft-story]").forEach((button) => {
    button.addEventListener("click", () => {
      state.storyDrafted = true;
      render();
    });
  });

  document.querySelectorAll("[data-toggle-offline]").forEach((button) => {
    button.addEventListener("click", () => {
      state.offlineReady = true;
      render();
    });
  });

  document.querySelectorAll("[data-invite-collab]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.collaborators.some((person) => person.initials === "JS")) {
        state.collaborators.push({ initials: "JS", name: "Jamie", status: "Invited" });
      }
      render();
    });
  });

  document.querySelectorAll("[data-guide-search]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      state.guideQuery = data.get("guideQuery") || state.guideQuery;
      if (state.guideQuery.toLowerCase().includes("rain")) state.guideWeatherMode = "rain";
      render();
    });
  });

  document.querySelectorAll("[data-sync-sources]").forEach((button) => {
    button.addEventListener("click", () => {
      state.guideSources = state.guideSources.map((source) => ({ ...source, status: "Synced" }));
      render();
    });
  });

  document.querySelectorAll("[data-weather-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const modes = ["mixed", "rain", "sun"];
      const nextIndex = (modes.indexOf(state.guideWeatherMode) + 1) % modes.length;
      state.guideWeatherMode = modes[nextIndex];
      render();
    });
  });

  document.querySelectorAll("[data-optimize-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.routeOptimized = true;
      state.guideRoute = [
        { time: "09:30", stop: "Lions Square", note: "Coffee first, then a short walk to the museum." },
        { time: "10:30", stop: "Heraklion Archaeological Museum", note: "Indoor culture before peak heat." },
        { time: "13:00", stop: "Peskesi", note: "Lunch reset close to the old town route." },
        { time: "18:30", stop: "Koules Fortress", note: "Harbor light with no route backtracking." },
      ];
      render();
    });
  });

  document.querySelectorAll("[data-ack-alert]").forEach((button) => {
    button.addEventListener("click", () => {
      state.acknowledgedAlerts.add(button.dataset.ackAlert);
      render();
    });
  });

  document.querySelectorAll("[data-reset-alerts]").forEach((button) => {
    button.addEventListener("click", () => {
      state.acknowledgedAlerts.clear();
      render();
    });
  });

  document.querySelectorAll("[data-copy-share]").forEach((button) => {
    button.addEventListener("click", () => {
      state.shareEnabled = true;
      render();
      if (!navigator.clipboard?.writeText) return;
      navigator.clipboard.writeText(`https://${state.trip.link}`).catch(() => {
        // Clipboard can be blocked in local previews; sharing still toggles on.
      });
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.action;
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      state.moments.unshift({ title: `${label} captured in Heraklion`, type: label, date: "Today", length: type === "note" ? "note" : "0:15", tone: "street" });
      state.activeView = type === "note" ? "trip" : "moments";
      render();
    });
  });

  const fileInput = document.querySelector("[data-media-upload]");
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (!fileInput.files.length) return;
      state.moments.unshift({ title: `${fileInput.files.length} uploads from today`, type: "Moment", date: "Today", length: "draft", tone: "river" });
      render();
    });
  }
}

function getNearYouNowPlaces() {
  const origin = state.locationContext.coordinates || HERAKLION_CENTER;
  const hasLivePosition = Boolean(state.locationContext.coordinates);
  const userNearby = getUserNearbyPlaces(origin, hasLivePosition);
  const curatedNearby = getCuratedTastePlaces(origin, hasLivePosition);

  if (state.nearbyDiscovery.places.length) {
    return filterVisibleNearbyPlaces(mergeNearbyPlaces([...userNearby, ...curatedNearby, ...state.nearbyDiscovery.places])).slice(0, 8);
  }

  const candidates = state.places
    .filter((place) => isInCurrentDestination(place) && place.coordinates)
    .map((place) => {
      const meters = getDistanceMeters(origin, place.coordinates);
      const savedBoost = state.savedIds.has(place.id) ? 0.82 : 1;
      const nearbyBoost = place.nearby ? 0.9 : 1;
      const tasteBoost = getTasteBoost(place);
      const score = meters * savedBoost * nearbyBoost * tasteBoost;
      const distance = meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
      const tag = state.savedIds.has(place.id) ? "Saved" : place.category;
      const reason = hasLivePosition
        ? place.note || `${place.category} near your live position. ${state.confirmedIds.has(place.id) ? "Already visited; good reference point." : "Possible next stop."}`
        : place.note || `${place.category} using central Heraklion until GPS is allowed.`;

      return {
        ...place,
        score,
        title: place.title,
        reason,
        tag,
        distance,
      };
    });

  return filterVisibleNearbyPlaces(mergeNearbyPlaces([...userNearby, ...curatedNearby, ...candidates.sort((a, b) => a.score - b.score)])).slice(0, 8);
}

function getClosestNearYouNowPlaces(limit = 5) {
  const origin = state.locationContext.coordinates || HERAKLION_CENTER;
  const discovered = state.nearbyDiscovery.places.length ? state.nearbyDiscovery.places : [];
  const candidates = mergeNearbyPlaces([
    ...getUserNearbyPlaces(origin, Boolean(state.locationContext.coordinates)),
    ...discovered,
    ...state.places.filter((place) => isInCurrentDestination(place) && place.coordinates),
  ]);

  return filterVisibleNearbyPlaces(candidates)
    .map((place) => {
      const meters = getDistanceMeters(origin, place.coordinates);
      return {
        ...place,
        score: meters,
        distance: meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`,
        reason: place.description || place.reason || place.note || `${place.category || place.tag || "Place"} near your current position.`,
        tag: place.tag || place.category || "Nearby",
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

function filterVisibleNearbyPlaces(places) {
  return places.filter((place) => !state.hiddenNearbyIds.has(place.id));
}

function getUserNearbyPlaces(origin, hasLivePosition) {
  return state.userPlaces
    .filter((place) => Array.isArray(place.coordinates))
    .map((place) => {
      const meters = getDistanceMeters(origin, place.coordinates);
      return {
        ...place,
        tag: place.category,
        distance: meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`,
        reason: place.description || (hasLivePosition ? `${place.category} added by you near your live position.` : `${place.category} added by you near Heraklion.`),
        source: "Your JSON place",
        score: Math.max(1, meters * 0.55),
        saved: place.saved,
        color: getCategoryColor(place.category),
      };
    })
    .sort((a, b) => a.score - b.score);
}

function getCuratedTastePlaces(origin, hasLivePosition) {
  return state.places
    .filter((place) => place.curated && place.coffeeNerd && place.coordinates)
    .map((place) => {
      const meters = getDistanceMeters(origin, place.coordinates);
      return {
        ...place,
        tag: place.category,
        distance: hasLivePosition
          ? meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`
          : place.distance || "Crete radar",
        reason: place.note,
        source: place.source || "Coffee radar seed",
        score: Math.max(1, meters * getTasteBoost(place)),
      };
    })
    .sort((a, b) => a.score - b.score);
}

function getTasteBoost(place = {}) {
  const key = `${place.category || ""} ${place.note || ""} ${place.title || ""}`.toLowerCase();
  if (state.travelFocus === "coffee") {
    if (place.coffeeNerd || key.includes("roaster") || key.includes("specialty")) return 0.02;
    if (key.includes("coffee") || key.includes("cafe")) return 0.2;
  }
  if (state.travelFocus === "shopper" && (key.includes("shop") || key.includes("market") || key.includes("deli") || key.includes("bakery"))) return 0.18;
  if (state.travelFocus === "arty" && (key.includes("museum") || key.includes("gallery") || key.includes("archaeolog") || key.includes("art") || key.includes("culture"))) return 0.16;
  if (state.travelFocus === "beachy" && (key.includes("beach") || key.includes("harbor") || key.includes("sea") || key.includes("swim"))) return 0.16;
  if (key.includes("coffee") || key.includes("cafe")) return 0.55;
  return 1;
}

function mergeNearbyPlaces(places) {
  const seen = new Set();
  return places.filter((place) => {
    const key = place.id || `${place.title}-${place.coordinates?.join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildUserPlaceFromForm(formData, existing = {}) {
  const category = normalizeUserCategory(formData.get("category"));
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const coordinates = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : state.locationContext.coordinates || HERAKLION_CENTER;
  const uploadedImage = await readUploadedImage(formData.get("imageFile"));
  return normalizeUserPlace({
    id: existing.id || `user-${Date.now()}`,
    title: String(formData.get("title") || existing.title || "Untitled place").trim(),
    category,
    tag: category,
    description: String(formData.get("description") || "").trim(),
    reason: String(formData.get("description") || "").trim(),
    source: "Your JSON place",
    coordinates,
    imageUrl: uploadedImage || String(formData.get("imageUrl") || existing.imageUrl || "").trim(),
    color: getCategoryColor(category),
    saved: category === "Saved",
    updatedAt: new Date().toISOString(),
  });
}

function buildUserPlaceFromNearby(place) {
  const category = normalizeUserCategory(place.category || place.tag);
  return normalizeUserPlace({
    id: place.id,
    title: place.title,
    category,
    tag: category,
    description: place.description || place.reason || "",
    reason: place.description || place.reason || "",
    source: "Your JSON place",
    coordinates: place.coordinates || HERAKLION_CENTER,
    imageUrl: getPlaceImageUrl(place),
    color: getCategoryColor(category),
    saved: Boolean(place.saved || state.savedIds.has(place.id)),
    updatedAt: new Date().toISOString(),
  });
}

function readUploadedImage(file) {
  if (!(file instanceof File) || !file.size || !file.type.startsWith("image/")) return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => resolve(""));
    reader.readAsDataURL(file);
  });
}

function isDataImage(value = "") {
  return /^data:image\//i.test(String(value));
}

function normalizeUserCategory(category) {
  const value = String(category || "").toLowerCase();
  if (value.includes("coffee") || value.includes("cafe")) return "Coffee";
  if (value.includes("restaurant") || value.includes("food")) return "Restaurant";
  if (value.includes("saved")) return "Saved";
  return "Walk";
}

function getCategoryColor(category = "") {
  const key = category.toLowerCase();
  if (key.includes("coffee")) return "sun";
  if (key.includes("restaurant")) return "clay";
  if (key.includes("saved")) return "red";
  return "green";
}

function getPlaceImageUrl(place = {}) {
  const cached = state.placeImageCache[getPlaceImageKey(place)];
  return place.imageUrl || cached?.hero?.thumbnailUrl || cached?.hero?.imageUrl || cached?.url || "";
}

function getOsmImageUrl(tags = {}) {
  if (tags.image && /^https?:\/\//i.test(tags.image)) return tags.image;
  const commons = tags.wikimedia_commons || tags.image || "";
  const fileName = commons.replace(/^File:/i, "").trim();
  return fileName ? getCommonsImageUrl(fileName) : "";
}

function getCommonsImageUrl(fileName) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

function initPlaceImageLookup() {
  if (!["home", "live", "search"].includes(state.activeView)) return;
  if (imageLookupInFlight) return;

  const places = getPlacesNeedingImages();
  if (!places.length) return;

  imageLookupInFlight = true;
  fetchRelevantPlaceImages(places)
    .catch(() => {})
    .finally(() => {
      imageLookupInFlight = false;
    });
}

function getPlacesNeedingImages() {
  const candidates = mergeNearbyPlaces([...getNearYouNowPlaces(), ...state.places.filter(isInCurrentDestination), ...state.userPlaces]);
  return candidates
    .filter((place) => place?.title && !place.imageUrl && !state.placeImageCache[getPlaceImageKey(place)])
    .slice(0, 8);
}

async function fetchRelevantPlaceImages(places) {
  let changed = false;
  for (const place of places) {
    const media = await enrichPlaceMedia(place);
    state.placeImageCache[getPlaceImageKey(place)] = media;
    changed = true;
  }

  if (changed) {
    writeCachedPlaceImages(state.placeImageCache);
    render();
  }
}

async function findCommonsImageForPlace(place) {
  const media = await enrichPlaceMedia(place);
  return media.hero?.imageUrl ? {
    url: media.hero.thumbnailUrl || media.hero.imageUrl,
    source: media.hero.attributionText || media.hero.provider,
  } : null;
}

function buildImageQueries(place) {
  const title = String(place.canonicalName || place.identity?.canonicalName || place.title || "").trim();
  const area = String(place.area || "").trim();
  const aliases = Array.isArray(place.aliases) ? place.aliases : place.identity?.aliases || [];
  return [
    [title, "Heraklion", "Crete"].filter(Boolean).join(" "),
    [title, area, "Heraklion"].filter(Boolean).join(" "),
    ...aliases.slice(0, 3).map((alias) => [alias, area || "Crete"].filter(Boolean).join(" ")),
    title,
  ].filter(Boolean).filter((query, index, all) => all.indexOf(query) === index);
}

async function searchCommonsImage(query, place) {
  const url = new URL(COMMONS_API);
  url.searchParams.set("origin", "*");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "6");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime");
  url.searchParams.set("iiurlwidth", "900");

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  const match = pages.find((page) => {
    const info = page.imageinfo?.[0];
    return info?.thumburl && /^image\//.test(info.mime || "") && isRelevantCommonsImage(page, place);
  });
  const info = match?.imageinfo?.[0];
  return info?.thumburl ? { url: info.thumburl, source: "Wikimedia Commons" } : null;
}

function isRelevantCommonsImage(page, place = {}) {
  const haystack = normalizeImageText([page.title, page.imageinfo?.[0]?.descriptionurl].filter(Boolean).join(" "));
  const titleTokens = getImageTokens(place.title);
  const areaTokens = getImageTokens(place.area);
  if (!titleTokens.length) return false;

  const matchedTitleTokens = titleTokens.filter((token) => haystack.includes(token));
  if (matchedTitleTokens.length >= Math.min(2, titleTokens.length)) return true;
  return titleTokens.some((token) => haystack.includes(token)) && areaTokens.some((token) => haystack.includes(token));
}

function getImageTokens(value = "") {
  return normalizeImageText(value)
    .split(" ")
    .filter((token) => token.length > 3 && !["the", "and", "with", "near", "city", "crete", "heraklion"].includes(token));
}

function normalizeImageText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPlaceImageKey(place = {}) {
  return String(place.id || place.title || "").toLowerCase().trim();
}

function renderNearbyDiscoveryStatus() {
  const updated = state.nearbyDiscovery.updatedAt ? new Date(state.nearbyDiscovery.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  if (state.nearbyDiscovery.status === "loading") return "Scanning OpenStreetMap for top traveler places nearby.";
  if (state.nearbyDiscovery.error) return state.nearbyDiscovery.error;
  if (state.nearbyDiscovery.places.length) return `Showing weather-aware cafes, restaurants, sights, viewpoints, museums, utilities, and notable stops${updated ? ` · ${updated}` : ""}.`;
  if (state.locationContext.coordinates) return "Ready to scan real nearby cafes, restaurants, sights, viewpoints, toilets, drinking water, museums, and notable stops.";
  return "Allow location access to scan real nearby traveler places.";
}

function initWeatherContext() {
  if (!["home", "live"].includes(state.activeView)) return;
  if (!state.locationContext.coordinates) return;
  if (["loading", "ready", "error"].includes(state.weatherContext.status)) return;

  const cached = readCachedWeatherContext();
  if (cached) {
    state.weatherContext = { ...state.weatherContext, ...cached, status: "ready", error: "" };
    render();
    return;
  }

  fetchWeatherContext();
}

async function fetchWeatherContext({ force = false } = {}) {
  if (!state.locationContext.coordinates) {
    state.weatherContext = {
      ...state.weatherContext,
      status: "idle",
      error: "Location is needed before checking weather.",
    };
    render();
    return;
  }

  if (!force) {
    const cached = readCachedWeatherContext();
    if (cached) {
      state.weatherContext = { ...state.weatherContext, ...cached, status: "ready", error: "" };
      render();
      return;
    }
  }

  state.weatherContext = { ...state.weatherContext, status: "loading", error: "" };
  render();

  try {
    const [lat, lng] = state.locationContext.coordinates;
    const url = new URL(OPEN_METEO_API);
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lng);
    url.searchParams.set("current", "temperature_2m,precipitation,rain,weather_code,wind_speed_10m,is_day");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
    url.searchParams.set("forecast_days", "4");

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Weather unavailable");

    const data = await response.json();
    const nextWeather = {
      status: "ready",
      updatedAt: new Date().toISOString(),
      error: "",
      current: normalizeWeatherData(data.current || {}, data.daily || {}),
    };
    state.weatherContext = nextWeather;
    writeCachedWeatherContext(nextWeather);
    if (state.nearbyDiscovery.status === "ready") {
      state.nearbyDiscovery = {
        status: "idle",
        updatedAt: null,
        error: "",
        places: [],
      };
    }
  } catch {
    state.weatherContext = {
      ...state.weatherContext,
      status: "error",
      error: "Weather hook could not be reached. Nearby places still work.",
    };
  } finally {
    render();
  }
}

function initNearbyDiscovery() {
  if (!["home", "live"].includes(state.activeView)) return;
  if (!state.locationContext.coordinates) return;
  if (["loading", "ready", "error"].includes(state.nearbyDiscovery.status)) return;

  const cached = readCachedNearbyDiscoveries();
  if (cached) {
    state.nearbyDiscovery = { ...state.nearbyDiscovery, ...cached, status: "ready", error: "" };
    render();
    return;
  }

  fetchNearbyDiscoveries();
}

async function fetchNearbyDiscoveries({ force = false } = {}) {
  if (!state.locationContext.coordinates) {
    state.nearbyDiscovery = {
      ...state.nearbyDiscovery,
      status: "idle",
      error: "Location is needed before scanning nearby places.",
    };
    render();
    return;
  }

  if (!force) {
    const cached = readCachedNearbyDiscoveries();
    if (cached) {
      state.nearbyDiscovery = { ...state.nearbyDiscovery, ...cached, status: "ready", error: "" };
      render();
      return;
    }
  }

  state.nearbyDiscovery = { ...state.nearbyDiscovery, status: "loading", error: "" };
  render();

  try {
    const [lat, lng] = state.locationContext.coordinates;
    const query = buildNearbyOverpassQuery(lat, lng);
    const response = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8", Accept: "application/json" },
      body: query,
    });
    if (!response.ok) throw new Error("Nearby scan failed");

    const data = await response.json();
    const places = normalizeNearbyElements(data.elements || [], state.locationContext.coordinates);
    const nextNearby = {
      status: "ready",
      updatedAt: new Date().toISOString(),
      error: places.length ? "" : "No strong nearby traveler places found yet. Try a wider area later.",
      places,
    };
    state.nearbyDiscovery = nextNearby;
    writeCachedNearbyDiscoveries(nextNearby);
  } catch {
    state.nearbyDiscovery = {
      ...state.nearbyDiscovery,
      status: "error",
      error: "Nearby scan could not reach OpenStreetMap right now. Showing saved/demo places.",
    };
  } finally {
    render();
  }
}

function buildNearbyOverpassQuery(lat, lng) {
  const radius = 1500;
  return `
    [out:json][timeout:12];
    (
      node(around:${radius},${lat},${lng})["tourism"~"attraction|museum|viewpoint|gallery|artwork|zoo|aquarium"];
      way(around:${radius},${lat},${lng})["tourism"~"attraction|museum|viewpoint|gallery|artwork|zoo|aquarium"];
      node(around:${radius},${lat},${lng})["amenity"~"cafe|restaurant|bar|pub|ice_cream|food_court|marketplace"];
      way(around:${radius},${lat},${lng})["amenity"~"cafe|restaurant|bar|pub|ice_cream|food_court|marketplace"];
      node(around:${radius},${lat},${lng})["craft"="roastery"];
      way(around:${radius},${lat},${lng})["craft"="roastery"];
      node(around:${radius},${lat},${lng})["roastery"="yes"];
      way(around:${radius},${lat},${lng})["roastery"="yes"];
      node(around:${radius},${lat},${lng})["coffee"="specialty"];
      way(around:${radius},${lat},${lng})["coffee"="specialty"];
      node(around:${radius},${lat},${lng})["amenity"~"toilets|drinking_water"];
      way(around:${radius},${lat},${lng})["amenity"~"toilets|drinking_water"];
      node(around:${radius},${lat},${lng})["historic"];
      way(around:${radius},${lat},${lng})["historic"];
      node(around:${radius},${lat},${lng})["leisure"~"park|garden"];
      way(around:${radius},${lat},${lng})["leisure"~"park|garden"];
      node(around:${radius},${lat},${lng})["shop"~"bakery|coffee|chocolate|books|confectionery|deli"];
      way(around:${radius},${lat},${lng})["shop"~"bakery|coffee|chocolate|books|confectionery|deli"];
      node(around:${radius},${lat},${lng})["wheelchair"];
      way(around:${radius},${lat},${lng})["wheelchair"];
    );
    out center tags 80;
  `;
}

function normalizeNearbyElements(elements, origin) {
  const seen = new Set();
  return elements
    .map((element) => {
      const tags = element.tags || {};
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      const osmPlace = normalizeOsmElement(element, origin, {
        classify: classifyNearbyPlace,
        distance: getDistanceMeters,
        imageUrl: getOsmImageUrl,
      });
      if (!osmPlace || !lat || !lng) return null;

      const key = `${osmPlace.title.toLowerCase()}-${Math.round(lat * 10000)}-${Math.round(lng * 10000)}`;
      if (seen.has(key)) return null;
      seen.add(key);

      const meters = osmPlace.distanceMeters ?? getDistanceMeters(origin, [lat, lng]);
      const category = osmPlace.category;
      const score = scoreNearbyPlace(tags, meters);
      return {
        ...osmPlace,
        category,
        tag: category,
        distance: meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`,
        reason: buildNearbyReason(tags, category),
        source: buildNearbySource(tags),
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .slice(0, 12);
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

function scoreNearbyPlace(tags, meters) {
  const categoryBoost = tags.tourism || tags.historic ? 0.78 : 1;
  const foodBoost = ["cafe", "restaurant"].includes(tags.amenity) ? 0.86 : 1;
  const coffeeNerdBoost = tags.craft === "roastery" || tags.roastery === "yes" || tags.coffee === "specialty" ? 0.42 : 1;
  const utilityBoost = ["toilets", "drinking_water"].includes(tags.amenity) ? 0.82 : 1;
  const namedBoost = tags.wikidata || tags.website ? 0.9 : 1;
  const weatherBoost = getWeatherPlaceBoost(tags);
  return meters * categoryBoost * foodBoost * coffeeNerdBoost * utilityBoost * namedBoost * weatherBoost;
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

function normalizeWeatherData(current, daily = {}) {
  const code = Number(current.weather_code ?? 0);
  return {
    temperature: Number(current.temperature_2m ?? 0),
    precipitation: Number(current.precipitation ?? 0),
    rain: Number(current.rain ?? 0),
    windSpeed: Number(current.wind_speed_10m ?? 0),
    weatherCode: code,
    isDay: current.is_day !== 0,
    label: getWeatherLabel(code),
    forecast: normalizeDailyForecast(daily),
  };
}

function normalizeDailyForecast(daily) {
  const times = daily.time || [];
  const max = daily.temperature_2m_max || [];
  const codes = daily.weather_code || [];
  return times.slice(0, 4).map((time, index) => ({
    day: index === 0 ? "Today" : new Intl.DateTimeFormat([], { weekday: "short" }).format(new Date(`${time}T12:00:00`)),
    temp: `${Math.round(Number(max[index] ?? 0))}°`,
    label: getWeatherLabel(Number(codes[index] ?? 0)),
  }));
}

function getWeatherLabel(code) {
  if ([0, 1].includes(code)) return "Clear";
  if ([2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 95) return "Storm";
  return "Mixed";
}

function getWeatherPlaceBoost(tags) {
  const weather = state.weatherContext.current;
  if (!weather) return 1;

  const isRainy = weather.rain > 0 || weather.precipitation > 0 || ["Rain", "Storm", "Snow"].includes(weather.label);
  const isHot = weather.temperature >= 28;
  const isOutdoor = tags.tourism === "viewpoint" || ["park", "garden"].includes(tags.leisure) || tags.historic;
  const isIndoor = ["cafe", "restaurant", "bar", "pub", "food_court"].includes(tags.amenity) || ["museum", "gallery"].includes(tags.tourism) || tags.shop;
  const isUtility = ["toilets", "drinking_water"].includes(tags.amenity);

  if (isRainy && isIndoor) return 0.72;
  if (isRainy && isOutdoor) return 1.28;
  if (isHot && (isIndoor || isUtility)) return 0.76;
  if (isHot && isOutdoor) return 1.12;
  return 1;
}

function getWeatherRankingHint() {
  const weather = state.weatherContext.current;
  if (!weather) return "Weather will adjust nearby recommendations once available.";
  if (weather.rain > 0 || weather.precipitation > 0 || ["Rain", "Storm", "Snow"].includes(weather.label)) {
    return "Rain-aware ranking favors cafes, museums, shops, and indoor food stops.";
  }
  if (weather.temperature >= 28) {
    return "Heat-aware ranking favors water, shade, cafes, museums, and shorter walks.";
  }
  return "Weather looks comfortable, so viewpoints, parks, sights, cafes, and food stops can all rank well.";
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

function syncLiveClock() {
  updateLiveClock();
  if (liveClockTimer) return;

  liveClockTimer = window.setInterval(() => {
    updateLiveClock();
  }, 1000);
}

function updateLiveClock() {
  document.querySelectorAll("[data-live-clock]").forEach((node) => {
    node.textContent = formatLiveDateTime();
  });
}

function formatLiveDateTime() {
  return new Intl.DateTimeFormat([], {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function initLiveDeviceHooks() {
  if (liveDeviceHooksReady) return;
  liveDeviceHooksReady = true;

  const updateConnection = () => {
    state.live.connection = navigator.onLine ? "Online" : "Offline";
    updateLiveMeter();
  };

  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
  updateConnection();

  if (!navigator.getBattery) return;

  navigator.getBattery().then((battery) => {
    const updateBattery = () => {
      state.live.battery = `${Math.round(battery.level * 100)}%`;
      updateLiveMeter();
    };

    battery.addEventListener("levelchange", updateBattery);
    battery.addEventListener("chargingchange", updateBattery);
    updateBattery();
  }).catch(() => {
    // Battery status is intentionally unavailable in some browsers.
  });
}

function updateLiveMeter() {
  const meter = document.querySelector(".live-meter");
  if (!meter) return;

  const value = meter.querySelector("span");
  const label = meter.querySelector("small");
  if (value) value.textContent = state.live.battery;
  if (label) label.textContent = `${state.live.connection} · pack ready`;
}

function initAutomaticPositioning() {
  if (!state.locationContext.automatic || state.locationContext.attempted) return;
  if (!["live", "map"].includes(state.activeView)) return;

  const cached = readCachedLocation();
  if (cached) {
    applyLocationContext(cached, { fromCache: true });
    state.locationContext.attempted = true;
    render();
    return;
  }

  requestCurrentPosition();
}

function initPlaceIntelligence() {
  if (state.activeView !== "live") return;
  if (!state.locationContext.area) return;
  if (["loading", "ready", "error"].includes(state.placeIntel.status)) return;

  const cached = readCachedPlaceIntel();
  if (cached) {
    state.placeIntel = {
      ...state.placeIntel,
      ...cached,
      status: "ready",
      error: "",
    };
    render();
    return;
  }

  fetchPlaceIntelligence();
}

async function fetchPlaceIntelligence({ force = false } = {}) {
  if (!state.locationContext.area) {
    state.placeIntel = {
      ...state.placeIntel,
      status: "idle",
      error: "Area context is needed before web hooks can run.",
    };
    render();
    return;
  }

  if (!force) {
    const cached = readCachedPlaceIntel();
    if (cached) {
      state.placeIntel = { ...state.placeIntel, ...cached, status: "ready", error: "" };
      render();
      return;
    }
  }

  state.placeIntel = { ...state.placeIntel, status: "loading", error: "" };
  render();

  const tabs = { ...state.placeIntel.tabs };
  const tabIds = Object.keys(tabs);

  try {
    const results = await Promise.all(
      tabIds.map(async (tab) => {
        try {
          return await fetchIntelForTab(tab);
        } catch {
          return [tab, createIntelFallback(tab)];
        }
      })
    );
    results.forEach(([tab, item]) => {
      tabs[tab] = item;
    });

    const nextIntel = {
      activeTab: state.placeIntel.activeTab,
      status: "ready",
      updatedAt: new Date().toISOString(),
      error: "",
      tabs,
    };
    state.placeIntel = nextIntel;
    writeCachedPlaceIntel(nextIntel);
  } catch {
    state.placeIntel = {
      ...state.placeIntel,
      status: "error",
      error: "Public data hooks could not be reached yet.",
    };
  } finally {
    render();
  }
}

function createIntelFallback(tab) {
  const query = getIntelQuery(tab) || tab;
  return {
    source: "Local fallback",
    title: query,
    summary: `Public ${tab} data could not be reached right now. The tab is ready and can be refreshed when the network settles.`,
    facts: ["No live GET retry", "Cached when available", "Manual refresh"],
    url: "",
  };
}

async function fetchIntelForTab(tab) {
  const query = getIntelQuery(tab);
  if (!query) {
    return [
      tab,
      {
        source: "Trip context",
        title: tab === "island" ? "No island detected" : "Waiting for context",
        summary: tab === "island" ? "The current OpenStreetMap address did not include an island field. This tab is ready for island-aware trips like Crete." : "No query available yet.",
        facts: ["Context hook"],
        url: "",
      },
    ];
  }

  if (tab === "country") {
    const country = await fetchCountryIntel(query);
    if (country) return [tab, country];
  }

  return [tab, await fetchWikipediaIntel(query, tab)];
}

function getIntelQuery(tab) {
  const area = state.locationContext.area;
  if (!area) return "";

  return {
    place: area.canonicalName || getCurrentPlaceName(area),
    city: area.city || area.locality,
    region: area.region,
    island: area.island,
    country: area.country,
  }[tab] || "";
}

function getCurrentPlaceName(area) {
  return (area.displayName || "").split(",")[0]?.trim() || area.city || area.region || area.country || "";
}

async function fetchWikipediaIntel(query, tab) {
  const title = await findWikipediaTitle(query);
  const response = await fetch(`${WIKIPEDIA_API}${encodeURIComponent(title || query)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Wikipedia summary unavailable");

  const data = await response.json();
  return {
    source: "Wikipedia",
    title: data.title || query,
    summary: data.extract || `No summary was available for ${query}.`,
    facts: [
      `${tab.charAt(0).toUpperCase() + tab.slice(1)} layer`,
      data.type || "summary",
      data.lang ? data.lang.toUpperCase() : "EN",
    ],
    url: data.content_urls?.desktop?.page || "",
  };
}

async function findWikipediaTitle(query) {
  const url = new URL(WIKIPEDIA_SEARCH_API);
  url.searchParams.set("origin", "*");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("format", "json");
  url.searchParams.set("srlimit", "1");
  url.searchParams.set("srsearch", query);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return query;

  const data = await response.json();
  return data.query?.search?.[0]?.title || query;
}

async function fetchCountryIntel(countryName) {
  const response = await fetch(`${REST_COUNTRIES_API}${encodeURIComponent(countryName)}?fullText=true`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;

  const [country] = await response.json();
  if (!country) return null;

  const currencies = country.currencies ? Object.values(country.currencies).map((currency) => currency.name).join(", ") : "Unknown currency";
  const languages = country.languages ? Object.values(country.languages).slice(0, 3).join(", ") : "Unknown languages";
  return {
    source: "REST Countries",
    title: country.name?.common || countryName,
    summary: `${country.name?.common || countryName} has ${country.capital?.[0] || "no listed capital"} as its capital and a population of ${country.population?.toLocaleString?.() || "unknown"}.`,
    facts: [currencies, languages, country.region || "Unknown region"],
    url: country.maps?.openStreetMaps || "",
  };
}

function requestCurrentPosition({ force = false } = {}) {
  if (!navigator.geolocation) {
    state.locationContext = {
      ...state.locationContext,
      attempted: true,
      status: "unavailable",
      error: "This browser does not expose location services.",
    };
    render();
    return;
  }

  state.locationContext = {
    ...state.locationContext,
    attempted: true,
    status: "locating",
    error: "",
  };
  render();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coordinates = [position.coords.latitude, position.coords.longitude];
      const cached = force ? null : readCachedLocation(coordinates);

      state.locationContext = {
        ...state.locationContext,
        coordinates,
        accuracy: position.coords.accuracy,
        updatedAt: new Date(position.timestamp || Date.now()).toISOString(),
        status: cached ? "located" : "collecting",
        error: "",
      };
      render();

      if (cached) {
        applyLocationContext({
          ...cached,
          coordinates,
          accuracy: position.coords.accuracy,
          updatedAt: state.locationContext.updatedAt,
        });
        render();
        return;
      }

      collectAreaData(coordinates, position.coords.accuracy);
    },
    (error) => {
      const denied = error.code === error.PERMISSION_DENIED;
      state.locationContext = {
        ...state.locationContext,
        status: denied ? "denied" : "unavailable",
        error: denied ? "Allow location access to position the trip map automatically." : "Could not get a reliable location fix.",
      };
      render();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000 * 60 * 5,
      timeout: 10000,
    }
  );
}

async function collectAreaData(coordinates, accuracy) {
  const cacheKey = getLocationCacheKey(coordinates);
  const url = new URL(NOMINATIM_REVERSE_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", coordinates[0]);
  url.searchParams.set("lon", coordinates[1]);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("zoom", "12");
  url.searchParams.set("accept-language", "en");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);

  try {
    url.searchParams.set("namedetails", "1");

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Reverse geocoding failed");

    const data = await response.json();
    const resolved = await resolveLocationContext({
      coordinates,
      accuracyMeters: accuracy,
      nominatimData: data,
    }).catch(() => null);
    const context = {
      cacheKey,
      coordinates,
      accuracy,
      updatedAt: new Date().toISOString(),
      area: normalizeAreaData(data, resolved),
      resolved,
    };
    writeCachedLocation(context);
    applyLocationContext(context);
  } catch (error) {
    state.locationContext = {
      ...state.locationContext,
      status: "located",
      error: "Position found, but area data could not be collected yet.",
    };
  } finally {
    window.clearTimeout(timeout);
    render();
  }
}

function normalizeAreaData(data, resolved = null) {
  const address = data.address || {};
  const city = inferCityName(address, data.display_name || "");
  const displayName = cleanDisplayName(data.display_name || "Unknown area");
  return {
    city,
    town: cleanAreaName(address.town || ""),
    village: cleanAreaName(address.village || ""),
    suburb: cleanAreaName(address.suburb || ""),
    county: cleanAreaName(address.county || ""),
    region: cleanAreaName(address.state || address.region || address.county || ""),
    island: cleanAreaName(address.island || address.archipelago || ""),
    country: cleanAreaName(address.country || ""),
    countryCode: address.country_code || "",
    locality: cleanAreaName(resolved?.locality || address.city || address.town || address.village || ""),
    neighbourhood: cleanAreaName(resolved?.neighbourhood || address.neighbourhood || address.suburb || ""),
    postcode: address.postcode || "",
    displayName,
    osmId: data.osm_id || "",
    osmType: cleanAreaType(data.type || data.category || data.osm_type || "OpenStreetMap area"),
    placeType: data.type || "",
    boundingBox: data.boundingbox || [],
    resolvedPlaceId: resolved?.place?.id || "",
    canonicalName: resolved?.place?.canonicalName || city,
    localName: resolved?.place?.localName || data.namedetails?.["name:el"] || "",
    aliases: resolved?.place?.aliases || [],
    wikidataId: resolved?.place?.wikidataId || data.extratags?.wikidata || "",
    wikipediaUrl: resolved?.place?.wikipediaUrl || "",
    matchLevel: resolved?.matchLevel || "",
    confidence: resolved?.confidence || 0,
  };
}

function cleanAreaName(value) {
  return String(value || "")
    .replace(/^municipal unit of\s+/i, "")
    .replace(/^municipality of\s+/i, "")
    .replace(/\bmunicipal unit\b/gi, "city")
    .replace(/\bmunicipality\b/gi, "city")
    .trim();
}

function inferCityName(address, displayName = "") {
  const direct = address.city || address.town || address.village || address.suburb || address.city_district;
  if (direct) return cleanAreaName(direct);

  const haystack = [address.municipality, address.county, address.state, displayName].filter(Boolean).join(", ");
  if (/heraklion|iraklio|ηράκλειο/i.test(haystack)) return "Heraklion";

  return cleanAreaName(address.county || address.region || address.state || address.municipality || "");
}

function cleanDisplayName(value) {
  return String(value || "")
    .split(",")
    .map((part) => cleanAreaName(part))
    .filter(Boolean)
    .join(", ");
}

function cleanAreaType(value) {
  const normalized = String(value || "");
  if (/municipal/i.test(normalized)) return "City";
  return normalized || "OpenStreetMap area";
}

function applyLocationContext(context, { fromCache = false } = {}) {
  const previousNearbyKey = getNearbyDiscoveryLocationKey();
  const previousWeatherKey = getWeatherLocationKey();
  state.locationContext = {
    ...state.locationContext,
    coordinates: context.coordinates,
    accuracy: context.accuracy,
    updatedAt: context.updatedAt,
    area: context.area,
    resolved: context.resolved || state.locationContext.resolved,
    status: "located",
    error: fromCache ? "" : state.locationContext.error,
  };

  const areaName = getTravelerCityName(context.area);
  if (areaName) state.live.location = areaName;
  state.live.lastSync = fromCache ? "cached" : "just now";

  if (previousNearbyKey && previousNearbyKey !== getNearbyDiscoveryLocationKey()) {
    state.nearbyDiscovery = {
      status: "idle",
      updatedAt: null,
      error: "",
      places: [],
    };
  }

  if (previousWeatherKey && previousWeatherKey !== getWeatherLocationKey()) {
    state.weatherContext = {
      status: "idle",
      updatedAt: null,
      error: "",
      current: null,
    };
  }
}

function readCachedLocation(coordinates) {
  try {
    const cached = JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY) || "null");
    if (!cached?.updatedAt || !cached?.cacheKey) return null;
    if (Date.now() - Date.parse(cached.updatedAt) > LOCATION_CACHE_MAX_AGE) return null;
    if (coordinates && cached.cacheKey !== getLocationCacheKey(coordinates)) return null;
    return sanitizeCachedLocation(cached);
  } catch {
    return null;
  }
}

function sanitizeCachedLocation(cached) {
  if (!cached?.area) return cached;
  return {
    ...cached,
      area: {
        ...cached.area,
        city: inferCityName(cached.area, cached.area.displayName || ""),
      region: cleanAreaName(cached.area.region || ""),
      country: cleanAreaName(cached.area.country || ""),
      displayName: cleanDisplayName(cached.area.displayName || ""),
        osmType: cleanAreaType(cached.area.osmType || ""),
        aliases: Array.isArray(cached.area.aliases) ? cached.area.aliases : [],
      },
    };
}

function writeCachedLocation(context) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(context));
  } catch {
    // Private browsing or storage quotas can block caching; live positioning still works.
  }
}

function readCachedPlaceIntel() {
  try {
    const cached = JSON.parse(localStorage.getItem(PLACE_INTEL_CACHE_KEY) || "null");
    if (!cached?.updatedAt || !cached?.tabs) return null;
    if (Date.now() - Date.parse(cached.updatedAt) > PLACE_INTEL_CACHE_MAX_AGE) return null;
    if (cached.areaKey !== getPlaceIntelAreaKey()) return null;
    return cached;
  } catch {
    return null;
  }
}

function readCachedNearbyDiscoveries() {
  try {
    const cached = JSON.parse(localStorage.getItem(NEARBY_DISCOVERY_CACHE_KEY) || "null");
    if (!cached?.updatedAt || !Array.isArray(cached.places)) return null;
    if (Date.now() - Date.parse(cached.updatedAt) > NEARBY_DISCOVERY_CACHE_MAX_AGE) return null;
    if (cached.locationKey !== getNearbyDiscoveryLocationKey()) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCachedNearbyDiscoveries(nearby) {
  try {
    localStorage.setItem(
      NEARBY_DISCOVERY_CACHE_KEY,
      JSON.stringify({
        ...nearby,
        locationKey: getNearbyDiscoveryLocationKey(),
      })
    );
  } catch {
    // Nearby scan still works for the current session if storage is unavailable.
  }
}

function readStoredUserPlaces() {
  try {
    const places = JSON.parse(localStorage.getItem(USER_PLACES_STORAGE_KEY) || "[]");
    if (!Array.isArray(places)) return [];
    return places
      .map((place) => {
        const category = normalizeUserCategory(place.category);
        return normalizeUserPlace({
          ...place,
          title: String(place.title || "").trim(),
          category,
          tag: category,
          description: String(place.description || place.reason || "").trim(),
          reason: String(place.description || place.reason || "").trim(),
          source: "Your JSON place",
          coordinates: Array.isArray(place.coordinates) && place.coordinates.length === 2 ? place.coordinates.map(Number) : null,
          imageUrl: String(place.imageUrl || "").trim(),
          color: getCategoryColor(category),
          saved: Boolean(place.saved || category === "Saved"),
        });
      })
      .filter((place) => place.id && place.title && place.coordinates?.every(Number.isFinite));
  } catch {
    return [];
  }
}

function writeStoredUserPlaces(places) {
  try {
    localStorage.setItem(
      USER_PLACES_STORAGE_KEY,
      JSON.stringify(
        places.map((place) => ({
          id: place.id,
          title: place.title,
          category: place.category,
          description: place.description || place.reason || "",
          imageUrl: place.imageUrl || "",
          coordinates: place.coordinates,
          saved: Boolean(place.saved),
          updatedAt: place.updatedAt,
        })),
        null,
        2
      )
    );
  } catch {
    // The in-memory list still updates if browser storage is unavailable.
  }
}

function readStoredHiddenNearbyIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(HIDDEN_NEARBY_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(ids) ? ids.filter(Boolean).map(String) : []);
  } catch {
    return new Set();
  }
}

function writeStoredHiddenNearbyIds(ids) {
  try {
    localStorage.setItem(HIDDEN_NEARBY_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Hidden nearby places still update for the current session if storage is unavailable.
  }
}

function readCachedPlaceImages() {
  try {
    const cached = JSON.parse(localStorage.getItem(PLACE_IMAGE_CACHE_KEY) || "{}");
    if (!cached || typeof cached !== "object") return {};
    return Object.fromEntries(
      Object.entries(cached).map(([key, value]) => [key, normalizeCachedMediaValue(value)]).filter(([, value]) => {
        if (!value?.updatedAt) return false;
        return Date.now() - Date.parse(value.updatedAt) <= PLACE_IMAGE_CACHE_MAX_AGE;
      })
    );
  } catch {
    return {};
  }
}

function normalizeCachedMediaValue(value = {}) {
  if (value.hero || value.gallery || value.providerStatus) {
    return {
      ...value,
      updatedAt: value.updatedAt || value.generatedAt || new Date().toISOString(),
    };
  }

  return {
    hero: {
      id: "legacy-image",
      provider: value.source?.includes("Wikimedia") ? "commons" : "external",
      imageUrl: value.url || "",
      thumbnailUrl: value.url || "",
      sourcePageUrl: value.url || "",
      attributionText: value.source || "External source",
      exactLocation: false,
      approximateLocation: true,
      illustrativeOnly: false,
      visualRole: "hero",
      finalScore: 50,
    },
    gallery: [],
    roles: {},
    attributions: [],
    coverage: { images: value.url ? "partial" : "fallback" },
    providerStatus: [],
    generatedAt: value.updatedAt || new Date().toISOString(),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

function writeCachedPlaceImages(images) {
  try {
    localStorage.setItem(PLACE_IMAGE_CACHE_KEY, JSON.stringify(images));
  } catch {
    // Images are progressive enhancement; the UI remains usable without this cache.
  }
}

function readCachedWeatherContext() {
  try {
    const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "null");
    if (!cached?.updatedAt || !cached?.current) return null;
    if (Date.now() - Date.parse(cached.updatedAt) > WEATHER_CACHE_MAX_AGE) return null;
    if (cached.locationKey !== getWeatherLocationKey()) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCachedWeatherContext(weather) {
  try {
    localStorage.setItem(
      WEATHER_CACHE_KEY,
      JSON.stringify({
        ...weather,
        locationKey: getWeatherLocationKey(),
      })
    );
  } catch {
    // Weather still works for the current session if storage is unavailable.
  }
}

function getWeatherLocationKey() {
  return state.locationContext.coordinates ? getLocationCacheKey(state.locationContext.coordinates) : "";
}

function getNearbyDiscoveryLocationKey() {
  return state.locationContext.coordinates ? getLocationCacheKey(state.locationContext.coordinates) : "";
}

function writeCachedPlaceIntel(intel) {
  try {
    localStorage.setItem(
      PLACE_INTEL_CACHE_KEY,
      JSON.stringify({
        ...intel,
        areaKey: getPlaceIntelAreaKey(),
      })
    );
  } catch {
    // Storage can be blocked; web hooks still update the current session.
  }
}

function getPlaceIntelAreaKey() {
  const area = state.locationContext.area;
  return [area?.city, area?.region, area?.island, area?.country].filter(Boolean).join("|").toLowerCase();
}

function getLocationCacheKey(coordinates) {
  return coordinates.map((value) => Number(value).toFixed(3)).join(",");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]
  ));
}

function scheduleLeafletMaps() {
  if (leafletInitFrame) window.cancelAnimationFrame(leafletInitFrame);
  leafletInitFrame = window.requestAnimationFrame(() => {
    leafletInitFrame = null;
    initLeafletMaps();
  });
}

function initLeafletMaps() {
  const userPlaces = getMapReadyUserPlaces();
  const selectedMapPlace = getSelectedMapPlace();
  const destinationPlaces = mergeNearbyPlaces([...state.places.filter(isInCurrentDestination), ...userPlaces, selectedMapPlace].filter(Boolean));
  const currentLocation = state.locationContext.coordinates || HERAKLION_CENTER;
  const currentLabel = state.locationContext.area?.city || state.live.location;
  const tripMap = document.querySelector("#trip-map");
  if (tripMap) {
    const selectedPlaces = destinationPlaces.filter((place) => state.savedIds.has(place.id) || place.id === state.selectedMapPlaceId);
    createLeafletMap(tripMap, destinationPlaces, {
      currentLocation,
      currentLabel,
      routePlaces: destinationPlaces.filter((place) => state.savedIds.has(place.id)),
      selectedPlaces,
      focusPlaceId: state.selectedMapPlaceId,
      zoom: 16,
    });
  }

  const homeMap = document.querySelector("#home-map");
  if (homeMap) {
    const homePlaces = getNearYouNowPlaces().slice(0, 8);
    createLeafletMap(homeMap, homePlaces, {
      currentLocation,
      currentLabel,
      selectedPlaces: homePlaces,
      zoom: 15,
      fitPadding: [14, 14],
      fitMaxZoom: 15,
    });
  }

  const liveMap = document.querySelector("#live-map");
  if (liveMap) {
    const nearbyPlaces = getClosestNearYouNowPlaces(5);
    createLeafletMap(liveMap, nearbyPlaces, {
      currentLocation,
      currentLabel,
      routePlaces: nearbyPlaces,
      selectedPlaces: nearbyPlaces,
      zoom: 17,
      fitPadding: [16, 16],
      fitMaxZoom: 16,
      focusCurrentLocation: true,
    });
  }
}

function isInCurrentDestination(place) {
  if (!place.coordinates) return false;
  if (!state.trip.destination.toLowerCase().includes("paris")) return true;

  const [lat, lng] = place.coordinates;
  return lat > 48 && lat < 49 && lng > 2 && lng < 3;
}

function getSelectedMapPlace() {
  if (!state.selectedMapPlaceId) return null;
  return [...getNearYouNowPlaces(), ...state.userPlaces, ...state.places].find((place) => place.id === state.selectedMapPlaceId) || null;
}

function createLeafletMap(container, places, options = {}, retry = true) {
  if (!container?.id || !document.body.contains(container)) return null;
  removeLeafletMap(container.id);
  resetLeafletContainer(container);

  let map;
  try {
    map = L.map(container, {
      scrollWheelZoom: false,
      zoomControl: true,
    });
  } catch (error) {
    if (retry && /already initialized/i.test(error.message || "")) {
      resetLeafletContainer(container);
      return createLeafletMap(container, places, options, false);
    }

    console.warn("Leaflet map could not be initialized", error);
    return null;
  }

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const validPlaces = places.filter((place) => place.coordinates);
  const selectedIds = new Set((options.selectedPlaces || validPlaces).map((place) => place.id));
  const bounds = [];
  let focusedMarker = null;
  let focusedPlace = null;
  let currentLocationMarker = null;

  validPlaces.forEach((place) => {
    const marker = L.circleMarker(place.coordinates, {
      radius: selectedIds.has(place.id) ? 9 : 7,
      color: "#fffdf8",
      weight: 3,
      fillColor: placeColors[place.color] || placeColors.red,
      fillOpacity: 0.94,
    }).addTo(map);

    const popupLines = [
      place.englishTitle && place.englishTitle !== place.title ? `English: ${escapeHtml(place.englishTitle)}` : "",
      [place.time, place.category].filter(Boolean).join(" · "),
      place.description || place.area || place.reason || "",
    ].filter(Boolean);

    marker.bindPopup(`
      <strong>${escapeHtml(place.title)}</strong><br/>
      ${popupLines.join("<br/>")}
    `);
    if (options.focusPlaceId && place.id === options.focusPlaceId) {
      focusedMarker = marker;
      focusedPlace = place;
    }
    bounds.push(place.coordinates);
  });

  if (options.currentLocation) {
    currentLocationMarker = L.circleMarker(options.currentLocation, {
      radius: 11,
      color: "#171817",
      weight: 3,
      fillColor: "#fffdf8",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`<strong>${escapeHtml(options.currentLabel || "Current location")}</strong>`);
    bounds.push(options.currentLocation);
  }

  if (bounds.length > 1) {
    map.fitBounds(bounds, {
      padding: options.fitPadding || [28, 28],
      maxZoom: options.fitMaxZoom || options.zoom || 13,
    });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], options.zoom || 13);
  } else {
    map.setView(HERAKLION_CENTER, options.zoom || 12);
  }

  if (focusedMarker && focusedPlace) {
    map.setView(focusedPlace.coordinates, options.zoom || 16);
    focusedMarker.openPopup();
  } else if (options.focusCurrentLocation && options.currentLocation) {
    map.setView(options.currentLocation, options.zoom || 17);
    currentLocationMarker?.openPopup();
  }

  leafletMaps.set(container.id, map);
  requestAnimationFrame(() => {
    if (document.body.contains(container) && leafletMaps.get(container.id) === map) {
      map.invalidateSize();
    }
  });

  return map;
}

function getMapReadyUserPlaces() {
  return state.userPlaces
    .filter((place) => Array.isArray(place.coordinates))
    .map((place) => ({
      ...place,
      reason: place.description || place.reason || `${place.category} added by you.`,
      source: "Your JSON place",
      tag: place.category,
      color: getCategoryColor(place.category),
    }));
}

function destroyLeafletMaps() {
  if (leafletInitFrame) {
    window.cancelAnimationFrame(leafletInitFrame);
    leafletInitFrame = null;
  }

  leafletMaps.forEach((map, id) => {
    removeLeafletMap(id, map);
  });
  leafletMaps.clear();
}

function removeLeafletMap(id, existingMap = leafletMaps.get(id)) {
  if (!existingMap) return;

  const container = existingMap.getContainer?.();
  try {
    existingMap.remove();
  } catch {
    // Leaflet can throw if a container was already detached by the SPA render.
  }

  if (container) resetLeafletContainer(container);
  leafletMaps.delete(id);
}

function resetLeafletContainer(container) {
  if (!container) return;

  delete container._leaflet_id;
  container.replaceChildren();
  container.classList.remove(
    "leaflet-container",
    "leaflet-touch",
    "leaflet-fade-anim",
    "leaflet-grab",
    "leaflet-touch-drag",
    "leaflet-touch-zoom"
  );
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Local preview can block service workers depending on origin.
    });
  });
}

if ("serviceWorker" in navigator && import.meta.env.DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if (window.caches) {
      caches.keys().then((keys) => {
        keys.filter((key) => key.startsWith("trip-")).forEach((key) => caches.delete(key));
      });
    }
  });
}

render();
