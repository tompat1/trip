export function createVerifiedFactBundle(place = {}, context = {}) {
  const retrievedAt = new Date().toISOString();
  const identity = place.identity || {};
  const sourceIds = [
    identity.id ? `place:${identity.id}` : "",
    identity.osmType && identity.osmId ? `osm:${identity.osmType}:${identity.osmId}` : "",
    identity.wikidataId ? `wikidata:${identity.wikidataId}` : "",
  ].filter(Boolean);

  return [
    createFact("name", identity.canonicalName || place.canonicalName || place.title, "Place identity", "identity", retrievedAt, 0.92, false, sourceIds),
    createFact("category", place.category || place.tag, "Place category", "osm", retrievedAt, 0.78, false, sourceIds),
    createFact("area", place.area || identity.municipality || context.locality, "Location context", "osm", retrievedAt, 0.78, false, sourceIds),
    createFact("coordinates", Array.isArray(place.coordinates) ? place.coordinates : null, "Map coordinates", "osm", retrievedAt, 0.86, false, sourceIds),
    createFact("rating", place.rating, place.source || "Seed data", "business", retrievedAt, 0.48, true, sourceIds),
    createFact("website", place.website || identity.officialWebsite, "Official website", "official", retrievedAt, 0.8, true, sourceIds),
    createFact("openingHours", place.openingHours, "OpenStreetMap", "osm", retrievedAt, 0.56, true, sourceIds),
  ].filter((fact) => fact && fact.value !== undefined && fact.value !== null && fact.value !== "");
}

const DESTINATION_EDITORIALS = {
  paris: {
    standfirst: "Paris is the capital and cultural heart of France, situated along the Seine River in Île-de-France. Famed for its revolutionary heritage, Haussmannian boulevards, and artistic legacy, Paris has been a preeminent global center for art, fashion, gastronomy, and philosophy since the 17th century.",
    whyStop: "Home to iconic landmarks such as the Eiffel Tower, Notre-Dame Cathedral, the Louvre Museum, and Sainte-Chapelle, Paris seamlessly combines monumental architecture with vibrant neighborhood culture — from the cobbled alleyways of Montmartre to the historic cafes of Saint-Germain-des-Prés.",
    atmosphere: "An elegant, highly walkable metropolis defined by riverbank bouquinistes, historic bistro terraces, world-class art collections, and timeless architectural vistas.",
    essentialExperience: [
      "Walk the historic Île de la Cité & Sainte-Chapelle",
      "Explore Saint-Germain-des-Prés specialty cafes & galleries",
      "Visit the Louvre Museum and Jardin des Tuileries",
      "Sunset stroll along the Seine River & Pont Neuf"
    ],
    dontMiss: [
      "Stained glass of Sainte-Chapelle",
      "Impressionist collection at Musée d'Orsay",
      "Specialty coffee in Marais",
      "Evening natural wine in the 11th arr."
    ]
  },
  france: {
    standfirst: "France is a European nation renowned for its diverse landscapes spanning Atlantic coasts, Alpine peaks, and Mediterranean harbors, alongside an unmatched legacy in art, philosophy, wine, and culinary craft.",
    whyStop: "From the capital city of Paris to the vineyards of Bordeaux and the French Riviera, France offers a timeless mosaic of historic cathedrals, royal châteaux, and regional gastronomy.",
    atmosphere: "Refined, culturally rich, and steeped in centuries of heritage, gastronomy, and varied natural landscapes."
  },
  crete: {
    standfirst: "Crete is the largest of the Greek islands, cradled between the Aegean and Libyan Seas. Famed as the cradle of Minoan civilization — Europe's earliest recorded high culture — Crete offers a dramatic synthesis of Bronze Age palaces, Venetian harbors, and mountain gorges.",
    whyStop: "From the ancient Palace of Knossos to the pastel-hued Venetian harbor of Chania and the dramatic Samaria Gorge, Crete merges millennia of history with Aegean coastal beauty and renowned island gastronomy.",
    atmosphere: "Sun-drenched Mediterranean warmth, coastal sea breezes, dramatic mountain ridges, and authentic Cretan hospitality.",
    essentialExperience: [
      "Explore the Minoan Palace of Knossos",
      "Wander Chania's 14th-century Venetian harbor & old town",
      "Hike Samaria Gorge or relax at Balos Lagoon",
      "Savor authentic Cretan olive oil, wild herbs, and seafood"
    ],
    dontMiss: [
      "Minoan frescoes at Heraklion Archaeological Museum",
      "Venetian Lighthouse of Chania",
      "Pink sand beaches of Elafonisi"
    ]
  },
  greece: {
    standfirst: "Greece is a historic Mediterranean nation located at the crossroads of Europe, Asia, and Africa, celebrated as the cradle of Western civilization, democracy, philosophy, and the Olympic Games.",
    whyStop: "Featuring ancient classical monuments, whitewashed island villages, and azure Aegean waters, Greece offers an unforgettable journey through millennia of history and vibrant island culture.",
    atmosphere: "Aegean marine light, ancient marble heritage, vibrant harbor tavernas, and Mediterranean warmth."
  }
};

