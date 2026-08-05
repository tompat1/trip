import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

export function renderQuickCaptureWidget() {
  if (!state.canShowConciergeAndAssistant) return "";

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
        <span class="quick-capture-fab__icons">
          ${renderIcon("sparkles")}
          ${renderIcon("camera")}
        </span>
      `}
    </button>

    <!-- Glassmorphic Quick Action Sheet Modal -->
    <div class="quick-capture-overlay ${isOpen ? 'is-open' : ''}" data-action="close-quick-capture">
      <div class="quick-capture-modal">
        <!-- Header & Segmented Tab Switcher -->
        <div class="quick-capture-header">
          <div>
            <span class="quick-capture-kicker voice-mono">UNIVERSAL ASSISTANT & CAPTURE</span>
            <h3 class="quick-capture-title">${escapeHtml(trip.destination)}</h3>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-quick-capture" aria-label="Close modal">
            ${renderIcon("x")}
          </button>
        </div>

        <!-- Segmented Tab Pills -->
        <div class="quick-action-tab-bar mb-md">
          <button class="quick-tab-btn ${activeTab === 'concierge' ? 'is-active' : ''}" data-action="switch-quick-capture-tab" data-tab="concierge" type="button">
            ${renderIcon("sparkles")} AI Concierge
          </button>
          <button class="quick-tab-btn ${activeTab === 'capture' ? 'is-active' : ''}" data-action="switch-quick-capture-tab" data-tab="capture" type="button">
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
      <div class="ai-concierge-chips-strip mb-sm">
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Best specialty coffee spots in ${escapeHtml(cityName)}">☕ Coffee in ${escapeHtml(cityName)}</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="What should I do on a rainy day in ${escapeHtml(cityName)}?">☔ Rainy day plan</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Hidden local gems in ${escapeHtml(cityName)} away from crowds">🌿 Hidden gems</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Top evening dining & wine bars in ${escapeHtml(cityName)}">🍷 Dining & Wine</button>
      </div>

      <!-- Chat Feed -->
      <div class="ai-concierge-chat-feed mb-sm">
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
            <span class="ai-typing-label">Querying Workers AI...</span>
          </div>
        ` : ""}
      </div>

      <!-- Input Form -->
      <form class="quick-capture-concierge-form" data-action="submit-quick-capture-concierge" onsubmit="return false;">
        <input type="text" id="quick-capture-concierge-input" placeholder="Ask anything about ${escapeHtml(cityName)}..." required ${isAsking ? "disabled" : ""} />
        <button type="submit" class="btn btn--primary btn--icon" data-action="submit-quick-capture-concierge" ${isAsking ? "disabled" : ""} aria-label="Send query">
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
      <div class="quick-capture-receiver mb-sm">
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
          <label for="capture-title">Moment Title</label>
          <input type="text" id="capture-title" placeholder="e.g. Morning coffee in ${escapeHtml((trip.destination || '').split(',')[0])}" required />
        </div>

        <!-- Note Textarea -->
        <div class="form-group mb-md">
          <label for="capture-text">Description / Memories</label>
          <textarea id="capture-text" rows="3" placeholder="Write your travel thoughts..."></textarea>
        </div>

        <div class="quick-capture-actions">
          <button type="button" class="btn btn--outline btn--sm" data-action="trigger-file-upload" ${isUploading ? "disabled" : ""}>
            ${renderIcon("image")} Attach Media
          </button>
          <button type="button" class="btn btn--outline btn--sm quick-capture-ai-btn" data-action="auto-describe-moment" ${isUploading ? "disabled" : ""}>
            ${renderIcon("sparkles")} AI Auto-Describe
          </button>
          <button type="submit" class="btn btn--primary btn--sm" data-action="submit-quick-capture" ${isUploading ? "disabled" : ""}>
            ${renderIcon("check")} Save
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
