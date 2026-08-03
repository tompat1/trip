import { renderIcon } from "../utils/icons.js";

const PROVIDERS = [
  { id: "auto", name: "⚡ Cloudflare Workers AI", desc: "Edge Llama 3.3 (Built-in Free, 10k neurons/day)" },
  { id: "deepseek-free", name: "🧠 OpenRouter DeepSeek R1", desc: "Open-source reasoning LLM (100% Free)" },
  { id: "openrouter-free", name: "🦙 OpenRouter Llama 3.3 70B", desc: "Meta's flagship open model (100% Free)" },
  { id: "groq-free", name: "🚀 Groq Ultra-Fast Engine", desc: "500+ tokens/sec ultra-fast inference ($0 with free Groq key)" },
  { id: "gemini", name: "✨ Google Gemini 1.5 Flash", desc: "1,500 free queries/day with Google AI Studio key" },
  { id: "openai", name: "🤖 OpenAI ChatGPT (GPT-4o Mini)", desc: "High reasoning & travel planning" },
  { id: "claude", name: "🎭 Anthropic Claude 3.5", desc: "Nuanced prose & travel itinerary synthesis" },
  { id: "grok", name: "🔥 xAI Grok 2", desc: "Real-time trends & web discovery" },
];

export function renderAiSettingsModal(state) {
  const isOpen = Boolean(state.aiSettingsModalOpen);
  if (!isOpen) return "";

  const currentProvider = state.aiConciergeProvider || "auto";
  const keys = state.aiProviderKeys || {};

  return `
    <div class="ai-settings-modal-overlay is-open" data-action="close-ai-settings-modal">
      <div class="ai-settings-modal-card animate-scale-up" onclick="event.stopPropagation();">
        <!-- Modal Header -->
        <div class="ai-settings-modal-header">
          <div class="ai-settings-modal-title">
            <span class="ai-badge voice-mono">${renderIcon("settings")} AI CONCIERGE SETTINGS</span>
            <h3>Engine & Provider Keys</h3>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-ai-settings-modal" aria-label="Close Settings">
            ${renderIcon("x")}
          </button>
        </div>

        <div class="ai-settings-modal-body">
          <!-- 1. Engine Selection -->
          <div class="ai-settings-section">
            <h4 class="ai-settings-heading">${renderIcon("sparkles")} Primary AI Model Engine</h4>
            <p class="ai-settings-subtext">Choose your default AI intelligence provider for the Concierge:</p>
            <div class="ai-settings-provider-grid">
              ${PROVIDERS.map((p) => `
                <div class="ai-provider-option-card ${currentProvider === p.id ? "selected" : ""}" data-action="set-ai-provider" data-provider="${p.id}">
                  <div class="ai-provider-radio">
                    <span class="radio-dot ${currentProvider === p.id ? "checked" : ""}"></span>
                  </div>
                  <div class="ai-provider-info">
                    <div class="ai-provider-name">${p.name}</div>
                    <div class="ai-provider-desc">${p.desc}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- 2. Free Key Claim Banner -->
          <div class="ai-settings-section ai-free-keys-banner">
            <h4 class="ai-settings-heading">💡 Get 100% Free API Keys</h4>
            <p class="ai-settings-subtext">You can get free API keys in under 10 seconds with zero credit card required:</p>
            <div class="ai-free-keys-links-row">
              <a href="https://aistudio.google.com/" target="_blank" rel="noopener" class="ai-free-link-pill">
                ✨ Google AI Studio (1,500/day Free) ${renderIcon("externalLink")}
              </a>
              <a href="https://openrouter.ai/" target="_blank" rel="noopener" class="ai-free-link-pill">
                🧠 OpenRouter Free (DeepSeek R1 / Llama) ${renderIcon("externalLink")}
              </a>
              <a href="https://console.groq.com/" target="_blank" rel="noopener" class="ai-free-link-pill">
                🚀 Groq Speed Free Key ${renderIcon("externalLink")}
              </a>
            </div>
          </div>

          <!-- 3. API Key Inputs -->
          <div class="ai-settings-section">
            <h4 class="ai-settings-heading">${renderIcon("key")} API Keys (Bring Your Own Key)</h4>
            <p class="ai-settings-subtext">API keys are securely saved strictly inside your local browser storage:</p>
            
            <div class="ai-key-inputs-list">
              <div class="ai-key-input-row">
                <div class="ai-key-label-group">
                  <label for="modal-key-gemini">Google Gemini Key</label>
                  <span class="ai-key-status">${keys.geminiKey ? "✓ Key Set" : "Optional"}</span>
                </div>
                <div class="ai-key-input-wrap">
                  <input type="password" id="modal-key-gemini" data-key-field="geminiKey" value="${escapeHtml(keys.geminiKey || "")}" placeholder="AIzaSy..." />
                  <button class="btn btn--xs btn--outline" data-action="test-ai-key" data-provider="gemini">Test Key</button>
                </div>
              </div>

              <div class="ai-key-input-row">
                <div class="ai-key-label-group">
                  <label for="modal-key-openrouter">OpenRouter Key (DeepSeek / Llama Free)</label>
                  <span class="ai-key-status">${keys.openRouterKey ? "✓ Key Set" : "Optional"}</span>
                </div>
                <div class="ai-key-input-wrap">
                  <input type="password" id="modal-key-openrouter" data-key-field="openRouterKey" value="${escapeHtml(keys.openRouterKey || "")}" placeholder="sk-or-v1-..." />
                  <button class="btn btn--xs btn--outline" data-action="test-ai-key" data-provider="openrouter">Test Key</button>
                </div>
              </div>

              <div class="ai-key-input-row">
                <div class="ai-key-label-group">
                  <label for="modal-key-groq">Groq Speed Key</label>
                  <span class="ai-key-status">${keys.groqKey ? "✓ Key Set" : "Optional"}</span>
                </div>
                <div class="ai-key-input-wrap">
                  <input type="password" id="modal-key-groq" data-key-field="groqKey" value="${escapeHtml(keys.groqKey || "")}" placeholder="gsk_..." />
                  <button class="btn btn--xs btn--outline" data-action="test-ai-key" data-provider="groq">Test Key</button>
                </div>
              </div>

              <div class="ai-key-input-row">
                <div class="ai-key-label-group">
                  <label for="modal-key-openai">OpenAI Key (ChatGPT)</label>
                  <span class="ai-key-status">${keys.openAiKey ? "✓ Key Set" : "Optional"}</span>
                </div>
                <div class="ai-key-input-wrap">
                  <input type="password" id="modal-key-openai" data-key-field="openAiKey" value="${escapeHtml(keys.openAiKey || "")}" placeholder="sk-..." />
                  <button class="btn btn--xs btn--outline" data-action="test-ai-key" data-provider="openai">Test Key</button>
                </div>
              </div>

              <div class="ai-key-input-row">
                <div class="ai-key-label-group">
                  <label for="modal-key-claude">Anthropic Claude Key</label>
                  <span class="ai-key-status">${keys.claudeKey ? "✓ Key Set" : "Optional"}</span>
                </div>
                <div class="ai-key-input-wrap">
                  <input type="password" id="modal-key-claude" data-key-field="claudeKey" value="${escapeHtml(keys.claudeKey || "")}" placeholder="sk-ant-..." />
                  <button class="btn btn--xs btn--outline" data-action="test-ai-key" data-provider="claude">Test Key</button>
                </div>
              </div>

              <div class="ai-key-input-row">
                <div class="ai-key-label-group">
                  <label for="modal-key-grok">xAI Grok Key</label>
                  <span class="ai-key-status">${keys.grokKey ? "✓ Key Set" : "Optional"}</span>
                </div>
                <div class="ai-key-input-wrap">
                  <input type="password" id="modal-key-grok" data-key-field="grokKey" value="${escapeHtml(keys.grokKey || "")}" placeholder="xai-..." />
                  <button class="btn btn--xs btn--outline" data-action="test-ai-key" data-provider="grok">Test Key</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="ai-settings-modal-footer">
          <div class="ai-settings-footer-left">
            <button class="btn btn--xs btn--ghost danger-text" data-action="clear-all-ai-keys">
              ${renderIcon("trash")} Clear All Saved Keys
            </button>
            <button class="btn btn--xs btn--ghost" data-action="clear-ai-concierge">
              Clear History
            </button>
          </div>
          <button class="btn btn--primary" data-action="close-ai-settings-modal">
            Done & Save
          </button>
        </div>
      </div>
    </div>
  `;
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
