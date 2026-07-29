import assert from "node:assert/strict";
import test from "node:test";

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
