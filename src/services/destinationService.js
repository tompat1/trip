/**
 * destinationService — Dynamically fetches authentic Wikivoyage/Wikipedia summaries
 * and destination briefs for any destination added by a user.
 */

import { enrichmentService } from "../enrichment/enrichmentService.js";

const summaryCache = new Map();
const pendingFetches = new Set();

const DESTINATION_QUICK_FACTS = {
  paris: {
    population: "2.1 million",
    area: "105 km²",
    country: "France 🇫🇷",
    language: "French",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "Apr–Jun, Sep–Oct",
    wifiSpeed: "85 Mbps",
    nomadCost: "$2,650/mo",
    safetyScore: "84/100",
    visaAllowance: "90 Days Visa-Free",
  },
  london: {
    population: "8.9 million",
    area: "1,572 km²",
    country: "United Kingdom 🇬🇧",
    language: "English",
    currency: "GBP (£)",
    timezone: "GMT+1 (BST)",
    bestTime: "May–Sep",
    wifiSpeed: "110 Mbps",
    nomadCost: "$3,400/mo",
    safetyScore: "86/100",
    visaAllowance: "180 Days Visa-Free",
  },
  "new york": {
    population: "8.4 million",
    area: "783 km²",
    country: "United States 🇺🇸",
    language: "English",
    currency: "USD ($)",
    timezone: "GMT-4 (EDT)",
    bestTime: "May–Jun, Sep–Nov",
    wifiSpeed: "140 Mbps",
    nomadCost: "$4,200/mo",
    safetyScore: "78/100",
    visaAllowance: "90 Days ESTA",
  },
  tokyo: {
    population: "14.0 million",
    area: "2,194 km²",
    country: "Japan 🇯🇵",
    language: "Japanese",
    currency: "JPY (¥)",
    timezone: "GMT+9",
    bestTime: "Mar–May, Sep–Nov",
    wifiSpeed: "165 Mbps",
    nomadCost: "$2,350/mo",
    safetyScore: "96/100",
    visaAllowance: "90 Days Visa-Free",
  },
  stockholm: {
    population: "975,000",
    area: "188 km²",
    country: "Sweden 🇸🇪",
    language: "Swedish / English",
    currency: "SEK (kr)",
    timezone: "GMT+2 (CEST)",
    bestTime: "May–Sep",
    wifiSpeed: "135 Mbps",
    nomadCost: "$2,800/mo",
    safetyScore: "91/100",
    visaAllowance: "90 Days Visa-Free",
  },
  copenhagen: {
    population: "644,000",
    area: "179 km²",
    country: "Denmark 🇩🇰",
    language: "Danish / English",
    currency: "DKK (kr.)",
    timezone: "GMT+2 (CEST)",
    bestTime: "May–Sep",
    wifiSpeed: "125 Mbps",
    nomadCost: "$3,100/mo",
    safetyScore: "93/100",
    visaAllowance: "90 Days Visa-Free",
  },
  rome: {
    population: "2.8 million",
    area: "1,285 km²",
    country: "Italy 🇮🇹",
    language: "Italian",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "Apr–Jun, Sep–Oct",
    wifiSpeed: "75 Mbps",
    nomadCost: "$2,100/mo",
    safetyScore: "81/100",
    visaAllowance: "90 Days Visa-Free",
  },
  barcelona: {
    population: "1.6 million",
    area: "101 km²",
    country: "Spain 🇪🇸",
    language: "Spanish / Catalan",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "May–Jun, Sep–Oct",
    wifiSpeed: "115 Mbps",
    nomadCost: "$2,200/mo",
    safetyScore: "83/100",
    visaAllowance: "90 Days Visa-Free",
  },
  madrid: {
    population: "3.3 million",
    area: "604 km²",
    country: "Spain 🇪🇸",
    language: "Spanish",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "Apr–Jun, Sep–Oct",
    wifiSpeed: "120 Mbps",
    nomadCost: "$2,150/mo",
    safetyScore: "87/100",
    visaAllowance: "90 Days Visa-Free",
  },
  berlin: {
    population: "3.6 million",
    area: "891 km²",
    country: "Germany 🇩🇪",
    language: "German",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "May–Sep",
    wifiSpeed: "105 Mbps",
    nomadCost: "$2,300/mo",
    safetyScore: "88/100",
    visaAllowance: "90 Days Visa-Free",
  },
  amsterdam: {
    population: "920,000",
    area: "219 km²",
    country: "Netherlands 🇳🇱",
    language: "Dutch / English",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "Apr–Sep",
    wifiSpeed: "140 Mbps",
    nomadCost: "$3,200/mo",
    safetyScore: "90/100",
    visaAllowance: "90 Days Visa-Free",
  },
  lisbon: {
    population: "545,000",
    area: "100 km²",
    country: "Portugal 🇵🇹",
    language: "Portuguese",
    currency: "EUR (€)",
    timezone: "GMT+1 (WEST)",
    bestTime: "Apr–Oct",
    wifiSpeed: "120 Mbps",
    nomadCost: "$1,950/mo",
    safetyScore: "92/100",
    visaAllowance: "90 Days Visa-Free",
  },
  crete: {
    population: "634,000",
    area: "8,336 km²",
    country: "Greece 🇬🇷",
    language: "Greek",
    currency: "EUR (€)",
    timezone: "GMT+3",
    bestTime: "May–Oct",
    wifiSpeed: "65 Mbps",
    nomadCost: "$1,600/mo",
    safetyScore: "89/100",
    visaAllowance: "90 Days Visa-Free",
  },
  sydney: {
    population: "5.3 million",
    area: "12,368 km²",
    country: "Australia 🇦🇺",
    language: "English",
    currency: "AUD ($)",
    timezone: "GMT+10 (AEST)",
    bestTime: "Sep–Nov, Mar–May",
    wifiSpeed: "95 Mbps",
    nomadCost: "$3,100/mo",
    safetyScore: "88/100",
    visaAllowance: "90 Days eVisitor",
  },
  bangkok: {
    population: "10.5 million",
    area: "1,568 km²",
    country: "Thailand 🇹🇭",
    language: "Thai",
    currency: "THB (฿)",
    timezone: "GMT+7",
    bestTime: "Nov–Feb",
    wifiSpeed: "150 Mbps",
    nomadCost: "$1,250/mo",
    safetyScore: "85/100",
    visaAllowance: "60 Days Visa-Free",
  },
  canggu: {
    population: "40,000",
    area: "15 km²",
    country: "Indonesia 🇮🇩",
    language: "Indonesian / English",
    currency: "IDR (Rp)",
    timezone: "GMT+8",
    bestTime: "Apr–Oct",
    wifiSpeed: "75 Mbps",
    nomadCost: "$1,350/mo",
    safetyScore: "87/100",
    visaAllowance: "30 Days VOA",
  },
  "chiang mai": {
    population: "130,000",
    area: "40 km²",
    country: "Thailand 🇹🇭",
    language: "Thai / English",
    currency: "THB (฿)",
    timezone: "GMT+7",
    bestTime: "Nov–Feb",
    wifiSpeed: "130 Mbps",
    nomadCost: "$950/mo",
    safetyScore: "91/100",
    visaAllowance: "60 Days Visa-Free",
  },
};

