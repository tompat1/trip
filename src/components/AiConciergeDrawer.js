import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

const AI_PROVIDERS = [
  { id: "auto", label: "⚡ Workers AI", desc: "Edge Llama 3.3 (Default)" },
  { id: "gemini", label: "✨ Gemini 1.5", desc: "Google Flash Search Grounded" },
  { id: "openai", label: "🤖 ChatGPT (4o)", desc: "OpenAI GPT-4o Mini" },
  { id: "claude", label: "🎭 Claude 3.5", desc: "Anthropic Claude Haiku/Sonnet" },
  { id: "grok", label: "🚀 Grok 2", desc: "xAI Real-time Insights" },
];

export function renderAiConciergeDrawer() {
  const isOpen = Boolean(state.aiConciergeOpen);
  const trip = state.activeTrip || { destination: "Destination" };
  const cityName = (trip.destination || "Destination").split(",")[0].trim();
  const currentProvider = state.aiConciergeProvider || "auto";
  const keys = state.aiProviderKeys || {};
  const isSettingsOpen = Boolean(state.aiSettingsOpen);

  const history = (state.aiConciergeHistory && state.aiConciergeHistory.length) ? state.aiConciergeHistory : [
    {
      role: "assistant",
      text: `Hello! I'm your multi-LLM TRIP AI Concierge for **${trip.destination}**. Ask me for personalized spots, hidden gems, or itinerary plans!`,
      aiModel: currentProvider === "auto" ? "workers-ai-llama3.3" : `${currentProvider}`,
    },
  ];
  const isAsking = Boolean(state.aiConciergeLoading);

  return `
    <div class="ai-concierge-overlay ${isOpen ? "is-open" : ""}" data-action="close-ai-concierge">
      <div class="ai-concierge-drawer">
        
        <!-- Drawer Header -->
        <div class="ai-concierge-header">
          <div class="ai-concierge-brand">
            <div class="ai-header-pill-row">
              <span class="ai-badge voice-mono">${renderIcon("sparkles")} MULTI-LLM CONCIERGE</span>
              <button class="btn btn--xs btn--outline ai-keys-toggle-btn" data-action="toggle-ai-keys-settings" type="button">
                ${renderIcon("key")} ${isSettingsOpen ? "Close Keys" : "AI Keys"}
              </button>
            </div>
            <h3>TRIP Travel Concierge</h3>
            <p style="font-size: 0.78rem; color: var(--ink-muted); margin: 2px 0 0 0;">Grounded travel AI for ${trip.destination}</p>
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

        <!-- Provider Model Selector Bar -->
        <div class="ai-model-selector-bar">
          <span class="ai-model-selector-label voice-mono">ENGINE:</span>
          <div class="ai-model-pills-scroll">
            ${AI_PROVIDERS.map((p) => `
              <button class="ai-model-pill ${currentProvider === p.id ? "active" : ""}" data-action="set-ai-provider" data-provider="${p.id}" type="button" title="${p.desc}">
                ${p.label}
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Optional AI Provider Keys Drawer -->
        ${isSettingsOpen ? `
          <div class="ai-keys-config-panel animate-scale-up">
            <div class="ai-keys-config-header">
              <strong>🔑 Bring Your Own AI Key (BYOK)</strong>
              <span style="font-size: 0.72rem; color: var(--ink-muted);">Keys stored locally in browser</span>
            </div>
            <div class="ai-keys-form-grid">
              <div class="ai-key-input-field">
                <label for="key-gemini">Google Gemini API Key:</label>
                <input type="password" id="key-gemini" data-key-field="geminiKey" value="${escapeHtml(keys.geminiKey || "")}" placeholder="AIzaSy..." />
              </div>
              <div class="ai-key-input-field">
                <label for="key-openai">OpenAI API Key (ChatGPT):</label>
                <input type="password" id="key-openai" data-key-field="openAiKey" value="${escapeHtml(keys.openAiKey || "")}" placeholder="sk-..." />
              </div>
              <div class="ai-key-input-field">
                <label for="key-claude">Anthropic Claude API Key:</label>
                <input type="password" id="key-claude" data-key-field="claudeKey" value="${escapeHtml(keys.claudeKey || "")}" placeholder="sk-ant-..." />
              </div>
              <div class="ai-key-input-field">
                <label for="key-grok">xAI Grok API Key:</label>
                <input type="password" id="key-grok" data-key-field="grokKey" value="${escapeHtml(keys.grokKey || "")}" placeholder="xai-..." />
              </div>
            </div>
          </div>
        ` : ""}

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
              ${msg.role === "assistant" && msg.aiModel ? `
                <div class="ai-bubble-model-badge voice-mono">
                  ${formatAiModelLabel(msg.aiModel)}
                </div>
              ` : ""}
            </div>
          `).join("")}
          ${isAsking ? `
            <div class="ai-chat-bubble ai-chat-bubble--assistant ai-chat-bubble--loading">
              <span class="ai-typing-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
              <span style="font-size: 0.8rem; color: var(--ink-muted); margin-left: 6px;">Querying ${formatAiProviderName(currentProvider)}...</span>
            </div>
          ` : ""}
        </div>

        <!-- Input Form -->
        <form class="ai-concierge-form" data-action="submit-ai-concierge" onsubmit="return false;">
          <input type="text" id="ai-concierge-input" placeholder="Ask ${formatAiProviderName(currentProvider)} about ${trip.destination}..." required ${isAsking ? "disabled" : ""} />
          <button type="submit" class="btn btn--primary btn--icon" ${isAsking ? "disabled" : ""} aria-label="Send query">
            ${renderIcon("arrowRight")}
          </button>
        </form>
      </div>
    </div>
  `;
}

function formatAiProviderName(provider = "auto") {
  if (provider === "gemini") return "Gemini 1.5";
  if (provider === "openai") return "ChatGPT";
  if (provider === "claude") return "Claude 3.5";
  if (provider === "grok") return "Grok 2";
  return "Workers AI";
}

function formatAiModelLabel(model = "") {
  if (model.includes("gemini")) return "✨ Gemini 1.5 Flash";
  if (model.includes("gpt-4o")) return "🤖 GPT-4o Mini";
  if (model.includes("claude")) return "🎭 Claude 3 Haiku";
  if (model.includes("grok")) return "🚀 Grok 2";
  if (model.includes("llama")) return "⚡ Llama 3.3 (Workers AI)";
  return "⚡ TRIP AI";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
