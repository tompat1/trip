import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

export function renderAiConciergeDrawer() {
  const isOpen = Boolean(state.aiConciergeOpen);
  const trip = state.activeTrip || { destination: "Destination" };
  const cityName = (trip.destination || "Destination").split(",")[0].trim();
  const history = (state.aiConciergeHistory && state.aiConciergeHistory.length) ? state.aiConciergeHistory : [
    {
      role: "assistant",
      text: `Hello! I'm your Cloudflare-powered TRIP AI Concierge for **${trip.destination}**. How can I help you plan or explore right now?`,
    },
  ];
  const isAsking = Boolean(state.aiConciergeLoading);

  return `
    <div class="ai-concierge-overlay ${isOpen ? "is-open" : ""}" data-action="close-ai-concierge">
      <div class="ai-concierge-drawer">
        <div class="ai-concierge-header">
          <div class="ai-concierge-brand">
            <span class="ai-badge voice-mono">${renderIcon("sparkles")} CLOUDFLARE WORKERS AI</span>
            <h3>TRIP Travel Concierge</h3>
            <p style="font-size: 0.78rem; color: var(--ink-muted); margin: 2px 0 0 0;">Personalized recommendations for ${trip.destination}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${(state.aiConciergeHistory && state.aiConciergeHistory.length) ? `
              <button class="btn btn--ghost btn--xs" data-action="clear-ai-concierge" style="font-size: 0.72rem; color: var(--ink-muted);" title="Clear chat history">Clear</button>
            ` : ""}
            <button class="btn btn--icon btn--ghost" data-action="close-ai-concierge" aria-label="Close AI Concierge">
              ${renderIcon("x")}
            </button>
          </div>
        </div>

        <!-- Quick Prompt Chips -->
        <div class="ai-concierge-chips-strip">
          <button class="ai-chip" data-action="send-ai-chip" data-prompt="Best specialty coffee spots in ${cityName}">☕ Coffee in ${cityName}</button>
          <button class="ai-chip" data-action="send-ai-chip" data-prompt="What should I do on a rainy day in ${cityName}?">☔ Rainy day plan</button>
          <button class="ai-chip" data-action="send-ai-chip" data-prompt="Hidden local gems in ${cityName} away from crowds">🌿 Hidden gems</button>
          <button class="ai-chip" data-action="send-ai-chip" data-prompt="Top evening dining & wine bars in ${cityName}">🍷 Dining & Wine</button>
        </div>

        <!-- Chat Feed -->
        <div class="ai-concierge-chat-feed">
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
        <form class="ai-concierge-form" data-action="submit-ai-concierge" onsubmit="return false;">
          <input type="text" id="ai-concierge-input" placeholder="Ask anything about ${trip.destination}..." required ${isAsking ? "disabled" : ""} />
          <button type="submit" class="btn btn--primary btn--icon" ${isAsking ? "disabled" : ""} aria-label="Send query">
            ${renderIcon("arrowRight")}
          </button>
        </form>
      </div>
    </div>
  `;
}
