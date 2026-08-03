import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

export function renderQuickCaptureWidget() {
  const isOpen = state.quickCaptureOpen;
  const activeTab = state.quickCaptureTab || "concierge";
  const trips = state.getAllTrips ? state.getAllTrips() : (state.activeTrip ? [state.activeTrip] : []);
  const selectedTripId = state.quickCaptureTripId || state.activeTripId;
  const trip = trips.find((item) => item.id === selectedTripId) || state.activeTrip || {
    id: "guest",
    destination: "TRIP Travel Planner",
    dates: "Plan your trip",
  };
  const cityName = (trip.destination || "Destination").split(",")[0].trim();
  const upload = state.quickCaptureUpload || { status: "idle", progress: 0 };
  const isUploading = upload.status === "reading" || upload.status === "saving";
  const history = (state.aiConciergeHistory && state.aiConciergeHistory.length) ? state.aiConciergeHistory : [
    {
      role: "assistant",
      text: `Hello! I'm your Cloudflare-powered TRIP AI Concierge for **${trip.destination}**. How can I help you plan or explore right now?`,
    },
  ];
  const isAsking = Boolean(state.aiConciergeLoading);

  return `
    <!-- Single Universal Floating Action Hub FAB -->
    <button class="quick-capture-fab ${isOpen ? 'is-active' : ''}" data-action="toggle-quick-capture" title="TRIP Concierge & Quick Capture">
      ${isOpen ? renderIcon("x") : `
        <span class="quick-capture-fab__icons" style="display: inline-flex; align-items: center; gap: 3px;">
          ${renderIcon("sparkles")}
          ${renderIcon("camera")}
        </span>
      `}
    </button>

    <!-- Glassmorphic Quick Action Sheet Modal -->
    <div class="quick-capture-overlay ${isOpen ? 'is-open' : ''}" data-action="close-quick-capture">
      <div class="quick-capture-modal">
        <!-- Header & Segmented Tab Switcher -->
        <div class="quick-capture-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <span class="voice-mono" style="font-size: 0.7rem; font-weight: 700; color: var(--red); text-transform: uppercase; letter-spacing: 0.5px;">UNIVERSAL ASSISTANT & CAPTURE</span>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--ink); margin: 2px 0 0 0;">${escapeHtml(trip.destination)}</h3>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-quick-capture" aria-label="Close modal">
            ${renderIcon("x")}
          </button>
        </div>

        <!-- Segmented Tab Pills -->
        <div class="quick-action-tab-bar mb-md" style="display: flex; background: var(--paper-subtle); padding: 4px; border-radius: 12px; gap: 4px; border: 1px solid var(--line-light); margin-bottom: 14px;">
          <button class="quick-tab-btn ${activeTab === 'concierge' ? 'is-active' : ''}" data-action="switch-quick-capture-tab" data-tab="concierge" type="button" style="flex: 1; padding: 8px 12px; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: ${activeTab === 'concierge' ? 'var(--paper-card)' : 'transparent'}; color: ${activeTab === 'concierge' ? 'var(--ink)' : 'var(--ink-muted)'}; box-shadow: ${activeTab === 'concierge' ? 'var(--shadow-sm)' : 'none'};">
            ${renderIcon("sparkles")} AI Concierge
          </button>
          <button class="quick-tab-btn ${activeTab === 'capture' ? 'is-active' : ''}" data-action="switch-quick-capture-tab" data-tab="capture" type="button" style="flex: 1; padding: 8px 12px; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: ${activeTab === 'capture' ? 'var(--paper-card)' : 'transparent'}; color: ${activeTab === 'capture' ? 'var(--ink)' : 'var(--ink-muted)'}; box-shadow: ${activeTab === 'capture' ? 'var(--shadow-sm)' : 'none'};">
            ${renderIcon("camera")} Quick Capture
          </button>
        </div>

        ${activeTab === "concierge" ? renderConciergeTabContent({ trip, cityName, history, isAsking }) : renderCaptureTabContent({ trip, trips, isUploading, upload })}
      </div>
    </div>
  `;
}

