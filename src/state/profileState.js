/**
 * profileState mixin — user profile, personas, session, companions, and invites.
 */
import { tripsData } from "../data/tripsData.js";
import { enrichmentService } from "../enrichment/enrichmentService.js";
import { DEFAULT_TRAVELER_PERSONAS } from "./constants.js";
import {
  buildTripInviteText,
  createTripInviteUrl,
  getTripInviteCoverImage,
  getTripInviteTitle,
  isFutureTrip,
  normalizeCompanionRoleInput,
  normalizeEmailInput,
  normalizeInviteMethodInput,
  normalizePersonaLabels,
  readStoredTripCompanions,
  readStoredUserProfile,
  resolveFutureTripId,
  writeStoredTripCompanions,
  writeStoredUserProfile,
} from "./helpers.js";

export const profileStateMixin = {
  // ── User session ───────────────────────────────────────────────────────────

  async bootstrapAccountData() {
    await this.refreshUserSession();
    if (!this.isAuthenticated) return this.userSession;

    if (this.isAdmin) this.restoreDemoTrips?.();
    await this.loadD1Trips();
    if (this.activeView === "landing") {
      this.activeView = "home";
      this.notify();
    }
    return this.userSession;
  },

  async refreshUserSession() {
    try {
      const session = await enrichmentService.getSession();
      const principal = session.principal || {};
      this.userSession = {
        status: "ready",
        role: principal.role || "anonymous",
        userId: principal.userId || "",
        authType: principal.authType || "none",
      };
    } catch (error) {
      this.userSession = {
        status: "error",
        role: "anonymous",
        userId: "",
        authType: "none",
        error: error?.message || "session-check-failed",
      };
    }
    this.syncAdminDemoMoments();
    this.notify();
    return this.userSession;
  },

  clearUserSession(options = {}) {
    this.userSession = {
      status: "ready",
      role: "anonymous",
      userId: "",
      authType: "none",
    };
    this.syncAdminDemoMoments();
    if (options.notify !== false) this.notify();
    return this.userSession;
  },

  // ── User profile ───────────────────────────────────────────────────────────

  updateUserProfile(updates = {}, options = {}) {
    this.userProfile = {
      ...this.userProfile,
      ...updates,
      notifications: { ...this.userProfile.notifications, ...(updates.notifications || {}) },
      privacy: { ...this.userProfile.privacy, ...(updates.privacy || {}) },
    };
    this.userAvatar = this.userProfile.avatarUrl;
    this.userPreferences = new Set(this.userProfile.personas || []);
    writeStoredUserProfile(this.userProfile);
    if (options.notify !== false) this.notify();
  },

  updateUserProfileField(field, value, options = {}) {
    if (!field) return;
    this.updateUserProfile({ [field]: value }, options);
  },

  updateNestedUserProfileField(group, field, value, options = {}) {
    if (!group || !field || !this.userProfile[group]) return;
    this.updateUserProfile(
      { [group]: { ...this.userProfile[group], [field]: value } },
      options
    );
  },

  updateUserAvatar(url) {
    if (!url) return;
    this.userProfile = { ...this.userProfile, avatarUrl: url };
    this.userAvatar = this.userProfile.avatarUrl;
    writeStoredUserProfile(this.userProfile);
    this.notify();
  },

  resetUserProfile() {
    this.userProfile = readStoredUserProfile();
    this.userAvatar = this.userProfile.avatarUrl;
    this.userPreferences = new Set(this.userProfile.personas || []);
    this.notify();
  },

  // ── Personas ───────────────────────────────────────────────────────────────

  toggleUserPreference(pref) {
    if (!pref) return;
    if (this.userPreferences.has(pref)) {
      this.userPreferences.delete(pref);
    } else {
      this.userPreferences.add(pref);
    }
    this.userProfile = { ...this.userProfile, personas: Array.from(this.userPreferences) };
    writeStoredUserProfile(this.userProfile);
    this.notify();
  },

  addCustomPersona(label) {
    const cleanLabel = String(label || "").trim().replace(/\s+/g, " ").slice(0, 42);
    if (!cleanLabel || !this.isAdmin) return false;
    const existing = new Set([
      ...(this.userProfile.customPersonas || []),
      ...Array.from(this.userPreferences),
      ...DEFAULT_TRAVELER_PERSONAS,
    ]);
    if (existing.has(cleanLabel)) return false;
    this.userProfile = {
      ...this.userProfile,
      customPersonas: [...(this.userProfile.customPersonas || []), cleanLabel],
      personas: [...(this.userProfile.personas || []), cleanLabel],
    };
    this.userPreferences = new Set(this.userProfile.personas || []);
    writeStoredUserProfile(this.userProfile);
    this.notify();
    return true;
  },

  removeCustomPersona(label) {
    const cleanLabel = String(label || "").trim();
    if (!cleanLabel || !this.isAdmin) return false;
    this.userProfile = {
      ...this.userProfile,
      customPersonas: (this.userProfile.customPersonas || []).filter((p) => p !== cleanLabel),
      personas: (this.userProfile.personas || []).filter((p) => p !== cleanLabel),
    };
    this.userPreferences = new Set(this.userProfile.personas || []);
    writeStoredUserProfile(this.userProfile);
    this.notify();
    return true;
  },

  // ── Trip companions ────────────────────────────────────────────────────────

  async loadTripCompanions(tripId = this.activeTripId) {
    const trip = tripsData[tripId];
    if (!trip) return [];
    const localCompanions = readStoredTripCompanions(tripId);
    if (localCompanions.length) trip.companions = localCompanions;

    try {
      const remoteCompanions = await enrichmentService.fetchTripCompanions(tripId);
      if (remoteCompanions.length) {
        trip.companions = remoteCompanions;
        writeStoredTripCompanions(tripId, remoteCompanions);
      }
    } catch {}

    this.notify();
    return trip.companions || [];
  },

  async inviteTripCompanion(tripId = this.activeTripId, companionInput = {}) {
    const trip = tripsData[tripId];
    if (!trip) return { ok: false, error: "missing-trip" };
    if (!isFutureTrip(trip)) return { ok: false, error: "past-trip" };
    const email = normalizeEmailInput(companionInput.email);
    if (!email) return { ok: false, error: "invalid-email" };

    const name = String(companionInput.name || "").trim();
    const role = normalizeCompanionRoleInput(companionInput.role || "viewer");
    const inviteMethod = normalizeInviteMethodInput(companionInput.inviteMethod || "email");
    const personalMessage = String(companionInput.personalMessage || "").trim() || "Plan it. Live it. Remember it.";
    const inviteUrl = companionInput.inviteUrl || createTripInviteUrl(tripId);
    const current = trip.companions || readStoredTripCompanions(tripId);
    const tripTitle = getTripInviteTitle(trip);
    const destination = trip.destination || "Trip";
    const dates = trip.dates || "Upcoming";
    const travelersCount = Math.max(
      2,
      current.filter((item) => normalizeEmailInput(item.email) !== email).length + 2
    );
    const coverImage = getTripInviteCoverImage(trip);
    const inviterName = this.userProfile?.name || "Thomas";
    const inviteText = buildTripInviteText({
      inviterName,
      tripTitle,
      destination,
      dates,
      travelersCount,
      personalMessage,
      inviteUrl,
    });
    const now = new Date().toISOString();
    const companion = {
      id: companionInput.id || `companion_${tripId}_${email.replace(/[^a-z0-9]+/gi, "_")}`,
      tripId,
      name,
      email,
      role,
      status: "invited",
      inviteMethod,
      personalMessage,
      tripTitle,
      destination,
      dates,
      travelersCount,
      coverImage,
      inviteUrl,
      inviteText,
      createdAt: now,
      updatedAt: now,
    };

    const withoutDuplicate = current.filter((item) => item.email !== email);
    trip.companions = [companion, ...withoutDuplicate];
    writeStoredTripCompanions(tripId, trip.companions);
    this.notify();

    try {
      const result = await enrichmentService.inviteTripCompanion(tripId, companion);
      if (result.companion) {
        trip.companions = [result.companion, ...withoutDuplicate];
        writeStoredTripCompanions(tripId, trip.companions);
        this.notify();
      }
      return { ok: true, companion: result.companion || companion, source: "worker" };
    } catch (error) {
      return { ok: true, companion, source: "local", error: error?.message || "worker-companion-fallback" };
    }
  },

  async removeTripCompanion(tripId = this.activeTripId, companionId) {
    const trip = tripsData[tripId];
    if (!trip || !companionId) return false;
    trip.companions = (trip.companions || []).filter((c) => c.id !== companionId);
    writeStoredTripCompanions(tripId, trip.companions);
    this.notify();

    try {
      await enrichmentService.deleteTripCompanion(tripId, companionId);
    } catch {}
    return true;
  },

  toggleCompanionQr(companionId = "") {
    this.activeCompanionQrId = this.activeCompanionQrId === companionId ? "" : companionId;
    this.notify();
  },

  // ── Trip invite ────────────────────────────────────────────────────────────

  acceptTripInvite(options = {}) {
    const mode = options.mode || "guest";
    const tripId = options.tripId || this.activeInvite?.tripId || this.activeTripId;
    if (!tripsData[tripId]) return false;
    this.activeTripId = tripId;
    this.activeView = "plan";
    this.activeInvite = {
      ...(this.activeInvite || {}),
      tripId,
      status: mode === "preview" ? "preview" : "accepted",
      mode,
      acceptedAt: mode === "preview" ? "" : new Date().toISOString(),
    };
    if (mode === "guest") {
      this.userSession = { role: "guest", email: "", status: "guest" };
    }
    if (!this.quickCaptureOpen) this.quickCaptureTripId = tripId;
    this.loadTripCompanions(tripId);
    this.refreshTourismDiscovery(tripId);
    this.refreshEventDiscovery(tripId);
    this.refreshTripIntelligence(tripId);
    if (options.notify !== false) this.notify();
    return true;
  },

  dismissTripInvite() {
    this.activeInvite = null;
    this.notify();
  },

  setInviteMode(mode = "preview") {
    if (!this.activeInvite) return;
    this.activeInvite = { ...this.activeInvite, mode };
    this.notify();
  },
};
