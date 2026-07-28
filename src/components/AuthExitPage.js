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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
