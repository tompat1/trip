import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";

const WALKTHROUGH_SLIDES = [
  {
    eyebrow: "Start",
    title: "Create the trip once, then let every tool orbit it.",
    body: "Pick your destination, dates, airports and starter checklist. TRIP keeps flights, stays, food ideas and the route map tied to the selected trip.",
    icon: "mapPinned",
    actionLabel: "Next",
  },
  {
    eyebrow: "Plan",
    title: "Turn the idea into days you can actually follow.",
    body: "Use the plan board for activities, live events, saved places, route context and flight search. The checklist is just checklist items, not hidden automation.",
    icon: "calendarDays",
    actionLabel: "Next",
  },
  {
    eyebrow: "Travel party",
    title: "Invite companions into the current trip.",
    body: "Share and Invite Companion now use the same lifecycle: name, email, role, personal message, delivery method, invite link, and acceptance status.",
    icon: "usersRound",
    actionLabel: "Invite later",
    secondaryLabel: "Invite companions",
    secondaryAction: "walkthrough-invite-companions",
  },
  {
    eyebrow: "Live and remember",
    title: "Use Live mode while traveling, then keep the memory.",
    body: "Live mode brings nearby places, weather, route context and quick capture into one place. Moments and stories stay attached to the trip after you get home.",
    icon: "sparkles",
    actionLabel: "Start planning",
  },
];

export function renderOnboardingWalkthrough() {
  if (!state.onboardingOpen) return "";

  const index = Math.max(0, Math.min(state.onboardingSlideIndex || 0, WALKTHROUGH_SLIDES.length - 1));
  const slide = WALKTHROUGH_SLIDES[index];
  const isLast = index === WALKTHROUGH_SLIDES.length - 1;

  return `
    <div class="onboarding-overlay">
      <section class="onboarding-shell" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div class="onboarding-visual" aria-hidden="true">
          <div class="onboarding-brand">${TRIP_LOGO_SVG("", 42)}</div>
          <div class="onboarding-orbit onboarding-orbit--one"></div>
          <div class="onboarding-orbit onboarding-orbit--two"></div>
          <div class="onboarding-phone">
            <span class="onboarding-phone__bar"></span>
            <div class="onboarding-phone__hero">
              ${renderIcon(slide.icon)}
            </div>
            <div class="onboarding-phone__rows">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <div class="onboarding-content">
          <button class="btn btn--icon btn--ghost onboarding-close" data-action="skip-onboarding" type="button" aria-label="Skip walkthrough">
            ${renderIcon("x")}
          </button>

          <span class="onboarding-kicker">${escapeHtml(slide.eyebrow)}</span>
          <h2 id="onboarding-title">${escapeHtml(slide.title)}</h2>
          <p>${escapeHtml(slide.body)}</p>

          <div class="onboarding-progress" aria-label="Walkthrough progress">
            ${WALKTHROUGH_SLIDES.map((_, dotIndex) => `
              <button class="${dotIndex === index ? "is-active" : ""}" data-action="go-onboarding-slide" data-slide-index="${dotIndex}" type="button" aria-label="Go to slide ${dotIndex + 1}"></button>
            `).join("")}
          </div>

          <div class="onboarding-actions">
            <button class="btn btn--ghost btn--sm" data-action="previous-onboarding-slide" type="button" ${index === 0 ? "disabled" : ""}>
              ${renderIcon("arrowLeft")} Back
            </button>
            <div>
              ${slide.secondaryAction ? `
                <button class="btn btn--outline btn--sm" data-action="${escapeHtml(slide.secondaryAction)}" type="button">
                  ${renderIcon("userPlus")} ${escapeHtml(slide.secondaryLabel)}
                </button>
              ` : ""}
              <button class="btn btn--primary btn--sm" data-action="${isLast ? "finish-onboarding" : "next-onboarding-slide"}" type="button">
                ${escapeHtml(slide.actionLabel)} ${isLast ? renderIcon("check") : renderIcon("arrowRight")}
              </button>
            </div>
          </div>
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
