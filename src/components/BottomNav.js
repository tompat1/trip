import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { getTripDateStatus } from "../utils/tripDates.js";

export function renderBottomNav() {
  if (!state.canShowConciergeAndAssistant) return "";

  const view = state.activeView;
  const isJournalActive = view === "plan" && state.planSubTab === "journal";
  const isTripsActive = view === "plan" && !isJournalActive;
  const canUseLiveMode = getTripDateStatus(state.activeTrip).state === "active";

  return `
    <nav class="bottom-dock-nav" aria-label="Main Navigation">
      <div class="bottom-dock-nav__container">
        <button class="dock-nav-item ${view === 'home' ? 'is-active' : ''}" data-nav="home">
          ${renderIcon("home", "dock-icon")}
          <span class="dock-label">Home</span>
        </button>

        <button class="dock-nav-item ${view === 'live' ? 'is-active' : ''} ${!canUseLiveMode ? 'is-disabled' : ''}" data-nav="live" title="${canUseLiveMode ? 'Live mode' : 'Live mode opens during trip dates'}">
          ${renderIcon("radio", "dock-icon")}
          <span class="dock-label">Live</span>
          ${!canUseLiveMode ? '<span class="dock-disabled-dot"></span>' : ''}
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
