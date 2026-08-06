import assert from "node:assert/strict";
import test from "node:test";

import { enrichmentService } from "../src/enrichment/enrichmentService.js";
import { tripsData } from "../src/data/tripsData.js";
import { inferStartDateFromText } from "../src/utils/tripDates.js";
import { getHomeEmptyStateMode } from "../src/views/homeViewMode.js";
import { state } from "../src/state.js";
import { filterTripScopedItems } from "../src/state/helpers.js";
import { submitConciergePrompt } from "../src/app/conciergeController.js";

test("custom traveler personas are admin-only", () => {
  const originalSession = { ...state.userSession };
  const originalProfile = structuredClone(state.userProfile);
  const originalPreferences = new Set(state.userPreferences);
  const persona = "🧭 Test Cartographer";

  try {
    state.userSession = { status: "ready", role: "traveler", userId: "traveler@test.local", authType: "test" };

    assert.equal(state.addCustomPersona(persona), false);
    assert.equal(state.userProfile.customPersonas.includes(persona), false);

    state.userProfile = {
      ...state.userProfile,
      customPersonas: [...(state.userProfile.customPersonas || []), persona],
      personas: [...(state.userProfile.personas || []), persona],
    };
    state.userPreferences = new Set(state.userProfile.personas);

    assert.equal(state.removeCustomPersona(persona), false);
    assert.equal(state.userProfile.customPersonas.includes(persona), true);

    state.userSession = { status: "ready", role: "admin", userId: "admin@test.local", authType: "test" };

    assert.equal(state.removeCustomPersona(persona), true);
    assert.equal(state.userProfile.customPersonas.includes(persona), false);
    assert.equal(state.addCustomPersona(persona), true);
    assert.equal(state.userProfile.customPersonas.includes(persona), true);
  } finally {
    state.userSession = originalSession;
    state.userProfile = originalProfile;
    state.userPreferences = originalPreferences;
  }
});

test("D1 trip loader accepts the fetchTrips array response shape", async () => {
  const originalTrips = { ...tripsData };
  const originalActiveTripId = state.activeTripId;
  const originalFetchTrips = enrichmentService.fetchTrips;
  const originalFetchTripEvents = enrichmentService.fetchTripEvents;
  const originalSyncGuestDraftTripsToAccount = state.syncGuestDraftTripsToAccount;
  const originalRefreshTourismDiscovery = state.refreshTourismDiscovery;
  const originalRefreshEventDiscovery = state.refreshEventDiscovery;
  const originalRefreshTripIntelligence = state.refreshTripIntelligence;
  const originalNotify = state.notify;

  try {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    state.activeTripId = null;
    state.syncGuestDraftTripsToAccount = async () => {};
    state.refreshTourismDiscovery = () => {};
    state.refreshEventDiscovery = () => {};
    state.refreshTripIntelligence = () => {};
    state.notify = () => {};
    enrichmentService.fetchTripEvents = async () => [];
    enrichmentService.fetchTrips = async () => [
      {
        id: "d1-test-paris",
        user_id: "traveler@test.local",
        destination: "Paris",
        flag: "🇫🇷",
        dates: "Oct 3-8",
        days_count: 6,
        start_date: "2026-10-03",
        latitude: 48.8566,
        longitude: 2.3522,
      },
    ];

    await state.loadD1Trips();

    assert.equal(state.activeTripId, "d1-test-paris");
    assert.equal(tripsData["d1-test-paris"].destination, "Paris");
    assert.deepEqual(tripsData["d1-test-paris"].center, [48.8566, 2.3522]);
  } finally {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    Object.assign(tripsData, originalTrips);
    state.activeTripId = originalActiveTripId;
    state.syncGuestDraftTripsToAccount = originalSyncGuestDraftTripsToAccount;
    state.refreshTourismDiscovery = originalRefreshTourismDiscovery;
    state.refreshEventDiscovery = originalRefreshEventDiscovery;
    state.refreshTripIntelligence = originalRefreshTripIntelligence;
    state.notify = originalNotify;
    enrichmentService.fetchTrips = originalFetchTrips;
    enrichmentService.fetchTripEvents = originalFetchTripEvents;
  }
});

test("authenticated empty home uses the account empty state", () => {
  assert.equal(getHomeEmptyStateMode({ activeTrip: null, isAuthenticated: true }), "account-empty");
  assert.equal(getHomeEmptyStateMode({ activeTrip: null, isAuthenticated: false }), "signed-out");
  assert.equal(getHomeEmptyStateMode({ activeTrip: { id: "paris" }, isAuthenticated: true }), "trip");
});

