import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";

export function renderAuthExitPage() {
  if (!state.authExitOpen) return "";
  const mode = state.authMode || "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const title = isSignup ? "Create your TRIP account." : isForgot ? "Reset your password." : "Welcome back to TRIP.";
  const kicker = isSignup ? "Get started" : isForgot ? "Account help" : "Sign in";
  const intro = isSignup
    ? "Create an account to sync trips, invite companions, and keep memories connected."
    : isForgot
      ? "Enter your email and we’ll prepare the reset flow. Email delivery wiring comes next."
      : "Sign in to sync trips, companions, planning, and memories across visits.";

  return `
    <div class="auth-exit-page" role="dialog" aria-modal="true" aria-labelledby="auth-exit-title">
      <section class="auth-exit-card">
        <button class="auth-exit-close" data-action="close-auth-panel" type="button" aria-label="Close sign in panel">${renderIcon("x")}</button>
        <div class="auth-exit-brand">
          ${TRIP_LOGO_SVG("", 52)}
        </div>
        <span class="auth-exit-kicker">${kicker}</span>
        <h2 id="auth-exit-title">${title}</h2>
        <p>${intro}</p>

        <div class="auth-mode-tabs" role="tablist" aria-label="Authentication mode">
          <button class="${mode === "login" ? "is-active" : ""}" data-action="set-auth-mode" data-auth-mode="login" type="button" role="tab" aria-selected="${mode === "login"}">Login</button>
          <button class="${mode === "signup" ? "is-active" : ""}" data-action="set-auth-mode" data-auth-mode="signup" type="button" role="tab" aria-selected="${mode === "signup"}">Sign up</button>
        </div>

        ${isForgot ? "" : `
          <div class="auth-provider-stack" aria-label="Social sign in options">
            ${renderProviderButton("apple", "Apple", isSignup)}
            ${renderProviderButton("google", "Google", isSignup)}
            ${renderProviderButton("facebook", "Facebook", isSignup)}
          </div>

          <div class="auth-divider"><span></span><strong>or</strong><span></span></div>
        `}

        <form class="auth-exit-login-form" id="${isSignup ? "auth-signup-form" : isForgot ? "auth-forgot-form" : "auth-exit-login-form"}">
          ${isSignup ? `
            <label>
              <span>Name</span>
              <input name="name" type="text" value="${escapeHtml(state.userProfile?.name || "")}" autocomplete="name" required />
            </label>
          ` : ""}
          <label>
            <span>Email</span>
            <input name="email" type="email" value="${escapeHtml(state.userProfile?.email || "")}" autocomplete="username" required />
          </label>
          ${isForgot ? "" : `
            <label>
              <span>Password</span>
              <input name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" minlength="${isSignup ? "8" : "1"}" required />
            </label>
          `}
          <button class="btn btn--primary" type="submit">
            ${renderIcon(isSignup ? "userPlus" : isForgot ? "mail" : "logIn")}
            ${isSignup ? "Create account" : isForgot ? "Send reset link" : "Sign in"}
          </button>
        </form>

        <div class="auth-support-links">
          ${isForgot ? `
            <button data-action="set-auth-mode" data-auth-mode="login" type="button">Back to login</button>
          ` : `
            <button data-action="set-auth-mode" data-auth-mode="forgot" type="button">Forgot password?</button>
            <button data-action="set-auth-mode" data-auth-mode="${isSignup ? "login" : "signup"}" type="button">
              ${isSignup ? "Already have an account?" : "No account yet?"}
            </button>
          `}
        </div>

        <div class="auth-exit-actions">
          <button class="btn btn--outline btn--sm" data-action="open-premium" type="button">
            ${renderIcon("sparkles")} Premium
          </button>
          <button class="btn btn--outline btn--sm" data-action="set-auth-mode" data-auth-mode="signup" type="button">
            ${renderIcon("userPlus")} Create account
          </button>
          <button class="btn btn--ghost btn--sm" data-action="go-home-from-exit" type="button">
            ${renderIcon("map")} Back to TRIP
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderProviderButton(id, label, isSignup = false) {
  return `
    <button class="auth-provider-btn auth-provider-btn--${id}" data-action="social-auth" data-provider="${label}" type="button">
      <span class="auth-provider-mark">${getProviderMark(id)}</span>
      <strong>${isSignup ? "Sign up" : "Sign in"} with ${label}</strong>
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
