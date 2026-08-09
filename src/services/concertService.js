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
  },
  // London Concerts
  {
    id: "cnc-london-1",
    artist: "Adele",
    tour: "Weekends Live in London",
    title: "Adele Live at Hyde Park",
    venue: "Hyde Park",
    city: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lng: -0.1657,
    dates: "Tonight • 19:30",
    genre: "Pop / Soul",
    icon: "🎤",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.ticketmaster.co.uk",
    isPopularTour: true
  },
  {
    id: "cnc-london-2",
    artist: "London Symphony Orchestra",
    tour: "Classical Masterworks",
    title: "LSO Symphony Evening",
    venue: "Barbican Centre",
    city: "London",
    country: "United Kingdom",
    lat: 51.5200,
    lng: -0.0938,
    dates: "Tomorrow • 19:30",
    genre: "Classical",
    icon: "🎻",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.barbican.org.uk",
    isPopularTour: true
  },
  // New York Concerts
  {
    id: "cnc-nyc-1",
    artist: "Billy Joel",
    tour: "Madison Square Garden Residency",
    title: "Billy Joel Live at The Garden",
    venue: "Madison Square Garden",
    city: "New York",
    country: "United States",
    lat: 40.7505,
    lng: -73.9934,
    dates: "Oct 8 • 20:00",
    genre: "Rock / Pop",
    icon: "🎹",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.ticketmaster.com",
    isPopularTour: true
  },
  // Stockholm Concerts
  {
    id: "cnc-stockholm-1",
    artist: "Royal Stockholm Philharmonic",
    tour: "Nordic Classics",
    title: "Philharmonic Sunset Concert",
    venue: "Stockholm Concert Hall (Konserthuset)",
    city: "Stockholm",
    country: "Sweden",
    lat: 59.3346,
    lng: 18.0628,
    dates: "Fri • 19:00",
    genre: "Classical / Orchestral",
    icon: "🎼",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    ticketUrl: "https://www.konserthuset.se",
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

export async function fetchBandsintownEvents(options = {}) {
  const appId = options.appId || import.meta.env?.VITE_BANDSINTOWN_APP_ID;
  const artists = (options.artists || []).filter(Boolean).slice(0, 8);
  if (!appId || !artists.length) return null;

  try {
    const batches = await Promise.all(artists.map(async (artist) => {
      const url = new URL(`https://rest.bandsintown.com/artists/${encodeURIComponent(artist)}/events/`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("date", "upcoming");
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map((event) => normalizeBandsintownEvent(event, artist, options)).filter(Boolean) : [];
    }));
    return batches.flat();
  } catch (err) {
    console.warn("Bandsintown API fallback:", err);
    return null;
  }
}

export async function fetchLiveEventsFromWorker(options = {}) {
  try {
    const apiBase = getTripApiBase();
    const url = new URL("/api/events/discover", apiBase || window.location.origin);
    if (options.destination) url.searchParams.set("destination", options.destination);
    if (options.lat && options.lng) {
      url.searchParams.set("lat", String(options.lat));
      url.searchParams.set("lng", String(options.lng));
    }
    if (options.radius) url.searchParams.set("radius", String(options.radius));
    if (options.keyword) url.searchParams.set("keyword", options.keyword);
    (options.artists || []).slice(0, 8).forEach((artist) => url.searchParams.append("artist", artist));
    const res = await fetch(url.href, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`worker-events-http-${res.status}`);
    const data = await res.json();
    return (data.events || []).map(normalizeDiscoveredEvent).filter(Boolean);
  } catch (err) {
    console.warn("Worker events fallback:", err);
    return null;
  }
}

// Fetch concerts tailored for a specific trip destination or coordinates
export async function fetchConcertsForTrip(destination = "Paris", coords = [48.8566, 2.3522]) {
  const artists = getDestinationArtistSeeds(destination);

  // 1. Try Worker-backed Ticketmaster + Bandsintown first
  const workerResults = await fetchLiveEventsFromWorker({
    destination,
    lat: coords[0],
    lng: coords[1],
    keyword: destination,
    artists,
  });
  if (workerResults && workerResults.length > 0) {
    return workerResults;
  }

  // 2. Try browser Ticketmaster API when a local dev key is configured
  const apiResults = await fetchTicketmasterConcerts({
    lat: coords[0],
    lng: coords[1],
    keyword: destination
  });
  if (apiResults && apiResults.length > 0) {
    return apiResults;
  }

  // 3. Try browser Bandsintown artist feeds when a local dev app id is configured
  const bandResults = await fetchBandsintownEvents({ artists, destination, lat: coords[0], lng: coords[1] });
  if (bandResults && bandResults.length > 0) {
    return bandResults;
  }

  // 4. Fallback to rich curated destination database
  const destLower = destination.toLowerCase();
  const matched = CONCERTS_DATABASE.filter(c => 
    c.city.toLowerCase().includes(destLower) || 
    c.country.toLowerCase().includes(destLower) ||
    destLower.includes(c.city.toLowerCase())
  );

  if (matched.length > 0) return matched;

  const cleanCity = destination.includes(",") ? destination.split(",")[0].trim() : destination.trim() || "Local";
  return [
    {
      id: `cnc-gen-1`,
      artist: `${cleanCity} Live Music Festival`,
      tour: "Summer Concert Series",
      title: `${cleanCity} Open Air Live Night`,
      venue: `${cleanCity} Central Park Pavilion`,
      city: cleanCity,
      country: "",
      lat: coords[0],
      lng: coords[1],
      dates: "This Weekend • 20:00",
      genre: "Indie / Jazz",
      icon: "🎸",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
      ticketUrl: "https://www.ticketmaster.com",
      isPopularTour: true
    },
    {
      id: `cnc-gen-2`,
      artist: `${cleanCity} Symphony Ensemble`,
      tour: "Classical Evenings",
      title: `${cleanCity} Philharmonic Hall Special`,
      venue: `${cleanCity} Concert Hall`,
      city: cleanCity,
      country: "",
      lat: coords[0],
      lng: coords[1],
      dates: "Tomorrow • 19:30",
      genre: "Classical / Orchestral",
      icon: "🎻",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
      ticketUrl: "https://www.ticketmaster.com",
      isPopularTour: true
    },
    {
      id: `cnc-gen-3`,
      artist: `${cleanCity} Underground Sessions`,
      tour: "Electronic Night",
      title: `${cleanCity} DJ Set & Light Show`,
      venue: `${cleanCity} Warehouse Club`,
      city: cleanCity,
      country: "",
      lat: coords[0],
      lng: coords[1],
      dates: "Fri • 22:00",
      genre: "Electronic",
      icon: "🎧",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
      ticketUrl: "https://www.ticketmaster.com",
      isPopularTour: true
    }
  ];
}

export function normalizeDiscoveredEvent(event = {}) {
  if (!event) return null;
  const title = event.title || event.name || event.artist || event.tour || "Local live event";
  const venue = event.venue || event.location || event.place || "";
  const dates = event.dates || event.date || event.datetime || event.startDate || event.startTime || "Upcoming";
  const genre = event.genre || event.category || event.type || "Live Event";
  const provider = event.provider || event.sourceRole || "";

  return {
    ...event,
    id: event.id || `evt-${slugify(`${title}-${venue}-${dates}`)}`,
    artist: event.artist || title,
    title,
    venue,
    city: event.city || "",
    country: event.country || "",
    dates,
    genre,
    icon: event.icon || getEventIcon(genre, provider),
    image: event.image || event.imageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    ticketUrl: event.ticketUrl || event.url || event.sourceUrl || "",
    provider,
    sourceRole: event.sourceRole || provider || "event-discovery",
  };
}

function getEventIcon(genre = "", provider = "") {
  const key = `${genre} ${provider}`.toLowerCase();
  if (key.includes("classical") || key.includes("orchestra") || key.includes("symphony")) return "🎻";
  if (key.includes("electronic") || key.includes("dj") || key.includes("club")) return "🎧";
  if (key.includes("jazz")) return "🎷";
  if (key.includes("folk") || key.includes("world")) return "🪕";
  if (key.includes("ticketmaster") || key.includes("bandsintown") || key.includes("music") || key.includes("concert")) return "🎵";
  return "🎟️";
}

function normalizeBandsintownEvent(event = {}, artist = "", options = {}) {
  const venue = event.venue || {};
  const lat = Number(venue.latitude || 0);
  const lng = Number(venue.longitude || 0);
  if (Number.isFinite(lat) && Number.isFinite(lng) && options.lat && options.lng) {
    const km = getDistanceKm([options.lat, options.lng], [lat, lng]);
    if (km > 120) return null;
  }
  const offer = Array.isArray(event.offers) ? event.offers.find((item) => item.url) : null;
  return {
    id: event.id ? `bit-${event.id}` : `bit-${slugify(`${artist}-${venue.name}-${event.datetime}`)}`,
    artist: artist || event.lineup?.[0] || event.title || "Live Artist",
    tour: event.title || "Artist tour date",
    title: event.title || `${artist} live`,
    venue: venue.name || "Venue TBA",
    city: venue.city || "",
    country: venue.country || "",
    lat,
    lng,
    dates: event.datetime ? `${event.datetime.slice(0, 10)} • ${event.datetime.slice(11, 16) || "20:00"}` : "Upcoming",
    genre: "Live Music",
    icon: venue.type === "Virtual" ? "📡" : "🎵",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    ticketUrl: offer?.url || event.url || "https://www.bandsintown.com",
    provider: "bandsintown",
    source: "Bandsintown",
    sourceRole: "bandsintown",
    isPopularTour: false
  };
}

function getDestinationArtistSeeds(destination = "") {
  const key = destination.toLowerCase();
  if (key.includes("paris") || key.includes("france")) return ["Coldplay", "Ludovico Einaudi", "Peggy Gou", "Arctic Monkeys"];
  if (key.includes("crete") || key.includes("greece") || key.includes("heraklion")) return ["Marina Satti", "Villagers of Ioannina City", "Alkinoos Ioannidis"];
  if (key.includes("copenhagen") || key.includes("denmark")) return ["MØ", "Trentemøller", "Efterklang"];
  if (key.includes("tokyo") || key.includes("japan")) return ["Hans Zimmer", "King Gnu", "One Ok Rock"];
  return [];
}

function getTripApiBase() {
  return import.meta.env?.VITE_TRIP_API_BASE || (typeof window !== "undefined" && window.location.origin.includes("8787") ? "" : "https://trip.thomasrynell.workers.dev");
}

function getDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const deltaLat = toRadians(to[0] - from[0]);
  const deltaLng = toRadians(to[1] - from[1]);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function slugify(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