export function composeEditorialProfile(place = {}, options = {}) {
  const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
  const media = options.media || {};
  const travellerProfile = options.travellerProfile || {};
  const routeContext = options.routeContext || {};
  const category = getFactValue(facts, "category") || place.category || place.tag || "place";
  const area = getFactValue(facts, "area") || place.area || "";
  const name = getFactValue(facts, "name") || place.title || "This stop";
  const routeRole = inferRouteRole(category, travellerProfile);
  const sourceIds = [...new Set(facts.flatMap((fact) => fact.sourceIds || [fact.id]).filter(Boolean))];
  const angle = getTravellerAngle(category, travellerProfile);

  const nameLower = String(name || "").toLowerCase();
  const isCityCategory = categoryTextIncludes(category, ["city", "destination", "region", "capital", "country", "island"]);
  const matchedDestKey = Object.keys(DESTINATION_EDITORIALS).find((key) => nameLower.includes(key));
  const destEntry = matchedDestKey ? DESTINATION_EDITORIALS[matchedDestKey] : null;

  let standfirst = "";
  let whyStop = "";
  let atmosphere = "";
  let essentialExperience = null;
  let dontMiss = null;

  if (destEntry) {
    standfirst = destEntry.standfirst;
    whyStop = destEntry.whyStop;
    atmosphere = destEntry.atmosphere;
    if (destEntry.essentialExperience) essentialExperience = destEntry.essentialExperience;
    if (destEntry.dontMiss) dontMiss = destEntry.dontMiss;
  } else if (isCityCategory) {
    standfirst = buildCityStandfirst(name, area);
    whyStop = buildCityWhyStop(name, category, area);
    atmosphere = buildCityAtmosphere(name);
  } else {
    standfirst = buildStandardStandfirst(name, area, category);
    whyStop = buildWhyStop(name, category, area, angle, routeContext);
    atmosphere = buildAtmosphere(category, media);
  }

  const draft = {
    standfirst,
    whyStop,
    atmosphere,
    essentialExperience: essentialExperience || buildEssentialExperience(name, category),
    dontMiss: dontMiss || buildDontMiss(category),
    hiddenDetails: buildHiddenDetails(place, facts),
    idealFor: buildIdealFor(category, travellerProfile),
    skipIf: buildSkipIf(category),
    suggestedDurationMinutes: inferDurationMinutes(category),
    bestArrivalWindow: inferBestArrivalWindow(category),
    routeRole,
    parkingSummary: "",
    accessibilitySummary: "",
    coffeeSummary: categoryTextIncludes(category, ["coffee", "cafe", "roaster"]) ? `${name} belongs in the coffee shortlist.` : "",
    foodSummary: categoryTextIncludes(category, ["restaurant", "food", "bakery"]) ? `${name} is useful as a food stop.` : "",
    nextBestStop: routeContext.nextStop || "",
    localTip: buildLocalTip(category, routeContext),
    practicalWarnings: buildPracticalWarnings(facts),
    sourceIds,
    generatedAt: new Date().toISOString(),
    editorialVersion: "deterministic-v1",
    confidence: calculateEditorialConfidence(facts, media),
  };

  return validateEditorialProfile(draft, facts).correctedDraft;
}

