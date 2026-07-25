import { state } from "../state.js";

const DAYS_HEADER = ["Sat 3 Oct", "Sun 4 Oct", "Mon 5 Oct", "Tue 6 Oct", "Wed 7 Oct", "Thu 8 Oct", "Fri 9 Oct"];
const TIME_SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

export function renderCalendarGrid() {
  const trip = state.activeTrip;
  const events = trip.calendarEvents || [];

  return `
    <div class="calendar-grid-wrapper">
      <div class="calendar-grid">
        <!-- Time column -->
        <div class="calendar-time-col">
          <div class="calendar-time-header">Time</div>
          ${TIME_SLOTS.map((time) => `<div class="time-label">${time}</div>`).join("")}
        </div>

        <!-- Days columns -->
        <div class="calendar-days-container">
          <!-- Days header row -->
          <div class="calendar-days-header-row">
            ${DAYS_HEADER.map(
              (dayLabel, index) => `
                <div class="calendar-day-header ${state.activeDayIndex === index ? 'is-active' : ''}" data-day="${index}">
                  <span class="calendar-day-name">${dayLabel.split(" ")[0]}</span>
                  <span class="calendar-day-num">${dayLabel.split(" ").slice(1).join(" ")}</span>
                  ${index === 0 ? '<span class="day-active-dot"></span>' : ''}
                </div>
              `
            ).join("")}
          </div>

          <!-- Grid body with 7 columns & background time lines -->
          <div class="calendar-days-body">
            <!-- Horizontal grid lines -->
            <div class="calendar-grid-lines">
              ${TIME_SLOTS.map(() => `<div class="grid-horizontal-line"></div>`).join("")}
            </div>

            <!-- Columns for events (Interactive Dropzones & Slot Clickers) -->
            <div class="calendar-columns">
              ${DAYS_HEADER.map((_, dayIndex) => {
                const dayEvents = events.filter((e) => e.dayIndex === dayIndex);
                return `
                  <div class="calendar-col" data-col-day="${dayIndex}" data-action="click-calendar-col">
                    ${dayEvents.map((evt) => renderEventCard(evt)).join("")}
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Add & Filter FABs -->
      <div class="calendar-fabs-group">
        <button class="calendar-fab-btn fab-add" title="Add new event" data-action="add-event">
          <span>+ Add</span>
        </button>
        <button class="calendar-fab-btn fab-filter" title="Filter calendar events" data-action="calendar-filter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderEventCard(evt) {
  // Compute top offset & height based on startTime & endTime
  const startHours = parseTimeToHours(evt.startTime);
  const endHours = parseTimeToHours(evt.endTime);
  const duration = Math.max(0.75, endHours - startHours);

  // Time scale range: 08:00 to 23:00 (15 hours)
  const topPercent = ((startHours - 8) / 15) * 100;
  const heightPercent = (duration / 15) * 100;

  return `
    <div class="event-card event-card--${evt.colorScheme || 'peach'}" 
         draggable="true"
         data-event-id="${evt.id}"
         data-day-index="${evt.dayIndex}"
         style="top: ${Math.max(0, topPercent)}%; height: ${Math.min(100, heightPercent)}%;"
         title="${escapeHtml(evt.title)} (${evt.startTime} - ${evt.endTime})">
      <div class="event-card__header">
        <span class="event-card__title">${escapeHtml(evt.title)}</span>
        <span class="event-card__icon">${evt.icon || '📍'}</span>
      </div>
      <div class="event-card__time">${evt.startTime} – ${evt.endTime}</div>
      ${evt.location ? `<div class="event-card__location">📍 ${escapeHtml(evt.location)}</div>` : ''}
      ${evt.reminder ? `<div class="event-card__reminder">🔔 ${escapeHtml(evt.reminder)} before</div>` : ''}
      
      <div class="event-card-actions">
        <button class="btn btn--icon btn--ghost event-action-btn" data-action="edit-calendar-event" data-event-id="${evt.id}" title="Edit event">✏️</button>
        <button class="btn btn--icon btn--ghost event-action-btn" data-action="delete-calendar-event" data-event-id="${evt.id}" title="Delete event">🗑️</button>
      </div>

      <!-- Bottom Resize Handle for Drag-to-Resize Duration -->
      <div class="event-resize-handle" data-event-id="${evt.id}" title="Drag bottom edge to resize duration"></div>
    </div>
  `;
}

function parseTimeToHours(timeStr) {
  if (!timeStr) return 8;
  const [h, m] = timeStr.split(":").map(Number);
  return h + (m || 0) / 60;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
