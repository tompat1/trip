import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { state } from "./state.js";
import { renderHomeView } from "./views/HomeView.js";
import { renderPlanView } from "./views/PlanView.js";
import { renderSearchView } from "./views/SearchView.js";
import { renderLandingView } from "./views/LandingView.js";
import { renderLiveView, renderProfileView } from "./views/LiveView.js";
import { renderBottomNav } from "./components/BottomNav.js";
import { renderLightbox } from "./components/Lightbox.js";
import "./styles.css";

let activeMaps = new Map();

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
  const lightboxHtml = renderLightbox();

  appEl.innerHTML = `
    <div class="app-view app-view--${view}">
      ${viewHtml}
      ${bottomNavHtml}
      ${lightboxHtml}
    </div>
  `;

  // Initialize maps after DOM update
  requestAnimationFrame(() => {
    initMapsForView(view);
  });
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
      activeMaps.set("plan", map);
    }
  }
}

// Global Event Listeners Delegation
document.addEventListener("click", (e) => {
  const target = e.target.closest("[data-nav], [data-action], [data-subtab], [data-viewmode], [data-day-select], [data-cat], [data-subfilter]");
  if (!target) return;

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
    state.setView(nav);
    return;
  }

  // Data action handlers
  const action = target.dataset.action;
  if (action) {
    if (action === "go-app" || action === "go-home") state.setView("home");
    else if (action === "go-plan") state.setView("plan");
    else if (action === "go-search") state.setView("search");
    else if (action === "go-live") state.setView("live");
    else if (action === "go-moments" || action === "go-profile") state.setView("profile");
    else if (action === "switch-to-landing") state.setView("landing");
    else if (action === "switch-trip" || action === "toggle-trip-switch" || action === "cycle-next-trip") {
      state.cycleNextTrip();
    }
    else if (action === "toggle-bookmark") {
      const placeId = target.dataset.placeId;
      if (placeId) state.toggleSavedPlace(placeId);
    }
    else if (action === "toggle-check") {
      const itemId = target.dataset.itemId;
      if (itemId) state.toggleCheckitem(itemId);
    }
    else if (action === "clear-search-query") {
      state.setSearchQuery("");
    }
    else if (action === "locate-user" || action === "toggle-map-view" || action === "toggle-full-map") {
      state.setView("live");
    }
    else if (action === "edit-trip-title") {
      const current = state.activeTrip.destination || "Paris, France";
      const updated = prompt("Edit trip destination (country flag will be added automatically):", current);
      if (updated && updated.trim()) {
        state.updateTripTitle(state.activeTripId, updated.trim());
      }
    }
    else if (action === "create-trip") {
      const destination = prompt("Enter trip destination (e.g. Tokyo, Japan):", "Tokyo, Japan");
      if (destination) {
        const dates = prompt("Enter travel dates (e.g. 12 – 19 Nov 2026):", "12 – 19 Nov 2026");
        const flag = prompt("Enter flag emoji (e.g. 🇯🇵):", "🇯🇵");
        state.createCustomTrip({ destination, dates, flag });
      }
    }
    else if (action === "add-event") {
      const title = prompt("Activity title (e.g. Tokyo Skytree Visit):", "Tokyo Skytree Visit");
      if (title) {
        const dayStr = prompt("Day index (0 = Sat, 1 = Sun, 2 = Mon...):", "0");
        const startTime = prompt("Start time (e.g. 14:00):", "14:00");
        const endTime = prompt("End time (e.g. 16:00):", "16:00");
        const location = prompt("Location/Neighborhood:", "Sumida City");
        state.addCalendarEvent(state.activeTripId, {
          title,
          dayIndex: parseInt(dayStr, 10) || 0,
          startTime,
          endTime,
          location,
          colorScheme: ["peach", "blue", "mint", "pink", "green", "gold"][Math.floor(Math.random() * 6)]
        });
      }
    }
    else if (action === "share-trip") {
      const trip = state.activeTrip;
      const shareUrl = `${window.location.origin}?trip=${encodeURIComponent(state.activeTripId)}`;
      if (navigator.share) {
        navigator.share({
          title: `TRIP - ${trip.destination}`,
          text: `Check out my travel plan & memories for ${trip.destination}!`,
          url: shareUrl
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert(`🔗 Trip share link copied to clipboard:\n${shareUrl}`);
        });
      }
    }
    else if (action === "admin-login-dialog") {
      const email = prompt("Enter admin/traveler email:", "thomas@rynell.org");
      if (email) {
        const password = prompt("Enter password:");
        if (password) {
          import("./enrichment/enrichmentService.js").then(({ enrichmentService }) => {
            enrichmentService.loginAdmin({ email, password })
              .then((res) => {
                alert(`✅ Signed in successfully! Token: ${res.token ? 'Active' : 'Granted'}`);
                state.notify();
              })
              .catch((err) => alert(`Authentication note: ${err.message}`));
          });
        }
      }
    }
    else if (action === "quick-photo" || action === "quick-video") {
      const fileInput = document.getElementById("quick-capture-file-input");
      if (fileInput) {
        fileInput.click();
      } else {
        const text = prompt(`Record a ${action.replace('quick-', '')} moment:`, `Captured a moment in ${state.activeTrip.destination}!`);
        if (text) state.addMoment({ title: "Media Moment", text, type: "photo" });
      }
    }
    else if (action.startsWith("quick-")) {
      const type = action.replace("quick-", "");
      const text = prompt(`Record a ${type} moment:`, `Captured a beautiful ${type} during the journey!`);
      if (text) {
        state.addMoment({ title: `${type.toUpperCase()} Moment`, text, type });
        alert("Moment recorded & saved to D1 / local timeline!");
      }
    }
    else if (action === "open-lightbox") {
      const momentId = target.dataset.momentId;
      const media = (state.moments || []).find((m) => m.id === momentId);
      if (media) state.openLightbox(media);
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
    state.setSearchQuery(e.target.value);
  }
});

// Trip mode & dropdown change listener
document.addEventListener("change", (e) => {
  if (e.target.dataset.action === "select-trip-dropdown") {
    state.setTrip(e.target.value);
  }
  if (e.target.dataset.action === "toggle-trip-mode") {
    state.toggleTripMode(e.target.checked);
  }
  if (e.target.id === "quick-capture-file-input" && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      state.addMoment({
        title: `Captured ${file.type.startsWith('video') ? 'Video' : 'Photo'}`,
        text: file.name,
        type: file.type.startsWith('video') ? 'video' : 'photo',
        media_url: dataUrl
      });
      alert(`📸 ${file.name} uploaded & recorded to your trip memory timeline!`);
    };
    reader.readAsDataURL(file);
  }
});

// Initialize reactive state listener & initial render
state.subscribe(render);
render();
