// Concert & Live Music Discovery Service for TRIP
// Integrates Ticketmaster / Bandsintown APIs with fallback destination concert data

export const CONCERTS_DATABASE = [
  // Paris Concerts
  {
    id: "cnc-paris-1",
    artist: "Coldplay",
    tour: "Music of the Spheres World Tour",
    title: "Coldplay Live at Stade de France",
    venue: "Stade de France",
    city: "Paris",
    country: "France",
    lat: 48.9244,
    lng: 2.3601,
    dates: "Tonight • 20:00",
    genre: "Rock / Pop",
    icon: "🎸",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.ticketmaster.fr",
    isPopularTour: true
  },
  {
    id: "cnc-paris-2",
    artist: "Ludovico Einaudi",
    tour: "Piano & Strings Ensemble",
    title: "Ludovico Einaudi Solo Piano",
    venue: "Philharmonie de Paris",
    city: "Paris",
    country: "France",
    lat: 48.8915,
    lng: 2.3939,
    dates: "Tomorrow • 19:30",
    genre: "Classical / Ambient",
    icon: "🎻",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://philharmoniedeparis.fr",
    isPopularTour: true
  },
  {
    id: "cnc-paris-3",
    artist: "Peggy Gou",
    tour: "Open Air Electronic Special",
    title: "Peggy Gou Live DJ Set",
    venue: "Accor Arena Paris",
    city: "Paris",
    country: "France",
    lat: 48.8386,
    lng: 2.3786,
    dates: "Oct 5 • 22:00",
    genre: "Electronic / House",
    icon: "🎧",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.accorarena.com",
    isPopularTour: true
  },
  {
    id: "cnc-paris-4",
    artist: "Arctic Monkeys",
    tour: "The Car European Tour",
    title: "Arctic Monkeys Intimate Gig",
    venue: "L'Olympia Paris",
    city: "Paris",
    country: "France",
    lat: 48.8702,
    lng: 2.3283,
    dates: "Oct 6 • 20:30",
    genre: "Indie Rock",
    icon: "🎤",
    image: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.olympiahall.com",
    isPopularTour: true
  },
  // Crete / Greece Concerts
  {
    id: "cnc-crete-1",
    artist: "Cretan Lyra Ensemble",
    tour: "Venetian Fortress Summer Nights",
    title: "Traditional Lyra & Lute Live Festival",
    venue: "Koules Venetian Fortress",
    city: "Heraklion",
    country: "Greece",
    lat: 35.3444,
    lng: 25.1372,
    dates: "Tonight • 21:00",
    genre: "Folk / World",
    icon: "🪕",
    image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.ticketservices.gr",
    isPopularTour: false
  },
  {
    id: "cnc-crete-2",
    artist: "Chania Sunset Acoustic",
    tour: "Old Harbor Live Music Sessions",
    title: "Greek Mediterranean Jazz Night",
    venue: "Chania Old Venetian Harbor",
    city: "Chania",
    country: "Greece",
    lat: 35.5175,
    lng: 24.0181,
    dates: "Tomorrow • 20:30",
    genre: "Jazz / Fusion",
    icon: "🎷",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.chania-culture.gr",
    isPopularTour: false
  },
  // Tokyo Concerts
  {
    id: "cnc-tokyo-1",
    artist: "Hans Zimmer",
    tour: "The World of Hans Zimmer",
    title: "Hans Zimmer Live in Tokyo",
    venue: "Nippon Budokan",
    city: "Tokyo",
    country: "Japan",
    lat: 35.6933,
    lng: 139.7500,
    dates: "Oct 12 • 19:00",
    genre: "Symphonic / Film Score",
    icon: "🎼",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://eplus.jp",
    isPopularTour: true
  }
];

// Query Ticketmaster API for real-time live concerts
export async function fetchTicketmasterConcerts(options = {}) {
  const apiKey = options.apiKey || import.meta.env?.VITE_TICKETMASTER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("classificationName", "music");
    if (options.lat && options.lng) {
      url.searchParams.set("latlong", `${options.lat},${options.lng}`);
      url.searchParams.set("radius", options.radius || "50");
      url.searchParams.set("unit", "km");
    }
    if (options.keyword) {
      url.searchParams.set("keyword", options.keyword);
    }
    url.searchParams.set("size", "10");

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    const events = data._embedded?.events || [];
    return events.map((e) => ({
      id: e.id,
      artist: e.name || "Live Performance",
      tour: e.promoter?.name || "Live Concert",
      title: e.name,
      venue: e._embedded?.venues?.[0]?.name || "Local Concert Venue",
      city: e._embedded?.venues?.[0]?.city?.name || "",
      country: e._embedded?.venues?.[0]?.country?.name || "",
      lat: Number(e._embedded?.venues?.[0]?.location?.latitude || 0),
      lng: Number(e._embedded?.venues?.[0]?.location?.longitude || 0),
      dates: e.dates?.start?.localDate ? `${e.dates.start.localDate} • ${e.dates?.start?.localTime?.slice(0, 5) || '20:00'}` : "Upcoming",
      genre: e.classifications?.[0]?.genre?.name || "Live Music",
      icon: "🎵",
      image: e.images?.[0]?.url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
      ticketUrl: e.url || "https://www.ticketmaster.com",
      isPopularTour: true
    }));
  } catch (err) {
    console.warn("Ticketmaster API fallback:", err);
    return null;
  }
}

// Fetch concerts tailored for a specific trip destination or coordinates
export async function fetchConcertsForTrip(destination = "Paris", coords = [48.8566, 2.3522]) {
  // 1. Try Ticketmaster API first
  const apiResults = await fetchTicketmasterConcerts({
    lat: coords[0],
    lng: coords[1],
    keyword: destination
  });
  if (apiResults && apiResults.length > 0) {
    return apiResults;
  }

  // 2. Fallback to rich curated destination database
  const destLower = destination.toLowerCase();
  const matched = CONCERTS_DATABASE.filter(c => 
    c.city.toLowerCase().includes(destLower) || 
    c.country.toLowerCase().includes(destLower) ||
    destLower.includes(c.city.toLowerCase())
  );

  return matched.length ? matched : CONCERTS_DATABASE.slice(0, 4);
}

// Search concerts by artist name, tour, genre, or city
export function searchConcerts(query = "") {
  if (!query || !query.trim()) return CONCERTS_DATABASE;
  const q = query.toLowerCase().trim();
  return CONCERTS_DATABASE.filter(c =>
    c.artist.toLowerCase().includes(q) ||
    c.title.toLowerCase().includes(q) ||
    c.venue.toLowerCase().includes(q) ||
    c.city.toLowerCase().includes(q) ||
    c.genre.toLowerCase().includes(q)
  );
}
