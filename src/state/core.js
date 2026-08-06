/**
 * AppState — base class.
 * Holds all constructor init, core getters, pub/sub, and view/trip navigation.
 * Domain methods are mixed in via Object.assign in index.js.
 */
import { tripsData } from "../data/tripsData.js";
import { getTripDateStatus } from "../utils/tripDates.js";
import {
  filterTripScopedItems,
  getDefaultPlanViewMode,
  getInviteFromLocation,
  isFutureTrip,
  removeStoredCalendarEvents,
  readStoredCalendarEvents,
  readStoredGuestDraftTrips,
  readStoredTheme,
  readStoredTourismDiscovery,
  readStoredTripCompanions,
  readStoredUserProfile,
  resolveFutureTripId,
} from "./helpers.js";

export class AppState {
  constructor() {
    // Populate any stored local guest draft trips
    const guestDrafts = readStoredGuestDraftTrips();
    Object.assign(tripsData, guestDrafts);

    // ── View & navigation ────────────────────────────────────────────────────
    this.activeView = "landing"; // "landing" | "home" | "live" | "plan" | "search"
    this.activeTripId = Object.keys(tripsData)[0] || null;
    this.tripMode = false;

    // ── Plan view ────────────────────────────────────────────────────────────
    this.planSubTab = "plan"; // "overview" | "plan" | "explore" | "journal"
    this.journalSection = "gallery"; // "gallery" | "notes" | "story" | "templates"
    this.journalTemplateFilter = "all";
    this.journalMediaQuery = "";
    this.journalMediaFilter = "all"; // "all" | "photos" | "videos"
    this.planViewMode = getDefaultPlanViewMode(); // "day" | "week" | "timeline" | "map"
    this.activeDayIndex = 0;
    this.mapDayFilter = null;

    // ── Search ───────────────────────────────────────────────────────────────
    this.searchQuery = "";
    this.searchCategory = "All";
    this.searchSubFilter = "All";

    // ── Saved places ─────────────────────────────────────────────────────────
    let localSaved = [];
    try {
      const stored = localStorage.getItem("trip_saved_places");
      if (stored) localSaved = JSON.parse(stored);
    } catch {}
    this.savedPlaceIds = new Set(localSaved.length ? localSaved : ["i1", "i2", "i3", "i4", "sp1", "sp2"]);

    // ── User profile & session ───────────────────────────────────────────────
    this.userProfile = readStoredUserProfile();
    this.activeProfileSection = "profile";
    this.profileCompanionTripId = resolveFutureTripId(this.activeTripId);
    this.userSession = { status: "checking", role: "anonymous", userId: "", authType: "none" };
    this.themeMode = readStoredTheme();
    this.userAvatar = this.userProfile.avatarUrl;
    this.userPreferences = new Set(this.userProfile.personas || []);

    // ── Geolocation & backend ────────────────────────────────────────────────
    this.userLocation = null;
    this.locationResolved = null;
    this.liveNearbyPlaces = [];
    this.liveNearbyPlacesTripId = "";
    this.backendHealth = { status: "checking", bindings: {}, secrets: {}, services: {}, generatedAt: "" };
    this.tourismDiscoveryStatus = {};
    this.eventDiscoveryStatus = {};
    this.tripIntelligenceStatus = {};
    this.tripSyncStatus = { status: "idle", error: "", updatedAt: "" };

    // ── Moments ──────────────────────────────────────────────────────────────
    this.moments = [
      {
        id: "m1",
        tripId: "paris",
        title: "Morning coffee in Saint-Germain",
        type: "note",
        date: "2026-10-03",
        text: "Watched the city wake up over fresh croissants and espresso.",
      },
    ];

    // ── Checklists ───────────────────────────────────────────────────────────
    this.checklists = {};
    Object.keys(tripsData).forEach((tripId) => {
      if (tripsData[tripId]?.checklist) {
        this.checklists[tripId] = [...tripsData[tripId].checklist];
      }
    });

    // ── Bootstrap trip data from localStorage ────────────────────────────────
    Object.keys(tripsData).forEach((tripId) => {
      const storedEvents = readStoredCalendarEvents(tripId);
      if (storedEvents) {
        const scopedEvents = filterTripScopedItems(storedEvents, tripsData[tripId]);
        if (scopedEvents.length === storedEvents.length) {
          tripsData[tripId].calendarEvents = scopedEvents;
        } else {
          tripsData[tripId].calendarEvents = scopedEvents;
          removeStoredCalendarEvents(tripId);
        }
      }
      const storedDiscovery = readStoredTourismDiscovery(tripId, tripsData[tripId]);
      if (storedDiscovery) {
        tripsData[tripId].tourismPois = storedDiscovery.tourismPois;
        tripsData[tripId].hiddenGems = storedDiscovery.hiddenGems;
        tripsData[tripId].osmPlaces = storedDiscovery.osmPlaces;
        tripsData[tripId].companions = readStoredTripCompanions(tripId);
        this.tourismDiscoveryStatus[tripId] = {
          status: "cached",
          error: "",
          updatedAt: storedDiscovery.updatedAt,
          personaKey: storedDiscovery.personaKey,
        };
      } else {
        tripsData[tripId].tourismPois = tripsData[tripId].tourismPois || [];
        tripsData[tripId].hiddenGems = tripsData[tripId].hiddenGems || [];
        tripsData[tripId].osmPlaces = tripsData[tripId].osmPlaces || [];
        tripsData[tripId].companions = readStoredTripCompanions(tripId);
        this.tourismDiscoveryStatus[tripId] = { status: "idle", error: "", updatedAt: "" };
      }
    });

    // ── UI modal / overlay state ─────────────────────────────────────────────
    this.generatedStories = {};
    this.quickCaptureOpen = false;
    this.quickCaptureTab = "capture";
    this.quickCaptureTripId = this.activeTripId;
    this.quickCaptureUpload = { status: "idle", progress: 0, fileName: "", type: "" };
    this.activeLightboxMedia = null;
    this.activeTemplatePicker = null;
    this.activeEventDrawer = null;
    this.activeCompanionQrId = "";
    this.activeInvite = getInviteFromLocation();
    this.onboardingOpen = false;
    this.onboardingSlideIndex = 0;
    this.helpOpen = false;
    this.helpQuery = "";
    this.authExitOpen = false;
    this.authMode = "login"; // "login" | "signup" | "forgot"
    this.premiumOpen = false;
    this.tripCreateOpen = false;
    this.tripManagerOpen = false;
    this.activePoiDetail = null;
    this.termsOpen = false;
    this.privacyOpen = false;
    this.aiConciergeOpen = false;
    this.aiConciergeHistory = [];
    this.aiConciergeLoading = false;
    let storedAiKeys = {};
    try {
      const stored = localStorage.getItem("trip_ai_provider_keys_v1");
      if (stored) storedAiKeys = JSON.parse(stored);
    } catch {}
    this.aiConciergeProvider = "auto"; // "auto" | "workers-ai" | "deepseek-free" | "openrouter-free" | "groq-free" | "gemini" | "openai" | "claude" | "grok"
    this.aiProviderKeys = {
      openAiKey: storedAiKeys.openAiKey || "",
      geminiKey: storedAiKeys.geminiKey || "",
      claudeKey: storedAiKeys.claudeKey || "",
      grokKey: storedAiKeys.grokKey || "",
      openRouterKey: storedAiKeys.openRouterKey || "",
      groqKey: storedAiKeys.groqKey || "",
    };
    this.aiSettingsOpen = false;
    this.aiSettingsModalOpen = false;
    this.destinationSummaries = {};
    this.photoEditorOpen = false;
    this.photoEditorImageSrc = null;
    this.photoEditorIsSignup = false;
    this.photoEditorMode = "avatar"; // "avatar" | "journal" | "quick_capture"
    this.photoEditorTargetMomentId = "";
    this.photoEditorAspect = "1:1"; // "circle" | "1:1" | "4:5" | "16:9"
    this.photoEditorSticker = "postcard_stamp"; // "none" | "postcard_stamp" | "passport_seal" | "location_badge" | "wanderlust"
    this.photoEditorFilter = "none"; // "none" | "vintage" | "sunny" | "noir" | "vivid"
    this.photoEditorCaption = "";
    this.photoEditorPendingMomentData = null;
    this._photoEditorTab = "upload"; // "upload" | "crop" | "stickers" | "filters" | "presets"

    // ── Pub/sub ──────────────────────────────────────────────────────────────
    this.listeners = new Set();

    // ── Kick off async bootstrapping (methods from mixins) ───────────────────
    this.checkBackendHealth();
    this.bootstrapAccountData();
    this.loadPersistedMoments();
    this.refreshWeather();
    this.refreshTourismDiscovery();
    this.refreshEventDiscovery();
    this.refreshTripIntelligence();
    this.loadTripCompanions(this.activeTripId);
    if (this.activeInvite?.tripId && tripsData[this.activeInvite.tripId]) {
      this.acceptTripInvite({ mode: "preview", notify: false });
    }
  }

