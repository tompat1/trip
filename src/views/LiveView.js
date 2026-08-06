import { isFutureTrip, state, TRAVELER_PERSONA_ARCHETYPES } from "../state.js";
import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_STAMP_SVG } from "../components/BrandAssets.js";

export function renderLiveView() {
  const trip = state.activeTrip || { id: "guest", destination: "Live Mode", flag: "🗺️", center: [48.8566, 2.3522] };
  const events = trip.calendarEvents || [];
  const activeDayEvents = events.filter(e => Number(e.dayIndex) === (state.activeDayIndex || 0));
  const destinationContext = getTripDestinationContext(trip);
  const personaSummary = getLivePersonaSummary();

  // Nearby POIs data
  const liveNearbyPlaces = state.liveNearbyPlacesTripId === trip.id ? state.liveNearbyPlaces : [];
  const nearbyPlaces = liveNearbyPlaces && liveNearbyPlaces.length ? liveNearbyPlaces : [
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
        <section class="live-status-hero card-pattern-map" style="background: linear-gradient(135deg, var(--paper-card) 0%, var(--paper-subtle) 100%); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 18px; box-shadow: var(--shadow-sm);">
          <div class="live-status-hero__badge mb-xs" style="display: flex; align-items: center; gap: 6px;">
            <span class="live-pulse-dot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px rgba(101,112,91,0.6);"></span>
            <span class="voice-mono" style="font-size: 0.72rem; font-weight: 700; color: var(--green); letter-spacing: 0.5px;">LIVE JOURNEY MODE</span>
          </div>
          <h2 class="voice-serif" style="font-size: 1.5rem; font-weight: 700; color: var(--ink); margin: 4px 0;">Exploring ${escapeHtml(trip.destination)} ${trip.flag}</h2>
          <div class="live-context-meta">
            <span>⚡ Live Enriched</span>
            ${personaSummary ? `<span>✦ Tuned for ${escapeHtml(personaSummary)}</span>` : ""}
          </div>
          <p style="font-size: 0.85rem; color: var(--ink-muted); margin: 0;">Real-time Open-Meteo weather (${trip.weather?.temp || '20°C'}), trip-center POIs & live signals</p>
        </section>

        <!-- Interactive Map Container -->
        <div class="live-map-wrapper" style="position: relative; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow-sm); height: 280px;">
          <div id="live-map-container" class="live-map" style="width: 100%; height: 100%; z-index: 1;"></div>
          <div class="live-map-overlay" style="position: absolute; bottom: 12px; left: 12px; right: 12px; z-index: 2; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.92); backdrop-filter: blur(6px); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--line-light);">
            <span class="location-ping voice-mono" style="font-size: 0.78rem; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 6px;">
              ${renderIcon("mapPin")} Near ${escapeHtml(destinationContext)}
            </span>
            <button class="btn btn--primary btn--xs" data-action="locate-user" style="padding: 4px 10px;">Recenter trip</button>
          </div>
        </div>

        ${renderLiveIntelligenceModules(trip)}

        <!-- Nearby POIs & Recommendations -->
        <div class="dashboard-card" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 class="dashboard-card__title" style="margin: 0; font-size: 1.1rem;">Nearby Spots & POIs</h3>
              <p style="font-size: 0.8rem; color: var(--ink-muted); margin: 2px 0 0 0;">Live places around the trip center</p>
            </div>
            <span class="badge badge--info voice-mono" style="font-weight: 700;">Trip center</span>
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

function renderLiveIntelligenceModules(trip) {
  const status = state.getTripIntelligenceStatus ? state.getTripIntelligenceStatus(trip.id) : { status: "idle" };
  const signals = trip.travelSignals || trip.tripIntelligence?.signals || [];
  const mobility = trip.mobilityOptions || trip.tripIntelligence?.mobility || [];
  const outdoor = trip.outdoorIntel || trip.tripIntelligence?.outdoor || {};
  const headsUps = trip.headsUps || trip.tripIntelligence?.headsUps || [];
  const visibleHeadsUps = prioritizeHeadsUps(headsUps);

  return `
    <section class="live-intel-grid" aria-label="Live trip intelligence">
      <div class="dashboard-card live-intel-card">
        <div class="live-intel-card__header">
          <div>
            <h3 class="dashboard-card__title" style="margin: 0; font-size: 1.05rem;">Travel signals</h3>
            <p class="live-intel-card__sub">NASA EONET plus Open-Meteo context near ${escapeHtml(trip.destination.split(",")[0])}</p>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="refresh-trip-intelligence" aria-label="Refresh travel signals" title="Refresh travel signals">
            ${renderIcon("refresh")}
          </button>
        </div>
        <div class="live-intel-list">
          ${signals.length ? signals.slice(0, 3).map((signal) => `
            <div class="live-intel-row">
              <span class="live-intel-row__icon">${renderIcon("alertTriangle")}</span>
              <div class="live-intel-row__body">
                <strong>${escapeHtml(signal.title)}</strong>
                <span>${escapeHtml(signal.source)}${signal.distance ? ` · ${escapeHtml(signal.distance)}` : ""}</span>
              </div>
            </div>
          `).join("") : `
            <div class="live-intel-row">
              <span class="live-intel-row__icon">${renderIcon("shieldCheck")}</span>
              <div class="live-intel-row__body">
                <strong>${status.status === "loading" ? "Checking travel signals" : "No active natural-event signals nearby"}</strong>
                <span>${escapeHtml(outdoor.terrainLabel || "Outdoor context will appear here")}</span>
              </div>
            </div>
          `}
        </div>
      </div>

      <div class="dashboard-card live-intel-card">
        <div class="live-intel-card__header">
          <div>
            <h3 class="dashboard-card__title" style="margin: 0; font-size: 1.05rem;">Nearby mobility</h3>
            <p class="live-intel-card__sub">GBFS bike-share feeds around the trip center</p>
          </div>
          <span class="badge badge--info voice-mono">${mobility.length ? `${mobility.length} nearby` : "Open feed"}</span>
        </div>
        <div class="live-intel-list">
          ${mobility.length ? mobility.slice(0, 3).map((station) => `
            <div class="live-intel-row">
              <span class="live-intel-row__icon">${renderIcon("bike")}</span>
              <div class="live-intel-row__body">
                <strong>${escapeHtml(station.title)}</strong>
                <span>${escapeHtml(station.provider)} · ${station.bikes} bikes · ${station.docks} docks · ${escapeHtml(station.distance)}</span>
              </div>
            </div>
          `).join("") : `
            <div class="live-intel-row">
              <span class="live-intel-row__icon">${renderIcon("bike")}</span>
              <div class="live-intel-row__body">
                <strong>${status.status === "loading" ? "Checking local mobility" : "No local GBFS feed matched yet"}</strong>
                <span>Paris is wired first; more city feeds can be added per destination.</span>
              </div>
            </div>
          `}
        </div>
      </div>

      <div class="dashboard-card live-intel-card live-intel-card--wide">
        <div class="live-intel-card__header">
          <div>
            <h3 class="dashboard-card__title" style="margin: 0; font-size: 1.05rem;">Heads-up</h3>
            <p class="live-intel-card__sub">Water, rules, commute and practical things that can affect the stay</p>
          </div>
        </div>
        <div class="live-intel-list">
          ${visibleHeadsUps.length ? visibleHeadsUps.map(renderLiveHeadsUpDisclosure).join("") : `
            <div class="live-intel-row">
              <span class="live-intel-row__icon">${renderIcon("info")}</span>
              <div class="live-intel-row__body">
                <strong>${status.status === "loading" ? "Checking local heads-up notes" : "Local heads-up notes pending"}</strong>
                <span>Refresh trip intelligence to update practical travel notes.</span>
              </div>
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}

function prioritizeHeadsUps(headsUps = []) {
  const priority = ["water-quality", "local-commute", "alcohol-age", "drink-driving-limit", "speed-limits", "tourist-rules"];
  return [...headsUps].sort((a, b) => {
    const aIndex = priority.indexOf(a.id);
    const bIndex = priority.indexOf(b.id);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
}

function renderLiveHeadsUpDisclosure(item = {}) {
  const title = item.title || "Things to know";
  const detail = item.detail || "";
  const actionUrl = sanitizeHref(item.actionUrl || "");
  return `
    <details class="live-intel-row live-intel-row--${escapeHtml(item.severity || "info")}">
      <summary class="live-intel-row__summary" aria-label="${escapeHtml(`${title}. Open full note`)}">
        <span class="live-intel-row__icon">${renderIcon(item.icon || "info")}</span>
        <span class="live-intel-row__body">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(detail)}</span>
        </span>
        <span class="live-intel-row__chevron" aria-hidden="true">${renderIcon("chevronDown")}</span>
      </summary>
      <p class="live-intel-row__full">${escapeHtml(detail)}</p>
      ${actionUrl ? `
        <a class="live-intel-row__link" href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(item.actionLabel || "Open provider")}
          <span aria-hidden="true">${renderIcon("arrowRight")}</span>
        </a>
      ` : ""}
    </details>
  `;
}

export function renderProfileView() {
  const savedCount = state.savedPlaceIds ? state.savedPlaceIds.size : 156;
  const trips = state.getAllTrips ? state.getAllTrips() : [];
  const tripsCount = trips.length || 0;
  const momentsCount = Array.isArray(state.moments) ? state.moments.length : 0;
  const countriesCount = new Set(trips.map((trip) => trip.flag || trip.destination).filter(Boolean)).size || 1;
  const profile = state.userProfile || {};
  const activeSection = state.activeProfileSection || "profile";
  const customPersonas = profile.customPersonas || [];
  const personaDescriptions = new Map(TRAVELER_PERSONA_ARCHETYPES);
  const personas = [...new Set([...TRAVELER_PERSONA_ARCHETYPES.map(([label]) => label), ...customPersonas])];
  const activePersonas = personas.filter((persona) => state.userPreferences && state.userPreferences.has(persona));
  const orderedPersonas = [
    ...activePersonas,
    ...personas.filter((persona) => !(state.userPreferences && state.userPreferences.has(persona))),
  ];
  const isAdmin = Boolean(state.isAdmin);
  const futureTrips = trips.filter((trip) => isFutureTrip(trip));
  const companionTripId = state.profileCompanionTripId && futureTrips.some((trip) => trip.id === state.profileCompanionTripId)
    ? state.profileCompanionTripId
    : futureTrips[0]?.id || "";
  const companionTrip = futureTrips.find((trip) => trip.id === companionTripId) || null;
  const companions = companionTrip?.companions || [];
  const isSignedIn = ["admin", "traveler"].includes(state.userSession?.role);
  const displayName = isSignedIn ? (profile.name || "Traveler") : "Guest traveler";
  const membershipLabel = isSignedIn ? (profile.membership || "Traveler") : "Signed out";

  return `
    <div class="profile-page">
      ${renderHeader()}

      <div class="profile-page__content">
        <div class="profile-header-card card-pattern-poly">
          <button class="profile-avatar-wrap ${isSignedIn ? "" : "profile-avatar-wrap--signed-out"}" ${isSignedIn ? `data-action="change-avatar"` : `data-action="open-profile-section" data-profile-section="profile"`} type="button" title="${isSignedIn ? "Change profile picture" : "Sign in to use a profile picture"}" aria-label="${isSignedIn ? "Change profile picture" : "Sign in to use a profile picture"}">
            ${isSignedIn ? `<img src="${escapeHtml(state.userAvatar || profile.avatarUrl || "")}" alt="${escapeHtml(displayName)} avatar" onerror="this.style.display='none'" />` : ""}
            <span class="profile-avatar-fallback" aria-hidden="true">${renderIcon("user")}</span>
            ${isSignedIn ? `
              <span class="profile-avatar-edit-badge" title="Change photo">
                ${renderIcon("pencil")}
              </span>
            ` : ""}
          </button>
          ${isSignedIn ? `<input type="file" id="avatar-file-input" accept="image/*" style="display:none;" />` : ""}

          <h2 class="profile-user-name">${escapeHtml(displayName)}</h2>
          <div class="profile-user-badge">
            <span>${isSignedIn ? "💎" : renderIcon("logIn")}</span> ${escapeHtml(membershipLabel)}
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
              <span class="profile-stat-num">${momentsCount}</span>
              <span class="profile-stat-label">Moments</span>
            </div>
            <div class="profile-stat-box">
              <span class="profile-stat-num">${countriesCount}</span>
              <span class="profile-stat-label">Countries</span>
            </div>
          </div>
        </div>

        <div class="profile-menu-card profile-personas-card mb-sm">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 class="profile-menu-item__title" style="margin: 0; font-size: 0.95rem;">Traveler Personas & Interests</h4>
              <p class="profile-menu-item__sub" style="margin-top: 2px;">Enriches recommendations, concerts & live stay events</p>
            </div>
            <span class="profile-personas-count">${state.userPreferences?.size || 0} selected</span>
          </div>
          <div class="profile-active-personas" aria-label="Active traveler personas">
            ${activePersonas.length ? activePersonas.map((persona) => `
              <button class="profile-active-persona-pill" data-action="toggle-user-persona" data-persona="${escapeHtml(persona)}" type="button" aria-label="Turn off ${escapeHtml(persona)}">
                ${escapeHtml(persona)}
              </button>
            `).join("") : `
              <span class="profile-active-personas__empty">No active personas yet.</span>
            `}
          </div>
          <div class="profile-personas-scroll" tabindex="0" aria-label="All traveler personas and interests">
            <div class="profile-personas-grid">
              ${orderedPersonas.map(persona => {
              const isSelected = state.userPreferences && state.userPreferences.has(persona);
              const isCustom = customPersonas.includes(persona);
              const description = personaDescriptions.get(persona) || "Custom travel style.";
              return `
                <span class="profile-persona-chip-wrap">
                  <button class="profile-persona-chip ${isSelected ? "is-active" : ""}" data-action="toggle-user-persona" data-persona="${escapeHtml(persona)}" type="button" aria-pressed="${isSelected ? "true" : "false"}">
                    <span>
                      <strong class="profile-persona-chip__label">${escapeHtml(persona)}</strong>
                      <small>${escapeHtml(description)}</small>
                    </span>
                    <strong class="profile-persona-chip__status">${isSelected ? "On" : "Off"}</strong>
                  </button>
                  ${isAdmin && isCustom ? `
                    <button class="profile-persona-remove" data-action="remove-custom-persona" data-persona="${escapeHtml(persona)}" type="button" aria-label="Remove ${escapeHtml(persona)}">
                      ${renderIcon("x")}
                    </button>
                  ` : ""}
                </span>
              `;
              }).join("")}
            </div>
          </div>
          ${isAdmin ? `
            <form class="profile-persona-add-form" id="profile-persona-add-form">
              <label class="profile-field">
                <span>Add custom persona</span>
                <input name="personaLabel" type="text" maxlength="42" placeholder="e.g. Train Window Daydreamer" autocomplete="off" />
              </label>
              <button class="btn btn--primary btn--sm" type="submit">${renderIcon("plus")} Add</button>
            </form>
          ` : ""}
        </div>

        <div class="profile-section-tabs ${isAdmin ? "profile-section-tabs--admin" : ""}" aria-label="Profile settings sections">
          ${renderProfileSectionTab("profile", "user", "My profile", activeSection)}
          ${renderProfileSectionTab("preferences", "slidersHorizontal", "Travel preferences", activeSection)}
          ${renderProfileSectionTab("notifications", "bell", "Notifications", activeSection)}
          ${renderProfileSectionTab("privacy", "shieldCheck", "Privacy & security", activeSection)}
          ${isAdmin ? renderProfileSectionTab("services", "plugZap", "Services", activeSection) : ""}
        </div>

        ${renderProfileSettingsPanel(activeSection, profile, isAdmin)}

        ${renderAccountAccessPanel(isAdmin)}

        ${renderTravelCompanionsPanel(companionTrip, companions, futureTrips, companionTripId)}

        <div class="profile-activity-section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="profile-section-title">Your activity</h3>
            <button class="btn btn--link btn--xs" data-action="go-search">View saved</button>
          </div>

          <div class="profile-activity-grid">
            <button class="profile-activity-card" data-action="go-search" type="button">
              <span class="profile-activity-icon">🔖</span>
              <div>
                <h4 class="profile-activity-title">Saved places</h4>
                <p class="profile-activity-sub">${savedCount} places</p>
              </div>
            </button>

            <button class="profile-activity-card" data-action="go-plan" data-subtab="journal" type="button">
              <span class="profile-activity-icon">📥</span>
              <div>
                <h4 class="profile-activity-title">Your moments</h4>
                <p class="profile-activity-sub">${momentsCount} moments</p>
              </div>
            </button>

            <button class="profile-activity-card" data-action="go-home" type="button">
              <span class="profile-activity-icon">🗺️</span>
              <div>
                <h4 class="profile-activity-title">Your trips</h4>
                <p class="profile-activity-sub">${tripsCount} trips</p>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

function renderProfileSectionTab(id, icon, label, activeSection) {
  return `
    <button class="profile-section-tab ${activeSection === id ? "is-active" : ""}" data-action="open-profile-section" data-profile-section="${id}" type="button" aria-pressed="${activeSection === id ? "true" : "false"}">
      ${renderIcon(icon)}
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function renderProfileSettingsPanel(section, profile, isAdmin = false) {
  if (section === "preferences") return renderTravelPreferencesPanel(profile);
  if (section === "notifications") return renderNotificationsPanel(profile);
  if (section === "privacy") return renderPrivacyPanel(profile);
  if (section === "services" && isAdmin) return renderAdminServicesPanel();
  return renderMyProfilePanel(profile);
}

function renderMyProfilePanel(profile) {
  return `
    <section class="profile-settings-panel" aria-labelledby="profile-panel-title">
      <div class="profile-panel-header">
        <div>
          <h3 id="profile-panel-title">My profile</h3>
          <p>Personal details autosave on this device.</p>
        </div>
        <span class="profile-autosave-pill">${renderIcon("check")} Autosaved</span>
      </div>
      <div class="profile-form-grid">
        ${renderProfileTextField("Display name", "name", profile.name || "", "Thomas R.")}
        ${renderProfileTextField("Email", "email", profile.email || "", "you@example.com", "email")}
        ${renderProfileTextField("Home city", "homeCity", profile.homeCity || "", "Gdańsk")}
        ${renderProfileTextField("Home airport", "homeAirport", profile.homeAirport || "", "GDN", "text", 3)}
      </div>
    </section>
  `;
}

function renderTravelPreferencesPanel(profile) {
  return `
    <section class="profile-settings-panel" aria-labelledby="travel-panel-title">
      <div class="profile-panel-header">
        <div>
          <h3 id="travel-panel-title">Travel preferences</h3>
          <p>Used to tune trip ideas, concerts, routing and flight suggestions.</p>
        </div>
        <span class="profile-autosave-pill">${renderIcon("check")} Autosaved</span>
      </div>
      <div class="profile-form-grid">
        ${renderProfileSelect("Travel style", "travelStyle", profile.travelStyle || "balanced", [
          ["balanced", "Balanced"],
          ["culture", "Culture first"],
          ["food", "Food and coffee"],
          ["nightlife", "Music and nightlife"],
          ["outdoors", "Outdoor and slow travel"],
        ])}
        ${renderProfileSelect("Budget", "budget", profile.budget || "comfort", [
          ["lean", "Lean"],
          ["comfort", "Comfort"],
          ["premium", "Premium"],
        ])}
        ${renderProfileSelect("Seat preference", "seatPreference", profile.seatPreference || "window", [
          ["window", "Window"],
          ["aisle", "Aisle"],
          ["no-preference", "No preference"],
        ])}
        ${renderProfileSelect("Trip pace", "pace", profile.pace || "balanced", [
          ["slow", "Slow"],
          ["balanced", "Balanced"],
          ["packed", "Packed"],
        ])}
        <label class="profile-field profile-field--wide">
          <span>Accessibility notes</span>
          <textarea data-profile-field="accessibilityNotes" rows="3" placeholder="Mobility, dietary, sensory or planning notes">${escapeHtml(profile.accessibilityNotes || "")}</textarea>
        </label>
      </div>
    </section>
  `;
}

function renderNotificationsPanel(profile) {
  const notifications = profile.notifications || {};
  return `
    <section class="profile-settings-panel" aria-labelledby="notifications-panel-title">
      <div class="profile-panel-header">
        <div>
          <h3 id="notifications-panel-title">Notifications</h3>
          <p>Choose which trip alerts should appear in the app.</p>
        </div>
        <span class="profile-autosave-pill">${renderIcon("check")} Autosaved</span>
      </div>
      <div class="profile-toggle-list">
        ${renderProfileToggle("Trip reminders", "notifications", "tripReminders", notifications.tripReminders, "Itinerary nudges before scheduled activities.")}
        ${renderProfileToggle("Flight alerts", "notifications", "flightAlerts", notifications.flightAlerts, "Route and flight-search status updates.")}
        ${renderProfileToggle("Live recommendations", "notifications", "liveRecommendations", notifications.liveRecommendations, "Nearby suggestions while Live Journey Mode is on.")}
        ${renderProfileToggle("Weekly digest", "notifications", "weeklyDigest", notifications.weeklyDigest, "A quieter planning summary instead of frequent prompts.")}
      </div>
    </section>
  `;
}

function renderPrivacyPanel(profile) {
  const privacy = profile.privacy || {};
  return `
    <section class="profile-settings-panel" aria-labelledby="privacy-panel-title">
      <div class="profile-panel-header">
        <div>
          <h3 id="privacy-panel-title">Privacy & security</h3>
          <p>Control local personalization and live-mode permissions.</p>
        </div>
        <span class="profile-autosave-pill">${renderIcon("check")} Autosaved</span>
      </div>
      <div class="profile-toggle-list">
        ${renderProfileToggle("Cloud sync", "privacy", "cloudSync", privacy.cloudSync, "Use Cloudflare D1 for trips, itinerary events and moments.")}
        ${renderProfileToggle("Location in Live Mode", "privacy", "locationInLiveMode", privacy.locationInLiveMode, "Allow GPS-based nearby suggestions when you use Live Journey Mode.")}
        ${renderProfileToggle("Personalized recommendations", "privacy", "personalization", privacy.personalization, "Use saved personas and preferences to rank suggestions.")}
        ${renderProfileToggle("Product analytics", "privacy", "analytics", privacy.analytics, "Optional usage signals. Currently stored locally only.")}
      </div>
    </section>
  `;
}

const ADMIN_PROVIDER_GROUPS = [
  {
    title: "Missing In Production",
    description: "High-impact secrets that unlock live POIs, flights, concerts and enrichment.",
    items: [
      { name: "OpenTripMap", key: "OPENTRIPMAP_API_KEY", service: "opentripmap", required: true, area: "POIs, hidden gems, place details" },
      { name: "Amadeus client id", key: "AMADEUS_CLIENT_ID", service: "amadeus", required: true, area: "Airport search and live flight offers" },
      { name: "Amadeus client secret", key: "AMADEUS_CLIENT_SECRET", service: "amadeus", required: true, area: "Airport search and live flight offers" },
      { name: "Ticketmaster", key: "TICKETMASTER_API_KEY", service: "ticketmaster", required: true, area: "Events and concerts" },
      { name: "Bandsintown", key: "BANDSINTOWN_APP_ID", service: "bandsintown", required: true, area: "Concert discovery" },
    ],
  },
  {
    title: "Enrichment Media",
    description: "Optional image providers. Commons/Openverse work without keys; these improve coverage.",
    items: [
      { name: "Unsplash", key: "UNSPLASH_ACCESS_KEY", service: "unsplash", required: false, area: "Fallback place imagery" },
      { name: "Pexels", key: "PEXELS_API_KEY", service: "pexels", required: false, area: "Fallback place imagery" },
      { name: "Wikimedia Commons", service: "commons", noKey: true, area: "Verified open media" },
      { name: "Openverse", service: "openverse", noKey: true, area: "Open licensed imagery" },
    ],
  },
  {
    title: "Travel Intelligence",
    description: "Context providers for weather, signals, commute and civic/event intelligence.",
    items: [
      { name: "OpenStreetMap / Overpass", service: "overpass", noKey: true, area: "Nearby POIs and persona-biased scans" },
      { name: "Open-Meteo", service: "openmeteo", noKey: true, area: "Weather, sunrise, sunset" },
      { name: "NASA EONET", service: "nasaEonet", noKey: true, area: "Natural events and safety signals" },
      { name: "GBFS feeds", service: "gbfs", noKey: true, area: "Bike/scooter availability where city feeds exist" },
      { name: "OpenAgenda", key: "VITE_OPENAGENDA_API_KEY", service: "openagenda", required: false, frontendEnv: true, area: "Civic events where available" },
    ],
  },
  {
    title: "Cloudflare Platform",
    description: "Storage and session bindings that power account, companions, cache and media review flows.",
    items: [
      { name: "D1 database", binding: "d1", key: "TRIP_DB", required: true, area: "Trips, accounts, companions, place cache" },
      { name: "KV cache", binding: "kv", key: "TRIP_CACHE", required: false, area: "Provider cache and rate relief" },
      { name: "R2 media bucket", binding: "r2", key: "TRIP_MEDIA", required: false, area: "Original media storage" },
      { name: "D1 light media", binding: "lightMedia", key: "TRIP_DB", required: false, area: "Light media index fallback" },
      { name: "Admin bootstrap token", key: "TRIP_ADMIN_TOKEN", required: false, area: "Admin session bootstrap" },
      { name: "Admin bootstrap email", key: "TRIP_ADMIN_EMAIL", required: false, area: "Admin login bootstrap" },
      { name: "Admin bootstrap password", key: "TRIP_ADMIN_PASSWORD", required: false, area: "Admin login bootstrap" },
    ],
  },
];

function renderAdminServicesPanel() {
  const health = state.backendHealth || {};
  const readiness = getProductionEnrichmentReadiness(health);
  const missingRequired = getAdminProviderItems()
    .filter((item) => item.required && getProviderStatus(item, health).tone !== "ready");
  const readyCount = getAdminProviderItems()
    .filter((item) => getProviderStatus(item, health).tone === "ready").length;
  const totalCount = getAdminProviderItems().length;

  return `
    <section class="profile-settings-panel admin-services-panel" aria-labelledby="admin-services-title">
      <div class="profile-panel-header admin-services-panel__header">
        <div>
          <h3 id="admin-services-title">Enrichment services</h3>
          <p>Provider health, production secrets and service coverage for POIs, events, media and the enrichment center.</p>
        </div>
        <div class="admin-services-summary">
          <span class="admin-services-summary__score">${readyCount}/${totalCount} ready</span>
          <button class="btn btn--outline btn--sm" data-action="refresh-backend-health" type="button">${renderIcon("refreshCw")} Refresh</button>
        </div>
      </div>

      <div class="admin-service-progress" aria-label="Production enrichment readiness">
        <div class="admin-service-progress__top">
          <strong>${readiness.percent}% production enrichment level</strong>
          <span>${escapeHtml(readiness.label)}</span>
        </div>
        <div class="admin-service-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${readiness.percent}">
          <span style="width: ${readiness.percent}%"></span>
        </div>
        <p>${escapeHtml(readiness.detail)}</p>
      </div>

      <div class="admin-missing-keys">
        <span class="admin-missing-keys__label">Missing In Production</span>
        ${missingRequired.length ? `
          <div class="admin-missing-keys__list">
            ${missingRequired.map((item) => `<code>${escapeHtml(item.key)}</code>`).join("")}
          </div>
        ` : `
          <strong>All required high-impact keys look configured.</strong>
        `}
      </div>

      <div class="admin-provider-groups">
        ${ADMIN_PROVIDER_GROUPS.map((group) => renderAdminProviderGroup(group, health)).join("")}
      </div>

      <div class="admin-services-note">
        <strong>Secret install commands</strong>
        <code>npx wrangler secret put OPENTRIPMAP_API_KEY</code>
        <code>npx wrangler secret put AMADEUS_CLIENT_ID</code>
        <code>npx wrangler secret put AMADEUS_CLIENT_SECRET</code>
        <code>npx wrangler secret put TICKETMASTER_API_KEY</code>
        <code>npx wrangler secret put BANDSINTOWN_APP_ID</code>
      </div>
    </section>
  `;
}

function getAdminProviderItems() {
  return ADMIN_PROVIDER_GROUPS.flatMap((group) => group.items);
}

function getProductionEnrichmentReadiness(health = {}) {
  const items = getAdminProviderItems();
  const required = items.filter((item) => item.required);
  const optional = items.filter((item) => !item.required);
  const readyRequired = required.filter((item) => getProviderStatus(item, health).tone === "ready").length;
  const readyOptional = optional.filter((item) => getProviderStatus(item, health).tone === "ready").length;
  const requiredScore = required.length ? readyRequired / required.length : 1;
  const optionalScore = optional.length ? readyOptional / optional.length : 1;
  const percent = Math.round(requiredScore * 72 + optionalScore * 28);
  const missingRequired = required.length - readyRequired;

  if (missingRequired > 0) {
    return {
      percent,
      label: `${missingRequired} critical ${missingRequired === 1 ? "gap" : "gaps"} left`,
      detail: "Prioritize required production keys first; they unlock live POIs, flights, concerts and trip enrichment.",
    };
  }
  if (percent < 90) {
    return {
      percent,
      label: "Core live planning ready",
      detail: "Required services are in place. Optional media and civic providers can lift coverage and polish.",
    };
  }
  return {
    percent,
    label: "Strong production coverage",
    detail: "The enrichment center has the core provider coverage needed for true TRIP planning.",
  };
}

function renderAdminProviderGroup(group, health) {
  return `
    <div class="admin-provider-group">
      <div class="admin-provider-group__title">
        <strong>${escapeHtml(group.title)}</strong>
        <span>${escapeHtml(group.description)}</span>
      </div>
      <div class="admin-provider-list">
        ${group.items.map((item) => renderAdminProviderRow(item, health)).join("")}
      </div>
    </div>
  `;
}

function renderAdminProviderRow(item, health) {
  const status = getProviderStatus(item, health);
  return `
    <div class="admin-provider-row admin-provider-row--${status.tone}">
      <div class="admin-provider-row__main">
        <span class="admin-provider-row__dot" aria-hidden="true"></span>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.area || "")}</span>
        </div>
      </div>
      <div class="admin-provider-row__meta">
        ${item.key ? `<code>${escapeHtml(item.key)}</code>` : `<code>No key</code>`}
        <span>${escapeHtml(status.label)}</span>
      </div>
    </div>
  `;
}

function getProviderStatus(item, health = {}) {
  if (item.binding) {
    const value = health.bindings?.[item.binding] || "";
    if (value && value !== "missing") return { tone: "ready", label: value };
    return item.required ? { tone: "missing", label: "missing binding" } : { tone: "optional", label: "optional missing" };
  }

  if (item.noKey) {
    const value = health.services?.[item.service] || "ready";
    return value === "ready" ? { tone: "ready", label: "no key needed" } : { tone: "optional", label: value };
  }

  if (item.frontendEnv) {
    return { tone: "optional", label: "frontend env not reported by Worker" };
  }

  const secret = item.key ? health.secrets?.[item.key] : "";
  const service = item.service ? health.services?.[item.service] : "";
  if (secret === "configured" || service === "ready") return { tone: "ready", label: "configured" };
  if (health.status !== "connected") return item.required
    ? { tone: "unknown", label: "production health unavailable" }
    : { tone: "optional", label: "optional key" };
  return item.required ? { tone: "missing", label: "missing key" } : { tone: "optional", label: "optional key" };
}

function renderAccountAccessPanel(isAdmin) {
  const isSignedIn = ["admin", "traveler"].includes(state.userSession?.role);
  const roleLabel = isAdmin ? "Admin" : isSignedIn ? "Traveler" : "Guest";
  return `
    <section class="profile-settings-panel profile-account-panel" aria-labelledby="account-panel-title">
      <div class="profile-panel-header">
        <div>
          <h3 id="account-panel-title">Account access</h3>
          <p>${isSignedIn ? "Your account session is active for invite and cloud-backed trip actions." : "Sign in or create an account from an invite to sync travel-party access."}</p>
        </div>
        <span class="profile-session-pill profile-session-pill--${isAdmin ? "admin" : "guest"}">
          ${renderIcon(isAdmin ? "shieldCheck" : "user")}
          ${roleLabel}
        </span>
      </div>
      <div class="profile-account-quick-actions">
        <button class="profile-social-login-btn" data-action="social-auth" data-provider="Apple" type="button">
          <span></span>
          <strong>Apple</strong>
        </button>
        <button class="profile-social-login-btn" data-action="social-auth" data-provider="Google" type="button">
          <span>G</span>
          <strong>Google</strong>
        </button>
        <button class="profile-social-login-btn profile-social-login-btn--facebook" data-action="social-auth" data-provider="Facebook" type="button">
          <span>f</span>
          <strong>Facebook</strong>
        </button>
        <button class="profile-premium-mini-card" data-action="open-premium" type="button">
          ${renderIcon("sparkles")}
          <span>
            <strong>TRIP Premium</strong>
            <small>Support the app, unlock fewer limits.</small>
          </span>
        </button>
      </div>
      ${isSignedIn ? `
        <div class="profile-session-summary">
          <strong>${escapeHtml(state.userSession?.userId || roleLabel)}</strong>
          <span>${escapeHtml(state.userSession?.authType || "admin-session")}</span>
          <button class="btn btn--outline btn--sm" data-action="account-logout" type="button">${renderIcon("logOut")} Log out</button>
        </div>
      ` : `
        <form class="profile-login-form" id="profile-login-form">
          <label class="profile-field">
            <span>Email</span>
            <input name="email" type="email" value="${escapeHtml(state.userProfile?.email || "")}" autocomplete="username" required />
          </label>
          <label class="profile-field">
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button class="btn btn--primary btn--sm" type="submit">${renderIcon("logIn")} Sign in</button>
        </form>
      `}
      <div class="profile-theme-switcher" aria-label="Theme mode">
        <button class="${state.themeMode === "system" ? "is-active" : ""}" data-action="set-theme-mode" data-theme-mode="system" type="button">${renderIcon("monitor")} System</button>
        <button class="${state.themeMode === "light" ? "is-active" : ""}" data-action="set-theme-mode" data-theme-mode="light" type="button">${renderIcon("sun")} Light</button>
        <button class="${state.themeMode === "dark" ? "is-active" : ""}" data-action="set-theme-mode" data-theme-mode="dark" type="button">${renderIcon("moon")} Dark</button>
      </div>
    </section>
  `;
}

function renderTravelCompanionsPanel(trip, companions = [], trips = [], selectedTripId = trip?.id || "") {
  const snapshot = getInviteSnapshot(trip, companions);
  const hasFutureTrip = Boolean(selectedTripId && trip?.id);
  return `
    <section class="profile-settings-panel profile-companions-panel" aria-labelledby="companions-panel-title">
      <div class="profile-panel-header">
        <div>
          <h3 id="companions-panel-title">Travel companions</h3>
          <p>Invite people into ${escapeHtml(snapshot.tripTitle)} with a role, message and shareable invite link.</p>
        </div>
        <span class="profile-autosave-pill">${companions.length} invited</span>
      </div>

      <label class="profile-field profile-companion-trip-select">
        <span>Companion trip</span>
        <select data-action="set-profile-companion-trip" aria-label="Choose trip for companion invites" ${hasFutureTrip ? "" : "disabled"}>
          ${trips.map((item) => `
            <option value="${escapeHtml(item.id)}" ${item.id === selectedTripId ? "selected" : ""}>
              ${escapeHtml(`${item.flag ? `${item.flag} ` : ""}${item.destination || item.title || item.id}`)}
            </option>
          `).join("")}
        </select>
      </label>

      ${hasFutureTrip ? `
      <div class="profile-invite-preview">
        ${snapshot.coverImage ? `<img src="${escapeHtml(snapshot.coverImage)}" alt="" loading="lazy" />` : ""}
        <div>
          <strong>${escapeHtml(snapshot.tripTitle)}</strong>
          <span>${escapeHtml(snapshot.destination)} · ${escapeHtml(snapshot.dates)} · ${snapshot.travelersCount} travelers</span>
          <small>${escapeHtml(state.userProfile?.name || "Thomas")} invited you to join ${escapeHtml(snapshot.tripTitle)}.</small>
        </div>
      </div>

      <form class="profile-companion-form" id="profile-companion-form">
        <input type="hidden" name="tripId" value="${escapeHtml(selectedTripId)}" />
        <label class="profile-field">
          <span>Name</span>
          <input name="name" type="text" placeholder="Optional" autocomplete="name" />
        </label>
        <label class="profile-field">
          <span>Email</span>
          <input name="email" type="email" placeholder="friend@example.com" autocomplete="email" required />
        </label>
        <label class="profile-field">
          <span>Role</span>
          <select name="role">
            <option value="viewer">Viewer</option>
            <option value="planner">Planner</option>
            <option value="co-owner">Co-owner</option>
          </select>
        </label>
        <fieldset class="profile-invite-methods">
          <legend>Invite by</legend>
          ${renderInviteMethodOption("email", "mail", "Email", true)}
          ${renderInviteMethodOption("sms", "messageCircle", "SMS")}
          ${renderInviteMethodOption("whatsapp", "send", "WhatsApp")}
          ${renderInviteMethodOption("qr", "qrCode", "QR")}
          ${renderInviteMethodOption("link", "link", "Link")}
        </fieldset>
        <label class="profile-field profile-field--wide">
          <span>Personal message</span>
          <textarea name="personalMessage" rows="3" maxlength="500">Plan it. Live it. Remember it.</textarea>
        </label>
        <button class="btn btn--primary btn--sm" type="submit">${renderIcon("userPlus")} Invite</button>
      </form>

      <div class="profile-companion-list">
        ${companions.length ? companions.map((companion) => `
          <div class="profile-companion-item">
            <div class="profile-companion-row">
              <div class="profile-companion-avatar" aria-hidden="true">${escapeHtml(getCompanionInitials(companion))}</div>
              <div class="profile-companion-main">
                <strong>${escapeHtml(companion.name || companion.email)}</strong>
                <span>${escapeHtml(companion.email)} · ${escapeHtml(formatCompanionRole(companion.role))} · ${escapeHtml(formatInviteMethod(companion.inviteMethod))} · ${escapeHtml(companion.status || "invited")}</span>
                ${companion.personalMessage ? `<small>${escapeHtml(companion.personalMessage)}</small>` : ""}
              </div>
              <div class="profile-companion-actions">
                <a class="btn btn--icon btn--ghost" href="${escapeHtml(createMailtoInvite(companion, trip))}" aria-label="Send email invite">${renderIcon("mail")}</a>
                <a class="btn btn--icon btn--ghost" href="${escapeHtml(createSmsInvite(companion))}" aria-label="Send SMS invite">${renderIcon("messageCircle")}</a>
                <a class="btn btn--icon btn--ghost" href="${escapeHtml(createWhatsAppInvite(companion))}" target="_blank" rel="noopener" aria-label="Send WhatsApp invite">${renderIcon("send")}</a>
                <button class="btn btn--icon btn--ghost" data-action="copy-companion-invite" data-trip-id="${escapeHtml(selectedTripId)}" data-companion-id="${escapeHtml(companion.id)}" type="button" aria-label="Copy invite link">${renderIcon("copy")}</button>
                <button class="btn btn--icon btn--ghost" data-action="show-companion-qr" data-trip-id="${escapeHtml(selectedTripId)}" data-companion-id="${escapeHtml(companion.id)}" type="button" aria-label="Show QR invite">${renderIcon("qrCode")}</button>
                <button class="btn btn--icon btn--ghost" data-action="remove-trip-companion" data-trip-id="${escapeHtml(selectedTripId)}" data-companion-id="${escapeHtml(companion.id)}" type="button" aria-label="Remove companion">
                  ${renderIcon("trash")}
                </button>
              </div>
            </div>
            ${state.activeCompanionQrId === companion.id ? `
              <div class="profile-companion-qr">
                <img src="${escapeHtml(createQrInvite(companion))}" alt="QR code invite for ${escapeHtml(companion.name || companion.email)}" loading="lazy" />
                <span>Scan to open the trip invite.</span>
              </div>
            ` : ""}
          </div>
        `).join("") : `
          <div class="profile-companion-empty">
            <strong>No companions invited yet.</strong>
            <span>Add someone above to keep trip planning shared.</span>
          </div>
        `}
      </div>
      ` : `
        <div class="profile-companion-empty">
          <strong>Create a new trip to invite fellow travelers.</strong>
          <span>Travel companions can only be invited to upcoming trips.</span>
        </div>
      `}
    </section>
  `;
}

function renderInviteMethodOption(value, icon, label, checked = false) {
  return `
    <label>
      <input type="radio" name="inviteMethod" value="${escapeHtml(value)}" ${checked ? "checked" : ""} />
      <span>${renderIcon(icon)} ${escapeHtml(label)}</span>
    </label>
  `;
}

function renderProfileTextField(label, field, value, placeholder = "", type = "text", maxLength = "") {
  return `
    <label class="profile-field">
      <span>${escapeHtml(label)}</span>
      <input data-profile-field="${escapeHtml(field)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${maxLength ? `maxlength="${maxLength}"` : ""} />
    </label>
  `;
}

function renderProfileSelect(label, field, value, options = []) {
  return `
    <label class="profile-field">
      <span>${escapeHtml(label)}</span>
      <select data-profile-field="${escapeHtml(field)}">
        ${options.map(([optionValue, optionLabel]) => `
          <option value="${escapeHtml(optionValue)}" ${value === optionValue ? "selected" : ""}>${escapeHtml(optionLabel)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderProfileToggle(label, group, field, checked, description) {
  return `
    <label class="profile-toggle-row">
      <span>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(description)}</small>
      </span>
      <input type="checkbox" data-profile-group="${escapeHtml(group)}" data-profile-field="${escapeHtml(field)}" ${checked ? "checked" : ""} />
    </label>
  `;
}

function getCompanionInitials(companion = {}) {
  const source = companion.name || companion.email || "?";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function formatCompanionRole(role = "") {
  return String(role || "viewer")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatInviteMethod(method = "") {
  const labels = {
    email: "Email",
    sms: "SMS",
    whatsapp: "WhatsApp",
    qr: "QR code",
    link: "Share link",
  };
  return labels[String(method || "").toLowerCase()] || "Email";
}

function getInviteSnapshot(trip = {}, companions = []) {
  return {
    tripTitle: trip.title || trip.name || (trip.destination ? `Roadtrip ${trip.destination}` : "This trip"),
    destination: trip.destination || "Destination",
    dates: trip.dates || "Dates TBD",
    travelersCount: Math.max(1, companions.length + 1),
    coverImage: trip.coverImage || trip.image || trip.upcomingActivity?.image || "",
  };
}

function getCompanionInviteText(companion = {}, trip = {}) {
  if (companion.inviteText) return companion.inviteText;
  const snapshot = getInviteSnapshot(trip, []);
  return [
    `${state.userProfile?.name || "Thomas"} invited you to join ${companion.tripTitle || snapshot.tripTitle}.`,
    `${companion.destination || snapshot.destination} · ${companion.dates || snapshot.dates}`,
    `${companion.travelersCount || snapshot.travelersCount} travelers`,
    "",
    companion.personalMessage || "Plan it. Live it. Remember it.",
    companion.inviteUrl ? `Open invite: ${companion.inviteUrl}` : "",
  ].filter((line, index, lines) => line || (lines[index - 1] && lines[index + 1])).join("\n");
}

function createMailtoInvite(companion = {}, trip = {}) {
  const subject = `Trip invite: ${companion.tripTitle || trip?.destination || "our trip"}`;
  const body = getCompanionInviteText(companion, trip);
  return `mailto:${encodeURIComponent(companion.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function createSmsInvite(companion = {}) {
  return `sms:?&body=${encodeURIComponent(getCompanionInviteText(companion, state.activeTrip))}`;
}

function createWhatsAppInvite(companion = {}) {
  return `https://wa.me/?text=${encodeURIComponent(getCompanionInviteText(companion, state.activeTrip))}`;
}

function createQrInvite(companion = {}) {
  const inviteUrl = companion.inviteUrl || "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}`;
}

function getTripDestinationContext(trip = {}) {
  const destination = String(trip.destination || "").trim();
  if (destination) return destination;
  const city = state.locationResolved?.city || state.locationResolved?.town || state.locationResolved?.area || "";
  const country = state.locationResolved?.country || "";
  return [city, country].filter(Boolean).join(", ") || "trip area";
}

function getLivePersonaSummary() {
  const labels = Array.from(state.userPreferences || [])
    .map((persona) => String(persona || "").replace(/^[^\p{L}\p{N}]+/u, "").trim())
    .filter(Boolean);
  if (labels.length <= 3) return labels.join(", ");
  return `${labels.slice(0, 3).join(", ")} +${labels.length - 3}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeHref(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
