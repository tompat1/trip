import { state } from "../state.js";

export function renderBottomNav() {
  const view = state.activeView;

  return `
    <nav class="bottom-dock-nav" aria-label="Main Navigation">
      <div class="bottom-dock-nav__container">
        <button class="dock-nav-item ${view === 'home' ? 'is-active' : ''}" data-nav="home">
          <svg class="dock-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span class="dock-label">Home</span>
        </button>

        <button class="dock-nav-item ${view === 'live' ? 'is-active' : ''} ${!state.tripMode ? 'is-disabled' : ''}" data-nav="live" title="${state.tripMode ? 'Live Journey Mode' : 'Live Journey (Requires Trip Mode ON)'}">
          <svg class="dock-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.83a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
          </svg>
          <span class="dock-label">Live</span>
          ${!state.tripMode ? '<span class="dock-disabled-dot"></span>' : ''}
        </button>

        <button class="dock-nav-item dock-nav-item--fab ${view === 'search' ? 'is-active' : ''}" data-nav="search" aria-label="Search">
          <div class="fab-circle">
            <svg class="fab-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span class="fab-text">Search</span>
          </div>
        </button>

        <button class="dock-nav-item ${view === 'plan' ? 'is-active' : ''}" data-nav="plan">
          <svg class="dock-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span class="dock-label">Trips</span>
        </button>

        <button class="dock-nav-item ${view === 'profile' ? 'is-active' : ''}" data-nav="profile">
          <svg class="dock-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span class="dock-label">Profile</span>
        </button>
      </div>
    </nav>
  `;
}
