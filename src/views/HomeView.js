import { state } from "../state.js";
import { renderHeader } from "../components/Header.js";

export function renderHomeView() {
  const trip = state.activeTrip;
  const isCrete = trip.id === "crete";
  const checklist = state.checklists[trip.id] || trip.checklist;

  return `
    <div class="home-page">
      ${renderHeader()}

      <div class="home-page__content">
        <!-- Morning Greeting & Status Header -->
        <section class="greeting-row">
          <div class="greeting-text">
            <h2 class="greeting-title">Good morning, Thomas 👋</h2>
            <p class="greeting-status">
              ${isCrete 
                ? `<span class="live-pulse-dot"></span> <strong>You are in Heraklion, Crete</strong> <span class="status-meta">Clear sky + 28°C + 10:15 AM</span>` 
                : `<span class="upcoming-badge">17 days until your trip to Paris</span>`}
            </p>
          </div>

          <div class="upcoming-card" data-action="go-plan">
            <div class="upcoming-card__info">
              <span class="upcoming-card__label">Upcoming</span>
              <h3 class="upcoming-card__title">${escapeHtml(trip.upcomingActivity.title)} &rsaquo;</h3>
              <p class="upcoming-card__time">${escapeHtml(trip.upcomingActivity.subtitle)}</p>
            </div>
            <div class="upcoming-card__thumb" style="background-image: url('${trip.upcomingActivity.image}')"></div>
          </div>
        </section>

        <!-- Main Dashboard Widgets Grid -->
        <div class="dashboard-grid">
          <!-- Widget 1: Continue Planning Checklist -->
          <div class="dashboard-card planning-widget">
            <div class="dashboard-card__header">
              <h3 class="dashboard-card__title">Continue planning</h3>
            </div>
            <ul class="checklist-items">
              ${checklist.map(item => `
                <li class="checklist-item ${item.completed ? 'is-completed' : ''}" data-action="toggle-check" data-item-id="${item.id}">
                  <span class="checkbox-circle ${item.completed ? 'is-checked' : ''}">
                    ${item.completed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                  </span>
                  <span class="checklist-label">${escapeHtml(item.label)}</span>
                  <button class="btn btn--icon btn--ghost item-more" aria-label="Options">⋮</button>
                </li>
              `).join('')}
            </ul>
            ${isCrete ? '<button class="btn btn--outline btn--sm full-width-btn" data-action="view-checklist">View full checklist</button>' : ''}
          </div>

          <!-- Widget 2: Leaflet Interactive Map Preview Card -->
          <div class="dashboard-card map-widget">
            <div id="home-map-container" class="home-map"></div>
            <div class="map-card-footer">
              <span class="map-location-badge">📍 You are near: Lions Square</span>
              <span class="map-accuracy-pill">🎯 Accuracy: 12m</span>
            </div>
          </div>

          <!-- Widget 3: Weather Context Card -->
          <div class="dashboard-card weather-widget">
            <div class="dashboard-card__header">
              <h3 class="dashboard-card__title">Weather in ${escapeHtml(trip.destination.split(',')[0])}</h3>
              <button class="btn btn--icon btn--ghost">⋮</button>
            </div>
            <div class="weather-main">
              <div class="weather-current">
                <span class="weather-icon">☀️</span>
                <div class="weather-temp-wrap">
                  <span class="weather-degree">${trip.weather.temp}</span>
                  <span class="weather-condition">${trip.weather.condition}</span>
                  ${trip.weather.feelsLike ? `<span class="weather-feels">Feels like ${trip.weather.feelsLike}</span>` : ''}
                </div>
              </div>

              <div class="weather-forecast-pills">
                ${trip.weather.forecast.map(f => `
                  <div class="forecast-pill">
                    <span class="forecast-day">${f.day}</span>
                    <span class="forecast-icon">☀️</span>
                    <span class="forecast-temp">${f.temp}</span>
                  </div>
                `).join('')}
              </div>

              ${isCrete ? `
                <div class="weather-meta-row">
                  <div class="meta-item"><span class="meta-label">Local time</span><span class="meta-val">${trip.weather.localTime} GMT+3</span></div>
                  <div class="meta-item"><span class="meta-label">Currency</span><span class="meta-val">${trip.weather.currency}</span></div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Section: Ideas for your trip -->
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

        <!-- Section: Events during your stay -->
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

        ${isCrete ? `
          <!-- Section: Nearby Now (Live in destination) -->
          <section class="home-section">
            <div class="section-header">
              <h3 class="section-title">Nearby now</h3>
            </div>
            <div class="nearby-grid">
              ${trip.nearbyNow.map(nb => `
                <div class="nearby-card">
                  <span class="nearby-icon">${nb.icon}</span>
                  <div class="nearby-info">
                    <h4 class="nearby-title">${escapeHtml(nb.title)}</h4>
                    <p class="nearby-dist">${escapeHtml(nb.distance)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
            <button class="btn btn--outline btn--sm full-width-btn margin-top-sm" data-action="go-search">Explore more near you</button>
          </section>

          <!-- Section: Live Travel Info -->
          <section class="home-section">
            <div class="section-header">
              <h3 class="section-title">Live travel info</h3>
            </div>
            <div class="live-info-grid">
              ${trip.liveInfo.map(info => `
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
            <button class="btn btn--outline btn--sm full-width-btn margin-top-sm" data-action="go-live">View all live updates</button>
          </section>

          <!-- Section: Transport Options -->
          <section class="home-section">
            <div class="section-header">
              <h3 class="section-title">Transport options</h3>
            </div>
            <div class="transport-grid">
              ${trip.transportOptions.map(tr => `
                <div class="transport-card">
                  <span class="transport-icon">${tr.icon}</span>
                  <div class="transport-body">
                    <h4 class="transport-title">${escapeHtml(tr.title)}</h4>
                    <p class="transport-detail">${escapeHtml(tr.detail)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
            <button class="btn btn--outline btn--sm full-width-btn margin-top-sm" data-action="go-plan">Plan your route</button>
          </section>
        ` : ''}

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
            ${isCrete ? `
              <button class="quick-btn" data-action="quick-expense">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <span>Expense</span>
              </button>
            ` : ''}
          </div>
        </section>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
