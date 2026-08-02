// Local Transportation & Arrival Survival Guide Service for TRIP

export const DESTINATION_TRANSIT_GUIDES = {
  "london": {
    city: "London",
    airport: "Heathrow (LHR), Gatwick (LGW) & Stansted (STN)",
    summary: "London is served by world-class rail & Tube networks. Contactless credit cards or Oyster passes work across all buses and Underground lines.",
    arrivalOptions: [
      {
        mode: "Elizabeth Line Express",
        icon: "🚆",
        cost: "£12.80",
        duration: "30-45 min to Central London",
        description: "Direct modern rail link from Heathrow terminals to Paddington, Tottenham Court Road, and Liverpool Street."
      },
      {
        mode: "London Underground (Piccadilly Line)",
        icon: "🚇",
        cost: "£5.60 (Off-peak contactless)",
        duration: "50-60 min",
        description: "Frequent budget Tube link directly from Heathrow T2, T3, T4, and T5 into Piccadilly Circus."
      },
      {
        mode: "Licensed Black Cab",
        icon: "🚖",
        cost: "£60 - £90 (Metered)",
        duration: "45-75 min",
        description: "Iconic London black taxis available 24/7 outside all terminal ranks. All accept card payment."
      }
    ],
    localTips: [
      "Tap in and tap out using the same contactless credit card or Apple Pay to get automatic daily fare capping.",
      "Stand on the right side of escalators on the London Underground network."
    ]
  },
  "tokyo": {
    city: "Tokyo",
    airport: "Haneda (HND) & Narita (NRT)",
    summary: "Tokyo has the world's most punctual railway system. Suica/Pasmo IC cards or digital iPhone wallet passes work for all trains, buses, and vending machines.",
    arrivalOptions: [
      {
        mode: "Tokyo Monorail / Keikyu Line",
        icon: "🚝",
        cost: "¥500 - ¥600 (~€3.50)",
        duration: "13-20 min from Haneda",
        description: "Direct fast rail link from Haneda Terminal 3 to Hamamatsucho Station or Shinagawa."
      },
      {
        mode: "Narita Express (N'EX)",
        icon: "🚆",
        cost: "¥3,070 (~€19)",
        duration: "55 min to Tokyo Station",
        description: "Reserved-seat express train running from Narita Airport to Tokyo, Shinjuku, and Yokohama hubs."
      },
      {
        mode: "Airport Limousine Bus",
        icon: "🚌",
        cost: "¥1,400 - ¥3,200",
        duration: "30-80 min direct to major hotels",
        description: "Comfortable highway coaches with luggage service departing outside both Haneda and Narita terminals."
      }
    ],
    localTips: [
      "Add a digital Suica card directly to your iPhone Apple Wallet for instant contactless transit tapping.",
      "Trains stop running between 00:00 and 05:00; use Uber or taxi for late-night transfers."
    ]
  },
  "new york": {
    city: "New York City",
    airport: "JFK, LaGuardia (LGA) & Newark (EWR)",
    summary: "NYC subway system runs 24/7. OMNY contactless credit card tapping works at every subway turnstile and MTA bus.",
    arrivalOptions: [
      {
        mode: "AirTrain + LIRR Train",
        icon: "🚆",
        cost: "$13.75",
        duration: "35 min to Grand Central / Penn Station",
        description: "JFK AirTrain to Jamaica Station, connecting to LIRR fast train into Midtown Manhattan."
      },
      {
        mode: "Official NYC Yellow Taxi",
        icon: "🚖",
        cost: "$70 Flat Rate (+ toll & tip)",
        duration: "45-75 min to Manhattan",
        description: "Official taxi line outside JFK arrivals into any Manhattan location."
      },
      {
        mode: "LaGuardia Link Q70 Bus + Subway",
        icon: "🚌",
        cost: "$2.90",
        duration: "30-45 min to Manhattan",
        description: "Free Q70 SBS bus from LGA to Jackson Heights subway station, connecting to E/F/M/R lines."
      }
    ],
    localTips: [
      "Tap your phone or contactless card directly at turnstiles; no MetroCard purchase necessary with OMNY.",
      "Check subway line schedules on weekends as construction reroutes are common."
    ]
  },
  "stockholm": {
    city: "Stockholm",
    airport: "Stockholm Arlanda (ARN)",
    summary: "Arlanda Airport connects to Stockholm Central in just 18 minutes via the high-speed Arlanda Express train.",
    arrivalOptions: [
      {
        mode: "Arlanda Express Train",
        icon: "🚆",
        cost: "320 SEK (~€28)",
        duration: "18 min to Stockholm C",
        description: "High-speed electric train departing every 15 mins directly from Arlanda underground station."
      },
      {
        mode: "Flygbussarna Airport Coach",
        icon: "🚌",
        cost: "129 SEK (~€11)",
        duration: "45 min to Cityterminalen",
        description: "Frequent express buses with free Wi-Fi running between Arlanda and central Stockholm."
      }
    ],
    localTips: [
      "SL public transport pass or contactless tapping covers metro (T-bana), commuter rail (pendeltåg), and city ferries.",
      "Stockholm public transport is completely cashless; use contactless card or SL app."
    ]
  },
  "rome": {
    city: "Rome",
    airport: "Rome Fiumicino (FCO) & Ciampino (CIA)",
    summary: "Leonardo Express is the non-stop rail link from Fiumicino Airport into Roma Termini in 32 minutes.",
    arrivalOptions: [
      {
        mode: "Leonardo Express Non-Stop",
        icon: "🚆",
        cost: "€14.00",
        duration: "32 min to Roma Termini",
        description: "Direct train running every 15 mins from FCO terminal station to Roma Termini central hub."
      },
      {
        mode: "Official Taxi Flat Rate",
        icon: "🚖",
        cost: "€50 (Within Aurelian Walls)",
        duration: "40-55 min",
        description: "Official white taxis have fixed statutory rates from Fiumicino into central Rome."
      }
    ],
    localTips: [
      "Tap contactless card at ATAC metro turnstiles or buy 24/48/72-hour tourist transit passes.",
      "Validate paper tickets in yellow/green machines before boarding buses or regional trains."
    ]
  },
  "barcelona": {
    city: "Barcelona",
    airport: "Barcelona El Prat (BCN)",
    summary: "Metro L9 Sud connects El Prat airport terminals to Barcelona metro lines in under 30 minutes.",
    arrivalOptions: [
      {
        mode: "Aerobús Express Bus (A1 / A2)",
        icon: "🚌",
        cost: "€6.75",
        duration: "25-35 min to Plaça Catalunya",
        description: "Direct express bus departing every 5 mins from T1 and T2 to city center."
      },
      {
        mode: "R2 Nord Rodalies Train",
        icon: "🚆",
        cost: "€4.60",
        duration: "25 min to Passeig de Gràcia",
        description: "Commuter train from T2 terminal station into central Barcelona rail hubs."
      }
    ],
    localTips: [
      "Buy a T-casual 10-journey transit ticket at metro station machines for economical city travel.",
      "Aerobús tickets can be purchased online or via contactless card on board."
    ]
  },
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
  const destLower = String(destinationName || "").toLowerCase();
  const matchedKey = Object.keys(DESTINATION_TRANSIT_GUIDES).find((key) => destLower.includes(key));

  if (matchedKey) {
    return DESTINATION_TRANSIT_GUIDES[matchedKey];
  }

  const cleanCity = destinationName.includes(",") ? destinationName.split(",")[0].trim() : destinationName.trim() || "Destination";

  return {
    city: cleanCity,
    airport: `${cleanCity} Main Airport / Central Station`,
    summary: `${cleanCity} offers transit connections via public transport and licensed taxis to the city center.`,
    arrivalOptions: [
      {
        mode: "Airport Express Bus / Metro",
        icon: "🚌",
        cost: "Local fare",
        duration: "20-40 min to city center",
        description: "Follow official airport signs for public transit hubs and express shuttle buses into central " + cleanCity + "."
      },
      {
        mode: "Licensed Airport Taxi Rank",
        icon: "🚖",
        cost: "Metered / Flat rate",
        duration: "15-35 min",
        description: "Official taxi ranks are available outside arrivals. Confirm fare structure before departing."
      },
      {
        mode: "App Rideshare (Uber / Bolt / Local)",
        icon: "📱",
        cost: "Standard fare",
        duration: "15-35 min",
        description: "Pickup zones are located at designated passenger drop-off and rideshare terminals."
      }
    ],
    localTips: [
      "Keep local currency or a contactless card ready for ticket machines.",
      "Save your hotel address and offline transit maps before landing in " + cleanCity + "."
    ]
  };
}
