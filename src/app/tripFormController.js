import { state } from "../state.js";
import { findPrimaryAirportForDestination, formatAirportLabel, getFlightRouteDisplay, resolveAirportInput, searchAirportsWorldwide } from "../services/airportService.js";
import { normalizeFlightType } from "../services/flightService.js";
import { resolveTripCenter } from "./mapController.js";

export function closeAirportAutocompleteMenus() {
  document.querySelectorAll(".airport-autocomplete-menu.is-open").forEach((menu) => {
    menu.classList.remove("is-open");
    menu.innerHTML = "";
  });
}

export async function updateAirportAutocomplete(input) {
  const wrapper = input.closest(".airport-autocomplete");
  const menu = wrapper?.querySelector(".airport-autocomplete-menu");
  if (!menu) return;

  const query = input.value.trim();
  const seq = String(Date.now());
  input.dataset.airportSearchSeq = seq;

  if (query.length < 2) {
    menu.classList.remove("is-open");
    menu.innerHTML = "";
    return;
  }

  menu.classList.add("is-open");
  menu.innerHTML = `<div class="airport-autocomplete-status">Searching live airport service...</div>`;

  const airports = await searchAirportsWorldwide(query, { max: 18 });
  if (input.dataset.airportSearchSeq !== seq) return;

  if (!airports.length) {
    menu.innerHTML = `<div class="airport-autocomplete-status">No airports found</div>`;
    return;
  }

  menu.innerHTML = airports.slice(0, 10).map((airport) => {
    const label = formatAirportLabel(airport);
    return `
      <button type="button" class="airport-autocomplete-option" data-action="select-airport-suggestion" data-airport-value="${escapeHtml(label)}" role="option">
        <span class="airport-autocomplete-option__code voice-mono">${escapeHtml(airport.iata)}</span>
        <span class="airport-autocomplete-option__body">
          <strong>${escapeHtml(`${airport.flag || "Flight"} ${airport.city || airport.name}`)}</strong>
          <small>${escapeHtml([airport.name, airport.country].filter(Boolean).join(" - "))}</small>
        </span>
      </button>
    `;
  }).join("");
}

export function handleDestinationInputChange(input) {
  const form = input.form;
  if (!form) return;
  const destinationVal = input.value.trim();
  const destAirportInput = form.querySelector('input[name="destinationAirport"]');
  if (!destAirportInput) return;

  if (!destinationVal) {
    if (destAirportInput.dataset.autoPopulated === "true") {
      destAirportInput.value = "";
      delete destAirportInput.dataset.autoPopulated;
      delete destAirportInput.dataset.lastAutoVal;
      updateTripCreateRoutePreview(form);
    }
    return;
  }

  const primaryAirport = findPrimaryAirportForDestination(destinationVal);
  if (primaryAirport) {
    const label = formatAirportLabel(primaryAirport);
    if (!destAirportInput.value.trim() || destAirportInput.dataset.autoPopulated === "true" || destAirportInput.value === destAirportInput.dataset.lastAutoVal) {
      destAirportInput.value = label;
      destAirportInput.dataset.autoPopulated = "true";
      destAirportInput.dataset.lastAutoVal = label;
      updateTripCreateRoutePreview(form);
    }
  }
}

export function updateTripCreateRoutePreview(form) {
  if (!form || form.id !== "trip-create-form") return;
  const titleEl = form.querySelector("[data-trip-create-route-title]");
  const subtitleEl = form.querySelector("[data-trip-create-route-subtitle]");
  if (!titleEl || !subtitleEl) return;

  const originValue = form.originAirport?.value || "";
  const destinationValue = form.destinationAirport?.value || "";
  const destinationText = form.destination?.value || "";

  const originAirport = resolveAirportInput(originValue);
  const destinationAirport =
    resolveAirportInput(destinationValue) ||
    findPrimaryAirportForDestination(destinationValue) ||
    findPrimaryAirportForDestination(destinationText);

  const routeDisplay = getFlightRouteDisplay({
    originAirport,
    destinationAirport,
    originIata: originAirport?.iata || "",
    destinationIata: destinationAirport?.iata || "",
    originLabel: originAirport ? formatAirportLabel(originAirport) : originValue.trim() || "Choose origin airport",
    destinationLabel: destinationAirport ? formatAirportLabel(destinationAirport) : destinationValue.trim() || "Choose destination airport",
  });

  titleEl.textContent = `Flight Route: ${routeDisplay.title}`;
  subtitleEl.textContent = routeDisplay.subtitle;
}

export async function handleTransitFlightRouteSubmit(form, { showToast = () => {}, withPageLoader = async (_label, task) => task() } = {}) {
  const originAirport = resolveAirportInput(form.originAirport?.value || "");
  const destinationAirport = resolveAirportInput(form.destinationAirport?.value || "");
  const flightType = normalizeFlightType(form.flightType?.value || "regular");

  if (!originAirport || !destinationAirport) {
    showToast("Choose valid from and to airports.");
    if (!originAirport) form.originAirport?.focus();
    else form.destinationAirport?.focus();
    return false;
  }

  await withPageLoader("Saving route", () => state.updateTripFlightRoute(state.activeTripId, {
    originAirport,
    destinationAirport,
    flightType,
  }));
  showToast(`Flight route saved: ${originAirport.iata} to ${destinationAirport.iata}.`);
  return true;
}

let activeCalendarDate = new Date();

