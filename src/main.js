import "./styles.css";

const state = {
  activeView: "home",
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
  ["guide", "Ask", "spark"],
  ["trip", "Trip", "calendar"],
  ["search", "Search", "search"],
  ["map", "Map", "map"],
  ["timeline", "Timeline", "timeline"],
  ["moments", "Moments", "camera"],
  ["profile", "Profile", "user"],
];

const dayLabels = ["Sat 3", "Sun 4", "Mon 5", "Tue 6", "Wed 7", "Thu 8", "Fri 9"];

const icons = {
  home: `<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.8 10.2v8.3h4.1v-5h4.2v5h4.1v-8.3"/>`,
  navigation: `<path d="M12 3.8 20 20.2l-8-3.6-8 3.6L12 3.8Z"/><path d="M12 3.8v12.8"/>`,
  spark: `<path d="M12 3.8 13.9 9l5.3 1.8-5.3 1.9L12 18l-1.9-5.3-5.3-1.9L10.1 9 12 3.8Z"/><path d="M18.5 15.5 20 19.2"/><path d="M5.5 15.5 4 19.2"/>`,
  calendar: `<path d="M5 6.5h14v13H5z"/><path d="M8 4v5"/><path d="M16 4v5"/><path d="M5 10h14"/><path d="M8.3 14h3.2"/><path d="M8.3 17h5.8"/>`,
  search: `<circle cx="10.5" cy="10.5" r="5.8"/><path d="m15 15 4.5 4.5"/>`,
  map: `<path d="m4.5 6.5 5-2 5 2 5-2v13l-5 2-5-2-5 2v-13Z"/><path d="M9.5 4.5v13"/><path d="M14.5 6.5v13"/>`,
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
      <nav class="nav-list">
        ${navItems
          .map(
            ([id, label, icon]) => `
              <button class="nav-item ${id === "search" ? "nav-search" : ""} ${state.activeView === id ? "is-active" : ""}" data-view="${id}">
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
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">${state.activeView === "guide" ? "MVP 3 · Intelligent guide" : state.tripMode ? "MVP 2 · Live journey" : "MVP 1 · Plan and remember"}</p>
        <h1>${state.trip.destination}</h1>
        <span>${state.trip.dates}</span>
      </div>
      <div class="top-actions">
        <button class="mode-button ${state.tripMode ? "is-active" : ""}" data-toggle-trip-mode>${state.tripMode ? "Trip Mode on" : "Trip Mode off"}</button>
        <button class="ghost-button" data-copy-share>Share link</button>
        <button class="primary-button" data-open-create>+ Create trip</button>
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
          <p class="eyebrow">Intelligent guide · Paris context graph</p>
          <h2>Ask the trip, not the internet.</h2>
          <p>TRIP combines destination guides, event calendars, live weather, saved places, and your travel style into cited, route-aware answers.</p>
        </div>
        <form class="guide-search" data-guide-search>
          <label>
            Conversational search
            <div>
              ${renderIcon("spark")}
              <input name="guideQuery" value="${state.guideQuery}" aria-label="Ask the intelligent guide"/>
            </div>
          </label>
          <button class="primary-button">Ask guide</button>
        </form>
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
        <h2>Weather-aware suggestions</h2>
        <div class="weather-advice">
          <article><strong>Rain 14:00</strong><span>Move Orsay to mid-afternoon and keep the cafe block.</span></article>
          <article><strong>Clear morning</strong><span>Prioritize Sainte-Chapelle before the clouds flatten the light.</span></article>
          <article><strong>Wind after 18:00</strong><span>Shorten river linger and add an indoor dinner buffer.</span></article>
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
  return `
    <div class="live-page">
      <section class="live-hero">
        <div>
          <p class="eyebrow">Trip Mode · ${state.live.lastSync}</p>
          <h2>${state.live.location}</h2>
          <p>Live routing, visit confirmations, saved places, media, and collaborators stay together while you move.</p>
        </div>
        <div class="live-meter" aria-label="Live trip status">
          <span>${state.live.battery}</span>
          <small>offline pack ready</small>
        </div>
      </section>
      <section class="live-map-card">
        ${renderLiveMap(nearbySaved)}
      </section>
      <section class="recommendation-panel">
        <div class="section-head"><h2>Near you now</h2><button data-refresh-location>Refresh</button></div>
        <div class="recommendation-list">
          ${state.recommendations.map(renderRecommendation).join("")}
        </div>
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
  if (query.includes("rain") || state.guideWeatherMode === "rain") {
    return "If rain starts after lunch, protect Cafe de Flore as your reset block, move Musee d'Orsay to 15:00, and keep Sainte-Chapelle in the morning while the light is better.";
  }
  if (query.includes("event") || query.includes("tonight")) {
    return "Tonight is better for museum hours than outdoor wandering. Orsay has the strongest event/calendar fit, and transit alerts make a compact Left Bank route safer.";
  }
  return "The best next move is a compact Left Bank loop: Sainte-Chapelle, Shakespeare and Company, Cafe de Flore, then Musee d'Orsay. It matches your saved cafes, photos, and lower backtracking route.";
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
  const places = state.filters === "All" ? state.places : state.places.filter((place) => place.category === state.filters);
  return `
    <div class="search-layout">
      <section class="search-panel">
        <label class="search-box">⌕ <input value="Best coffee shops and landmarks" aria-label="Search places"/></label>
        <div class="filter-row">
          ${categories.map((category) => `<button class="${state.filters === category ? "is-active" : ""}" data-filter="${category}">${category}</button>`).join("")}
        </div>
        <div class="result-list">
          ${places.map(renderPlaceResult).join("")}
        </div>
      </section>
      <section class="map-panel">
        ${renderMapCanvas()}
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
  return `
    <nav class="mobile-nav" aria-label="Mobile primary">
      ${navItems.map(([id, label, icon]) => `<button class="${id === "search" ? "nav-search" : ""} ${state.activeView === id ? "is-active" : ""}" data-view="${id}"><span class="nav-icon">${renderIcon(icon)}</span><em>${label}</em></button>`).join("")}
    </nav>
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
      <div>
        <h3>${place.title}</h3>
        <p>${place.area}</p>
        <span>★ ${place.rating} · ${place.category}</span>
        <small>${place.note}</small>
      </div>
      <button class="save-button ${saved ? "is-saved" : ""}" data-save="${place.id}">${saved ? "Saved" : "Save"}</button>
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
    <div class="live-map" aria-label="Live map with current location and saved places">
      <span class="route-line"></span>
      <span class="current-location" aria-label="Current location"></span>
      <span class="walk-bubble">${state.live.walkingTime}</span>
      ${places.map((place, index) => `<button class="map-pin pin-${index + 1}" data-place="${place.id}" aria-label="${place.title}">⌖</button>`).join("")}
    </div>
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
    <div class="map-canvas" aria-label="Stylized trip map">
      <span class="river"></span>
      <span class="road road-a"></span>
      <span class="road road-b"></span>
      <span class="district district-a">Montmartre</span>
      <span class="district district-b">Le Marais</span>
      <span class="district district-c">Saint-Germain</span>
      ${state.places.map((place, index) => `<button class="map-pin pin-${index + 1}" data-place="${place.id}" aria-label="${place.title}">⌖</button>`).join("")}
    </div>
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
