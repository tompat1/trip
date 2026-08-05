import assert from "node:assert/strict";
import test from "node:test";

import { enrichmentService } from "../src/enrichment/enrichmentService.js";
import { tripsData } from "../src/data/tripsData.js";
import { state } from "../src/state.js";

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
