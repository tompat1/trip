import assert from "node:assert/strict";
import test from "node:test";

import { ADMIN_SESSION_STORAGE_KEY, createEnrichmentService, enrichmentService } from "../src/enrichment/enrichmentService.js";
import { tripsData } from "../src/data/tripsData.js";
import { inferStartDateFromText } from "../src/utils/tripDates.js";
import { getHomeEmptyStateMode } from "../src/views/homeViewMode.js";
import { state } from "../src/state.js";
import { filterTripScopedItems } from "../src/state/helpers.js";
import { submitConciergePrompt } from "../src/app/conciergeController.js";

function getTestLocalStorage() {
  if (globalThis.localStorage) {
    globalThis.window = {
      ...(globalThis.window || {}),
      location: globalThis.window?.location || { origin: "https://trip.test", hostname: "trip.test" },
      localStorage: globalThis.localStorage,
    };
    return globalThis.localStorage;
  }
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
  globalThis.window = {
    ...(globalThis.window || {}),
    location: globalThis.window?.location || { origin: "https://trip.test", hostname: "trip.test" },
    localStorage: globalThis.localStorage,
  };
  return globalThis.localStorage;
}

test("account login stores a session token and logout clears it", async () => {
  const requests = [];
  const storage = getTestLocalStorage();
  const originalToken = storage.getItem(ADMIN_SESSION_STORAGE_KEY);
  storage.removeItem(ADMIN_SESSION_STORAGE_KEY);

  const service = createEnrichmentService({
    apiBase: "https://trip.test",
    fetchImpl: async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith("/api/auth/session") && init.method === "POST") {
        return Response.json({
          ok: true,
          session: { token: "traveler-token", principal: { role: "traveler", userId: "alex@example.com" } },
        });
      }
      if (String(url).endsWith("/api/auth/session") && init.method === "DELETE") {
        assert.equal(init.headers.Authorization, "Bearer traveler-token");
        return Response.json({ ok: true });
      }
      throw new Error(`unexpected request ${url}`);
    },
  });

  try {
    await service.loginAccount({ email: "alex@example.com", password: "secret" });
    assert.equal(storage.getItem(ADMIN_SESSION_STORAGE_KEY), "traveler-token");

    await service.logoutAdmin();
    assert.equal(storage.getItem(ADMIN_SESSION_STORAGE_KEY), null);
    assert.deepEqual(requests.map((request) => [new URL(request.url).pathname, request.init.method]), [
      ["/api/auth/session", "POST"],
      ["/api/auth/session", "DELETE"],
    ]);
  } finally {
    storage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    if (originalToken) storage.setItem(ADMIN_SESSION_STORAGE_KEY, originalToken);
  }
});

test("session refresh and local clear drive authenticated state for login/logout UI", async () => {
  const originalGetSession = enrichmentService.getSession;
  const originalSession = { ...state.userSession };
  const originalNotify = state.notify;

  try {
    state.notify = () => {};
    enrichmentService.getSession = async () => ({
      principal: { role: "traveler", userId: "alex@example.com", authType: "traveler-session" },
    });

    await state.refreshUserSession();

    assert.equal(state.isAuthenticated, true);
    assert.equal(state.userSession.role, "traveler");
    assert.equal(state.userSession.userId, "alex@example.com");

    state.clearUserSession();

    assert.equal(state.isAuthenticated, false);
    assert.deepEqual(state.userSession, {
      status: "ready",
      role: "anonymous",
      userId: "",
      authType: "none",
    });
  } finally {
    enrichmentService.getSession = originalGetSession;
    state.userSession = originalSession;
    state.notify = originalNotify;
  }
});

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

