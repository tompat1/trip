// OurAirports & OPTD Master Data Service for TRIP

export const AIRPORTS_DATABASE = [
  { iata: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', flag: '🇫🇷', lat: 49.0097, lng: 2.5479 },
  { iata: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'France', flag: '🇫🇷', lat: 48.7262, lng: 2.3652 },
  { iata: 'BVA', name: 'Paris Beauvais Airport', city: 'Paris', country: 'France', flag: '🇫🇷', lat: 49.4544, lng: 2.1128 },
  { iata: 'HER', name: 'Heraklion International Airport', city: 'Heraklion (Crete)', country: 'Greece', flag: '🇬🇷', lat: 35.3397, lng: 25.1803 },
  { iata: 'CHQ', name: 'Chania International Airport', city: 'Chania (Crete)', country: 'Greece', flag: '🇬🇷', lat: 35.5317, lng: 24.1497 },
  { iata: 'ATH', name: 'Athens International Airport', city: 'Athens', country: 'Greece', flag: '🇬🇷', lat: 37.9364, lng: 23.9445 },
  { iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', flag: '🇩🇰', lat: 55.6180, lng: 12.6508 },
  { iata: 'JFK', name: 'John F. Kennedy Airport', city: 'New York', country: 'United States', flag: '🇺🇸', lat: 40.6413, lng: -73.7781 },
  { iata: 'EWR', name: 'Newark Liberty International Airport', city: 'New York', country: 'United States', flag: '🇺🇸', lat: 40.6895, lng: -74.1745 },
  { iata: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.4700, lng: -0.4543 },
  { iata: 'STN', name: 'London Stansted Airport', city: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.8850, lng: 0.2350 },
  { iata: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', flag: '🇸🇪', lat: 59.6498, lng: 17.9238 },
  { iata: 'NYO', name: 'Stockholm Skavsta Airport', city: 'Stockholm', country: 'Sweden', flag: '🇸🇪', lat: 58.7886, lng: 16.9122 },
  { iata: 'MAD', name: 'Adolfo Suárez Madrid-Barajas Airport', city: 'Madrid', country: 'Spain', flag: '🇪🇸', lat: 40.4983, lng: -3.5676 },
  { iata: 'BCN', name: 'Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain', flag: '🇪🇸', lat: 41.2974, lng: 2.0833 },
  { iata: 'FCO', name: 'Rome Fiumicino Airport', city: 'Rome', country: 'Italy', flag: '🇮🇹', lat: 41.8003, lng: 12.2389 },
  { iata: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy', flag: '🇮🇹', lat: 45.6306, lng: 8.7281 },
  { iata: 'BER', name: 'Berlin Brandenburg Airport', city: 'Berlin', country: 'Germany', flag: '🇩🇪', lat: 52.3667, lng: 13.5033 },
  { iata: 'AMS', name: 'Amsterdam Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', lat: 52.3105, lng: 4.7683 },
  { iata: 'BUD', name: 'Budapest Ferenc Liszt International Airport', city: 'Budapest', country: 'Hungary', flag: '🇭🇺', lat: 47.4394, lng: 19.2619 },
  { iata: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland', flag: '🇵🇱', lat: 52.1657, lng: 20.9671 },
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

export function formatAirportLabel(airport) {
  if (!airport) return "";
  return `${airport.city} (${airport.iata}) - ${airport.name}`;
}

export function resolveAirportInput(input = "") {
  const value = input.trim();
  if (!value) return null;
  const iataMatch = value.match(/\b[A-Z]{3}\b/i);
  if (iataMatch) {
    const airport = getAirportByIata(iataMatch[0]);
    if (airport) return airport;
  }
  return searchAirports(value)[0] || null;
}

export function findPrimaryAirportForDestination(destination = "") {
  const city = String(destination).split(",")[0].trim();
  return resolveAirportInput(city) || resolveAirportInput(destination);
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
