/**
 * Pure helper functions shared across state slices.
 * No AppState imports — these are stateless utilities.
 */
import { tripsData } from "../data/tripsData.js";
import { findPrimaryAirportForDestination, formatAirportLabel, getAirportByIata } from "../services/airportService.js";
import { normalizeFlightType } from "../services/flightService.js";
import {
  CALENDAR_EVENTS_STORAGE_PREFIX,
  DEFAULT_TRAVELER_PERSONAS,
  DEFAULT_USER_PROFILE,
  LEGACY_PERSONA_ALIASES,
  LEGACY_USER_AVATAR_STORAGE_KEY,
  LEGACY_USER_PREFERENCES_STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
  THEME_STORAGE_KEY,
  TOURISM_DISCOVERY_STORAGE_PREFIX,
  TOURISM_IMAGE_BY_CATEGORY,
  TRIP_COMPANIONS_STORAGE_PREFIX,
  USER_PROFILE_STORAGE_KEY,
} from "./constants.js";

// ─── UI helpers ───────────────────────────────────────────────────────────────

export function getDefaultPlanViewMode() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "week";
  }
  return window.matchMedia("(pointer: coarse), (max-width: 540px)").matches ? "day" : "week";
}

export function getLocalDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Trip helpers ─────────────────────────────────────────────────────────────

export function isFutureTrip(trip = {}, todayStamp = getLocalDateStamp()) {
  const startDate = String(trip.startDate || trip.start_date || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate >= todayStamp;
}

export function resolveFutureTripId(preferredTripId = "", fallbackTripId = "") {
  if (isFutureTrip(tripsData[preferredTripId])) return preferredTripId;
  if (isFutureTrip(tripsData[fallbackTripId])) return fallbackTripId;
  return Object.values(tripsData).find((trip) => isFutureTrip(trip))?.id || "";
}

export function buildTripFlightRoute(row = {}, existingTrip = {}) {
  const destinationAirport =
    getAirportByIata(row.destination_iata || row.destinationIata) ||
    getAirportByIata(existingTrip.flightRoute?.destinationIata) ||
    findPrimaryAirportForDestination(row.destination || existingTrip.destination);
  const originAirport =
    getAirportByIata(row.origin_iata || row.originIata) ||
    getAirportByIata(existingTrip.flightRoute?.originIata);
  const flightType = normalizeFlightType(
    row.flight_type || existingTrip.flightRoute?.flightType || existingTrip.flightPreference || "regular"
  );

  return {
    originIata: originAirport?.iata || row.origin_iata || row.originIata || existingTrip.flightRoute?.originIata || "",
    destinationIata: destinationAirport?.iata || row.destination_iata || row.destinationIata || existingTrip.flightRoute?.destinationIata || "",
    originLabel: row.origin_label || existingTrip.flightRoute?.originLabel || formatAirportLabel(originAirport),
    destinationLabel: row.destination_label || existingTrip.flightRoute?.destinationLabel || formatAirportLabel(destinationAirport),
    flightType,
    departureDate: row.start_date || row.startDate || existingTrip.startDate || "",
  };
}

// ─── Invite helpers ───────────────────────────────────────────────────────────

export function getTripInviteTitle(trip = {}) {
  return trip.title || trip.name || (trip.destination ? `Roadtrip ${trip.destination}` : "Your trip");
}

export function getTripInviteCoverImage(trip = {}) {
  return trip.coverImage || trip.image || trip.upcomingActivity?.image || "";
}

export function buildTripInviteText({ inviterName, tripTitle, destination, dates, travelersCount, personalMessage, inviteUrl }) {
  return [
    `${inviterName || "Thomas"} invited you to join ${tripTitle || "this trip"}.`,
    destination || dates ? `${destination || "Destination"} · ${dates || "Dates TBD"}` : "",
    travelersCount ? `${travelersCount} travelers` : "",
    "",
    personalMessage || "Plan it. Live it. Remember it.",
    inviteUrl ? `Open invite: ${inviteUrl}` : "",
  ]
    .filter((line, index, lines) => line || (lines[index - 1] && lines[index + 1]))
    .join("\n");
}

export function createTripInviteUrl(tripId = "") {
  if (typeof window === "undefined") return `?trip=${encodeURIComponent(tripId)}`;
  const url = new URL(window.location.origin);
  url.searchParams.set("trip", tripId);
  url.searchParams.set("invite", "1");
  return url.href;
}

export function getInviteFromLocation() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search || "");
  if (!params.has("invite")) return null;
  const tripId = params.get("trip") || "";
  if (!tripId) return null;
  return { tripId, status: "preview", mode: "preview", acceptedAt: "" };
}

