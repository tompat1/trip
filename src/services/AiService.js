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

  async askConcierge({ prompt = "", trip = { destination: "Paris, France" }, personas = ["Food Explorer"] } = {}) {
    try {
      const response = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, trip, personas }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) return data;
      }
    } catch (e) {
      console.warn("AI Concierge API offline, using client fallback:", e);
    }

    let answer = `Here are some recommendations for ${trip.destination} (${personas.join(", ")}):\n\n`;
    const lower = prompt.toLowerCase();
    if (lower.includes("coffee") || lower.includes("espresso")) {
      answer += "☕ **Télescope Coffee** (Saint-Germain) — Exceptional pour-over & espresso.\n☕ **Coutume Café** — Specialty roaster with artisanal pastries.";
    } else if (lower.includes("rain") || lower.includes("indoor")) {
      answer += "☔ **Musée d'Orsay** — Iconic Impressionist art in a magnificent station.\n🏛️ **Galerie Vivienne** — Glass-roofed 19th century covered passages.";
    } else if (lower.includes("hidden") || lower.includes("secret")) {
      answer += "🌿 **Square du Vert-Galant** — Secluded tree-lined park tip at Île de la Cité.\n🍷 **Le Baron Rouge** — Vibrant natural wine bar with fresh oysters.";
    } else {
      answer += `✨ **Sainte-Chapelle** — 13th-century Gothic stained glass windows.\n🏛️ **Louvre Museum** — World-famous art collections.\n☕ **Café de Flore** — Historic literary cafe.`;
    }

    return {
      success: true,
      answer,
      aiModel: "client-fallback",
    };
  },
};
