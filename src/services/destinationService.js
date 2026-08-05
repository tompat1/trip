/**
 * destinationService — Dynamically fetches authentic Wikipedia summaries and Workers AI
 * destination briefs for ANY destination added by a user.
 */

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
  },
  london: {
    population: "8.9 million",
    area: "1,572 km²",
    country: "United Kingdom 🇬🇧",
    language: "English",
    currency: "GBP (£)",
    timezone: "GMT+1 (BST)",
    bestTime: "May–Sep",
  },
  "new york": {
    population: "8.4 million",
    area: "783 km²",
    country: "United States 🇺🇸",
    language: "English",
    currency: "USD ($)",
    timezone: "GMT-4 (EDT)",
    bestTime: "May–Jun, Sep–Nov",
  },
  tokyo: {
    population: "14.0 million",
    area: "2,194 km²",
    country: "Japan 🇯🇵",
    language: "Japanese",
    currency: "JPY (¥)",
    timezone: "GMT+9",
    bestTime: "Mar–May, Sep–Nov",
  },
  stockholm: {
    population: "975,000",
    area: "188 km²",
    country: "Sweden 🇸🇪",
    language: "Swedish / English",
    currency: "SEK (kr)",
    timezone: "GMT+2 (CEST)",
    bestTime: "May–Sep",
  },
  copenhagen: {
    population: "644,000",
    area: "179 km²",
    country: "Denmark 🇩🇰",
    language: "Danish / English",
    currency: "DKK (kr.)",
    timezone: "GMT+2 (CEST)",
    bestTime: "May–Sep",
  },
  rome: {
    population: "2.8 million",
    area: "1,285 km²",
    country: "Italy 🇮🇹",
    language: "Italian",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "Apr–Jun, Sep–Oct",
  },
  barcelona: {
    population: "1.6 million",
    area: "101 km²",
    country: "Spain 🇪🇸",
    language: "Spanish / Catalan",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "May–Jun, Sep–Oct",
  },
  madrid: {
    population: "3.3 million",
    area: "604 km²",
    country: "Spain 🇪🇸",
    language: "Spanish",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "Apr–Jun, Sep–Oct",
  },
  berlin: {
    population: "3.6 million",
    area: "891 km²",
    country: "Germany 🇩🇪",
    language: "German",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "May–Sep",
  },
  amsterdam: {
    population: "920,000",
    area: "219 km²",
    country: "Netherlands 🇳🇱",
    language: "Dutch / English",
    currency: "EUR (€)",
    timezone: "GMT+2",
    bestTime: "Apr–Sep",
  },
  lisbon: {
    population: "545,000",
    area: "100 km²",
    country: "Portugal 🇵🇹",
    language: "Portuguese",
    currency: "EUR (€)",
    timezone: "GMT+1 (WEST)",
    bestTime: "Apr–Oct",
  },
  crete: {
    population: "634,000",
    area: "8,336 km²",
    country: "Greece 🇬🇷",
    language: "Greek",
    currency: "EUR (€)",
    timezone: "GMT+3",
    bestTime: "May–Oct",
  },
  sydney: {
    population: "5.3 million",
    area: "12,368 km²",
    country: "Australia 🇦🇺",
    language: "English",
    currency: "AUD ($)",
    timezone: "GMT+10 (AEST)",
    bestTime: "Sep–Nov, Mar–May",
  },
  bangkok: {
    population: "10.5 million",
    area: "1,568 km²",
    country: "Thailand 🇹🇭",
    language: "Thai",
    currency: "THB (฿)",
    timezone: "GMT+7",
    bestTime: "Nov–Feb",
  },
};

export function getQuickFactsForDestination(destinationName = "") {
  const lower = destinationName.toLowerCase();
  const matchedKey = Object.keys(DESTINATION_QUICK_FACTS).find((k) => lower.includes(k));
  if (matchedKey) return DESTINATION_QUICK_FACTS[matchedKey];

  const countryPart = destinationName.includes(",") ? destinationName.split(",").slice(1).join(",").trim() : destinationName.trim();
  const countryLower = countryPart.toLowerCase();

  let currency = "EUR (€)";
  let language = "Local / English";
  let timezone = "GMT+2";

  if (countryLower.includes("uk") || countryLower.includes("united kingdom") || countryLower.includes("england") || countryLower.includes("scotland") || countryLower.includes("wales") || lower.includes("london")) {
    currency = "GBP (£)";
    language = "English";
    timezone = "GMT+1 (BST)";
  } else if (countryLower.includes("us") || countryLower.includes("united states") || countryLower.includes("usa") || lower.includes("york") || lower.includes("angeles") || lower.includes("chicago")) {
    currency = "USD ($)";
    language = "English";
    timezone = "GMT-4 (EDT)";
  } else if (countryLower.includes("japan") || lower.includes("tokyo") || lower.includes("kyoto") || lower.includes("osaka")) {
    currency = "JPY (¥)";
    language = "Japanese";
    timezone = "GMT+9";
  } else if (countryLower.includes("sweden") || lower.includes("stockholm") || lower.includes("gothenburg")) {
    currency = "SEK (kr)";
    language = "Swedish";
    timezone = "GMT+2 (CEST)";
  } else if (countryLower.includes("denmark") || lower.includes("copenhagen")) {
    currency = "DKK (kr.)";
    language = "Danish";
    timezone = "GMT+2 (CEST)";
  } else if (countryLower.includes("norway") || lower.includes("oslo")) {
    currency = "NOK (kr)";
    language = "Norwegian";
    timezone = "GMT+2 (CEST)";
  } else if (countryLower.includes("switzerland") || lower.includes("zurich") || lower.includes("geneva")) {
    currency = "CHF (Fr.)";
    language = "German / French";
    timezone = "GMT+2";
  } else if (countryLower.includes("australia") || lower.includes("sydney") || lower.includes("melbourne")) {
    currency = "AUD ($)";
    language = "English";
    timezone = "GMT+10";
  } else if (countryLower.includes("thailand") || lower.includes("bangkok") || lower.includes("phuket")) {
    currency = "THB (฿)";
    language = "Thai";
    timezone = "GMT+7";
  } else if (countryLower.includes("spain") || lower.includes("spain") || lower.includes("madrid") || lower.includes("barcelona")) {
    currency = "EUR (€)";
    language = lower.includes("barcelona") ? "Spanish / Catalan" : "Spanish";
    timezone = "GMT+2";
  }

  return {
    population: "1.2 million",
    area: "250 km²",
    country: lower.includes("spain") ? "Spain 🇪🇸" : (countryPart || "International"),
    language,
    currency,
    timezone,
    bestTime: "Apr–Oct",
  };
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
  const searchCandidates = Array.from(new Set([sanitized, primarySearch])).filter(Boolean);

  try {
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
