import { state } from "../state.js";
import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";

export function renderHomeView() {
  const trip = state.activeTrip;
  const isLiveMode = state.tripMode;
  const checklist = state.checklists[trip.id] || trip.checklist;
  const statusText = getDynamicTripCountdown(trip);
  const liveTimeStr = formatLiveTimeString();

  return `
    <div class="home-page">
      ${renderHeader()}

      <div class="home-page__content">
        <!-- Morning Greeting & Dynamic Mode Status Header -->
        <section class="greeting-row">
          <div class="greeting-text">
            <h2 class="greeting-title">Good morning, Thomas 👋</h2>
            <p class="greeting-status">
              ${isLiveMode 
                ? `<span class="live-pulse-dot"></span> <strong>You are in ${escapeHtml(trip.destination)}</strong> <span class="status-meta">${trip.weather?.condition || 'Fair'} • ${trip.weather?.temp || '20°C'} • ${liveTimeStr}</span>` 
                : `<span class="upcoming-badge">${statusText}</span>`}
            </p>
          </div>

          <div class="upcoming-card" data-action="go-plan">
            <div class="upcoming-card__info">
              <span class="upcoming-card__label">${isLiveMode ? 'Current Stop' : 'Upcoming'}</span>
              <h3 class="upcoming-card__title">${escapeHtml(trip.upcomingActivity.title)} &rsaquo;</h3>
              <p class="upcoming-card__time">${escapeHtml(trip.upcomingActivity.subtitle)}</p>
            </div>
            <div class="upcoming-card__thumb" style="background-image: url('${trip.upcomingActivity.image}')"></div>
          </div>
        </section>

        ${isLiveMode ? renderLiveJourneyModules(trip) : renderPlanningModules(trip, checklist)}

        <!-- Common Section: Ideas for your trip -->
        <section class="home-section">
          <div class="section-header">
            <h3 class="section-title">Ideas for your trip</h3>
            <button class="btn btn--link" data-action="go-search">See all</button>
          </div>
          <div class="horizontal-scroll-container">
            ${trip.ideas.map(idea => `
              <div class="idea-card">
                <div class="idea-card__image" style="background-image: url('${idea.image}')">
                  <button class="btn-bookmark ${state.savedPlaceIds.has(idea.id) ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${idea.id}" aria-label="Bookmark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${state.savedPlaceIds.has(idea.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
                <div class="idea-card__body">
                  <h4 class="idea-card__title">${escapeHtml(idea.title)}</h4>
                  <p class="idea-card__subtitle">${escapeHtml(idea.subtitle)}</p>
                  <div class="idea-card__meta">
                    <span class="rating-badge">★ ${idea.rating}</span>
                    <span class="duration-badge">⏱ ${idea.duration}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Common Section: Events during your stay -->
        <section class="home-section">
          <div class="section-header">
            <h3 class="section-title">Events during your stay</h3>
            <button class="btn btn--link" data-action="go-search">See all</button>
          </div>
          <div class="events-grid">
            ${trip.events.map(ev => `
              <div class="event-pill-card">
                <span class="event-pill-icon">${ev.icon}</span>
                <div class="event-pill-info">
                  <h4 class="event-pill-title">${escapeHtml(ev.title)}</h4>
                  <p class="event-pill-dates">${escapeHtml(ev.dates)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        ${!isLiveMode ? renderLiveJourneyModules(trip) : renderPlanningModules(trip, checklist)}

        <!-- Quick Capture Bar -->
        <section class="quick-capture-section">
          <h3 class="section-title mb-sm">Quick capture</h3>
          <div class="quick-capture-bar">
            <button class="quick-btn" data-action="quick-photo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Photo</span>
            </button>
            <button class="quick-btn" data-action="quick-video">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              <span>Video</span>
            </button>
            <button class="quick-btn" data-action="quick-note">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Note</span>
            </button>
            <button class="quick-btn" data-action="quick-moment">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>Moment</span>
            </button>
            <input type="file" id="quick-capture-file-input" style="display:none" accept="image/*,video/*" />
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderPlanningModules(trip, checklist) {
  return `
    <div class="dashboard-grid">
      <!-- Widget 1: Continue Planning Checklist (Full CRUD) -->
      <div class="dashboard-card planning-widget">
        <div class="dashboard-card__header">
          <h3 class="dashboard-card__title">Continue planning</h3>
          <button class="btn btn--outline btn--xs" data-action="add-checklist-item" title="Add planning task">${renderIcon("plus")} Add task</button>
        </div>
        <ul class="checklist-items">
          ${checklist.map(item => `
            <li class="checklist-item ${item.completed ? 'is-completed' : ''}">
              <span class="checkbox-circle ${item.completed ? 'is-checked' : ''}" data-action="toggle-check" data-item-id="${item.id}">
                ${item.completed ? renderIcon("check") : ''}
              </span>
              <span class="checklist-label" data-action="toggle-check" data-item-id="${item.id}">${escapeHtml(item.label)}</span>
              <div class="checklist-item-actions">
                <button class="btn btn--icon btn--ghost item-action-btn" data-action="edit-checklist-item" data-item-id="${item.id}" data-label="${escapeHtml(item.label)}" title="Edit task">${renderIcon("pencil")}</button>
                <button class="btn btn--icon btn--ghost item-action-btn" data-action="delete-checklist-item" data-item-id="${item.id}" title="Delete task">${renderIcon("trash")}</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Widget 2: Leaflet Interactive Map Preview Card -->
      <div class="dashboard-card map-widget">
        <div id="home-map-container" class="home-map"></div>
        <div class="map-card-footer">
          <span class="map-location-badge">📍 Map Preview: ${escapeHtml(trip.destination)}</span>
          <button class="btn btn--link btn--sm" data-action="go-live">Full Map &rsaquo;</button>
        </div>
      </div>

      <!-- Widget 3: Live Open-Meteo Weather Context Card -->
      <div class="dashboard-card weather-widget">
        <div class="dashboard-card__header">
          <h3 class="dashboard-card__title">Weather in ${escapeHtml(trip.destination.split(',')[0])}</h3>
          <button class="btn btn--icon btn--ghost" data-action="refresh-weather" title="Fetch live Open-Meteo weather">🔄</button>
        </div>
        <div class="weather-main">
          <div class="weather-current">
            <span class="weather-icon">${trip.weather?.icon || '☀️'}</span>
            <div class="weather-temp-wrap">
              <span class="weather-degree">${trip.weather?.temp || '20°C'}</span>
              <span class="weather-condition">${trip.weather?.condition || 'Fair'}</span>
              ${trip.weather?.feelsLike ? `<span class="weather-feels">Feels like ${trip.weather.feelsLike}</span>` : ''}
            </div>
          </div>
          <div class="weather-forecast-pills">
            ${(trip.weather?.forecast || []).map(f => `
              <div class="forecast-pill">
                <span class="forecast-day">${f.day}</span>
                <span class="forecast-icon">${f.icon || '☀️'}</span>
                <span class="forecast-temp">${f.temp}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderLiveJourneyModules(trip) {
  const nearby = trip.nearbyNow || [];
  const liveInfo = trip.liveInfo || [];

  return `
    <div class="live-modules-wrapper">
      <!-- Section: Nearby Now -->
      ${nearby.length ? `
        <section class="home-section mb-md">
          <div class="section-header">
            <h3 class="section-title">Nearby now</h3>
          </div>
          <div class="nearby-grid">
            ${nearby.map(nb => `
              <div class="nearby-card">
                <span class="nearby-icon">${nb.icon}</span>
                <div class="nearby-info">
                  <h4 class="nearby-title">${escapeHtml(nb.title)}</h4>
                  <p class="nearby-dist">${escapeHtml(nb.distance)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Section: Live Travel Info -->
      ${liveInfo.length ? `
        <section class="home-section mb-md">
          <div class="section-header">
            <h3 class="section-title">Live travel info</h3>
          </div>
          <div class="live-info-grid">
            ${liveInfo.map(info => `
              <div class="live-info-card">
                <span class="live-info-icon">${info.icon}</span>
                <div class="live-info-body">
                  <h4 class="live-info-title">${escapeHtml(info.title)}</h4>
                  <p class="live-info-sub">${escapeHtml(info.subtitle)}</p>
                </div>
                <span class="badge ${info.statusClass}">${info.status}</span>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;
}

function getDynamicTripCountdown(trip) {
  if (!trip) return "Planning mode";
  const now = new Date();
  
  let startDate = trip.startDate ? new Date(trip.startDate) : null;
  if (!startDate || isNaN(startDate.getTime())) {
    if (trip.id === "paris") startDate = new Date("2026-10-03");
    else if (trip.id === "crete") startDate = new Date("2026-07-15");
    else startDate = new Date();
  }

  const diffMs = startDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const destCity = (trip.destination || "").split(",")[0];

  if (diffDays > 0) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} until your trip to ${destCity}`;
  } else if (diffDays === 0) {
    return `🎉 Your trip to ${destCity} starts today!`;
  } else if (diffDays > -14) {
    return `✈️ Trip to ${destCity} in progress`;
  } else {
    return `📖 Travel memory archive (${destCity})`;
  }
}

function formatLiveTimeString() {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
