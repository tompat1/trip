import { state } from "../state.js";
import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_STAMP_SVG } from "../components/BrandAssets.js";

export function renderLiveView() {
  const trip = state.activeTrip;
  const events = trip.calendarEvents || [];
  const activeDayEvents = events.filter(e => Number(e.dayIndex) === (state.activeDayIndex || 0));

  // Nearby POIs data
  const nearbyPlaces = state.liveNearbyPlaces && state.liveNearbyPlaces.length ? state.liveNearbyPlaces : [
    { id: "np1", name: "Le Marais Artisan Bakery", category: "Bakery", distance: "280m", rating: "4.9", address: "14 Rue Bretagne" },
    { id: "np2", name: "Louvre Courtyard & Pyramid", category: "Sight", distance: "450m", rating: "4.8", address: "Place du Carrousel" },
    { id: "np3", name: "Telescope Specialty Coffee", category: "Café", distance: "600m", rating: "4.7", address: "5 Rue Villedo" },
    { id: "np4", name: "Palais-Royal Arcades", category: "Park", distance: "750m", rating: "4.8", address: "8 Rue de Montpensier" }
  ];

  return `
    <div class="live-page">
      ${renderHeader()}

      <div class="live-page__content" style="padding: 16px 16px 32px 16px; display: flex; flex-direction: column; gap: 20px;">
        <!-- Live Status Banner -->
        <section class="live-status-hero" style="background: linear-gradient(135deg, var(--paper-card) 0%, var(--paper-subtle) 100%); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 18px; box-shadow: var(--shadow-sm);">
          <div class="live-status-hero__badge mb-xs" style="display: flex; align-items: center; gap: 6px;">
            <span class="live-pulse-dot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px rgba(101,112,91,0.6);"></span>
            <span class="voice-mono" style="font-size: 0.72rem; font-weight: 700; color: var(--green); letter-spacing: 0.5px;">LIVE JOURNEY MODE</span>
          </div>
          <h2 class="voice-serif" style="font-size: 1.5rem; font-weight: 700; color: var(--ink); margin: 4px 0;">Exploring ${escapeHtml(trip.destination)} ${trip.flag}</h2>
          <p style="font-size: 0.85rem; color: var(--ink-muted); margin: 0;">Real-time Open-Meteo weather (${trip.weather?.temp || '20°C'}), nearby POIs & live GPS location</p>
        </section>

        <!-- Interactive Map Container -->
        <div class="live-map-wrapper" style="position: relative; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow-sm); height: 280px;">
          <div id="live-map-container" class="live-map" style="width: 100%; height: 100%; z-index: 1;"></div>
          <div class="live-map-overlay" style="position: absolute; bottom: 12px; left: 12px; right: 12px; z-index: 2; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.92); backdrop-filter: blur(6px); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--line-light);">
            <span class="location-ping voice-mono" style="font-size: 0.78rem; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 6px;">
              ${renderIcon("mapPin")} Near Lions Square, Heraklion
            </span>
            <button class="btn btn--primary btn--xs" data-action="locate-user" style="padding: 4px 10px;">Recenter GPS</button>
          </div>
        </div>

        <!-- Nearby POIs & Recommendations -->
        <div class="dashboard-card" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 class="dashboard-card__title" style="margin: 0; font-size: 1.1rem;">Nearby Spots & POIs</h3>
              <p style="font-size: 0.8rem; color: var(--ink-muted); margin: 2px 0 0 0;">Live places within 1km of your current location</p>
            </div>
            <span class="badge badge--info voice-mono" style="font-weight: 700;">Live GPS</span>
          </div>

          <div class="nearby-places-feed" style="display: flex; flex-direction: column; gap: 12px;">
            ${nearbyPlaces.map(place => {
              const isSaved = state.savedPlaceIds.has(place.id);
              return `
                <div class="nearby-place-card" style="display: flex; align-items: center; justify-content: space-between; background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 14px; box-shadow: var(--shadow-sm);">
                  <div>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                      <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--ink); margin: 0;">${escapeHtml(place.name || place.title)}</h4>
                      <span class="voice-mono" style="font-size: 0.72rem; font-weight: 700; color: var(--sun); background: rgba(233,199,107,0.18); padding: 2px 6px; border-radius: var(--radius-pill);">★ ${place.rating || '4.8'}</span>
                    </div>
                    <span class="voice-mono" style="font-size: 0.75rem; color: var(--ink-muted);">${escapeHtml(place.category)} • 📍 ${escapeHtml(place.distance || '300m away')}</span>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn-bookmark ${isSaved ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${place.id}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; background: var(--paper-card);" aria-label="Bookmark">
                      ${renderIcon("bookmark")}
                    </button>
                    <button class="btn btn--outline btn--xs" data-action="add-idea-to-itinerary" data-title="${escapeHtml(place.name || place.title)}" data-location="${escapeHtml(place.address || place.name)}">
                      ${renderIcon("plus")} Add
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Today's Live Itinerary Schedule -->
        <div class="dashboard-card" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 class="dashboard-card__title" style="margin: 0; font-size: 1.1rem;">Today's Live Itinerary</h3>
              <p style="font-size: 0.8rem; color: var(--ink-muted); margin: 2px 0 0 0;">Scheduled activities for Day ${(state.activeDayIndex || 0) + 1}</p>
            </div>
            <button class="btn btn--outline btn--xs" data-action="open-create-event-drawer">${renderIcon("plus")} Add Activity</button>
          </div>

          <div class="live-events-feed" style="display: flex; flex-direction: column; gap: 10px;">
            ${activeDayEvents.length === 0 ? `
              <div style="background: var(--paper); border: 1px dashed var(--line); border-radius: var(--radius-md); padding: 18px; text-align: center; color: var(--ink-muted); font-size: 0.85rem;">
                No activities scheduled for today. Tap "+ Add Activity" to schedule a spot!
              </div>
            ` : activeDayEvents.map(evt => `
              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="voice-mono" style="font-size: 0.8rem; font-weight: 700; color: var(--red); background: rgba(217,74,58,0.1); padding: 4px 8px; border-radius: var(--radius-pill);">${evt.startTime}</span>
                  <div>
                    <h4 style="font-size: 0.94rem; font-weight: 700; color: var(--ink); margin: 0 0 2px 0;">${escapeHtml(evt.title)}</h4>
                    <span style="font-size: 0.75rem; color: var(--ink-muted);">${escapeHtml(evt.location || 'Paris')}</span>
                  </div>
                </div>
                <button class="btn btn--icon btn--ghost" data-action="edit-event" data-event-id="${evt.id}">
                  ${renderIcon("pencil")}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderProfileView() {
  const savedCount = state.savedPlaceIds ? state.savedPlaceIds.size : 156;
  const tripsCount = Object.keys(state.getAllTrips ? state.getAllTrips() : {}).length || 14;

  return `
    <div class="profile-page">
      ${renderHeader()}

      <div class="profile-page__content">
        <!-- Main Profile Header Card -->
        <div class="profile-header-card card-pattern-poly">
          <div class="profile-avatar-wrap" data-action="change-avatar" title="Click to change profile picture">
            <img src="${state.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80'}" alt="Thomas R." />
            <div class="profile-avatar-edit-badge" data-action="change-avatar" title="Change photo">
              ${renderIcon("pencil")}
            </div>
          </div>
          <input type="file" id="avatar-file-input" accept="image/*" style="display:none;" />

          <h2 class="profile-user-name">Thomas R.</h2>
          <div class="profile-user-badge">
            <span>💎</span> Premium Traveler
          </div>

          <div class="profile-stats-grid">
            <div class="profile-stat-box">
              <span class="profile-stat-num">${tripsCount}</span>
              <span class="profile-stat-label">Trips</span>
            </div>
            <div class="profile-stat-box">
              <span class="profile-stat-num">${savedCount}</span>
              <span class="profile-stat-label">Saved</span>
            </div>
            <div class="profile-stat-box">
              <span class="profile-stat-num">48</span>
              <span class="profile-stat-label">Moments</span>
            </div>
            <div class="profile-stat-box">
              <span class="profile-stat-num">12</span>
              <span class="profile-stat-label">Countries</span>
            </div>
          </div>
        </div>

        <!-- Group 1: User Account Settings Menu -->
        <div class="profile-menu-card">
          <button class="profile-menu-item">
            <div class="profile-menu-item__left">
              <span class="profile-menu-item__icon">👤</span>
              <div>
                <h4 class="profile-menu-item__title">My profile</h4>
                <p class="profile-menu-item__sub">Edit your personal info</p>
              </div>
            </div>
            <span class="profile-menu-item__arrow">&rsaquo;</span>
          </button>

          <button class="profile-menu-item">
            <div class="profile-menu-item__left">
              <span class="profile-menu-item__icon">⚙️</span>
              <div>
                <h4 class="profile-menu-item__title">Travel preferences</h4>
                <p class="profile-menu-item__sub">Tell us what you love</p>
              </div>
            </div>
            <span class="profile-menu-item__arrow">&rsaquo;</span>
          </button>

          <button class="profile-menu-item">
            <div class="profile-menu-item__left">
              <span class="profile-menu-item__icon">🔔</span>
              <div>
                <h4 class="profile-menu-item__title">Notifications</h4>
                <p class="profile-menu-item__sub">Manage your alerts</p>
              </div>
            </div>
            <span class="profile-menu-item__arrow">&rsaquo;</span>
          </button>

          <button class="profile-menu-item">
            <div class="profile-menu-item__left">
              <span class="profile-menu-item__icon">🔒</span>
              <div>
                <h4 class="profile-menu-item__title">Privacy & security</h4>
                <p class="profile-menu-item__sub">Control your data</p>
              </div>
            </div>
            <span class="profile-menu-item__arrow">&rsaquo;</span>
          </button>
        </div>

        <!-- 2x2 Activity Grid -->
        <div class="profile-activity-section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="profile-section-title">Your activity</h3>
            <button class="btn btn--link btn--xs" data-action="go-search">View all</button>
          </div>

          <div class="profile-activity-grid">
            <div class="profile-activity-card" data-action="go-search">
              <span class="profile-activity-icon">🕒</span>
              <div>
                <h4 class="profile-activity-title">Recently viewed</h4>
                <p class="profile-activity-sub">24 places</p>
              </div>
            </div>

            <div class="profile-activity-card" data-action="go-search">
              <span class="profile-activity-icon">🔖</span>
              <div>
                <h4 class="profile-activity-title">Saved places</h4>
                <p class="profile-activity-sub">${savedCount} places</p>
              </div>
            </div>

            <div class="profile-activity-card" data-action="go-plan" data-subtab="journal">
              <span class="profile-activity-icon">📥</span>
              <div>
                <h4 class="profile-activity-title">Your moments</h4>
                <p class="profile-activity-sub">48 moments</p>
              </div>
            </div>

            <div class="profile-activity-card" data-action="go-plan">
              <span class="profile-activity-icon">🗺️</span>
              <div>
                <h4 class="profile-activity-title">Your trips</h4>
                <p class="profile-activity-sub">${tripsCount} trips</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Group 2: Help & Cloudflare D1 Account Menu -->
        <div class="profile-menu-card mb-md">
          <button class="profile-menu-item">
            <div class="profile-menu-item__left">
              <span class="profile-menu-item__icon">👥</span>
              <div>
                <h4 class="profile-menu-item__title">Invite friends</h4>
                <p class="profile-menu-item__sub">Share Trip Planner Deluxe</p>
              </div>
            </div>
            <span class="profile-menu-item__arrow">&rsaquo;</span>
          </button>

          <button class="profile-menu-item">
            <div class="profile-menu-item__left">
              <span class="profile-menu-item__icon">❓</span>
              <div>
                <h4 class="profile-menu-item__title">Help & support</h4>
                <p class="profile-menu-item__sub">FAQs and contact</p>
              </div>
            </div>
            <span class="profile-menu-item__arrow">&rsaquo;</span>
          </button>

          <button class="profile-menu-item">
            <div class="profile-menu-item__left">
              <span class="profile-menu-item__icon">⚙️</span>
              <div>
                <h4 class="profile-menu-item__title">App Settings</h4>
                <p class="profile-menu-item__sub">App preferences</p>
              </div>
            </div>
            <span class="profile-menu-item__arrow">&rsaquo;</span>
          </button>

          <button class="profile-menu-item" data-action="admin-login-dialog">
            <div class="profile-menu-item__left">
              <span class="profile-menu-item__icon">🔑</span>
              <div>
                <h4 class="profile-menu-item__title">Cloudflare D1 Storage</h4>
                <p class="profile-menu-item__sub">Sign in & sync cloud database</p>
              </div>
            </div>
            <span class="profile-menu-item__arrow">&rsaquo;</span>
          </button>
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
