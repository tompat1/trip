import { state } from "../state.js";
import { renderCalendarGrid } from "../components/CalendarGrid.js";
import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";

const SUB_TABS = [
  { id: "overview", label: "Overview", icon: renderIcon("compass") },
  { id: "plan", label: "Plan", icon: renderIcon("calendar") },
  { id: "explore", label: "Explore", icon: renderIcon("sparkles") },
  { id: "journal", label: "Journal", icon: renderIcon("bookOpen") },
  { id: "story", label: "Story", icon: renderIcon("award") }
];

const VIEW_MODES = [
  { id: "day", label: "Day", icon: renderIcon("calendar") },
  { id: "week", label: "Week", icon: renderIcon("calendar") },
  { id: "timeline", label: "Timeline", icon: renderIcon("clock") },
  { id: "map", label: "Map", icon: renderIcon("map") }
];

const DAYS_HEADER = ["Sat 3 Oct", "Sun 4 Oct", "Mon 5 Oct", "Tue 6 Oct", "Wed 7 Oct", "Thu 8 Oct", "Fri 9 Oct"];

export function renderPlanView() {
  const trip = state.activeTrip;

  return `
    <div class="plan-page">
      <!-- Universal Top App Header -->
      ${renderHeader()}

      <div class="plan-page-body">
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
        <div class="subtab-content-container">
          ${renderSubtabContent(trip)}
        </div>
      </div>
    </div>
  `;
}

