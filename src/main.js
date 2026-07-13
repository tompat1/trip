import "./styles.css";

const state = {
  activeView: "home",
  activeDay: 0,
  savedIds: new Set(["eiffel", "louvre", "calabra"]),
  filters: "All",
  shareEnabled: false,
  trip: {
    destination: "Paris, France",
    dates: "3 - 9 Oct 2026",
    profile: "Thomas R.",
    handle: "@thomas",
    link: "trip.rynell.org/s/paris-october",
  },
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
  ["home", "Home", "⌂"],
  ["trip", "Trip", "▣"],
  ["search", "Search", "⌕"],
  ["map", "Map", "◇"],
  ["timeline", "Timeline", "◷"],
  ["moments", "Moments", "◉"],
  ["profile", "Profile", "☉"],
];

const dayLabels = ["Sat 3", "Sun 4", "Mon 5", "Tue 6", "Wed 7", "Thu 8", "Fri 9"];

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
              <button class="nav-item ${state.activeView === id ? "is-active" : ""}" data-view="${id}">
                <span>${icon}</span><em>${label}</em>
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
        <p class="eyebrow">MVP 1 · Plan and remember</p>
        <h1>${state.trip.destination}</h1>
        <span>${state.trip.dates}</span>
      </div>
      <div class="top-actions">
        <button class="ghost-button" data-copy-share>Share link</button>
        <button class="primary-button" data-open-create>+ Create trip</button>
      </div>
    </header>
  `;
}

function renderView() {
  const views = {
    home: renderHome,
    trip: renderTrip,
    search: renderSearch,
    map: renderMap,
    timeline: renderTimeline,
    moments: renderMoments,
    profile: renderProfile,
  };
  return `<section class="view-panel">${views[state.activeView]()}</section>`;
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
      <section class="ideas-card">
        <div class="section-head"><h3>Ideas for your trip</h3><button data-view="search">See all</button></div>
        <div class="place-strip">
          ${state.places.slice(0, 4).map(renderTinyPlace).join("")}
        </div>
      </section>
      <section class="quick-card">
        <h3>Quick capture</h3>
        <button data-action="photo">▧ Photo</button>
        <button data-action="video">▻ Video</button>
        <button data-action="note">✎ Note</button>
        <button data-action="moment">◉ Moment</button>
      </section>
    </div>
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
      ${navItems.map(([id, label, icon]) => `<button class="${state.activeView === id ? "is-active" : ""}" data-view="${id}"><span>${icon}</span><em>${label}</em></button>`).join("")}
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

function renderSavedPlace(place) {
  return `
    <article class="saved-place">
      <div><h3>${place.title}</h3><p>${place.time} · ${place.category}</p></div>
      <button class="icon-button" data-save="${place.id}" aria-label="Remove ${place.title}">×</button>
    </article>
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

render();