test("concierge CTAs share one submit path and one open drawer surface", () => {
  const calls = [];
  const fakeState = {
    askAiConcierge(prompt) {
      calls.push(prompt);
    },
    toggleAiConcierge(open) {
      calls.push(`open:${open}`);
    },
  };

  assert.equal(submitConciergePrompt(fakeState, "  coffee near me  ", { openDrawer: true }), true);
  assert.deepEqual(calls, ["open:true", "coffee near me"]);

  const originalQuickCaptureOpen = state.quickCaptureOpen;
  const originalAiConciergeOpen = state.aiConciergeOpen;
  const originalQuickCaptureTab = state.quickCaptureTab;
  const originalNotify = state.notify;

  try {
    state.notify = () => {};
    state.quickCaptureOpen = true;
    state.aiConciergeOpen = false;
    state.toggleAiConcierge(true);
    assert.equal(state.aiConciergeOpen, true);
    assert.equal(state.quickCaptureOpen, false);

    state.toggleQuickCapture(true, "capture");
    assert.equal(state.quickCaptureOpen, true);
    assert.equal(state.aiConciergeOpen, false);
    assert.equal(state.quickCaptureTab, "capture");
  } finally {
    state.quickCaptureOpen = originalQuickCaptureOpen;
    state.aiConciergeOpen = originalAiConciergeOpen;
    state.quickCaptureTab = originalQuickCaptureTab;
    state.notify = originalNotify;
  }
});

test("deleteTrip removes non-demo trips locally and calls worker before synced cleanup", async () => {
  const originalTrips = { ...tripsData };
  const originalSession = { ...state.userSession };
  const originalActiveTripId = state.activeTripId;
  const originalProfileCompanionTripId = state.profileCompanionTripId;
  const originalQuickCaptureTripId = state.quickCaptureTripId;
  const originalNotify = state.notify;
  const originalDeleteTrip = enrichmentService.deleteTrip;
  const originalWarn = console.warn;
  const deleted = [];

  try {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    tripsData.keep = { id: "keep", destination: "Paris, France", startDate: "2999-10-03", daysCount: 5 };
    tripsData.remove = {
      id: "remove",
      destination: "Madrid, Spain",
      userId: "traveler@test.local",
      startDate: "2999-09-01",
      daysCount: 4,
      syncStatus: "synced",
    };
    tripsData.fail = {
      id: "fail",
      destination: "Lisbon, Portugal",
      userId: "traveler@test.local",
      startDate: "2999-09-08",
      daysCount: 4,
      syncStatus: "synced",
    };
    tripsData.other = {
      id: "other",
      destination: "Berlin, Germany",
      userId: "other@test.local",
      startDate: "2999-09-12",
      daysCount: 4,
      syncStatus: "synced",
    };
    tripsData.demo = { id: "demo", destination: "Demo", syncStatus: "demo", isDemoTrip: true };
    state.userSession = { status: "ready", role: "traveler", userId: "traveler@test.local", authType: "traveler-session" };
    state.activeTripId = "remove";
    state.profileCompanionTripId = "remove";
    state.quickCaptureTripId = "remove";
    state.notify = () => {};
    console.warn = () => {};
    enrichmentService.deleteTrip = async (tripId) => {
      deleted.push(tripId);
      if (tripId === "fail") throw new Error("worker-down");
      return { ok: true, tripId };
    };

    const notOwnerResult = await state.deleteTrip("other");

    assert.deepEqual(notOwnerResult, { ok: false, error: "not-owner" });
    assert.ok(tripsData.other);
    assert.deepEqual(deleted, []);

    const failureResult = await state.deleteTrip("fail");

    assert.equal(failureResult.ok, false);
    assert.equal(failureResult.error, "worker-delete-trip-failed");
    assert.ok(tripsData.fail);
    assert.equal(state.activeTripId, "remove");

    const result = await state.deleteTrip("remove");

    assert.equal(result.ok, true);
    assert.equal(result.source, "worker");
    assert.deepEqual(deleted, ["fail", "remove"]);
    assert.equal(tripsData.remove, undefined);
    assert.equal(state.activeTripId, "keep");
    assert.equal(state.profileCompanionTripId, "keep");
    assert.equal(state.quickCaptureTripId, "keep");

    const demoResult = await state.deleteTrip("demo");
    assert.deepEqual(demoResult, { ok: false, error: "demo-trip" });
    assert.ok(tripsData.demo);
  } finally {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    Object.assign(tripsData, originalTrips);
    state.userSession = originalSession;
    state.activeTripId = originalActiveTripId;
    state.profileCompanionTripId = originalProfileCompanionTripId;
    state.quickCaptureTripId = originalQuickCaptureTripId;
    state.notify = originalNotify;
    enrichmentService.deleteTrip = originalDeleteTrip;
    console.warn = originalWarn;
  }
});

test("trip date text parser handles fall and Sep-Oct ranges", () => {
  assert.equal(inferStartDateFromText("Spain, Fall 2026"), "2026-09-01");
  assert.equal(inferStartDateFromText("Sept-Oct 2026"), "2026-09-01");
});

test("trip content scope keeps specific city trips from inheriting other locations", () => {
  const scoped = filterTripScopedItems(
    [
      { id: "prado", title: "Prado Museum Art Walk", location: "Madrid" },
      { id: "louvre", title: "Louvre Museum", location: "Paris" },
      { id: "sagrada", title: "Sagrada Família", location: "Barcelona" },
    ],
    { destination: "Madrid, Spain", countryCode: "ES" }
  );

  assert.deepEqual(scoped.map((item) => item.id), ["prado"]);
});

