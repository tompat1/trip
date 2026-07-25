import { state } from "../state.js";
import { renderHeader } from "../components/Header.js";

export function renderLiveView() {
  const trip = state.activeTrip;

  return `
    <div class="live-page">
      ${renderHeader()}

      <div class="live-page__content">
        <section class="live-status-hero">
          <div class="live-status-hero__badge">
            <span class="live-pulse-dot"></span>
            <span>LIVE JOURNEY MODE</span>
          </div>
          <h2 class="live-status-title">Currently Exploring ${escapeHtml(trip.destination)}</h2>
          <p class="live-status-subtitle">Real-time weather, nearby POIs, and transit recommendations</p>
        </section>

        <!-- Full width Live Map container -->
        <div class="live-map-wrapper">
          <div id="live-map-container" class="live-map"></div>
          <div class="live-map-overlay">
            <span class="location-ping">📍 Near Lions Square, Heraklion</span>
            <button class="btn btn--primary btn--sm" data-action="locate-user">Recenter</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderProfileView() {
  return `
    <div class="profile-page">
      ${renderHeader()}

      <div class="profile-page__content">
        <div class="profile-header-card">
          <div class="profile-avatar-lg">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80" alt="Thomas Rynell" />
          </div>
          <h2 class="profile-name">Thomas Rynell</h2>
          <p class="profile-handle">@thomasrynell</p>
          <p class="profile-bio">Curious traveler, specialty coffee lover, and memory keeper.</p>
        </div>

        <div class="profile-stats-row">
          <div class="profile-stat-box">
            <span class="stat-num">14</span>
            <span class="stat-label">Trips</span>
          </div>
          <div class="profile-stat-box">
            <span class="stat-num">89</span>
            <span class="stat-label">Places</span>
          </div>
          <div class="profile-stat-box">
            <span class="stat-num">240</span>
            <span class="stat-label">Moments</span>
          </div>
        </div>

        <div class="profile-actions-list">
          <button class="btn btn--outline full-width-btn mb-sm" data-action="switch-to-landing">View Marketing / Landing Page</button>
          <button class="btn btn--primary full-width-btn" data-action="switch-trip">Toggle Paris / Crete Trip Context</button>
        </div>
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
