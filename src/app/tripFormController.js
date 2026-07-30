import { state } from "../state.js";
import { formatAirportLabel, getFlightRouteDisplay, resolveAirportInput, searchAirportsWorldwide } from "../services/airportService.js";
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

export function updateTripCreateRoutePreview(form) {
  if (!form || form.id !== "trip-create-form") return;
  const titleEl = form.querySelector("[data-trip-create-route-title]");
  const subtitleEl = form.querySelector("[data-trip-create-route-subtitle]");
  if (!titleEl || !subtitleEl) return;

  const originValue = form.originAirport?.value || "";
  const destinationValue = form.destinationAirport?.value || "";
  const originAirport = resolveAirportInput(originValue);
  const destinationAirport = resolveAirportInput(destinationValue);
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

export async function handleTripCreateSubmit(form, { showToast = () => {}, withPageLoader = async (_label, task) => task() } = {}) {
  const errorEl = document.getElementById("trip-create-error");
  const submitButton = form.querySelector(".trip-create-submit");
  const destination = form.destination.value.trim();
  const originAirport = resolveAirportInput(form.originAirport?.value || "");
  const destinationAirport = resolveAirportInput(form.destinationAirport?.value || destination);
  const startDate = form.startDate.value;
  const daysCount = Number(form.daysCount.value) || 7;
  const flightType = normalizeFlightType(form.flightType?.value || "regular");

  if (!destination) {
    if (errorEl) errorEl.textContent = "Add a destination to create your trip.";
    form.destination.focus();
    return false;
  }

  if (!originAirport || !destinationAirport) {
    if (errorEl) errorEl.textContent = "Choose a valid origin and destination airport.";
    if (!originAirport) form.originAirport.focus();
    else form.destinationAirport.focus();
    return false;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    submitButton.innerHTML = "Creating trip";
  }

  const starterTasks = [...form.querySelectorAll('input[name="starterTasks"]:checked')]
    .map((input) => input.value);

  await withPageLoader("Creating trip", () => state.createCustomTrip({
    destination,
    dates: formatTripDateRange(startDate, daysCount),
    startDate,
    daysCount,
    center: destinationAirport ? [destinationAirport.lat, destinationAirport.lng] : resolveTripCenter(destination),
    checklist: createStarterChecklist(starterTasks),
    originAirport,
    destinationAirport,
    flightType,
  }), { delay: 0 });

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