function renderConciergeTabContent({ trip, cityName, history, isAsking }) {
  return `
    <div class="concierge-tab-content">
      <!-- Quick Prompt Chips -->
      <div class="ai-concierge-chips-strip mb-sm" style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 10px;">
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Best specialty coffee spots in ${escapeHtml(cityName)}">☕ Coffee in ${escapeHtml(cityName)}</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="What should I do on a rainy day in ${escapeHtml(cityName)}?">☔ Rainy day plan</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Hidden local gems in ${escapeHtml(cityName)} away from crowds">🌿 Hidden gems</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Top evening dining & wine bars in ${escapeHtml(cityName)}">🍷 Dining & Wine</button>
      </div>

      <!-- Chat Feed -->
      <div class="ai-concierge-chat-feed mb-sm" style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px; background: var(--paper-card); border-radius: 12px; border: 1px solid var(--line-light); margin-bottom: 12px;">
        ${history.map((msg) => `
          <div class="ai-chat-bubble ai-chat-bubble--${msg.role}">
            <div class="ai-bubble-content">
              ${msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')}
            </div>
          </div>
        `).join("")}
        ${isAsking ? `
          <div class="ai-chat-bubble ai-chat-bubble--assistant ai-chat-bubble--loading">
            <span class="ai-typing-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
            <span style="font-size: 0.8rem; color: var(--ink-muted); margin-left: 6px;">Querying Workers AI...</span>
          </div>
        ` : ""}
      </div>

      <!-- Input Form -->
      <form class="quick-capture-concierge-form" data-action="submit-quick-capture-concierge" onsubmit="return false;" style="display: flex; gap: 8px;">
        <input type="text" id="quick-capture-concierge-input" placeholder="Ask anything about ${escapeHtml(cityName)}..." required ${isAsking ? "disabled" : ""} style="flex: 1; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--radius-md); font-size: 0.88rem; background: var(--paper); color: var(--ink);" />
        <button type="submit" class="btn btn--primary btn--icon" data-action="submit-quick-capture-concierge" ${isAsking ? "disabled" : ""} aria-label="Send query" style="padding: 10px 14px;">
          ${renderIcon("arrowRight")}
        </button>
      </form>
    </div>
  `;
}

function renderCaptureTabContent({ trip, trips, isUploading, upload }) {
  return `
    <div class="capture-tab-content">
      <!-- Receiver Badge -->
      <div class="quick-capture-receiver mb-sm" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--paper-subtle); padding: 8px 12px; border-radius: 8px; margin-bottom: 12px;">
        <label for="quick-capture-trip-select" class="voice-mono" style="font-size: 0.78rem; font-weight: 700; color: var(--ink-muted); display: flex; align-items: center; gap: 4px;">
          ${renderIcon("mapPin")} Send to
        </label>
        <select id="quick-capture-trip-select" data-action="select-quick-capture-trip" ${isUploading ? "disabled" : ""} style="background: transparent; border: none; font-size: 0.85rem; font-weight: 600; color: var(--ink);">
          ${trips.map((item) => `
            <option value="${escapeHtml(item.id)}" ${item.id === trip.id ? "selected" : ""}>
              ${item.flag || ""} ${escapeHtml(item.destination)}
            </option>
          `).join("")}
        </select>
        <span class="voice-mono" style="font-size: 0.72rem; color: var(--ink-light);">${new Date().toISOString().split("T")[0]}</span>
      </div>

      <form id="quick-capture-form" onsubmit="return false;">
        <input type="file" id="quick-capture-file-input" accept="image/*,video/*" multiple style="display: none;" />

        <!-- Title Input -->
        <div class="form-group mb-sm">
          <label for="capture-title" style="font-size: 0.78rem; font-weight: 700; color: var(--ink-muted); display: block; margin-bottom: 4px;">Moment Title</label>
          <input type="text" id="capture-title" placeholder="e.g. Morning coffee in ${escapeHtml((trip.destination || '').split(',')[0])}" required style="width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--radius-md); font-size: 0.9rem; background: var(--paper-card); color: var(--ink);" />
        </div>

        <!-- Note Textarea -->
        <div class="form-group mb-md">
          <label for="capture-text" style="font-size: 0.78rem; font-weight: 700; color: var(--ink-muted); display: block; margin-bottom: 4px;">Description / Memories</label>
          <textarea id="capture-text" rows="3" placeholder="Write your travel thoughts..." style="width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--radius-md); font-size: 0.88rem; background: var(--paper-card); color: var(--ink); resize: none;"></textarea>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; margin-top: 14px; flex-wrap: wrap;">
          <button type="button" class="btn btn--outline btn--sm" data-action="trigger-file-upload" style="flex: 1; min-width: 110px;" ${isUploading ? "disabled" : ""}>
            ${renderIcon("image")} Attach Media
          </button>
          <button type="button" class="btn btn--outline btn--sm" data-action="auto-describe-moment" style="flex: 1; min-width: 130px; border-color: var(--orange); color: var(--orange);" ${isUploading ? "disabled" : ""}>
            ${renderIcon("sparkles")} AI Auto-Describe
          </button>
          <button type="submit" class="btn btn--primary btn--sm" data-action="submit-quick-capture" style="flex: 1; min-width: 90px;" ${isUploading ? "disabled" : ""}>
            ${renderIcon("check")} Save
          </button>
        </div>

        ${upload.status !== "idle" ? `
          <div class="quick-capture-progress" aria-live="polite" style="margin-top: 10px;">
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