  // ── Pub/sub ────────────────────────────────────────────────────────────────

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this));
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get activeTrip() {
    return tripsData[this.activeTripId] || Object.values(tripsData)[0] || null;
  }

  get isAdmin() {
    return this.userSession?.role === "admin";
  }

  get isAuthenticated() {
    const type = this.userSession?.authType || "none";
    return type === "traveler-session" || type === "admin-session";
  }

  get canShowConciergeAndAssistant() {
    const isSignedIn = this.isAuthenticated;
    const trips = this.getAllTrips();
    const hasTrip = Boolean((this.activeTrip && this.activeTrip.id) || (trips && trips.length > 0));
    return isSignedIn && hasTrip;
  }

  // ── Trip navigation ────────────────────────────────────────────────────────

  getAllTrips() {
    return Object.values(tripsData);
  }

  setTrip(tripId) {
    if (tripsData[tripId] && this.activeTripId !== tripId) {
      this.activeTripId = tripId;
      this.tripMode = getTripDateStatus(tripsData[tripId]).state === "active";
      this.locationResolved = null;
      this.liveNearbyPlaces = [];
      this.liveNearbyPlacesTripId = "";
      if (!this.profileCompanionTripId || !isFutureTrip(tripsData[this.profileCompanionTripId])) {
        this.profileCompanionTripId = resolveFutureTripId(tripId, this.profileCompanionTripId);
      }
      this.loadTripCompanions(tripId);
      if (!this.quickCaptureOpen) {
        this.quickCaptureTripId = tripId;
      }
      this.refreshWeather();
      this.refreshTourismDiscovery(tripId);
      this.refreshEventDiscovery(tripId);
      this.refreshTripIntelligence(tripId);
      this.notify();
    }
  }

  cycleNextTrip() {
    const keys = Object.keys(tripsData);
    if (keys.length === 0) return;
    const currentIndex = keys.indexOf(this.activeTripId);
    const nextIndex = (currentIndex + 1) % keys.length;
    this.activeTripId = keys[nextIndex];
    this.tripMode = getTripDateStatus(tripsData[this.activeTripId]).state === "active";
    this.refreshTourismDiscovery(this.activeTripId);
    this.refreshEventDiscovery(this.activeTripId);
    this.refreshTripIntelligence(this.activeTripId);
    this.notify();
  }

  setProfileCompanionTrip(tripId) {
    if (!isFutureTrip(tripsData[tripId])) return;
    this.profileCompanionTripId = tripId;
    this.activeCompanionQrId = "";
    this.loadTripCompanions(tripId);
    this.notify();
  }

  // ── View state ─────────────────────────────────────────────────────────────

  setView(view) {
    if (this.activeView !== view) {
      this.activeView = view;
      this.notify();
    }
  }

  toggleTripMode(enabled) {
    const wantsLiveMode = enabled !== undefined ? Boolean(enabled) : !this.tripMode;
    const isLiveByDate = getTripDateStatus(this.activeTrip).state === "active";
    this.tripMode = wantsLiveMode && isLiveByDate;
    this.notify();
    return this.tripMode;
  }

  setPlanSubTab(tab) {
    this.planSubTab = tab;
    this.notify();
  }

  setPlanViewMode(mode) {
    this.planViewMode = mode;
    this.notify();
  }

  setActiveDay(index) {
    this.activeDayIndex = index;
    this.notify();
  }

  setMapDayFilter(index) {
    this.mapDayFilter = index === null || index === undefined ? null : Number(index);
    this.notify();
  }

  setSearchQuery(query, options = {}) {
    this.searchQuery = query;
    if (options.notify !== false) this.notify();
  }

  setSearchCategory(category) {
    this.searchCategory = category;
    this.notify();
  }

  setSearchSubFilter(filter) {
    this.searchSubFilter = filter;
    this.notify();
  }

  setJournalSection(section = "gallery") {
    const next = ["gallery", "notes", "story", "templates"].includes(section) ? section : "gallery";
    if (this.journalSection !== next) {
      this.journalSection = next;
      this.notify();
    }
  }

  setJournalTemplateFilter(filter = "all") {
    const next = ["all", "moments", "stories", "guides", "videos", "prints"].includes(filter) ? filter : "all";
    if (this.journalTemplateFilter !== next) {
      this.journalTemplateFilter = next;
      this.notify();
    }
  }

  setJournalMediaQuery(query = "") {
    const next = String(query || "").trim();
    if (this.journalMediaQuery !== next) {
      this.journalMediaQuery = next;
      this.notify();
    }
  }

  cycleJournalMediaFilter() {
    const order = ["all", "photos", "videos"];
    const currentIndex = order.indexOf(this.journalMediaFilter);
    this.journalMediaFilter = order[(currentIndex + 1) % order.length];
    this.notify();
    return this.journalMediaFilter;
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────

  openLightbox(media) {
    this.activeLightboxMedia = media;
    this.notify();
  }

  closeLightbox() {
    this.activeLightboxMedia = null;
    this.notify();
  }

  // ── Generated stories ──────────────────────────────────────────────────────

  setGeneratedStory(tripId, story) {
    this.generatedStories[tripId] = story;
    this.notify();
  }
}
