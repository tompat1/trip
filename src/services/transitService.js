// Local Transportation & Arrival Survival Guide Service for TRIP

export const DESTINATION_TRANSIT_GUIDES = {
  "crete": {
    city: "Heraklion & Crete",
    airport: "Heraklion International (HER) & Chania (CHQ)",
    summary: "Crete is best navigated via KTEL intercity buses or rental car. Airport taxis use fixed fares to main resort zones.",
    arrivalOptions: [
      {
        mode: "KTEL Public Bus",
        icon: "🚌",
        cost: "€2.00 - €11.50",
        duration: "15 min to city center",
        description: "Buses depart every 15 mins outside HER arrivals directly to Heraklion Central Bus Station and KTEL terminals."
      },
      {
        mode: "Airport Taxi Rank",
        icon: "🚖",
        cost: "€15 - €25 (Flat rate)",
        duration: "10-15 min",
        description: "Official white taxis queue 24/7 at the arrival terminal exit. Confirm price before luggage loading."
      },
      {
        mode: "Rideshare (Uber Taxi)",
        icon: "📱",
        cost: "€18 - €28",
        duration: "10-15 min",
        description: "Uber operates in Greece as a licensed taxi dispatch app. Pickup is at the passenger drop-off zone."
      }
    ],
    localTips: [
      "Buy KTEL bus tickets at street kiosks (periptero) before boarding for a €0.50 discount.",
      "Rental cars are highly recommended for exploring secret beaches (Balos, Elafonisi) on Western Crete."
    ]
  },
  "paris": {
    city: "Paris",
    airport: "Charles de Gaulle (CDG) & Orly (ORY)",
    summary: "Paris has world-class public transport. RER B train and Navigo Easy contactless passes are the fastest way into central Paris.",
    arrivalOptions: [
      {
        mode: "RER B Express Train",
        icon: "🚆",
        cost: "€11.85",
        duration: "35 min to Gare du Nord",
        description: "Direct rail link from CDG Terminal 2 to central Paris metro hubs every 10 mins."
      },
      {
        mode: "Official Taxi Flat Rate",
        icon: "🚖",
        cost: "€56 (Right Bank) / €65 (Left Bank)",
        duration: "45-60 min",
        description: "Fixed official rates apply to all licensed taxis from CDG into Paris intra-muros."
      },
      {
        mode: "Uber / Bolt",
        icon: "📱",
        cost: "€45 - €65",
        duration: "45-60 min",
        description: "Designated rideshare pickup points are clearly marked at CDG T1, T2E, and T2F."
      }
    ],
    localTips: [
      {
        text: "Download 'IDF Mobilités' app to load Navigo tickets directly onto your iPhone or Android phone.",
        linkLabel: "Open IDF Mobilités",
        url: "https://www.iledefrance-mobilites.fr/en/tickets-fares/media/smartphone",
      },
      "Avoid illegal taxi solicitors inside the terminal building; follow official 'Taxis' signs."
    ]
  },
  "copenhagen": {
    city: "Copenhagen",
    airport: "Copenhagen Kastrup (CPH)",
    summary: "Copenhagen Airport is just 13 minutes from the city center via the 24/7 M2 Metro line.",
    arrivalOptions: [
      {
        mode: "Metro M2 (24/7)",
        icon: "🚇",
        cost: "36 DKK (~€4.80)",
        duration: "13 min to Nørreport",
        description: "Trains depart every 4 minutes directly from Terminal 3 to city center stations."
      },
      {
        mode: "Regional Train",
        icon: "🚆",
        cost: "36 DKK (~€4.80)",
        duration: "12 min to Copenhagen Central",
        description: "Direct train to København H (Central Station) every 10 mins."
      }
    ],
    localTips: [
      "Contactless credit card tapping is supported at all metro turnstiles and bus doors.",
      "Consider a Copenhagen City Pass Small for unlimited 24-72h public transport including airport zones."
    ]
  }
};

export function getDestinationTransitGuide(destinationName = "") {
  const destLower = destinationName.toLowerCase();
  if (destLower.includes("crete") || destLower.includes("heraklion") || destLower.includes("chania") || destLower.includes("greece")) {
    return DESTINATION_TRANSIT_GUIDES["crete"];
  }
  if (destLower.includes("paris") || destLower.includes("france")) {
    return DESTINATION_TRANSIT_GUIDES["paris"];
  }
  if (destLower.includes("copenhagen") || destLower.includes("denmark")) {
    return DESTINATION_TRANSIT_GUIDES["copenhagen"];
  }

  // Generic Default Transit Guide
  return {
    city: destinationName || "Destination",
    airport: "Local Airport & Rail Station",
    summary: "Plan your arrival transit ahead of time for a stress-free start to your trip.",
    arrivalOptions: [
      {
        mode: "Public Bus / Metro",
        icon: "🚌",
        cost: "€2.00 - €5.00",
        duration: "20-40 min",
        description: "Check official airport transit signage for city center express shuttle buses."
      },
      {
        mode: "Licensed Airport Taxi",
        icon: "🚖",
        cost: "Metered / Flat rate",
        duration: "15-30 min",
        description: "Use official taxi ranks outside arrivals. Avoid unmetered solicitations."
      }
    ],
    localTips: [
      "Keep local currency or a contactless card ready for ticket vending machines.",
      "Pin your hotel address on offline Google Maps / Apple Maps before landing."
    ]
  };
}
