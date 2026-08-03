import { state } from "./state.js";
import { renderSearchResults } from "./views/SearchView.js";
import { resolveAirportInput } from "./services/airportService.js";
import { formatTripDateRangeFromParts } from "./utils/tripDates.js";
import { enrichmentService } from "./enrichment/enrichmentService.js";
import { scheduleBackgroundEnrichmentScan } from "./app/backgroundEnrichmentController.js";
import { registerCalendarDragController } from "./app/calendarDragController.js";
import { buildJournalTemplateStory, getRecommendedTemplateMomentIds } from "./app/journalController.js";
import { bootApp, flashPageLoader, isAppBooted, renderTripLoadingPage, withPageLoader } from "./app/loadingController.js";
import { initMapsForView, resolveTripCenter, selectPoiOnOverviewMap } from "./app/mapController.js";
import { handleQuickCaptureFiles } from "./app/mediaCaptureController.js";
import { handleDockNavigation, handleRouteAction } from "./app/navigationController.js";
import { renderAppShell } from "./app/renderController.js";
import { closeAirportAutocompleteMenus, handleTransitFlightRouteSubmit, handleTripCreateSubmit, updateAirportAutocomplete, updateTripCreateRoutePreview } from "./app/tripFormController.js";
import { PhotoEditorController } from "./components/ProfilePhotoEditorModal.js";
import "./styles.css";

let lastRenderedView = "";
let activePhotoEditorController = null;

function render() {
  const appEl = document.getElementById("app");
  if (!appEl) return;
  applyThemeMode();

  if (!isAppBooted()) {
    if (!appEl.querySelector(".trip-loading-page")) {
      appEl.innerHTML = renderTripLoadingPage();
    }
    return;
  }

  const view = state.activeView;
  const isRouteChange = lastRenderedView && lastRenderedView !== view;
  lastRenderedView = view;

  appEl.innerHTML = renderAppShell(view, { isRouteChange });

  // Initialize photo editor controller if open
  if (state.photoEditorOpen) {
    requestAnimationFrame(() => {
      const canvasEl = document.getElementById("photo-editor-canvas");
      if (canvasEl) {
        activePhotoEditorController = new PhotoEditorController(
          state,
          async (croppedDataUrl) => {
            if (state.photoEditorMode === "avatar") {
              state.updateUserAvatar(croppedDataUrl);
              state.closePhotoEditor();
              showToast("📸 Profile photo updated!");
            } else if (state.photoEditorMode === "journal" && state.photoEditorTargetMomentId) {
              await state.updateMoment(state.photoEditorTargetMomentId, { media_url: croppedDataUrl });
              state.closePhotoEditor();
              showToast("✨ Journal photo & travel graphics saved!");
            } else if (state.photoEditorMode === "quick_capture" && state.photoEditorPendingMomentData) {
              await state.addMoment({
                ...state.photoEditorPendingMomentData,
                media_url: croppedDataUrl,
              });
              state.closePhotoEditor();
              showToast("📸 Stamped photo saved to Journal!");
            } else {
              state.updateUserAvatar(croppedDataUrl);
              state.closePhotoEditor();
              showToast("Photo saved!");
            }
          },
          showToast
        );
        activePhotoEditorController.init(state.photoEditorImageSrc);
      }
    });
  } else {
    activePhotoEditorController = null;
  }

  // Initialize maps after DOM update
  requestAnimationFrame(() => {
    initMapsForView(view);
  });
}

