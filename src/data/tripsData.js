export const tripsData = {};

export const DEMO_SAMPLE_TRIPS = {
  paris: {
    id: "paris",
    destination: "Paris, France",
    countryCode: "FR",
    language: "fr",
    flag: "🇫🇷",
    dates: "3 – 9 Oct 2026",
    daysCount: 7,
    startDate: "2026-10-03",
    status: "Upcoming",
    statusText: "17 days until your trip to Paris",
    tripMode: false,
    center: [48.8566, 2.3522],
    zoom: 13,
    flightRoute: {
      originIata: "CPH",
      destinationIata: "CDG",
      originLabel: "Copenhagen (CPH) - Copenhagen Airport",
      destinationLabel: "Paris (CDG) - Charles de Gaulle Airport",
      flightType: "regular",
      departureDate: "2026-10-03"
    },
    flightPreference: "regular",
    flightSearch: { status: "idle", offers: [], updatedAt: "" },
    weather: {
      temp: "18°C",
      condition: "Partly cloudy",
      feelsLike: "19°C",
      localTime: "09:42 AM",
      currency: "EUR (€)",
      forecast: [
        { day: "Mon", temp: "21°" },
        { day: "Tue", temp: "19°" },
        { day: "Wed", temp: "17°" }
      ]
    },
    upcomingActivity: {
      title: "Paris, France",
      subtitle: "3 – 9 Oct 2026",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80"
    },
    checklist: [
      { id: "stay", label: "Book your stay", completed: false },
      { id: "exp", label: "Choose experiences", completed: false },
      { id: "companions", label: "Invite travel companions", completed: true },
      { id: "visa", label: "Check visa requirements", completed: true }
    ],
    mapPins: [
      { id: "p1", name: "Montmartre", lat: 48.8867, lng: 2.3431, category: "sight" },
      { id: "p2", name: "Le Marais", lat: 48.8575, lng: 2.3592, category: "shopping" },
      { id: "p3", name: "Eiffel Tower", lat: 48.8584, lng: 2.2945, category: "sight" },
      { id: "p4", name: "Latin Quarter", lat: 48.8499, lng: 2.3444, category: "cafe" }
    ],
    calendarEvents: [
      {
        id: "e1",
        title: "Flight to Paris",
        type: "flight",
        icon: "✈️",
        dayIndex: 0, // Sat 3 Oct
        dayName: "Sat 3 Oct",
        startTime: "06:15",
        endTime: "11:30",
        location: "CDG Airport",
        colorScheme: "peach"
      },
      {
        id: "e2",
        title: "Louvre Museum",
        type: "museum",
        icon: "📍",
        dayIndex: 0,
        dayName: "Sat 3 Oct",
        startTime: "10:00",
        endTime: "12:30",
        location: "1st Arrondissement",
        colorScheme: "blue"
      },
      {
        id: "e3",
        title: "Versailles Palace",
        type: "sight",
        icon: "👑",
        dayIndex: 3, // Tue 6 Oct
        dayName: "Tue 6 Oct",
        startTime: "09:30",
        endTime: "12:00",
        location: "Versailles",
        colorScheme: "mint"
      },
      {
        id: "e4",
        title: "Le Marais Shopping",
        type: "shopping",
        icon: "🛍️",
        dayIndex: 4, // Wed 7 Oct
        dayName: "Wed 7 Oct",
        startTime: "11:00",
        endTime: "13:00",
        location: "3rd Arrondissement",
        colorScheme: "pink"
      },
      {
        id: "e5",
        title: "Café de Flore Brunch",
        type: "cafe",
        icon: "☕",
        dayIndex: 0,
        dayName: "Sat 3 Oct",
        startTime: "13:00",
        endTime: "14:30",
        location: "Saint-Germain",
        colorScheme: "green"
      },
      {
        id: "e6",
        title: "Café de Flore Brunch",
        type: "cafe",
        icon: "☕",
        dayIndex: 1, // Sun 4 Oct
        dayName: "Sun 4 Oct",
        startTime: "13:00",
        endTime: "14:30",
        location: "Saint-Germain",
        colorScheme: "lavender"
      },
      {
        id: "e7",
        title: "Eiffel Tower Golden hour",
        type: "sight",
        icon: "🗼",
        dayIndex: 4,
        dayName: "Wed 7 Oct",
        startTime: "16:30",
        endTime: "18:00",
        location: "Champ de Mars",
        colorScheme: "gold"
      },
      {
        id: "e8",
        title: "Opéra Garnier Tour",
        type: "sight",
        icon: "🎭",
        dayIndex: 5, // Thu 8 Oct
        dayName: "Thu 8 Oct",
        startTime: "16:00",
        endTime: "17:30",
        location: "9th Arrondissement",
        colorScheme: "mint"
      },
      {
        id: "e9",
        title: "Jazz Night Le Caveau",
        type: "music",
        icon: "🎵",
        dayIndex: 0,
        dayName: "Sat 3 Oct",
        startTime: "21:00",
        endTime: "23:00",
        location: "Latin Quarter",
        colorScheme: "gold"
      },
      {
        id: "e10",
        title: "Dinner Chez Janou",
        type: "dining",
        icon: "🍽️",
        dayIndex: 1,
        dayName: "Sun 4 Oct",
        startTime: "19:30",
        endTime: "21:30",
        location: "Le Marais",
        colorScheme: "peach"
      },
      {
        id: "e11",
        title: "Jazz Night Le Caveau",
        type: "music",
        icon: "🎵",
        dayIndex: 4,
        dayName: "Wed 7 Oct",
        startTime: "21:00",
        endTime: "23:00",
        location: "Latin Quarter",
        colorScheme: "blue"
      },
      {
        id: "e12",
        title: "Le Marais Shopping",
        type: "shopping",
        icon: "🛍️",
        dayIndex: 6, // Fri 9 Oct
        dayName: "Fri 9 Oct",
        startTime: "10:00",
        endTime: "12:00",
        location: "3rd Arrondissement",
        colorScheme: "blue"
      },
      {
        id: "e13",
        title: "Pack & Prepare Departure",
        type: "shopping",
        icon: "🛍️",
        dayIndex: 6,
        dayName: "Fri 9 Oct",
        startTime: "19:00",
        endTime: "21:00",
        location: "Evening",
        colorScheme: "pink"
      }
    ],
    ideas: [
      {
        id: "i1",
        title: "Sunset Seine Cruise",
        subtitle: "Popular with locals",
        rating: 4.8,
        duration: "1.5h",
        image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "i2",
        title: "Louvre Museum",
        subtitle: "Book skip-the-line tickets",
        rating: 4.9,
        duration: "3h",
        image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "i3",
        title: "Café de Flore",
        subtitle: "Classic Parisian café",
        rating: 4.6,
        duration: "1h",
        image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "i4",
        title: "Jazz Night",
        subtitle: "Live at Le Caveau",
        rating: 4.7,
        duration: "2h",
        image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "i5",
        title: "Montmartre Artists Walk",
        subtitle: "Sacré-Cœur & Place du Tertre",
        rating: 4.8,
        duration: "2.5h",
        image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "i6",
        title: "Le Marais Artisan Bakeries",
        subtitle: "Pastries & vintage boutiques",
        rating: 4.7,
        duration: "2h",
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80"
      }
    ],
    events: [
      { id: "ev1", title: "Fiac Art Fair", dates: "2 – 5 Oct 2026", icon: "🔴" },
      { id: "ev2", title: "Paris Jazz Festival", dates: "3 – 9 Oct 2026", icon: "🅰️" },
      { id: "ev3", title: "Fashion Week", dates: "27 Sep – 5 Oct 2026", icon: "🕒" }
    ]
  },

  crete: {
    id: "crete",
    destination: "Heraklion, Crete",
    countryCode: "GR",
    language: "el",
    flag: "🇬🇷",
    dates: "17 Jul – 24 Jul 2026",
    daysCount: 8,
    startDate: "2026-07-17",
    status: "Completed",
    statusText: "Remember your Heraklion, Crete trip",
    tripMode: false,
    center: [35.3391, 25.132],
    zoom: 13,
    flightRoute: {
      originIata: "CPH",
      destinationIata: "HER",
      originLabel: "Copenhagen (CPH) - Copenhagen Airport",
      destinationLabel: "Heraklion (Crete) (HER) - Heraklion International Airport",
      flightType: "charter",
      departureDate: "2026-07-17"
    },
    flightPreference: "charter",
    flightSearch: { status: "idle", offers: [], updatedAt: "" },
    weather: {
      temp: "28°C",
      condition: "Sunny",
      feelsLike: "30°C",
      localTime: "10:15 AM",
      currency: "Euro EUR (€)",
      forecast: [
        { day: "Thu", temp: "29°" },
        { day: "Fri", temp: "28°" },
        { day: "Sat", temp: "27°" },
        { day: "Sun", temp: "27°" }
      ]
    },
    upcomingActivity: {
      title: "Knossos Palace",
      subtitle: "Today · 11:00 AM",
      image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80"
    },
    checklist: [
      { id: "stay", label: "Book your stay", completed: false },
      { id: "exp", label: "Choose experiences", completed: false },
      { id: "companions", label: "Invite travel companions", completed: true },
      { id: "visa", label: "Check visa requirements", completed: true },
      { id: "maps", label: "Offline maps", completed: false }
    ],
    mapPins: [
      { id: "c1", name: "Lions Square", lat: 35.3391, lng: 25.132, category: "user", isUser: true },
      { id: "c2", name: "Venetini Fountain", lat: 35.3395, lng: 25.1328, category: "sight" },
      { id: "c3", name: "Koules Fortress", lat: 35.3444, lng: 25.137, category: "fortress" },
      { id: "c4", name: "Knossos Palace", lat: 35.298, lng: 25.1631, category: "ruins" },
      { id: "c5", name: "Archaeological Museum", lat: 35.339, lng: 25.1373, category: "museum" },
      { id: "c6", name: "Ammoudara Beach", lat: 35.333, lng: 25.085, category: "beach" }
    ],
    nearbyNow: [
      { id: "n1", title: "Hacienda Coffee Heraklion", distance: "220 m · 3 min walk", icon: "☕" },
      { id: "n2", title: "Lions Square", distance: "350 m · 5 min walk", icon: "🏛️" },
      { id: "n3", title: "Local Bus Stop", distance: "120 m · Line 1 to Old Town", icon: "🚌" }
    ],
    liveInfo: [
      { id: "l1", title: "Local Bus (KTEL)", subtitle: "Real-time routes & arrivals", status: "On time", statusClass: "badge-green", icon: "🚌" },
      { id: "l2", title: "Ferry to Santorini", subtitle: "From Heraklion Port", status: "2h 15m", statusClass: "badge-gray", icon: "🛳️" },
      { id: "l3", title: "Heraklion Airport (HER)", subtitle: "Arrivals & departures", status: "On time", statusClass: "badge-green", icon: "✈️" }
    ],
    transportOptions: [
      { id: "t1", title: "Bus", detail: "From €1.20", icon: "🚌" },
      { id: "t2", title: "Taxi", detail: "From €8", icon: "🚕" },
      { id: "t3", title: "Car rental", detail: "From €28/day", icon: "🚗" },
      { id: "t4", title: "Ferry", detail: "To islands", icon: "⛴️" }
    ],
    ideas: [
      {
        id: "ci1",
        title: "Koules Fortress",
        subtitle: "Walk the Venetian fort",
        rating: 4.7,
        duration: "1–1.5h",
        image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "ci2",
        title: "Knossos Palace",
        subtitle: "Ancient Minoan site",
        rating: 4.8,
        duration: "2–3h",
        image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "ci3",
        title: "Heraklion Museum",
        subtitle: "Minoan treasures",
        rating: 4.6,
        duration: "1.5–2h",
        image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "ci4",
        title: "Old Venetian Harbor",
        subtitle: "Scenic walk & cafés",
        rating: 4.6,
        duration: "1–2h",
        image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "ci5",
        title: "Ammoudara Beach",
        subtitle: "Relax & swim",
        rating: 4.5,
        duration: "Half day",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "ci6",
        title: "Cretan Wine & Olive Tasting",
        subtitle: "Organic estate in Peza valley",
        rating: 4.9,
        duration: "3 hrs",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "ci7",
        title: "Spinalonga Island Boat Tour",
        subtitle: "Historic Venetian island fortress",
        rating: 4.8,
        duration: "3.5 hrs",
        image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80"
      }
    ],
    events: [
      { id: "cev1", title: "Heraklion Wine Festival", dates: "17 – 20 Jul 2026", icon: "🍷" },
      { id: "cev2", title: "Crete Jazz & World Music", dates: "18 – 20 Jul 2026", icon: "🎵" },
      { id: "cev3", title: "Traditional Market Day", dates: "19 Jul 2026", icon: "🎁" },
      { id: "cev4", title: "Night at the Museum", dates: "21 Jul 2026", icon: "🏛️" }
    ]
  },
  spain: {
    id: "spain",
    destination: "Madrid, Spain",
    countryCode: "ES",
    language: "es",
    flag: "🇪🇸",
    dates: "Sept-Oct 2026",
    daysCount: 14,
    startDate: "2026-09-15",
    status: "Upcoming",
    statusText: "Upcoming Spain adventure",
    tripMode: false,
    center: [40.4168, -3.7038],
    zoom: 13,
    weather: {
      temp: "25°C",
      condition: "Sunny",
      feelsLike: "26°C",
      localTime: "10:00 AM",
      currency: "EUR (€)",
      forecast: [
        { day: "Today", temp: "26°" },
        { day: "Tomorrow", temp: "25°" },
        { day: "Wed", temp: "24°" }
      ]
    },
    upcomingActivity: {
      title: "Madrid, Spain",
      subtitle: "Sept-Oct 2026",
      image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=600&q=80"
    },
    checklist: [
      { id: "stay", label: "Book stay in Madrid & Barcelona", completed: false },
      { id: "tickets", label: "Reserve Sagrada Família & Alhambra tickets", completed: false },
      { id: "tapas", label: "Bookmark local tapas bars", completed: true }
    ],
    mapPins: [
      { id: "spain_p1", name: "Plaza Mayor, Madrid", lat: 40.4155, lng: -3.7074, category: "sight" },
      { id: "spain_p2", name: "Sagrada Família", lat: 41.4036, lng: 2.1744, category: "sight" }
    ],
    calendarEvents: [
      {
        id: "spain_e1",
        title: "Tapas Crawl in Madrid",
        type: "food",
        icon: "🍷",
        dayIndex: 0,
        dayName: "Sat 15 Sept",
        startTime: "19:00",
        endTime: "22:00",
        location: "La Latina, Madrid",
        colorScheme: "peach"
      }
    ],
    ideas: [
      {
        id: "spain_i1",
        title: "Mercado de San Miguel",
        subtitle: "Gourmet tapas hall in heart of Madrid",
        rating: 4.8,
        duration: "2 hrs",
        image: "https://images.unsplash.com/photo-1515443961218-a51367888e4b?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "spain_i2",
        title: "Sagrada Família & Park Güell",
        subtitle: "Gaudí architecture tour in Barcelona",
        rating: 4.9,
        duration: "3.5 hrs",
        image: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "spain_i3",
        title: "Alhambra Palace & Gardens",
        subtitle: "Moorish palace complex in Granada",
        rating: 4.9,
        duration: "4 hrs",
        image: "https://images.unsplash.com/photo-1568849676085-51415703900f?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "spain_i4",
        title: "Flamenco Show in Triana",
        subtitle: "Authentic Andalusian dance in Seville",
        rating: 4.8,
        duration: "2 hrs",
        image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "spain_i5",
        title: "Prado Museum Art Walk",
        subtitle: "Goya, Velázquez & El Greco masterworks",
        rating: 4.8,
        duration: "2.5 hrs",
        image: "https://images.unsplash.com/photo-1582650625119-3a31f8418b0d?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "spain_i6",
        title: "Barceloneta Beach & Sangria",
        subtitle: "Mediterranean seafront & tapas",
        rating: 4.7,
        duration: "2 hrs",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
      }
    ],
    events: [
      { icon: "💃", title: "Flamenco Night", dates: "Weekly" }
    ]
  }
};

