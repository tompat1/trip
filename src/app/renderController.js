import { state } from "../state.js";
import { renderHomeView } from "../views/HomeView.js";
import { renderPlanView, renderTemplateMomentPicker } from "../views/PlanView.js";
import { renderSearchView } from "../views/SearchView.js";
import { renderLandingView } from "../views/LandingView.js";
import { renderLiveView, renderProfileView } from "../views/LiveView.js";
import { renderBottomNav } from "../components/BottomNav.js";
import { renderLightbox } from "../components/Lightbox.js";
import { renderEventDrawer } from "../components/EventDrawer.js";
import { renderTripCreateModal } from "../components/TripCreateModal.js";
import { renderQuickCaptureWidget } from "../components/QuickCaptureWidget.js";
import { renderOnboardingWalkthrough } from "../components/OnboardingWalkthrough.js";
import { renderHelpCenter } from "../components/HelpCenter.js";
import { renderAuthExitPage } from "../components/AuthExitPage.js";
import { renderPremiumSupportSheet } from "../components/PremiumSupportSheet.js";
import { renderPoiDetailSheet } from "../components/PoiDetailSheet.js";
import { renderLegalModals } from "../components/LegalModals.js";
import { renderAiConciergeDrawer } from "../components/AiConciergeDrawer.js";
import { renderAiSettingsModal } from "../components/AiSettingsModal.js";
import { renderProfilePhotoEditorModal } from "../components/ProfilePhotoEditorModal.js";
import { renderIcon } from "../utils/icons.js";

export function renderGuestDraftBanner() {
  if (state.isAuthenticated) return "";
  const trip = state.activeTrip;
  if (!trip || !trip.id || trip.id === "guest") return "";

  return `
    <div class="guest-draft-banner voice-mono" role="region" aria-label="Guest Draft Warning">
      <div class="guest-draft-banner__content">
        <span class="guest-draft-banner__icon">⚠️</span>
        <span class="guest-draft-banner__text">
          <strong>Guest Draft (${escapeHtml(trip.destination)})</strong>: Create a free account to save your trip, otherwise it will disappear when you close this browser.
        </span>
      </div>
      <button class="btn btn--primary btn--xs guest-draft-banner__btn" data-action="open-auth-panel" data-auth-mode="signup" type="button">
        🔑 Create Account to Save
      </button>
    </div>
  `;
}

export function renderAppShell(view = state.activeView, { isRouteChange = false } = {}) {
  const isLanding = view === "landing";

  return `
    <div class="app-view app-view--${escapeHtml(view)} ${isRouteChange ? "app-view--route-enter" : ""}">
      ${isLanding ? "" : renderGuestDraftBanner()}
      ${renderActiveView(view)}
      ${(isLanding || !state.canShowConciergeAndAssistant) ? "" : renderBottomNav()}
      ${(isLanding || !state.canShowConciergeAndAssistant) ? "" : renderQuickCaptureWidget()}
      ${renderLightbox()}
      ${renderEventDrawer()}
      ${renderTripCreateModal()}
      ${renderInviteAcceptance()}
      ${renderOnboardingWalkthrough()}
      ${renderHelpCenter()}
      ${renderAuthExitPage()}
      ${renderPremiumSupportSheet()}
      ${renderPoiDetailSheet()}
      ${renderLegalModals()}
      ${renderProfilePhotoEditorModal(state)}
      ${renderAiSettingsModal(state)}
      ${!state.canShowConciergeAndAssistant ? "" : renderAiConciergeDrawer()}
      ${isLanding ? "" : renderTemplateMomentPicker(state.activeTrip)}
    </div>
  `;
}

export function renderActiveView(view = state.activeView) {
  if (view === "landing") return renderLandingView();
  if (view === "home") return renderHomeView();
  if (view === "plan") return renderPlanView();
  if (view === "search") return renderSearchView();
  if (view === "live") return renderLiveView();
  if (view === "profile") return renderProfileView();
  return renderHomeView();
}

function renderInviteAcceptance() {
  const invite = state.activeInvite;
  if (!invite || invite.status === "accepted") return "";

  const trip = state.activeTrip;
  const title = trip.title || trip.name || (trip.destination ? `Roadtrip ${trip.destination}` : "This trip");
  const coverImage = trip.coverImage || trip.image || trip.upcomingActivity?.image || "";
  const travelersCount = Math.max(1, (trip.companions || []).length + 1);
  const isKnownUser = ["admin", "traveler"].includes(state.userSession?.role);
  const isAccountMode = invite.mode === "account";

  return `
    <section class="trip-invite-acceptance" aria-label="Trip invitation">
      ${coverImage ? `<img src="${escapeHtml(coverImage)}" alt="" loading="lazy" />` : ""}
      <div class="trip-invite-acceptance__copy">
        <span>Trip invitation</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(trip.destination || "Destination")} · ${escapeHtml(trip.dates || "Dates TBD")} · ${travelersCount} travelers</small>
      </div>
      ${isAccountMode ? `
        <form class="trip-invite-account-form" id="trip-invite-account-form">
          <input name="name" type="text" value="${escapeHtml(state.userProfile?.name || "")}" autocomplete="name" placeholder="Your name" required />
          <input name="email" type="email" value="${escapeHtml(state.userProfile?.email || "")}" autocomplete="email" placeholder="you@example.com" required />
          <input name="password" type="password" autocomplete="new-password" placeholder="Create password" minlength="8" required />
          <button class="btn btn--primary btn--sm" type="submit">Create Account</button>
          <button class="btn btn--ghost btn--sm" data-action="show-invite-options" type="button">Back</button>
          <p class="auth-legal-notice" style="font-size: 0.72rem; color: var(--ink-muted); text-align: center; margin: 6px 0 0 0; width: 100%;">
            By continuing, you agree to our <a href="#" data-action="open-terms" style="color: var(--orange); text-decoration: underline;">Terms of Use</a> and <a href="#" data-action="open-privacy" style="color: var(--orange); text-decoration: underline;">Privacy Policy</a>.
          </p>
        </form>
      ` : `
        <div class="trip-invite-acceptance__actions">
          <button class="btn btn--primary btn--sm" data-action="accept-trip-invite" data-invite-mode="${isKnownUser ? "user" : "guest"}" type="button">
            ${isKnownUser ? "Join instantly" : "Continue as Guest"}
          </button>
          ${!isKnownUser ? `<button class="btn btn--outline btn--sm" data-action="create-account-from-invite" type="button">Create Account</button>` : ""}
          <button class="btn btn--icon btn--ghost" data-action="dismiss-trip-invite" type="button" aria-label="Dismiss invitation">×</button>
        </div>
      `}
    </section>
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
