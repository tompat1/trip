import { state } from "../state.js";
import { renderHeader } from "../components/Header.js";
import { renderCalendarGrid } from "../components/CalendarGrid.js";

const SUB_TABS = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "plan", label: "Plan", icon: "🗺️" },
  { id: "explore", label: "Explore", icon: "💡" },
  { id: "journal", label: "Journal", icon: "🔖" },
  { id: "story", label: "Story", icon: "🏆" }
];

const VIEW_MODES = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "timeline", label: "Timeline" },
  { id: "map", label: "Map" }
];

const DAYS_HEADER = ["Sat 3 Oct", "Sun 4 Oct", "Mon 5 Oct", "Tue 6 Oct", "Wed 7 Oct", "Thu 8 Oct", "Fri 9 Oct"];

export function renderPlanView() {
  const trip = state.activeTrip;

  return `
    <div class="plan-page">
      <!-- Minimal Trip Header Bar -->
      <header class="plan-header">
        <div class="plan-header__brand">
          <span class="logo-text">T R I P</span>
          <div class="trip-title-meta">
            <h1 class="plan-trip-title">${escapeHtml(trip.destination)}</h1>
            <span class="plan-trip-dates">${escapeHtml(trip.dates)}</span>
          </div>
        </div>
        <div class="plan-header__actions">
          <button class="btn btn--outline btn--sm" data-action="invite-companions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            <span>Invite</span>
          </button>
          <button class="btn btn--primary btn--sm" data-action="add-event">
            <span>+ Add</span>
          </button>
          <div class="user-avatar-sm">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" alt="Thomas" />
          </div>
        </div>
      </header>

      <!-- Primary Sub-Navigation Bar -->
      <nav class="sub-tab-nav">
        ${SUB_TABS.map(
          (tab) => `
            <button class="sub-tab-item ${state.planSubTab === tab.id ? 'is-active' : ''}" data-subtab="${tab.id}">
              <span class="sub-tab-icon">${tab.icon}</span>
              <span class="sub-tab-label">${tab.label}</span>
            </button>
          `
        ).join("")}
      </nav>

      <!-- View Mode Switcher Pills -->
      <div class="view-mode-bar">
        <div class="view-mode-pills-group">
          ${VIEW_MODES.map(
            (mode) => `
              <button class="view-mode-pill ${state.planViewMode === mode.id ? 'is-active' : ''}" data-viewmode="${mode.id}">
                ${mode.label}
              </button>
            `
          ).join("")}
        </div>
      </div>

      <!-- Date Range Controls -->
      <div class="date-controls-bar">
        <button class="btn btn--icon btn--ghost" data-action="prev-week" aria-label="Previous week">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="btn btn--outline btn--sm" data-action="go-today">Today</button>
        <span class="current-date-range">Sat 3 Oct – Fri 9 Oct</span>
        <button class="btn btn--icon btn--ghost" data-action="next-week" aria-label="Next week">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <!-- Day Selector Bar -->
      <div class="day-selector-scroll">
        ${DAYS_HEADER.map(
          (dayStr, index) => `
            <button class="day-select-pill ${state.activeDayIndex === index ? 'is-active' : ''}" data-day-select="${index}">
              <span class="day-select-name">${dayStr.split(" ")[0]}</span>
              <span class="day-select-num">${dayStr.split(" ").slice(1).join(" ")}</span>
              ${index === 0 ? '<span class="day-red-dot"></span>' : ''}
            </button>
          `
        ).join("")}
      </div>

      <!-- Content Area (Calendar Grid or Timeline/Map) -->
      <main class="plan-content-area">
        ${state.planViewMode === "week" ? renderCalendarGrid() : renderAlternativePlanView()}
      </main>
    </div>
  `;
}

function renderAlternativePlanView() {
  const mode = state.planViewMode;
  const trip = state.activeTrip;
  const events = trip.calendarEvents || [];

  if (mode === "day") {
    const activeEvents = events.filter((e) => e.dayIndex === state.activeDayIndex);
    return `
      <div class="day-schedule-list">
        <h3>Schedule for ${DAYS_HEADER[state.activeDayIndex]}</h3>
        ${activeEvents.length === 0 ? '<p class="empty-text">No activities scheduled for this day yet.</p>' : ''}
        <div class="day-events-vertical">
          ${activeEvents.map(evt => `
            <div class="day-event-row event-card--${evt.colorScheme || 'peach'}">
              <span class="day-event-time">${evt.startTime} – ${evt.endTime}</span>
              <div class="day-event-detail">
                <h4>${escapeHtml(evt.title)} ${evt.icon}</h4>
                <p>📍 ${escapeHtml(evt.location || 'Paris')}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (mode === "map") {
    return `
      <div class="plan-map-view">
        <div id="plan-map-container" class="plan-map"></div>
      </div>
    `;
  }

  // Timeline view
  return `
    <div class="timeline-view">
      <div class="timeline-list">
        ${events.map((evt, idx) => `
          <div class="timeline-item">
            <div class="timeline-badge">${evt.dayName}</div>
            <div class="timeline-content">
              <h4>${escapeHtml(evt.title)} ${evt.icon}</h4>
              <p>⏱ ${evt.startTime} – ${evt.endTime} | 📍 ${escapeHtml(evt.location || '')}</p>
            </div>
          </div>
        `).join('')}
      </div>
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
