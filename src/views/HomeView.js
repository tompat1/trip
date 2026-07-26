import { state } from "../state.js";
import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_ROUTE_LINE_SVG } from "../components/BrandAssets.js";

export function renderHomeView() {
  const trip = state.activeTrip;
  const isLiveMode = state.tripMode;
  const checklist = state.checklists ? (state.checklists[trip.id] || trip.checklist) : (trip.checklist || []);
  const liveTimeStr = formatLiveTimeString();
  const statusText = getDynamicTripCountdown(trip);
  const tripIdeas = getHomeTripIdeas(trip);

  return `
    <div class="home-page">
      ${renderHeader()}

      <div class="home-page__content">
        <!-- Morning Greeting Card with Map Pattern Background -->
        <section class="greeting-row card-pattern-map">
          <div class="greeting-text">
            <h2 class="greeting-title voice-serif" style="font-size: 1.45rem; font-weight: 700; color: var(--ink);">Good morning, Thomas 👋</h2>
            <p class="greeting-status">
              ${isLiveMode 
                ? `<span class="live-pulse-dot"></span> <strong>You are in ${escapeHtml(trip.destination)}</strong> <span class="status-meta">${trip.weather?.condition || 'Fair'} • ${trip.weather?.temp || '20°C'} • ${liveTimeStr}</span>` 
                : `<span class="upcoming-badge">${statusText}</span>`}
            </p>
          </div>
        </section>

        <!-- Dotted Route Line Banner (Guidelines Section 07) -->
        <div class="route-line-dashed-banner" data-action="go-plan-timeline" role="button" tabindex="0" aria-label="Open trip timeline">
          <div class="route-line-dashed-banner__header">
            <span class="route-line-dashed-banner__title voice-mono">${escapeHtml(trip.destination.toUpperCase())} ROUTE PATH</span>
            <span class="route-line-dashed-banner__cta voice-mono">
              ${escapeHtml(trip.upcomingActivity.title)}
              <span class="route-line-dashed-banner__arrow">${renderIcon("arrowRight")}</span>
            </span>
          </div>
          <div class="route-line-dashed-banner__map">
            ${TRIP_ROUTE_LINE_SVG()}
          </div>
        </div>

        ${isLiveMode ? renderLiveJourneyModules(trip) : renderPlanningModules(trip, checklist)}

        <!-- Common Section: Ideas for your trip -->
        <section class="home-section">
          <div class="section-header">
            <h3 class="section-title">Ideas for your trip</h3>
            <button class="btn btn--link" data-action="go-search">See all</button>
          </div>
          <div class="horizontal-scroll-container">
            ${tripIdeas.map(idea => {
              const isOpenTripMap = idea.source === "OpenTripMap";
              return `
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
                    <span class="rating-badge">${isOpenTripMap ? 'OpenTripMap' : `★ ${escapeHtml(idea.rating)}`}</span>
                    <span class="duration-badge">${isOpenTripMap ? escapeHtml(idea.distance || idea.category) : `⏱ ${escapeHtml(idea.duration)}`}</span>
                  </div>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </section>

        <!-- Common Section: Events during your stay -->
        <section class="home-section">
          <div class="section-header">
            <h3 class="section-title">Events during your stay</h3>
            <button class="btn btn--link" data-action="go-search">See all</button>
          </div>
          <div class="events-grid">
            ${trip.events.map(ev => {
              const eventId = ev.id || ev.title;
              const isSaved = state.savedPlaceIds && state.savedPlaceIds.has(eventId);
              return `
                <div class="event-pill-card" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <span class="event-pill-icon">${ev.icon}</span>
                    <div class="event-pill-info" style="min-width: 0;">
                      <h4 class="event-pill-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(ev.title)}</h4>
                      <p class="event-pill-dates">${escapeHtml(ev.dates)}</p>
                    </div>
                  </div>
                  <button class="btn-bookmark ${isSaved ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${escapeHtml(eventId)}" aria-label="Bookmark event" style="padding: 4px; border: none; background: transparent; cursor: pointer; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;" title="${isSaved ? 'Saved to planning bucket' : 'Bookmark to planning bucket'}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'var(--orange)' : 'none'}" stroke="${isSaved ? 'var(--orange)' : 'currentColor'}" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        ${!isLiveMode ? renderLiveJourneyModules(trip) : renderPlanningModules(trip, checklist)}
      </div>
    </div>
  `;
}

function getHomeTripIdeas(trip) {
  const liveIdeas = [...(trip.tourismPois || []), ...(trip.hiddenGems || [])].slice(0, 3);
  return [...liveIdeas, ...(trip.ideas || [])].slice(0, 6);
}

function renderPlanningModules(trip, checklist) {
  return `
    <div class="dashboard-grid">
      <!-- Widget 1: Continue Planning Checklist (MapPattern Overlay) -->
      <div class="dashboard-card planning-widget card-pattern-map">
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

      <!-- Widget 2: Leaflet Interactive Map Preview Card (PolyLines Overlay) -->
      <div class="dashboard-card map-widget card-pattern-poly">
        <div id="home-map-container" class="home-map"></div>
        <div class="map-card-footer">
          <span class="map-location-badge">📍 Map Preview: ${escapeHtml(trip.destination)}</span>
          <button class="btn btn--link btn--sm" data-action="go-live">Full Map &rsaquo;</button>
        </div>
      </div>

      <!-- Widget 3: Live Open-Meteo Weather Context Card (PolyLines Overlay) -->
      ${(() => {
        const currentDateStr = new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
        const upcomingForecast = (trip.weather?.forecast || []).filter(f => f.day !== "Today");

        return `
          <div class="dashboard-card weather-widget card-pattern-poly">
            <div class="dashboard-card__header" style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h3 class="dashboard-card__title" style="margin: 0; line-height: 1.2;">Weather in ${escapeHtml(trip.destination.split(',')[0])}</h3>
                <span class="voice-mono" style="font-size: 0.75rem; color: var(--ink-muted); margin-top: 3px; display: block;">${currentDateStr}</span>
              </div>
              <button class="btn btn--icon btn--ghost" data-action="refresh-weather" title="Fetch live Open-Meteo weather" style="color: var(--ink-muted); padding: 4px;">
                ${renderIcon("refreshCw")}
              </button>
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
                ${upcomingForecast.map(f => `
                  <div class="forecast-pill">
                    <span class="forecast-day">${f.day}</span>
                    <span class="forecast-icon">${f.icon || '☀️'}</span>
                    <span class="forecast-temp">${f.temp}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      })()}
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
