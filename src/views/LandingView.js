import { renderHeader } from "../components/Header.js";

export function renderLandingView() {
  return `
    <div class="landing-page">
      ${renderHeader()}

      <section class="hero-card">
        <div class="hero-card__bg" style="background-image: url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85');"></div>
        <div class="hero-card__overlay"></div>
        <div class="hero-card__content">
          <h1 class="hero-title">Every place becomes a story.</h1>
          <p class="hero-subtitle">Plan your trips. Discover what matters. Capture every moment. Keep it all together.</p>
          <div class="hero-actions">
            <button class="btn btn--primary btn--lg" data-action="go-app">Create your first trip</button>
            <button class="btn btn--outline-light btn--lg" data-action="go-search">Explore the ideas</button>
          </div>
        </div>
      </section>

      <section class="landing-features">
        <div class="feature-card" data-action="go-plan">
          <div class="feature-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#385C73" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          </div>
          <div class="feature-card__body">
            <h3 class="feature-card__title">Before you go</h3>
            <p class="feature-card__desc">Plan with intelligent guides, maps, events and local tips.</p>
          </div>
          <div class="feature-card__arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>

        <div class="feature-card" data-action="go-live">
          <div class="feature-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#65705B" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="feature-card__body">
            <h3 class="feature-card__title">While you're there</h3>
            <p class="feature-card__desc">Navigate, capture and get real-time recommendations.</p>
          </div>
          <div class="feature-card__arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>

        <div class="feature-card" data-action="go-moments">
          <div class="feature-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9C6E55" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <div class="feature-card__body">
            <h3 class="feature-card__title">After the journey</h3>
            <p class="feature-card__desc">Turn your memories into stories, films and keepsakes.</p>
          </div>
          <div class="feature-card__arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      </section>

      <footer class="landing-footer">
        <div class="landing-footer__content">
          <span class="heart-icon">❤️</span>
          <span>Made for curious travelers, by travelers.</span>
          <button class="footer-link-btn" data-action="show-about">Learn more &rsaquo;</button>
        </div>
      </footer>
    </div>
  `;
}
