import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";
import premiumJourneyUrl from "../assets/trip_premium_journey.webp";

const PREMIUM_FEATURES = [
  ["badgeX", "No ads"],
  ["infinity", "No limits"],
  ["star", "New features"],
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
          <div class="trip-premium-logo-lockup">
            ${TRIP_LOGO_SVG("", 116)}
            <span>Travel Planner Deluxe</span>
          </div>
          <span class="trip-premium-pill">Premium</span>
          <h2 id="trip-premium-title">Support the app and go on a journey with us</h2>
          <p>Recharge TRIP batteries, so we can grow for your benefit!</p>
        </div>

        <div class="trip-premium-journey">
          <img src="${premiumJourneyUrl}" alt="Illustrated TRIP journey with mountains, winding road and orange camper van" loading="lazy" />
        </div>

        <div class="trip-premium-copy">
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
            <span>For a month</span>
            <strong>29 SEK</strong>
            <small>Support month to month</small>
          </button>
          <button class="trip-premium-plan trip-premium-plan--featured" data-action="choose-premium-plan" data-plan="annual" type="button">
            <em>Best value</em>
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
