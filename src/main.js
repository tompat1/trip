import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { state } from "./state.js";
import { renderHomeView } from "./views/HomeView.js";
import { renderPlanView } from "./views/PlanView.js";
import { renderSearchResults, renderSearchView } from "./views/SearchView.js";
import { renderLandingView } from "./views/LandingView.js";
import { renderLiveView, renderProfileView } from "./views/LiveView.js";
import { renderBottomNav } from "./components/BottomNav.js";
import { renderLightbox } from "./components/Lightbox.js";
import { renderEventDrawer } from "./components/EventDrawer.js";
import { renderTripCreateModal } from "./components/TripCreateModal.js";
import { renderQuickCaptureWidget } from "./components/QuickCaptureWidget.js";
import { renderOnboardingWalkthrough } from "./components/OnboardingWalkthrough.js";
import { fetchConcertsForTrip } from "./services/concertService.js";
import { fetchOpenMeteoWeather } from "./services/weatherService.js";
import { formatAirportLabel, getFlightRouteDisplay, resolveAirportInput, searchAirportsWorldwide } from "./services/airportService.js";
import { normalizeFlightType } from "./services/flightService.js";
import { formatTripDateRangeFromParts } from "./utils/tripDates.js";
import { enrichmentService } from "./enrichment/enrichmentService.js";
import "./styles.css";

let activeMaps = new Map();

const PLAN_EVENT_LOCATION_COORDS = {
  "cdg airport": [49.0097, 2.5479],
  "1st arrondissement": [48.8606, 2.3376],
  "louvre museum": [48.8606, 2.3376],
  versailles: [48.8049, 2.1204],
  "versailles palace": [48.8049, 2.1204],
  "3rd arrondissement": [48.8635, 2.3591],
  "le marais": [48.8575, 2.3592],
  "saint-germain": [48.8542, 2.3332],
  "cafe de flore": [48.8542, 2.3332],
  "champ de mars": [48.8556, 2.2986],
  "eiffel tower": [48.8584, 2.2945],
  "9th arrondissement": [48.8719, 2.3316],
  "opera garnier": [48.8719, 2.3316],
  "latin quarter": [48.8518, 2.3450],
  "la latina, madrid": [40.4114, -3.7088],
  "la latina": [40.4114, -3.7088],
  "plaza mayor, madrid": [40.4155, -3.7074],
  "sagrada familia": [41.4036, 2.1744],
  "knossos palace": [35.298, 25.1631],
  "heraklion museum": [35.339, 25.1373],
  "archaeological museum": [35.339, 25.1373],
  "koules fortress": [35.3444, 25.137],
  "old venetian harbor": [35.3444, 25.137],
  "ammoudara beach": [35.333, 25.085],
  "lions square": [35.3391, 25.132],
};

const TRIP_DESTINATION_COORDS = {
  paris: [48.8566, 2.3522],
  france: [48.8566, 2.3522],
  copenhagen: [55.6761, 12.5683],
  denmark: [55.6761, 12.5683],
  tokyo: [35.6762, 139.6503],
  japan: [35.6762, 139.6503],
  madrid: [40.4168, -3.7038],
  barcelona: [41.3874, 2.1686],
  spain: [40.4168, -3.7038],
  heraklion: [35.3391, 25.132],
  crete: [35.3391, 25.132],
  london: [51.5072, -0.1276],
  "new york": [40.7128, -74.0060],
  rome: [41.9028, 12.4964],
  lisbon: [38.7223, -9.1393],
  berlin: [52.5200, 13.4050],
  amsterdam: [52.3676, 4.9041],
};

function render() {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  const view = state.activeView;

  let viewHtml = "";
  if (view === "landing") {
    viewHtml = renderLandingView();
  } else if (view === "home") {
    viewHtml = renderHomeView();
  } else if (view === "plan") {
    viewHtml = renderPlanView();
  } else if (view === "search") {
    viewHtml = renderSearchView();
  } else if (view === "live") {
    viewHtml = renderLiveView();
  } else if (view === "profile") {
    viewHtml = renderProfileView();
  } else {
    viewHtml = renderHomeView();
  }

  // Include floating bottom navigation dock for non-landing views
  const bottomNavHtml = view !== "landing" ? renderBottomNav() : "";
  const quickCaptureHtml = view !== "landing" ? renderQuickCaptureWidget() : "";
  const lightboxHtml = renderLightbox();
  const drawerHtml = renderEventDrawer();
  const tripCreateHtml = renderTripCreateModal();
  const inviteAcceptanceHtml = renderInviteAcceptance();
  const onboardingHtml = renderOnboardingWalkthrough();

  appEl.innerHTML = `
    <div class="app-view app-view--${view}">
      ${viewHtml}
      ${bottomNavHtml}
      ${quickCaptureHtml}
      ${lightboxHtml}
      ${drawerHtml}
      ${tripCreateHtml}
      ${inviteAcceptanceHtml}
      ${onboardingHtml}
    </div>
  `;

  // Initialize maps after DOM update
  requestAnimationFrame(() => {
    initMapsForView(view);
  });
}

function renderInviteAcceptance() {
  const invite = state.activeInvite;
  if (!invite || invite.status === "accepted") return "";
  const trip = state.activeTrip;
  const title = trip.title || trip.name || (trip.destination ? `Roadtrip ${trip.destination}` : "This trip");
  const coverImage = trip.coverImage || trip.image || trip.upcomingActivity?.image || "";
  const travelersCount = Math.max(1, (trip.companions || []).length + 1);
  const isKnownUser = ["admin", "traveler"].includes(state.userSession?.role);
  const isAccountMode = invite.mode === "account";
  return `
    <section class="trip-invite-acceptance" aria-label="Trip invitation">
      ${coverImage ? `<img src="${escapeHtml(coverImage)}" alt="" loading="lazy" />` : ""}
      <div class="trip-invite-acceptance__copy">
        <span>Trip invitation</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(trip.destination || "Destination")} · ${escapeHtml(trip.dates || "Dates TBD")} · ${travelersCount} travelers</small>
      </div>
      ${isAccountMode ? `
        <form class="trip-invite-account-form" id="trip-invite-account-form">
          <input name="name" type="text" value="${escapeHtml(state.userProfile?.name || "")}" autocomplete="name" placeholder="Your name" required />
          <input name="email" type="email" value="${escapeHtml(state.userProfile?.email || "")}" autocomplete="email" placeholder="you@example.com" required />
          <input name="password" type="password" autocomplete="new-password" placeholder="Create password" minlength="8" required />
          <button class="btn btn--primary btn--sm" type="submit">Create Account</button>
          <button class="btn btn--ghost btn--sm" data-action="show-invite-options" type="button">Back</button>
        </form>
      ` : `
        <div class="trip-invite-acceptance__actions">
          <button class="btn btn--primary btn--sm" data-action="accept-trip-invite" data-invite-mode="${isKnownUser ? "user" : "guest"}" type="button">
            ${isKnownUser ? "Join instantly" : "Continue as Guest"}
          </button>
          ${!isKnownUser ? `<button class="btn btn--outline btn--sm" data-action="create-account-from-invite" type="button">Create Account</button>` : ""}
          <button class="btn btn--icon btn--ghost" data-action="dismiss-trip-invite" type="button" aria-label="Dismiss invitation">×</button>
        </div>
      `}
    </section>
  `;
}