export function cloneDemoSampleTrips() {
  const clone = typeof structuredClone === "function"
    ? structuredClone(DEMO_SAMPLE_TRIPS)
    : JSON.parse(JSON.stringify(DEMO_SAMPLE_TRIPS));
  Object.values(clone).forEach((trip) => {
    trip.isDemoTrip = true;
    trip.syncStatus = "demo";
  });
  return clone;
}

export const searchPlacesData = [
  {
    id: "sp1",
    name: "La Cabra",
    neighborhood: "Østerbro, Copenhagen",
    rating: 4.7,
    reviewsCount: 230,
    category: "Cafe",
    description: "Specialty coffee roaster & café. Minimalist interior, great pastries.",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "sp2",
    name: "The Coffee Collective",
    neighborhood: "Nørrebro, Copenhagen",
    rating: 4.6,
    reviewsCount: 352,
    category: "Cafe",
    description: "One of the world's best coffee shops. Roastery & multiple locations.",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "sp3",
    name: "Prolog Coffee Bar",
    neighborhood: "Vesterbro, Copenhagen",
    rating: 4.6,
    reviewsCount: 176,
    category: "Cafe",
    description: "Small, seasonal menu & cozy vibe.",
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "sp4",
    name: "Andersen & Maillard",
    neighborhood: "Nørrebro, Copenhagen",
    rating: 4.6,
    reviewsCount: 181,
    category: "Cafe",
    description: "World-class coffee & beautiful surroundings.",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "sp5",
    name: "Boot Café",
    neighborhood: "Le Marais, Paris",
    rating: 4.7,
    reviewsCount: 310,
    category: "Specialty Coffee",
    description: "Cozy former cobbler shop serving meticulous espresso.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
  }
];
