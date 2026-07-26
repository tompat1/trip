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
import { renderQuickCaptureWidget } from "./components/QuickCaptureWidget.js";
import { fetchConcertsForTrip } from "./services/concertService.js";
import { fetchOpenMeteoWeather } from "./services/weatherService.js";
import { enrichmentService } from "./enrichment/enrichmentService.js";
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
  const quickCaptureHtml = view !== "landing" ? renderQuickCaptureWidget() : "";
  const lightboxHtml = renderLightbox();
  const drawerHtml = renderEventDrawer();

  appEl.innerHTML = `
    <div class="app-view app-view--${view}">
      ${viewHtml}
      ${bottomNavHtml}
      ${quickCaptureHtml}
      ${lightboxHtml}
      ${drawerHtml}
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
document.addEventListener("click", async (e) => {
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
    else if (action === "view-notifications") {
      alert(`🔔 Notifications:\n\n• Weather update: 23°C in ${state.activeTrip.destination}\n• 2 planning tasks remaining for your trip!`);
    }
    else if (action === "invite-companions") {
      const companionEmail = prompt("Enter email of travel companion to invite:", "partner@example.com");
      if (companionEmail) {
        alert(`✈️ Shared trip invitation to ${companionEmail} for ${state.activeTrip.destination}!`);
      }
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
    else if (action === "toggle-user-persona") {
      const persona = target.dataset.persona;
      if (persona) {
        state.toggleUserPreference(persona);
        const isActive = state.userPreferences && state.userPreferences.has(persona);
        showToast(isActive ? `✨ Profile updated with ${persona}!` : `Removed ${persona} from profile.`);
      }
    }
    else if (action === "apply-quick-intent") {
      const q = target.dataset.query || "";
      const cat = target.dataset.cat || "All";
      state.setSearchQuery(q);
      state.setSearchCategory(cat);
      showToast(`🔍 Filtered for ${target.innerText.trim()}`);
    }
    else if (action === "trigger-file-upload") {
      const fileInput = document.getElementById("capture-file-input");
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
        title,
        text,
        type: "note",
        media_url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80"
      });
      state.toggleQuickCapture(false);
      showToast(`📸 Saved "${title}" to your Journal & Story!`);
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
    state.setSearchQuery(e.target.value, { notify: false });
    updateSearchResultsInPlace(e.target);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const actionCard = e.target.closest?.('[role="button"][data-action]');
  if (!actionCard) return;
  e.preventDefault();
  actionCard.click();
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
  if (e.target && e.target.id === "avatar-file-input" && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (evt.target && evt.target.result) {
        state.updateUserAvatar(evt.target.result);
        showToast("📸 Profile photo updated!");
      }
    };
    reader.readAsDataURL(file);
  }
});
