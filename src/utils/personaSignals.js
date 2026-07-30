export const PERSONA_SEARCH_SIGNALS = {
  "🏛️ Architect": {
    label: "Architect",
    keywords: ["architecture", "architect", "design", "building", "monument", "landmark", "palace", "cathedral", "tower", "urban"],
    openTripMapKinds: ["architecture", "monuments", "urban_environment"],
    osmIntent: "culture",
    chip: { id: "architecture", label: "🏛️ Architecture", query: "Architecture landmarks" },
  },
  "🗺️ Route Master": {
    label: "Route Master",
    keywords: ["route", "walk", "walking", "scenic", "view", "bridge", "trail", "navigation", "river", "road"],
    openTripMapKinds: ["natural", "view_points", "urban_environment"],
    osmIntent: "routes",
    chip: { id: "routes", label: "🗺️ Scenic Routes", query: "Scenic walks and routes" },
  },
  "☕ Coffee Hunter": {
    label: "Coffee Hunter",
    keywords: ["coffee", "cafe", "café", "espresso", "roaster", "roastery", "pastry", "specialty"],
    openTripMapKinds: ["foods", "cafes"],
    osmIntent: "coffee",
    chip: { id: "coffee-persona", label: "☕ Coffee Hunter Picks", query: "Specialty coffee" },
  },
  "🍽️ Food Explorer": {
    label: "Food Explorer",
    keywords: ["restaurant", "food", "dining", "bistro", "tavern", "local cuisine", "brunch", "market", "wine", "pastry"],
    openTripMapKinds: ["foods", "restaurants", "cafes"],
    osmIntent: "food",
    chip: { id: "food-persona", label: "🍽️ Food Explorer Picks", query: "Restaurants and local food" },
  },
  "🍷 Wine Seeker": {
    label: "Wine Seeker",
    keywords: ["wine", "bar", "vineyard", "tasting", "cellar", "bistro", "cheese"],
    openTripMapKinds: ["foods", "bars"],
    osmIntent: "nightlife",
    chip: { id: "wine-persona", label: "🍷 Wine Spots", query: "Wine bars and tastings" },
  },
  "📸 Memory Maker": {
    label: "Memory Maker",
    keywords: ["photo", "view", "scenic", "sunset", "sunrise", "golden", "landmark", "river", "tower", "viewpoint"],
    openTripMapKinds: ["view_points", "monuments", "architecture", "natural"],
    osmIntent: "views",
    chip: { id: "photo", label: "📸 Photo Moments", query: "Best photo spots" },
  },
  "🌍 Local Explorer": {
    label: "Local Explorer",
    keywords: ["hidden", "local", "neighborhood", "market", "away", "gem", "street", "small", "cozy"],
    openTripMapKinds: ["interesting_places", "urban_environment", "foods"],
    osmIntent: "local",
    chip: { id: "hidden", label: "🌍 Hidden Gems", query: "Hidden local gems" },
  },
  "🏛️ History Buff": {
    label: "History Buff",
    keywords: ["history", "historical", "museum", "monument", "palace", "cathedral", "heritage", "old", "cultural"],
    openTripMapKinds: ["historic", "museums", "monuments", "archaeology"],
    osmIntent: "culture",
    chip: { id: "history", label: "🏛️ History", query: "Historical places" },
  },
  "🎨 Culture Seeker": {
    label: "Culture Seeker",
    keywords: ["museum", "gallery", "art", "culture", "architecture", "theatre", "opera", "event", "concert"],
    openTripMapKinds: ["cultural", "museums", "galleries", "architecture"],
    osmIntent: "culture",
    chip: { id: "culture", label: "🎨 Culture", query: "Museums galleries events" },
  },
  "🌄 Nature Lover": {
    label: "Nature Lover",
    keywords: ["park", "garden", "nature", "beach", "forest", "hiking", "trail", "viewpoint", "river"],
    openTripMapKinds: ["natural", "beaches", "parks", "view_points"],
    osmIntent: "nature",
    chip: { id: "nature", label: "🌄 Nature", query: "Parks viewpoints nature" },
  },
  "🌅 Sunrise Chaser": {
    label: "Sunrise Chaser",
    keywords: ["sunrise", "sunset", "golden", "view", "viewpoint", "river", "scenic", "morning"],
    openTripMapKinds: ["view_points", "natural", "urban_environment"],
    osmIntent: "views",
    chip: { id: "sunrise", label: "🌅 Golden Hour", query: "Sunrise sunset viewpoints" },
  },
  "🌙 Night Owl": {
    label: "Night Owl",
    keywords: ["night", "bar", "jazz", "club", "evening", "cocktail", "music", "concert", "late"],
    openTripMapKinds: ["bars", "foods", "cultural"],
    osmIntent: "nightlife",
    chip: { id: "night", label: "🌙 Night Moves", query: "Bars nightlife evening" },
  },
  "🚗 Driver": {
    label: "Driver",
    keywords: ["parking", "drive", "road", "scenic", "route", "viewpoint", "station", "transport"],
    openTripMapKinds: ["view_points", "natural", "interesting_places"],
    osmIntent: "driver",
    chip: { id: "driver", label: "🚗 Easy Drives", query: "Scenic routes parking viewpoints" },
  },
  "💰 Budget Keeper": {
    label: "Budget Keeper",
    keywords: ["free", "market", "park", "walk", "public", "budget", "cheap", "affordable"],
    openTripMapKinds: ["parks", "urban_environment", "interesting_places"],
    osmIntent: "budget",
    chip: { id: "budget", label: "💰 Budget Friendly", query: "Free affordable things" },
  },
  "🛍️ Shopper": {
    label: "Shopper",
    keywords: ["shopping", "shop", "boutique", "market", "souvenir", "design", "fashion"],
    openTripMapKinds: ["shops", "urban_environment", "interesting_places"],
    osmIntent: "shopping",
    chip: { id: "shopping", label: "🛍️ Shops & Markets", query: "Boutiques markets shopping" },
  },
  "📅 Organizer": {
    label: "Organizer",
    keywords: ["reservation", "schedule", "tour", "ticket", "timed", "museum", "event"],
    openTripMapKinds: ["museums", "cultural", "interesting_places"],
    osmIntent: "traveler",
    chip: { id: "organized", label: "📅 Easy To Plan", query: "Tours tickets reservations" },
  },
  "🎟️ Event Scout": {
    label: "Event Scout",
    keywords: ["event", "concert", "festival", "gig", "music", "venue", "ticket", "tour"],
    openTripMapKinds: ["cultural", "theatres_and_entertainments"],
    osmIntent: "events",
    chip: { id: "events", label: "🎟️ Events", query: "Concerts festivals events", cat: "Concerts" },
  },
  "🤝 Social Connector": {
    label: "Social Connector",
    keywords: ["group", "social", "bar", "restaurant", "market", "event", "tour", "venue"],
    openTripMapKinds: ["foods", "cultural", "interesting_places"],
    osmIntent: "social",
    chip: { id: "social", label: "🤝 Group Friendly", query: "Group friendly places" },
  },
};

