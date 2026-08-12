import { state } from "../state.js";
import { enrichmentService } from "../enrichment/enrichmentService.js";
import { fetchConcertsForTrip } from "../services/concertService.js";
import { fetchOpenMeteoWeather } from "../services/weatherService.js";

const scannedTripIds = new Set();

export function scheduleBackgroundEnrichmentScan(delayMs = 200, force = false) {
  setTimeout(() => {
    runBackgroundEnrichmentScan(force);
  }, delayMs);
}

export async function runBackgroundEnrichmentScan(force = false) {
  try {
    const trip = state.activeTrip;
    if (!trip || !trip.id || !Array.isArray(trip.center)) return;
    if (scannedTripIds.has(trip.id) && !force) return;
    scannedTripIds.add(trip.id);

    const coords = trip.center || [48.8566, 2.3522];

    fetchOpenMeteoWeather(coords[0], coords[1]).then((weatherData) => {
      if (weatherData && weatherData.temp) {
        trip.weather = weatherData;
        state.notify();
      }
    }).catch(() => {});

    // Automatically trigger full tourism discovery scan for this trip location
    state.refreshTourismDiscovery(trip.id, { force });

    const res = await enrichmentService.discoverNearby({
      coordinates: coords,
      radiusMeters: 3500,
      personas: Array.from(state.userPreferences || []),
    }).catch(() => null);

    if (res && res.places && res.places.length > 0) {
      state.liveNearbyPlaces = res.places;
      state.liveNearbyPlacesTripId = trip.id;

      if (!trip.mapPins) trip.mapPins = [];
      if (!trip.tourismPois) trip.tourismPois = [];

      const existingTitles = new Set(trip.mapPins.map((p) => String(p.name || p.title || "").toLowerCase().trim()));

      res.places.forEach((place, idx) => {
        const title = place.title || place.name;
        if (!title) return;
        const titleLower = title.toLowerCase().trim();
        if (existingTitles.has(titleLower)) return;
        existingTitles.add(titleLower);

        const lat = place.lat || place.coordinates?.[0] || coords[0];
        const lng = place.lng || place.coordinates?.[1] || coords[1];
        const category = place.category || place.kind || "Attraction";
        const catLower = category.toLowerCase();
        const icon = place.icon || (catLower.includes("museum") || catLower.includes("art") ? "🏛️" :
                                   catLower.includes("church") || catLower.includes("basilica") ? "⛪" :
                                   catLower.includes("cafe") || catLower.includes("bistro") ? "☕" :
                                   catLower.includes("shopping") || catLower.includes("store") ? "🛍️" : "📍");

        const newPin = {
          id: place.id || `dynamic-bg-pin-${idx}`,
          name: title,
          title,
          lat,
          lng,
          category,
          icon,
          rating: place.rating || 4.8,
          image: place.image || place.photoUrl || place.heroImage,
          geoLabel: place.geoLabel || place.subtitle || `${trip.destination}`
        };

        trip.mapPins.push(newPin);
        trip.tourismPois.push(newPin);
      });
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