export function toggleMiniCalendarPopover(customBtn) {
  const popover = document.getElementById("mini-calendar-popover");
  if (!popover) return;
  const isHidden = popover.hasAttribute("hidden");
  if (isHidden) {
    const hiddenInput = document.getElementById("trip-create-start-date");
    const currentVal = hiddenInput?.value;
    if (currentVal && /^\d{4}-\d{2}-\d{2}$/.test(currentVal)) {
      activeCalendarDate = new Date(`${currentVal}T12:00:00`);
    } else {
      activeCalendarDate = new Date();
    }
    renderMiniCalendarGrid();
    popover.removeAttribute("hidden");
  } else {
    popover.setAttribute("hidden", "true");
  }
}

export function navigateCalendarMonth(delta = 0) {
  activeCalendarDate.setMonth(activeCalendarDate.getMonth() + delta);
  renderMiniCalendarGrid();
}

export function selectCalendarDate(dateStr) {
  const hiddenInput = document.getElementById("trip-create-start-date");
  const displayText = document.getElementById("start-date-display-text");
  const popover = document.getElementById("mini-calendar-popover");

  if (hiddenInput) hiddenInput.value = dateStr;
  if (displayText) {
    const d = new Date(`${dateStr}T12:00:00`);
    displayText.textContent = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  }
  if (popover) popover.setAttribute("hidden", "true");
}

function renderMiniCalendarGrid() {
  const monthYearEl = document.getElementById("mini-calendar-month-year");
  const gridEl = document.getElementById("mini-calendar-days-grid");
  const hiddenInput = document.getElementById("trip-create-start-date");
  if (!monthYearEl || !gridEl) return;

  const year = activeCalendarDate.getFullYear();
  const month = activeCalendarDate.getMonth();
  const selectedStr = hiddenInput?.value || new Date().toISOString().split("T")[0];

  monthYearEl.textContent = activeCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  let html = "";
  // Empty padding cells for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    html += `<span class="mini-calendar-day empty"></span>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const dateVal = `${year}-${monthStr}-${dayStr}`;

    const isSelected = dateVal === selectedStr;
    const isToday = dateVal === todayStr;

    html += `
      <button type="button" 
        class="mini-calendar-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}" 
        data-action="select-calendar-date" 
        data-date-value="${dateVal}">
        ${day}
      </button>
    `;
  }

  gridEl.innerHTML = html;
}

export function toggleFlightOptionsPanel(toggleCheckbox) {
  const panel = document.getElementById("flight-options-panel");
  if (!panel) return;
  if (toggleCheckbox.checked) {
    panel.classList.remove("is-hidden");
    panel.style.display = "block";
  } else {
    panel.classList.add("is-hidden");
    panel.style.display = "none";
  }
}

export async function handleTripCreateSubmit(form, { showToast = () => {}, withPageLoader = async (_label, task) => task() } = {}) {
  const errorEl = document.getElementById("trip-create-error");
  const submitButton = form.querySelector(".trip-create-submit");
  const destination = form.destination.value.trim();
  const includeFlights = form.includeFlights ? form.includeFlights.checked : true;
  
  let originAirport = null;
  let destinationAirport = null;
  let flightType = "none";

  if (includeFlights) {
    const destVal = form.destinationAirport?.value || "";
    originAirport = resolveAirportInput(form.originAirport?.value || "");
    destinationAirport =
      resolveAirportInput(destVal) ||
      findPrimaryAirportForDestination(destVal) ||
      findPrimaryAirportForDestination(destination);
    flightType = normalizeFlightType(form.flightType?.value || "regular");
  }

  const startDate = form.startDate.value;
  const daysCount = Number(form.daysCount.value) || 7;

  if (!destination) {
    if (errorEl) errorEl.textContent = "Add a destination to create your trip.";
    form.destination.focus();
    return false;
  }

  if (includeFlights && (!originAirport || !destinationAirport)) {
    if (errorEl) errorEl.textContent = "Choose a valid origin and destination airport.";
    if (!originAirport) form.originAirport?.focus();
    else form.destinationAirport?.focus();
    return false;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    submitButton.innerHTML = "Creating trip";
  }

  const starterTasks = [...form.querySelectorAll('input[name="starterTasks"]:checked')]
    .map((input) => input.value);

  await withPageLoader(`Mapping ${destination} · Fetching local spots & route...`, () => state.createCustomTrip({
    destination,
    dates: formatTripDateRange(startDate, daysCount),
    startDate,
    daysCount,
    center: resolveTripCenter(destination),
    checklist: createStarterChecklist(starterTasks),
    originAirport: includeFlights ? originAirport : null,
    destinationAirport: includeFlights ? destinationAirport : null,
    flightType,
  }), { delay: 0 });

  // Check if the trip was created
  showToast(`${destination} trip created.`);
  return true;
}

function formatTripDateRange(startDate, daysCount) {
  if (!startDate) return "Upcoming";
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, Number(daysCount) || 1) - 1);
  const formatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function createStarterChecklist(selected = []) {
  const tasks = {
    flight: { id: "flight", label: "Search flights", completed: false },
    stay: { id: "stay", label: "Book your stay", completed: false },
    food: { id: "food", label: "Find food spots", completed: false },
    map: { id: "map", label: "Build route map", completed: false },
  };
  const checklist = selected.map((id) => tasks[id]).filter(Boolean);
  return checklist.length ? checklist : [{ id: "first-step", label: "Add your first plan", completed: false }];
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
