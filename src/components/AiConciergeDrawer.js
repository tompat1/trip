import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

const AI_PROVIDERS = [
  { id: "auto", label: "⚡ Workers AI (Free)", desc: "Cloudflare Edge Llama 3.3 (Built-in Free)" },
  { id: "deepseek-free", label: "🧠 DeepSeek R1 (Free)", desc: "DeepSeek R1 Edge Reasoning ($0)" },
  { id: "openrouter-free", label: "🦙 Llama 3.3 (Free)", desc: "OpenRouter Llama 3.3 70B ($0)" },
  { id: "groq-free", label: "🚀 Groq Speed (Free Key)", desc: "Groq Llama 3.3 70B @ 500 tok/sec ($0)" },
  { id: "gemini", label: "✨ Gemini 1.5 (Free Key)", desc: "Google Gemini (1,500 Free RPD Key)" },
  { id: "openai", label: "🤖 ChatGPT (4o)", desc: "OpenAI GPT-4o Mini" },
  { id: "claude", label: "🎭 Claude 3.5", desc: "Anthropic Claude 3.5" },
  { id: "grok", label: "🔥 Grok 2", desc: "xAI Grok 2 Real-time" },
];

export function renderAiConciergeDrawer() {
  if (!state.canShowConciergeAndAssistant) return "";

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
                ${renderIcon("key")} ${isSettingsOpen ? "Close Keys" : "Free Keys & BYOK"}
              </button>
            </div>
            <h3>TRIP Travel Concierge</h3>
            <p style="font-size: 0.78rem; color: var(--ink-muted); margin: 2px 0 0 0;">Grounded travel AI for ${trip.destination}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <button class="btn btn--icon btn--ghost" data-action="open-ai-settings-modal" title="AI Settings & Provider Keys" aria-label="AI Settings">
              ${renderIcon("settings")}
            </button>
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
              <strong>🔑 Free AI Keys & BYOK Setup</strong>
              <span style="font-size: 0.72rem; color: var(--ink-muted);">Saved locally in browser</span>
            </div>
            <div class="ai-free-links-hint">
              💡 <strong>Get 100% Free AI Keys:</strong>
              <a href="https://aistudio.google.com/" target="_blank" rel="noopener">Google AI Studio (1500/day free)</a> · 
              <a href="https://openrouter.ai/" target="_blank" rel="noopener">OpenRouter Free</a> · 
              <a href="https://console.groq.com/" target="_blank" rel="noopener">Groq Speed Free</a>
            </div>
            <div class="ai-keys-form-grid">
              <div class="ai-key-input-field">
                <label for="key-gemini">Google Gemini API Key (Free):</label>
                <input type="password" id="key-gemini" data-key-field="geminiKey" value="${escapeHtml(keys.geminiKey || "")}" placeholder="AIzaSy..." />
              </div>
              <div class="ai-key-input-field">
                <label for="key-openrouter">OpenRouter Free Key:</label>
                <input type="password" id="key-openrouter" data-key-field="openRouterKey" value="${escapeHtml(keys.openRouterKey || "")}" placeholder="sk-or-v1-..." />
              </div>
              <div class="ai-key-input-field">
                <label for="key-groq">Groq Free Speed Key:</label>
                <input type="password" id="key-groq" data-key-field="groqKey" value="${escapeHtml(keys.groqKey || "")}" placeholder="gsk_..." />
              </div>
              <div class="ai-key-input-field">
                <label for="key-openai">OpenAI API Key (ChatGPT):</label>
                <input type="password" id="key-openai" data-key-field="openAiKey" value="${escapeHtml(keys.openAiKey || "")}" placeholder="sk-..." />
              </div>
              <div class="ai-key-input-field">
                <label for="key-claude">Anthropic Claude Key:</label>
                <input type="password" id="key-claude" data-key-field="claudeKey" value="${escapeHtml(keys.claudeKey || "")}" placeholder="sk-ant-..." />
              </div>
              <div class="ai-key-input-field">
                <label for="key-grok">xAI Grok Key:</label>
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
                ${formatConciergeMessageHTML(msg.text, msg.role === "assistant")}
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
        <form class="ai-concierge-form" id="ai-concierge-form" data-action="submit-ai-concierge" onsubmit="return false;">
          <input type="text" id="ai-concierge-input" placeholder="Ask ${formatAiProviderName(currentProvider)} about ${trip.destination}..." required ${isAsking ? "disabled" : ""} />
          <button type="submit" class="btn btn--primary btn--icon" data-action="submit-ai-concierge" ${isAsking ? "disabled" : ""} aria-label="Send query">
            ${renderIcon("arrowRight")}
          </button>
        </form>
      </div>
    </div>
  `;
}

function formatConciergeMessageHTML(text = "", isAssistant = false) {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  if (!isAssistant) return html;

  const foundNames = [];

  // 1. Bold tags (e.g. <strong>Ten Belles</strong>)
  const boldRegex = /<strong>(.*?)<\/strong>/g;
  for (const match of text.matchAll(boldRegex)) {
    if (match[1]) foundNames.push(match[1].trim());
  }

  // 2. Numbered lists (e.g. 1. Cafékothèque de Paris or 1. <strong>Ten Belles</strong>)
  const numListRegex = /(?:^|<br\s*\/?>|\n)\s*\d+[\.\)]\s*(?:<strong>)?([A-Z\u00C0-\u024F0-9\s'’\-]+?)(?:<\/strong>)?(?=\s*(?:—|-|:|\(|\n|<br>|$))/g;
  for (const match of html.matchAll(numListRegex)) {
    if (match[1]) foundNames.push(match[1].replace(/<[^>]+>/g, "").trim());
  }

  // 3. Emoji headers & bullets (e.g. ☕ Ten Belles)
  const emojiRegex = /(?:☕|📍|☔|🌿|🍷|🍽️|•)\s*(?:<strong>)?([A-Z\u00C0-\u024F0-9\s'’\-]+?)(?:<\/strong>)?(?=\s*(?:—|-|:|\(|\n|<br>|$))/g;
  for (const match of html.matchAll(emojiRegex)) {
    if (match[1]) foundNames.push(match[1].replace(/<[^>]+>/g, "").trim());
  }

  const IGNORE_WORDS = ["concierge", "paris", "france", "google", "key", "specialty coffee", "here are", "top choice", "partly cloudy", "recommendations", "option", "choice", "view on map"];
  const spots = Array.from(new Set(foundNames))
    .map(s => s.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(s => s.length >= 3 && s.length <= 40 && !IGNORE_WORDS.some(w => s.toLowerCase().includes(w)));

  if (spots.length > 0) {
    const actionsHTML = `
      <div class="ai-spot-actions-toolbar">
        <span style="font-size: 0.68rem; font-weight: 800; color: var(--ink-muted); width: 100%; margin-bottom: 2px;">INTERACTIVE SPOTS:</span>
        ${spots.slice(0, 5).map(spotName => `
          <div class="ai-spot-item-card">
            <span class="ai-spot-item-title">${escapeHtml(spotName)}</span>
            <div class="ai-spot-item-btns">
              <button class="ai-spot-action-btn" data-action="add-poi-event" data-spot-name="${escapeHtml(spotName)}" type="button">
                ➕ Add to Day 1
              </button>
              <button class="ai-spot-action-btn" data-action="toggle-bookmark" data-place-id="${escapeHtml('spot-' + spotName.toLowerCase().replace(/\s+/g, '-'))}" type="button">
                🔖 Bookmark
              </button>
              <button class="ai-spot-action-btn" data-action="select-top-poi" data-spot-name="${escapeHtml(spotName)}" type="button">
                🗺️ Map
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    html += actionsHTML;
  }

  return html;
}

function formatAiProviderName(provider = "auto") {
  if (provider === "deepseek-free") return "DeepSeek R1 (Free)";
  if (provider === "openrouter-free") return "Llama 3.3 (Free)";
  if (provider === "groq-free") return "Groq Speed (Free)";
  if (provider === "gemini") return "Gemini 1.5";
  if (provider === "openai") return "ChatGPT";
  if (provider === "claude") return "Claude 3.5";
  if (provider === "grok") return "Grok 2";
  return "Workers AI (Free)";
}

function formatAiModelLabel(model = "") {
  if (model.includes("deepseek")) return "🧠 DeepSeek R1 (Free)";
  if (model.includes("llama-3.3-free")) return "🦙 Llama 3.3 70B (Free)";
  if (model.includes("groq")) return "🚀 Groq Speed (Free Key)";
  if (model.includes("gemini")) return "✨ Gemini 1.5 Flash (Free Tier)";
  if (model.includes("gpt-4o")) return "🤖 GPT-4o Mini";
  if (model.includes("claude")) return "🎭 Claude 3 Haiku";
  if (model.includes("grok")) return "🔥 Grok 2";
  if (model.includes("llama")) return "⚡ Llama 3.3 (Workers AI Free)";
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
