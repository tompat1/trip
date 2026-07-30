/**
 * momentState mixin — moments, media captures, quick-capture widget, admin demos.
 */
import { enrichmentService } from "../enrichment/enrichmentService.js";
import { readStoredMoments, saveStoredMoment, saveStoredMoments } from "../services/momentStore.js";
import { ADMIN_DEMO_MOMENTS } from "./constants.js";
import { normalizeMomentRecord } from "./helpers.js";

export const momentStateMixin = {
  // ── Persist / load ─────────────────────────────────────────────────────────

  async loadPersistedMoments() {
    try {
      const localMoments = await readStoredMoments();
      if (localMoments.length) this.mergeMoments(localMoments);

      const remoteMoments = await enrichmentService.fetchMoments().catch(() => []);
      if (remoteMoments.length) {
        this.mergeMoments(remoteMoments);
        const momentsWithMedia = this.moments.filter((m) => m.media_url || m.mediaUrl);
        if (momentsWithMedia.length) saveStoredMoments(momentsWithMedia).catch(() => {});
      }
    } catch (error) {
      console.warn("Moment restore fallback:", error);
    }
  },

  mergeMoments(incomingMoments = []) {
    const byId = new Map(this.moments.map((m) => [m.id, m]));
    incomingMoments
      .map(normalizeMomentRecord)
      .filter((m) => m.id)
      .forEach((incoming) => {
        const existing = byId.get(incoming.id);
        if (!existing) {
          byId.set(incoming.id, incoming);
          return;
        }
        byId.set(incoming.id, {
          ...incoming,
          ...existing,
          media_url: existing.media_url || incoming.media_url || incoming.mediaUrl || "",
          mediaUrl: existing.mediaUrl || incoming.mediaUrl || incoming.media_url || "",
          tags: existing.tags || incoming.tags,
          placeTitle: existing.placeTitle || incoming.placeTitle || incoming.place_title || "",
          placeCategory: existing.placeCategory || incoming.placeCategory || incoming.place_category || "",
          geoLabel: existing.geoLabel || incoming.geoLabel || incoming.geo_label || "",
        });
      });

    this.moments = Array.from(byId.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || a.groupCapturedAt || a.date || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || b.groupCapturedAt || b.date || 0).getTime();
      return bTime - aTime;
    });
    this.notify();
  },

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async addMoment(momentInput) {
    const newMoment = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tripId: momentInput.tripId || this.quickCaptureTripId || this.activeTripId,
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      ...momentInput,
    };

    this.moments.unshift(newMoment);
    this.notify();
    saveStoredMoment(newMoment).catch((error) => console.warn("Moment local save fallback:", error));

    try {
      await enrichmentService.createMoment(newMoment);
    } catch (e) {
      console.warn("D1 moment sync fallback:", e);
    }

    return newMoment;
  },

  updateMoment(momentId, updates = {}) {
    const moment = this.moments.find((m) => m.id === momentId);
    if (!moment) return;
    Object.assign(moment, updates, { updatedAt: new Date().toISOString() });
    this.notify();
    saveStoredMoment(moment).catch((error) => console.warn("Moment local update fallback:", error));
  },

  deleteMoment(momentId) {
    if (!momentId) return;
    this.moments = (this.moments || []).filter((m) => m.id !== momentId);
    this.notify();
    saveStoredMoments(this.moments.filter((m) => m.media_url || m.mediaUrl)).catch(() => {});
  },

  // ── Admin demo moments ─────────────────────────────────────────────────────

  syncAdminDemoMoments() {
    const withoutDemo = (this.moments || []).filter((m) => !m.adminDemo);
    if (!this.isAdmin) {
      this.moments = withoutDemo;
      return;
    }

    const demoById = new Map(ADMIN_DEMO_MOMENTS.map((m) => [m.id, m]));
    this.moments = [...withoutDemo, ...demoById.values()].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
      return bTime - aTime;
    });
  },

  // ── Quick capture widget ───────────────────────────────────────────────────

  toggleQuickCapture(open) {
    this.quickCaptureOpen = open !== undefined ? open : !this.quickCaptureOpen;
    if (this.quickCaptureOpen) this.quickCaptureTripId = this.activeTripId;
    if (!this.quickCaptureOpen) {
      this.quickCaptureUpload = { status: "idle", progress: 0, fileName: "", type: "" };
    }
    this.notify();
  },

  setQuickCaptureTrip(tripId) {
    if (!tripId) return;
    this.quickCaptureTripId = tripId;
    this.notify();
  },

  setQuickCaptureUpload(upload = {}) {
    this.quickCaptureUpload = {
      status: upload.status || "idle",
      progress: Number(upload.progress || 0),
      fileName: upload.fileName || "",
      type: upload.type || "",
    };
    this.notify();
  },
};