export function validateEditorialProfile(draft = {}, facts = []) {
  const supportedNames = new Set(facts.map((fact) => String(fact.value || "").toLowerCase()).filter(Boolean));
  const unsupportedClaims = [];
  const correctedDraft = {
    standfirst: draft.standfirst || "",
    whyStop: draft.whyStop || "",
    atmosphere: draft.atmosphere || "",
    essentialExperience: Array.isArray(draft.essentialExperience) ? draft.essentialExperience.slice(0, 4) : [],
    dontMiss: Array.isArray(draft.dontMiss) ? draft.dontMiss.slice(0, 4) : [],
    hiddenDetails: Array.isArray(draft.hiddenDetails) ? draft.hiddenDetails.slice(0, 3) : [],
    idealFor: Array.isArray(draft.idealFor) ? draft.idealFor.slice(0, 4) : [],
    skipIf: Array.isArray(draft.skipIf) ? draft.skipIf.slice(0, 3) : [],
    suggestedDurationMinutes: Number(draft.suggestedDurationMinutes) || 45,
    bestArrivalWindow: draft.bestArrivalWindow || "",
    routeRole: draft.routeRole || "quick-stop",
    parkingSummary: supportedFactExists(facts, "parking") ? draft.parkingSummary || "" : "",
    accessibilitySummary: supportedFactExists(facts, "accessibility") ? draft.accessibilitySummary || "" : "",
    coffeeSummary: draft.coffeeSummary || "",
    foodSummary: draft.foodSummary || "",
    nextBestStop: draft.nextBestStop || "",
    localTip: draft.localTip || "",
    practicalWarnings: Array.isArray(draft.practicalWarnings) ? draft.practicalWarnings : [],
    sourceIds: Array.isArray(draft.sourceIds) ? draft.sourceIds : [],
    generatedAt: draft.generatedAt || new Date().toISOString(),
    editorialVersion: draft.editorialVersion || "deterministic-v1",
    confidence: Math.max(0, Math.min(1, Number(draft.confidence) || 0.5)),
  };

  if (!supportedNames.size) unsupportedClaims.push("No verified facts available beyond local UI context.");

  return {
    correctedDraft,
    unsupportedClaims,
    sourceIdsUsed: correctedDraft.sourceIds,
    confidence: correctedDraft.confidence,
  };
}

export function createPlaceProfileEnvelope(place = {}, options = {}) {
  const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
  const editorial = composeEditorialProfile(place, { ...options, facts });
  const media = options.media || { hero: undefined, gallery: [], roles: {} };
  return {
    place: place.identity || place,
    facts,
    editorial,
    media,
    attributions: options.attributions || media.attributions || [],
    generatedAt: new Date().toISOString(),
    refreshAfter: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    reviewed: false,
  };
}

function createFact(key, value, sourceName, sourceType, retrievedAt, confidence, volatile, sourceIds = []) {
  if (value === undefined || value === null || value === "") return null;
  return {
    id: `${key}-${hashValue(JSON.stringify(value))}`,
    key,
    value,
    sourceUrl: "",
    sourceName,
    sourceType,
    retrievedAt,
    confidence,
    volatile,
    sourceIds,
  };
}

function buildStandardStandfirst(name, area, category) {
  const cat = String(category || "spot").toLowerCase();
  if (cat.includes("coffee") || cat.includes("cafe")) {
    return `${name}${area ? ` in ${area}` : ""} is a highlighted specialty coffee destination.`;
  }
  if (cat.includes("museum") || cat.includes("gallery") || cat.includes("historic")) {
    return `${name}${area ? ` in ${area}` : ""} serves as a key cultural anchor for your journey.`;
  }
  if (cat.includes("restaurant") || cat.includes("food") || cat.includes("bakery")) {
    return `${name}${area ? ` in ${area}` : ""} is a curated local food stop.`;
  }
  return `${name}${area ? ` in ${area}` : ""} is a curated stop for your travel itinerary.`;
}

function buildCityStandfirst(name, area) {
  const cleanName = String(name || "").replace(/,\s*.*$/, "").trim();
  const country = String(name || "").includes(",") ? name.split(",").slice(1).join(",").trim() : area;
  if (country && country.toLowerCase() !== cleanName.toLowerCase()) {
    return `${cleanName} is a major cultural and historic destination in ${country}, celebrated for its distinct architectural heritage, vibrant neighborhoods, and rich local life.`;
  }
  return `${cleanName} is your primary travel anchor for this journey, offering a compelling blend of historic landmarks, cultural attractions, and local neighborhood discovery.`;
}

