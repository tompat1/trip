/**
 * uiState mixin — modals, overlays, panels, onboarding, auth dialogs, theme.
 */
import { markOnboardingSeen, writeStoredTheme } from "./helpers.js";

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

  // ── Help center ───────────────────────────────────────────────────────────

  openHelp(query = "") {
    this.helpOpen = true;
    if (query !== undefined) this.helpQuery = String(query || "");
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
    this.notify();
  },

  closeTripCreate() {
    this.tripCreateOpen = false;
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
};
