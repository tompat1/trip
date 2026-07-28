import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";

const PREMIUM_FEATURES = [
  ["compass", "Deeper live signals"],
  ["users", "Companion planning"],
  ["sparkles", "Early TRIP features"],
];

export function renderPremiumSupportSheet() {
  if (!state.premiumOpen) return "";

  return `
    <div class="trip-premium-overlay" role="dialog" aria-modal="true" aria-labelledby="trip-premium-title">
      <section class="trip-premium-sheet">
        <button class="btn btn--icon btn--ghost trip-premium-close" data-action="close-premium" type="button" aria-label="Close premium">
          ${renderIcon("x")}
        </button>

        <div class="trip-premium-hero">
          <div class="trip-premium-brand">
            ${TRIP_LOGO_SVG("", 42)}
            <span class="voice-mono">Premium</span>
          </div>
          <h2 id="trip-premium-title">Support TRIP and travel with fewer limits.</h2>
          <div class="trip-premium-route" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>

        <div class="trip-premium-copy">
          <p>Recharge the app so we can keep improving live trip planning, companion invites and local discovery.</p>
          <div class="trip-premium-benefits">
            ${PREMIUM_FEATURES.map(([icon, label]) => `
              <div>
                ${renderIcon(icon)}
                <span>${label}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="trip-premium-plans" aria-label="Premium plans">
          <button class="trip-premium-plan" data-action="choose-premium-plan" data-plan="monthly" type="button">
            <span>Monthly</span>
            <strong>29 SEK</strong>
            <small>Support month to month</small>
          </button>
          <button class="trip-premium-plan trip-premium-plan--featured" data-action="choose-premium-plan" data-plan="annual" type="button">
            <span>Annual</span>
            <strong>249 SEK</strong>
            <small>Best for regular trips</small>
          </button>
        </div>

        <p class="trip-premium-note">Payment wiring is not enabled yet. Choosing a plan saves your interest locally for now.</p>
      </section>
    </div>
  `;
}
