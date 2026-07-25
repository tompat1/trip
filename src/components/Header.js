import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

export function renderHeader() {
  const isLanding = state.activeView === "landing";

  if (isLanding) {
    return `
      <header class="top-nav top-nav--landing">
        <div class="top-nav__brand">
          <span class="top-nav__logo">T R I P</span>
          <span class="top-nav__sublogo">Trip Planner Deluxe</span>
        </div>
        <div class="top-nav__actions">
          <button class="btn btn--primary btn--sm" data-action="go-app">Get started</button>
          <button class="btn btn--icon" aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </header>
    `;
  }

  const trip = state.activeTrip;
  const allTrips = state.getAllTrips();
  const liveDayTime = getLiveDayTimeFormatted();

  return `
    <header class="app-header">
      <div class="app-header__top">
        <div class="brand-monogram" data-action="cycle-next-trip" title="Click logo to cycle trip context">
          <span class="brand-monogram__logo">T R I P</span>
          <span class="brand-monogram__sub">Trip Planner Deluxe</span>
        </div>
        <div class="app-header__user">
          <div class="header-live-time-pill" title="Live Open-Meteo weather in ${escapeHtml(trip.destination.split(',')[0])} & time">
            <span class="header-weather-badge">${trip.weather?.icon || '☀️'} ${trip.weather?.temp || '20°C'}</span>
            <span class="header-time-divider">•</span>
            <span class="live-time-text">${liveDayTime}</span>
            <span class="status-light-dot" title="Status: Online"></span>
          </div>

          <button class="btn btn--icon btn--ghost" data-action="view-notifications" aria-label="Notifications" title="Notifications">
            ${renderIcon("bell")}
          </button>

          <div class="avatar-badge" data-action="go-profile" title="View Profile">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" alt="Thomas avatar" class="avatar-img" />
            <span class="avatar-online-dot"></span>
          </div>
        </div>
      </div>

      <div class="trip-context-card">
        <div class="trip-context-card__header">
          <div class="card-eyebrow-row">
            <span class="eyebrow-pill">${state.tripMode ? 'MVP 2 · LIVE JOURNEY' : 'MVP 2 · PLANNING MODE'}</span>
            <div class="trip-selector-wrap">
              <select class="trip-select-dropdown" data-action="select-trip-dropdown">
                ${allTrips.map(t => `<option value="${t.id}" ${t.id === trip.id ? 'selected' : ''}>${t.flag} ${escapeHtml(t.destination)}</option>`).join('')}
              </select>
              <button class="btn btn--ghost btn--xs cycle-trips-btn" data-action="cycle-next-trip" title="Cycle through all trips">
                <span>🔄 Next</span>
              </button>
            </div>
          </div>

          <div class="trip-context-card__title-row">
            <div class="editable-trip-title" data-action="edit-trip-title" title="Click to edit destination name & auto flag">
              <h1 class="trip-title">${escapeHtml(trip.destination)} ${trip.flag}</h1>
              <button class="btn btn--icon btn--ghost edit-pencil-btn" aria-label="Edit trip title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <div class="trip-actions-row">
              <button class="btn btn--outline btn--icon" data-action="toggle-map-view" title="Toggle Map">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>
              </button>
              <button class="btn btn--outline btn--sm" data-action="share-trip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                <span>Share</span>
              </button>
              <button class="btn btn--primary btn--sm" data-action="create-trip" title="Create a new custom trip">
                <span>+ New trip</span>
              </button>
              <label class="trip-mode-toggle" title="Toggle Trip Mode (Live vs Planning)">
                <span class="trip-mode-label">Trip Mode</span>
                <input type="checkbox" ${state.tripMode ? 'checked' : ''} data-action="toggle-trip-mode" />
                <span class="toggle-slider">
                  <span class="toggle-knob">${state.tripMode ? 'ON' : 'OFF'}</span>
                </span>
              </label>
            </div>
          </div>
          <p class="trip-dates">${escapeHtml(trip.dates)}</p>
        </div>
      </div>
    </header>
  `;
}

function getLiveDayTimeFormatted() {
  const now = new Date();
  return new Intl.DateTimeFormat([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(now);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
