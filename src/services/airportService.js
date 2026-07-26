// OurAirports & OPTD Master Data Service for TRIP

export const AIRPORTS_DATABASE = [
  { iata: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', flag: '🇫🇷', lat: 49.0097, lng: 2.5479 },
  { iata: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'France', flag: '🇫🇷', lat: 48.7262, lng: 2.3652 },
  { iata: 'HER', name: 'Heraklion International Airport', city: 'Heraklion (Crete)', country: 'Greece', flag: '🇬🇷', lat: 35.3397, lng: 25.1803 },
  { iata: 'CHQ', name: 'Chania International Airport', city: 'Chania (Crete)', country: 'Greece', flag: '🇬🇷', lat: 35.5317, lng: 24.1497 },
  { iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', flag: '🇩🇰', lat: 55.6180, lng: 12.6508 },
  { iata: 'JFK', name: 'John F. Kennedy Airport', city: 'New York', country: 'United States', flag: '🇺🇸', lat: 40.6413, lng: -73.7781 },
  { iata: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.4700, lng: -0.4543 },
  { iata: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', flag: '🇸🇪', lat: 59.6498, lng: 17.9238 },
  { iata: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', flag: '🇯🇵', lat: 35.5494, lng: 139.7798 },
  { iata: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', flag: '🇦🇺', lat: -33.9461, lng: 151.1772 }
];

export function getAirportByIata(iata) {
  if (!iata) return null;
  return AIRPORTS_DATABASE.find(a => a.iata.toUpperCase() === iata.toUpperCase()) || null;
}

export function searchAirports(query) {
  if (!query || query.trim().length === 0) return AIRPORTS_DATABASE;
  const q = query.toLowerCase().trim();
  return AIRPORTS_DATABASE.filter(a => 
    a.iata.toLowerCase().includes(q) ||
    a.city.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q) ||
    a.country.toLowerCase().includes(q)
  );
}

// Calculate flight distance between two airports (Haversine formula in km)
export function calculateFlightDistance(iataFrom, iataTo) {
  const from = getAirportByIata(iataFrom);
  const to = getAirportByIata(iataTo);
  if (!from || !to) return null;

  const R = 6371; // Earth radius in km
  const dLat = (to.lat - from.lat) * (Math.PI / 180);
  const dLng = (to.lng - from.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * (Math.PI / 180)) *
      Math.cos(to.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c);

  // Estimate direct flight duration (approx 800 km/h average speed + 30m takeoff/landing)
  const durationHours = (distanceKm / 800) + 0.5;
  const hours = Math.floor(durationHours);
  const mins = Math.round((durationHours - hours) * 60);

  return {
    distanceKm,
    estimatedFlightTime: `${hours}h ${mins}m`,
    fromAirport: from,
    toAirport: to
  };
}
