import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

export function renderQuickCaptureWidget() {
  const isOpen = state.quickCaptureOpen;
  const trips = state.getAllTrips ? state.getAllTrips() : [state.activeTrip];
  const selectedTripId = state.quickCaptureTripId || state.activeTripId;
  const trip = trips.find((item) => item.id === selectedTripId) || state.activeTrip;
  const upload = state.quickCaptureUpload || { status: "idle", progress: 0 };
  const isUploading = upload.status === "reading" || upload.status === "saving";

  return `
    <!-- Universal Floating Action FAB -->
    <button class="quick-capture-fab ${isOpen ? 'is-active' : ''}" data-action="toggle-quick-capture" title="Quick Capture Photo, Video, or Note">
      ${isOpen ? renderIcon("x") : renderIcon("camera")}
    </button>

    <!-- Glassmorphic Quick Capture Sheet Modal -->
    <div class="quick-capture-overlay ${isOpen ? 'is-open' : ''}" data-action="close-quick-capture">
      <div class="quick-capture-modal">
        <div class="quick-capture-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span class="voice-mono" style="font-size: 0.72rem; font-weight: 700; color: var(--red); text-transform: uppercase; letter-spacing: 0.5px;">UNIVERSAL QUICK CAPTURE</span>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--ink); margin: 2px 0 0 0;">Record Travel Moment</h3>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-quick-capture" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>

        <!-- Receiver Badge -->
        <div class="quick-capture-receiver">
          <label for="quick-capture-trip-select" class="voice-mono">
            ${renderIcon("mapPin")} Send to
          </label>
          <select id="quick-capture-trip-select" data-action="select-quick-capture-trip" ${isUploading ? "disabled" : ""}>
            ${trips.map((item) => `
              <option value="${escapeHtml(item.id)}" ${item.id === trip.id ? "selected" : ""}>
                ${item.flag || ""} ${escapeHtml(item.destination)}
              </option>
            `).join("")}
          </select>
          <span class="voice-mono">${new Date().toISOString().split("T")[0]}</span>
        </div>

        <form id="quick-capture-form" onsubmit="return false;">
          <input type="file" id="quick-capture-file-input" accept="image/*,video/*" multiple style="display: none;" />

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
            <button type="button" class="btn btn--outline btn--sm" data-action="trigger-file-upload" style="flex: 1;" ${isUploading ? "disabled" : ""}>
              ${renderIcon("image")} ${isUploading ? "Preparing..." : "Attach Media"}
            </button>
            <button type="submit" class="btn btn--primary btn--sm" data-action="submit-quick-capture" style="flex: 1;" ${isUploading ? "disabled" : ""}>
              ${renderIcon("check")} Save Note
            </button>
          </div>

          ${upload.status !== "idle" ? `
            <div class="quick-capture-progress" aria-live="polite">
              <div class="quick-capture-progress__orb"></div>
              <div class="quick-capture-progress__copy">
                <span class="voice-mono">${escapeHtml(getUploadStatusLabel(upload))}</span>
                <strong>${escapeHtml(upload.fileName || "Travel media")}</strong>
              </div>
              <div class="quick-capture-progress__track">
                <span style="width: ${Math.max(8, Math.min(100, Number(upload.progress || 0)))}%;"></span>
              </div>
            </div>
          ` : ""}
        </form>
      </div>
    </div>
  `;
}

function getUploadStatusLabel(upload) {
  if (upload.status === "complete") return "Saved to Journal";
  if (upload.status === "saving") return "Saving moment";
  if (upload.status === "error") return "Upload failed";
  return "Reading media";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