function renderSubtabContent(trip) {
  const tab = state.planSubTab;

  if (tab === "overview") {
    return renderOverviewSubTab(trip);
  }
  if (tab === "explore") {
    return renderExploreSubTab(trip);
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
              <span class="pill-icon">${mode.icon}</span>
              <span class="pill-text">${mode.label}</span>
            </button>
          `
        ).join("")}
      </div>
    </div>

    <!-- Content Area (Calendar Grid or Vertical Timeline/Map) -->
    <main class="plan-content-area">
      ${state.planViewMode === "week" ? renderCalendarGrid() : renderAlternativePlanView(trip)}
    </main>
  `;
}

function renderJournalSubTab() {
  const moments = state.moments || [];
  const mediaMoments = moments.filter(m => m.media_url);
  const noteMoments = moments.filter(m => !m.media_url);

  return `
    <div class="journal-subtab-view" style="padding: 8px 4px 24px 4px;">
      <div class="journal-header mb-md">
        <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-bottom: 4px;">Travel Moments & Media</h2>
        <p style="font-size: 0.85rem; color: var(--ink-muted); margin: 0;">Captured photos, videos, and personal notes from ${escapeHtml(state.activeTrip.destination)}</p>
      </div>

      <!-- Media Gallery Grid -->
      <div class="journal-media-grid mb-lg" style="margin-bottom: 24px;">
        ${mediaMoments.length === 0 ? `
          <div class="empty-media-card" style="background: var(--paper-card); border: 1px dashed var(--line); border-radius: var(--radius-lg); padding: 32px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--paper-subtle); display: flex; align-items: center; justify-content: center; color: var(--ink-muted); margin-bottom: 4px;">
              ${renderIcon("camera")}
            </div>
            <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--ink); margin: 0;">No photos or videos captured yet</h4>
            <p style="font-size: 0.82rem; color: var(--ink-muted); margin: 0; max-width: 320px; line-height: 1.4;">Use Quick Capture on the Home dashboard to record photos, videos, and journey notes!</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
            ${mediaMoments.map(m => `
              <div class="journal-media-card" data-action="open-lightbox" data-moment-id="${m.id}" style="background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; cursor: pointer; box-shadow: var(--shadow-sm);">
                <div class="journal-media-thumb" style="height: 110px; background-image: url('${m.media_url}'); background-size: cover; background-position: center; position: relative;">
                  <span class="media-type-badge voice-mono" style="position: absolute; bottom: 6px; right: 6px; background: rgba(23,24,23,0.8); color: #fff; padding: 2px 8px; border-radius: var(--radius-pill); font-size: 0.68rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                    ${m.type === 'video' ? renderIcon("video") : renderIcon("camera")} ${m.type}
                  </span>
                </div>
                <div class="journal-media-body" style="padding: 10px;">
                  <h4 class="journal-media-title" style="font-size: 0.85rem; font-weight: 700; margin: 0 0 2px 0; color: var(--ink); truncate;">${escapeHtml(m.title || 'Trip Moment')}</h4>
                  <p class="journal-media-date voice-mono" style="font-size: 0.72rem; color: var(--ink-muted); margin: 0;">${escapeHtml(m.date || 'Oct 2026')}</p>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Notes Feed -->
      <div class="journal-notes-section">
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--ink); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line-light);">Personal Notes & Thoughts</h3>
        <div class="notes-feed" style="display: flex; flex-direction: column; gap: 10px;">
          ${noteMoments.length === 0 ? `
            <p style="font-size: 0.85rem; color: var(--ink-muted); font-style: italic;">No personal notes written yet.</p>
          ` : noteMoments.map(m => `
            <div class="note-card" style="background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 14px 16px; box-shadow: var(--shadow-sm); display: flex; gap: 12px; align-items: flex-start;">
              <div style="color: var(--blue); margin-top: 2px;">
                ${renderIcon("fileText")}
              </div>
              <div class="note-body" style="flex: 1;">
                <h4 class="note-title" style="font-size: 0.92rem; font-weight: 700; color: var(--ink); margin: 0 0 4px 0;">${escapeHtml(m.title)}</h4>
                <p class="note-text" style="font-size: 0.85rem; color: var(--ink-muted); margin: 0 0 6px 0; line-height: 1.4;">${escapeHtml(m.text)}</p>
                <span class="note-date voice-mono" style="font-size: 0.72rem; color: var(--ink-light);">${m.date}</span>
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
    const activeEvents = events.filter((e) => Number(e.dayIndex) === (state.activeDayIndex || 0));
    const activeDayIdx = state.activeDayIndex || 0;

    return `
      <div class="day-schedule-view">
        <!-- Day Switcher Bar -->
        <div class="day-switcher-bar">
          <div class="day-switcher-pills">
            ${DAYS_HEADER.map((dayLabel, idx) => `
              <button class="day-pill-btn ${activeDayIdx === idx ? 'is-active' : ''}" data-day-select="${idx}">
                <span>${dayLabel.split(' ')[0]} ${dayLabel.split(' ')[1]}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="day-schedule-list">
          <div class="day-schedule-header">
            <h3>Schedule for ${DAYS_HEADER[activeDayIdx]}</h3>
          </div>

          ${activeEvents.length === 0 ? `
            <div class="empty-day-box" style="padding: 20px; text-align: center; color: var(--ink-muted); background: var(--paper-card); border-radius: var(--radius-md); border: 1px dashed var(--line);">
              <p class="empty-text" style="margin: 0;">No activities scheduled for ${DAYS_HEADER[activeDayIdx]} yet.</p>
            </div>
          ` : `
            <div class="day-events-vertical">
              ${activeEvents.map(evt => `
                <div class="day-event-row event-card--${evt.colorScheme || 'peach'}" data-action="open-edit-drawer" data-event-id="${evt.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 8px; cursor: pointer;">
                  <div class="day-event-detail">
                    <div style="font-size: 0.78rem; font-weight: 700; opacity: 0.8; margin-bottom: 2px;">${evt.startTime} – ${evt.endTime}</div>
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700;">${escapeHtml(evt.title)}</h4>
                    ${evt.location ? `<div style="font-size: 0.8rem; opacity: 0.85; margin-top: 2px;">${renderIcon("pin")} ${escapeHtml(evt.location)}</div>` : ''}
                  </div>
                  <button class="btn btn--icon btn--ghost event-edit-btn" data-action="open-edit-drawer" data-event-id="${evt.id}">
                    ${renderIcon("pencil")}
                  </button>
                </div>
              `).join('')}
            </div>
          `}

          <button class="timeline-empty-slot mt-md" data-action="add-event-for-day" data-day-index="${activeDayIdx}">
            <span>${renderIcon("plus")} Add activity for ${DAYS_HEADER[activeDayIdx]}</span>
          </button>
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

  // Vertical Graphic Timeline view
  return renderVerticalTimeline(trip);
}

function renderVerticalTimeline(trip) {
  const events = trip.calendarEvents || [];
  const days = ["Sat 3 Oct", "Sun 4 Oct", "Mon 5 Oct", "Tue 6 Oct", "Wed 7 Oct", "Thu 8 Oct", "Fri 9 Oct"];

  return `
    <div class="vertical-timeline-container">
      <div class="vertical-timeline-spine"></div>

      ${days.map((dayLabel, dayIdx) => {
        const dayEvents = events.filter((e) => Number(e.dayIndex) === dayIdx);
        return `
          <div class="timeline-day-group">
            <div class="timeline-day-node">
              <span class="timeline-day-badge">${renderIcon("pin")} Day ${dayIdx + 1} &bull; ${dayLabel}</span>
            </div>

            <div class="timeline-day-events">
              ${dayEvents.map((evt) => `
                <div class="timeline-event-row" data-action="open-edit-drawer" data-event-id="${evt.id}">
                  <div class="timeline-node-point">
                    <span class="timeline-node-dot timeline-dot--${evt.colorScheme || 'peach'}"></span>
                  </div>
                  
                  <div class="timeline-time-badge">${evt.startTime}</div>

                  <div class="timeline-card-box event-card--${evt.colorScheme || 'peach'}">
                    <div class="timeline-card-header">
                      <h4 class="timeline-card-title">${escapeHtml(evt.title)}</h4>
                      <span class="timeline-duration-tag">${renderIcon("clock")} ${evt.startTime} – ${evt.endTime}</span>
                    </div>
                    ${evt.location ? `<div class="timeline-card-location">${renderIcon("pin")} ${escapeHtml(evt.location)}</div>` : ''}
                    ${evt.reminder && evt.reminder !== 'none' ? `<div class="timeline-card-reminder">${renderIcon("bell")} ${escapeHtml(evt.reminder)} before</div>` : ''}
                  </div>
                </div>
              `).join('')}

              <button class="timeline-empty-slot" data-action="add-event-for-day" data-day-index="${dayIdx}">
                <span>${renderIcon("plus")} Add activity for ${dayLabel}</span>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderOverviewSubTab(trip) {
  const checklist = state.checklists[trip.id] || trip.checklist || [];
  const completedCount = checklist.filter(i => i.completed).length;
  const progressPct = checklist.length ? Math.round((completedCount / checklist.length) * 100) : 0;
  const events = trip.calendarEvents || [];
  const savedPlacesCount = state.savedPlaceIds ? state.savedPlaceIds.size : 0;

  return `
    <div class="overview-subtab-view">
      <!-- Destination Hero Banner & Stats -->
      <div class="overview-hero-card mb-md" style="background: linear-gradient(135deg, var(--paper-card) 0%, var(--paper-subtle) 100%); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
          <div>
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--red);">TRIP OVERVIEW</span>
            <h2 class="voice-serif" style="font-size: 1.6rem; font-weight: 700; color: var(--ink); margin: 4px 0;">${escapeHtml(trip.destination)} ${trip.flag}</h2>
            <p class="voice-mono" style="font-size: 0.85rem; color: var(--ink-muted);">${escapeHtml(trip.dates)}</p>
          </div>
          <button class="btn btn--outline btn--sm" data-action="share-trip" title="Share trip link">
            ${renderIcon("share")} Share
          </button>
        </div>

        <!-- Stat Counters Grid -->
        <div class="overview-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line-light);">
          <div class="stat-box" style="text-align: center; background: var(--paper); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--line);">
            <div class="voice-mono" style="font-size: 1.2rem; font-weight: 700; color: var(--red);">${events.length}</div>
            <div style="font-size: 0.72rem; font-weight: 600; color: var(--ink-muted); text-transform: uppercase; margin-top: 2px;">Activities</div>
          </div>
          <div class="stat-box" style="text-align: center; background: var(--paper); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--line);">
            <div class="voice-mono" style="font-size: 1.2rem; font-weight: 700; color: var(--blue);">${savedPlacesCount}</div>
            <div style="font-size: 0.72rem; font-weight: 600; color: var(--ink-muted); text-transform: uppercase; margin-top: 2px;">Saved Spots</div>
          </div>
          <div class="stat-box" style="text-align: center; background: var(--paper); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--line);">
            <div class="voice-mono" style="font-size: 1.2rem; font-weight: 700; color: var(--green);">${progressPct}%</div>
            <div style="font-size: 0.72rem; font-weight: 600; color: var(--ink-muted); text-transform: uppercase; margin-top: 2px;">Planned</div>
          </div>
        </div>
      </div>

      <!-- Destination Photo Palette (Generated Brand Palette) -->
      <div class="dashboard-card mb-md" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 class="dashboard-card__title">Destination Color Palette</h3>
          <span style="font-size: 0.72rem; font-weight: 600; color: var(--ink-muted);">Photo extracted</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
          <div style="flex: 1; height: 36px; border-radius: 8px; background: #F4F0E7; border: 1px solid #E0D8CB; display: flex; align-items: flex-end; padding: 4px; font-size: 0.65rem; font-weight: 700; font-family: var(--font-mono); color: #171817;" title="Paper #F4F0E7">Paper</div>
          <div style="flex: 1; height: 36px; border-radius: 8px; background: #D94A3A; display: flex; align-items: flex-end; padding: 4px; font-size: 0.65rem; font-weight: 700; font-family: var(--font-mono); color: #FFF;" title="Journey Red #D94A3A">Red</div>
          <div style="flex: 1; height: 36px; border-radius: 8px; background: #385C73; display: flex; align-items: flex-end; padding: 4px; font-size: 0.65rem; font-weight: 700; font-family: var(--font-mono); color: #FFF;" title="Atlas Blue #385C73">Blue</div>
          <div style="flex: 1; height: 36px; border-radius: 8px; background: #65705B; display: flex; align-items: flex-end; padding: 4px; font-size: 0.65rem; font-weight: 700; font-family: var(--font-mono); color: #FFF;" title="Field Green #65705B">Green</div>
          <div style="flex: 1; height: 36px; border-radius: 8px; background: #E9C76B; display: flex; align-items: flex-end; padding: 4px; font-size: 0.65rem; font-weight: 700; font-family: var(--font-mono); color: #171817;" title="Sun #E9C76B">Sun</div>
          <div style="flex: 1; height: 36px; border-radius: 8px; background: #9C6E55; display: flex; align-items: flex-end; padding: 4px; font-size: 0.65rem; font-weight: 700; font-family: var(--font-mono); color: #FFF;" title="Clay #9C6E55">Clay</div>
        </div>
      </div>

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
          <button class="btn btn--outline btn--xs" data-action="add-checklist-item" title="Add planning task">${renderIcon("plus")} Add task</button>
        </div>
        <ul class="checklist-items">
          ${checklist.map(item => `
            <li class="checklist-item ${item.completed ? 'is-completed' : ''}">
              <span class="checkbox-circle ${item.completed ? 'is-checked' : ''}" data-action="toggle-check" data-item-id="${item.id}">
                ${item.completed ? renderIcon("check") : ''}
              </span>
              <span class="checklist-label" data-action="toggle-check" data-item-id="${item.id}">${escapeHtml(item.label)}</span>
              <div class="checklist-item-actions">
                <button class="btn btn--icon btn--ghost item-action-btn" data-action="edit-checklist-item" data-item-id="${item.id}" data-label="${escapeHtml(item.label)}" title="Edit task">${renderIcon("pencil")}</button>
                <button class="btn btn--icon btn--ghost item-action-btn" data-action="delete-checklist-item" data-item-id="${item.id}" title="Delete task">${renderIcon("trash")}</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

function renderExploreSubTab(trip) {
  const ideas = trip.ideas || [];

  return `
    <div class="explore-subtab-view">
      <div class="explore-header mb-md">
        <h2 class="voice-serif" style="font-size: 1.4rem; font-weight: 700; margin-bottom: 4px;">Explore ${escapeHtml(trip.destination)}</h2>
        <p style="font-size: 0.85rem; color: var(--ink-muted);">Curated local recommendations & sights for your trip</p>
      </div>

      <!-- Recommendation Cards Feed -->
      <div class="explore-ideas-grid" style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
        ${ideas.map(idea => {
          const isSaved = state.savedPlaceIds.has(idea.id);
          return `
            <div class="explore-card" style="background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
              <div style="height: 160px; background-image: url('${idea.image}'); background-size: cover; background-position: center; position: relative;">
                <button class="btn-bookmark ${isSaved ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${idea.id}" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.9); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: none; box-shadow: var(--shadow-sm);" aria-label="Bookmark">
                  ${renderIcon("bookmark")}
                </button>
                <span class="category-badge" style="position: absolute; bottom: 12px; left: 12px; background: rgba(23,24,23,0.85); color: #fff; padding: 4px 10px; border-radius: var(--radius-pill); font-size: 0.72rem; font-weight: 700;">${escapeHtml(idea.category)}</span>
              </div>

              <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--ink); margin-bottom: 2px;">${escapeHtml(idea.title)}</h3>
                    <p style="font-size: 0.82rem; color: var(--ink-muted); margin: 0;">${escapeHtml(idea.subtitle)}</p>
                  </div>
                  <span class="voice-mono" style="font-size: 0.8rem; font-weight: 700; color: var(--sun); background: rgba(233,199,107,0.18); padding: 3px 8px; border-radius: var(--radius-pill);">★ ${idea.rating}</span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--line-light);">
                  <span class="voice-mono" style="font-size: 0.78rem; color: var(--ink-muted);">${renderIcon("clock")} ${idea.duration || '2 hours'}</span>
                  <button class="btn btn--primary btn--xs" data-action="add-idea-to-itinerary" data-title="${escapeHtml(idea.title)}" data-location="${escapeHtml(idea.subtitle)}">
                    ${renderIcon("plus")} Add to Itinerary
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
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
