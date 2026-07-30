import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";
import { getTripDateStatus } from "../utils/tripDates.js";
import ribbonLive from "../assets/trip_badge_clean_ribbon_live.webp";
import ribbonPlan from "../assets/trip_badge_clean_ribbon_planning.webp";
import ribbonRemember from "../assets/trip_badge_clean_ribbon_rmbr.webp";

export function renderHeader() {
  const isLanding = state.activeView === "landing";
  const isSignedIn = ["admin", "traveler"].includes(state.userSession?.role);

  if (isLanding) {
    return `
      <header class="top-nav top-nav--landing">
        <div class="top-nav__brand" data-action="go-home" role="button" tabindex="0" aria-label="Go to home">
          ${TRIP_LOGO_SVG("", 48)}
        </div>
        <div class="top-nav__actions">
          ${renderMobileThemeSwitch()}
          ${isSignedIn ? `
            <button class="btn btn--primary btn--sm landing-login-btn" data-action="go-app">
              <span>Open TRIP</span>
              ${renderIcon("arrowRight")}
            </button>
          ` : `
            <button class="btn btn--primary btn--sm landing-login-btn" data-action="open-auth-panel" data-auth-mode="login">
              <span>Login</span>
              ${renderIcon("arrowRight")}
            </button>
          `}
        </div>
      </header>
    `;
  }

  const trip = state.activeTrip;
  const profile = state.userProfile || {};
  const allTrips = state.getAllTrips();
  const liveDayTime = getLiveDayTimeFormatted();
  const dateStatus = getTripDateStatus(trip);
  const isDoneTrip = dateStatus.state === "done";
  const tripStage = getTripStage(dateStatus);
  const ribbon = getTripRibbon(tripStage);

  return `
    <header class="app-header">
      <div class="app-header__top">
        <div class="brand-monogram" data-action="go-home">
          ${TRIP_LOGO_SVG("", 40)}
        </div>
        <div class="app-header__user">
          <div class="header-live-time-pill" title="Live Open-Meteo weather in ${escapeHtml(trip.destination.split(',')[0])} & time">
            <span class="header-weather-badge">${trip.weather?.icon || '☀️'} ${trip.weather?.temp || '20°C'}</span>
            <span class="header-time-divider">•</span>
            <span class="live-time-marquee" aria-label="${escapeHtml(liveDayTime)}">
              <span class="live-time-text">${escapeHtml(liveDayTime)}</span>
              <span class="live-time-text" aria-hidden="true">${escapeHtml(liveDayTime)}</span>
            </span>
            <span class="status-light-dot" title="Status: Online"></span>
          </div>

          ${renderMobileThemeSwitch()}

          <button class="btn btn--icon btn--ghost" data-action="view-notifications" aria-label="Notifications" title="Notifications">
            ${renderIcon("bell")}
          </button>

          <button class="btn btn--icon btn--ghost" data-action="open-help" aria-label="Help" title="Help">
            ${renderIcon("circleHelp")}
          </button>

          ${isSignedIn ? `
            <button class="btn btn--icon btn--ghost header-logout-btn" data-action="instant-logout" aria-label="Log out" title="Log out">
              ${renderIcon("logOut")}
            </button>
          ` : ""}

          <div class="avatar-badge ${isSignedIn ? "" : "avatar-badge--signed-out"}" data-action="go-profile" title="${isSignedIn ? "View profile" : "Sign in"}">
            ${isSignedIn ? `
              <img src="${state.userAvatar || profile.avatarUrl || ""}" alt="${escapeHtml(profile.name || "Traveler")} avatar" class="avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" />
            ` : ""}
            <div class="header-profile-icon-fallback" aria-label="${isSignedIn ? "Profile" : "Sign in"}">
              ${renderIcon("user")}
            </div>
            ${isSignedIn ? `<span class="avatar-online-dot"></span>` : ""}
          </div>
        </div>
      </div>

      <div class="trip-context-card trip-context-card--${tripStage}">
        <div class="trip-stage-ribbon trip-stage-ribbon--${tripStage}" aria-label="${escapeHtml(ribbon.label)}">
          <img class="trip-stage-ribbon__image" src="${ribbon.src}" alt="" aria-hidden="true" />
          <span class="trip-stage-ribbon__label">${escapeHtml(ribbon.label)}</span>
        </div>
        <div class="trip-context-card__header">
          <div class="card-eyebrow-row">
            <div class="trip-selector-wrap">
              <select class="trip-select-dropdown" data-action="select-trip-dropdown" aria-label="Select trip. Current trip: ${escapeHtml(trip.destination)}" title="${escapeHtml(`${trip.flag || ""} ${trip.destination || "Trip"}`.trim())}">
                ${allTrips.map(t => {
                  return `<option value="${t.id}" ${t.id === trip.id ? 'selected' : ''} label="${escapeHtml(t.flag || "•")}">${escapeHtml(t.flag || "•")}</option>`;
                }).join('')}
              </select>
            </div>
          </div>

          <div class="trip-context-card__title-row">
            <div class="editable-trip-title" data-action="edit-trip-title" title="Edit destination, dates, and trip location">
              <h1 class="trip-title">${escapeHtml(trip.destination)} ${trip.flag}</h1>
              <p class="trip-dates">${escapeHtml(trip.dates)}${isDoneTrip ? ` • Completed ${dateStatus.daysSinceEnd} ${dateStatus.daysSinceEnd === 1 ? "day" : "days"} ago` : ""}</p>
              <button class="btn btn--icon btn--ghost edit-pencil-btn" aria-label="Edit trip details">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <div class="trip-actions-row">
              <button class="btn btn--outline btn--icon" data-action="toggle-map-view" title="Toggle Map">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>
              </button>
              <button class="btn btn--outline btn--sm share-btn" data-action="share-trip" title="Share trip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                <span class="share-btn-text">Share</span>
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
        </div>
      </div>
    </header>
  `;
}

function renderMobileThemeSwitch() {
  const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  const currentTheme = state.themeMode === "system" ? systemTheme : state.themeMode;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  const icon = currentTheme === "dark" ? "sun" : "moon";
  const label = currentTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return `
    <button class="btn btn--icon btn--ghost mobile-theme-toggle is-${currentTheme}" data-action="set-theme-mode" data-theme-mode="${nextTheme}" aria-label="${label}" title="${label}">
      ${renderIcon(icon)}
    </button>
  `;
}

function getTripStage(dateStatus) {
  if (dateStatus.state === "done") return "remember";
  if (dateStatus.state === "active") return "live";
  return "plan";
}

function getTripRibbon(stage) {
  if (stage === "remember") return { src: ribbonRemember, label: "Remember mode" };
  if (stage === "live") return { src: ribbonLive, label: "Live mode" };
  return { src: ribbonPlan, label: "Planning mode" };
}

function getLiveDayTimeFormatted() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.weekday || ""} ${parts.day || ""} ${parts.month || ""} ${parts.hour || "00"}:${parts.minute || "00"}`.trim();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
