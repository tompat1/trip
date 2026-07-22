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

  const draft = {
    standfirst: [name, area ? `in ${area}` : "", category ? `works as a ${category.toLowerCase()} stop` : ""].filter(Boolean).join(" "),
    whyStop: buildWhyStop(name, category, area, angle, routeContext),
    atmosphere: buildAtmosphere(category, media),
    essentialExperience: buildEssentialExperience(name, category),
    dontMiss: buildDontMiss(category),
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

function buildWhyStop(name, category, area, angle, routeContext) {
  const base = categoryTextIncludes(category, ["coffee", "cafe", "roaster"])
    ? `${name} is a focused coffee stop${area ? ` around ${area}` : ""}.`
    : categoryTextIncludes(category, ["museum", "gallery", "archaeolog", "historic", "sight"])
      ? `${name} gives the route a cultural anchor${area ? ` around ${area}` : ""}.`
      : categoryTextIncludes(category, ["beach", "harbor", "water"])
        ? `${name} works as a slower coastal pause${area ? ` around ${area}` : ""}.`
        : `${name} is a practical nearby stop${area ? ` around ${area}` : ""}.`;
  return [base, angle, routeContext.previousStop ? `It can sit after ${routeContext.previousStop}.` : ""].filter(Boolean).join(" ");
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
  if (travellerProfile.focus === "coffee" && categoryTextIncludes(category, ["coffee", "cafe", "roaster"])) return "Good fit for the current coffee focus.";
  if (travellerProfile.focus === "shopper" && categoryTextIncludes(category, ["shop", "market", "bakery"])) return "Good fit for the current shopper focus.";
  if (travellerProfile.focus === "arty" && categoryTextIncludes(category, ["museum", "gallery", "archaeolog", "art"])) return "Good fit for the current arty focus.";
  if (travellerProfile.focus === "beachy" && categoryTextIncludes(category, ["beach", "harbor", "water"])) return "Good fit for the current beachy focus.";
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