export function getPersonaSignals(personas = []) {
  return [...new Set(personas)]
    .map((persona) => {
      const signal = PERSONA_SEARCH_SIGNALS[persona];
      return signal ? { persona, ...signal } : null;
    })
    .filter(Boolean);
}

export function getPersonaSummary(personas = [], limit = 3) {
  const labels = getPersonaSignals(personas).map((signal) => signal.label);
  if (labels.length <= limit) return labels.join(", ");
  return `${labels.slice(0, limit).join(", ")} +${labels.length - limit}`;
}

export function getPersonaQuickIntentChips(activePersonaSignals = [], baseChips = []) {
  const personaChips = activePersonaSignals
    .map((signal) => signal.chip ? { ...signal.chip, isPersona: true } : null)
    .filter(Boolean);
  const activePersonas = new Set(activePersonaSignals.map((signal) => signal.persona));
  const scoredBaseChips = baseChips
    .map((chip) => ({
      ...chip,
      isPersona: (chip.personas || []).some((persona) => activePersonas.has(persona)),
      personaWeight: (chip.personas || []).filter((persona) => activePersonas.has(persona)).length,
    }))
    .sort((a, b) => b.personaWeight - a.personaWeight);

  const seen = new Set();
  return [...personaChips, ...scoredBaseChips].filter((chip) => {
    const key = `${chip.query}-${chip.cat || "All"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function hydratePersonaChipsWithDiscoveryCount(chips = [], discoveryPois = []) {
  if (!discoveryPois.length) return chips;

  return chips
    .map((chip) => {
      const matchTerms = [chip.label, chip.query, chip.cat].filter(Boolean).map((t) => t.toLowerCase());
      const count = discoveryPois.filter((poi) => {
        const text = `${poi.title || ""} ${poi.category || ""} ${poi.subtitle || ""}`.toLowerCase();
        return matchTerms.some((term) => text.includes(term));
      }).length;

      return {
        ...chip,
        matchCount: count,
        badgeLabel: count > 0 ? `${count}` : "",
      };
    })
    .sort((a, b) => (b.matchCount || 0) - (a.matchCount || 0));
}

export function getPersonaDiscoveryContext(personas = []) {
  const signals = getPersonaSignals(personas);
  const kinds = new Set();
  const intentCounts = new Map();

  signals.forEach((signal) => {
    (signal.openTripMapKinds || []).forEach((kind) => kinds.add(kind));
    if (signal.osmIntent) intentCounts.set(signal.osmIntent, (intentCounts.get(signal.osmIntent) || 0) + 1);
  });

  const osmIntent = [...intentCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "traveler";

  return {
    personas: signals.map((signal) => signal.persona),
    labels: signals.map((signal) => signal.label),
    summary: getPersonaSummary(personas),
    openTripMapKinds: [...kinds].join(","),
    osmIntent,
    keywords: [...new Set(signals.flatMap((signal) => signal.keywords || []))],
  };
}

export function rankItemsByPersonas(items = [], personasOrSignals = []) {
  const signals = personasOrSignals[0]?.keywords ? personasOrSignals : getPersonaSignals(personasOrSignals);
  if (!signals.length) return [...items];

  return items
    .map((item) => {
      const personaMeta = getPersonaRelevance(item, signals);
      return { ...item, __personaScore: personaMeta.score, __personaMatches: personaMeta.matches };
    })
    .sort((a, b) => {
      if ((b.__personaScore || 0) !== (a.__personaScore || 0)) {
        return (b.__personaScore || 0) - (a.__personaScore || 0);
      }
      return Number(b.rating || 0) - Number(a.rating || 0);
    });
}

export function getPersonaRelevance(item = {}, activePersonaSignals = []) {
  const text = [
    item.name,
    item.title,
    item.artist,
    item.category,
    item.genre,
    item.tour,
    item.neighborhood,
    item.subtitle,
    item.distance,
    item.description,
    item.reason,
    item.source,
    item.venue,
    item.city,
  ].filter(Boolean).join(" ").toLowerCase();

  const matches = [];
  let score = 0;

  activePersonaSignals.forEach((signal) => {
    const hits = (signal.keywords || []).filter((keyword) => text.includes(keyword));
    if (!hits.length) return;
    matches.push(signal.label);
    score += 10 + Math.min(hits.length, 4) * 3;
  });

  if (Number(item.rating) >= 4.8) score += 2;
  if (String(item.source || "").startsWith("OpenStreetMap") || item.source === "OpenTripMap") score += 1;

  return { score, matches };
}