function initMapsForView(view) {
  // Cleanup old maps
  activeMaps.forEach((map) => {
    try { map.remove(); } catch (e) {}
  });
  activeMaps.clear();

  const trip = state.activeTrip;

  if (view === "home") {
    const container = document.getElementById("home-map-container");
    if (container) {
      const map = L.map(container, { zoomControl: false, attributionControl: false }).setView(trip.center, trip.zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      // Add pins
      (trip.mapPins || []).forEach((pin) => {
        const marker = L.marker([pin.lat, pin.lng]).addTo(map);
        marker.bindPopup(`<b>${pin.name}</b>`);
      });

      activeMaps.set("home", map);
    }
  } else if (view === "search") {
    const container = document.getElementById("search-map-container");
    if (container) {
      // Copenhagen center
      const map = L.map(container, { zoomControl: false, attributionControl: false }).setView([55.6761, 12.5683], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      // Add numbered markers 1-5
      const pins = [
        { lat: 55.69, lng: 12.57, num: 1 },
        { lat: 55.688, lng: 12.558, num: 2 },
        { lat: 55.683, lng: 12.56, num: 3 },
        { lat: 55.669, lng: 12.562, num: 4 },
        { lat: 55.695, lng: 12.575, num: 5 }
      ];

      pins.forEach((p) => {
        const icon = L.divIcon({
          className: "custom-map-num-pin",
          html: `<div style="background:#171817; color:#fff; font-weight:800; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; border:2px solid #fff;">${p.num}</div>`,
          iconSize: [24, 24]
        });
        L.marker([p.lat, p.lng], { icon }).addTo(map);
      });

      activeMaps.set("search", map);
    }
  } else if (view === "live") {
    const container = document.getElementById("live-map-container");
    if (container) {
      const map = L.map(container, { zoomControl: true }).setView(trip.center, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      activeMaps.set("live", map);
    }
  } else if (view === "plan" && state.planViewMode === "map") {
    const container = document.getElementById("plan-map-container");
    if (container) {
      const map = L.map(container, { zoomControl: true }).setView(trip.center, trip.zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const mappedEvents = getMappedCalendarEvents(trip, state.mapDayFilter);

      mappedEvents.forEach(({ event, coordinates, index }) => {
        const marker = L.marker(coordinates, {
          icon: createPlanEventMarkerIcon(event),
        }).addTo(map);

        marker.bindPopup(`
          <div class="plan-map-popup">
            <strong>${escapeHtml(event.title)}</strong>
            <span>${escapeHtml(event.dayName || `Day ${Number(event.dayIndex || 0) + 1}`)} · ${escapeHtml(event.startTime || "")}${event.endTime ? ` – ${escapeHtml(event.endTime)}` : ""}</span>
            ${event.location ? `<span>${escapeHtml(event.location)}</span>` : ""}
            <button class="btn btn--primary btn--xs" data-action="open-edit-drawer" data-event-id="${escapeHtml(event.id)}">Edit</button>
          </div>
        `);
      });

      if (mappedEvents.length) {
        const bounds = L.latLngBounds(mappedEvents.map(({ coordinates }) => coordinates));
        map.fitBounds(bounds.pad(0.18), { maxZoom: 14 });
      }

      activeMaps.set("plan", map);
    }
  }
}

function getMappedCalendarEvents(trip, dayIndex = null) {
  return (trip.calendarEvents || [])
    .filter((event) => dayIndex === null || dayIndex === undefined || Number(event.dayIndex) === Number(dayIndex))
    .map((event, index) => ({
      event,
      index,
      coordinates: resolveCalendarEventCoordinates(event, trip) || createFallbackEventCoordinates(trip, index),
    }))
    .filter((item) => item.coordinates);
}

function resolveCalendarEventCoordinates(event, trip) {
  const directLat = Number(event.lat ?? event.latitude);
  const directLng = Number(event.lng ?? event.longitude);
  if (Number.isFinite(directLat) && Number.isFinite(directLng)) return [directLat, directLng];

  const eventKeys = [
    event.location,
    event.title,
    `${event.title || ""} ${event.location || ""}`,
  ].map(normalizeMapLookupKey).filter(Boolean);

  for (const key of eventKeys) {
    if (PLAN_EVENT_LOCATION_COORDS[key]) return PLAN_EVENT_LOCATION_COORDS[key];
  }

  const pins = trip.mapPins || [];
  const matchedPin = pins.find((pin) => {
    const pinKey = normalizeMapLookupKey(pin.name);
    return eventKeys.some((key) => key.includes(pinKey) || pinKey.includes(key));
  });

  if (matchedPin && Number.isFinite(Number(matchedPin.lat)) && Number.isFinite(Number(matchedPin.lng))) {
    return [Number(matchedPin.lat), Number(matchedPin.lng)];
  }

  return null;
}

function createFallbackEventCoordinates(trip, index) {
  const center = trip.center || [];
  const lat = Number(center[0]);
  const lng = Number(center[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const angle = index * 0.9;
  const radius = 0.008 + (index % 4) * 0.002;
  return [lat + Math.sin(angle) * radius, lng + Math.cos(angle) * radius];
}

function normalizeMapLookupKey(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function createPlanEventMarkerIcon(event) {
  const dayNumber = Number(event.dayIndex || 0) + 1;
  return L.divIcon({
    className: "plan-map-event-marker",
    html: `
      <div class="plan-map-event-marker__pin event-card--${event.colorScheme || "peach"}">
        <span>${dayNumber}</span>
      </div>
    `,
    iconSize: [34, 40],
    iconAnchor: [17, 36],
    popupAnchor: [0, -34],
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getActiveCompanionById(companionId = "") {
  return (state.activeTrip?.companions || []).find((companion) => companion.id === companionId);
}

function getInviteText(companion = {}) {
  if (companion.inviteText) return companion.inviteText;
  const trip = state.activeTrip || {};
  const tripTitle = companion.tripTitle || trip.title || trip.name || (trip.destination ? `Roadtrip ${trip.destination}` : "this trip");
  return [
    `${state.userProfile?.name || "Thomas"} invited you to join ${tripTitle}.`,
    `${companion.destination || trip.destination || "Destination"} · ${companion.dates || trip.dates || "Dates TBD"}`,
    `${companion.travelersCount || Math.max(1, (trip.companions || []).length + 1)} travelers`,
    "",
    companion.personalMessage || "Plan it. Live it. Remember it.",
    companion.inviteUrl ? `Open invite: ${companion.inviteUrl}` : "",
  ].filter((line, index, lines) => line || (lines[index - 1] && lines[index + 1])).join("\n");
}

async function copyInviteToClipboard(companion = {}) {
  const text = companion.inviteUrl || getInviteText(companion);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

async function deliverCompanionInvite(companion = {}) {
  const method = companion.inviteMethod || "email";
  const text = getInviteText(companion);
  if (method === "sms") {
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  } else if (method === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  } else if (method === "qr") {
    state.toggleCompanionQr(companion.id);
  } else if (method === "link") {
    await copyInviteToClipboard(companion);
  } else {
    const subject = `Trip invite: ${companion.tripTitle || state.activeTrip?.destination || "our trip"}`;
    window.location.href = `mailto:${encodeURIComponent(companion.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }
}

function openCompanionInviteFlow(defaultMethod = "link") {
  state.setView("profile");
  requestAnimationFrame(() => {
    const form = document.getElementById("profile-companion-form");
    if (!form) return;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    const methodInput = form.querySelector(`input[name="inviteMethod"][value="${defaultMethod}"]`);
    if (methodInput) methodInput.checked = true;
    form.querySelector("input[name='email']")?.focus();
  });
}

// Global Event Listeners Delegation
document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-nav], [data-action], [data-subtab], [data-viewmode], [data-day-select], [data-map-day-filter], [data-trip-length], [data-cat], [data-subfilter]");
  if (!target) {
    if (!e.target.closest?.(".airport-autocomplete")) closeAirportAutocompleteMenus();
    return;
  }

  if (target.dataset.action === "select-airport-suggestion") {
    const wrapper = target.closest(".airport-autocomplete");
    const input = wrapper?.querySelector(".airport-autocomplete-input");
    if (input) {
      input.value = target.dataset.airportValue || "";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();
      updateTripCreateRoutePreview(input.form);
    }
    closeAirportAutocompleteMenus();
    return;
  }

  // Bottom dock navigation
  if (target.dataset.nav) {
    const nav = target.dataset.nav;
    if (nav === "live" && !state.tripMode) {
      const confirmActivate = confirm(`📍 Live Journey Mode requires Trip Mode ON.\n\nWould you like to activate Trip Mode for ${state.activeTrip.destination}?`);
      if (confirmActivate) {
        state.toggleTripMode(true);
        state.setView("live");
      }
      return;
    }
    if (nav === "plan") state.setPlanSubTab("overview");
    state.setView(nav);
    return;
  }

  // Data action handlers
  const action = target.dataset.action;
  if (action) {
    if (action === "go-app" || action === "go-home") state.setView("home");
    else if (action === "go-plan") {
      if (target.dataset.subtab) state.setPlanSubTab(target.dataset.subtab);
      state.setView("plan");
    }
    else if (action === "go-plan-timeline") {
      state.setPlanSubTab("plan");
      state.setPlanViewMode("timeline");
      state.setView("plan");
    }
    else if (action === "go-search") state.setView("search");
    else if (action === "go-live") state.setView("live");
    else if (action === "go-moments") {
      state.setView("plan");
      state.setPlanSubTab("journal");
    }
    else if (action === "go-profile") state.setView("profile");
    else if (action === "switch-to-landing") state.setView("landing");
    else if (action === "refresh-weather") {
      state.refreshWeather();
    }
    else if (action === "refresh-trip-ideas") {
      showToast("Refreshing trip ideas...");
      const result = await state.refreshTourismDiscovery(state.activeTripId, { force: true });
      if (result?.status === "error") {
        showToast("Could not refresh trip ideas. Showing saved ideas.");
      } else if (result?.status === "not-configured") {
        showToast("OpenTripMap key missing. Showing available OSM and saved ideas.");
      } else {
        showToast("Trip ideas refreshed.");
      }
    }
    else if (action === "refresh-trip-events") {
      showToast("Refreshing events...");
      const result = await state.refreshEventDiscovery(state.activeTripId, { force: true });
      if (result?.status === "error") {
        showToast("Could not refresh live events. Showing saved events.");
      } else if (result?.status === "fallback") {
        showToast("Live event providers returned no new matches. Showing saved events.");
      } else {
        showToast("Events refreshed.");
      }
    }
    else if (action === "refresh-trip-intelligence") {
      showToast("Refreshing trip intelligence...");
      const result = await state.refreshTripIntelligence(state.activeTripId, { force: true });
      if (result?.status === "error") {
        showToast("Could not refresh travel signals right now.");
      } else {
        const okCount = (result?.providerStatus || []).filter((provider) => provider.status === "ok").length;
        showToast(okCount ? `Trip intelligence refreshed from ${okCount} live sources.` : "Trip intelligence refreshed with available fallbacks.");
      }
    }
    else if (action === "search-trip-flights") {
      showToast("Searching flights for this route...");
      await state.searchFlightsForActiveTrip();
      const search = state.activeTrip.flightSearch || {};
      if (search.status === "ready" && search.source === "amadeus") {
        showToast(`Found ${search.offers.length} live flight options.`);
      } else if (search.offers?.length) {
        showToast(`Showing ${search.offers.length} route-based flight estimates.`);
      } else {
        showToast("No flight options found for this route yet.");
      }
    }
    else if (action === "view-notifications") {
      state.setProfileSection("notifications");
      state.setView("profile");
    }
    else if (action === "invite-companions") {
      state.setView("profile");
      setTimeout(() => document.getElementById("profile-companion-form")?.querySelector("input[name='email']")?.focus(), 0);
    }
    else if (action === "toggle-filters") {
      const subFilter = state.searchSubFilter === "top-rated" ? "all" : "top-rated";
      state.setSearchSubFilter(subFilter);
    }
    else if (action === "search-this-area") {
      alert(`📍 Re-indexing places near map center for ${state.activeTrip.destination}...`);
    }
    else if (action === "show-about") {
      alert(`TRIP - Travel Planner Deluxe\n\nMobile-first responsive travel planning & memory platform powered by Cloudflare Workers & Open-Meteo.`);
    }
    else if (action === "switch-trip" || action === "toggle-trip-switch" || action === "cycle-next-trip") {
      state.cycleNextTrip();
    }
    else if (action === "toggle-quick-capture") {
      state.toggleQuickCapture();
    }
    else if (action === "close-quick-capture") {
      if (target.classList.contains("quick-capture-overlay") && e.target !== target) return;
      state.toggleQuickCapture(false);
    }
    else if (action === "change-avatar") {
      const fileInput = document.getElementById("avatar-file-input");
      if (fileInput) {
        fileInput.click();
      } else {
        const newUrl = prompt("Enter profile picture image URL:", state.userAvatar);
        if (newUrl && newUrl.trim()) {
          state.updateUserAvatar(newUrl.trim());
          showToast("📸 Profile photo updated!");
        }
      }
    }
    else if (action === "open-profile-section") {
      state.setProfileSection(target.dataset.profileSection || "profile");
    }
    else if (action === "toggle-user-persona") {
      const persona = target.dataset.persona;
      if (persona) {
        state.toggleUserPreference(persona);
        const isActive = state.userPreferences && state.userPreferences.has(persona);
        showToast(isActive ? `✨ Profile updated with ${persona}!` : `Removed ${persona} from profile.`);
      }
    }
    else if (action === "remove-custom-persona") {
      const persona = target.dataset.persona;
      if (state.removeCustomPersona(persona)) {
        showToast(`Removed ${persona}.`);
      } else {
        showToast("Admin access is required to remove custom personas.");
      }
    }
    else if (action === "remove-trip-companion") {
      const companionId = target.dataset.companionId;
      if (companionId && confirm("Remove this travel companion from the trip?")) {
        await state.removeTripCompanion(state.activeTripId, companionId);
        showToast("Travel companion removed.");
      }
    }
    else if (action === "copy-companion-invite") {
      const companion = getActiveCompanionById(target.dataset.companionId);
      if (companion) {
        await copyInviteToClipboard(companion);
        showToast("Invite link copied.");
      }
    }
    else if (action === "show-companion-qr") {
      state.toggleCompanionQr(target.dataset.companionId || "");
    }
    else if (action === "accept-trip-invite") {
      state.acceptTripInvite({ mode: target.dataset.inviteMode || "guest" });
      showToast("Trip added to your planner.");
    }
    else if (action === "create-account-from-invite") {
      state.setInviteMode("account");
    }
    else if (action === "show-invite-options") {
      state.setInviteMode("preview");
    }
    else if (action === "dismiss-trip-invite") {
      state.dismissTripInvite();
    }
    else if (action === "apply-quick-intent") {
      const q = target.dataset.query || "";
      const cat = target.dataset.cat || "All";
      state.setSearchQuery(q);
      state.setSearchCategory(cat);
      showToast(`🔍 Filtered for ${target.innerText.trim()}`);
    }
    else if (action === "trigger-file-upload") {
      const fileInput = document.getElementById("quick-capture-file-input");
      if (fileInput) fileInput.click();
    }
    else if (action === "submit-quick-capture") {
      const titleInput = document.getElementById("capture-title");
      const textInput = document.getElementById("capture-text");
      const title = titleInput ? titleInput.value.trim() : "";
      const text = textInput ? textInput.value.trim() : "";
      if (!title) {
        alert("Please enter a title for your moment!");
        return;
      }
      state.addMoment({
        tripId: state.quickCaptureTripId || state.activeTripId,
        title,
        text,
        type: "note",
        media_url: ""
      });
      const receiverTrip = state.getAllTrips().find((trip) => trip.id === (state.quickCaptureTripId || state.activeTripId)) || state.activeTrip;
      state.toggleQuickCapture(false);
      showToast(`Saved "${title}" to ${receiverTrip.destination} Journal & Story!`);
    }
    else if (action === "toggle-bookmark") {
      const placeId = target.dataset.placeId;
      if (placeId) {
        const isSaving = !state.savedPlaceIds.has(placeId);
        state.toggleSavedPlace(placeId);
        showToast(isSaving ? "🔖 Saved spot to your trip bookmarks!" : "Removed from saved bookmarks.");
      }
    }
    else if (action === "add-idea-to-itinerary") {
      const title = target.dataset.title || "Explore Spot";
      const location = target.dataset.location || "";
      const currentDayIndex = state.activeDayIndex !== undefined ? Number(state.activeDayIndex) : 0;
      
      state.openEventDrawer("create", {
        dayIndex: currentDayIndex,
        startTime: "11:00",
        endTime: "13:00",
        title,
        location,
        colorScheme: "peach",
        reminder: "30m"
      });
    }
    else if (action === "generate-ai-story") {
      const trip = state.activeTrip;
      showToast("✨ Synthesizing AI Travel Journal Story...");
      try {
        const place = { id: trip.id, canonicalName: trip.destination, category: "trip" };
        const editorial = await enrichmentService.generateEditorial({
          place,
          facts: [
            { title: "Travel Dates", value: trip.dates },
            { title: "Scheduled Activities", value: String((trip.calendarEvents || []).length) },
            { title: "Bookmarked Spots", value: String(state.savedPlaceIds.size) }
          ],
          travellerProfile: { name: "Thomas Rynell" }
        });
        if (editorial) {
          state.setGeneratedStory(trip.id, editorial);
          showToast("📖 AI Travel Narrative Generated!");
        }
      } catch (e) {
        console.warn("Worker editorial generate fallback:", e);
        state.setGeneratedStory(trip.id, {
          title: `Tales of ${trip.destination}`,
          lead: `Every place becomes a story. Journeying through ${trip.destination} brought together iconic architecture, historic quarter strolls, and vibrant local gastronomy.`,
          sections: [
            { title: "Morning Rhythms & Local Flavour", body: `Starting the morning in ${trip.destination} revealed a city waking up to fresh aromas, local markets, and timeless streets.` },
            { title: "Curated Wanders & Evening Light", body: `As twilight settled, exploring saved spots and historical quarters framed an unforgettable travel experience.` }
          ]
        });
        showToast("📖 Travel Story Generated!");
      }
    }
    else if (action === "toggle-check") {
      const itemId = target.dataset.itemId;
      if (itemId) state.toggleCheckitem(itemId);
    }
    else if (action === "add-checklist-item") {
      const label = prompt("Add a new planning task (e.g. Reserve museum tickets):");
      if (label) state.addChecklistItem(label);
    }
    else if (action === "edit-checklist-item") {
      const itemId = target.dataset.itemId;
      const currentLabel = target.dataset.label || "";
      const updated = prompt("Edit planning task label:", currentLabel);
      if (updated && itemId) state.updateChecklistItem(itemId, updated);
    }
    else if (action === "delete-checklist-item") {
      const itemId = target.dataset.itemId;
      if (itemId && confirm("Delete this planning task?")) {
        state.deleteChecklistItem(itemId);
      }
    }
    else if (action === "prev-day") {
      const current = state.activeDayIndex || 0;
      state.setActiveDay(Math.max(0, current - 1));
    }
    else if (action === "next-day") {
      const current = state.activeDayIndex || 0;
      state.setActiveDay(Math.min(6, current + 1));
    }
    else if (action === "clear-search-query") {
      state.setSearchQuery("");
    }
    else if (action === "locate-user" || action === "toggle-map-view" || action === "toggle-full-map") {
      state.setView("live");
    }
    else if (action === "edit-trip-title") {
      const trip = state.activeTrip;
      const destination = prompt("Trip destination / location:", trip.destination || "Paris, France");
      if (destination === null) return;
      const startDate = prompt("Start date (YYYY-MM-DD):", trip.startDate || new Date().toISOString().split("T")[0]);
      if (startDate === null) return;
      const daysCountInput = prompt("Trip length in days:", String(trip.daysCount || 7));
      if (daysCountInput === null) return;
      const destinationAirportInput = prompt("Destination city / airport for sharper flight and arrival context:", trip.flightRoute?.destinationLabel || trip.flightRoute?.destinationIata || destination);
      if (destinationAirportInput === null) return;

      const daysCount = Math.max(1, Number(daysCountInput) || trip.daysCount || 7);
      const destinationAirport = resolveAirportInput(destinationAirportInput) || resolveAirportInput(destination);
      await state.updateTripDetails(state.activeTripId, {
        destination: destination.trim(),
        startDate: startDate.trim(),
        daysCount,
        dates: formatTripDateRangeFromParts(startDate.trim(), daysCount),
        center: destinationAirport ? [destinationAirport.lat, destinationAirport.lng] : resolveTripCenter(destination.trim()),
        destinationAirport,
      });
      showToast("Trip details updated. Refreshing local ideas and events.");
    }
    else if (action === "create-trip") {
      state.openTripCreate();
    }
    else if (action === "close-trip-create") {
      state.closeTripCreate();
    }
    else if (action === "open-edit-drawer") {
      const eventId = target.dataset.eventId;
      const trip = state.activeTrip;
      const evt = (trip.calendarEvents || []).find((e) => e.id === eventId);
      if (evt) {
        state.openEventDrawer("edit", evt);
      }
    }
    else if (action === "add-event-for-day" || action === "click-calendar-col") {
      if (e.target.closest(".event-card") || e.target.closest(".event-action-btn")) return;
      
      let dayIndex = 0;
      let startTime = "10:00";
      let endTime = "12:00";

      const dayAttr = target.dataset.dayIndex || target.dataset.colDay;
      if (dayAttr !== undefined && dayAttr !== null) {
        dayIndex = parseInt(dayAttr, 10);
      }

      const col = target.closest(".calendar-col");
      if (col) {
        const rect = col.getBoundingClientRect();
        const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const percentY = offsetY / rect.height;
        const hourFloat = 8 + percentY * 15;
        const startH = Math.floor(hourFloat);
        const startM = Math.round(((hourFloat - startH) * 60) / 30) * 30;
        startTime = `${String(startH).padStart(2, '0')}:${String(startM % 60).padStart(2, '0')}`;
        endTime = `${String(Math.min(23, startH + 2)).padStart(2, '0')}:${String(startM % 60).padStart(2, '0')}`;
      }

      state.openEventDrawer("create", {
        dayIndex,
        startTime,
        endTime,
        title: "",
        location: "",
        colorScheme: "peach",
        reminder: "none"
      });
    }
    else if (action === "close-event-drawer") {
      state.closeEventDrawer();
    }
    else if (action === "save-event-from-drawer") {
      const form = document.getElementById("event-drawer-form");
      if (form) {
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
      }
    }
    else if (action === "delete-event-from-drawer") {
      const eventId = target.dataset.eventId;
      if (eventId && confirm("Delete this activity?")) {
        state.deleteCalendarEvent(state.activeTripId, eventId);
        state.closeEventDrawer();
      }
    }
    else if (action === "delete-calendar-event") {
      const eventId = target.dataset.eventId;
      if (eventId && confirm("Delete this itinerary activity?")) {
        state.deleteCalendarEvent(state.activeTripId, eventId);
      }
    }
    else if (action === "share-trip") {
      openCompanionInviteFlow("link");
      showToast("Choose who to invite, then send or copy the invite link.");
    }
    else if (action === "next-onboarding-slide") {
      state.nextOnboardingSlide();
    }
    else if (action === "previous-onboarding-slide") {
      state.previousOnboardingSlide();
    }
    else if (action === "go-onboarding-slide") {
      state.setOnboardingSlide(target.dataset.slideIndex || 0);
    }
    else if (action === "skip-onboarding") {
      state.completeOnboarding({ view: "home" });
    }
    else if (action === "finish-onboarding") {
      state.completeOnboarding({ view: "home" });
    }
    else if (action === "walkthrough-invite-companions") {
      state.completeOnboarding();
      openCompanionInviteFlow("link");
      showToast("Invite companions for the selected trip.");
    }
    else if (action === "admin-login-dialog") {
      const email = prompt("Enter admin/traveler email:", "thomas@rynell.org");
      if (email) {
        const password = prompt("Enter password:");
        if (password) {
          enrichmentService.loginAccount({ email, password, inviteTripId: state.activeInvite?.tripId || "" })
            .then(async () => {
              await state.refreshUserSession();
              if (state.activeInvite?.tripId) state.acceptTripInvite({ mode: "user" });
              showToast("Signed in.");
            })
            .catch((err) => alert(`Authentication note: ${err.message}`));
        }
      }
    }
    else if (action === "admin-logout") {
      enrichmentService.logoutAdmin()
        .catch(() => {})
        .finally(async () => {
          await state.refreshUserSession();
          showToast("Admin access ended.");
        });
    }
    else if (action === "open-lightbox") {
      const momentId = target.dataset.momentId;
      const media = (state.moments || []).find((m) => m.id === momentId);
      if (media) state.openLightbox(media);
    }
    else if (action === "edit-journal-media") {
      const momentId = target.dataset.momentId;
      const moment = (state.moments || []).find((m) => m.id === momentId);
      if (!moment) return;
      const title = prompt("Media title:", moment.title || "");
      if (title === null) return;
      const placeTitle = prompt("Place / restaurant / coffee shop:", moment.placeTitle || "");
      if (placeTitle === null) return;
      const placeCategory = prompt("Category:", moment.placeCategory || "Place");
      if (placeCategory === null) return;
      state.updateMoment(momentId, {
        title: title.trim() || moment.title,
        placeTitle: placeTitle.trim(),
        placeCategory: placeCategory.trim() || "Place",
        tags: [placeCategory.trim() || "Place"].filter(Boolean),
        geoSource: moment.geoSource || "manual",
      });
      showToast("Media tags updated.");
    }
    else if (action === "close-lightbox") {
      state.closeLightbox();
    }
  }

  // Subtab switcher
  if (target.dataset.subtab) {
    state.setPlanSubTab(target.dataset.subtab);
  }

  // View mode switcher
  if (target.dataset.viewmode) {
    state.setPlanViewMode(target.dataset.viewmode);
  }

  // Day selector
  if (target.dataset.daySelect !== undefined) {
    state.setActiveDay(parseInt(target.dataset.daySelect, 10));
  }

  if (target.dataset.mapDayFilter !== undefined) {
    const selectedDay = parseInt(target.dataset.mapDayFilter, 10);
    const currentFilter = state.mapDayFilter;
    state.setMapDayFilter(currentFilter === selectedDay ? null : selectedDay);
  }

  if (target.dataset.tripLength !== undefined) {
    const daysInput = document.getElementById("trip-create-days-count");
    if (daysInput) daysInput.value = target.dataset.tripLength;
    target.parentElement?.querySelectorAll(".trip-create-pill").forEach((pill) => pill.classList.remove("is-selected"));
    target.classList.add("is-selected");
  }

  // Search categories
  if (target.dataset.cat) {
    state.setSearchCategory(target.dataset.cat);
  }

  // Search subfilters
  if (target.dataset.subfilter) {
    state.setSearchSubFilter(target.dataset.subfilter);
  }
});

// Search input field listener
document.addEventListener("input", (e) => {
  if (e.target.matches(".search-input-field")) {
    state.setSearchQuery(e.target.value, { notify: false });
    updateSearchResultsInPlace(e.target);
  }
  if (e.target.matches(".airport-autocomplete-input")) {
    updateAirportAutocomplete(e.target);
    updateTripCreateRoutePreview(e.target.form);
  }
  if (e.target.matches("[data-profile-field]") && !e.target.matches("input[type='checkbox'], select")) {
    state.updateUserProfileField(e.target.dataset.profileField, e.target.value, { notify: false });
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const actionCard = e.target.closest?.('[role="button"][data-action]');
  if (!actionCard) return;
  e.preventDefault();
  actionCard.click();
});

document.addEventListener("click", (e) => {
  if (e.target.classList?.contains("trip-create-overlay")) {
    state.closeTripCreate();
  }
});

function updateSearchResultsInPlace(input) {
  const resultsRegion = document.getElementById("search-results-region");
  if (resultsRegion) {
    resultsRegion.innerHTML = renderSearchResults();
  }

  const wrapper = input.closest(".search-input-wrapper");
  if (!wrapper) return;

  const clearButton = wrapper.querySelector(".search-clear-btn");
  if (input.value && !clearButton) {
    wrapper.insertAdjacentHTML(
      "beforeend",
      '<button class="search-clear-btn" data-action="clear-search-query" title="Clear query">✕</button>'
    );
  } else if (!input.value && clearButton) {
    clearButton.remove();
  }
}

function closeAirportAutocompleteMenus() {
  document.querySelectorAll(".airport-autocomplete-menu.is-open").forEach((menu) => {
    menu.classList.remove("is-open");
    menu.innerHTML = "";
  });
}

async function updateAirportAutocomplete(input) {
  const wrapper = input.closest(".airport-autocomplete");
  const menu = wrapper?.querySelector(".airport-autocomplete-menu");
  if (!menu) return;

  const query = input.value.trim();
  const seq = String(Date.now());
  input.dataset.airportSearchSeq = seq;

  if (query.length < 2) {
    menu.classList.remove("is-open");
    menu.innerHTML = "";
    return;
  }

  menu.classList.add("is-open");
  menu.innerHTML = `<div class="airport-autocomplete-status">Searching live airport service...</div>`;

  const airports = await searchAirportsWorldwide(query, { max: 18 });
  if (input.dataset.airportSearchSeq !== seq) return;

  if (!airports.length) {
    menu.innerHTML = `<div class="airport-autocomplete-status">No airports found</div>`;
    return;
  }

  menu.innerHTML = airports.slice(0, 10).map((airport) => {
    const label = formatAirportLabel(airport);
    return `
      <button type="button" class="airport-autocomplete-option" data-action="select-airport-suggestion" data-airport-value="${escapeHtml(label)}" role="option">
        <span class="airport-autocomplete-option__code voice-mono">${escapeHtml(airport.iata)}</span>
        <span class="airport-autocomplete-option__body">
          <strong>${escapeHtml(`${airport.flag || "✈️"} ${airport.city || airport.name}`)}</strong>
          <small>${escapeHtml([airport.name, airport.country].filter(Boolean).join(" · "))}</small>
        </span>
      </button>
    `;
  }).join("");
}

function updateTripCreateRoutePreview(form) {
  if (!form || form.id !== "trip-create-form") return;
  const titleEl = form.querySelector("[data-trip-create-route-title]");
  const subtitleEl = form.querySelector("[data-trip-create-route-subtitle]");
  if (!titleEl || !subtitleEl) return;

  const originValue = form.originAirport?.value || "";
  const destinationValue = form.destinationAirport?.value || "";
  const originAirport = resolveAirportInput(originValue);
  const destinationAirport = resolveAirportInput(destinationValue);
  const routeDisplay = getFlightRouteDisplay({
    originAirport,
    destinationAirport,
    originIata: originAirport?.iata || "",
    destinationIata: destinationAirport?.iata || "",
    originLabel: originAirport ? formatAirportLabel(originAirport) : originValue.trim() || "Choose origin airport",
    destinationLabel: destinationAirport ? formatAirportLabel(destinationAirport) : destinationValue.trim() || "Choose destination airport",
  });

  titleEl.textContent = `Flight Route: ${routeDisplay.title}`;
  subtitleEl.textContent = routeDisplay.subtitle;
}

document.addEventListener("submit", async (e) => {
  if (e.target.id === "profile-login-form") {
    e.preventDefault();
    const form = e.target;
    const email = form.email?.value?.trim() || "";
    const password = form.password?.value || "";
    if (!email || !password) {
      showToast("Enter email and password.");
      return;
    }
    const button = form.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    try {
      await enrichmentService.loginAccount({ email, password, inviteTripId: state.activeInvite?.tripId || "" });
      await state.refreshUserSession();
      if (state.activeInvite?.tripId) state.acceptTripInvite({ mode: "user" });
      showToast("Signed in.");
    } catch (error) {
      showToast("Login failed. Check your admin credentials.");
    } finally {
      if (button) button.disabled = false;
    }
    return;
  }

  if (e.target.id === "profile-companion-form") {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    const result = await state.inviteTripCompanion(state.activeTripId, {
      name: form.name?.value || "",
      email: form.email?.value || "",
      role: form.role?.value || "viewer",
      inviteMethod: form.inviteMethod?.value || "email",
      personalMessage: form.personalMessage?.value || "",
    });
    if (button) button.disabled = false;
    if (!result.ok && result.error === "invalid-email") {
      showToast("Add a valid companion email.");
      form.email?.focus();
      return;
    }
    if (result.ok) {
      form.reset();
      if (result.companion) await deliverCompanionInvite(result.companion);
      showToast(result.source === "worker" ? "Travel companion invited." : "Travel companion saved locally.");
    } else {
      showToast("Could not add companion.");
    }
    return;
  }

  if (e.target.id === "trip-invite-account-form") {
    e.preventDefault();
    const form = e.target;
    const name = form.name?.value?.trim() || "";
    const email = form.email?.value?.trim() || "";
    const password = form.password?.value || "";
    if (!name || !email || password.length < 8) {
      showToast("Add your name, email, and an 8+ character password.");
      return;
    }
    const button = form.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    try {
      await enrichmentService.registerAccount({
        name,
        email,
        password,
        inviteTripId: state.activeInvite?.tripId || state.activeTripId,
      });
      state.updateUserProfile({ name, email }, { notify: false });
      await state.refreshUserSession();
      state.acceptTripInvite({ mode: "account" });
      showToast("Account created. Trip added to your planner.");
    } catch (error) {
      showToast(error?.status === 409 ? "An account already exists. Sign in instead." : "Could not create account right now.");
    } finally {
      if (button) button.disabled = false;
    }
    return;
  }

  if (e.target.id === "profile-persona-add-form") {
    e.preventDefault();
    const form = e.target;
    const input = form.personaLabel;
    const label = input?.value?.trim() || "";
    if (!label) {
      input?.focus();
      showToast("Add a persona name first.");
      return;
    }
    if (state.addCustomPersona(label)) {
      showToast(`Added ${label}.`);
      form.reset();
    } else if (!state.isAdmin) {
      showToast("Admin access is required to add new personas.");
    } else {
      showToast("That persona already exists.");
    }
    return;
  }

  if (e.target.id === "transit-flight-route-form") {
    e.preventDefault();
    const form = e.target;
    const originAirport = resolveAirportInput(form.originAirport?.value || "");
    const destinationAirport = resolveAirportInput(form.destinationAirport?.value || "");
    const flightType = normalizeFlightType(form.flightType?.value || "regular");

    if (!originAirport || !destinationAirport) {
      showToast("Choose valid from and to airports.");
      if (!originAirport) form.originAirport?.focus();
      else form.destinationAirport?.focus();
      return;
    }

    await state.updateTripFlightRoute(state.activeTripId, {
      originAirport,
      destinationAirport,
      flightType,
    });
    showToast(`Flight route saved: ${originAirport.iata} to ${destinationAirport.iata}.`);
    return;
  }

  if (e.target.id !== "trip-create-form") return;
  e.preventDefault();

  const form = e.target;
  const errorEl = document.getElementById("trip-create-error");
  const submitButton = form.querySelector(".trip-create-submit");
  const destination = form.destination.value.trim();
  const originAirport = resolveAirportInput(form.originAirport?.value || "");
  const destinationAirport = resolveAirportInput(form.destinationAirport?.value || destination);
  const startDate = form.startDate.value;
  const daysCount = Number(form.daysCount.value) || 7;
  const flightType = normalizeFlightType(form.flightType?.value || "regular");

  if (!destination) {
    if (errorEl) errorEl.textContent = "Add a destination to create your trip.";
    form.destination.focus();
    return;
  }

  if (!originAirport || !destinationAirport) {
    if (errorEl) errorEl.textContent = "Choose a valid origin and destination airport.";
    if (!originAirport) form.originAirport.focus();
    else form.destinationAirport.focus();
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    submitButton.innerHTML = "Creating trip";
  }

  const starterTasks = [...form.querySelectorAll('input[name="starterTasks"]:checked')]
    .map((input) => input.value);

  await state.createCustomTrip({
    destination,
    dates: formatTripDateRange(startDate, daysCount),
    startDate,
    daysCount,
    center: destinationAirport ? [destinationAirport.lat, destinationAirport.lng] : resolveTripCenter(destination),
    checklist: createStarterChecklist(starterTasks),
    originAirport,
    destinationAirport,
    flightType,
  });
});

function formatTripDateRange(startDate, daysCount) {
  if (!startDate) return "Upcoming";
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, Number(daysCount) || 1) - 1);
  const formatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function createStarterChecklist(selected = []) {
  const tasks = {
    flight: { id: "flight", label: "Search flights", completed: false },
    stay: { id: "stay", label: "Book your stay", completed: false },
    food: { id: "food", label: "Find food spots", completed: false },
    map: { id: "map", label: "Build route map", completed: false },
  };
  const checklist = selected.map((id) => tasks[id]).filter(Boolean);
  return checklist.length ? checklist : [{ id: "first-step", label: "Add your first plan", completed: false }];
}

function resolveTripCenter(destination = "") {
  const key = normalizeMapLookupKey(destination);
  const match = Object.entries(TRIP_DESTINATION_COORDS).find(([name]) => key.includes(name) || name.includes(key));
  return match ? match[1] : [48.8566, 2.3522];
}

async function enrichCapturedMediaFile(file, trip) {
  const coordinates = await extractPhotoGpsCoordinates(file);
  if (!coordinates) {
    return {
      tags: ["Needs place tag"],
      geoSource: "manual-needed",
      geoLabel: "",
    };
  }

  const [location, nearby] = await Promise.all([
    enrichmentService.resolveLocation({ coordinates }).catch(() => null),
    enrichmentService.discoverNearby({ coordinates, radiusMeters: 180, intent: "traveler" }).catch(() => null),
  ]);
  const place = (nearby?.places || [])[0] || null;
  const geoLabel = location?.locality || location?.area?.city || location?.area?.town || location?.displayName || "";
  const placeCategory = place?.category || place?.tag || inferMomentCategory(place?.categories || []);

  return {
    coordinates,
    geoSource: "photo-exif",
    geoLabel: geoLabel || trip.destination,
    placeTitle: place?.title || place?.canonicalName || "",
    placeCategory: placeCategory || "",
    placeDistance: place?.distance || "",
    tags: [placeCategory, geoLabel || trip.destination].filter(Boolean),
    locationResolved: location || null,
  };
}

async function extractPhotoGpsCoordinates(file) {
  if (!file || !/^image\/jpe?g$/i.test(file.type || "")) return null;
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    const length = view.getUint16(offset + 2, false);
    if (marker === 0xffe1 && length > 8 && readAscii(view, offset + 4, 6) === "Exif\0\0") {
      return readGpsFromTiff(view, offset + 10);
    }
    offset += 2 + length;
  }
  return null;
}

function readGpsFromTiff(view, tiffStart) {
  const little = readAscii(view, tiffStart, 2) === "II";
  const get16 = (offset) => view.getUint16(offset, little);
  const get32 = (offset) => view.getUint32(offset, little);
  const firstIfd = tiffStart + get32(tiffStart + 4);
  const gpsPointer = findIfdValue(view, firstIfd, 0x8825, little, tiffStart);
  if (!gpsPointer) return null;

  const gpsIfd = tiffStart + gpsPointer;
  const latRef = findIfdValue(view, gpsIfd, 0x0001, little, tiffStart);
  const lat = findIfdValue(view, gpsIfd, 0x0002, little, tiffStart);
  const lngRef = findIfdValue(view, gpsIfd, 0x0003, little, tiffStart);
  const lng = findIfdValue(view, gpsIfd, 0x0004, little, tiffStart);
  if (!lat || !lng) return null;

  const latitude = dmsToDecimal(lat) * (String(latRef).toUpperCase().startsWith("S") ? -1 : 1);
  const longitude = dmsToDecimal(lng) * (String(lngRef).toUpperCase().startsWith("W") ? -1 : 1);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [Number(latitude.toFixed(6)), Number(longitude.toFixed(6))];
}

function findIfdValue(view, ifdOffset, tag, little, tiffStart) {
  const get16 = (offset) => view.getUint16(offset, little);
  const get32 = (offset) => view.getUint32(offset, little);
  const entries = get16(ifdOffset);
  for (let i = 0; i < entries; i += 1) {
    const entry = ifdOffset + 2 + i * 12;
    if (get16(entry) !== tag) continue;
    const type = get16(entry + 2);
    const count = get32(entry + 4);
    const valueOffset = entry + 8;
    const dataOffset = getTypeSize(type) * count <= 4 ? valueOffset : tiffStart + get32(valueOffset);
    return readExifValue(view, dataOffset, type, count, little);
  }
  return null;
}

function readExifValue(view, offset, type, count, little) {
  if (type === 2) return readAscii(view, offset, count).replace(/\0/g, "");
  if (type === 3) return count === 1 ? view.getUint16(offset, little) : Array.from({ length: count }, (_, i) => view.getUint16(offset + i * 2, little));
  if (type === 4) return count === 1 ? view.getUint32(offset, little) : Array.from({ length: count }, (_, i) => view.getUint32(offset + i * 4, little));
  if (type === 5) {
    return Array.from({ length: count }, (_, i) => {
      const numerator = view.getUint32(offset + i * 8, little);
      const denominator = view.getUint32(offset + i * 8 + 4, little) || 1;
      return numerator / denominator;
    });
  }
  return null;
}

function getTypeSize(type) {
  if (type === 2) return 1;
  if (type === 3) return 2;
  if (type === 4) return 4;
  if (type === 5) return 8;
  return 1;
}

function readAscii(view, offset, length) {
  return Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join("");
}

function dmsToDecimal(values) {
  return Number(values[0] || 0) + Number(values[1] || 0) / 60 + Number(values[2] || 0) / 3600;
}

function inferMomentCategory(categories = []) {
  const text = categories.join(" ").toLowerCase();
  if (/coffee|cafe/.test(text)) return "Coffee";
  if (/restaurant|food|bar|pub/.test(text)) return "Restaurant";
  if (/museum|gallery|culture/.test(text)) return "Museum";
  if (/park|garden|viewpoint|nature/.test(text)) return "Outdoor";
  return "";
}

function readFileAsDataUrl(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      onProgress(evt.loaded / evt.total);
    };
    reader.onload = (evt) => resolve(evt.target.result);
    reader.onerror = () => reject(reader.error || new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

function createMediaGroup(files = [], receiverTrip) {
  const timestamp = new Date();
  return {
    groupId: `media_group_${timestamp.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    groupTitle: `${receiverTrip.destination} media batch`,
    capturedAt: timestamp.toISOString(),
    fileCount: files.length,
  };
}

function buildGroupedMomentTitle(file, selectedType, index, total, group) {
  if (total <= 1) return `Captured ${selectedType === "video" ? "Video" : "Photo"}`;
  const base = group.groupTitle || "Media batch";
  return `${base} ${index + 1}/${total}`;
}

function summarizeMediaGroup(moments = [], fallbackTrip) {
  const place = moments.find((moment) => moment.placeTitle)?.placeTitle;
  const geo = moments.find((moment) => moment.geoLabel)?.geoLabel;
  const category = moments.find((moment) => moment.placeCategory)?.placeCategory;
  return {
    groupPlaceTitle: place || "",
    groupGeoLabel: geo || fallbackTrip.destination,
    groupCategory: category || "",
  };
}

// Trip mode & dropdown change listener
document.addEventListener("change", async (e) => {
  if (e.target.dataset.action === "select-trip-dropdown") {
    state.setTrip(e.target.value);
  }
  if (e.target.dataset.action === "toggle-trip-mode") {
    state.toggleTripMode(e.target.checked);
  }
  if (e.target.dataset.action === "select-quick-capture-trip") {
    state.setQuickCaptureTrip(e.target.value);
  }
  if (e.target.id === "quick-capture-file-input" && e.target.files && e.target.files[0]) {
    const files = Array.from(e.target.files).filter((file) => /^(image|video)\//.test(file.type || ""));
    if (!files.length) return;

    const receiverTripId = state.quickCaptureTripId || state.activeTripId;
    const receiverTrip = state.getAllTrips().find((trip) => trip.id === receiverTripId) || state.activeTrip;
    const group = createMediaGroup(files, receiverTrip);
    const savedMoments = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const selectedType = file.type.startsWith("video") ? "video" : "photo";
      const progressLabel = files.length > 1 ? `${file.name} (${index + 1}/${files.length})` : file.name;
      const baseProgress = Math.max(8, Math.round((index / files.length) * 92));

      state.setQuickCaptureUpload({
        status: "reading",
        progress: baseProgress,
        fileName: progressLabel,
        type: selectedType,
      });

      try {
        const dataUrl = await readFileAsDataUrl(file, (ratio) => {
          const progress = Math.min(92, Math.max(8, Math.round(((index + ratio) / files.length) * 92)));
          state.setQuickCaptureUpload({
            status: "reading",
            progress,
            fileName: progressLabel,
            type: selectedType,
          });
        });

        state.setQuickCaptureUpload({
          status: "saving",
          progress: Math.min(98, Math.max(10, Math.round(((index + 0.96) / files.length) * 100))),
          fileName: progressLabel,
          type: selectedType,
        });

        const enrichment = selectedType === "photo"
          ? await enrichCapturedMediaFile(file, receiverTrip).catch(() => ({ tags: ["Needs place tag"], geoSource: "manual-needed" }))
          : { tags: ["Video"], geoSource: "video" };

        const savedMoment = await state.addMoment({
          tripId: receiverTripId,
          groupId: group.groupId,
          groupTitle: group.groupTitle,
          groupCapturedAt: group.capturedAt,
          groupFileCount: group.fileCount,
          title: buildGroupedMomentTitle(file, selectedType, index, files.length, group),
          text: file.name,
          type: selectedType,
          media_url: dataUrl,
          ...enrichment
        });
        savedMoments.push(savedMoment);
      } catch (error) {
        state.setQuickCaptureUpload({
          status: "error",
          progress: 100,
          fileName: file.name,
          type: selectedType,
        });
        showToast(`Could not read ${file.name}.`);
      }
    }

    if (savedMoments.length) {
      const groupSummary = summarizeMediaGroup(savedMoments, receiverTrip);
      const resolvedGroupTitle = groupSummary.groupPlaceTitle
        ? `${groupSummary.groupPlaceTitle} media`
        : `${groupSummary.groupGeoLabel || receiverTrip.destination} media`;

      savedMoments.forEach((moment) => {
        state.updateMoment(moment.id, {
          ...groupSummary,
          groupTitle: files.length > 1 ? resolvedGroupTitle : moment.groupTitle,
        });
      });

      state.setQuickCaptureUpload({
        status: "complete",
        progress: 100,
        fileName: files.length > 1 ? `${savedMoments.length} media saved` : files[0].name,
        type: files.length > 1 ? "batch" : savedMoments[0].type,
      });
      showToast(files.length > 1
        ? `${savedMoments.length} media saved to ${receiverTrip.destination} Journal.`
        : `${files[0].name} saved to ${receiverTrip.destination} Journal.`);
      setTimeout(() => state.toggleQuickCapture(false), 650);
    }

    e.target.value = "";
  }
});

// ==========================================================================
// UNIFIED TOUCH & POINTER DRAG & RESIZE ENGINE (Mobile + Desktop)
// ==========================================================================
let activeDragState = null;

// Touch & Mouse Down Start Listener
document.addEventListener("pointerdown", (e) => {
  const resizeHandle = e.target.closest(".event-resize-handle");
  const moveHandle = e.target.closest(".event-drag-handle");
  const card = e.target.closest(".event-card");
  const timelineRow = e.target.closest(".timeline-event-row");
  const timelineGrab = e.target.closest(".timeline-card-grab");
  const wrapper = card ? card.closest(".calendar-grid-wrapper") : resizeHandle?.closest(".calendar-grid-wrapper");
  const isMobileWeekOverview = wrapper?.dataset.calendarMode === "week" && isTouchCalendarViewport();

  if (timelineRow && !e.target.closest(".timeline-edit-btn, .timeline-delete-btn")) {
    const requiresHandle = isTouchCalendarViewport();
    if (requiresHandle && !timelineGrab) {
      activeDragState = {
        type: "timeline-tap",
        eventId: timelineRow.dataset.eventId,
        card: timelineRow,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: false
      };
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    captureCalendarPointer(timelineRow, e.pointerId);
    activeDragState = {
      type: "timeline-move",
      eventId: timelineRow.dataset.eventId,
      card: timelineRow,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      sourceDayIndex: parseInt(timelineRow.dataset.dayIndex, 10) || 0,
      targetDayGroup: timelineRow.closest(".timeline-day-group"),
      hasMoved: false
    };
    return;
  }

  if (card && isMobileWeekOverview && !e.target.closest(".event-action-btn, .event-delete-btn")) {
    activeDragState = {
      type: "tap",
      eventId: card.dataset.eventId,
      card,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false
    };
    return;
  }

  if (resizeHandle && !isMobileWeekOverview) {
    e.preventDefault();
    e.stopPropagation();
    const parentCard = resizeHandle.closest(".event-card");
    const col = parentCard.closest(".calendar-col");
    captureCalendarPointer(parentCard, e.pointerId);
    activeDragState = {
      type: "resize",
      eventId: resizeHandle.dataset.eventId,
      card: parentCard,
      col,
      pointerId: e.pointerId,
      startY: e.clientY,
      initialHeight: parentCard.offsetHeight,
      initialHeightStyle: parentCard.style.height
    };
    return;
  }

  if (card && !e.target.closest(".event-action-btn, .event-delete-btn")) {
    const requiresHandle = isTouchCalendarViewport();
    if (requiresHandle && !moveHandle) {
      activeDragState = {
        type: "tap",
        eventId: card.dataset.eventId,
        card,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: false
      };
      return;
    }

    const col = card.closest(".calendar-col");
    captureCalendarPointer(card, e.pointerId);
    activeDragState = {
      type: "move",
      eventId: card.dataset.eventId,
      card,
      col,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      durationHours: Number(card.dataset.durationHours) || 2,
      hasMoved: false
    };
  }
});

// Touch & Mouse Move Listener
document.addEventListener("pointermove", (e) => {
  if (!activeDragState) return;

  if (activeDragState.type === "timeline-tap") {
    const dx = e.clientX - activeDragState.startX;
    const dy = e.clientY - activeDragState.startY;
    if (Math.hypot(dx, dy) > 8) activeDragState.hasMoved = true;
    return;
  }

  if (activeDragState.type === "timeline-move") {
    const dx = e.clientX - activeDragState.startX;
    const dy = e.clientY - activeDragState.startY;

    if (Math.hypot(dx, dy) > 8) {
      activeDragState.hasMoved = true;
      e.preventDefault();
      activeDragState.card.classList.add("is-dragging");
      activeDragState.card.style.transform = `translate(${dx}px, ${dy}px) scale(0.98)`;

      const targetElem = document.elementFromPoint(e.clientX, e.clientY);
      const targetDayGroup = targetElem ? targetElem.closest(".timeline-day-group") : null;

      document.querySelectorAll(".timeline-day-group").forEach((group) => group.classList.remove("drag-hover"));
      if (targetDayGroup) {
        targetDayGroup.classList.add("drag-hover");
        activeDragState.targetDayGroup = targetDayGroup;
      }
    }
    return;
  }

  if (activeDragState.type === "tap") {
    const dx = e.clientX - activeDragState.startX;
    const dy = e.clientY - activeDragState.startY;
    if (Math.hypot(dx, dy) > 8) activeDragState.hasMoved = true;
    return;
  }

  if (activeDragState.type === "resize") {
    e.preventDefault();
    const rect = activeDragState.col.getBoundingClientRect();
    const offsetY = Math.max(20, Math.min(rect.height, e.clientY - rect.top));
    const cardTopPercent = parseFloat(activeDragState.card.style.top) || 0;
    const startHours = 8 + (cardTopPercent / 100) * 15;
    const endHours = 8 + (offsetY / rect.height) * 15;

    if (endHours > startHours + 0.25) {
      const endH = Math.min(23, Math.floor(endHours));
      const endM = Math.round(((endHours - endH) * 60) / 15) * 15;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
      const heightPercent = ((endHours - startHours) / 15) * 100;
      activeDragState.card.style.height = `${Math.min(100, heightPercent)}%`;
      const timeEl = activeDragState.card.querySelector(".event-card__time");
      if (timeEl) {
        const startTime = timeEl.textContent.split("–")[0].trim();
        timeEl.textContent = `${startTime} – ${endTimeStr}`;
      }
      activeDragState.newEndTime = endTimeStr;
    }
    return;
  }

  if (activeDragState.type === "move") {
    const dx = e.clientX - activeDragState.startX;
    const dy = e.clientY - activeDragState.startY;

    if (Math.hypot(dx, dy) > 8) {
      activeDragState.hasMoved = true;
      e.preventDefault();
      activeDragState.card.classList.add("is-dragging");
      activeDragState.card.style.transform = `translate(${dx}px, ${dy}px) scale(0.98)`;

      const targetElem = document.elementFromPoint(e.clientX, e.clientY);
      const targetCol = targetElem ? targetElem.closest(".calendar-col") : null;

      document.querySelectorAll(".calendar-col").forEach((c) => c.classList.remove("drag-hover"));
      if (targetCol) {
        targetCol.classList.add("drag-hover");
        activeDragState.targetCol = targetCol;
      }
    }
  }
});

// Touch & Mouse Up / Cancel End Listener
document.addEventListener("pointerup", (e) => {
  if (!activeDragState) return;

  if (activeDragState.type === "timeline-tap") {
    if (!activeDragState.hasMoved) {
      openCalendarEventDrawer(activeDragState.eventId);
    }
    activeDragState = null;
    return;
  }

  if (activeDragState.type === "timeline-move") {
    releaseCalendarPointer(activeDragState.card, activeDragState.pointerId);
    activeDragState.card.classList.remove("is-dragging");
    activeDragState.card.style.transform = "";
    document.querySelectorAll(".timeline-day-group").forEach((group) => group.classList.remove("drag-hover"));

    if (activeDragState.hasMoved && activeDragState.targetDayGroup) {
      const targetDayIndex = parseInt(activeDragState.targetDayGroup.dataset.dayIndex, 10);
      if (Number.isFinite(targetDayIndex) && targetDayIndex !== activeDragState.sourceDayIndex) {
        state.updateCalendarEvent(state.activeTripId, activeDragState.eventId, {
          dayIndex: targetDayIndex
        });
      }
    } else if (!activeDragState.hasMoved) {
      openCalendarEventDrawer(activeDragState.eventId);
    }

    activeDragState = null;
    return;
  }

  if (activeDragState.type === "tap") {
    if (!activeDragState.hasMoved) {
      openCalendarEventDrawer(activeDragState.eventId);
    }
    activeDragState = null;
    return;
  }

  if (activeDragState.type === "resize") {
    releaseCalendarPointer(activeDragState.card, activeDragState.pointerId);
    if (activeDragState.newEndTime) {
      state.updateCalendarEvent(state.activeTripId, activeDragState.eventId, {
        endTime: activeDragState.newEndTime
      });
    }
    activeDragState = null;
    return;
  }

  if (activeDragState.type === "move") {
    releaseCalendarPointer(activeDragState.card, activeDragState.pointerId);
    activeDragState.card.classList.remove("is-dragging");
    activeDragState.card.style.transform = "";
    document.querySelectorAll(".calendar-col").forEach((c) => c.classList.remove("drag-hover"));

    if (activeDragState.hasMoved && (activeDragState.targetCol || activeDragState.col)) {
      const targetCol = activeDragState.targetCol || activeDragState.col;
      const targetDayIndex = parseInt(targetCol.dataset.colDay, 10);
      const rect = targetCol.getBoundingClientRect();
      const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const percentY = offsetY / rect.height;
      const hourFloat = 8 + percentY * 15;
      const startHour = clampCalendarStartHour(roundToNearestInterval(hourFloat, 0.5), activeDragState.durationHours);
      const endHour = Math.min(23, startHour + activeDragState.durationHours);
      const startTime = formatCalendarHour(startHour);
      const endTime = formatCalendarHour(endHour);

      state.updateCalendarEvent(state.activeTripId, activeDragState.eventId, {
        dayIndex: targetDayIndex,
        startTime,
        endTime
      });
    } else if (!activeDragState.hasMoved) {
      openCalendarEventDrawer(activeDragState.eventId);
    }

    activeDragState = null;
  }
});

document.addEventListener("pointercancel", () => {
  resetActiveCalendarDrag();
});

function isTouchCalendarViewport() {
  return window.matchMedia?.("(pointer: coarse), (max-width: 540px)")?.matches;
}

function captureCalendarPointer(element, pointerId) {
  try {
    element?.setPointerCapture?.(pointerId);
  } catch {}
}

function releaseCalendarPointer(element, pointerId) {
  try {
    if (element?.hasPointerCapture?.(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {}
}

function resetActiveCalendarDrag() {
  if (!activeDragState) return;
  releaseCalendarPointer(activeDragState.card, activeDragState.pointerId);
  activeDragState.card?.classList.remove("is-dragging");
  if (activeDragState.card) activeDragState.card.style.transform = "";
  if (activeDragState.type === "resize" && activeDragState.card) {
    activeDragState.card.style.height = activeDragState.initialHeightStyle || activeDragState.card.style.height;
  }
  document.querySelectorAll(".calendar-col").forEach((c) => c.classList.remove("drag-hover"));
  document.querySelectorAll(".timeline-day-group").forEach((group) => group.classList.remove("drag-hover"));
  activeDragState = null;
}

function openCalendarEventDrawer(eventId) {
  const trip = state.activeTrip;
  const evt = (trip.calendarEvents || []).find((event) => event.id === eventId);
  if (evt) {
    state.openEventDrawer("edit", evt);
  }
}

function roundToNearestInterval(value, interval) {
  return Math.round(value / interval) * interval;
}

function clampCalendarStartHour(hour, durationHours) {
  const latestStart = Math.max(8, 23 - durationHours);
  return Math.max(8, Math.min(latestStart, hour));
}

function formatCalendarHour(hourFloat) {
  const hour = Math.floor(hourFloat);
  const minutes = Math.round((hourFloat - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Event Drawer Form Submission & Interactive Pills
document.addEventListener("submit", (e) => {
  if (e.target.id === "event-drawer-form") {
    e.preventDefault();
    const form = e.target;
    const eventId = form.eventId.value;
    const title = form.title.value.trim();
    const location = form.location.value.trim();
    const dayIndex = parseInt(form.dayIndex.value, 10) || 0;
    const startTime = form.startTime.value || "10:00";
    const endTime = form.endTime.value || "12:00";
    const colorScheme = form.colorScheme.value || "peach";
    const reminder = form.reminder.value || "none";

    if (!title) return;

    if (eventId) {
      state.updateCalendarEvent(state.activeTripId, eventId, {
        title,
        location,
        dayIndex,
        startTime,
        endTime,
        colorScheme,
        reminder: reminder === "none" ? "" : reminder
      });
    } else {
      state.addCalendarEvent(state.activeTripId, {
        title,
        location,
        dayIndex,
        startTime,
        endTime,
        colorScheme,
        reminder: reminder === "none" ? "" : reminder
      });
    }
    state.closeEventDrawer();
  }
});

// Drawer Pill & Color Selection Click Listener
document.addEventListener("click", (e) => {
  const dayPill = e.target.closest("[data-drawer-day]");
  if (dayPill) {
    const dayIdx = dayPill.dataset.drawerDay;
    const input = document.getElementById("drawer-day-index");
    if (input) input.value = dayIdx;
    dayPill.parentElement.querySelectorAll(".drawer-pill").forEach((p) => p.classList.remove("is-selected"));
    dayPill.classList.add("is-selected");
  }

  const colorDot = e.target.closest("[data-drawer-color]");
  if (colorDot) {
    const color = colorDot.dataset.drawerColor;
    const input = document.getElementById("drawer-color-scheme");
    if (input) input.value = color;
    colorDot.parentElement.querySelectorAll(".drawer-color-dot").forEach((d) => {
      d.classList.remove("is-active");
      d.innerHTML = "";
    });
    colorDot.classList.add("is-active");
    colorDot.innerHTML = renderIcon("check");
  }

  const reminderPill = e.target.closest("[data-drawer-reminder]");
  if (reminderPill) {
    const reminder = reminderPill.dataset.drawerReminder;
    const input = document.getElementById("drawer-reminder");
    if (input) input.value = reminder;
    reminderPill.parentElement.querySelectorAll(".drawer-pill").forEach((p) => p.classList.remove("is-selected"));
    reminderPill.classList.add("is-selected");
  }
});

// Inline Editing Persistence for AI Narrative Story
document.addEventListener("blur", (e) => {
  const target = e.target;
  if (!target || !target.isContentEditable) return;

  const tripId = state.activeTripId;
  const currentStory = state.generatedStories[tripId] || { title: "", lead: "", sections: [] };

  if (target.dataset.storyField === "title") {
    currentStory.title = target.innerText.trim();
    state.setGeneratedStory(tripId, currentStory);
  } else if (target.dataset.storyField === "lead") {
    currentStory.lead = target.innerText.trim();
    state.setGeneratedStory(tripId, currentStory);
  } else if (target.dataset.storySecTitle !== undefined) {
    const idx = parseInt(target.dataset.storySecTitle, 10);
    if (currentStory.sections && currentStory.sections[idx]) {
      currentStory.sections[idx].title = target.innerText.trim();
      state.setGeneratedStory(tripId, currentStory);
    }
  } else if (target.dataset.storySecBody !== undefined) {
    const idx = parseInt(target.dataset.storySecBody, 10);
    if (currentStory.sections && currentStory.sections[idx]) {
      currentStory.sections[idx].body = target.innerText.trim();
      state.setGeneratedStory(tripId, currentStory);
    }
  }
}, true);

// Initialize reactive state listener & initial render
state.subscribe(render);
render();

// Silent Behind-the-Curtains Background Scan for Live Data & Concert Enrichment
let scanTriggered = false;
async function runBackgroundEnrichmentScan() {
  if (scanTriggered) return;
  scanTriggered = true;

  try {
    const trip = state.activeTrip;
    const coords = trip.center || [48.8566, 2.3522];

    // 1. Fetch live Open-Meteo weather
    fetchOpenMeteoWeather(coords[0], coords[1]).then((weatherData) => {
      if (weatherData && weatherData.temp) {
        trip.weather = weatherData;
        state.notify();
      }
    }).catch(() => {});

    // 2. Discover live nearby places & concerts from Worker / OSM API
    const res = await enrichmentService.discoverNearby({
      coordinates: coords,
      radiusMeters: 2500,
      intent: "traveler"
    }).catch(() => null);

    if (res && res.places && res.places.length > 0) {
      state.liveNearbyPlaces = res.places;
    }

    // 3. Enrich trip events with Live Concerts & Music performances
    const concertEnrichmentData = await fetchConcertsForTrip(trip.destination, coords);

    if (!trip.events) trip.events = [];
    const existingTitles = new Set(trip.events.map(e => e.title));
    (concertEnrichmentData || []).forEach(concert => {
      if (!existingTitles.has(concert.title)) {
        trip.events.unshift(concert);
      }
    });

    state.notify();
  } catch (err) {
    console.warn("Background enrichment scan completed with fallback.", err);
  }
}

// Trigger scan behind the scenes while landing page is shown
setTimeout(() => {
  runBackgroundEnrichmentScan();
}, 200);

export function showToast(message) {
  let toastContainer = document.getElementById("app-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "app-toast-container";
    toastContainer.style.cssText = "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 200000; pointer-events: none; width: calc(100% - 32px); max-width: 400px;";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = "app-toast";
  toast.style.cssText = "background: var(--ink); color: var(--paper); padding: 12px 18px; border-radius: var(--radius-pill); font-size: 0.85rem; font-weight: 600; box-shadow: var(--shadow-lg); text-align: center; margin-bottom: 8px; animation: toastSlideIn 0.25s ease-out;";
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Global File Change Handler for Profile Avatar Uploads
document.addEventListener("change", (e) => {
  if (e.target.matches("[data-profile-field]")) {
    const field = e.target.dataset.profileField;
    const group = e.target.dataset.profileGroup;
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (group) {
      state.updateNestedUserProfileField(group, field, value);
    } else {
      state.updateUserProfileField(field, value);
    }
    showToast("Profile setting autosaved.");
  }

  if (e.target && e.target.id === "avatar-file-input" && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    saveAvatarFile(file).catch(() => {
      const reader = new FileReader();
      reader.onload = function(evt) {
        if (evt.target && evt.target.result) {
          state.updateUserAvatar(evt.target.result);
          showToast("Profile photo autosaved.");
        }
      };
      reader.readAsDataURL(file);
    });
  }
});

async function saveAvatarFile(file) {
  const dataUrl = await createCompressedAvatarDataUrl(file);
  state.updateUserAvatar(dataUrl);
  showToast("Profile photo autosaved.");
}

async function createCompressedAvatarDataUrl(file) {
  const bitmap = await createImageBitmap(file);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = Math.max(0, (bitmap.width - sourceSize) / 2);
  const sourceY = Math.max(0, (bitmap.height - sourceSize) / 2);
  ctx.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.86);
}
