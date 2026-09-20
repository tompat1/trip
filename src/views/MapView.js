import { state } from "../state.js";
import { getTopAttractionsForTrip, renderPoiMapCanvas } from "../components/PoiMapCanvas.js";

export function renderMapView() {
  const trip = state.activeTrip || {
    id: "guest",
    destination: "Your trip",
    flag: "🗺️",
    center: [48.8566, 2.3522],
    dates: "Dates TBD",
    calendarEvents: [],
  };
  const topPOIs = getTopAttractionsForTrip(trip);

  return `
    <div class="map-page">
      ${renderPoiMapCanvas(trip, topPOIs, { page: true })}
    </div>
  `;
}
