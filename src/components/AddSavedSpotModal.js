import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

const CATEGORY_OPTIONS = [
  { value: "Sight", label: "Sight", icon: "mapPin" },
  { value: "Food", label: "Food", icon: "utensils" },
  { value: "Coffee", label: "Coffee", icon: "coffee" },
  { value: "Museum", label: "Museum", icon: "Buildings" },
  { value: "Nature", label: "Nature", icon: "compass" },
  { value: "Shopping", label: "Shopping", icon: "shoppingBag" },
  { value: "Nightlife", label: "Nightlife", icon: "wine" },
  { value: "Other", label: "Other", icon: "pin" },
];

export function renderAddSavedSpotModal() {
  if (!state.savedSpotModalOpen) return "";

  const trip = state.activeTrip;
  const mode = state.savedSpotModalMode === "map" ? "map" : "manual";
  const draft = state.savedSpotDraft || {};
  const lat = Number(draft.lat);
  const lng = Number(draft.lng);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);

  return `
    <div class="trip-create-overlay saved-spot-overlay" data-saved-spot-overlay="">
      <section class="trip-create-sheet saved-spot-sheet" role="dialog" aria-modal="true" aria-labelledby="saved-spot-title">
        <div class="trip-create-header">
          <div>
            <span class="trip-create-kicker voice-mono">Shortlist</span>
            <h2 class="trip-create-title" id="saved-spot-title">Add a place to save</h2>
            <p class="trip-create-subtitle">Build your pre-trip shortlist manually or drop a pin on the map for ${escapeHtml(trip?.destination || "your trip")}.</p>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-saved-spot-modal" aria-label="Close" type="button">
            ${renderIcon("x")}
          </button>
        </div>

        <div class="saved-spot-mode-tabs" role="tablist" aria-label="Add saved spot mode">
          <button
            type="button"
            class="saved-spot-mode-tab ${mode === "manual" ? "is-active" : ""}"
            data-action="set-saved-spot-mode"
            data-mode="manual"
            role="tab"
            aria-selected="${mode === "manual"}"
          >
            ${renderIcon("pencil")} Manual entry
          </button>
          <button
            type="button"
            class="saved-spot-mode-tab ${mode === "map" ? "is-active" : ""}"
            data-action="set-saved-spot-mode"
            data-mode="map"
            role="tab"
            aria-selected="${mode === "map"}"
          >
            ${renderIcon("mapPin")} Pick on map
          </button>
        </div>

        <form id="saved-spot-form" class="trip-create-form saved-spot-form">
          ${mode === "map" ? `
            <div class="saved-spot-map-panel">
              <div id="saved-spot-map-container" class="saved-spot-map" aria-label="Map picker for saved spot"></div>
              <p class="saved-spot-map-hint voice-mono">
                ${hasPin
                  ? `Pinned at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
                  : "Tap the map to place your pin"}
              </p>
            </div>
          ` : ""}

          <label class="trip-create-field trip-create-field--wide">
            <span class="drawer-label">Place name</span>
            <div class="trip-create-input-wrap">
              ${renderIcon("mapPin")}
              <input
                class="drawer-input trip-create-input"
                name="title"
                type="text"
                placeholder="e.g. Ten Belles Coffee"
                autocomplete="off"
                required
                value="${escapeHtml(draft.title || "")}"
              />
            </div>
          </label>

          <label class="trip-create-field">
            <span class="drawer-label">Category</span>
            <select class="drawer-input trip-create-input" name="category">
              ${CATEGORY_OPTIONS.map((option) => `
                <option value="${escapeHtml(option.value)}" ${(draft.category || "Sight") === option.value ? "selected" : ""}>
                  ${escapeHtml(option.label)}
                </option>
              `).join("")}
            </select>
          </label>

          <label class="trip-create-field trip-create-field--wide">
            <span class="drawer-label">Address or area</span>
            <div class="trip-create-input-wrap">
              ${renderIcon("navigation")}
              <input
                class="drawer-input trip-create-input"
                name="address"
                type="text"
                placeholder="Neighborhood, street, or landmark hint"
                autocomplete="off"
                value="${escapeHtml(draft.address || draft.subtitle || "")}"
              />
            </div>
          </label>

          <label class="trip-create-field trip-create-field--wide">
            <span class="drawer-label">Notes (optional)</span>
            <textarea
              class="drawer-input trip-create-input saved-spot-notes"
              name="notes"
              rows="2"
              placeholder="Why you want to go, opening hours, reservation tips..."
            >${escapeHtml(draft.notes || "")}</textarea>
          </label>

          <input type="hidden" name="lat" value="${hasPin ? lat : ""}" />
          <input type="hidden" name="lng" value="${hasPin ? lng : ""}" />
          <input type="hidden" name="source" value="${mode}" />

          <div class="trip-create-actions">
            <button class="btn btn--outline" data-action="close-saved-spot-modal" type="button">Cancel</button>
            <button class="btn btn--primary" type="submit">
              ${renderIcon("bookmark")} Save spot
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
