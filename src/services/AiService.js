/**
 * AiService — Client interface for Cloudflare Workers AI endpoints.
 * Handles auto-captioning, postcard styling, and concierge assistant requests.
 */

export const aiService = {
  async autoDescribeMoment({ location = "Paris, France", type = "photo", hint = "" } = {}) {
    try {
      const response = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, type, hint }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) return data;
      }
    } catch (e) {
      console.warn("AI caption API offline, using client fallback:", e);
    }

    const adjectives = ["Sunlit", "Cozy", "Unforgettable", "Charming", "Serene", "Vibrant"];
    const selectedAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    return {
      success: true,
      caption: `${selectedAdj} ${type} moment captured in ${location}.`,
      tags: ["#trip", "#memory", `#${location.split(',')[0].toLowerCase().replace(/\s+/g, '')}`],
      suggestedTitle: `${selectedAdj} ${location.split(',')[0]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      aiModel: "client-fallback",
    };
  },

  async generatePostcard({ location = "Paris, France", style = "vintage", title = "Greetings from", date = "" } = {}) {
    try {
      const response = await fetch("/api/ai/postcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, style, title, date }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) return data;
      }
    } catch (e) {
      console.warn("AI postcard API offline, using client fallback:", e);
    }

    return {
      success: true,
      style,
      location,
      title,
      date: date || new Date().toISOString().split("T")[0],
      stampText: `${location.toUpperCase()} • POSTAL SERVICE`,
      vintageFilter: style === "watercolor" ? "sepia(0.3) saturate(1.4) contrast(1.1)" : style === "polaroid" ? "contrast(1.25) brightness(1.1) sepia(0.2)" : "sepia(0.55) contrast(1.15)",
      aiModel: "client-fallback",
    };
  },

  async askConcierge({ prompt = "", trip = { destination: "Destination" }, personas = ["Food Explorer"], context = {}, provider = "auto", keys = {} } = {}) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (keys.openAiKey) headers["X-OpenAI-Key"] = keys.openAiKey;
      if (keys.geminiKey) headers["X-Gemini-Key"] = keys.geminiKey;
      if (keys.claudeKey) headers["X-Anthropic-Key"] = keys.claudeKey;
      if (keys.grokKey) headers["X-Grok-Key"] = keys.grokKey;
      if (keys.openRouterKey) headers["X-OpenRouter-Key"] = keys.openRouterKey;
      if (keys.groqKey) headers["X-Groq-Key"] = keys.groqKey;

      const response = await fetch("/api/ai/concierge", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, trip, personas, context, provider }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.answer) return data;
      }
    } catch (e) {
      console.warn("AI Concierge API offline, using dynamic client fallback:", e);
    }

    return {
      success: true,
      answer: generateDynamicConciergeFallback({ prompt, trip, personas, context }),
      aiModel: provider !== "auto" ? `${provider}-client` : "trip-concierge-fallback",
    };
  },
};

function generateDynamicConciergeFallback({ prompt = "", trip = {}, personas = [], context = {} }) {
  const destination = trip.destination || context.destination || "Destination";
  const cityName = destination.split(",")[0].trim();
  const weather = trip.weather || context.weather || {};
  const weatherStr = weather.condition ? `${weather.condition}, ${weather.temp || ""}` : "";
  const pois = context.pois || [];
  const lowerPrompt = prompt.toLowerCase();

  let answer = `Here are personalized recommendations for **${destination}**`;
  if (weatherStr) answer += ` (${weatherStr})`;
  answer += `:\n\n`;

  let matchedPois = [];
  if (lowerPrompt.includes("coffee") || lowerPrompt.includes("espresso") || lowerPrompt.includes("cafe")) {
    matchedPois = pois.filter(p => (p.category === "cafe" || (p.name || "").toLowerCase().includes("coffee") || (p.name || "").toLowerCase().includes("cafe")));
    if (matchedPois.length) {
      answer += matchedPois.slice(0, 3).map(p => `☕ **${p.name}**${p.address ? ` (${p.address})` : ""} — Great local cafe in ${cityName}.`).join("\n");
    } else {
      answer += `☕ **Artisanal Coffee in ${cityName}** — Explore independent third-wave roasters and specialty coffee bars around ${cityName}.\n☕ **Neighborhood Roaster** — Enjoy fresh espresso and local pastries in the central quarter.`;
    }
  } else if (lowerPrompt.includes("rain") || lowerPrompt.includes("indoor") || lowerPrompt.includes("weather")) {
    matchedPois = pois.filter(p => (p.category === "museum" || p.category === "gallery" || p.category === "sight" || (p.name || "").toLowerCase().includes("museum")));
    if (matchedPois.length) {
      answer += matchedPois.slice(0, 3).map(p => `☔ **${p.name}** — Wonderful indoor culture & discovery in ${cityName}.`).join("\n");
    } else {
      answer += `☔ **Central Museums & Art Galleries** — Perfect indoor culture in ${cityName}.\n🏛️ **Historic Food Halls & Covered Arcades** — Stay dry while enjoying local food and boutique shopping in ${cityName}.`;
    }
  } else if (lowerPrompt.includes("hidden") || lowerPrompt.includes("secret") || lowerPrompt.includes("crowd")) {
    matchedPois = pois.filter(p => (p.category === "hidden_gem" || (p.tags || []).includes("hidden")));
    if (matchedPois.length) {
      answer += matchedPois.slice(0, 3).map(p => `🌿 **${p.name}** — Hidden local discovery in ${cityName}.`).join("\n");
    } else {
      answer += `🌿 **Secluded Courtyards & Quiet Parks** — Escape the main tourist crowds in ${cityName}.\n🍷 **Local Neighborhood Wine Bar** — Cozy spot frequented by ${cityName} residents.`;
    }
  } else if (lowerPrompt.includes("food") || lowerPrompt.includes("dinner") || lowerPrompt.includes("wine") || lowerPrompt.includes("restaurant")) {
    matchedPois = pois.filter(p => (p.category === "restaurant" || p.category === "food" || p.category === "wine"));
    if (matchedPois.length) {
      answer += matchedPois.slice(0, 3).map(p => `🍽️ **${p.name}**${p.address ? ` (${p.address})` : ""} — Recommended dining spot in ${cityName}.`).join("\n");
    } else {
      answer += `🍽️ **Authentic Bistros & Regional Cuisine** — Taste traditional local specialties in ${cityName}.\n🍷 **Evening Wine Bar** — Relax with local craft beverages and small plates in ${cityName}.`;
    }
  } else {
    if (pois.length > 0) {
      const topPois = pois.slice(0, 4);
      answer += topPois.map(p => `📍 **${p.name}** (${p.category || "highlight"}) — Top place to explore in ${cityName}.`).join("\n");
    } else {
      answer += `✨ **Historic District & Plaza** — Explore the iconic streets and landmarks of ${cityName}.\n🏛️ **Museums & Cultural Sights** — Experience the heritage of ${cityName}.\n☕ **Central Square & Promenade** — Enjoy the local atmosphere and scenic views.`;
    }
  }

  return answer;
}
