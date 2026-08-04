import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";

const COLOR_OPTIONS = [
  { id: "peach", label: "Peach", bg: "#ffe4d6", border: "#ffd0b8" },
  { id: "blue", label: "Blue", bg: "#dbeafe", border: "#bfdbfe" },
  { id: "mint", label: "Mint", bg: "#dcfce7", border: "#bbf7d0" },
  { id: "pink", label: "Pink", bg: "#fce7f3", border: "#fbcfe8" },
  { id: "green", label: "Green", bg: "#e8f5e9", border: "#c8e6c9" },
  { id: "lavender", label: "Lavender", bg: "#f3e8ff", border: "#e9d5ff" },
  { id: "gold", label: "Gold", bg: "#fef3c7", border: "#fde68a" }
];

const REMINDER_OPTIONS = [
  { id: "none", label: "Off" },
  { id: "15m", label: "15m before" },
  { id: "30m", label: "30m before" },
  { id: "1h", label: "1h before" },
  { id: "2h", label: "2h before" }
];

const DAYS_OPTIONS = ["Sat 3", "Sun 4", "Mon 5", "Tue 6", "Wed 7", "Thu 8", "Fri 9"];

export function renderEventDrawer() {
  const evt = state.activeEventDrawerData || {};
  const isOpen = state.eventDrawerOpen;
  if (!isOpen) return "";

  const isEdit = Boolean(evt.id);

  return `
    <div class="drawer-overlay" data-action="close-event-drawer">
      <div class="drawer-sheet">
        <!-- Top Drag Pill Indicator -->
        <div class="drawer-drag-handle" data-action="close-event-drawer"></div>

        <div class="drawer-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h3 class="drawer-title">${isEdit ? 'Edit Activity' : 'New Activity'}</h3>
            <span class="drawer-subtitle">${isEdit ? 'Update time, color & details' : 'Add to your trip itinerary'}</span>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-event-drawer" aria-label="Close">
            ${renderIcon("x")}
          </button>
        </div>

        <form id="event-drawer-form" onsubmit="event.preventDefault();">
          <input type="hidden" name="eventId" value="${evt.id || ''}" />
          <input type="hidden" name="dayIndex" id="drawer-day-index" value="${evt.dayIndex ?? 0}" />
          <input type="hidden" name="colorScheme" id="drawer-color-scheme" value="${evt.colorScheme || 'peach'}" />
          <input type="hidden" name="reminder" id="drawer-reminder" value="${evt.reminder || 'none'}" />

          <!-- Title Input -->
          <div class="drawer-form-group">
            <label class="drawer-label">Activity Title</label>
            <input type="text" name="title" class="drawer-input" placeholder="e.g. Specialty Coffee at Télescope" value="${escapeHtml(evt.title || '')}" required autoFocus />
          </div>

          <!-- Location Input -->
          <div class="drawer-form-group">
            <label class="drawer-label">Location / Landmark</label>
            <input type="text" name="location" class="drawer-input" placeholder="e.g. Le Marais, 3rd Arr." value="${escapeHtml(evt.location || '')}" />
          </div>

          <!-- Day Selection Pills -->
          <div class="drawer-form-group">
            <label class="drawer-label">Trip Day</label>
            <div class="drawer-pills-row">
              ${DAYS_OPTIONS.map((dayName, idx) => `
                <button type="button" class="drawer-pill ${Number(evt.dayIndex ?? 0) === idx ? 'is-selected' : ''}" data-drawer-day="${idx}">
                  ${dayName}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Time Range Inputs -->
          <div class="drawer-form-row">
            <div class="drawer-form-group half-width">
              <label class="drawer-label">Start Time</label>
              <input type="time" name="startTime" class="drawer-input" value="${evt.startTime || '10:00'}" required />
            </div>
            <div class="drawer-form-group half-width">
              <label class="drawer-label">End Time</label>
              <input type="time" name="endTime" class="drawer-input" value="${evt.endTime || '12:00'}" required />
            </div>
          </div>

          <!-- Color Palette Dots -->
          <div class="drawer-form-group">
            <label class="drawer-label">Card Theme</label>
            <div class="drawer-colors-row">
              ${COLOR_OPTIONS.map(c => `
                <button type="button" 
                        class="drawer-color-dot ${(evt.colorScheme || 'peach') === c.id ? 'is-active' : ''}" 
                        style="background: ${c.bg}; border-color: ${c.border};" 
                        data-drawer-color="${c.id}" 
                        title="${c.label}">
                  ${(evt.colorScheme || 'peach') === c.id ? renderIcon("check") : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Reminder Selector Pills -->
          <div class="drawer-form-group">
            <label class="drawer-label">Alarm / Reminder</label>
            <div class="drawer-pills-row">
              ${REMINDER_OPTIONS.map(rem => `
                <button type="button" class="drawer-pill ${(evt.reminder || 'none') === rem.id ? 'is-selected' : ''}" data-drawer-reminder="${rem.id}">
                  ${renderIcon("bell")} ${rem.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Actions -->
          <div class="drawer-actions">
            ${isEdit ? `
              <button type="button" class="btn btn--outline btn--danger" data-action="delete-event-from-drawer" data-event-id="${evt.id}">
                ${renderIcon("trash")} Delete
              </button>
            ` : ''}
            <button type="submit" class="btn btn--primary flex-grow-btn" data-action="save-event-from-drawer">
              ${isEdit ? 'Save Changes' : 'Add Activity'}
            </button>
          </div>
        </form>
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
