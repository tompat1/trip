import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_STAMP_SVG } from "../components/BrandAssets.js";

export function renderLandingView() {
  return `
    <div class="landing-page">
      ${renderHeader()}

      <section class="hero-card" style="position: relative;">
        <div class="hero-card__bg" style="background-image: url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85');"></div>
        <div class="hero-card__overlay"></div>
        <div class="hero-card__content">
          <div style="display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 12px;">
            <!-- Brand Stamp Emblem -->
            ${TRIP_STAMP_SVG("", 68)}
          </div>

          <h1 class="hero-title voice-serif" style="font-size: 2.2rem; font-weight: 700; line-height: 1.15; color: #fff; margin-bottom: 8px;">Every place becomes a story.</h1>
          <p class="hero-subtitle" style="font-size: 0.95rem; opacity: 0.9; margin-bottom: 20px; max-width: 90%;">Plan your trips. Discover what matters. Capture every moment. Keep it all together.</p>

          <div class="hero-actions">
            <button class="btn btn--primary btn--lg" data-action="go-app">
              ${renderIcon("compass")} Create your trip
            </button>
            <button class="btn btn--outline btn--lg" data-action="go-search" style="background: rgba(255,255,255,0.92); border: none; color: var(--ink);">
              ${renderIcon("search")} Explore ideas
            </button>
          </div>
        </div>
      </section>

      <section class="landing-features" style="display: flex; flex-direction: column; gap: 12px; margin: 20px 0;">
        <div class="feature-card" data-action="go-plan" style="display: flex; align-items: center; justify-content: space-between; background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 16px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(56, 92, 115, 0.12); color: var(--blue); display: flex; align-items: center; justify-content: center;">
              ${renderIcon("compass")}
            </div>
            <div>
              <h3 style="font-size: 1rem; font-weight: 700; color: var(--ink); margin: 0;">Before you go</h3>
              <p style="font-size: 0.82rem; color: var(--ink-muted); margin: 2px 0 0 0;">Plan with intelligent guides, maps, events and local tips.</p>
            </div>
          </div>
          <span style="color: var(--ink-muted);">${renderIcon("chevronRight")}</span>
        </div>

        <div class="feature-card" data-action="go-live" style="display: flex; align-items: center; justify-content: space-between; background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 16px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(101, 112, 91, 0.12); color: var(--green); display: flex; align-items: center; justify-content: center;">
              ${renderIcon("mapPin")}
            </div>
            <div>
              <h3 style="font-size: 1rem; font-weight: 700; color: var(--ink); margin: 0;">While you're there</h3>
              <p style="font-size: 0.82rem; color: var(--ink-muted); margin: 2px 0 0 0;">Navigate, capture and get real-time recommendations.</p>
            </div>
          </div>
          <span style="color: var(--ink-muted);">${renderIcon("chevronRight")}</span>
        </div>

        <div class="feature-card" data-action="go-moments" style="display: flex; align-items: center; justify-content: space-between; background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 16px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(156, 110, 85, 0.12); color: var(--clay); display: flex; align-items: center; justify-content: center;">
              ${renderIcon("camera")}
            </div>
            <div>
              <h3 style="font-size: 1rem; font-weight: 700; color: var(--ink); margin: 0;">After the journey</h3>
              <p style="font-size: 0.82rem; color: var(--ink-muted); margin: 2px 0 0 0;">Turn your memories into stories, films and keepsakes.</p>
            </div>
          </div>
          <span style="color: var(--ink-muted);">${renderIcon("chevronRight")}</span>
        </div>
      </section>

      <footer class="landing-footer" style="padding: 20px; text-align: center; background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg);">
        <div class="landing-footer__content" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <span class="voice-mono" style="font-size: 0.72rem; font-weight: 700; letter-spacing: 1px; color: var(--orange); text-transform: uppercase;">PLAN IT. LIVE IT. REMEMBER IT.</span>
          <span style="font-size: 0.82rem; color: var(--ink-muted);">Made for curious travelers • trip.rynell.org</span>
        </div>
      </footer>
    </div>
  `;
}
