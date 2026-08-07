import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";
import { getTripDateStatus } from "../utils/tripDates.js";

export function renderHeader() {
  const isLanding = state.activeView === "landing";
  const isSignedIn = state.isAuthenticated;

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

  const trip = state.activeTrip || {
    id: "",
    destination: "No active trip",
    flag: renderIcon("map", "no-active-trip-icon"),
    dates: "No dates set",
    startDate: null,
    daysCount: 0,
    weather: { temp: "--°C", condition: "Fair", icon: "☀️" },
  };
  const profile = state.userProfile || {};
  const allTrips = state.getAllTrips();
  const hasTrip = Boolean((state.activeTrip && state.activeTrip.id) || (Array.isArray(allTrips) && allTrips.length > 0));
  const noTrip = !hasTrip;
  const liveDayTime = getLiveDayTimeFormatted();
  const dateStatus = getTripDateStatus(trip);
  const isDoneTrip = dateStatus.state === "done";
  const tripStage = getTripStage(dateStatus);
  const lifecycleLabel = getTripStageLabel(tripStage);

  const userWeather = state.userLocationWeather || (trip && trip.weather?.temp && trip.weather.temp !== "--°C" ? trip.weather : null) || {
    temp: "--°C",
    condition: "Fair",
    icon: "☀️",
    cityName: "",
  };
  const weatherCity = userWeather.cityName || "";

  return `
    <header class="app-header">
      <div class="app-header__top">
        <div class="brand-monogram" data-action="go-home">
          ${TRIP_LOGO_SVG("", 40)}
        </div>
        <div class="app-header__user">
          <div class="header-live-time-pill" title="Live Open-Meteo weather ${escapeHtml(weatherCity ? `in ${weatherCity}` : 'for current location')} & time">
            <span class="header-weather-badge">${userWeather.icon || '☀️'} ${userWeather.temp || '20°C'}</span>
            <span class="header-time-divider">•</span>
            <span class="live-time-marquee" aria-label="${escapeHtml(liveDayTime)}">
              <span class="live-time-text">${escapeHtml(liveDayTime)}</span>
              <span class="live-time-text" aria-hidden="true">${escapeHtml(liveDayTime)}</span>
            </span>
            <span class="status-light-dot" title="Status: Online"></span>
          </div>

          ${renderMobileThemeSwitch()}

          ${state.canShowConciergeAndAssistant ? `
            <button class="btn btn--primary btn--xs header-ai-concierge-btn" data-action="open-ai-concierge" type="button" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.76rem; font-weight: 600; background: linear-gradient(135deg, var(--journey-red) 0%, #B83A2C 100%); color: white; border: none; border-radius: 20px; box-shadow: 0 2px 8px rgba(217, 74, 58, 0.25);" aria-label="Open TRIP Travel Concierge" title="TRIP AI Concierge">
              ${renderIcon("sparkles")} <span>Concierge</span>
            </button>
          ` : ""}

          <button class="btn btn--icon btn--ghost" data-action="view-notifications" aria-label="Notifications" title="Notifications">
            ${renderIcon("bell")}
          </button>

          <button class="btn btn--icon btn--ghost" data-action="open-help" aria-label="Help" title="Help">
            ${renderIcon("circleHelp")}
          </button>

          ${isSignedIn ? `
            <button class="btn btn--icon btn--ghost header-account-btn" data-action="go-profile" aria-label="Open account" title="Account">
              ${renderIcon("user")}
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
        ${noTrip ? "" : `
          <span class="trip-lifecycle-pill trip-lifecycle-pill--${tripStage}" aria-label="${escapeHtml(lifecycleLabel)}">
            ${renderIcon(getTripStageIcon(tripStage))}
            <span>${escapeHtml(lifecycleLabel)}</span>
          </span>
        `}
        <div class="trip-context-card__header">
          <div class="trip-context-card__title-row">
            <div class="editable-trip-title ${noTrip ? 'editable-trip-title--disabled' : ''}" ${noTrip ? '' : 'data-action="edit-trip-title" title="Edit destination, dates, and trip location"'}>
              <h1 class="trip-title">${escapeHtml(trip.destination)} ${String(trip.flag || "").startsWith("<svg") ? trip.flag : escapeHtml(trip.flag)}</h1>
              <p class="trip-dates">${escapeHtml(trip.dates)}${isDoneTrip ? ` • Completed ${dateStatus.daysSinceEnd} ${dateStatus.daysSinceEnd === 1 ? "day" : "days"} ago` : ""}</p>
              ${noTrip ? "" : `
                <button class="btn btn--icon btn--ghost edit-pencil-btn" aria-label="Edit trip details">
                  ${renderIcon("pencil")}
                </button>
              `}
            </div>
            <div class="trip-actions-row">
              ${noTrip ? "" : `
                <div class="trip-selector-wrap">
                  <select class="trip-select-dropdown" data-action="select-trip-dropdown" aria-label="Select trip. Current trip: ${escapeHtml(trip.destination)}" title="${escapeHtml(`${trip.flag || ""} ${trip.destination || "Trip"}`.trim())}">
                    ${allTrips.map(t => {
                      return `<option value="${t.id}" ${t.id === trip.id ? 'selected' : ''} label="${escapeHtml(t.flag || "•")}">${escapeHtml(t.flag || "•")}</option>`;
                    }).join('')}
                  </select>
                </div>
                <button class="btn btn--outline btn--icon" data-action="toggle-map-view" title="Toggle Map">
                  ${renderIcon("map")}
                </button>
              `}
              ${renderTripActionBar({ hasTrip: !noTrip })}
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}

function renderTripActionBar({ hasTrip }) {
  const secondarySegments = hasTrip ? `
    <button
      class="trip-action-bar__segment"
      type="button"
      data-action="share-trip"
      title="Share trip"
      aria-label="Share trip"
    >
      ${renderIcon("share")}
      <span class="trip-action-bar__label">Share</span>
    </button>
    <span class="trip-action-bar__divider" aria-hidden="true"></span>
    <button
      class="trip-action-bar__segment"
      type="button"
      data-action="open-trip-manager"
      title="Manage trips"
      aria-label="Manage trips"
    >
      ${renderIcon("flag")}
      <span class="trip-action-bar__label">Manage</span>
    </button>
    <span class="trip-action-bar__divider" aria-hidden="true"></span>
  ` : "";

  return `
    <div class="trip-action-bar" role="group" aria-label="Trip actions">
      ${secondarySegments}
      <button
        class="trip-action-bar__segment trip-action-bar__segment--primary"
        type="button"
        data-action="create-trip"
        title="Create a new custom trip"
        aria-label="Create a new trip"
      >
        ${renderIcon("plus")}
        <span class="trip-action-bar__label">New trip</span>
      </button>
    </div>
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

function getTripStageLabel(stage) {
  if (stage === "remember") return "Remember mode";
  if (stage === "live") return "Live mode";
  return "Planning mode";
}

function getTripStageIcon(stage) {
  if (stage === "remember") return "heart";
  if (stage === "live") return "compassRose";
  return "mapPin";
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
