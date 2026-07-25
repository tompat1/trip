import { state } from "../state.js";

const DAYS_HEADER = ["Sat 3 Oct", "Sun 4 Oct", "Mon 5 Oct", "Tue 6 Oct", "Wed 7 Oct", "Thu 8 Oct", "Fri 9 Oct"];
const TIME_SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

export function renderCalendarGrid() {
  const trip = state.activeTrip;
  const events = trip.calendarEvents || [];
  const activeFilter = state.calendarDayFilter || "all";

  const visibleDayIndices = activeFilter === "all" 
    ? [0, 1, 2, 3, 4, 5, 6] 
    : [parseInt(activeFilter, 10)];

  return `
    <div class="calendar-grid-wrapper">
      <!-- Mobile Day Filter Bar -->
      <div class="calendar-mobile-day-bar">
        <button class="cal-day-pill ${activeFilter === 'all' ? 'is-active' : ''}" data-action="set-calendar-day-filter" data-filter="all">
          <span>All 7 Days</span>
        </button>
        ${DAYS_HEADER.map((dayStr, idx) => `
          <button class="cal-day-pill ${activeFilter === String(idx) ? 'is-active' : ''}" data-action="set-calendar-day-filter" data-filter="${idx}">
            <span class="pill-day-name">${dayStr.split(' ')[0]}</span>
            <span class="pill-day-num">${dayStr.split(' ')[1]}</span>
          </button>
        `).join('')}
      </div>

      <div class="calendar-grid">
        <!-- Time column -->
        <div class="calendar-time-col">
          <div class="calendar-time-header">Time</div>
          ${TIME_SLOTS.map((time) => `<div class="time-label">${time}</div>`).join("")}
        </div>

        <!-- Days columns -->
        <div class="calendar-days-container">
          <!-- Days header row -->
          <div class="calendar-days-header-row" style="grid-template-columns: repeat(${visibleDayIndices.length}, minmax(${visibleDayIndices.length === 7 ? '110px' : '1fr'}, 1fr));">
            ${visibleDayIndices.map(
              (index) => `
                <div class="calendar-day-header ${state.activeDayIndex === index ? 'is-active' : ''}" data-day="${index}">
                  <span class="calendar-day-name">${DAYS_HEADER[index].split(" ")[0]}</span>
                  <span class="calendar-day-num">${DAYS_HEADER[index].split(" ").slice(1).join(" ")}</span>
                  ${index === 0 ? '<span class="day-active-dot"></span>' : ''}
                </div>
              `
            ).join("")}
          </div>

          <!-- Grid body with columns & background time lines -->
          <div class="calendar-days-body">
            <!-- Horizontal grid lines -->
            <div class="calendar-grid-lines">
              ${TIME_SLOTS.map(() => `<div class="grid-horizontal-line"></div>`).join("")}
            </div>

            <!-- Columns for events (Interactive Dropzones & Touch Drag) -->
            <div class="calendar-columns" style="grid-template-columns: repeat(${visibleDayIndices.length}, minmax(${visibleDayIndices.length === 7 ? '110px' : '1fr'}, 1fr));">
              ${visibleDayIndices.map((dayIndex) => {
                const dayEvents = events.filter((e) => Number(e.dayIndex) === dayIndex);
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
      ${evt.reminder && evt.reminder !== 'none' ? `<div class="event-card__reminder">🔔 ${escapeHtml(evt.reminder)} before</div>` : ''}
      
      <div class="event-card-actions">
        <button class="btn btn--icon btn--ghost event-action-btn" data-action="open-edit-drawer" data-event-id="${evt.id}" title="Edit activity">✏️</button>
      </div>

      <!-- Bottom Resize Handle for Touch/Drag Duration Resizing -->
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