test("future and remembered trips cannot be forced into live mode", () => {
  const originalTrips = { ...tripsData };
  const originalActiveTripId = state.activeTripId;
  const originalTripMode = state.tripMode;

  try {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    tripsData.future = { id: "future", destination: "Madrid, Spain", startDate: "2999-09-01", daysCount: 7 };
    tripsData.done = { id: "done", destination: "Paris, France", startDate: "2000-01-01", daysCount: 3 };
    const today = new Date().toISOString().split("T")[0];
    tripsData.active = { id: "active", destination: "Current Trip", startDate: today, daysCount: 2 };

    state.activeTripId = "future";
    assert.equal(state.toggleTripMode(true), false);
    assert.equal(state.tripMode, false);

    state.activeTripId = "done";
    assert.equal(state.toggleTripMode(true), false);
    assert.equal(state.tripMode, false);

    state.activeTripId = "active";
    assert.equal(state.toggleTripMode(true), true);
    assert.equal(state.tripMode, true);
  } finally {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    Object.assign(tripsData, originalTrips);
    state.activeTripId = originalActiveTripId;
    state.tripMode = originalTripMode;
  }
});

test("admin trip load restores demo trips and normalizes legacy Spain rows", async () => {
  const originalTrips = { ...tripsData };
  const originalSession = { ...state.userSession };
  const originalActiveTripId = state.activeTripId;
  const originalFetchTrips = enrichmentService.fetchTrips;
  const originalFetchTripEvents = enrichmentService.fetchTripEvents;
  const originalSyncGuestDraftTripsToAccount = state.syncGuestDraftTripsToAccount;
  const originalRefreshTourismDiscovery = state.refreshTourismDiscovery;
  const originalRefreshEventDiscovery = state.refreshEventDiscovery;
  const originalRefreshTripIntelligence = state.refreshTripIntelligence;
  const originalNotify = state.notify;

  try {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    tripsData.spain = {
      id: "spain",
      destination: "Spain, Fall 2026",
      dates: "Sept-Oct 2026",
      center: [40.4168, -3.7038],
      tourismPois: [{ id: "stale-paris", title: "Festival Paris Cinéma" }],
      hiddenGems: [],
      osmPlaces: [],
      ideas: [
        { id: "prado", title: "Prado Museum Art Walk", location: "Madrid" },
        { id: "sagrada", title: "Sagrada Família", location: "Barcelona" },
      ],
      events: [{ id: "paris-event", title: "Festival Paris Cinéma" }],
      calendarEvents: [{ id: "paris-calendar", title: "Louvre Museum", location: "Paris" }],
      tripMode: true,
    };
    state.activeTripId = "spain";
    state.userSession = { status: "ready", role: "admin", userId: "admin@test.local", authType: "admin-session" };
    state.syncGuestDraftTripsToAccount = async () => {};
    state.refreshTourismDiscovery = () => {};
    state.refreshEventDiscovery = () => {};
    state.refreshTripIntelligence = () => {};
    state.notify = () => {};
    enrichmentService.fetchTripEvents = async () => [
      { id: "remote-paris-calendar", title: "Louvre Museum", location: "Paris" },
    ];
    enrichmentService.fetchTrips = async () => [
      {
        id: "spain",
        user_id: "anonymous",
        destination: "Spain, Fall 2026",
        flag: "🇪🇸",
        dates: "Sept-Oct 2026",
        days_count: 14,
        latitude: 40.4168,
        longitude: -3.7038,
      },
    ];

    await state.loadD1Trips();

    assert.ok(tripsData.paris);
    assert.ok(tripsData.crete);
    assert.equal(tripsData.spain.destination, "Madrid, Spain");
    assert.equal(tripsData.spain.language, "es");
    assert.equal(tripsData.spain.startDate, "2026-09-01");
    assert.equal(tripsData.spain.tripMode, false);
    assert.deepEqual(tripsData.spain.tourismPois, []);
    assert.deepEqual(tripsData.spain.events, []);
    assert.deepEqual(tripsData.spain.calendarEvents, []);
    assert.deepEqual(tripsData.spain.ideas.map((idea) => idea.id), ["prado"]);
  } finally {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    Object.assign(tripsData, originalTrips);
    state.userSession = originalSession;
    state.activeTripId = originalActiveTripId;
    state.syncGuestDraftTripsToAccount = originalSyncGuestDraftTripsToAccount;
    state.refreshTourismDiscovery = originalRefreshTourismDiscovery;
    state.refreshEventDiscovery = originalRefreshEventDiscovery;
    state.refreshTripIntelligence = originalRefreshTripIntelligence;
    state.notify = originalNotify;
    enrichmentService.fetchTrips = originalFetchTrips;
    enrichmentService.fetchTripEvents = originalFetchTripEvents;
  }
});