function buildCityWhyStop(name, category, area) {
  const cleanName = String(name || "").replace(/,\s*.*$/, "").trim();
  return `${cleanName} serves as your primary destination hub, connecting key sightseeing highlights, historic quarters, and curated local spots.`;
}

function buildCityAtmosphere(name) {
  return "Dynamic urban rhythm balanced with historic quarters, active cafe culture, and walkable avenues.";
}

function buildWhyStop(name, category, area, angle, routeContext) {
  const base = categoryTextIncludes(category, ["coffee", "cafe", "roaster"])
    ? `${name} is a focused coffee stop${area ? ` around ${area}` : ""}.`
    : categoryTextIncludes(category, ["museum", "gallery", "archaeolog", "historic", "sight"])
      ? `${name} gives the route a cultural anchor${area ? ` around ${area}` : ""}.`
    : categoryTextIncludes(category, ["beach", "harbor", "water"])
        ? `${name} works as a slower coastal pause${area ? ` around ${area}` : ""}.`
        : `${name} is useful if it keeps the next move simple${area ? ` around ${area}` : ""}.`;
  return [base, angle, buildRouteNudge(routeContext)].filter(Boolean).join(" ");
}

function buildRouteNudge(routeContext = {}) {
  if (!routeContext.previousStop) return "";
  const stop = formatRouteStopLabel(routeContext.previousStop);
  if (!stop) return "";
  return `Use it as a short detour after ${stop}.`;
}

function formatRouteStopLabel(value = "") {
  const label = String(value || "").trim().toLowerCase();
  if (!label) return "";
  if (["confirmed visit", "confirmed stop", "last confirmed stop"].includes(label)) return "your last confirmed stop";
  return String(value).trim();
}

function buildAtmosphere(category, media) {
  if (media?.hero?.illustrativeOnly) return "Use the map and notes first; available imagery is only regional or illustrative.";
  if (categoryTextIncludes(category, ["coffee", "cafe"])) return "Small-scale, useful for a reset and a closer look at the neighbourhood.";
  if (categoryTextIncludes(category, ["museum", "gallery", "archaeolog"])) return "Quiet, context-rich, and best when you want the place to explain itself.";
  if (categoryTextIncludes(category, ["beach", "harbor"])) return "Open-air, slower, and shaped by light, wind, and the waterline.";
  return "A nearby waypoint with enough context to decide quickly.";
}

function buildEssentialExperience(name, category) {
  if (categoryTextIncludes(category, ["coffee", "cafe", "roaster"])) return ["Order coffee", "Check beans or brew style", "Save notes if it fits your taste"];
  if (categoryTextIncludes(category, ["restaurant", "food", "bakery"])) return ["Check the menu", "Mark it for lunch or dinner", "Save one food note"];
  if (categoryTextIncludes(category, ["museum", "gallery", "archaeolog"])) return ["Start with the main collection", "Save one detail for the story", "Pair it with a calmer nearby stop"];
  if (categoryTextIncludes(category, ["beach", "harbor"])) return ["Check wind and shade", "Walk the edge", "Use it as a slower route break"];
  return [`Visit ${name}`, "Check the map context", "Decide whether to save it"];
}

function buildDontMiss(category) {
  if (categoryTextIncludes(category, ["coffee", "cafe", "roaster"])) return ["Coffee quality", "Beans", "Neighbourhood feel"];
  if (categoryTextIncludes(category, ["museum", "gallery", "archaeolog"])) return ["Core exhibits", "Architecture", "Context before the next stop"];
  if (categoryTextIncludes(category, ["beach", "harbor"])) return ["Light", "Waterfront walk", "Shade"];
  return ["Map position", "Nearby context"];
}

function buildHiddenDetails(place, facts) {
  return [
    place.localName ? `Local name: ${place.localName}` : "",
    place.identity?.wikidataId ? `Linked identity: ${place.identity.wikidataId}` : "",
    supportedFactExists(facts, "openingHours") ? "Opening hours are volatile; refresh before relying on them." : "",
  ].filter(Boolean);
}

