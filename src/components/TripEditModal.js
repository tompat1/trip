import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { formatAirportLabel, resolveAirportInput } from "../services/airportService.js";
import { inferStartDateFromText } from "../utils/tripDates.js";
import { sanitizeFlagEmoji } from "../utils/countryEmoji.js";

const TRIP_LENGTH_OPTIONS = [
  { days: 3, label: "3 days" },
  { days: 5, label: "5 days" },
  { days: 7, label: "7 days" },
  { days: 10, label: "10 days" },
];

export function renderTripEditModal() {
  if (!state.tripEditOpen || !state.tripEditTripId) return "";

  const trip = state.getAllTrips?.().find((item) => item.id === state.tripEditTripId);
  if (!trip) return "";

  const today = new Date().toISOString().split("T")[0];
  const startDate = trip.startDate || inferStartDateFromText(trip.dates) || today;
  const daysCount = Math.max(1, Number(trip.daysCount) || 7);
  const formattedStartDate = formatDisplayDate(startDate);
  const destinationAirport = trip.flightRoute?.destinationLabel
    || (trip.flightRoute?.destinationIata ? formatAirportLabel(resolveAirportInput(trip.flightRoute.destinationIata) || { iata: trip.flightRoute.destinationIata }) : "");

  return `
    <div class="trip-create-overlay" data-action="close-trip-edit">
      <section class="trip-create-sheet trip-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="trip-edit-title">
        <div class="trip-create-header">
          <div>
            <span class="trip-create-kicker voice-mono">${renderIcon("pencil")} Edit trip</span>
            <h2 class="trip-create-title" id="trip-edit-title">
              ${escapeHtml(sanitizeFlagEmoji(trip.flag, trip.destination))} ${escapeHtml(trip.destination || "Trip")}
            </h2>
            <p class="trip-create-subtitle">Update destination, dates, and arrival airport. Local ideas and events refresh after saving.</p>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-trip-edit" aria-label="Close" type="button">
            ${renderIcon("x")}
          </button>
        </div>

        <form id="trip-edit-form" class="trip-create-form">
          <input type="hidden" name="tripId" value="${escapeHtml(trip.id)}" />

          <div class="trip-create-grid">
            <label class="trip-create-field trip-create-field--wide">
              <span class="drawer-label">Destination</span>
              <div class="trip-create-input-wrap">
                ${renderIcon("mapPin")}
                <input class="drawer-input trip-create-input" name="destination" type="text" value="${escapeHtml(trip.destination || "")}" placeholder="Ortigia, Sicilia or Paris, France" autocomplete="off" required />
              </div>
            </label>
          </div>

          <div class="trip-create-field">
            <span class="drawer-label">Length</span>
            <div class="trip-create-pills" data-trip-length-group>
              ${TRIP_LENGTH_OPTIONS.map((option) => `
                <button type="button" class="trip-create-pill ${option.days === daysCount ? "is-selected" : ""}" data-trip-length="${option.days}">
                  ${option.label}
                </button>
              `).join("")}
            </div>
            <input type="hidden" name="daysCount" value="${daysCount}" />
          </div>

          <div class="trip-create-field trip-create-field--date">
            <div class="trip-create-date-row">
              <span class="drawer-label">Start date</span>
              <button type="button" class="btn-start-date-picker" data-action="toggle-calendar-picker">
                ${renderIcon("calendar")} <span data-start-date-display>${escapeHtml(formattedStartDate)}</span>
              </button>
            </div>
            <input type="hidden" name="startDate" value="${escapeHtml(startDate)}" />

            <div class="mini-calendar-popover" hidden>
              <div class="mini-calendar-header">
                <button type="button" class="btn btn--icon btn--ghost btn--xs" data-action="calendar-prev-month" aria-label="Previous month">${renderIcon("chevronLeft")}</button>
                <strong data-mini-calendar-month-year>Month 2026</strong>
                <button type="button" class="btn btn--icon btn--ghost btn--xs" data-action="calendar-next-month" aria-label="Next month">${renderIcon("chevronRight")}</button>
              </div>
              <div class="mini-calendar-weekdays">
                <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
              </div>
              <div data-mini-calendar-days-grid class="mini-calendar-days"></div>
            </div>
          </div>

          <label class="trip-create-field trip-create-field--wide">
            <span class="drawer-label">Destination city / airport</span>
            <div class="trip-create-input-wrap airport-autocomplete">
              ${renderIcon("flag")}
              <input class="drawer-input trip-create-input airport-autocomplete-input" name="destinationAirport" type="text" value="${escapeHtml(destinationAirport)}" placeholder="City or airport for flight and arrival context" autocomplete="off" />
              <div class="airport-autocomplete-menu" role="listbox"></div>
            </div>
          </label>

          <p class="trip-create-error" id="trip-edit-error" aria-live="polite"></p>

          <div class="trip-create-actions">
            <button type="button" class="btn btn--outline" data-action="close-trip-edit">Cancel</button>
            <button type="submit" class="btn btn--primary trip-create-submit">
              ${renderIcon("check")} Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function formatDisplayDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
