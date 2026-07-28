import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";

const FAQ_ITEMS = [
  {
    question: "Are companions and invites tied to the current trip?",
    answer: "Yes. Share and Invite Companion both use the trip selected in the header. Companion records, roles, messages and accepted status are stored per trip.",
    tags: ["companions", "invite", "share", "trip party"],
  },
  {
    question: "What is the difference between Share and Invite Companion?",
    answer: "Share now opens the same Invite Companion flow. It preselects Link, while the form still lets you choose Email, SMS, WhatsApp, QR or Link and assign a role.",
    tags: ["share", "invite", "link", "qr"],
  },
  {
    question: "Do starter checklist toggles automate bookings?",
    answer: "No. Those toggles only add starter items to your checklist. They do not search, book, or call external services by themselves.",
    tags: ["checklist", "create trip", "starter"],
  },
  {
    question: "Why do live events sometimes look stale?",
    answer: "Events depend on live provider keys. If Ticketmaster or Bandsintown keys are missing or return no matches, TRIP shows saved or fallback events.",
    tags: ["events", "concerts", "providers", "keys"],
  },
  {
    question: "Where do I edit profile, preferences, notifications and privacy?",
    answer: "Open Profile, then use the section tabs. Profile photo and settings autosave locally, and account sessions unlock cloud-backed actions.",
    tags: ["profile", "preferences", "privacy", "notifications"],
  },
  {
    question: "How do I create an account from an invite?",
    answer: "Open the invite link, choose Create Account, then enter name, email and password. The trip appears immediately after account creation.",
    tags: ["account", "invite", "guest", "login"],
  },
];

const HELP_ACTIONS = [
  { label: "Create a trip", icon: "plus", action: "create-trip" },
  { label: "Invite companions", icon: "userPlus", action: "help-invite-companions" },
  { label: "Plan itinerary", icon: "calendarDays", action: "help-open-plan" },
  { label: "Find places", icon: "search", action: "help-open-search" },
  { label: "Live mode", icon: "radio", action: "help-open-live" },
  { label: "Replay walkthrough", icon: "sparkles", action: "help-open-walkthrough" },
];

export function renderHelpCenter() {
  if (!state.helpOpen) return "";

  const query = String(state.helpQuery || "").trim().toLowerCase();
  const results = FAQ_ITEMS.filter((item) => {
    if (!query) return true;
    const haystack = [item.question, item.answer, ...(item.tags || [])].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  return `
    <div class="help-overlay">
      <section class="help-shell" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div class="help-header">
          <div class="help-brand">${TRIP_LOGO_SVG("", 34)}</div>
          <div>
            <span class="help-kicker">Help</span>
            <h2 id="help-title">How can TRIP help?</h2>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-help" type="button" aria-label="Close help">
            ${renderIcon("x")}
          </button>
        </div>

        <label class="help-search">
          ${renderIcon("search")}
          <input data-help-search type="search" value="${escapeHtml(state.helpQuery || "")}" placeholder="Search invite, flights, profile..." autocomplete="off" />
        </label>

        <div class="help-actions" aria-label="Help shortcuts">
          ${HELP_ACTIONS.map((item) => `
            <button class="help-action-chip" data-action="${escapeHtml(item.action)}" type="button">
              ${renderIcon(item.icon)}
              <span>${escapeHtml(item.label)}</span>
            </button>
          `).join("")}
        </div>

        <div class="help-results" aria-live="polite">
          ${results.length ? results.map((item, index) => `
            <details class="help-faq-item" ${index === 0 ? "open" : ""}>
              <summary>
                <span>${escapeHtml(item.question)}</span>
                ${renderIcon("chevronDown")}
              </summary>
              <p>${escapeHtml(item.answer)}</p>
              <div class="help-tags">
                ${(item.tags || []).slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
              </div>
            </details>
          `).join("") : `
            <div class="help-empty">
              <strong>No exact match.</strong>
              <span>Try “invite”, “profile”, “events”, “checklist”, or open the walkthrough.</span>
            </div>
          `}
        </div>
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
