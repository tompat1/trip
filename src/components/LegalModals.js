import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_LOGO_SVG } from "./BrandAssets.js";

export function renderLegalModals() {
  const termsHtml = state.termsOpen ? renderTermsSheet() : "";
  const privacyHtml = state.privacyOpen ? renderPrivacySheet() : "";
  return `${termsHtml}${privacyHtml}`;
}

function renderTermsSheet() {
  return `
    <div class="drawer-overlay" data-action="close-terms" style="z-index: 100100;">
      <div class="drawer-sheet" style="max-height: 88vh; overflow-y: auto; max-width: 560px; margin: 0 auto;">
        <div class="drawer-drag-handle" data-action="close-terms"></div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${TRIP_LOGO_SVG("", 36)}
            <div>
              <span class="voice-mono" style="font-size: 0.72rem; font-weight: 700; color: var(--orange); text-transform: uppercase;">Legal Terms</span>
              <h2 class="voice-serif" style="font-size: 1.35rem; font-weight: 700; color: var(--ink); margin: 0;">Terms of Use</h2>
            </div>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-terms" aria-label="Close Terms">
            ${renderIcon("x")}
          </button>
        </div>

        <div style="font-size: 0.88rem; line-height: 1.6; color: var(--ink); display: flex; flex-direction: column; gap: 14px;">
          <p style="font-style: italic; color: var(--ink-muted); margin: 0;">Last updated: July 30, 2026 • trip.rynell.org</p>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">1. Acceptance of Terms</h4>
            <p style="margin: 0;">By accessing, registering an account, or using the TRIP application at trip.rynell.org ("Service"), you agree to be bound by these Terms of Use. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">2. Description of Service</h4>
            <p style="margin: 0;">TRIP is a responsive web application and memory archiving tool designed for trip planning, POI discovery, companion invitations, and travel journal management. Features may be updated, modified, or enhanced periodically.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">3. User Accounts & Companion Access</h4>
            <p style="margin: 0;">You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account. When inviting companions to a trip, you confirm that you have the right to share trip details with those individuals.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">4. User Content & Uploaded Media</h4>
            <p style="margin: 0;">You retain ownership of any photos, videos, notes, or travel moments you capture or upload to TRIP. By uploading media, you grant TRIP a non-exclusive license to host, display, and process your content solely to deliver the Service to you and your authorized trip companions.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">5. Acceptable Use & Conduct</h4>
            <p style="margin: 0;">You agree not to use TRIP for illegal activities, transmit malicious code, attempt unauthorized access to Cloudflare Workers or D1 databases, or upload content that infringes upon third-party intellectual property or privacy rights.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">6. Third-Party Data & Disclaimer</h4>
            <p style="margin: 0;">TRIP aggregates POIs, weather, transit information, and live signals from third-party APIs (OpenTripMap, Foursquare, OpenStreetMap, Open-Meteo). TRIP makes no guarantees regarding the completeness, accuracy, or availability of external third-party data.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">7. Contact & Support</h4>
            <p style="margin: 0;">For questions regarding these Terms, contact us at <a href="mailto:thomas@rynell.org" style="color: var(--orange); text-decoration: underline;">thomas@rynell.org</a>.</p>
          </section>
        </div>

        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--line-light); text-align: center;">
          <button class="btn btn--primary" data-action="close-terms" style="width: 100%; justify-content: center;">
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPrivacySheet() {
  return `
    <div class="drawer-overlay" data-action="close-privacy" style="z-index: 100100;">
      <div class="drawer-sheet" style="max-height: 88vh; overflow-y: auto; max-width: 560px; margin: 0 auto;">
        <div class="drawer-drag-handle" data-action="close-privacy"></div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${TRIP_LOGO_SVG("", 36)}
            <div>
              <span class="voice-mono" style="font-size: 0.72rem; font-weight: 700; color: var(--orange); text-transform: uppercase;">Privacy Protection</span>
              <h2 class="voice-serif" style="font-size: 1.35rem; font-weight: 700; color: var(--ink); margin: 0;">Privacy Policy</h2>
            </div>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-privacy" aria-label="Close Privacy Policy">
            ${renderIcon("x")}
          </button>
        </div>

        <div style="font-size: 0.88rem; line-height: 1.6; color: var(--ink); display: flex; flex-direction: column; gap: 14px;">
          <p style="font-style: italic; color: var(--ink-muted); margin: 0;">Effective date: July 30, 2026 • trip.rynell.org</p>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">1. Information We Collect</h4>
            <p style="margin: 0;">We collect information you provide directly (name, email address, travel preferences, and uploaded travel moments). When using location-based features, temporary coordinates are used to fetch nearby POIs and local weather.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">2. How We Use Your Data</h4>
            <p style="margin: 0;">Your data is used exclusively to deliver TRIP features: synchronizing itineraries, ranking POIs by your traveler personas, facilitating companion invites, and rendering personal memory journals.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">3. Zero Data Sale Policy</h4>
            <p style="margin: 0;"><strong>TRIP does NOT sell, rent, or trade your personal data or location history to third-party advertisers or brokers under any circumstances.</strong></p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">4. Data Storage & Security</h4>
            <p style="margin: 0;">Trip preferences and offline state are saved locally on your device via browser LocalStorage. Cloud-synced data is protected using Cloudflare D1/KV infrastructure with encrypted TLS in transit.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">5. Cookies & Local Storage</h4>
            <p style="margin: 0;">TRIP uses functional local storage tokens solely to maintain your authentication session and dark/light theme preference. We do not use third-party tracking pixels.</p>
          </section>

          <section>
            <h4 style="font-size: 0.98rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ink);">6. Your Rights & Data Export</h4>
            <p style="margin: 0;">You have the right to request access to, export, or complete deletion of your TRIP account and data. Requests can be submitted directly to <a href="mailto:thomas@rynell.org" style="color: var(--orange); text-decoration: underline;">thomas@rynell.org</a>.</p>
          </section>
        </div>

        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--line-light); text-align: center;">
          <button class="btn btn--primary" data-action="close-privacy" style="width: 100%; justify-content: center;">
            Close Privacy Policy
          </button>
        </div>
      </div>
    </div>
  `;
}
