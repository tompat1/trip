import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_STAMP_SVG } from "./BrandAssets.js";

const TRIP_LENGTH_OPTIONS = [
  { days: 3, label: "3 days" },
  { days: 5, label: "5 days" },
  { days: 7, label: "7 days" },
  { days: 10, label: "10 days" },
];

const STARTER_OPTIONS = [
  { id: "stay", label: "Book your stay", icon: "home" },
  { id: "food", label: "Find food spots", icon: "utensils" },
  { id: "map", label: "Build route map", icon: "map" },
];

export function renderTripCreateModal() {
  if (!state.tripCreateOpen) return "";

  const today = new Date().toISOString().split("T")[0];

  return `
    <div class="trip-create-overlay">
      <section class="trip-create-sheet" role="dialog" aria-modal="true" aria-labelledby="trip-create-title">
        <div class="trip-create-brand">
          ${TRIP_STAMP_SVG("", 58)}
        </div>

        <div class="trip-create-header">
          <div>
            <span class="trip-create-kicker voice-mono">New journey</span>
            <h2 class="trip-create-title" id="trip-create-title">Create a trip</h2>
            <p class="trip-create-subtitle">Start with the place and dates. The planning board comes next.</p>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-trip-create" aria-label="Close">
            ${renderIcon("x")}
          </button>
        </div>

        <form id="trip-create-form" class="trip-create-form">
          <div class="trip-create-grid">
            <label class="trip-create-field trip-create-field--wide">
              <span class="drawer-label">Destination</span>
              <div class="trip-create-input-wrap">
                ${renderIcon("mapPin")}
                <input class="drawer-input trip-create-input" name="destination" type="text" placeholder="Paris, France" autocomplete="off" required />
              </div>
            </label>

            <label class="trip-create-field">
              <span class="drawer-label">Start date</span>
              <input class="drawer-input" name="startDate" type="date" value="${today}" required />
            </label>

          </div>

          <div class="trip-create-field">
            <span class="drawer-label">Length</span>
            <div class="trip-create-pills" data-trip-length-group>
              ${TRIP_LENGTH_OPTIONS.map((option, index) => `
                <button type="button" class="trip-create-pill ${index === 2 ? "is-selected" : ""}" data-trip-length="${option.days}">
                  ${option.label}
                </button>
              `).join("")}
            </div>
            <input type="hidden" name="daysCount" id="trip-create-days-count" value="7" />
          </div>

          <div class="trip-create-preview">
            <div class="trip-create-preview__map">
              <span class="route-node-pin">${renderIcon("pin")}</span>
              <span class="trip-create-preview__route"></span>
              <span class="route-node-pin route-node-pin--end">${renderIcon("flag")}</span>
            </div>
            <div class="trip-create-preview__copy">
              <strong>Trip board setup</strong>
              <span>Checklist, day plan, timeline, and map will be ready to fill.</span>
            </div>
          </div>

          <div class="trip-create-starters" aria-label="Starter planning tasks">
            ${STARTER_OPTIONS.map((item) => `
              <label class="trip-create-starter">
                <input type="checkbox" name="starterTasks" value="${item.id}" checked />
                <span>${renderIcon(item.icon)}</span>
                <strong>${escapeHtml(item.label)}</strong>
              </label>
            `).join("")}
          </div>

          <p class="trip-create-error" id="trip-create-error" aria-live="polite"></p>

          <div class="trip-create-actions">
            <button type="button" class="btn btn--outline" data-action="close-trip-create">Cancel</button>
            <button type="submit" class="btn btn--primary trip-create-submit">
              ${renderIcon("sparkles")} Create trip
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
