// OurAirports & OPTD Master Data Service for TRIP

export const AIRPORTS_DATABASE = [
  { iata: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', flag: '🇫🇷', lat: 49.0097, lng: 2.5479 },
  { iata: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'France', flag: '🇫🇷', lat: 48.7262, lng: 2.3652 },
  { iata: 'BVA', name: 'Paris Beauvais Airport', city: 'Paris', country: 'France', flag: '🇫🇷', lat: 49.4544, lng: 2.1128 },
  { iata: 'HER', name: 'Heraklion International Airport', city: 'Heraklion (Crete)', country: 'Greece', flag: '🇬🇷', lat: 35.3397, lng: 25.1803 },
  { iata: 'CHQ', name: 'Chania International Airport', city: 'Chania (Crete)', country: 'Greece', flag: '🇬🇷', lat: 35.5317, lng: 24.1497 },
  { iata: 'ATH', name: 'Athens International Airport', city: 'Athens', country: 'Greece', flag: '🇬🇷', lat: 37.9364, lng: 23.9445 },
  { iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', flag: '🇩🇰', lat: 55.6180, lng: 12.6508 },
  { iata: 'BLL', name: 'Billund Airport', city: 'Billund', country: 'Denmark', flag: '🇩🇰', lat: 55.7403, lng: 9.1518 },
  { iata: 'JFK', name: 'John F. Kennedy Airport', city: 'New York', country: 'United States', flag: '🇺🇸', lat: 40.6413, lng: -73.7781 },
  { iata: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'United States', flag: '🇺🇸', lat: 40.7769, lng: -73.8740 },
  { iata: 'EWR', name: 'Newark Liberty International Airport', city: 'New York', country: 'United States', flag: '🇺🇸', lat: 40.6895, lng: -74.1745 },
  { iata: 'BOS', name: 'Boston Logan International Airport', city: 'Boston', country: 'United States', flag: '🇺🇸', lat: 42.3656, lng: -71.0096 },
  { iata: 'IAD', name: 'Washington Dulles International Airport', city: 'Washington', country: 'United States', flag: '🇺🇸', lat: 38.9531, lng: -77.4565 },
  { iata: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', flag: '🇺🇸', lat: 33.6407, lng: -84.4277 },
  { iata: 'ORD', name: "Chicago O'Hare International Airport", city: 'Chicago', country: 'United States', flag: '🇺🇸', lat: 41.9742, lng: -87.9073 },
  { iata: 'DFW', name: 'Dallas Fort Worth International Airport', city: 'Dallas', country: 'United States', flag: '🇺🇸', lat: 32.8998, lng: -97.0403 },
  { iata: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States', flag: '🇺🇸', lat: 39.8561, lng: -104.6737 },
  { iata: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', flag: '🇺🇸', lat: 33.9416, lng: -118.4085 },
  { iata: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', flag: '🇺🇸', lat: 37.6213, lng: -122.3790 },
  { iata: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States', flag: '🇺🇸', lat: 47.4502, lng: -122.3088 },
  { iata: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', flag: '🇺🇸', lat: 25.7959, lng: -80.2870 },
  { iata: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', flag: '🇨🇦', lat: 43.6777, lng: -79.6248 },
  { iata: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', flag: '🇨🇦', lat: 49.1967, lng: -123.1815 },
  { iata: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.4700, lng: -0.4543 },
  { iata: 'LGW', name: 'London Gatwick Airport', city: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.1537, lng: -0.1821 },
  { iata: 'STN', name: 'London Stansted Airport', city: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.8850, lng: 0.2350 },
  { iata: 'LTN', name: 'London Luton Airport', city: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.8747, lng: -0.3683 },
  { iata: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'United Kingdom', flag: '🇬🇧', lat: 53.3537, lng: -2.2750 },
  { iata: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'United Kingdom', flag: '🇬🇧', lat: 55.9500, lng: -3.3725 },
  { iata: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', flag: '🇮🇪', lat: 53.4213, lng: -6.2701 },
  { iata: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', flag: '🇸🇪', lat: 59.6498, lng: 17.9238 },
  { iata: 'NYO', name: 'Stockholm Skavsta Airport', city: 'Stockholm', country: 'Sweden', flag: '🇸🇪', lat: 58.7886, lng: 16.9122 },
  { iata: 'GOT', name: 'Göteborg Landvetter Airport', city: 'Gothenburg', country: 'Sweden', flag: '🇸🇪', lat: 57.6628, lng: 12.2798 },
  { iata: 'OSL', name: 'Oslo Airport', city: 'Oslo', country: 'Norway', flag: '🇳🇴', lat: 60.1939, lng: 11.1004 },
  { iata: 'TRF', name: 'Sandefjord Airport Torp', city: 'Oslo', country: 'Norway', flag: '🇳🇴', lat: 59.1867, lng: 10.2586 },
  { iata: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'Finland', flag: '🇫🇮', lat: 60.3172, lng: 24.9633 },
  { iata: 'KEF', name: 'Keflavík International Airport', city: 'Reykjavík', country: 'Iceland', flag: '🇮🇸', lat: 63.9850, lng: -22.6056 },
  { iata: 'MAD', name: 'Adolfo Suárez Madrid-Barajas Airport', city: 'Madrid', country: 'Spain', flag: '🇪🇸', lat: 40.4983, lng: -3.5676 },
  { iata: 'BCN', name: 'Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain', flag: '🇪🇸', lat: 41.2974, lng: 2.0833 },
  { iata: 'AGP', name: 'Málaga-Costa del Sol Airport', city: 'Málaga', country: 'Spain', flag: '🇪🇸', lat: 36.6749, lng: -4.4991 },
  { iata: 'ALC', name: 'Alicante-Elche Miguel Hernández Airport', city: 'Alicante', country: 'Spain', flag: '🇪🇸', lat: 38.2822, lng: -0.5582 },
  { iata: 'PMI', name: 'Palma de Mallorca Airport', city: 'Palma de Mallorca', country: 'Spain', flag: '🇪🇸', lat: 39.5517, lng: 2.7388 },
  { iata: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹', lat: 38.7742, lng: -9.1342 },
  { iata: 'OPO', name: 'Porto Airport', city: 'Porto', country: 'Portugal', flag: '🇵🇹', lat: 41.2481, lng: -8.6814 },
  { iata: 'FCO', name: 'Rome Fiumicino Airport', city: 'Rome', country: 'Italy', flag: '🇮🇹', lat: 41.8003, lng: 12.2389 },
  { iata: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy', flag: '🇮🇹', lat: 45.6306, lng: 8.7281 },
  { iata: 'BGY', name: 'Milan Bergamo Airport', city: 'Milan', country: 'Italy', flag: '🇮🇹', lat: 45.6739, lng: 9.7042 },
  { iata: 'VCE', name: 'Venice Marco Polo Airport', city: 'Venice', country: 'Italy', flag: '🇮🇹', lat: 45.5053, lng: 12.3519 },
  { iata: 'NAP', name: 'Naples International Airport', city: 'Naples', country: 'Italy', flag: '🇮🇹', lat: 40.8860, lng: 14.2908 },
  { iata: 'BER', name: 'Berlin Brandenburg Airport', city: 'Berlin', country: 'Germany', flag: '🇩🇪', lat: 52.3667, lng: 13.5033 },
  { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', flag: '🇩🇪', lat: 50.0379, lng: 8.5622 },
  { iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', flag: '🇩🇪', lat: 48.3538, lng: 11.7861 },
  { iata: 'DUS', name: 'Düsseldorf Airport', city: 'Düsseldorf', country: 'Germany', flag: '🇩🇪', lat: 51.2895, lng: 6.7668 },
  { iata: 'CGN', name: 'Cologne Bonn Airport', city: 'Cologne', country: 'Germany', flag: '🇩🇪', lat: 50.8659, lng: 7.1427 },
  { iata: 'AMS', name: 'Amsterdam Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', lat: 52.3105, lng: 4.7683 },
  { iata: 'EIN', name: 'Eindhoven Airport', city: 'Eindhoven', country: 'Netherlands', flag: '🇳🇱', lat: 51.4501, lng: 5.3745 },
  { iata: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'Belgium', flag: '🇧🇪', lat: 50.9014, lng: 4.4844 },
  { iata: 'CRL', name: 'Brussels South Charleroi Airport', city: 'Brussels', country: 'Belgium', flag: '🇧🇪', lat: 50.4592, lng: 4.4538 },
  { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', flag: '🇨🇭', lat: 47.4581, lng: 8.5555 },
  { iata: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland', flag: '🇨🇭', lat: 46.2381, lng: 6.1089 },
  { iata: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria', flag: '🇦🇹', lat: 48.1103, lng: 16.5697 },
  { iata: 'PRG', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'Czechia', flag: '🇨🇿', lat: 50.1008, lng: 14.2632 },
  { iata: 'BUD', name: 'Budapest Ferenc Liszt International Airport', city: 'Budapest', country: 'Hungary', flag: '🇭🇺', lat: 47.4394, lng: 19.2619 },
  { iata: 'RIX', name: 'Riga International Airport', city: 'Riga', country: 'Latvia', flag: '🇱🇻', lat: 56.9236, lng: 23.9711 },
  { iata: 'TLL', name: 'Tallinn Airport', city: 'Tallinn', country: 'Estonia', flag: '🇪🇪', lat: 59.4133, lng: 24.8328 },
  { iata: 'VNO', name: 'Vilnius Airport', city: 'Vilnius', country: 'Lithuania', flag: '🇱🇹', lat: 54.6341, lng: 25.2858 },
  { iata: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland', flag: '🇵🇱', lat: 52.1657, lng: 20.9671 },
  { iata: 'GDN', name: 'Gdańsk Lech Wałęsa Airport', city: 'Gdańsk', country: 'Poland', flag: '🇵🇱', lat: 54.3776, lng: 18.4662 },
  { iata: 'KRK', name: 'Kraków John Paul II International Airport', city: 'Kraków', country: 'Poland', flag: '🇵🇱', lat: 50.0777, lng: 19.7848 },
  { iata: 'KTW', name: 'Katowice Airport', city: 'Katowice', country: 'Poland', flag: '🇵🇱', lat: 50.4743, lng: 19.0800 },
  { iata: 'WRO', name: 'Wrocław Airport', city: 'Wrocław', country: 'Poland', flag: '🇵🇱', lat: 51.1027, lng: 16.8858 },
  { iata: 'POZ', name: 'Poznań-Ławica Airport', city: 'Poznań', country: 'Poland', flag: '🇵🇱', lat: 52.4210, lng: 16.8263 },
  { iata: 'OTP', name: 'Henri Coandă International Airport', city: 'Bucharest', country: 'Romania', flag: '🇷🇴', lat: 44.5711, lng: 26.0850 },
  { iata: 'SOF', name: 'Sofia Airport', city: 'Sofia', country: 'Bulgaria', flag: '🇧🇬', lat: 42.6967, lng: 23.4114 },
  { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', flag: '🇹🇷', lat: 41.2753, lng: 28.7519 },
  { iata: 'SAW', name: 'Istanbul Sabiha Gökçen Airport', city: 'Istanbul', country: 'Turkey', flag: '🇹🇷', lat: 40.8986, lng: 29.3092 },
  { iata: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', flag: '🇦🇪', lat: 25.2532, lng: 55.3657 },
  { iata: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', flag: '🇶🇦', lat: 25.2731, lng: 51.6081 },
  { iata: 'AUH', name: 'Zayed International Airport', city: 'Abu Dhabi', country: 'United Arab Emirates', flag: '🇦🇪', lat: 24.4539, lng: 54.3773 },
  { iata: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', flag: '🇸🇬', lat: 1.3644, lng: 103.9915 },
  { iata: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭', lat: 13.6900, lng: 100.7501 },
  { iata: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', flag: '🇭🇰', lat: 22.3080, lng: 113.9185 },
  { iata: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', flag: '🇰🇷', lat: 37.4602, lng: 126.4407 },
  { iata: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', flag: '🇯🇵', lat: 35.5494, lng: 139.7798 },
  { iata: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', flag: '🇯🇵', lat: 35.7719, lng: 140.3929 },
  { iata: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'Japan', flag: '🇯🇵', lat: 34.4347, lng: 135.2441 },
  { iata: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', flag: '🇦🇺', lat: -33.9461, lng: 151.1772 },
  { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', flag: '🇦🇺', lat: -37.6690, lng: 144.8410 },
  { iata: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', flag: '🇳🇿', lat: -37.0082, lng: 174.7850 }
];

const dynamicAirports = new Map();

export function getAirportByIata(iata) {
  if (!iata) return null;
  return getAllKnownAirports().find(a => a.iata.toUpperCase() === iata.toUpperCase()) || null;
}

export function searchAirports(query) {
  const airports = getAllKnownAirports();
  if (!query || query.trim().length === 0) return airports;
  const q = normalizeAirportSearchText(query);
  return airports.filter(a => 
    normalizeAirportSearchText(a.iata).includes(q) ||
    normalizeAirportSearchText(a.city).includes(q) ||
    normalizeAirportSearchText(a.name).includes(q) ||
    normalizeAirportSearchText(a.country).includes(q)
  );
}

export async function searchAirportsWorldwide(query, options = {}) {
  const local = searchAirports(query).slice(0, options.localLimit || 12);
  const keyword = String(query || "").trim();
  if (keyword.length < 2) return local;

  try {
    const apiBase = getTripApiBase();
    if (!apiBase && typeof window === "undefined") return local;
    const url = new URL(`${apiBase}/api/airports/search`, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("max", String(options.max || 18));
    const res = await (options.fetchImpl || fetch)(url.href, { headers: { Accept: "application/json" } });
    if (!res.ok && res.status !== 503) throw new Error(`airport-search-http-${res.status}`);
    const data = await res.json().catch(() => ({}));
    const live = data.airports || [];
    registerDynamicAirports(live);
    if (live.length) return dedupeAirports([...live, ...local]).slice(0, options.max || 24);
    return local;
  } catch {
    return local;
  }
}

export function formatAirportLabel(airport) {
  if (!airport) return "";
  return `${airport.city} (${airport.iata}) - ${airport.name}`;
}

export function getAirportDisplayName(airport, fallback = "") {
  if (airport?.name && airport?.iata) return `${airport.flag || ""} ${airport.name} (${airport.iata})`.trim();
  if (airport?.name) return airport.name;
  return fallback;
}

export function getFlightRouteDisplay(route = {}, flightSearch = {}) {
  const searchRoute = flightSearch.route || {};
  const originAirport = route.originAirport || searchRoute.originAirport || null;
  const destinationAirport = route.destinationAirport || searchRoute.destinationAirport || null;
  const originIata = route.originIata || searchRoute.originIata || originAirport?.iata || "";
  const destinationIata = route.destinationIata || searchRoute.destinationIata || destinationAirport?.iata || "";
  const originName = getAirportDisplayName(originAirport, route.originLabel || searchRoute.originLabel || originIata || "Choose origin airport");
  const destinationName = getAirportDisplayName(destinationAirport, route.destinationLabel || searchRoute.destinationLabel || destinationIata || "Choose destination airport");

  return {
    title: `${originIata || "Origin"} to ${destinationIata || "Destination"}`,
    subtitle: `${originName} → ${destinationName}`,
  };
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

function dedupeAirports(airports = []) {
  const seen = new Map();
  for (const airport of airports) {
    if (!airport?.iata) continue;
    const iata = airport.iata.toUpperCase();
    if (!seen.has(iata)) seen.set(iata, { ...airport, iata });
  }
  return [...seen.values()];
}

function getAllKnownAirports() {
  return dedupeAirports([...dynamicAirports.values(), ...AIRPORTS_DATABASE]);
}

function registerDynamicAirports(airports = []) {
  airports.forEach((airport) => {
    if (!airport?.iata) return;
    dynamicAirports.set(airport.iata.toUpperCase(), {
      ...airport,
      iata: airport.iata.toUpperCase(),
      city: airport.city || airport.name || "",
      country: airport.country || "",
      flag: airport.flag || "✈️",
    });
  });
}

function normalizeAirportSearchText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getTripApiBase() {
  const envBase = import.meta.env?.VITE_TRIP_API_BASE;
  if (envBase) return envBase;
  if (typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
    return "https://trip.thomasrynell.workers.dev";
  }
  return "";
}
