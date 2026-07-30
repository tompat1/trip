import { state } from "../state.js";
import { enrichmentService } from "../enrichment/enrichmentService.js";
import { fetchConcertsForTrip } from "../services/concertService.js";
import { fetchOpenMeteoWeather } from "../services/weatherService.js";

let scanTriggered = false;

export function scheduleBackgroundEnrichmentScan(delayMs = 200) {
  setTimeout(() => {
    runBackgroundEnrichmentScan();
  }, delayMs);
}

export async function runBackgroundEnrichmentScan() {
  if (scanTriggered) return;
  scanTriggered = true;

  try {
    const trip = state.activeTrip;
    const coords = trip.center || [48.8566, 2.3522];

    fetchOpenMeteoWeather(coords[0], coords[1]).then((weatherData) => {
      if (weatherData && weatherData.temp) {
        trip.weather = weatherData;
        state.notify();
      }
    }).catch(() => {});

    const res = await enrichmentService.discoverNearby({
      coordinates: coords,
      radiusMeters: 2500,
      personas: Array.from(state.userPreferences || []),
    }).catch(() => null);

    if (res && res.places && res.places.length > 0) {
      state.liveNearbyPlaces = res.places;
      state.liveNearbyPlacesTripId = trip.id;
    }

    const concertEnrichmentData = await fetchConcertsForTrip(trip.destination, coords);

    if (!trip.events) trip.events = [];
    const existingTitles = new Set(trip.events.map((event) => event.title));
    (concertEnrichmentData || []).forEach((concert) => {
      if (!existingTitles.has(concert.title)) {
        trip.events.unshift(concert);
      }
    });

    state.notify();
  } catch (err) {
    console.warn("Background enrichment scan completed with fallback.", err);
  }
}