const GLOBAL_COUNTRY_DATABASE = [
  { match: ["spain", "madrid", "barcelona", "seville", "valencia", "malaga", "ibiza"], country: "Spain 🇪🇸", language: "Spanish", currency: "EUR (€)", timezone: "GMT+2", nomadCost: "$2,200/mo", wifiSpeed: "115 Mbps", safetyScore: "87/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["france", "paris", "lyon", "nice", "marseille"], country: "France 🇫🇷", language: "French", currency: "EUR (€)", timezone: "GMT+2", nomadCost: "$2,600/mo", wifiSpeed: "95 Mbps", safetyScore: "84/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["germany", "berlin", "munich", "hamburg", "frankfurt"], country: "Germany 🇩🇪", language: "German", currency: "EUR (€)", timezone: "GMT+2", nomadCost: "$2,300/mo", wifiSpeed: "110 Mbps", safetyScore: "89/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["italy", "rome", "milan", "florence", "venice"], country: "Italy 🇮🇹", language: "Italian", currency: "EUR (€)", timezone: "GMT+2", nomadCost: "$2,100/mo", wifiSpeed: "80 Mbps", safetyScore: "81/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["uk", "united kingdom", "england", "scotland", "wales", "london", "edinburgh", "manchester"], country: "United Kingdom 🇬🇧", language: "English", currency: "GBP (£)", timezone: "GMT+1", nomadCost: "$3,400/mo", wifiSpeed: "110 Mbps", safetyScore: "86/100", visaAllowance: "180 Days Visa-Free" },
  { match: ["us", "united states", "usa", "york", "angeles", "chicago", "miami", "san francisco"], country: "United States 🇺🇸", language: "English", currency: "USD ($)", timezone: "GMT-5", nomadCost: "$4,200/mo", wifiSpeed: "140 Mbps", safetyScore: "78/100", visaAllowance: "90 Days ESTA" },
  { match: ["japan", "tokyo", "kyoto", "osaka"], country: "Japan 🇯🇵", language: "Japanese", currency: "JPY (¥)", timezone: "GMT+9", nomadCost: "$2,350/mo", wifiSpeed: "165 Mbps", safetyScore: "96/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["sweden", "stockholm", "gothenburg"], country: "Sweden 🇸🇪", language: "Swedish", currency: "SEK (kr)", timezone: "GMT+2", nomadCost: "$2,800/mo", wifiSpeed: "135 Mbps", safetyScore: "91/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["australia", "sydney", "melbourne", "brisbane"], country: "Australia 🇦🇺", language: "English", currency: "AUD ($)", timezone: "GMT+10", nomadCost: "$3,000/mo", wifiSpeed: "95 Mbps", safetyScore: "88/100", visaAllowance: "90 Days eVisitor" },
  { match: ["thailand", "bangkok", "phuket", "chiang mai"], country: "Thailand 🇹🇭", language: "Thai", currency: "THB (฿)", timezone: "GMT+7", nomadCost: "$1,100/mo", wifiSpeed: "140 Mbps", safetyScore: "88/100", visaAllowance: "60 Days Visa-Free" },
  { match: ["indonesia", "bali", "canggu", "ubud", "jakarta"], country: "Indonesia 🇮🇩", language: "Indonesian", currency: "IDR (Rp)", timezone: "GMT+8", nomadCost: "$1,300/mo", wifiSpeed: "75 Mbps", safetyScore: "86/100", visaAllowance: "30 Days VOA" },
  { match: ["peru", "cusco", "lima", "machu picchu"], country: "Peru 🇵🇪", language: "Spanish / Quechua", currency: "PEN (S/)", timezone: "GMT-5", nomadCost: "$1,150/mo", wifiSpeed: "65 Mbps", safetyScore: "81/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["mexico", "mexico city", "cancun", "oaxaca", "tulum", "playa del carmen", "puerto vallarta"], country: "Mexico 🇲🇽", language: "Spanish", currency: "MXN ($)", timezone: "GMT-6", nomadCost: "$1,450/mo", wifiSpeed: "85 Mbps", safetyScore: "82/100", visaAllowance: "180 Days Visa-Free" },
  { match: ["argentina", "buenos aires", "mendoza", "bariloche"], country: "Argentina 🇦🇷", language: "Spanish", currency: "ARS ($)", timezone: "GMT-3", nomadCost: "$950/mo", wifiSpeed: "75 Mbps", safetyScore: "84/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["colombia", "medellin", "bogota", "cartagena"], country: "Colombia 🇨🇴", language: "Spanish", currency: "COP ($)", timezone: "GMT-5", nomadCost: "$1,050/mo", wifiSpeed: "70 Mbps", safetyScore: "79/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["chile", "santiago", "valparaiso"], country: "Chile 🇨🇱", language: "Spanish", currency: "CLP ($)", timezone: "GMT-3", nomadCost: "$1,550/mo", wifiSpeed: "130 Mbps", safetyScore: "88/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["brazil", "rio", "rio de janeiro", "sao paulo", "florianopolis"], country: "Brazil 🇧🇷", language: "Portuguese", currency: "BRL (R$)", timezone: "GMT-3", nomadCost: "$1,350/mo", wifiSpeed: "85 Mbps", safetyScore: "78/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["costa rica", "san jose", "tamarindo"], country: "Costa Rica 🇨🇷", language: "Spanish", currency: "CRC (₡)", timezone: "GMT-6", nomadCost: "$1,650/mo", wifiSpeed: "75 Mbps", safetyScore: "87/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["south africa", "cape town", "johannesburg"], country: "South Africa 🇿🇦", language: "English / Afrikaans", currency: "ZAR (R)", timezone: "GMT+2", nomadCost: "$1,400/mo", wifiSpeed: "80 Mbps", safetyScore: "76/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["morocco", "marrakech", "casablanca", "taghazout"], country: "Morocco 🇲🇦", language: "Arabic / Berber", currency: "MAD (DH)", timezone: "GMT+1", nomadCost: "$1,100/mo", wifiSpeed: "60 Mbps", safetyScore: "85/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["egypt", "cairo", "dahab", "alexandria"], country: "Egypt 🇪🇬", language: "Arabic", currency: "EGP (£)", timezone: "GMT+3", nomadCost: "$750/mo", wifiSpeed: "45 Mbps", safetyScore: "80/100", visaAllowance: "30 Days VOA" },
  { match: ["kenya", "nairobi", "mombasa"], country: "Kenya 🇰🇪", language: "Swahili / English", currency: "KES (KSh)", timezone: "GMT+3", nomadCost: "$1,200/mo", wifiSpeed: "55 Mbps", safetyScore: "78/100", visaAllowance: "eTA Required" },
  { match: ["uae", "dubai", "abu dhabi", "united arab emirates"], country: "United Arab Emirates 🇦🇪", language: "Arabic / English", currency: "AED (DH)", timezone: "GMT+4", nomadCost: "$3,600/mo", wifiSpeed: "180 Mbps", safetyScore: "95/100", visaAllowance: "30 Days Visa-Free" },
  { match: ["vietnam", "hanoi", "da nang", "ho chi minh", "saigon"], country: "Vietnam 🇻🇳", language: "Vietnamese", currency: "VND (₫)", timezone: "GMT+7", nomadCost: "$900/mo", wifiSpeed: "85 Mbps", safetyScore: "89/100", visaAllowance: "90 Days E-Visa" },
  { match: ["malaysia", "kuala lumpur", "penang"], country: "Malaysia 🇲🇾", language: "Malay / English", currency: "MYR (RM)", timezone: "GMT+8", nomadCost: "$1,200/mo", wifiSpeed: "120 Mbps", safetyScore: "88/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["singapore"], country: "Singapore 🇸🇬", language: "English / Malay", currency: "SGD ($)", timezone: "GMT+8", nomadCost: "$3,900/mo", wifiSpeed: "210 Mbps", safetyScore: "98/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["south korea", "seoul", "busan", "jeju"], country: "South Korea 🇰🇷", language: "Korean", currency: "KRW (₩)", timezone: "GMT+9", nomadCost: "$2,100/mo", wifiSpeed: "190 Mbps", safetyScore: "96/100", visaAllowance: "90 Days K-ETA" },
  { match: ["taiwan", "taipei"], country: "Taiwan 🇹🇼", language: "Mandarin", currency: "TWD (NT$)", timezone: "GMT+8", nomadCost: "$1,750/mo", wifiSpeed: "150 Mbps", safetyScore: "96/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["philippines", "manila", "cebu", "siargao"], country: "Philippines 🇵🇭", language: "Filipino / English", currency: "PHP (₱)", timezone: "GMT+8", nomadCost: "$1,100/mo", wifiSpeed: "65 Mbps", safetyScore: "81/100", visaAllowance: "30 Days Visa-Free" },
  { match: ["india", "mumbai", "delhi", "goa", "bengaluru"], country: "India 🇮🇳", language: "Hindi / English", currency: "INR (₹)", timezone: "GMT+5:30", nomadCost: "$800/mo", wifiSpeed: "75 Mbps", safetyScore: "79/100", visaAllowance: "30 Days E-Visa" },
  { match: ["new zealand", "auckland", "queenstown", "wellington"], country: "New Zealand 🇳🇿", language: "English / Māori", currency: "NZD ($)", timezone: "GMT+12", nomadCost: "$2,900/mo", wifiSpeed: "110 Mbps", safetyScore: "94/100", visaAllowance: "90 Days NZeTA" },
  { match: ["iceland", "reykjavik"], country: "Iceland 🇮🇸", language: "Icelandic / English", currency: "ISK (kr)", timezone: "GMT+0", nomadCost: "$3,700/mo", wifiSpeed: "140 Mbps", safetyScore: "97/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["greece", "athens", "santorini", "mykonos", "crete"], country: "Greece 🇬🇷", language: "Greek", currency: "EUR (€)", timezone: "GMT+3", nomadCost: "$1,800/mo", wifiSpeed: "75 Mbps", safetyScore: "87/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["turkey", "türkiye", "istanbul", "antalya"], country: "Turkey 🇹🇷", language: "Turkish", currency: "TRY (₺)", timezone: "GMT+3", nomadCost: "$1,100/mo", wifiSpeed: "65 Mbps", safetyScore: "83/100", visaAllowance: "90 Days Visa-Free" },
  { match: ["canada", "toronto", "vancouver", "montreal"], country: "Canada 🇨🇦", language: "English / French", currency: "CAD ($)", timezone: "GMT-5", nomadCost: "$3,200/mo", wifiSpeed: "135 Mbps", safetyScore: "92/100", visaAllowance: "180 Days eTA" },
];

export function getQuickFactsForDestination(destinationName = "") {
  const lower = destinationName.toLowerCase();
  const matchedKey = Object.keys(DESTINATION_QUICK_FACTS).find((k) => lower.includes(k));
  if (matchedKey) return DESTINATION_QUICK_FACTS[matchedKey];

  const matchedCountry = GLOBAL_COUNTRY_DATABASE.find((item) =>
    item.match.some((m) => {
      if (m.length <= 3) {
        const regex = new RegExp(`\\b${m}\\b`, "i");
        return regex.test(lower);
      }
      return lower.includes(m);
    })
  );

  const countryPart = destinationName.includes(",") ? destinationName.split(",").slice(1).join(",").trim() : destinationName.trim();
  const cityName = destinationName.split(",")[0].trim();

  if (matchedCountry) {
    return {
      population: `${cityName} Urban Region`,
      area: "City Region",
      country: matchedCountry.country,
      language: matchedCountry.language,
      currency: matchedCountry.currency,
      timezone: matchedCountry.timezone,
      bestTime: "Year Round",
      wifiSpeed: matchedCountry.wifiSpeed,
      nomadCost: matchedCountry.nomadCost,
      safetyScore: matchedCountry.safetyScore,
      visaAllowance: matchedCountry.visaAllowance,
    };
  }

  return {
    population: `${cityName} Urban Area`,
    area: "City Region",
    country: countryPart || "International",
    language: "Local Language",
    currency: "Local Currency",
    timezone: "Local Time",
    bestTime: "Apr–Oct",
    wifiSpeed: "85 Mbps",
    nomadCost: "$1,850/mo",
    safetyScore: "85/100",
    visaAllowance: "90 Days Stay",
  };
}

export function getNomadMetricsForDestination(destinationName = "") {
  const facts = getQuickFactsForDestination(destinationName);
  return [
    { label: "Nomad Living Cost", value: facts.nomadCost || "$1,950/mo", icon: "💰", type: "cost" },
    { label: "Wi-Fi Speed", value: facts.wifiSpeed || "90 Mbps", icon: "📶", type: "wifi" },
    { label: "Safety Rating", value: facts.safetyScore || "85/100", icon: "🛡️", type: "safety" },
    { label: "Visa Limit", value: facts.visaAllowance || "90 Days Visa-Free", icon: "🛂", type: "visa" },
  ];
}

export function getDestinationEtiquetteAndTips(destinationName = "") {
  const lower = String(destinationName || "").toLowerCase();
  const countryPart = destinationName.includes(",") ? destinationName.split(",").slice(1).join(",").trim().toLowerCase() : lower;
  const cityName = (destinationName || "Destination").split(",")[0].trim();

  if (lower.includes("paris") || lower.includes("france") || countryPart.includes("france") || lower.includes("lyon") || lower.includes("nice") || lower.includes("marseille")) {
    return {
      greeting: "Bonjour",
      tips: [
        `Greet staff with a polite <em>"Bonjour"</em> before ordering or asking questions.`,
        `Service charge (service compris) is included on food & drink bills by law; leaving 1–2€ extra is optional for great service.`,
        `Emergency numbers: <strong>112</strong> (General EU Emergency) · <strong>15</strong> (Medical/SAMU) · <strong>17</strong> (Police).`,
      ],
      emergency: "112 (EU Emergency) · 15 (SAMU) · 17 (Police)",
    };
  }

  if (lower.includes("london") || lower.includes("uk") || countryPart.includes("united kingdom") || lower.includes("england") || lower.includes("scotland") || lower.includes("edinburgh") || lower.includes("manchester")) {
    return {
      greeting: "Hello / Good morning",
      tips: [
        `Stand on the right side on escalators (especially on the London Underground tube network).`,
        `Tipping 10–12.5% is standard in sit-down restaurants if a discretionary service charge isn't already added to the bill.`,
        `Emergency numbers: <strong>999</strong> (UK Emergency) · <strong>112</strong> (EU Standard Emergency).`,
      ],
      emergency: "999 (UK Emergency) · 112 (EU)",
    };
  }

  if (lower.includes("york") || lower.includes("angeles") || lower.includes("chicago") || countryPart.includes("united states") || countryPart.includes("usa") || lower.includes("miami") || lower.includes("francisco")) {
    return {
      greeting: "Hello / Hi",
      tips: [
        `Tipping 18–20% is standard and expected for sit-down dining, bars, and taxis in the US.`,
        `Sales tax is added at checkout and is not included on item price tags.`,
        `Emergency numbers: <strong>911</strong> (US Emergency Police/Fire/Ambulance).`,
      ],
      emergency: "911 (US Emergency)",
    };
  }

  if (lower.includes("tokyo") || lower.includes("kyoto") || lower.includes("osaka") || countryPart.includes("japan") || lower.includes("japan")) {
    return {
      greeting: "Konnichiwa (こんにちは)",
      tips: [
        `No tipping is expected anywhere in Japan — exemplary service is included by default.`,
        `Keep your voice quiet on public transit, avoid eating while walking, and carry trash with you as public bins are rare.`,
        `Emergency numbers: <strong>110</strong> (Police) · <strong>119</strong> (Fire/Ambulance).`,
      ],
      emergency: "110 (Police) · 119 (Fire/Ambulance)",
    };
  }

  if (lower.includes("stockholm") || lower.includes("sweden") || countryPart.includes("sweden") || lower.includes("gothenburg")) {
    return {
      greeting: "Hej / Hej hej",
      tips: [
        `Sweden is almost 100% cashless; contactless card and mobile payments are accepted everywhere.`,
        `Say <em>"Hej"</em> when greeting staff and <em>"Tack"</em> (thank you) when receiving service.`,
        `Emergency numbers: <strong>112</strong> (General SOS Alarm) · <strong>114 14</strong> (Non-emergency Police).`,
      ],
      emergency: "112 (SOS Emergency) · 114 14 (Police)",
    };
  }

  if (lower.includes("crete") || lower.includes("athens") || lower.includes("santorini") || lower.includes("greece") || countryPart.includes("greece")) {
    return {
      greeting: "Yassas / Kalimera",
      tips: [
        `Say <em>"Kalimera"</em> (Good morning) or <em>"Yassas"</em> (Hello) when entering local tavernas and shops.`,
        `Tipping 5–10% in tavernas is appreciated for good table service; rounding up small bills is customary.`,
        `Emergency numbers: <strong>112</strong> (General EU Emergency) · <strong>100</strong> (Police) · <strong>166</strong> (Ambulance).`,
      ],
      emergency: "112 (EU Emergency) · 100 (Police) · 166 (Ambulance)",
    };
  }

  if (lower.includes("rome") || lower.includes("venice") || lower.includes("florence") || lower.includes("milan") || lower.includes("italy") || countryPart.includes("italy")) {
    return {
      greeting: "Buongiorno / Ciao",
      tips: [
        `Order cappuccino before 11am; after that, Italians stick to espresso (un caffè).`,
        `Coperto (cover charge) covers bread and table setting; extra tipping of 1–2€ per person is customary.`,
        `Emergency numbers: <strong>112</strong> (EU Emergency) · <strong>113</strong> (Police) · <strong>118</strong> (Medical).`,
      ],
      emergency: "112 (EU Emergency) · 113 (Police) · 118 (Medical)",
    };
  }

  if (lower.includes("barcelona") || lower.includes("madrid") || lower.includes("spain") || countryPart.includes("spain") || lower.includes("seville")) {
    return {
      greeting: "Hola / Buenos días",
      tips: [
        `Lunch is enjoyed late (2pm–4pm) and dinner typically starts after 8:30pm or 9pm.`,
        `Greet staff with <em>"Hola"</em> or <em>"Buenos días"</em>; rounding up or leaving small change (5–10%) is customary.`,
        `Emergency numbers: <strong>112</strong> (EU Emergency) · <strong>091</strong> (National Police) · <strong>061</strong> (Medical).`,
      ],
      emergency: "112 (EU Emergency) · 091 (Police) · 061 (Medical)",
    };
  }

  if (lower.includes("berlin") || lower.includes("munich") || lower.includes("germany") || countryPart.includes("germany") || lower.includes("frankfurt")) {
    return {
      greeting: "Hallo / Guten Tag",
      tips: [
        `Cash (Bargeld) is still preferred in smaller cafes and bakeries, so keep Euros handy.`,
        `Tipping 5–10% (Stimmt so) by rounding up when paying your server directly is standard etiquette.`,
        `Emergency numbers: <strong>112</strong> (Fire/Medical) · <strong>110</strong> (Police).`,
      ],
      emergency: "112 (Fire/Medical) · 110 (Police)",
    };
  }

  if (lower.includes("amsterdam") || lower.includes("netherlands") || countryPart.includes("netherlands") || lower.includes("dutch")) {
    return {
      greeting: "Hallo / Goedemorgen",
      tips: [
        `Watch out for active bike lanes! Walking in red-painted bike paths is dangerous and discouraged.`,
        `Card and contactless payments are preferred over cash almost everywhere in Amsterdam.`,
        `Emergency numbers: <strong>112</strong> (EU Emergency) · <strong>0900-8844</strong> (Non-emergency Police).`,
      ],
      emergency: "112 (EU Emergency)",
    };
  }

  return {
    greeting: "Hello / Good day",
    tips: [
      `Greet staff with polite local greetings when entering shops or restaurants in ${escapeHtml(cityName)}.`,
      `Check if service charges are included on food & drink bills; leaving a 5–10% tip or rounding up is widely appreciated.`,
      `Emergency numbers: <strong>112</strong> (Universal International Emergency) or local emergency services.`,
    ],
    emergency: "112 (International Emergency)",
  };
}

function sanitizeLocationName(raw = "") {
  let name = String(raw || "").trim();
  // Strip year, season, date strings, e.g. ", Fall 2026", " - Summer 2025", " 2026"
  name = name.replace(/,?\s*(?:Spring|Summer|Fall|Autumn|Winter)?\s*\b20\d\d\b.*$/i, "");
  name = name.replace(/,?\s*\b(Trip|Vacation|Holiday|Getaway|Tour)\b.*$/i, "");
  return name.trim() || raw.trim();
}

export async function fetchDynamicDestinationBrief(destinationName = "") {
  const cleanName = String(destinationName || "").trim();
  if (!cleanName) return null;

  const quickFacts = getQuickFactsForDestination(cleanName);

  if (summaryCache.has(cleanName)) {
    return { ...summaryCache.get(cleanName), quickFacts };
  }

  if (pendingFetches.has(cleanName)) {
    return null;
  }

  pendingFetches.add(cleanName);

  const sanitized = sanitizeLocationName(cleanName);
  const primarySearch = sanitized.split(",")[0].trim();
  const searchCandidates = Array.from(new Set([primarySearch, sanitized])).filter(Boolean);

  try {
    for (const candidate of searchCandidates) {
      const wikivoyageBrief = await fetchWikivoyageDestinationBrief(candidate, cleanName, quickFacts).catch(() => null);
      if (wikivoyageBrief) {
        summaryCache.set(cleanName, wikivoyageBrief);
        pendingFetches.delete(cleanName);
        return wikivoyageBrief;
      }
    }

    for (const candidate of searchCandidates) {
      try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`;
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        if (response.ok) {
          const data = await response.json();
          if (data && data.extract && data.type !== "disambiguation") {
            const brief = {
              destination: cleanName,
              title: data.title || candidate,
              description: data.description || "",
              standfirst: data.extract,
              whyStop: data.description ? `Recognized as ${data.description.toLowerCase()}.` : "",
              thumbnail: data.thumbnail?.source || "",
              heroImage: data.originalimage?.source || data.thumbnail?.source || "",
              source: "Wikipedia",
              sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(candidate)}`,
              quickFacts,
            };
            summaryCache.set(cleanName, brief);
            pendingFetches.delete(cleanName);
            return brief;
          }
        }
      } catch (err) {
        console.warn(`Wikipedia summary fetch error for ${candidate}:`, err);
      }
    }
  } finally {
    pendingFetches.delete(cleanName);
  }

  return null;
}

async function fetchWikivoyageDestinationBrief(candidate = "", destinationName = "", quickFacts = {}) {
  const title = sanitizeLocationName(candidate).split(",")[0].trim();
  if (!title) return null;
  const payload = await enrichmentService.fetchWikivoyageBrief({ title, lang: "en", limit: 3 });
  const article = payload.article || {};
  const standfirst = article.abstract || article.standfirst || "";
  if (payload.status !== "ready" || !standfirst) return null;

  return {
    destination: destinationName,
    title: article.title || title,
    description: article.description || "",
    standfirst,
    whyStop: article.sections?.[0]?.text ? truncateBriefText(article.sections[0].text, 220) : "",
    thumbnail: article.thumbnail || "",
    heroImage: article.heroImage || article.thumbnail || "",
    source: "Wikivoyage",
    sourceUrl: article.sourceUrl || `https://en.wikivoyage.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
    sourceProvider: article.source || payload.source || "wikivoyage-enterprise",
    sections: article.sections || [],
    quickFacts,
  };
}

function truncateBriefText(value = "", maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}
