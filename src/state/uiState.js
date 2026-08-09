/**
 * uiState mixin — modals, overlays, panels, onboarding, auth dialogs, theme.
 */
import { markOnboardingSeen, writeStoredTheme } from "./helpers.js";
import { aiService } from "../services/AiService.js";

export function cleanAiResponseText(text = "") {
  if (!text) return "";
  let clean = text;

  // 1. Remove XML reasoning tags <think>...</think>
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // 2. Remove markdown reasoning blocks or preambles like "Thinking Process:", "Analysis:"
  clean = clean.replace(/^(?:Thinking Process|Analysis|Reasoning|Internal thoughts):[\s\S]*?(?=\n\n|\n[#\*1-9]|Here are|☕|📍|☔|🌿|🍷|🍽️)/gi, "");

  // 3. If preamble reasoning text exists (e.g. "Looking at the POIs...", "The user is asking..."), strip up to recommendations
  const recommendationStart = clean.search(/(?:Here are|1\.|☕|📍|☔|🌿|🍷|🍽️|\*\*)/i);
  if (recommendationStart > 0 && (clean.substring(0, recommendationStart).toLowerCase().includes("user is asking") || clean.substring(0, recommendationStart).toLowerCase().includes("looking at") || clean.substring(0, recommendationStart).toLowerCase().includes("cozy spots makes sense"))) {
    clean = clean.substring(recommendationStart);
  }

  return clean.trim();
}

export const uiStateMixin = {
  // ── Theme ──────────────────────────────────────────────────────────────────

  setThemeMode(theme = "system") {
    this.themeMode = ["system", "light", "dark"].includes(theme) ? theme : "system";
    writeStoredTheme(this.themeMode);
    this.notify();
  },

  // ── Auth exit ──────────────────────────────────────────────────────────────

  showAuthExit(mode = "login") {
    this.authExitOpen = true;
    this.authMode = ["login", "signup", "forgot"].includes(mode) ? mode : "login";
    this.helpOpen = false;
    this.onboardingOpen = false;
    this.activeInvite = null;
    this.notify();
  },

  closeAuthExit(options = {}) {
    this.authExitOpen = false;
    if (options.view) this.activeView = options.view;
    this.notify();
  },

  setAuthMode(mode = "login") {
    const next = ["login", "signup", "forgot"].includes(mode) ? mode : "login";
    if (this.authMode !== next) {
      this.authMode = next;
      this.notify();
    }
  },

  // ── Premium ────────────────────────────────────────────────────────────────

  openPremium() {
    this.premiumOpen = true;
    this.authExitOpen = false;
    this.helpOpen = false;
    this.notify();
  },

  closePremium() {
    this.premiumOpen = false;
    this.notify();
  },

  // ── Help center & Legal ───────────────────────────────────────────────────

  openHelp(query = "") {
    this.helpOpen = true;
    if (query !== undefined) this.helpQuery = String(query || "");
    this.notify();
  },

  openTerms() {
    this.termsOpen = true;
    this.privacyOpen = false;
    this.notify();
  },

  closeTerms() {
    this.termsOpen = false;
    this.notify();
  },

  openPrivacy() {
    this.privacyOpen = true;
    this.termsOpen = false;
    this.notify();
  },

  closePrivacy() {
    this.privacyOpen = false;
    this.notify();
  },

  closeHelp() {
    this.helpOpen = false;
    this.notify();
  },

  setHelpQuery(query = "") {
    this.helpQuery = String(query || "");
    this.notify();
  },

  // ── Onboarding ────────────────────────────────────────────────────────────

  openOnboarding() {
    this.onboardingOpen = true;
    this.onboardingSlideIndex = 0;
    this.notify();
  },

  completeOnboarding(options = {}) {
    this.onboardingOpen = false;
    markOnboardingSeen();
    if (options.view) this.activeView = options.view;
    this.notify();
  },

  nextOnboardingSlide() {
    this.onboardingSlideIndex = Math.min(3, (this.onboardingSlideIndex || 0) + 1);
    this.notify();
  },

  previousOnboardingSlide() {
    this.onboardingSlideIndex = Math.max(0, (this.onboardingSlideIndex || 0) - 1);
    this.notify();
  },

  setOnboardingSlide(index = 0) {
    this.onboardingSlideIndex = Math.max(0, Math.min(3, Number(index) || 0));
    this.notify();
  },

  // ── Event drawer ──────────────────────────────────────────────────────────

  openEventDrawer(mode = "create", event = {}) {
    this.activeEventDrawer = { mode, event };
    this.notify();
  },

  closeEventDrawer() {
    this.activeEventDrawer = null;
    this.notify();
  },

  // ── Trip create modal ─────────────────────────────────────────────────────

  openTripCreate() {
    this.tripCreateOpen = true;
    this.tripManagerOpen = false;
    this.notify();
  },

  closeTripCreate() {
    this.tripCreateOpen = false;
    this.notify();
  },

  openTripManager() {
    this.tripManagerOpen = true;
    this.tripCreateOpen = false;
    this.notify();
  },

  closeTripManager() {
    this.tripManagerOpen = false;
    this.notify();
  },

  // ── Profile section ───────────────────────────────────────────────────────

  setProfileSection(section = "profile") {
    this.activeProfileSection = section;
    this.notify();
  },

  // ── Template picker ───────────────────────────────────────────────────────

  openTemplatePicker(templateId, selectedMomentIds = []) {
    this.activeTemplatePicker = {
      templateId,
      selectedMomentIds: Array.from(new Set(selectedMomentIds.filter(Boolean))),
    };
    this.notify();
  },

  closeTemplatePicker() {
    this.activeTemplatePicker = null;
    this.notify();
  },

  toggleTemplatePickerMoment(momentId) {
    if (!this.activeTemplatePicker || !momentId) return;
    const selected = new Set(this.activeTemplatePicker.selectedMomentIds || []);
    if (selected.has(momentId)) {
      selected.delete(momentId);
    } else {
      selected.add(momentId);
    }
    this.activeTemplatePicker = {
      ...this.activeTemplatePicker,
      selectedMomentIds: Array.from(selected),
    };
    this.notify();
  },

  setTemplatePickerMoments(momentIds = []) {
    if (!this.activeTemplatePicker) return;
    this.activeTemplatePicker = {
      ...this.activeTemplatePicker,
      selectedMomentIds: Array.from(new Set(momentIds.filter(Boolean))),
    };
    this.notify();
  },

  // ── POI detail sheet ───────────────────────────────────────────────────────

  async openPoiDetail(poi) {
    if (!poi) return;
    this.activePoiDetail = { ...poi, loadingDetails: Boolean(poi.xid && !poi._detailLoaded) };
    this.notify();

    if (poi.xid && !poi._detailLoaded) {
      try {
        const { enrichmentService } = await import("../enrichment/enrichmentService.js");
        const details = await enrichmentService.fetchOpenTripMapDetails(poi.xid);
        if (details) {
          poi.description = details.description || poi.description || "";
          poi.website = details.website || poi.sourceUrl || "";
          poi.wikipedia = details.wikipedia || "";
          poi.image = poi.image || details.imageUrl || "";
          poi.address = details.address ? Object.values(details.address).filter(Boolean).join(", ") : "";
          poi._detailLoaded = true;
          if (this.activePoiDetail && (this.activePoiDetail.id === poi.id || this.activePoiDetail.xid === poi.xid)) {
            this.activePoiDetail = { ...poi, loadingDetails: false };
            this.notify();
          }
        } else {
          poi._detailLoaded = true;
          if (this.activePoiDetail) {
            this.activePoiDetail.loadingDetails = false;
            this.notify();
          }
        }
      } catch (e) {
        console.warn("Lazy fetch OTM details error:", e);
        if (this.activePoiDetail) {
          this.activePoiDetail.loadingDetails = false;
          this.notify();
        }
      }
    }
  },

  closePoiDetail() {
    this.activePoiDetail = null;
    this.notify();
  },

  toggleAiConcierge(open) {
    this.aiConciergeOpen = open !== undefined ? Boolean(open) : !this.aiConciergeOpen;
    if (this.aiConciergeOpen) {
      this.quickCaptureOpen = false;
    }
    this.notify();
  },

  toggleQuickCapture(open, tab = "capture") {
    this.quickCaptureTab = tab;
    this.quickCaptureOpen = open !== undefined ? Boolean(open) : !this.quickCaptureOpen;
    if (this.quickCaptureOpen) {
      this.aiConciergeOpen = false;
    }
    this.notify();
  },

  switchQuickCaptureTab(tab = "concierge") {
    this.quickCaptureTab = tab;
    this.notify();
  },

  setAiConciergeProvider(provider = "auto") {
    this.aiConciergeProvider = provider;
    this.notify();
  },

  setAiProviderKey(providerField, value) {
    if (!providerField) return;
    this.aiProviderKeys = {
      ...this.aiProviderKeys,
      [providerField]: String(value || "").trim(),
    };
    try {
      localStorage.setItem("trip_ai_provider_keys_v1", JSON.stringify(this.aiProviderKeys));
    } catch {}
    this.notify();
  },

  toggleAiSettings(open) {
    this.aiSettingsOpen = open !== undefined ? Boolean(open) : !this.aiSettingsOpen;
    this.notify();
  },

  openAiSettingsModal() {
    this.aiSettingsModalOpen = true;
    this.notify();
  },

  closeAiSettingsModal() {
    this.aiSettingsModalOpen = false;
    this.notify();
  },

  clearAllAiKeys() {
    this.aiProviderKeys = {
      openAiKey: "",
      geminiKey: "",
      claudeKey: "",
      grokKey: "",
      openRouterKey: "",
      groqKey: "",
    };
    try {
      localStorage.removeItem("trip_ai_provider_keys_v1");
    } catch {}
    this.notify();
  },

  clearAiConcierge() {
    this.aiConciergeHistory = [];
    this.notify();
  },

  async askAiConcierge(promptText = "") {
    const prompt = String(promptText || "").trim();
    if (!prompt || this.aiConciergeLoading) return false;
    this.aiConciergeHistory = this.aiConciergeHistory || [];
    this.aiConciergeHistory.push({ role: "user", text: prompt });
    this.aiConciergeLoading = true;
    this.notify();

    try {
      const trip = this.activeTrip || { destination: "Destination" };
      const personas = Array.from(this.userPreferences || this.userProfile?.personas || ["Food Explorer"]);

      // Extract POIs and live location context for this specific trip
      const rawPois = [
        ...(trip.tourismPois || []),
        ...(trip.hiddenGems || []),
        ...(trip.osmPlaces || []),
        ...(trip.ideas || []),
      ];

      const poiList = rawPois.map(p => ({
        name: p.name || p.title || p.label || "",
        category: p.category || p.kind || p.type || "sight",
        address: p.address || p.vicinity || p.subtitle || "",
        description: p.description || p.teaser || "",
        tags: p.tags || []
      })).filter(p => p.name).slice(0, 30);

      const eventsList = (trip.events || this.discoveredConcerts || []).map(e => ({
        id: e.id || "",
        title: e.title || e.artist || e.name || "",
        artist: e.artist || "",
        venue: e.venue || "",
        dates: e.dates || e.date || e.datetime || e.startDate || "",
        genre: e.genre || e.category || e.type || "",
        ticketUrl: e.ticketUrl || e.url || e.sourceUrl || "",
        provider: e.provider || e.sourceRole || e.source || "",
        source: e.source || e.provider || "",
      })).filter(e => e.title || e.artist).slice(0, 15);

      const context = {
        destination: trip.destination,
        dates: trip.dates || "",
        startDate: trip.startDate || trip.dates || "",
        endDate: trip.endDate || "",
        weather: trip.weather || null,
        flightRoute: trip.flightRoute || null,
        events: eventsList,
        pois: poiList,
        personas,
        history: (this.aiConciergeHistory || []).slice(-6),
      };

      const result = await aiService.askConcierge({
        prompt,
        trip,
        personas,
        context,
        provider: this.aiConciergeProvider || "auto",
        keys: this.aiProviderKeys || {},
      });

      const cleanText = cleanAiResponseText(result.answer || `Here are top recommendations for ${trip.destination}!`);

      this.aiConciergeHistory.push({
        role: "assistant",
        text: cleanText,
        aiModel: result.aiModel || result.modelProvider || "trip-ai",
      });
    } catch (err) {
      console.warn("AI Concierge request error:", err);
      this.aiConciergeHistory.push({
        role: "assistant",
        text: "Sorry, I had trouble processing your query. Please try asking again!",
        aiModel: "error-fallback",
      });
    } finally {
      this.aiConciergeLoading = false;
      this.notify();
    }
    return true;
  },

  // ── Photo Editor Modal ───────────────────────────────────────────────────

  openPhotoEditor(imageSrc, options = {}) {
    this.photoEditorImageSrc = imageSrc || this.userAvatar || "";
    this.photoEditorOpen = true;
    this.photoEditorIsSignup = Boolean(options.isSignup);
    this.photoEditorMode = options.mode || "avatar";
    this.photoEditorTargetMomentId = options.momentId || "";
    this.photoEditorPendingMomentData = options.momentData || null;
    this.photoEditorAspect = options.mode === "avatar" ? "circle" : (options.aspect || "1:1");
    this.photoEditorSticker = options.mode === "avatar" ? "none" : (options.sticker || "postcard_stamp");
    this.photoEditorFilter = options.filter || "none";
    this.photoEditorCaption = options.caption || (options.momentData?.placeTitle || options.momentData?.geoLabel || "");
    this._photoEditorTab = options.mode === "avatar" ? "upload" : "stickers";
    this.notify();
  },

  openJournalPhotoEditor(imageSrc, options = {}) {
    this.openPhotoEditor(imageSrc, {
      mode: options.mode || "journal",
      momentId: options.momentId || "",
      momentData: options.momentData || null,
      aspect: options.aspect || "1:1",
      sticker: options.sticker || "postcard_stamp",
      filter: options.filter || "none",
      caption: options.caption || "",
    });
  },

  closePhotoEditor() {
    const wasSignup = this.photoEditorIsSignup;
    this.photoEditorOpen = false;
    this.photoEditorImageSrc = null;
    this.photoEditorIsSignup = false;
    this.photoEditorMode = "avatar";
    this.photoEditorTargetMomentId = "";
    this.photoEditorPendingMomentData = null;
    if (wasSignup) {
      this.openOnboarding();
    }
    this.notify();
  },

  setPhotoEditorTab(tab = "upload") {
    this._photoEditorTab = tab;
    this.notify();
  },

  setPhotoEditorSticker(sticker = "none") {
    this.photoEditorSticker = sticker;
    this.notify();
  },

  setPhotoEditorFilter(filter = "none") {
    this.photoEditorFilter = filter;
    this.notify();
  },

  setPhotoEditorAspect(aspect = "1:1") {
    this.photoEditorAspect = aspect;
    this.notify();
  },

  setPhotoEditorCaption(caption = "") {
    this.photoEditorCaption = caption;
    this.notify();
  },
};
