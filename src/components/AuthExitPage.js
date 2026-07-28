import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";

export function renderAuthExitPage() {
  if (!state.authExitOpen) return "";

  return `
    <div class="auth-exit-page" role="dialog" aria-modal="true" aria-labelledby="auth-exit-title">
      <section class="auth-exit-card">
        <div class="auth-exit-brand">
          ${TRIP_LOGO_SVG("", 52)}
        </div>
        <span class="auth-exit-kicker">Signed out</span>
        <h2 id="auth-exit-title">Your trip board is still here.</h2>
        <p>Sign back in to sync account features, or continue as guest and keep planning locally.</p>

        <div class="auth-provider-stack" aria-label="Social sign in options">
          ${renderProviderButton("apple", "Apple")}
          ${renderProviderButton("google", "Google")}
          ${renderProviderButton("facebook", "Facebook")}
        </div>

        <div class="auth-divider"><span></span><strong>or</strong><span></span></div>

        <form class="auth-exit-login-form" id="auth-exit-login-form">
          <label>
            <span>Email</span>
            <input name="email" type="email" value="${escapeHtml(state.userProfile?.email || "")}" autocomplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button class="btn btn--primary" type="submit">${renderIcon("logIn")} Sign in</button>
        </form>

        <div class="auth-exit-actions">
          <button class="btn btn--outline btn--sm" data-action="open-premium" type="button">
            ${renderIcon("sparkles")} Premium
          </button>
          <button class="btn btn--outline btn--sm" data-action="continue-as-guest" type="button">
            ${renderIcon("user")} Continue as guest
          </button>
          <button class="btn btn--ghost btn--sm" data-action="go-home-from-exit" type="button">
            ${renderIcon("map")} Back to trips
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderProviderButton(id, label) {
  return `
    <button class="auth-provider-btn auth-provider-btn--${id}" data-action="social-auth" data-provider="${label}" type="button">
      <span class="auth-provider-mark">${getProviderMark(id)}</span>
      <strong>Sign in with ${label}</strong>
    </button>
  `;
}

function getProviderMark(id) {
  if (id === "apple") return "";
  if (id === "facebook") return "f";
  return "G";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
