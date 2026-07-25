import { state } from "../state.js";

const COLOR_OPTIONS = [
  { id: "peach", label: "Peach", bg: "#ffe4d6" },
  { id: "blue", label: "Blue", bg: "#dbeafe" },
  { id: "mint", label: "Mint", bg: "#dcfce7" },
  { id: "pink", label: "Pink", bg: "#fce7f3" },
  { id: "green", label: "Green", bg: "#e8f5e9" },
  { id: "lavender", label: "Lavender", bg: "#f3e8ff" },
  { id: "gold", label: "Gold", bg: "#fef3c7" }
];

const REMINDER_OPTIONS = ["none", "15m", "30m", "1h", "2h"];
const DAYS_OPTIONS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

export function renderEventDrawer() {
  const drawer = state.activeEventDrawer;
  if (!drawer) return "";

  const isEdit = drawer.mode === "edit";
  const evt = drawer.event || {};

  return `
    <div class="drawer-overlay" data-action="close-event-drawer">
      <div class="drawer-sheet" onclick="event.stopPropagation()">
        <div class="drawer-drag-handle"></div>

        <div class="drawer-header">
          <h3 class="drawer-title">${isEdit ? 'Edit Activity' : 'Add New Activity'}</h3>
          <button class="drawer-close-btn" data-action="close-event-drawer" aria-label="Close">✕</button>
        </div>

        <form id="event-drawer-form" onsubmit="event.preventDefault();">
          <input type="hidden" name="eventId" value="${evt.id || ''}" />
          <input type="hidden" name="dayIndex" id="drawer-day-index" value="${evt.dayIndex ?? 0}" />
          <input type="hidden" name="colorScheme" id="drawer-color-scheme" value="${evt.colorScheme || 'peach'}" />
          <input type="hidden" name="reminder" id="drawer-reminder" value="${evt.reminder || 'none'}" />

          <!-- Title Input -->
          <div class="form-group mb-sm">
            <label class="form-label">Activity Title</label>
            <input type="text" name="title" class="form-input" placeholder="e.g. Visit Eiffel Tower or Specialty Coffee" value="${escapeHtml(evt.title || '')}" required autoFocus />
          </div>

          <!-- Location Input -->
          <div class="form-group mb-sm">
            <label class="form-label">Location / Neighborhood</label>
            <input type="text" name="location" class="form-input" placeholder="e.g. Le Marais, Paris" value="${escapeHtml(evt.location || '')}" />
          </div>

          <!-- Day Selection Pills -->
          <div class="form-group mb-sm">
            <label class="form-label">Select Day</label>
            <div class="pill-options-grid">
              ${DAYS_OPTIONS.map((dayName, idx) => `
                <button type="button" class="drawer-pill ${Number(evt.dayIndex ?? 0) === idx ? 'is-selected' : ''}" data-drawer-day="${idx}">
                  ${dayName}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Time Range Selectors -->
          <div class="form-row mb-sm">
            <div class="form-group half-width">
              <label class="form-label">Start Time</label>
              <input type="time" name="startTime" class="form-input" value="${evt.startTime || '10:00'}" required />
            </div>
            <div class="form-group half-width">
              <label class="form-label">End Time</label>
              <input type="time" name="endTime" class="form-input" value="${evt.endTime || '12:00'}" required />
            </div>
          </div>

          <!-- Color Palette Picker -->
          <div class="form-group mb-sm">
            <label class="form-label">Card Color Palette</label>
            <div class="color-picker-row">
              ${COLOR_OPTIONS.map(c => `
                <button type="button" 
                        class="color-picker-dot ${(evt.colorScheme || 'peach') === c.id ? 'is-active' : ''}" 
                        style="background: ${c.bg};" 
                        data-drawer-color="${c.id}" 
                        title="${c.label}"></button>
              `).join('')}
            </div>
          </div>

          <!-- Reminder / Alarm Selector -->
          <div class="form-group mb-md">
            <label class="form-label">Set Alarm / Reminder</label>
            <div class="pill-options-grid">
              ${REMINDER_OPTIONS.map(rem => `
                <button type="button" class="drawer-pill ${(evt.reminder || 'none') === rem ? 'is-selected' : ''}" data-drawer-reminder="${rem}">
                  ${rem === 'none' ? '🔔 Off' : `🔔 ${rem}`}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Form Actions -->
          <div class="drawer-actions-row">
            ${isEdit ? `
              <button type="button" class="btn btn--outline btn--danger" data-action="delete-event-from-drawer" data-event-id="${evt.id}">
                🗑️ Delete
              </button>
            ` : ''}
            <button type="submit" class="btn btn--primary flex-grow-btn" data-action="save-event-from-drawer">
              ${isEdit ? 'Save Changes' : 'Add to Calendar'}
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
