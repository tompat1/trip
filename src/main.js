import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
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

let leafletMaps = new Map();
let leafletInitFrame = null;
let liveClockTimer = null;
let liveDeviceHooksReady = false;
let isRendering = false;
let pendingRender = false;

const state = {
  activeView: "search",
  activeDay: 0,
  savedIds: new Set(["eiffel", "louvre", "calabra"]),
  confirmedIds: new Set(["louvre"]),
  filters: "All",
  shareEnabled: false,
  tripMode: true,
  offlineReady: true,
  mediaOrganized: false,
  storyDrafted: false,
  guideQuery: "What should I do if rain starts after lunch?",
  guideWeatherMode: "mixed",
  routeOptimized: false,
  acknowledgedAlerts: new Set(),
  locationContext: {
    automatic: true,
    attempted: false,
    status: "idle",
    coordinates: null,
    accuracy: null,
    updatedAt: null,
    area: null,
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
  trip: {
    destination: "Paris, France",
    dates: "3 - 9 Oct 2026",
    profile: "Thomas R.",
    handle: "@thomas",
    link: "trip.rynell.org/s/paris-october",
  },
  live: {
    location: "Saint-Germain-des-Pres",
    lastSync: "2 min ago",
    nextStop: "Sainte-Chapelle",
    walkingTime: "13 min",
    battery: "82%",
    connection: navigator.onLine ? "Online" : "Offline",
  },
  collaborators: [
    { initials: "TR", name: "Thomas", status: "Live" },
    { initials: "MR", name: "Maya", status: "Editing" },
    { initials: "AL", name: "Alex", status: "Offline" },
  ],
  places: [
    {
      id: "eiffel",
      title: "Eiffel Tower",
      area: "7th Arrondissement",
      category: "Landmark",
      rating: "4.7",
      note: "Golden hour views and a classic first-night anchor.",
      time: "18:00",
      day: 0,
      color: "blue",
      coordinates: [48.8584, 2.2945],
    },
    {
      id: "louvre",
      title: "Louvre Museum",
      area: "1st Arrondissement",
      category: "Museum",
      rating: "4.8",
      note: "Book the 11:30 timed slot and leave space for the Tuileries.",
      time: "11:30",
      day: 1,
      color: "green",
      coordinates: [48.8606, 2.3376],
    },
    {
      id: "calabra",
      title: "La Calabra",
      area: "Norrebro, Copenhagen",
      category: "Cafe",
      rating: "4.7",
      note: "Specialty coffee, quiet corners, excellent pastries.",
      time: "09:00",
      day: 2,
      color: "sun",
      coordinates: [55.6994, 12.5442],
    },
    {
      id: "marais",
      title: "Le Marais",
      area: "3rd Arrondissement",
      category: "Neighborhood",
      rating: "4.5",
      note: "Boutiques, galleries, falafel, and late afternoon wandering.",
      time: "14:00",
      day: 3,
      color: "red",
      coordinates: [48.8589, 2.3629],
    },
    {
      id: "chapelle",
      title: "Sainte-Chapelle",
      area: "Ile de la Cite",
      category: "Hidden gems",
      rating: "4.7",
      note: "Stained glass jewel. Pair with a Seine walk.",
      time: "10:00",
      day: 4,
      color: "clay",
      coordinates: [48.8554, 2.345],
    },
    {
      id: "orsay",
      title: "Musee d'Orsay",
      area: "Left Bank",
      category: "Museum",
      rating: "4.8",
      note: "Close to your current route, strongest if the weather turns.",
      time: "16:30",
      day: 4,
      color: "green",
      nearby: true,
      distance: "900 m",
      coordinates: [48.86, 2.3266],
    },
    {
      id: "shakespeare",
      title: "Shakespeare and Company",
      area: "Latin Quarter",
      category: "Hidden gems",
      rating: "4.6",
      note: "A compact bookshop stop before crossing back toward the Seine.",
      time: "15:10",
      day: 4,
      color: "sun",
      nearby: true,
      distance: "650 m",
      coordinates: [48.8526, 2.3471],
    },
  ],
  recommendations: [
    { title: "Cafe de Flore", reason: "8 min walk, saved cafe energy", tag: "Coffee", distance: "550 m" },
    { title: "Luxembourg Gardens", reason: "Good light now, quiet route", tag: "Reset", distance: "1.1 km" },
    { title: "Pont Neuf", reason: "On the way to the next stop", tag: "Photo", distance: "700 m" },
  ],
  mediaQueue: [
    { title: "34 photos", bucket: "Saint-Germain walk", status: "Matched to 14:00 route" },
    { title: "6 videos", bucket: "Seine crossings", status: "Ready for story draft" },
    { title: "3 notes", bucket: "Food finds", status: "Pinned to places" },
  ],
  guideSources: [
    { name: "Official Paris tourism", type: "Destination", freshness: "Updated weekly", status: "Connected" },
    { name: "Museum calendars", type: "Events", freshness: "Daily sync", status: "Connected" },
    { name: "Neighborhood food notes", type: "Personal", freshness: "From your saves", status: "Learning" },
    { name: "Weather and transit", type: "Live context", freshness: "15 min", status: "Connected" },
  ],
  guidePicks: [
    { title: "Musee d'Orsay", score: "96%", reason: "Strong fit for rain, art preference, and your Left Bank route.", source: "Museum calendars", weather: "rain" },
    { title: "Sainte-Chapelle", score: "91%", reason: "Best on a bright morning; move it before the cloud cover.", source: "Official Paris tourism", weather: "sun" },
    { title: "Cafe de Flore", score: "88%", reason: "Matches your coffee saves and sits between two planned stops.", source: "Neighborhood food notes", weather: "mixed" },
  ],
  guideSummaries: [
    {
      title: "Left Bank culture block",
      text: "Group Sainte-Chapelle, Shakespeare and Company, and Musee d'Orsay into one half-day route. The museum is the best weather fallback; the chapel is the best light-sensitive stop.",
      citations: ["Official Paris tourism", "Museum calendars"],
    },
    {
      title: "Personal fit",
      text: "Your saved cafes and photography moments suggest slower transitions, fewer landmark hops, and one protected reset window after lunch.",
      citations: ["Neighborhood food notes", "Trip memory"],
    },
  ],
  guideRoute: [
    { time: "10:00", stop: "Sainte-Chapelle", note: "Go early for glass and softer crowds." },
    { time: "11:20", stop: "Shakespeare and Company", note: "Short browse before the lunch window." },
    { time: "13:00", stop: "Cafe de Flore", note: "Protected reset block." },
    { time: "15:00", stop: "Musee d'Orsay", note: "Rain-safe afternoon anchor." },
  ],
  guideAlerts: [
    { id: "orsay-late", title: "Orsay late opening", detail: "Thursday evening hours make it a better backup if rain shifts later.", level: "Event" },
    { id: "metro-works", title: "Metro works near Concorde", detail: "Route around Line 1 after 18:00 and favor walking between river stops.", level: "Transit" },
    { id: "rain-window", title: "Rain window: 14:00-16:00", detail: "Move outdoor wandering earlier and keep museum time in the afternoon.", level: "Weather" },
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
    stack: ["Sanity or database", "Image CDN", "Mapbox or Google Maps", "Local transport sources", "Weather provider", "OpenAI API", "Backend API", "React / Next / mobile app"],
  },
  moments: [
    { title: "Montmartre rain walk", type: "Video", date: "4 Oct", length: "0:52", tone: "street" },
    { title: "Cafe de Flore table", type: "Photo", date: "4 Oct", length: "12 photos", tone: "coffee" },
    { title: "Seine at blue hour", type: "Moment", date: "5 Oct", length: "0:39", tone: "river" },
  ],
  notes: [
    "Pack the small umbrella and the 35mm lens.",
    "Try to keep one unscheduled block every day.",
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
    initPlaceIntelligence();
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
  const headerMeta = isLive
    ? `<span id="live-date-time" data-live-clock>${formatLiveDateTime()}</span>`
    : `<span>${state.trip.dates}</span>`;
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">${state.activeView === "guide" ? "MVP 3 · Intelligent guide" : state.tripMode ? "MVP 2 · Live journey" : "MVP 1 · Plan and remember"}</p>
        <h1>${state.trip.destination}</h1>
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
          ${["Official Paris tourism", "Museum calendars", "Weather and transit"].map((source) => `<span>${source}</span>`).join("")}
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
  const saved = state.places.filter((place) => state.savedIds.has(place.id));
  return `
    <div class="home-grid">
      <section class="hero-panel">
        <div class="passport-stamp">PAR / 2026</div>
        <h2>Every place becomes a story.</h2>
        <p>Plan the trail, save what matters, capture moments, and keep the whole journey in one warm, portable notebook.</p>
        <div class="hero-actions">
          <button class="primary-button" data-view="trip">Plan this trip</button>
          <button class="ghost-button" data-view="search">Find places</button>
        </div>
      </section>
      <section class="task-card">
        <h3>Continue planning</h3>
        ${["Choose experiences", "Invite travel companions", "Upload first memory", "Check visa requirements"]
          .map((task, index) => `<label><input type="checkbox" ${index < 2 ? "checked" : ""}/> ${task}<span>···</span></label>`)
          .join("")}
      </section>
      <section class="map-card">
        <div class="mini-map" aria-label="Saved places map preview">
          ${saved.map((place, index) => `<button class="pin pin-${index + 1}" data-view="map" aria-label="${place.title} on map"></button>`).join("")}
        </div>
      </section>
      <section class="weather-card">
        <h3>Paris weather</h3>
        <strong>18°C</strong>
        <span>Partly cloudy</span>
        <div class="weather-row"><span>Mon 21°</span><span>Tue 19°</span><span>Wed 20°</span></div>
      </section>
      <section class="live-summary-card">
        <div class="section-head"><h3>Trip Mode</h3><button data-view="live">Open live</button></div>
        <strong>${state.live.location}</strong>
        <p>${state.live.nextStop} is ${state.live.walkingTime} away. ${state.offlineReady ? "Itinerary and map are cached." : "Offline pack pending."}</p>
        <div class="status-row">
          <span>${state.confirmedIds.size} confirmed</span>
          <span>${state.collaborators.length} collaborators</span>
        </div>
      </section>
      <section class="ideas-card">
        <div class="section-head"><h3>Ideas for your trip</h3><button data-view="search">See all</button></div>
        <div class="place-strip">
          ${state.places.slice(0, 4).map(renderTinyPlace).join("")}
        </div>
      </section>
      <section class="quick-card">
        <h3>Quick capture</h3>
        <button data-action="photo">${renderIcon("photo")} Photo</button>
        <button data-action="video">${renderIcon("video")} Video</button>
        <button data-action="note">${renderIcon("note")} Note</button>
        <button data-action="moment">${renderIcon("moment")} Moment</button>
      </section>
    </div>
  `;
}

function renderLive() {
  const nearbySaved = state.places.filter((place) => state.savedIds.has(place.id) || place.nearby).slice(0, 5);
  const nearYouNow = getNearYouNowPlaces();
  const area = state.locationContext.area;
  return `
    <div class="live-page">
      <section class="live-hero">
        <div>
          <p class="eyebrow">Trip Mode · ${state.live.lastSync}</p>
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
      <section class="position-panel">
        ${renderLocationContext()}
      </section>
      <section class="recommendation-panel">
        <div class="section-head"><h2>Near you now</h2><button data-refresh-position>Locate</button></div>
        <p class="panel-note">${state.locationContext.coordinates ? "Sorted from your current position with saved places and route fit weighted higher." : "Allow location access to replace demo distances with real distance scoring."}</p>
        <div class="recommendation-list">
          ${nearYouNow.map(renderRecommendation).join("")}
        </div>
      </section>
      <section class="nearby-plan-panel">
        <h2>Nearby plan</h2>
        <div class="nearby-plan-list">
          ${renderNearYouNowPlan()}
        </div>
      </section>
      <section class="place-intel-panel">
        ${renderPlaceIntelTabs()}
      </section>
      <section class="confirmation-panel">
        <div class="section-head"><h2>Visit confirmation</h2><button data-confirm-next>Confirm next</button></div>
        <div class="visit-list">
          ${state.places.filter((place) => state.savedIds.has(place.id)).map(renderVisitRow).join("")}
        </div>
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
        <p>${state.storyDrafted ? "Draft: coffee in Saint-Germain, a quiet museum block, blue-hour Seine clips, and the bookshop stop near the Latin Quarter." : "Pulls confirmed visits, uploaded media, and notes into a private story draft at the end of the day."}</p>
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
    return "Tonight is better for museum hours than outdoor wandering. Orsay has the strongest event/calendar fit, and transit alerts make a compact Left Bank route safer.";
  }
  return "The best next move is a compact Left Bank loop: Sainte-Chapelle, Shakespeare and Company, Cafe de Flore, then Musee d'Orsay. It matches your saved cafes, photos, and lower backtracking route.";
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
    "Mapbox or Google Maps": "Coordinates, maps, routing, and driving context.",
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
          <label>Trip name<input value="Autumn in Paris" aria-label="Trip name"/></label>
          <label>Destination<input value="${state.trip.destination}" aria-label="Destination"/></label>
          <label>Start date<input type="date" value="2026-10-03" aria-label="Start date"/></label>
          <label>End date<input type="date" value="2026-10-09" aria-label="End date"/></label>
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
  return `
    <div class="map-page">
      <section class="map-panel large">
        ${renderMapCanvas()}
      </section>
      <aside class="saved-panel">
        <h2>Saved places</h2>
        ${state.places.filter((place) => state.savedIds.has(place.id)).map(renderSavedPlace).join("")}
        <div class="area-divider"></div>
        ${renderLocationContext()}
      </aside>
    </div>
  `;
}

function renderTimeline() {
  const items = [
    ["3 Oct", "Trip created", "Autumn in Paris became your planning home."],
    ["4 Oct", "3 places saved", "La Calabra, Louvre Museum, and Eiffel Tower added."],
    ["5 Oct", "First moment", "Seine at blue hour assembled from 9 clips."],
    ["6 Oct", "Share link prepared", "Public view can include itinerary and moments."],
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
          <input type="file" multiple accept="image/*,video/*" aria-label="Upload photos and videos"/>
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
  return `
    <div class="profile-page">
      <section class="profile-panel">
        <span class="avatar big">TR</span>
        <h2>${state.trip.profile}</h2>
        <p>${state.trip.handle} · Memory-first traveler</p>
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
      </section>
    </div>
  `;
}

function renderMobileNav() {
  const firstItems = navItems.slice(0, 2);
  const lastItems = navItems.slice(2);
  return `
    <div class="mobile-nav-shell">
      ${renderSearchAction("mobile-search")}
      <nav class="mobile-nav" aria-label="Mobile primary">
        ${firstItems.map(([id, label, icon]) => `<button class="${state.activeView === id ? "is-active" : ""}" data-view="${id}"><span class="nav-icon">${renderIcon(icon)}</span><em>${label}</em></button>`).join("")}
        <span class="mobile-nav-spacer" aria-hidden="true"></span>
        ${lastItems.map(([id, label, icon]) => `<button class="${state.activeView === id ? "is-active" : ""}" data-view="${id}"><span class="nav-icon">${renderIcon(icon)}</span><em>${label}</em></button>`).join("")}
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

function renderPlaceResult(place) {
  const saved = state.savedIds.has(place.id);
  return `
    <article class="place-result">
      <div class="place-photo ${place.color}"></div>
      <div class="place-copy">
        <h3>${place.title}</h3>
        <p>${place.area}</p>
        <span>★ ${place.rating} · ${place.category}</span>
        <small>${place.note}</small>
      </div>
      <div class="place-actions">
        <button class="save-button ${saved ? "is-saved" : ""}" data-save="${place.id}">${saved ? "Saved" : "Save"}</button>
        <button class="bookmark-button ${saved ? "is-saved" : ""}" data-save="${place.id}" aria-label="${saved ? "Remove" : "Save"} ${place.title}">${renderIcon("bookmark")}</button>
      </div>
    </article>
  `;
}

function renderRecommendation(item) {
  return `
    <article class="recommendation-card">
      <span>${item.tag}</span>
      <div>
        <h3>${item.title}</h3>
        <p>${item.reason}</p>
      </div>
      <strong>${item.distance}</strong>
    </article>
  `;
}

function renderNearYouNowPlan() {
  const steps = [
    ["1", "Locate", state.locationContext.coordinates ? "Using your current GPS fix." : "Ask for browser location permission."],
    ["2", "Score", "Rank places by walking distance, saved status, category fit, and itinerary timing."],
    ["3", "Enrich", "Pull city and region context from public web hooks, then keep results cached."],
    ["4", "Act", "Show the best next stop, backup indoor option, and one low-effort reset place."],
  ];

  return steps
    .map(
      ([number, title, text]) => `
        <article>
          <span>${number}</span>
          <div><strong>${title}</strong><p>${text}</p></div>
        </article>`
    )
    .join("");
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

function renderLocationContext() {
  const context = state.locationContext;
  const area = context.area;
  const updated = context.updatedAt ? new Date(context.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const city = escapeHtml(area?.city || "Unknown");
  const region = escapeHtml(area?.region || "Unknown");
  const country = escapeHtml(area?.country || "Unknown");
  const displayName = escapeHtml(area?.displayName || "");
  const osmType = escapeHtml(area?.osmType || "OpenStreetMap area");
  const osmId = escapeHtml(area?.osmId || "");
  const postcode = escapeHtml(area?.postcode || "");
  const status = {
    idle: "Waiting for position",
    locating: "Locating...",
    collecting: "Collecting area data...",
    located: "Position locked",
    unavailable: "Position unavailable",
    denied: "Permission needed",
  }[context.status] || "Waiting for position";

  return `
    <div class="location-context" aria-live="polite">
      <div class="section-head">
        <h2>Area context</h2>
        <button data-refresh-position>${context.status === "locating" || context.status === "collecting" ? "Working" : "Locate"}</button>
      </div>
      <p class="location-status">${status}${updated ? ` · ${updated}` : ""}</p>
      ${context.error ? `<p class="location-error">${escapeHtml(context.error)}</p>` : ""}
      ${
        area
          ? `
            <div class="area-grid">
              <span><strong>${city}</strong>city</span>
              <span><strong>${region}</strong>region</span>
              <span><strong>${country}</strong>country</span>
              <span><strong>${context.accuracy ? `${Math.round(context.accuracy)} m` : "Unknown"}</strong>accuracy</span>
            </div>
            <div class="area-detail-list">
              <span>${displayName}</span>
              <span>${osmType}${osmId ? ` · ${osmId}` : ""}</span>
              ${postcode ? `<span>Postcode ${postcode}</span>` : ""}
            </div>
          `
          : `<p class="empty-state">Open Live or Map and allow location access to collect city, region, and area data.</p>`
      }
    </div>
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

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters = button.dataset.filter;
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
      state.live.location = state.live.location === "Saint-Germain-des-Pres" ? "Latin Quarter" : "Saint-Germain-des-Pres";
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
        { time: "10:00", stop: "Sainte-Chapelle", note: "Best light first, before the chapel queue grows." },
        { time: "11:10", stop: "Shakespeare and Company", note: "Eight-minute walk with a short browse window." },
        { time: "12:30", stop: "Cafe de Flore", note: "Reset block before indoor museum time." },
        { time: "14:30", stop: "Musee d'Orsay", note: "Rain-safe anchor with no route backtracking." },
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
      state.moments.unshift({ title: `${label} captured in Paris`, type: label, date: "Today", length: type === "note" ? "note" : "0:15", tone: "street" });
      state.activeView = type === "note" ? "trip" : "moments";
      render();
    });
  });

  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (!fileInput.files.length) return;
      state.moments.unshift({ title: `${fileInput.files.length} uploads from today`, type: "Moment", date: "Today", length: "draft", tone: "river" });
      render();
    });
  }
}

function getNearYouNowPlaces() {
  const origin = state.locationContext.coordinates || [48.8539, 2.3332];
  const hasLivePosition = Boolean(state.locationContext.coordinates);
  const candidates = state.places
    .filter((place) => isInCurrentDestination(place) && place.coordinates)
    .map((place) => {
      const meters = getDistanceMeters(origin, place.coordinates);
      const savedBoost = state.savedIds.has(place.id) ? 0.82 : 1;
      const nearbyBoost = place.nearby ? 0.9 : 1;
      const score = meters * savedBoost * nearbyBoost;
      const distance = meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
      const tag = state.savedIds.has(place.id) ? "Saved" : place.category;
      const reason = hasLivePosition
        ? `${place.category} near your live position. ${state.confirmedIds.has(place.id) ? "Already visited; good reference point." : "Possible next stop."}`
        : `${place.category} using demo Saint-Germain position until GPS is allowed.`;

      return {
        ...place,
        score,
        title: place.title,
        reason,
        tag,
        distance,
      };
    });

  return candidates.sort((a, b) => a.score - b.score).slice(0, 4);
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
    second: "2-digit",
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
  if (state.placeIntel.status === "loading" || state.placeIntel.status === "ready") return;

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
    const results = await Promise.all(tabIds.map((tab) => fetchIntelForTab(tab)));
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
      status: "idle",
      error: "Public data hooks could not be reached yet.",
    };
  } finally {
    render();
  }
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
    place: getCurrentPlaceName(area),
    city: area.city,
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
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Reverse geocoding failed");

    const data = await response.json();
    const context = {
      cacheKey,
      coordinates,
      accuracy,
      updatedAt: new Date().toISOString(),
      area: normalizeAreaData(data),
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

function normalizeAreaData(data) {
  const address = data.address || {};
  return {
    city: address.city || address.town || address.village || address.municipality || address.suburb || address.city_district || address.county || "",
    region: address.state || address.region || address.county || "",
    island: address.island || address.archipelago || "",
    country: address.country || "",
    countryCode: address.country_code || "",
    postcode: address.postcode || "",
    displayName: data.display_name || "Unknown area",
    osmId: data.osm_id || "",
    osmType: data.osm_type || data.category || "OpenStreetMap area",
    placeType: data.type || "",
    boundingBox: data.boundingbox || [],
  };
}

function applyLocationContext(context, { fromCache = false } = {}) {
  state.locationContext = {
    ...state.locationContext,
    coordinates: context.coordinates,
    accuracy: context.accuracy,
    updatedAt: context.updatedAt,
    area: context.area,
    status: "located",
    error: fromCache ? "" : state.locationContext.error,
  };

  const areaName = context.area?.city || context.area?.region;
  if (areaName) state.live.location = areaName;
  state.live.lastSync = fromCache ? "cached" : "just now";
}

function readCachedLocation(coordinates) {
  try {
    const cached = JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY) || "null");
    if (!cached?.updatedAt || !cached?.cacheKey) return null;
    if (Date.now() - Date.parse(cached.updatedAt) > LOCATION_CACHE_MAX_AGE) return null;
    if (coordinates && cached.cacheKey !== getLocationCacheKey(coordinates)) return null;
    return cached;
  } catch {
    return null;
  }
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
  const destinationPlaces = state.places.filter(isInCurrentDestination);
  const currentLocation = state.locationContext.coordinates || [48.8539, 2.3332];
  const currentLabel = state.locationContext.area?.city || state.live.location;
  const tripMap = document.querySelector("#trip-map");
  if (tripMap) {
    createLeafletMap(tripMap, destinationPlaces, {
      currentLocation,
      currentLabel,
      routePlaces: destinationPlaces.filter((place) => state.savedIds.has(place.id)),
      selectedPlaces: destinationPlaces.filter((place) => state.savedIds.has(place.id)),
    });
  }

  const liveMap = document.querySelector("#live-map");
  if (liveMap) {
    const nearbyPlaces = destinationPlaces.filter((place) => state.savedIds.has(place.id) || place.nearby).slice(0, 5);
    createLeafletMap(liveMap, nearbyPlaces, {
      currentLocation,
      currentLabel,
      routePlaces: nearbyPlaces,
      selectedPlaces: nearbyPlaces,
      zoom: 14,
    });
  }
}

function isInCurrentDestination(place) {
  if (!place.coordinates) return false;
  if (!state.trip.destination.toLowerCase().includes("paris")) return true;

  const [lat, lng] = place.coordinates;
  return lat > 48 && lat < 49 && lng > 2 && lng < 3;
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

    throw error;
  }

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const validPlaces = places.filter((place) => place.coordinates);
  const selectedIds = new Set((options.selectedPlaces || validPlaces).map((place) => place.id));
  const bounds = [];

  validPlaces.forEach((place) => {
    const marker = L.circleMarker(place.coordinates, {
      radius: selectedIds.has(place.id) ? 9 : 7,
      color: "#fffdf8",
      weight: 3,
      fillColor: placeColors[place.color] || placeColors.red,
      fillOpacity: 0.94,
    }).addTo(map);

    marker.bindPopup(`
      <strong>${place.title}</strong><br/>
      ${place.time} · ${place.category}<br/>
      ${place.area}
    `);
    bounds.push(place.coordinates);
  });

  const routeCoordinates = (options.routePlaces || []).filter((place) => place.coordinates).map((place) => place.coordinates);
  if (routeCoordinates.length > 1) {
    L.polyline(routeCoordinates, {
      color: "#d94a3a",
      opacity: 0.74,
      weight: 4,
    }).addTo(map);
  }

  if (options.currentLocation) {
    L.circleMarker(options.currentLocation, {
      radius: 11,
      color: "#171817",
      weight: 3,
      fillColor: "#fffdf8",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`<strong>${options.currentLabel || "Current location"}</strong>`);
    bounds.push(options.currentLocation);
  }

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: options.zoom || 13 });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], options.zoom || 13);
  } else {
    map.setView([48.8566, 2.3522], options.zoom || 12);
  }

  leafletMaps.set(container.id, map);
  requestAnimationFrame(() => {
    if (document.body.contains(container) && leafletMaps.get(container.id) === map) {
      map.invalidateSize();
    }
  });

  return map;
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