function buildIdealFor(category, travellerProfile) {
  const focus = travellerProfile.focus || "nearby";
  if (categoryTextIncludes(category, ["coffee", "cafe", "roaster"])) return ["coffee reset", "short detour", focus];
  if (categoryTextIncludes(category, ["museum", "gallery", "archaeolog"])) return ["culture", "rain-safe planning", focus];
  if (categoryTextIncludes(category, ["beach", "harbor"])) return ["slow break", "photos", focus];
  return ["nearby discovery", "quick decision", focus];
}

function buildSkipIf(category) {
  if (categoryTextIncludes(category, ["beach", "harbor"])) return ["weather is rough", "you need an indoor stop"];
  if (categoryTextIncludes(category, ["museum", "gallery"])) return ["you only want outdoor time"];
  return ["it pulls you too far off route"];
}

function buildLocalTip(category, routeContext) {
  if (routeContext.availableHours && routeContext.availableHours < 2) return "Keep this as a short stop unless it is already on your route.";
  if (categoryTextIncludes(category, ["coffee", "cafe"])) return "Save it if the coffee matches your taste; that signal should influence the next scan.";
  if (categoryTextIncludes(category, ["beach", "harbor"])) return "Check wind and sun before committing time.";
  return "Open the map first and decide from distance, category, and route fit.";
}

function buildPracticalWarnings(facts) {
  return facts.filter((fact) => fact.volatile).map((fact) => `${labelFromKey(fact.key)} can change; refresh before relying on it.`);
}

function getTravellerAngle(category, travellerProfile) {
  if (travellerProfile.focus === "coffee" && categoryTextIncludes(category, ["coffee", "cafe", "roaster"])) return "Keep it on the coffee shortlist.";
  if (travellerProfile.focus === "shopper" && categoryTextIncludes(category, ["shop", "market", "bakery"])) return "Worth a look while you are browsing nearby streets.";
  if (travellerProfile.focus === "arty" && categoryTextIncludes(category, ["museum", "gallery", "archaeolog", "art"])) return "Good fit for a culture-led day.";
  if (travellerProfile.focus === "beachy" && categoryTextIncludes(category, ["beach", "harbor", "water"])) return "Save it for a slower light-and-water break.";
  return "";
}

function inferRouteRole(category, travellerProfile) {
  if (categoryTextIncludes(category, ["coffee", "cafe", "roaster"])) return "coffee-stop";
  if (categoryTextIncludes(category, ["restaurant", "food", "bakery"])) return "lunch-stop";
  if (categoryTextIncludes(category, ["beach"])) return "swim-stop";
  if (categoryTextIncludes(category, ["museum", "archaeolog", "historic"])) return "major-destination";
  if (travellerProfile.focus === "beachy") return "sunset-stop";
  return "quick-stop";
}

function inferDurationMinutes(category) {
  if (categoryTextIncludes(category, ["coffee", "cafe", "bakery"])) return 35;
  if (categoryTextIncludes(category, ["restaurant", "food"])) return 75;
  if (categoryTextIncludes(category, ["museum", "archaeolog"])) return 120;
  if (categoryTextIncludes(category, ["beach"])) return 150;
  return 45;
}

function inferBestArrivalWindow(category) {
  if (categoryTextIncludes(category, ["beach", "harbor"])) return "morning or late afternoon";
  if (categoryTextIncludes(category, ["coffee", "cafe"])) return "morning or mid-afternoon";
  if (categoryTextIncludes(category, ["restaurant", "food"])) return "lunch or dinner";
  return "";
}

function calculateEditorialConfidence(facts, media) {
  const factConfidence = facts.length ? facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length : 0.35;
  const mediaBoost = media?.hero && !media.hero.illustrativeOnly ? 0.08 : 0;
  return Math.max(0.2, Math.min(0.96, Number((factConfidence + mediaBoost).toFixed(2))));
}

function getFactValue(facts, key) {
  return facts.find((fact) => fact.key === key)?.value;
}

function supportedFactExists(facts, key) {
  return facts.some((fact) => fact.key === key && fact.value);
}

function categoryTextIncludes(category = "", terms = []) {
  const value = String(category).toLowerCase();
  return terms.some((term) => value.includes(term));
}

function labelFromKey(key = "") {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function hashValue(value = "") {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
