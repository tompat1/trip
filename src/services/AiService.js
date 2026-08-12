/**
 * AiService — Client interface for Cloudflare Workers AI endpoints.
 * Handles auto-captioning, postcard styling, and concierge assistant requests.
 */

export const aiService = {
  async searchSuggestions({ query = "", destination = "Destination", keys = {} } = {}) {
    if (!query || query.trim().length < 2) return { success: true, suggestions: [] };
    try {
      const headers = { "Content-Type": "application/json" };
      if (keys.groqKey) headers["X-Groq-Key"] = keys.groqKey;
      if (keys.geminiKey) headers["X-Gemini-Key"] = keys.geminiKey;

      const response = await fetch("/api/ai/search-suggest", {
        method: "POST",
        headers,
        body: JSON.stringify({ query, destination }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.suggestions)) return data;
      }
    } catch (e) {
      console.warn("AI search suggest offline, using fallback:", e);
    }
    const area = destination.split(",")[0].trim();
    return {
      success: true,
      suggestions: [
        { title: `${query} in ${area}`, category: "Local Spot", tag: "#explore", reason: `Discover authentic ${query} spots near ${area}.` },
        { title: `${area} Top ${query}`, category: "Popular", tag: "#recommendation", reason: `Must-visit places matching ${query}.` }
      ],
      provider: "client-fallback"
    };
  },

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
    // 1. Try backend Cloudflare Worker API
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
      console.warn("AI Concierge API worker offline, trying direct client fetch:", e);
    }

    // 2. Direct Client-side Provider Executions if user supplied API keys
    const destination = trip.destination || context.destination || "Destination";
    const poiSummary = (context.pois || []).map(p => `- ${p.name} (${p.category || "spot"})`).join("\n");
    const eventSummary = (context.events || []).map(e => `- ${e.title || e.artist} at ${e.venue || "Venue TBA"} (${e.dates || "Upcoming"}${e.genre ? `, ${e.genre}` : ""})`).join("\n");
    const systemPrompt = `You are TRIP AI, an expert, charming travel concierge for ${destination}.
${poiSummary ? `Local POIs:\n${poiSummary}\n` : ""}${eventSummary ? `Live events:\n${eventSummary}\n` : ""}
If the user asks for top events, concerts, gigs, shows, or festivals, rank and use the live events above. Otherwise provide 3-5 specific, famous local spot recommendations with exact names in bold (e.g. **Ten Belles**) and short descriptions.`;

    if (provider === "gemini" && keys.geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.geminiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nQuestion: ${prompt}` }] }] })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { success: true, answer: text, aiModel: "gemini-1.5-flash" };
        }
      } catch (err) { console.warn("Client Gemini error:", err); }
    }

    if (provider === "groq-free" && keys.groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keys.groqKey}` },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }] })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { success: true, answer: text, aiModel: "groq-llama3.3-speed" };
        }
      } catch (err) { console.warn("Client Groq error:", err); }
    }

    if (provider === "openai" && keys.openAiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keys.openAiKey}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }] })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { success: true, answer: text, aiModel: "gpt-4o-mini" };
        }
      } catch (err) { console.warn("Client OpenAI error:", err); }
    }

    if ((provider === "deepseek-free" || provider === "openrouter-free") && keys.openRouterKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keys.openRouterKey}` },
          body: JSON.stringify({
            model: provider === "deepseek-free" ? "deepseek/deepseek-r1:free" : "meta-llama/llama-3.3-70b-instruct:free",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { success: true, answer: text, aiModel: provider === "deepseek-free" ? "deepseek-r1-free" : "llama-3.3-free" };
        }
      } catch (err) { console.warn("Client OpenRouter error:", err); }
    }

    // 3. Rich Curated City Fallback
    return {
      success: true,
      answer: generateRichConciergeFallback({ prompt, trip, context }),
      aiModel: provider !== "auto" ? `${provider}-fallback` : "trip-concierge-fallback",
    };
  },
};

const CITY_RECOMMENDATIONS = {
  paris: {
    coffee: [
      { name: "Ten Belles", address: "10 Rue de la Grange aux Belles", desc: "Iconic Canal Saint-Martin specialty coffee pioneer with exquisite espresso & sourdough bakery items." },
      { name: "Telescope Coffee", address: "5 Rue Villedo", desc: "Cozy Palais Royal minimalist cafe famous for precision filter coffee, flat whites & house bakes." },
      { name: "KB Coffee Roasters", address: "53 Avenue Trudaine", desc: "Vibrant South Pigalle roastery with a sunny terrace overlooking Sacré-Cœur." },
      { name: "Coutume Café", address: "47 Rue de Babylone", desc: "Elegant Left Bank roastery serving single-origin coffees & gourmet Parisian brunch." },
      { name: "Café Lomi", address: "3D Rue Stephenson", desc: "Renowned 18th-arrondissement specialty roaster with spacious industrial-chic vibes." }
    ],
    rain: [
      { name: "Musée d'Orsay", address: "1 Rue de la Légion d'Honneur", desc: "Breathtaking Impressionist art collection housed inside a grand converted Belle Époque railway station." },
      { name: "Galerie Vivienne", address: "4 Rue de la Banque", desc: "Elegant 1823 covered passage featuring mosaic tile floors, antiquarian bookshops & tea salons." },
      { name: "Fondation Louis Vuitton", address: "8 Avenue du Mahatma Gandhi", desc: "Frank Gehry architectural masterpiece with contemporary art exhibitions in Bois de Boulogne." }
    ],
    hidden: [
      { name: "Musée de la Vie Romantique", address: "16 Rue Chaptal", desc: "Secret garden cafe and Romantic-era museum hidden at the foot of Montmartre." },
      { name: "Coulée Verte René-Dumont", address: "1 12th Arrondissement", desc: "Elevated tree-lined park built along an abandoned 19th-century railway viaduct." },
      { name: "Square René Viviani", address: "2 Rue du Fouarre", desc: "Quiet Left Bank garden housing Paris's oldest tree (planted in 1601) with Notre-Dame views." }
    ],
    dining: [
      { name: "Le Baron Rouge", address: "1 Rue Théophile Roussel", desc: "Beloved Aligre neighborhood wine bar serving natural wines from oak barrels with oysters on weekends." },
      { name: "Le Comptoir du Relais", address: "9 Carrefour de l'Odéon", desc: "Legendary Saint-Germain gastro-bistro by Chef Yves Camdeborde." },
      { name: "Septime La Cave", address: "3 Rue Basfroi", desc: "Intimate natural wine bar with inventive small tapas plates in Charonne." }
    ]
  }
};

function generateRichConciergeFallback({ prompt = "", trip = {}, context = {} }) {
  const destination = trip.destination || context.destination || "Destination";
  const lowerDest = destination.toLowerCase();
  const cityName = destination.split(",")[0].trim();
  const lowerPrompt = prompt.toLowerCase();
  const weather = trip.weather || context.weather || {};
  const weatherStr = weather.condition ? `${weather.condition}, ${weather.temp || ""}` : "";
  const events = context.events || trip.events || [];

  let category = "general";
  if (lowerPrompt.includes("coffee") || lowerPrompt.includes("espresso") || lowerPrompt.includes("cafe")) category = "coffee";
  else if (lowerPrompt.includes("rain") || lowerPrompt.includes("indoor")) category = "rain";
  else if (lowerPrompt.includes("hidden") || lowerPrompt.includes("secret")) category = "hidden";
  else if (lowerPrompt.includes("food") || lowerPrompt.includes("dinner") || lowerPrompt.includes("wine")) category = "dining";
  else if (isEventPrompt(lowerPrompt)) category = "events";

  let answer = `Here are Concierge recommendations for **${destination}**`;
  if (weatherStr) answer += ` (${weatherStr})`;
  answer += `:\n\n`;

  if (category === "events" && events.length > 0) {
    answer += events.slice(0, 10).map((event, index) => {
      const title = event.title || event.artist || event.name || `Event ${index + 1}`;
      const venue = event.venue || "Venue TBA";
      const dates = event.dates || event.date || "Upcoming";
      const genre = event.genre || event.category || "Live Event";
      const source = event.provider || event.source || "";
      return `🎟️ **${title}** — ${venue} • ${dates} • ${genre}${source ? ` (${source})` : ""}`;
    }).join("\n\n");
    return answer;
  }

  if (lowerDest.includes("paris") && CITY_RECOMMENDATIONS.paris[category]) {
    const spots = CITY_RECOMMENDATIONS.paris[category];
    const emoji = category === "coffee" ? "☕" : category === "rain" ? "☔" : category === "hidden" ? "🌿" : "🍷";
    answer += spots.map(s => `${emoji} **${s.name}** (${s.address}) — ${s.desc}`).join("\n\n");
    return answer;
  }

  // Generic fallback if city not pre-cached & no live POIs
  const pois = context.pois || [];
  if (pois.length > 0) {
    answer += pois.slice(0, 4).map(p => `📍 **${p.name}** (${p.address || cityName}) — Recommended local spot in ${cityName}.`).join("\n\n");
  } else {
    answer += `☕ **Artisanal Coffee & Roasters** (${cityName}) — Independent specialty coffee bars in the central quarter.\n\n📍 **Historic District & Promenade** (${cityName}) — Scenic streets, local markets, and architecture.`;
  }

  return answer;
}

function isEventPrompt(prompt = "") {
  return /\b(event|events|concert|concerts|gig|gigs|show|shows|festival|festivals|live music|tonight|during trip)\b/i.test(prompt);
}