// ─── Onboarding helpers ───────────────────────────────────────────────────────

export function hasSeenOnboarding() {
  if (typeof localStorage === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingSeen() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch {}
}

// ─── Theme helpers ────────────────────────────────────────────────────────────

export function readStoredTheme() {
  if (typeof localStorage === "undefined") return "system";
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY) || "system";
    return ["system", "light", "dark"].includes(theme) ? theme : "system";
  } catch {
    return "system";
  }
}

export function writeStoredTheme(theme = "system") {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

// ─── User profile storage ─────────────────────────────────────────────────────

export function normalizePersonaLabels(personas = []) {
  if (!Array.isArray(personas)) return [];
  return [...new Set(
    personas
      .map((persona) => LEGACY_PERSONA_ALIASES.get(persona) || persona)
      .filter(Boolean)
  )];
}

export function readStoredUserProfile() {
  const profile = { ...DEFAULT_USER_PROFILE };
  if (typeof localStorage === "undefined") return profile;

  try {
    const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.assign(profile, parsed);
      profile.notifications = { ...DEFAULT_USER_PROFILE.notifications, ...(parsed.notifications || {}) };
      profile.privacy = { ...DEFAULT_USER_PROFILE.privacy, ...(parsed.privacy || {}) };
      profile.personas = Array.isArray(parsed.personas) ? parsed.personas : DEFAULT_USER_PROFILE.personas;
      profile.customPersonas = Array.isArray(parsed.customPersonas) ? parsed.customPersonas : [];
    }

    const legacyAvatar = localStorage.getItem(LEGACY_USER_AVATAR_STORAGE_KEY);
    if (legacyAvatar && !localStorage.getItem(USER_PROFILE_STORAGE_KEY)) profile.avatarUrl = legacyAvatar;

    const legacyPrefs = localStorage.getItem(LEGACY_USER_PREFERENCES_STORAGE_KEY);
    if (legacyPrefs && !localStorage.getItem(USER_PROFILE_STORAGE_KEY)) {
      const parsedPrefs = JSON.parse(legacyPrefs);
      if (Array.isArray(parsedPrefs)) profile.personas = parsedPrefs;
    }
  } catch {}

  profile.personas = normalizePersonaLabels(profile.personas);
  profile.customPersonas = normalizePersonaLabels(profile.customPersonas).filter(
    (persona) => !DEFAULT_TRAVELER_PERSONAS.includes(persona)
  );

  return profile;
}

export function writeStoredUserProfile(profile) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(LEGACY_USER_AVATAR_STORAGE_KEY, profile.avatarUrl || "");
    localStorage.setItem(LEGACY_USER_PREFERENCES_STORAGE_KEY, JSON.stringify(profile.personas || []));
  } catch {}
}

// ─── Calendar events storage ──────────────────────────────────────────────────

export function readStoredCalendarEvents(tripId) {
  if (typeof localStorage === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${CALENDAR_EVENTS_STORAGE_PREFIX}${tripId}`);
    if (!stored) return null;
    const events = JSON.parse(stored);
    return Array.isArray(events) ? events : null;
  } catch {
    return null;
  }
}

export function writeStoredCalendarEvents(tripId, events) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${CALENDAR_EVENTS_STORAGE_PREFIX}${tripId}`, JSON.stringify(events || []));
  } catch {}
}

// ─── Tourism discovery storage ────────────────────────────────────────────────

export function readStoredTourismDiscovery(tripId) {
  if (typeof localStorage === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${TOURISM_DISCOVERY_STORAGE_PREFIX}${tripId}`);
    if (!stored) return null;
    const discovery = JSON.parse(stored);
    if (!discovery || typeof discovery !== "object") return null;
    return {
      tourismPois: Array.isArray(discovery.tourismPois) ? discovery.tourismPois : [],
      hiddenGems: Array.isArray(discovery.hiddenGems) ? discovery.hiddenGems : [],
      osmPlaces: Array.isArray(discovery.osmPlaces) ? discovery.osmPlaces : [],
      updatedAt: discovery.updatedAt || "",
      personaKey: discovery.personaKey || "",
    };
  } catch {
    return null;
  }
}

export function writeStoredTourismDiscovery(tripId, discovery) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${TOURISM_DISCOVERY_STORAGE_PREFIX}${tripId}`, JSON.stringify(discovery || {}));
  } catch {}
}