function applyThemeMode() {
  const theme = state.themeMode || "system";
  const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  document.documentElement.dataset.themePreference = theme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
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

function getCompanionById(companionId = "", tripId = state.profileCompanionTripId || state.activeTripId) {
  const trip = state.getAllTrips().find((item) => item.id === tripId) || state.activeTrip;
  return (trip?.companions || []).find((companion) => companion.id === companionId);
}

function getInviteText(companion = {}) {
  if (companion.inviteText) return companion.inviteText;
  const trip = state.getAllTrips().find((item) => item.id === companion.tripId) || state.activeTrip || {};
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
    const trip = state.getAllTrips().find((item) => item.id === companion.tripId) || state.activeTrip;
    const subject = `Trip invite: ${companion.tripTitle || trip?.destination || "our trip"}`;
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

async function logOutAndShowExit() {
  try {
    await enrichmentService.logoutAdmin();
  } catch {}
  // Clear any D1-owned trips from memory so next visitor can't see them.
  state.clearUserOwnedTrips();
  await state.refreshUserSession();
  state.showAuthExit();
  showToast("Signed out.");
}

function hasAppSession() {
  return state.isAuthenticated;
}

function requireAppSession(mode = "login", message = "Sign in to continue.") {
  if (hasAppSession()) return true;
  state.showAuthExit(mode);
  showToast(message);
  return false;
}

// Global Event Listeners Delegation
document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-nav], [data-action], [data-subtab], [data-journal-section], [data-template-filter], [data-viewmode], [data-day-select], [data-map-day-filter], [data-trip-length], [data-cat], [data-subfilter], [data-overview-filter]");
  if (!target) {
    if (!e.target.closest?.(".airport-autocomplete")) closeAirportAutocompleteMenus();
    return;
  }
  primeMotionFeedback(target);

  if (target.dataset.overviewFilter) {
    state.overviewFilter = target.dataset.overviewFilter;
    state.notify();
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
    handleDockNavigation(target, { requireAppSession, flashPageLoader });
    return;
  }

  // Data action handlers
  const action = target.dataset.action;
  if (action) {
    if (handleRouteAction(action, target, { requireAppSession, flashPageLoader })) return;

    if (action === "set-theme-mode") {
      state.setThemeMode(target.dataset.themeMode || "system");
      showToast(`Theme set to ${state.themeMode}.`);
    }
    else if (action === "refresh-weather") {
      state.refreshWeather();
    }
    else if (action === "refresh-trip-ideas") {
      showToast("Refreshing trip ideas...");
      const result = await withPageLoader("Refreshing ideas", () => state.refreshTourismDiscovery(state.activeTripId, { force: true }));
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
      const result = await withPageLoader("Refreshing events", () => state.refreshEventDiscovery(state.activeTripId, { force: true }));
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
      const result = await withPageLoader("Refreshing live", () => state.refreshTripIntelligence(state.activeTripId, { force: true }));
      if (result?.status === "error") {
        showToast("Could not refresh travel signals right now.");
      } else {
        const okCount = (result?.providerStatus || []).filter((provider) => provider.status === "ok").length;
        showToast(okCount ? `Trip intelligence refreshed from ${okCount} live sources.` : "Trip intelligence refreshed with available fallbacks.");
      }
    }
    else if (action === "refresh-backend-health") {
      showToast("Checking production services...");
      await state.checkBackendHealth();
      const health = state.backendHealth || {};
      showToast(health.status === "connected" ? "Production service status refreshed." : "Production health unavailable. Showing local status.");
    }
    else if (action === "search-trip-flights") {
      showToast("Searching flights for this route...");
      await withPageLoader("Searching flights", () => state.searchFlightsForActiveTrip());
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
    else if (action === "open-help") {
      state.openHelp();
    }
    else if (action === "close-help") {
      state.closeHelp();
    }
    else if (action === "open-auth-panel") {
      if (hasAppSession()) {
        flashPageLoader("Opening home");
        state.setView("home");
      } else {
        state.showAuthExit(target.dataset.authMode || "login");
      }
    }
    else if (action === "close-auth-panel") {
      state.closeAuthExit();
    }
    else if (action === "set-auth-mode") {
      state.setAuthMode(target.dataset.authMode || "login");
    }
    else if (action === "invite-companions") {
      flashPageLoader("Opening invites");
      state.setView("profile");
      setTimeout(() => document.getElementById("profile-companion-form")?.querySelector("input[name='email']")?.focus(), 0);
    }
    else if (action === "toggle-filters") {
      const subFilter = state.searchSubFilter === "Top rated" ? "All" : "Top rated";
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
    else if (action === "switch-quick-capture-tab") {
      const tab = target.dataset.tab || "concierge";
      state.switchQuickCaptureTab(tab);
    }
    else if (action === "toggle-quick-capture") {
      state.toggleQuickCapture();
    }
    else if (action === "open-quick-capture") {
      if (state.activeTemplatePicker) state.closeTemplatePicker();
      state.setQuickCaptureTrip(state.activeTripId);
      state.toggleQuickCapture(true);
    }
    else if (action === "delete-journal-moment") {
      e.stopPropagation();
      const momentId = target.dataset.momentId;
      if (!momentId) return;
      if (confirm("Delete this moment from your trip journal?")) {
        state.deleteMoment(momentId);
        showToast("Moment deleted.");
      }
    }
    else if (action === "search-journal-media") {
      const nextQuery = prompt("Search moments by place, tag, or title:", state.journalMediaQuery || "");
      if (nextQuery !== null) {
        state.setJournalMediaQuery(nextQuery);
        showToast(nextQuery.trim() ? `Filtering moments for "${nextQuery.trim()}".` : "Moment search cleared.");
      }
    }
    else if (action === "cycle-journal-media-filter") {
      const nextFilter = state.cycleJournalMediaFilter();
      showToast(`Moment filter: ${nextFilter}.`);
    }
    else if (action === "close-quick-capture") {
      if (target.classList.contains("quick-capture-overlay") && e.target !== target) return;
      state.toggleQuickCapture(false);
    }
    else if (action === "toggle-ai-concierge") {
      state.toggleAiConcierge();
    }
    else if (action === "close-ai-concierge") {
      if (target.classList.contains("ai-concierge-overlay") && e.target !== target) return;
      state.toggleAiConcierge(false);
    }
    else if (action === "clear-ai-concierge") {
      state.clearAiConcierge();
    }
    else if (action === "send-ai-chip") {
      const promptText = target.dataset.prompt || "";
      if (promptText) state.askAiConcierge(promptText);
    }
    else if (action === "submit-ai-concierge") {
      const input = document.getElementById("ai-concierge-input");
      if (input && input.value.trim()) {
        const query = input.value.trim();
        input.value = "";
        state.askAiConcierge(query);
      }
    }
    else if (action === "auto-describe-moment") {
      const location = state.activeTrip?.destination || "Paris, France";
      const titleInput = document.getElementById("capture-title");
      const textInput = document.getElementById("capture-text");
      const userHint = (titleInput?.value || textInput?.value || "").trim();

      showToast("🪄 Workers AI analyzing moment...");
      import("./services/AiService.js").then(({ aiService }) => {
        aiService.autoDescribeMoment({ location, type: "photo", hint: userHint }).then((result) => {
          if (titleInput) {
            titleInput.value = result.suggestedTitle;
          }
          if (textInput) {
            textInput.value = `${result.caption}\n\n${result.tags.join(" ")}`;
          }
          showToast("✨ AI title & caption generated!");
        });
      });
    }
    else if (action === "generate-ai-postcard") {
      e.stopPropagation();
      const momentId = target.dataset.momentId;
      const moment = (state.moments || []).find((m) => m.id === momentId);
      if (!moment) return;

      const location = moment.geoLabel || state.activeTrip?.destination || "Paris, France";
      showToast("🎨 Workers AI creating vintage postcard...");
      import("./services/AiService.js").then(({ aiService }) => {
        aiService.generatePostcard({ location, style: "vintage", title: moment.title || "Greetings from", date: moment.date }).then((postcard) => {
          state.updateMoment(momentId, {
            isPostcard: true,
            postcardStyle: postcard.style,
            postcardFilter: postcard.vintageFilter,
            tags: Array.from(new Set([...(moment.tags || []), "#postcard", "#vintage"])),
          });
          showToast("✨ Transformed into Vintage Postcard!");
        });
      });
    }
    else if (action === "change-avatar") {
      const isSignedIn = ["admin", "traveler"].includes(state.userSession?.role);
      if (!isSignedIn) {
        state.setProfileSection("profile");
        showToast("Sign in to update your profile photo.");
        return;
      }
      state.openPhotoEditor();
    }
    else if (action === "close-photo-editor") {
      state.closePhotoEditor();
    }
    else if (action === "set-photo-editor-tab") {
      state.setPhotoEditorTab(target.dataset.tab);
    }
    else if (action === "trigger-photo-file-upload") {
      const fileInput = document.getElementById("photo-editor-file-input") || document.getElementById("avatar-file-input");
      if (fileInput) fileInput.click();
    }
    else if (action === "select-photo-preset") {
      const presetUrl = target.dataset.presetUrl || target.closest("[data-preset-url]")?.dataset.presetUrl;
      if (presetUrl) {
        state.photoEditorImageSrc = presetUrl;
        if (activePhotoEditorController) {
          activePhotoEditorController.setImage(presetUrl);
        } else {
          state.notify();
        }
      }
    }
    else if (action === "select-photo-sticker") {
      const sticker = target.dataset.sticker || target.closest("[data-sticker]")?.dataset.sticker;
      if (sticker) {
        state.setPhotoEditorSticker(sticker);
        activePhotoEditorController?.render();
      }
    }
    else if (action === "select-photo-filter") {
      const filter = target.dataset.filter || target.closest("[data-filter]")?.dataset.filter;
      if (filter) {
        state.setPhotoEditorFilter(filter);
        activePhotoEditorController?.render();
      }
    }
    else if (action === "set-photo-editor-aspect") {
      const aspect = target.dataset.aspect || target.closest("[data-aspect]")?.dataset.aspect;
      if (aspect) {
        state.setPhotoEditorAspect(aspect);
        activePhotoEditorController?.render();
      }
    }
    else if (action === "remove-photo-avatar") {
      if (state.photoEditorMode === "avatar") {
        state.updateUserAvatar("");
      }
      state.closePhotoEditor();
      showToast("Photo removed.");
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
      const tripId = target.dataset.tripId || state.profileCompanionTripId || state.activeTripId;
      if (companionId && confirm("Remove this travel companion from the trip?")) {
        await state.removeTripCompanion(tripId, companionId);
        showToast("Travel companion removed.");
      }
    }
    else if (action === "copy-companion-invite") {
      const companion = getCompanionById(target.dataset.companionId, target.dataset.tripId);
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
      showToast(`Saved "${title}" to ${receiverTrip.destination} Journal!`);
    }
    else if (action === "toggle-bookmark") {
      const placeId = target.dataset.placeId;
      if (placeId) {
        const isSaving = !state.savedPlaceIds.has(placeId);
        state.toggleSavedPlace(placeId);
        showToast(isSaving ? "🔖 Saved spot to your trip bookmarks!" : "Removed from saved bookmarks.");
      }
    }
    else if (action === "open-poi-detail") {
      const ideaId = target.dataset.ideaId;
      const trip = state.activeTrip;
      if (ideaId && trip) {
        const allIdeas = [
          ...(trip.tourismPois || []),
          ...(trip.hiddenGems || []),
          ...(trip.osmPlaces || []),
          ...(trip.ideas || []),
        ];
        const poi = allIdeas.find((item) => String(item.id) === String(ideaId));
        if (poi) {
          state.openPoiDetail(poi);
        }
      }
    }
    else if (action === "close-poi-detail") {
      state.closePoiDetail();
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
    else if (action === "open-template-picker") {
      const templateId = target.dataset.template || "photo-essay";
      state.openTemplatePicker(templateId, getRecommendedTemplateMomentIds(templateId, state.activeTrip));
    }
    else if (action === "close-template-picker") {
      state.closeTemplatePicker();
    }
    else if (action === "open-terms") {
      state.openTerms();
    }
    else if (action === "close-terms") {
      state.closeTerms();
    }
    else if (action === "open-privacy") {
      state.openPrivacy();
    }
    else if (action === "close-privacy") {
      state.closePrivacy();
    }
    else if (action === "toggle-template-picker-moment") {
      state.toggleTemplatePickerMoment(target.dataset.momentId || "");
    }
    else if (action === "template-picker-select-recommended") {
      const templateId = state.activeTemplatePicker?.templateId || "photo-essay";
      state.setTemplatePickerMoments(getRecommendedTemplateMomentIds(templateId, state.activeTrip));
      showToast("Recommended moments selected.");
    }
    else if (action === "template-picker-clear") {
      state.setTemplatePickerMoments([]);
    }
    else if (action === "confirm-template-picker") {
      const picker = state.activeTemplatePicker;
      if (!picker) return;
      const selectedMomentIds = picker.selectedMomentIds || [];
      if (!selectedMomentIds.length) {
        showToast("Choose at least one gallery moment first.");
        return;
      }
      const trip = state.activeTrip;
      const story = buildJournalTemplateStory(picker.templateId, trip, selectedMomentIds);
      state.setGeneratedStory(trip.id, story);
      state.closeTemplatePicker();
      state.setPlanSubTab("journal");
      state.setJournalSection("story");
      showToast(`${story.templateLabel} created from ${selectedMomentIds.length} ${selectedMomentIds.length === 1 ? "moment" : "moments"}.`);
    }
    else if (action === "generate-ai-story") {
      const trip = state.activeTrip;
      const templateId = target.dataset.template || "ai-story";
      if (templateId !== "ai-story") {
        const story = buildJournalTemplateStory(templateId, trip, getRecommendedTemplateMomentIds(templateId, trip));
        state.setGeneratedStory(trip.id, story);
        state.setPlanSubTab("journal");
        state.setJournalSection("story");
        showToast(`${story.templateLabel} created.`);
        return;
      }
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
          travellerProfile: { name: state.userProfile?.name || "Traveler" }
        });
        if (editorial) {
          state.setGeneratedStory(trip.id, {
            ...editorial,
            templateId: "ai-story",
            templateLabel: "AI narrative journal",
            kicker: "EDITORIAL TRAVEL ARCHIVE"
          });
          state.setPlanSubTab("journal");
          state.setJournalSection("story");
          showToast("📖 AI Travel Narrative Generated!");
        }
      } catch (e) {
        console.warn("Worker editorial generate fallback:", e);
        state.setGeneratedStory(trip.id, {
          templateId: "ai-story",
          templateLabel: "AI narrative journal",
          kicker: "EDITORIAL TRAVEL ARCHIVE",
          title: `Tales of ${trip.destination}`,
          lead: `Every place becomes a story. Journeying through ${trip.destination} brought together iconic architecture, historic quarter strolls, and vibrant local gastronomy.`,
          sections: [
            { title: "Morning Rhythms & Local Flavour", body: `Starting the morning in ${trip.destination} revealed a city waking up to fresh aromas, local markets, and timeless streets.` },
            { title: "Curated Wanders & Evening Light", body: `As twilight settled, exploring saved spots and historical quarters framed an unforgettable travel experience.` }
          ]
        });
        state.setPlanSubTab("journal");
        state.setJournalSection("story");
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
    else if (action === "add-poi-event") {
      const spotName = target.dataset.spotName || "Attraction";
      const trip = state.activeTrip;
      const events = trip ? (trip.calendarEvents || []) : [];
      const isAdded = events.some(e => (e.title || "").toLowerCase().includes(spotName.toLowerCase()) || spotName.toLowerCase().includes((e.title || "").toLowerCase()));
      if (isAdded) {
        showToast(`"${spotName}" is already on your itinerary calendar!`);
      } else {
        state.addCalendarEvent(state.activeTripId, {
          title: spotName,
          location: spotName,
          dayIndex: 0,
          startTime: "10:00",
          endTime: "12:00",
          colorScheme: "peach"
        });
        showToast(`✓ Added "${spotName}" to Day 1 of your trip itinerary!`);
      }
    }
    else if (action === "select-top-poi") {
      if (e.target.closest("button[data-action='add-poi-event'], button[data-action='toggle-bookmark']")) return;
      const spotIdx = parseInt(target.dataset.spotIdx, 10);
      const spotName = target.dataset.spotName || "";
      selectPoiOnOverviewMap(spotIdx, spotName);
    }
    else if (action === "open-directions") {
      const spotName = target.dataset.spotName || "Louvre Museum";
      const dest = state.activeTrip?.destination || "Paris";
      const query = encodeURIComponent(`${spotName} ${dest}`);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      window.open(mapsUrl, "_blank");
      showToast(`🧭 Opening directions for "${spotName}" in Maps...`);
    }
    else if (action === "locate-user" || action === "toggle-map-view" || action === "toggle-full-map") {
      flashPageLoader("Opening live");
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
      await withPageLoader("Updating trip", () => state.updateTripDetails(state.activeTripId, {
        destination: destination.trim(),
        startDate: startDate.trim(),
        daysCount,
        dates: formatTripDateRangeFromParts(startDate.trim(), daysCount),
        center: destinationAirport ? [destinationAirport.lat, destinationAirport.lng] : resolveTripCenter(destination.trim()),
        destinationAirport,
      }));
      showToast("Trip details updated. Refreshing local ideas and events.");
    }
    else if (action === "create-trip") {
      if (!requireAppSession("signup", "Create an account or sign in before creating trips.")) return;
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
      flashPageLoader("Opening invite");
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
    else if (action === "help-invite-companions") {
      state.closeHelp();
      flashPageLoader("Opening invite");
      openCompanionInviteFlow("link");
      showToast("Invite companions for the selected trip.");
    }
    else if (action === "help-open-plan") {
      state.closeHelp();
      state.setPlanSubTab("plan");
      flashPageLoader("Opening trips");
      state.setView("plan");
    }
    else if (action === "help-open-search") {
      state.closeHelp();
      flashPageLoader("Opening search");
      state.setView("search");
    }
    else if (action === "help-open-live") {
      state.closeHelp();
      flashPageLoader("Opening live");
      state.setView("live");
    }
    else if (action === "help-open-walkthrough") {
      state.closeHelp();
      state.openOnboarding();
    }
    else if (action === "admin-login-dialog") {
      const email = prompt("Enter admin/traveler email:", "thomas@rynell.org");
      if (email) {
        const password = prompt("Enter password:");
        if (password) {
          enrichmentService.loginAccount({ email, password, inviteTripId: state.activeInvite?.tripId || "" })
            .then(async () => {
              await withPageLoader("Signing in", () => state.refreshUserSession());
              if (state.activeInvite?.tripId) state.acceptTripInvite({ mode: "user" });
              showToast("Signed in.");
            })
            .catch((err) => alert(`Authentication note: ${err.message}`));
        }
      }
    }
    else if (action === "admin-logout") {
      await withPageLoader("Signing out", () => logOutAndShowExit(), { delay: 0 });
    }
    else if (action === "instant-logout") {
      await withPageLoader("Signing out", () => logOutAndShowExit(), { delay: 0 });
    }
    else if (action === "continue-as-guest") {
      state.closeAuthExit({ view: "landing" });
      showToast("Sign in or create an account to enter TRIP.");
    }
    else if (action === "go-home-from-exit") {
      state.closeAuthExit({ view: "landing" });
    }
    else if (action === "open-premium") {
      state.openPremium();
    }
    else if (action === "close-premium") {
      state.closePremium();
    }
    else if (action === "choose-premium-plan") {
      const plan = target.dataset.plan || "premium";
      localStorage.setItem("trip_premium_interest_v1", plan);
      state.closePremium();
      showToast(`Premium ${plan} interest saved. Payment wiring comes next.`);
    }
    else if (action === "social-auth") {
      const provider = target.dataset.provider || "provider";
      showToast(`${provider} sign-in is designed here. OAuth keys and callbacks are needed to turn it live.`);
    }
    else if (action === "open-lightbox") {
      const momentId = target.dataset.momentId;
      const media = (state.moments || []).find((m) => m.id === momentId);
      if (!media) return;
      if (!(media.media_url || media.mediaUrl)) {
        showToast("This capture is listed, but the image data is not available on this device.");
        return;
      }
      state.openLightbox(media);
    }
    else if (action === "edit-journal-media") {
      const momentId = target.dataset.momentId;
      const moment = (state.moments || []).find((m) => m.id === momentId);
      if (!moment) return;
      const imageSrc = moment.media_url || moment.mediaUrl || "";
      if (!imageSrc) {
        showToast("Image data not available to edit on this device.");
        return;
      }
      state.openJournalPhotoEditor(imageSrc, {
        mode: "journal",
        momentId: moment.id,
        momentData: moment,
        caption: moment.placeTitle || moment.title || "",
      });
    }
    else if (action === "close-lightbox") {
      state.closeLightbox();
    }
  }

  // Subtab switcher
  if (target.dataset.subtab) {
    state.setPlanSubTab(target.dataset.subtab);
  }

  if (target.dataset.journalSection) {
    state.setJournalSection(target.dataset.journalSection);
  }
  if (target.dataset.templateFilter) {
    state.setJournalTemplateFilter(target.dataset.templateFilter);
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

function primeMotionFeedback(target) {
  const motionTarget = target.closest("button, .dock-nav-item, .profile-menu-item, .trip-heads-up__summary");
  if (!motionTarget) return;
  motionTarget.classList.remove("is-pressing");
  void motionTarget.offsetWidth;
  motionTarget.classList.add("is-pressing");
  setTimeout(() => motionTarget.classList.remove("is-pressing"), 220);

  const action = target.dataset.action || "";
  if (!action.startsWith("refresh-")) return;
  document.documentElement.dataset.motionRefresh = action;
  setTimeout(() => {
    if (document.documentElement.dataset.motionRefresh === action) {
      delete document.documentElement.dataset.motionRefresh;
    }
  }, 900);
  const refreshButton = target.closest("button");
  if (!refreshButton) return;
  refreshButton.classList.add("is-refreshing");
  setTimeout(() => refreshButton.classList.remove("is-refreshing"), 900);
}

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
  if (e.target.matches("[data-help-search]")) {
    state.setHelpQuery(e.target.value);
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
  if (e.target.classList?.contains("help-overlay")) {
    state.closeHelp();
  }

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

document.addEventListener("submit", async (e) => {
  if (e.target.classList?.contains("home-concierge-quick-form") || e.target.dataset?.action === "submit-home-concierge-form") {
    e.preventDefault();
    const input = e.target.querySelector("#home-concierge-input") || document.getElementById("home-concierge-input");
    if (input && input.value.trim()) {
      const query = input.value.trim();
      input.value = "";
      state.toggleAiConcierge(true);
      state.askAiConcierge(query);
    }
    return;
  }

  if (e.target.id === "auth-exit-login-form") {
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
      await withPageLoader("Signing in", async () => {
        await enrichmentService.loginAccount({ email, password });
        await state.refreshUserSession();
        await state.loadD1Trips();
      }, { delay: 0 });
      state.closeAuthExit({ view: "home" });
      showToast("Signed back in.");
    } catch (error) {
      showToast("Login failed. Check your credentials.");
    } finally {
      if (button) button.disabled = false;
    }
    return;
  }

  if (e.target.id === "auth-signup-form") {
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
      await withPageLoader("Creating account", async () => {
        await enrichmentService.registerAccount({
          name,
          email,
          password,
          inviteTripId: state.activeInvite?.tripId || "",
        });
        state.updateUserProfile({ name, email }, { notify: false });
        await state.refreshUserSession();
        await state.loadD1Trips();
      }, { delay: 0 });
      state.closeAuthExit({ view: "home" });
      state.openPhotoEditor(null, { isSignup: true });
      showToast("Account created! Let's set up your profile photo.");
    } catch (error) {
      showToast(error?.status === 409 ? "An account already exists. Sign in instead." : "Could not create account right now.");
      if (error?.status === 409) state.setAuthMode("login");
    } finally {
      if (button) button.disabled = false;
    }
    return;
  }

  if (e.target.id === "auth-forgot-form") {
    e.preventDefault();
    const form = e.target;
    const email = form.email?.value?.trim() || "";
    if (!email) {
      showToast("Enter your email first.");
      return;
    }
    try {
      localStorage.setItem("trip_password_reset_requested_v1", JSON.stringify({ email, requestedAt: new Date().toISOString() }));
    } catch {}
    state.setAuthMode("login");
    showToast("Password reset noted. Email reset delivery comes next.");
    return;
  }

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
      await withPageLoader("Signing in", async () => {
        await enrichmentService.loginAccount({ email, password, inviteTripId: state.activeInvite?.tripId || "" });
        await state.refreshUserSession();
        await state.loadD1Trips();
      }, { delay: 0 });
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
    const formData = new FormData(form);
    const tripId = formData.get("tripId") || state.profileCompanionTripId || state.activeTripId;
    const result = await withPageLoader("Sending invite", () => state.inviteTripCompanion(tripId, {
      name: formData.get("name") || "",
      email: formData.get("email") || "",
      role: formData.get("role") || "viewer",
      inviteMethod: formData.get("inviteMethod") || "email",
      personalMessage: formData.get("personalMessage") || "",
    }));
    if (button) button.disabled = false;
    if (!result.ok && result.error === "invalid-email") {
      showToast("Add a valid companion email.");
      form.email?.focus();
      return;
    }
    if (!result.ok && result.error === "past-trip") {
      showToast("Choose a future trip before inviting companions.");
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
      await withPageLoader("Creating account", async () => {
        await enrichmentService.registerAccount({
          name,
          email,
          password,
          inviteTripId: state.activeInvite?.tripId || state.activeTripId,
        });
        state.updateUserProfile({ name, email }, { notify: false });
        await state.refreshUserSession();
      }, { delay: 0 });
      state.acceptTripInvite({ mode: "account" });
      state.openPhotoEditor(null, { isSignup: true });
      showToast("Account created! Let's set up your profile photo.");
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
    if (!state.isAdmin) {
      showToast("Admin access is required to add new personas.");
      return;
    }
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
    } else {
      showToast("That persona already exists.");
    }
    return;
  }

  if (e.target.id === "transit-flight-route-form") {
    e.preventDefault();
    await handleTransitFlightRouteSubmit(e.target, { showToast, withPageLoader });
    return;
  }

  if (e.target.id !== "trip-create-form") return;
  e.preventDefault();
  await handleTripCreateSubmit(e.target, { showToast, withPageLoader });
});

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
  if (e.target.dataset.action === "set-profile-companion-trip") {
    state.setProfileCompanionTrip(e.target.value || state.activeTripId);
  }
  if (e.target.id === "quick-capture-file-input" && e.target.files && e.target.files[0]) {
    await handleQuickCaptureFiles(e.target.files, { showToast });
    e.target.value = "";
  }
});

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
registerCalendarDragController();
bootApp(render);
scheduleBackgroundEnrichmentScan();

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

  if (e.target && (e.target.id === "avatar-file-input" || e.target.id === "photo-editor-file-input") && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (evt.target && evt.target.result) {
        const dataUrl = evt.target.result;
        state.photoEditorImageSrc = dataUrl;
        if (state.photoEditorOpen && activePhotoEditorController) {
          activePhotoEditorController.setImage(dataUrl);
        } else {
          state.openPhotoEditor(dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
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
