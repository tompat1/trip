import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

export function renderQuickCaptureWidget() {
  const isOpen = state.quickCaptureOpen;
  const trip = state.activeTrip;

  return `
    <!-- Universal Floating Action FAB -->
    <button class="quick-capture-fab ${isOpen ? 'is-active' : ''}" data-action="toggle-quick-capture" title="Quick Capture Photo, Video, or Note">
      ${isOpen ? renderIcon("x") : renderIcon("camera")}
    </button>

    <!-- Glassmorphic Quick Capture Sheet Modal -->
    <div class="quick-capture-overlay ${isOpen ? 'is-open' : ''}" data-action="close-quick-capture">
      <div class="quick-capture-modal" onclick="event.stopPropagation()">
        <div class="quick-capture-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span class="voice-mono" style="font-size: 0.72rem; font-weight: 700; color: var(--red); text-transform: uppercase; letter-spacing: 0.5px;">UNIVERSAL QUICK CAPTURE</span>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--ink); margin: 2px 0 0 0;">Record Travel Moment</h3>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-quick-capture" aria-label="Close">
            ${renderIcon("x")}
          </button>
        </div>

        <!-- Location Badge -->
        <div style="margin: 12px 0 16px 0; padding: 8px 12px; background: var(--paper-subtle); border: 1px solid var(--line); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
          <span class="voice-mono" style="font-size: 0.78rem; font-weight: 600; color: var(--ink-muted); display: flex; align-items: center; gap: 6px;">
            ${renderIcon("mapPin")} ${escapeHtml(trip.destination)} ${trip.flag}
          </span>
          <span class="voice-mono" style="font-size: 0.72rem; color: var(--ink-light);">${new Date().toISOString().split("T")[0]}</span>
        </div>

        <form id="quick-capture-form" onsubmit="return false;">
          <!-- Quick Capture Type Selector -->
          <div class="quick-capture-types" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
            <label class="capture-type-card" style="cursor: pointer;">
              <input type="radio" name="captureType" value="photo" checked style="display: none;" />
              <div class="capture-card-body" style="background: var(--paper-card); border: 1.5px solid var(--line); border-radius: var(--radius-md); padding: 12px 8px; text-align: center; transition: all 0.2s;">
                <div style="color: var(--red); margin-bottom: 4px; display: flex; justify-content: center;">${renderIcon("camera")}</div>
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--ink);">Photo</span>
              </div>
            </label>

            <label class="capture-type-card" style="cursor: pointer;">
              <input type="radio" name="captureType" value="video" style="display: none;" />
              <div class="capture-card-body" style="background: var(--paper-card); border: 1.5px solid var(--line); border-radius: var(--radius-md); padding: 12px 8px; text-align: center; transition: all 0.2s;">
                <div style="color: var(--blue); margin-bottom: 4px; display: flex; justify-content: center;">${renderIcon("video")}</div>
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--ink);">Video</span>
              </div>
            </label>

            <label class="capture-type-card" style="cursor: pointer;">
              <input type="radio" name="captureType" value="note" style="display: none;" />
              <div class="capture-card-body" style="background: var(--paper-card); border: 1.5px solid var(--line); border-radius: var(--radius-md); padding: 12px 8px; text-align: center; transition: all 0.2s;">
                <div style="color: var(--green); margin-bottom: 4px; display: flex; justify-content: center;">${renderIcon("fileText")}</div>
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--ink);">Note</span>
              </div>
            </label>
          </div>

          <!-- Title Input -->
          <div class="form-group mb-sm">
            <label for="capture-title" style="font-size: 0.78rem; font-weight: 700; color: var(--ink-muted); display: block; margin-bottom: 4px;">Moment Title</label>
            <input type="text" id="capture-title" placeholder="e.g. Morning coffee in Saint-Germain" required style="width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--radius-md); font-size: 0.9rem; background: var(--paper-card); color: var(--ink);" />
          </div>

          <!-- Note Textarea -->
          <div class="form-group mb-md">
            <label for="capture-text" style="font-size: 0.78rem; font-weight: 700; color: var(--ink-muted); display: block; margin-bottom: 4px;">Description / Memories</label>
            <textarea id="capture-text" rows="3" placeholder="Write your travel thoughts..." style="width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--radius-md); font-size: 0.88rem; background: var(--paper-card); color: var(--ink); resize: none;"></textarea>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; margin-top: 16px;">
            <button type="button" class="btn btn--outline btn--sm" data-action="trigger-file-upload" style="flex: 1;">
              ${renderIcon("image")} Attach Photo
            </button>
            <button type="submit" class="btn btn--primary btn--sm" data-action="submit-quick-capture" style="flex: 1;">
              ${renderIcon("check")} Save Moment
            </button>
          </div>
        </form>
      </div>
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
