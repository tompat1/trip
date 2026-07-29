import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

export function renderBottomNav() {
  const view = state.activeView;
  const isJournalActive = view === "plan" && state.planSubTab === "journal";
  const isTripsActive = view === "plan" && !isJournalActive;

  return `
    <nav class="bottom-dock-nav" aria-label="Main Navigation">
      <div class="bottom-dock-nav__container">
        <button class="dock-nav-item ${view === 'home' ? 'is-active' : ''}" data-nav="home">
          ${renderIcon("home", "dock-icon")}
          <span class="dock-label">Home</span>
        </button>

        <button class="dock-nav-item ${view === 'live' ? 'is-active' : ''} ${!state.tripMode ? 'is-disabled' : ''}" data-nav="live" title="${state.tripMode ? 'Live Journey Mode' : 'Live Journey (Requires Trip Mode ON)'}">
          ${renderIcon("radio", "dock-icon")}
          <span class="dock-label">Live</span>
          ${!state.tripMode ? '<span class="dock-disabled-dot"></span>' : ''}
        </button>

        <button class="dock-nav-item dock-nav-item--fab ${view === 'search' ? 'is-active' : ''}" data-nav="search" aria-label="Search">
          <div class="fab-circle">
            ${renderIcon("search", "fab-icon")}
            <span class="fab-text">Search</span>
          </div>
        </button>

        <button class="dock-nav-item ${isTripsActive ? 'is-active' : ''}" data-nav="plan">
          ${renderIcon("calendar", "dock-icon")}
          <span class="dock-label">Trips</span>
        </button>

        <button class="dock-nav-item ${isJournalActive ? 'is-active' : ''}" data-nav="journal">
          ${renderIcon("bookOpen", "dock-icon")}
          <span class="dock-label">Journal</span>
        </button>
      </div>
    </nav>
  `;
}
