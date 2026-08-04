import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_STAMP_SVG, TRIP_LOGO_SVG } from "../components/BrandAssets.js";
import { state } from "../state.js";
import { PERSONA_SEARCH_SIGNALS } from "../utils/personaSignals.js";

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderLandingView() {
  const activeTrip = state.activeTrip || { destination: "Paris, France", dates: "3 – 9 Oct 2026", flag: "🇫🇷" };
  const personas = Object.entries(PERSONA_SEARCH_SIGNALS).slice(0, 6);
  const isSignedIn = ["admin", "traveler"].includes(state.userSession?.role);

  return `
    <div class="landing-page-desktop-site">
      <!-- Header -->
      ${renderHeader()}

      <!-- HERO SECTION -->
      <section class="desktop-landing-hero">
        <div class="hero-container">
          <div class="hero-copy">
            <h1 class="hero-heading voice-serif">
              Every place becomes an <span class="highlight-text">unforgettable story</span>.
            </h1>
            
            <p class="hero-description">
              The intelligent, mobile-first travel planner and memory app. Discover persona-ranked Top POIs, specialty coffee & dining, live transit guides, and preserve your journey in visual journals.
            </p>

            <div class="hero-cta-group">
              ${isSignedIn ? `
                <button class="btn btn--primary btn--lg hero-btn-main" data-action="go-app">
                  <span>Open TRIP App</span>
                  ${renderIcon("arrowRight")}
                </button>
              ` : `
                <button class="btn btn--primary btn--lg hero-btn-main" data-action="start-guest-draft">
                  <span>Get Started — Free</span>
                  ${renderIcon("arrowRight")}
                </button>
                <button class="btn btn--outline btn--lg hero-btn-secondary" data-action="open-auth-panel" data-auth-mode="login">
                  <span>Sign In</span>
                </button>
              `}
            </div>

            <div class="hero-qr-strip">
              <div class="qr-box">
                <svg viewBox="0 0 100 100" width="48" height="48" fill="var(--ink)">
                  <path d="M0,0 h35 v35 h-35 z M10,10 v15 h15 v-15 z M65,0 h35 v35 h-35 z M75,10 v15 h15 v-15 z M0,65 h35 v35 h-35 z M10,75 v15 h15 v-15 z M45,10 h10 v10 h-10 z M45,45 h10 v10 h-10 z M65,65 h10 v10 h-10 z M85,65 h15 v10 h-15 z M75,85 h10 v15 h-10 z M45,75 h10 v25 h-10 z" />
                </svg>
              </div>
              <div class="qr-copy">
                <strong>Scan on Mobile</strong>
                <small>Open trip.rynell.org on iOS or Android for the native PWA shell</small>
              </div>
            </div>
          </div>

          <!-- FLOATING PHONE DEVICE FRAME MOCKUP -->
          <div class="hero-phone-mockup-wrapper">
            <div class="phone-device-shell">
              <div class="phone-notch">
                <span class="camera-lens"></span>
                <span class="speaker-grille"></span>
              </div>
              <div class="phone-screen-content">
                <!-- Embedded Map View Preview -->
                <div class="mini-app-header">
                  <div class="mini-destination">
                    <span class="mini-flag">${activeTrip.flag || '🇫🇷'}</span>
                    <div>
                      <strong>${escapeHtml(activeTrip.destination || 'Paris, France')}</strong>
                      <small>${escapeHtml(activeTrip.dates || '3 – 9 Oct 2026')}</small>
                    </div>
                  </div>
                  <span class="mini-live-pill">${renderIcon("navigation")} MAP</span>
                </div>

                <div class="mini-map-viewport">
                  <!-- Styled Map Tile Canvas -->
                  <div class="mini-map-canvas">
                    <!-- SVG Route Polyline -->
                    <svg class="mini-map-routes" viewBox="0 0 300 380" fill="none">
                      <path d="M 60,310 Q 110,240 145,175 T 220,110" stroke="var(--orange)" stroke-width="3.5" stroke-dasharray="6,4" stroke-linecap="round" />
                      <path d="M 145,175 Q 180,210 240,240" stroke="var(--blue)" stroke-width="2.5" stroke-dasharray="4,4" opacity="0.75" />
                    </svg>

                    <!-- User Current Location Radar -->
                    <div class="mini-map-user-pin" style="top: 300px; left: 55px;" title="Your location">
                      <span class="user-pulse-ring"></span>
                      <span class="user-dot"></span>
                      <span class="user-label">You</span>
                    </div>

                    <!-- POI Map Pins -->
                    <div class="mini-map-poi-pin is-primary" style="top: 100px; left: 210px;" title="Louvre Museum">
                      <div class="poi-pin-bubble">
                        <span>🏛️ Louvre</span>
                        <small>★ 4.9</small>
                      </div>
                      <div class="poi-pin-stem"></div>
                    </div>

                    <div class="mini-map-poi-pin" style="top: 165px; left: 135px;" title="Télescope Coffee">
                      <div class="poi-pin-bubble orange">
                        <span>☕ Télescope</span>
                        <small>340m</small>
                      </div>
                      <div class="poi-pin-stem"></div>
                    </div>

                    <div class="mini-map-poi-pin" style="top: 230px; left: 230px;" title="Le Baron Rouge">
                      <div class="poi-pin-bubble clay">
                        <span>🍷 Le Baron</span>
                        <small>1.4km</small>
                      </div>
                      <div class="poi-pin-stem"></div>
                    </div>

                    <div class="mini-map-poi-pin" style="top: 80px; left: 80px;" title="Sainte-Chapelle">
                      <div class="poi-pin-bubble blue">
                        <span>🏛️ Chapelle</span>
                        <small>850m</small>
                      </div>
                      <div class="poi-pin-stem"></div>
                    </div>
                  </div>

                  <!-- Floating POI Detail Drawer Card -->
                  <div class="mini-map-floating-card">
                    <div class="mini-card-thumb" style="background-image: url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80');"></div>
                    <div class="mini-card-details">
                      <div class="mini-card-head">
                        <strong>Louvre Museum & Tuileries</strong>
                        <span class="mini-card-badge">Architect</span>
                      </div>
                      <p>★ 4.9 • 1.2 km away • Open until 18:00</p>
                      <div class="mini-card-actions">
                        <span class="mini-btn mini-btn--primary">${renderIcon("navigation")} Directions</span>
                        <span class="mini-btn mini-btn--ghost">${renderIcon("bookmark")} Save</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mini-dock-nav">
                  <span class="dock-item is-active">${renderIcon("compass")}</span>
                  <span class="dock-item">${renderIcon("navigation")}</span>
                  <span class="dock-fab">${renderIcon("search")}</span>
                  <span class="dock-item">${renderIcon("camera")}</span>
                  <span class="dock-item">${renderIcon("user")}</span>
                </div>
              </div>
            </div>
            <!-- Glass Reflection Effect -->
            <div class="phone-shadow"></div>
          </div>
        </div>
      </section>

      <!-- THREE-PILLAR JOURNEY SHOWCASE -->
      <section class="journey-pillars-section">
        <div class="section-container">
          <div class="section-intro">
            <span class="voice-mono section-kicker">THREE-PHASE TRAVEL ARCHITECTURE</span>
            <h2 class="voice-serif section-title">Designed for every stage of your trip.</h2>
            <p class="section-subtitle">TRIP bridges pre-trip planning, live destination navigation, and post-trip memory archiving into one fluid experience.</p>
          </div>

          <div class="pillars-grid">
            <!-- Pillar 1 -->
            <div class="pillar-card">
              <div class="pillar-icon-box blue">
                ${renderIcon("compass")}
              </div>
              <span class="pillar-step voice-mono">01 — BEFORE YOU GO</span>
              <h3>Intelligent Planning</h3>
              <p>Discover Top 10 POIs powered by OpenTripMap & Foursquare. Check terrain elevation, coastal marine forecasts, flight routes, and invite companions.</p>
              <ul class="pillar-list">
                <li>${renderIcon("check")} Persona-ranked attractions & monuments</li>
                <li>${renderIcon("check")} Live weather, elevation & terrain intelligence</li>
                <li>${renderIcon("check")} Shared trip access & companion roles</li>
              </ul>
            </div>

            <!-- Pillar 2 -->
            <div class="pillar-card">
              <div class="pillar-icon-box green">
                ${renderIcon("mapPin")}
              </div>
              <span class="pillar-step voice-mono">02 — WHILE YOU'RE THERE</span>
              <h3>Live Destination Mode</h3>
              <p>Navigate with touch-friendly mobile layouts, thumb-accessible dock, real-time map, Quick Capture photo/video moments, and transit guides.</p>
              <ul class="pillar-list">
                <li>${renderIcon("check")} Specialty coffee & local dining lookups</li>
                <li>${renderIcon("check")} Quick Capture photos, videos & notes</li>
                <li>${renderIcon("check")} OpenStreetMap access & opening hours</li>
              </ul>
            </div>

            <!-- Pillar 3 -->
            <div class="pillar-card">
              <div class="pillar-icon-box red">
                ${renderIcon("camera")}
              </div>
              <span class="pillar-step voice-mono">03 — AFTER THE JOURNEY</span>
              <h3>Memory Journaling</h3>
              <p>Turn your moments into visual photo essays, memory timelines, and shareable web links for friends and family.</p>
              <ul class="pillar-list">
                <li>${renderIcon("check")} Automatic photo essay & memory templates</li>
                <li>${renderIcon("check")} Shareable web links & invitation flows</li>
                <li>${renderIcon("check")} Portable D1 cloud sync across devices</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- PERSONA ENGINE SHOWCASE -->
      <section class="persona-showcase-section">
        <div class="section-container">
          <div class="persona-header">
            <div>
              <span class="voice-mono section-kicker">ADAPTIVE PERSONALIZATION</span>
              <h2 class="voice-serif section-title">Tailored for how you travel.</h2>
              <p class="section-subtitle">TRIP dynamically ranks attractions, coffee shops, and recommendations based on your selected traveler personas.</p>
            </div>
            ${TRIP_STAMP_SVG("", 72)}
          </div>

          <div class="persona-chips-showcase">
            ${personas.map(([key, data]) => {
              const personaLabel = data?.label || key.replace(/^[\p{Emoji}\s]+/u, "");
              const iconKey = personaLabel.includes("Architect") ? "buildings"
                : personaLabel.includes("Route") ? "compass"
                : personaLabel.includes("Coffee") ? "coffee"
                : personaLabel.includes("Food") ? "forkKnife"
                : personaLabel.includes("Wine") ? "wine"
                : personaLabel.includes("Memory") ? "camera"
                : "sparkles";

              return `
                <div class="persona-showcase-chip">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span class="persona-icon-badge" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: rgba(56, 92, 115, 0.08); color: var(--atlas-blue, #385C73); font-size: 1.15rem; flex-shrink: 0;">
                      ${renderIcon(iconKey)}
                    </span>
                    <span class="persona-chip-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">${escapeHtml(personaLabel)}</span>
                  </div>
                  <p class="persona-chip-desc">Prioritizes ${(data?.keywords || []).slice(0, 3).join(", ")} and curated ${escapeHtml(personaLabel.toLowerCase())} spots.</p>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </section>

      <!-- BRAND MANIFESTO SECTION -->
      <section class="landing-brand-manifesto-section">
        <div class="manifesto-container">
          <div class="manifesto-logo-wrapper">
            ${TRIP_LOGO_SVG("manifesto-big-logo", 76)}
          </div>
          <div class="manifesto-card-banner">
            <span class="manifesto-kicker voice-mono">PLAN IT. LIVE IT. REMEMBER IT.</span>
            <p class="manifesto-subcopy">Made for curious travelers ▪ trip.rynell.org</p>
          </div>
        </div>
      </section>

      <!-- CTA BANNER -->
      <section class="landing-cta-banner">
        <div class="cta-container">
          <h2 class="voice-serif">Ready to start your next trip?</h2>
          <p>Launch the TRIP web app now on desktop or mobile. Zero app store installation required.</p>
          <div class="cta-actions">
            ${isSignedIn ? `
              <button class="btn btn--primary btn--lg" data-action="go-app">
                <span>Open TRIP App</span>
                ${renderIcon("arrowRight")}
              </button>
            ` : `
              <button class="btn btn--primary btn--lg" data-action="start-guest-draft">
                <span>Get Started — Free</span>
                ${renderIcon("arrowRight")}
              </button>
              <button class="btn btn--outline btn--lg" data-action="open-auth-panel" data-auth-mode="login">
                <span>Sign In</span>
              </button>
            `}
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="desktop-landing-footer">
        <div class="footer-container">
          <div class="footer-brand">
            ${TRIP_LOGO_SVG("", 42)}
            <p>Plan it. Live it. Remember it. A responsive travel planner and memory app for curious travelers.</p>
          </div>

          <div class="footer-links">
            <div class="link-group">
              <strong>Product</strong>
              <a href="#" data-action="go-app">Overview</a>
              <a href="#" data-action="go-plan">Planning</a>
              <a href="#" data-action="go-search">Explore POIs</a>
            </div>

            <div class="link-group">
              <strong>Legal & Support</strong>
              <a href="#" data-action="open-terms">Terms of Use</a>
              <a href="#" data-action="open-privacy">Privacy Policy</a>
              <a href="#" data-action="open-help">Help Center</a>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© 2026 TRIP • trip.rynell.org</span>
          <span class="voice-mono">Powered by Cloudflare Pages & Workers</span>
        </div>
      </footer>
    </div>
  `;
}
