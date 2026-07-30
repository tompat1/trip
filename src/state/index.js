/**
 * src/state/index.js
 *
 * Assembles AppState from domain mixins and exports the singleton.
 * All consumers import from "../state.js" (the shim) — this file is the source.
 */
import { AppState } from "./core.js";
import { discoveryStateMixin } from "./discoveryState.js";
import { momentStateMixin } from "./momentState.js";
import { profileStateMixin } from "./profileState.js";
import { tripStateMixin } from "./tripState.js";
import { uiStateMixin } from "./uiState.js";

// Apply all domain mixins to AppState.prototype before instantiation.
// Methods from each mixin share `this` with the full AppState instance.
Object.assign(
  AppState.prototype,
  uiStateMixin,
  tripStateMixin,
  discoveryStateMixin,
  momentStateMixin,
  profileStateMixin
);

export const state = new AppState();

// Named exports consumed by views
export { isFutureTrip } from "./helpers.js";
export { TRAVELER_PERSONA_ARCHETYPES } from "./constants.js";