// ─── Companions storage ───────────────────────────────────────────────────────

export function readStoredTripCompanions(tripId) {
  if (typeof localStorage === "undefined") return [];
  try {
    const stored = localStorage.getItem(`${TRIP_COMPANIONS_STORAGE_PREFIX}${tripId}`);
    if (!stored) return [];
    const companions = JSON.parse(stored);
    return Array.isArray(companions) ? companions : [];
  } catch {
    return [];
  }
}

export function writeStoredTripCompanions(tripId, companions = []) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${TRIP_COMPANIONS_STORAGE_PREFIX}${tripId}`, JSON.stringify(companions || []));
  } catch {}
}

// ─── Data normalizers ─────────────────────────────────────────────────────────

export function mergeCalendarEvents(baseEvents = [], savedEvents = []) {
  const merged = [...baseEvents];
  savedEvents.forEach((savedEvent) => {
    const index = merged.findIndex((event) => event.id === savedEvent.id);
    if (index >= 0) {
      merged[index] = { ...merged[index], ...savedEvent };
    } else {
      merged.push(savedEvent);
    }
  });
  return merged;
}

export function normalizeTourismIdea(place = {}, kind = "poi") {
  const title = place.title || place.canonicalName || place.name || "Interesting place";
  const category = place.category || (kind === "hidden" ? "Hidden gem" : "Place");
  const subtitle = place.distance
    ? `${place.distance} from trip center`
    : place.neighborhood || category;

  return {
    id: place.id || (place.xid ? `otm-${place.xid}` : `otm-${Date.now()}`),
    xid: place.xid || "",
    title,
    name: title,
    category,
    subtitle,
    neighborhood: subtitle,
    description: place.description || place.reason || `${category} from OpenTripMap.`,
    rating: place.rating || "",
    reviewsCount: "OpenTripMap",
    duration: category === "Museum" ? "1-2 hours" : "45-90 min",
    image: place.imageUrl || TOURISM_IMAGE_BY_CATEGORY[category] || TOURISM_IMAGE_BY_CATEGORY.Place,
    source: place.source || (kind === "osm" ? "OpenStreetMap" : "OpenTripMap"),
    sourceRole: place.sourceRole || (kind === "osm" ? "osm" : "opentripmap"),
    sourceUrl: place.sourceUrl || place.officialWebsite || "",
    coordinates: place.coordinates || null,
    distance: place.distance || "",
    distanceMeters: place.distanceMeters,
    openingHours: place.openingHours || "",
    categories: place.categories || [category],
    kind,
  };
}

export function normalizeMomentRecord(moment = {}) {
  const mediaUrl = moment.media_url || moment.mediaUrl || "";
  let tags = moment.tags || [];
  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = tags ? [tags] : [];
    }
  }

  return {
    ...moment,
    tripId: moment.tripId || moment.trip_id || "paris",
    media_url: mediaUrl,
    mediaUrl,
    date: moment.date || String(moment.created_at || moment.createdAt || new Date().toISOString()).slice(0, 10),
    createdAt: moment.createdAt || moment.created_at || "",
    updatedAt: moment.updatedAt || moment.updated_at || "",
    tags: Array.isArray(tags) ? tags : [],
    placeTitle: moment.placeTitle || moment.place_title || "",
    placeCategory: moment.placeCategory || moment.place_category || "",
    geoLabel: moment.geoLabel || moment.geo_label || "",
  };
}

// ─── Input normalizers ────────────────────────────────────────────────────────

export function normalizeEmailInput(value = "") {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.length > 180) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function normalizeCompanionRoleInput(value = "") {
  const role = String(value || "").trim().toLowerCase();
  return ["viewer", "planner", "co-owner"].includes(role) ? role : "viewer";
}

export function normalizeInviteMethodInput(value = "") {
  const method = String(value || "").trim().toLowerCase();
  return ["email", "sms", "whatsapp", "qr", "link"].includes(method) ? method : "email";
}

// ─── Discovery helpers ────────────────────────────────────────────────────────

export function getOpenTripMapStatus(results = []) {
  const statuses = results
    .flatMap((result) => result?.providerStatus || [])
    .filter((status) => status.provider === "opentripmap" || !status.provider);
  const missingKey = statuses.some(
    (status) =>
      status.status === "not-configured" ||
      status.error === "missing-opentripmap-api-key" ||
      status.error === "missing-opentripmap-key"
  );
  if (missingKey) return "not-configured";
  if (statuses.some((status) => status.status === "error")) return "error";
  return "ready";
}
