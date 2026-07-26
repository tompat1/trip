import { calculateFlightDistance, findPrimaryAirportForDestination, getAirportByIata } from "./airportService.js";

export const FLIGHT_TYPE_OPTIONS = [
  { id: "regular", label: "Regular airlines", hint: "Network carriers, better schedules, stronger baggage options." },
  { id: "lowfare", label: "Low-fare jets", hint: "Ryanair, Wizz Air, easyJet style fares and secondary airports." },
  { id: "charter", label: "Charter", hint: "Seasonal leisure flights, package-holiday friendly routes." },
];

const FALLBACK_AIRLINES = {
  regular: [
    { airline: "Air France", code: "AF", score: 92 },
    { airline: "SAS", code: "SK", score: 86 },
    { airline: "Lufthansa", code: "LH", score: 84 },
  ],
  lowfare: [
    { airline: "Ryanair", code: "FR", score: 88 },
    { airline: "Wizz Air", code: "W6", score: 84 },
    { airline: "easyJet", code: "U2", score: 82 },
  ],
  charter: [
    { airline: "Sunclass Airlines", code: "DK", score: 86 },
    { airline: "TUI fly", code: "X3", score: 82 },
    { airline: "Norwegian", code: "D8", score: 80 },
  ],
};

export function normalizeFlightType(value = "regular") {
  return FLIGHT_TYPE_OPTIONS.some((option) => option.id === value) ? value : "regular";
}

export function getFlightRouteForTrip(trip = {}) {
  const route = trip.flightRoute || {};
  const originAirport = getAirportByIata(route.originIata) || route.originAirport || null;
  const destinationAirport = getAirportByIata(route.destinationIata) || route.destinationAirport || findPrimaryAirportForDestination(trip.destination);
  return {
    originAirport,
    destinationAirport,
    originIata: originAirport?.iata || route.originIata || "",
    destinationIata: destinationAirport?.iata || route.destinationIata || "",
    flightType: normalizeFlightType(route.flightType || trip.flightPreference || "regular"),
    departureDate: route.departureDate || trip.startDate || "",
  };
}

export async function searchFlightsForTrip(trip = {}, options = {}) {
  const route = getFlightRouteForTrip(trip);
  if (!route.originIata || !route.destinationIata) {
    return {
      status: "needs-route",
      source: "trip-route",
      offers: [],
      route,
      message: "Add both origin and destination airports to search flights.",
    };
  }

  const query = {
    originIata: route.originIata,
    destinationIata: route.destinationIata,
    departureDate: options.departureDate || route.departureDate,
    adults: options.adults || 1,
    flightType: normalizeFlightType(options.flightType || route.flightType),
  };

  const live = await searchFlightsViaWorker(query, options).catch((error) => ({
    status: "fallback",
    error: error?.message || "flight-worker-failed",
    offers: [],
  }));

  if (live.status === "ready" && live.offers?.length) {
    return { ...live, route, query };
  }

  return {
    status: live.status === "not-configured" ? "not-configured" : "fallback",
    source: "local-estimate",
    providerStatus: live.providerStatus || [],
    error: live.error || "",
    route,
    query,
    offers: createEstimatedFlightOffers(query),
  };
}

async function searchFlightsViaWorker(query, options = {}) {
  const apiBase = getTripApiBase();
  const fetchImpl = options.fetchImpl || fetch;
  if (!apiBase && typeof window === "undefined") throw new Error("missing-api-base");
  const url = new URL(`${apiBase}/api/flights/search`, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  Object.entries(query).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const res = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    if (res.status === 503) return { status: "not-configured", offers: [] };
    throw new Error(`flight-search-http-${res.status}`);
  }
  return res.json();
}

export function createEstimatedFlightOffers(query = {}) {
  const distance = calculateFlightDistance(query.originIata, query.destinationIata);
  if (!distance) return [];
  const type = normalizeFlightType(query.flightType);
  const airlines = FALLBACK_AIRLINES[type] || FALLBACK_AIRLINES.regular;
  const basePrice = getBasePrice(distance.distanceKm, type);

  return airlines.map((airline, index) => {
    const departHour = type === "charter" ? 7 + index * 2 : 6 + index * 4;
    const stops = type === "regular" && index === 2 ? 1 : 0;
    const price = Math.round(basePrice + index * (type === "lowfare" ? 24 : 46) + stops * 35);
    return {
      id: `estimate-${query.originIata}-${query.destinationIata}-${type}-${index}`,
      airline: airline.airline,
      airlineCode: airline.code,
      originIata: query.originIata,
      destinationIata: query.destinationIata,
      departureDate: query.departureDate || "",
      departureTime: `${String(departHour).padStart(2, "0")}:${index === 1 ? "35" : "10"}`,
      arrivalTime: addMinutes(`${String(departHour).padStart(2, "0")}:${index === 1 ? "35" : "10"}`, durationToMinutes(distance.estimatedFlightTime) + stops * 75),
      duration: stops ? `${distance.estimatedFlightTime} + connection` : distance.estimatedFlightTime,
      stops,
      price,
      currency: "EUR",
      flightType: type,
      score: airline.score - index * 4 - stops * 8,
      source: "Estimated from airport master data",
      bookingHint: type === "lowfare" ? "Check baggage and secondary airport transfer time." : type === "charter" ? "Best checked against package/seasonal operators." : "Good baseline for full-service flight planning.",
    };
  });
}

function getBasePrice(distanceKm, type) {
  const perKm = type === "lowfare" ? 0.055 : type === "charter" ? 0.07 : 0.095;
  const floor = type === "lowfare" ? 39 : type === "charter" ? 89 : 119;
  return Math.max(floor, Math.round(distanceKm * perKm));
}

function durationToMinutes(label = "") {
  const match = String(label).match(/(\d+)h\s+(\d+)m/);
  if (!match) return 120;
  return Number(match[1]) * 60 + Number(match[2]);
}

function addMinutes(time, minutes) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getTripApiBase() {
  const envBase = import.meta.env?.VITE_TRIP_API_BASE;
  if (envBase) return envBase;
  if (typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
    return "https://trip.thomasrynell.workers.dev";
  }
  return "";
}
