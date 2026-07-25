import { state } from "../state.js";

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
  const isParis = trip.id === "paris";
  const health = state.backendHealth;

  return `
    <header class="app-header">
      <div class="app-header__top">
        <div class="brand-monogram" data-action="toggle-trip-switch" title="Switch trip context">
          <span class="brand-monogram__logo">T R I P</span>
          <span class="brand-monogram__sub">Trip Planner Deluxe</span>
        </div>
        <div class="app-header__user">
          <div class="backend-status-pill ${health.status === 'connected' ? 'is-connected' : ''}" title="Cloudflare Worker & D1 status">
            <span class="status-dot"></span>
            <span class="status-text">${health.status === 'connected' ? 'CF Worker Connected' : 'Local / Offline Ready'}</span>
          </div>

          <button class="btn btn--icon btn--ghost" aria-label="Notifications" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
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
            <span class="eyebrow-pill">MVP 2 · LIVE JOURNEY</span>
            ${health.bindings.d1 ? '<span class="d1-ready-badge">⚡ D1 Database Ready</span>' : ''}
          </div>

          <div class="trip-context-card__title-row">
            <h1 class="trip-title">${escapeHtml(trip.destination)} ${trip.flag}</h1>
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
              <label class="trip-mode-toggle" title="Toggle Trip Mode">
                <span class="trip-mode-label">Trip Mode</span>
                <input type="checkbox" ${state.tripMode ? 'checked' : ''} data-action="toggle-trip-mode" />
                <span class="toggle-slider">
                  <span class="toggle-knob">ON</span>
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