test("creating a trip makes it active, centers maps on that destination, and starts with empty scoped content", async () => {
  const originalTrips = { ...tripsData };
  const originalSession = { ...state.userSession };
  const originalActiveTripId = state.activeTripId;
  const originalActiveView = state.activeView;
  const originalPlanSubTab = state.planSubTab;
  const originalNotify = state.notify;
  const originalRefreshTourismDiscovery = state.refreshTourismDiscovery;
  const originalRefreshEventDiscovery = state.refreshEventDiscovery;
  const originalRefreshTripIntelligence = state.refreshTripIntelligence;
  const originalCreateTrip = enrichmentService.createTrip;
  const originalIsAuthenticated = Object.getOwnPropertyDescriptor(state, "isAuthenticated");
  const createdRemoteTrips = [];

  try {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    tripsData.paris = {
      id: "paris",
      destination: "Paris, France",
      center: [48.8566, 2.3522],
      tourismPois: [{ id: "louvre", title: "Louvre Museum", subtitle: "Paris only", image: "" }],
      events: [{ id: "paris-jazz", title: "Paris Jazz Night", dates: "Oct 3" }],
      calendarEvents: [{ id: "paris-calendar", title: "Louvre Museum", location: "Paris" }],
    };
    state.activeTripId = "paris";
    state.userSession = { status: "ready", role: "traveler", userId: "alex@example.com", authType: "traveler-session" };
    Object.defineProperty(state, "isAuthenticated", { configurable: true, get: () => true });
    state.notify = () => {};
    state.refreshTourismDiscovery = async () => {};
    state.refreshEventDiscovery = async () => {};
    state.refreshTripIntelligence = async () => {};
    enrichmentService.createTrip = async (payload) => {
      createdRemoteTrips.push(payload);
      return { ok: true, trip: payload };
    };

    await state.createCustomTrip({
      id: "stockholm-test",
      destination: "Stockholm, Sweden",
      dates: "May 1-5, 2027",
      startDate: "2027-05-01",
      daysCount: 5,
    });

    const trip = tripsData["stockholm-test"];
    assert.equal(state.activeTripId, "stockholm-test");
    assert.equal(state.activeView, "plan");
    assert.equal(state.planSubTab, "overview");
    assert.equal(trip.destination, "Stockholm, Sweden");
    assert.deepEqual(trip.center, [59.3293, 18.0686]);
    assert.deepEqual(trip.tourismPois, []);
    assert.deepEqual(trip.hiddenGems, []);
    assert.deepEqual(trip.osmPlaces, []);
    assert.deepEqual(trip.events, []);
    assert.deepEqual(trip.calendarEvents, []);
    assert.equal(trip.syncStatus, "synced");
    const createdStockholmTrip = createdRemoteTrips.find((item) => item.id === "stockholm-test");
    assert.ok(createdStockholmTrip);
    assert.equal(createdStockholmTrip.destination, "Stockholm, Sweden");
    assert.equal(createdStockholmTrip.latitude, 59.3293);
    assert.equal(createdStockholmTrip.longitude, 18.0686);
  } finally {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    Object.assign(tripsData, originalTrips);
    state.userSession = originalSession;
    state.activeTripId = originalActiveTripId;
    state.activeView = originalActiveView;
    state.planSubTab = originalPlanSubTab;
    state.notify = originalNotify;
    state.refreshTourismDiscovery = originalRefreshTourismDiscovery;
    state.refreshEventDiscovery = originalRefreshEventDiscovery;
    state.refreshTripIntelligence = originalRefreshTripIntelligence;
    enrichmentService.createTrip = originalCreateTrip;
    if (originalIsAuthenticated) {
      Object.defineProperty(state, "isAuthenticated", originalIsAuthenticated);
    } else {
      delete state.isAuthenticated;
    }
  }
});

test("new trip discovery populates only the active trip and rejects out-of-scope itinerary events", async () => {
  const originalTrips = { ...tripsData };
  const originalActiveTripId = state.activeTripId;
  const originalSession = { ...state.userSession };
  const originalNotify = state.notify;
  const originalAddTripEvent = enrichmentService.addTripEvent;

  try {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    tripsData.stockholm = {
      id: "stockholm",
      destination: "Stockholm, Sweden",
      center: [59.3293, 18.0686],
      zoom: 13,
      dates: "May 1-5, 2027",
      startDate: "2027-05-01",
      daysCount: 5,
      tourismPois: [],
      hiddenGems: [],
      osmPlaces: [],
      events: [],
      calendarEvents: [],
      ideas: [],
    };
    tripsData.paris = {
      id: "paris",
      destination: "Paris, France",
      center: [48.8566, 2.3522],
      tourismPois: [{ id: "louvre", title: "Louvre Museum", subtitle: "Paris", image: "" }],
      events: [{ id: "paris-opera", title: "Paris Opera Gala", dates: "May 2" }],
      calendarEvents: [{ id: "paris-cal", title: "Paris-only Dinner", location: "Paris" }],
    };
    state.activeTripId = "stockholm";
    state.userSession = { status: "ready", role: "traveler", userId: "alex@example.com", authType: "traveler-session" };
    state.notify = () => {};
    enrichmentService.addTripEvent = async () => ({ ok: true });

    tripsData.stockholm.tourismPois = filterTripScopedItems([
      { id: "vasa", title: "Vasa Museum", subtitle: "Stockholm waterfront", image: "", location: "Stockholm" },
      { id: "louvre-leak", title: "Louvre Museum", subtitle: "Paris", image: "", location: "Paris" },
    ], tripsData.stockholm);
    tripsData.stockholm.events = filterTripScopedItems([
      { id: "stockholm-live", title: "Stockholm Indie Night", venue: "Södermalm", city: "Stockholm", dates: "May 2" },
      { id: "paris-live", title: "Paris Jazz Night", venue: "Le Marais", city: "Paris", dates: "May 2" },
    ], tripsData.stockholm);

    await state.addCalendarEvent("stockholm", {
      id: "stockholm-cal",
      title: "Gamla Stan Walk",
      location: "Gamla Stan, Stockholm",
      lat: 59.325,
      lng: 18.071,
    });
    await state.addCalendarEvent("stockholm", {
      id: "bad-paris-cal",
      title: "Louvre Museum",
      location: "Paris",
      lat: 48.8606,
      lng: 2.3376,
    });

    assert.deepEqual(tripsData.stockholm.tourismPois.map((place) => place.id), ["vasa"]);
    assert.deepEqual(tripsData.stockholm.events.map((event) => event.id), ["stockholm-live"]);
    assert.deepEqual(tripsData.stockholm.calendarEvents.map((event) => event.id), ["stockholm-cal"]);
    assert.deepEqual(tripsData.paris.tourismPois.map((place) => place.id), ["louvre"]);
    assert.deepEqual(tripsData.paris.events.map((event) => event.id), ["paris-opera"]);
  } finally {
    Object.keys(tripsData).forEach((id) => delete tripsData[id]);
    Object.assign(tripsData, originalTrips);
    state.activeTripId = originalActiveTripId;
    state.userSession = originalSession;
    state.notify = originalNotify;
    enrichmentService.addTripEvent = originalAddTripEvent;
  }
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
