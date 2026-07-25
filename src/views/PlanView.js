import { state } from "../state.js";
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

      <!-- Subtab Specific Content Render -->
      ${renderSubtabContent(trip)}
    </div>
  `;
}

function renderSubtabContent(trip) {
  const tab = state.planSubTab;

  if (tab === "overview") {
    return renderOverviewSubTab(trip);
  }
  if (tab === "journal") {
    return renderJournalSubTab();
  }
  if (tab === "story") {
    return renderStorySubTab(trip);
  }

  // Default "plan" / "explore" layout with View Mode controls
  return `
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
  `;
}

function renderJournalSubTab() {
  const moments = state.moments || [];
  const mediaMoments = moments.filter(m => m.media_url);

  return `
    <div class="journal-subtab-view">
      <div class="journal-header mb-md">
        <h2 class="journal-title">Travel Moments & Media</h2>
        <p class="journal-sub">Captured photos, videos, and personal notes from ${escapeHtml(state.activeTrip.destination)}</p>
      </div>

      <!-- Media Gallery Grid -->
      <div class="journal-media-grid mb-lg">
        ${mediaMoments.length === 0 ? `
          <div class="empty-media-card">
            <span class="empty-icon">📷</span>
            <h4>No photos or videos captured yet</h4>
            <p>Use Quick Capture (Photo / Video) on the Home dashboard to add media!</p>
          </div>
        ` : mediaMoments.map(m => `
          <div class="journal-media-card" data-action="open-lightbox" data-moment-id="${m.id}">
            <div class="journal-media-thumb" style="background-image: url('${m.media_url}')">
              <span class="media-type-badge">${m.type === 'video' ? '📹 Video' : '📷 Photo'}</span>
            </div>
            <div class="journal-media-body">
              <h4 class="journal-media-title">${escapeHtml(m.title || 'Trip Photo')}</h4>
              <p class="journal-media-date">${escapeHtml(m.date || 'Oct 2026')}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Notes Feed -->
      <div class="journal-notes-section">
        <h3 class="section-title mb-sm">Personal Notes & Thoughts</h3>
        <div class="notes-feed">
          ${moments.filter(m => !m.media_url).map(m => `
            <div class="note-card mb-sm">
              <span class="note-icon">📝</span>
              <div class="note-body">
                <h4 class="note-title">${escapeHtml(m.title)}</h4>
                <p class="note-text">${escapeHtml(m.text)}</p>
                <span class="note-date">${m.date}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderStorySubTab(trip) {
  return `
    <div class="story-subtab-view">
      <article class="editorial-story-card">
        <div class="story-cover" style="background-image: url('${trip.upcomingActivity.image}')">
          <div class="story-cover-overlay"></div>
          <div class="story-cover-content">
            <span class="story-kicker">EDITORIAL TRAVEL ARCHIVE</span>
            <h1 class="story-main-title">${escapeHtml(trip.destination)} ${trip.flag}</h1>
            <p class="story-byline">By Thomas Rynell • ${escapeHtml(trip.dates)}</p>
          </div>
        </div>

        <div class="story-prose">
          <p class="story-lead">
            Every place becomes a story. Exploring ${escapeHtml(trip.destination)} brought together historic architecture, specialty coffee roasters, and unforgettable moments along the journey.
          </p>

          <h3 class="story-h3">Highlights of the Journey</h3>
          <ul class="story-highlights-list">
            ${(trip.ideas || []).map(idea => `
              <li class="story-highlight-item">
                <strong>${escapeHtml(idea.title)}</strong>: ${escapeHtml(idea.subtitle)} (★ ${idea.rating})
              </li>
            `).join('')}
          </ul>

          <h3 class="story-h3">Captured Memories & Notes</h3>
          <div class="story-moments-list">
            ${(state.moments || []).map(m => `
              <blockquote class="story-quote">
                <p>"${escapeHtml(m.text || m.title)}"</p>
                <cite>— Recorded on ${m.date}</cite>
              </blockquote>
            `).join('')}
          </div>
        </div>
      </article>
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
        ${events.map((evt) => `
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

function renderOverviewSubTab(trip) {
  const checklist = state.checklists[trip.id] || trip.checklist || [];
  const completedCount = checklist.filter(i => i.completed).length;
  const progressPct = checklist.length ? Math.round((completedCount / checklist.length) * 100) : 0;

  return `
    <div class="overview-subtab-view">
      <!-- Planning Progress Summary Card -->
      <div class="dashboard-card mb-md">
        <div class="dashboard-card__header">
          <h3 class="dashboard-card__title">Planning Progress</h3>
          <span class="badge ${progressPct === 100 ? 'badge--success' : 'badge--info'}">${completedCount} of ${checklist.length} tasks (${progressPct}%)</span>
        </div>
        <div class="progress-bar-wrap mb-sm">
          <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
        </div>
        <p class="greeting-status">${progressPct === 100 ? '🎉 All planning tasks completed!' : 'Keep going! Your checklist updates stay synced across Home & Trips.'}</p>
      </div>

      <!-- Synced Planning Checklist (Full CRUD) -->
      <div class="dashboard-card planning-widget mb-md">
        <div class="dashboard-card__header">
          <h3 class="dashboard-card__title">Trip Checklist</h3>
          <button class="btn btn--outline btn--xs" data-action="add-checklist-item" title="Add planning task">+ Add task</button>
        </div>
        <ul class="checklist-items">
          ${checklist.map(item => `
            <li class="checklist-item ${item.completed ? 'is-completed' : ''}">
              <span class="checkbox-circle ${item.completed ? 'is-checked' : ''}" data-action="toggle-check" data-item-id="${item.id}">
                ${item.completed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
              </span>
              <span class="checklist-label" data-action="toggle-check" data-item-id="${item.id}">${escapeHtml(item.label)}</span>
              <div class="checklist-item-actions">
                <button class="btn btn--icon btn--ghost item-action-btn" data-action="edit-checklist-item" data-item-id="${item.id}" data-label="${escapeHtml(item.label)}" title="Edit task">✏️</button>
                <button class="btn btn--icon btn--ghost item-action-btn" data-action="delete-checklist-item" data-item-id="${item.id}" title="Delete task">🗑️</button>
              </div>
            </li>
          `).join('')}
        </ul>
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
