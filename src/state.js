import { tripsData } from "./data/tripsData.js";
import { enrichmentService } from "./enrichment/enrichmentService.js";
import { getCountryFlagEmoji } from "./utils/countryEmoji.js";
import { fetchOpenMeteoWeather } from "./services/weatherService.js";
import { fetchConcertsForTrip } from "./services/concertService.js";
import { findPrimaryAirportForDestination, formatAirportLabel, getAirportByIata } from "./services/airportService.js";
import { normalizeFlightType, searchFlightsForTrip } from "./services/flightService.js";
import { fetchTripIntelligence } from "./services/tripDataGateway.js";
import { readStoredMoments, saveStoredMoment, saveStoredMoments } from "./services/momentStore.js";

function getDefaultPlanViewMode() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "week";
  }

  return window.matchMedia("(pointer: coarse), (max-width: 540px)").matches ? "day" : "week";
}

const CALENDAR_EVENTS_STORAGE_PREFIX = "trip_calendar_events_";
const TOURISM_DISCOVERY_STORAGE_PREFIX = "trip_tourism_discovery_";
const TRIP_COMPANIONS_STORAGE_PREFIX = "trip_companions_";
const USER_PROFILE_STORAGE_KEY = "trip_user_profile_v1";
const LEGACY_USER_AVATAR_STORAGE_KEY = "trip_user_avatar";
const LEGACY_USER_PREFERENCES_STORAGE_KEY = "trip_user_preferences";

const DEFAULT_USER_PROFILE = {
  name: "Thomas R.",
  email: "thomas@rynell.org",
  homeAirport: "GDN",
  homeCity: "Gdańsk",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
  membership: "Premium Traveler",
  travelStyle: "balanced",
  budget: "comfort",
  seatPreference: "window",
  pace: "balanced",
  accessibilityNotes: "",
  personas: ["☕ Coffee Lover", "🍕 Foodie", "🎵 Concert Goer", "🎨 Art Enthusiast"],
  customPersonas: [],
  notifications: {
    tripReminders: true,
    flightAlerts: true,
    liveRecommendations: true,
    weeklyDigest: false,
  },
  privacy: {
    cloudSync: true,
    locationInLiveMode: true,
    personalization: true,
    analytics: false,
  },
};

const DEFAULT_TRAVELER_PERSONAS = [
  "☕ Coffee Lover",
  "🍕 Foodie",
  "🎵 Concert Goer",
  "🎨 Art Enthusiast",
  "🏛️ History Buff",
  "🌅 Sunset Chaser",
  "🛍️ Boutique Shopper",
  "🏖️ Beach & Island",
];

function readStoredUserProfile() {
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
    if (legacyAvatar && !stored) profile.avatarUrl = legacyAvatar;

    const legacyPrefs = localStorage.getItem(LEGACY_USER_PREFERENCES_STORAGE_KEY);
    if (legacyPrefs && !stored) {
      const parsedPrefs = JSON.parse(legacyPrefs);
      if (Array.isArray(parsedPrefs)) profile.personas = parsedPrefs;
    }
  } catch {}

  return profile;
}

function writeStoredUserProfile(profile) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(LEGACY_USER_AVATAR_STORAGE_KEY, profile.avatarUrl || "");
    localStorage.setItem(LEGACY_USER_PREFERENCES_STORAGE_KEY, JSON.stringify(profile.personas || []));
  } catch {}
}

const TOURISM_IMAGE_BY_CATEGORY = {
  Food: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=700&q=80",
  Museum: "https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?auto=format&fit=crop&w=700&q=80",
  Sight: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80",
  Nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=700&q=80",
  Shopping: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=700&q=80",
  Place: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=80",
};

function readStoredCalendarEvents(tripId) {
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

function writeStoredCalendarEvents(tripId, events) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${CALENDAR_EVENTS_STORAGE_PREFIX}${tripId}`, JSON.stringify(events || []));
  } catch {}
}

function readStoredTourismDiscovery(tripId) {
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
    };
  } catch {
    return null;
  }
}

function writeStoredTourismDiscovery(tripId, discovery) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${TOURISM_DISCOVERY_STORAGE_PREFIX}${tripId}`, JSON.stringify(discovery || {}));
  } catch {}
}

function readStoredTripCompanions(tripId) {
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

function writeStoredTripCompanions(tripId, companions = []) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${TRIP_COMPANIONS_STORAGE_PREFIX}${tripId}`, JSON.stringify(companions || []));
  } catch {}
}

function mergeCalendarEvents(baseEvents = [], savedEvents = []) {
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

function normalizeTourismIdea(place = {}, kind = "poi") {
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

function normalizeMomentRecord(moment = {}) {
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

function normalizeEmailInput(value = "") {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.length > 180) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeCompanionRoleInput(value = "") {
  const role = String(value || "").trim().toLowerCase();
  return ["viewer", "planner", "co-owner"].includes(role) ? role : "viewer";
}

function normalizeInviteMethodInput(value = "") {
  const method = String(value || "").trim().toLowerCase();
  return ["email", "sms", "whatsapp", "qr", "link"].includes(method) ? method : "email";
}

function createTripInviteUrl(tripId = "") {
  if (typeof window === "undefined") return `?trip=${encodeURIComponent(tripId)}`;
  const url = new URL(window.location.origin);
  url.searchParams.set("trip", tripId);
  url.searchParams.set("invite", "1");
  return url.href;
}

function getInviteFromLocation() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search || "");
  if (!params.has("invite")) return null;
  const tripId = params.get("trip") || "";
  if (!tripId) return null;
  return {
    tripId,
    status: "preview",
    mode: "preview",
    acceptedAt: "",
  };
}

function getTripInviteTitle(trip = {}) {
  return trip.title || trip.name || (trip.destination ? `Roadtrip ${trip.destination}` : "Your trip");
}

function getTripInviteCoverImage(trip = {}) {
  return trip.coverImage || trip.image || trip.upcomingActivity?.image || "";
}

function buildTripInviteText({ inviterName, tripTitle, destination, dates, travelersCount, personalMessage, inviteUrl }) {
  return [
    `${inviterName || "Thomas"} invited you to join ${tripTitle || "this trip"}.`,
    destination || dates ? `${destination || "Destination"} · ${dates || "Dates TBD"}` : "",
    travelersCount ? `${travelersCount} travelers` : "",
    "",
    personalMessage || "Plan it. Live it. Remember it.",
    inviteUrl ? `Open invite: ${inviteUrl}` : "",
  ].filter((line, index, lines) => line || (lines[index - 1] && lines[index + 1])).join("\n");
}

function getOpenTripMapStatus(results = []) {
  const statuses = results
    .flatMap((result) => result?.providerStatus || [])
    .filter((status) => status.provider === "opentripmap" || !status.provider);
  const missingKey = statuses.some((status) => status.status === "not-configured" || status.error === "missing-opentripmap-api-key" || status.error === "missing-opentripmap-key");
  if (missingKey) return "not-configured";
  if (statuses.some((status) => status.status === "error")) return "error";
  return "ready";
}

function buildTripFlightRoute(row = {}, existingTrip = {}) {
  const destinationAirport = getAirportByIata(row.destination_iata || row.destinationIata)
    || getAirportByIata(existingTrip.flightRoute?.destinationIata)
    || findPrimaryAirportForDestination(row.destination || existingTrip.destination);
  const originAirport = getAirportByIata(row.origin_iata || row.originIata)
    || getAirportByIata(existingTrip.flightRoute?.originIata);
  const flightType = normalizeFlightType(row.flight_type || existingTrip.flightRoute?.flightType || existingTrip.flightPreference || "regular");

  return {
    originIata: originAirport?.iata || row.origin_iata || row.originIata || existingTrip.flightRoute?.originIata || "",
    destinationIata: destinationAirport?.iata || row.destination_iata || row.destinationIata || existingTrip.flightRoute?.destinationIata || "",
    originLabel: row.origin_label || existingTrip.flightRoute?.originLabel || formatAirportLabel(originAirport),
    destinationLabel: row.destination_label || existingTrip.flightRoute?.destinationLabel || formatAirportLabel(destinationAirport),
    flightType,
    departureDate: row.start_date || row.startDate || existingTrip.startDate || "",
  };
}

class AppState {
  constructor() {
    this.activeView = "landing"; // Initial entry view: "landing" | "home" | "live" | "plan" | "search" | "profile"
    this.activeTripId = "paris"; // "paris" | "crete"
    this.tripMode = false; // Default: Planning mode ("Before you go" / Just got home from Crete!)
    
    // Plan view settings
    this.planSubTab = "plan"; // "overview" | "plan" | "explore" | "journal" | "story"
    this.planViewMode = getDefaultPlanViewMode(); // "day" | "week" | "timeline" | "map"
    this.activeDayIndex = 0;
    this.mapDayFilter = null;

    // Search view settings
    this.searchQuery = "";
    this.searchCategory = "All";
    this.searchSubFilter = "All";
    
    // Load persisted saved places from localStorage or default set
    let localSaved = [];
    try {
      const stored = localStorage.getItem("trip_saved_places");
      if (stored) localSaved = JSON.parse(stored);
    } catch {}
    this.savedPlaceIds = new Set(localSaved.length ? localSaved : ["i1", "i2", "i3", "i4", "sp1", "sp2"]);

    // User Profile & Preferences
    this.userProfile = readStoredUserProfile();
    this.activeProfileSection = "profile";
    this.userSession = { status: "checking", role: "anonymous", userId: "", authType: "none" };
    this.userAvatar = this.userProfile.avatarUrl;
    this.userPreferences = new Set(this.userProfile.personas || []);

    // Live Geolocation & Worker API Integration State
    this.userLocation = null; // [lat, lng]
    this.locationResolved = null; // { area, town, city, country }
    this.liveNearbyPlaces = [];
    this.backendHealth = { status: "checking", bindings: {} };
    this.tourismDiscoveryStatus = {};
    this.eventDiscoveryStatus = {};
    this.tripIntelligenceStatus = {};

    // Moments & Captures
    this.moments = [
      {
        id: "m1",
        tripId: "paris",
        title: "Morning coffee in Saint-Germain",
        type: "note",
        date: "2026-10-03",
        text: "Watched the city wake up over fresh croissants and espresso."
      }
    ];

    // Checklist override store
    this.checklists = {
      paris: [...tripsData.paris.checklist],
      crete: [...tripsData.crete.checklist]
    };
    Object.keys(tripsData).forEach((tripId) => {
      const storedEvents = readStoredCalendarEvents(tripId);
      if (storedEvents) {
        tripsData[tripId].calendarEvents = storedEvents;
      }
      const storedDiscovery = readStoredTourismDiscovery(tripId);
      if (storedDiscovery) {
        tripsData[tripId].tourismPois = storedDiscovery.tourismPois;
        tripsData[tripId].hiddenGems = storedDiscovery.hiddenGems;
        tripsData[tripId].osmPlaces = storedDiscovery.osmPlaces;
        tripsData[tripId].companions = readStoredTripCompanions(tripId);
        this.tourismDiscoveryStatus[tripId] = {
          status: "cached",
          error: "",
          updatedAt: storedDiscovery.updatedAt,
        };
      } else {
        tripsData[tripId].tourismPois = tripsData[tripId].tourismPois || [];
        tripsData[tripId].hiddenGems = tripsData[tripId].hiddenGems || [];
        tripsData[tripId].osmPlaces = tripsData[tripId].osmPlaces || [];
        tripsData[tripId].companions = readStoredTripCompanions(tripId);
        this.tourismDiscoveryStatus[tripId] = { status: "idle", error: "", updatedAt: "" };
      }
    });

    // Generated AI Editorial Stories store
    this.generatedStories = {};

    this.quickCaptureOpen = false;
    this.quickCaptureTripId = this.activeTripId;
    this.quickCaptureUpload = { status: "idle", progress: 0, fileName: "", type: "" };
    this.activeLightboxMedia = null;
    this.activeEventDrawer = null; // { mode: 'create'|'edit', event: {} }
    this.activeCompanionQrId = "";
    this.activeInvite = getInviteFromLocation();
    this.tripCreateOpen = false;
    this.listeners = new Set();
    this.checkBackendHealth();
    this.refreshUserSession();
    this.loadD1Trips();
    this.loadPersistedMoments();
    this.refreshWeather();
    this.refreshTourismDiscovery();
    this.refreshEventDiscovery();
    this.refreshTripIntelligence();
    this.loadTripCompanions(this.activeTripId);
    if (this.activeInvite?.tripId && tripsData[this.activeInvite.tripId]) {
      this.acceptTripInvite({ mode: "preview", notify: false });
    }
  }

  async loadPersistedMoments() {
    try {
      const localMoments = await readStoredMoments();
      if (localMoments.length) {
        this.mergeMoments(localMoments);
      }

      const remoteMoments = await enrichmentService.fetchMoments().catch(() => []);
      if (remoteMoments.length) {
        this.mergeMoments(remoteMoments);
        const momentsWithMedia = this.moments.filter((moment) => moment.media_url || moment.mediaUrl);
        if (momentsWithMedia.length) saveStoredMoments(momentsWithMedia).catch(() => {});
      }
    } catch (error) {
      console.warn("Moment restore fallback:", error);
    }
  }

  mergeMoments(incomingMoments = []) {
    const byId = new Map(this.moments.map((moment) => [moment.id, moment]));
    incomingMoments.map(normalizeMomentRecord).filter((moment) => moment.id).forEach((incoming) => {
      const existing = byId.get(incoming.id);
      if (!existing) {
        byId.set(incoming.id, incoming);
        return;
      }

      byId.set(incoming.id, {
        ...incoming,
        ...existing,
        media_url: existing.media_url || incoming.media_url || incoming.mediaUrl || "",
        mediaUrl: existing.mediaUrl || incoming.mediaUrl || incoming.media_url || "",
        tags: existing.tags || incoming.tags,
        placeTitle: existing.placeTitle || incoming.placeTitle || incoming.place_title || "",
        placeCategory: existing.placeCategory || incoming.placeCategory || incoming.place_category || "",
        geoLabel: existing.geoLabel || incoming.geoLabel || incoming.geo_label || "",
      });
    });

    this.moments = Array.from(byId.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || a.groupCapturedAt || a.date || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || b.groupCapturedAt || b.date || 0).getTime();
      return bTime - aTime;
    });
    this.notify();
  }

  toggleQuickCapture(open) {
    this.quickCaptureOpen = open !== undefined ? open : !this.quickCaptureOpen;
    if (this.quickCaptureOpen) {
      this.quickCaptureTripId = this.activeTripId;
    }
    if (!this.quickCaptureOpen) {
      this.quickCaptureUpload = { status: "idle", progress: 0, fileName: "", type: "" };
    }
    this.notify();
  }

  setQuickCaptureTrip(tripId) {
    if (!tripsData[tripId]) return;
    this.quickCaptureTripId = tripId;
    this.notify();
  }

  setQuickCaptureUpload(upload = {}) {
    this.quickCaptureUpload = {
      status: upload.status || "idle",
      progress: Number(upload.progress || 0),
      fileName: upload.fileName || "",
      type: upload.type || "",
    };
    this.notify();
  }

  setGeneratedStory(tripId, story) {
    this.generatedStories[tripId] = story;
    this.notify();
  }

  openEventDrawer(mode = "create", event = {}) {
    this.activeEventDrawer = { mode, event };
    this.notify();
  }

  closeEventDrawer() {
    this.activeEventDrawer = null;
    this.notify();
  }

  openTripCreate() {
    this.tripCreateOpen = true;
    this.notify();
  }

  closeTripCreate() {
    this.tripCreateOpen = false;
    this.notify();
  }

  async loadD1Trips() {
    try {
      const res = await enrichmentService.fetchTrips();
      if (res && res.trips && Array.isArray(res.trips)) {
        res.trips.forEach((t) => {
          const resolvedFlag = (t.flag && t.flag.length <= 4 && !t.flag.match(/^[a-zA-Z]/)) ? t.flag : getCountryFlagEmoji(t.destination);
          if (!tripsData[t.id]) {
            tripsData[t.id] = {
              id: t.id,
              destination: t.destination || "Trip",
              flag: resolvedFlag,
              dates: t.dates || "Upcoming",
              daysCount: Number(t.days_count || t.daysCount) || 7,
              startDate: t.start_date || t.startDate || new Date().toISOString().split("T")[0],
              status: "Upcoming",
              statusText: "Trip loaded",
              tripMode: false,
              center: [t.latitude || 40.4168, t.longitude || -3.7038],
              zoom: 12,
              flightRoute: buildTripFlightRoute(t),
              flightPreference: normalizeFlightType(t.flight_type || "regular"),
              flightSearch: { status: "idle", offers: [], updatedAt: "" },
              weather: { temp: "22°C", condition: "Sunny", forecast: [] },
              upcomingActivity: { title: t.destination, subtitle: t.dates || "Upcoming", image: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=600&q=80" },
              checklist: [{ id: "stay", label: "Book your stay", completed: false }],
              calendarEvents: [],
              ideas: [],
              events: [],
              companions: readStoredTripCompanions(t.id),
              tourismPois: [],
              hiddenGems: [],
              osmPlaces: []
            };
          } else {
            tripsData[t.id].flag = resolvedFlag;
            tripsData[t.id].dates = t.dates || tripsData[t.id].dates;
            tripsData[t.id].daysCount = Number(t.days_count || t.daysCount) || tripsData[t.id].daysCount;
            tripsData[t.id].startDate = t.start_date || t.startDate || tripsData[t.id].startDate;
            tripsData[t.id].flightRoute = buildTripFlightRoute(t, tripsData[t.id]);
            tripsData[t.id].flightPreference = normalizeFlightType(t.flight_type || tripsData[t.id].flightPreference || "regular");
          }
        });
        await Promise.all(res.trips.map(async (t) => {
          const trip = tripsData[t.id];
          if (!trip) return;
          try {
            const remoteEvents = await enrichmentService.fetchTripEvents(t.id);
            if (remoteEvents.length) {
              trip.calendarEvents = mergeCalendarEvents(trip.calendarEvents || [], remoteEvents);
            }
            const storedEvents = readStoredCalendarEvents(t.id);
            if (storedEvents) {
              trip.calendarEvents = storedEvents;
            }
          } catch (e) {
            const storedEvents = readStoredCalendarEvents(t.id);
            if (storedEvents) {
              trip.calendarEvents = storedEvents;
            }
          }
        }));
        this.notify();
        this.refreshTourismDiscovery(this.activeTripId);
        this.refreshEventDiscovery(this.activeTripId);
        this.refreshTripIntelligence(this.activeTripId, { notify: false });
      }
    } catch (e) {
      console.warn("D1 trips load fallback:", e);
    }
  }

  getAllTrips() {
    return Object.values(tripsData);
  }

  cycleNextTrip() {
    const keys = Object.keys(tripsData);
    if (keys.length === 0) return;
    const currentIndex = keys.indexOf(this.activeTripId);
    const nextIndex = (currentIndex + 1) % keys.length;
    this.activeTripId = keys[nextIndex];
    this.refreshTourismDiscovery(this.activeTripId);
    this.refreshEventDiscovery(this.activeTripId);
    this.refreshTripIntelligence(this.activeTripId);
    this.notify();
  }

  openLightbox(media) {
    this.activeLightboxMedia = media;
    this.notify();
  }

  closeLightbox() {
    this.activeLightboxMedia = null;
    this.notify();
  }

  updateUserAvatar(url) {
    if (!url) return;
    this.userProfile = { ...this.userProfile, avatarUrl: url };
    this.userAvatar = this.userProfile.avatarUrl;
    writeStoredUserProfile(this.userProfile);
    this.notify();
  }

  toggleUserPreference(pref) {
    if (!pref) return;
    if (this.userPreferences.has(pref)) {
      this.userPreferences.delete(pref);
    } else {
      this.userPreferences.add(pref);
    }
    this.userProfile = { ...this.userProfile, personas: Array.from(this.userPreferences) };
    writeStoredUserProfile(this.userProfile);
    this.notify();
  }

  setProfileSection(section = "profile") {
    this.activeProfileSection = section;
    this.notify();
  }

  acceptTripInvite(options = {}) {
    const mode = options.mode || "guest";
    const tripId = options.tripId || this.activeInvite?.tripId || this.activeTripId;
    if (!tripsData[tripId]) return false;
    this.activeTripId = tripId;
    this.activeView = "plan";
    this.activeInvite = {
      ...(this.activeInvite || {}),
      tripId,
      status: mode === "preview" ? "preview" : "accepted",
      mode,
      acceptedAt: mode === "preview" ? "" : new Date().toISOString(),
    };
    if (mode === "guest") {
      this.userSession = { role: "guest", email: "", status: "guest" };
    }
    if (!this.quickCaptureOpen) {
      this.quickCaptureTripId = tripId;
    }
    this.loadTripCompanions(tripId);
    this.refreshTourismDiscovery(tripId);
    this.refreshEventDiscovery(tripId);
    this.refreshTripIntelligence(tripId);
    if (options.notify !== false) this.notify();
    return true;
  }

  dismissTripInvite() {
    this.activeInvite = null;
    this.notify();
  }

  async refreshUserSession() {
    try {
      const session = await enrichmentService.getSession();
      const principal = session.principal || {};
      this.userSession = {
        status: "ready",
        role: principal.role || "anonymous",
        userId: principal.userId || "",
        authType: principal.authType || "none",
      };
    } catch (error) {
      this.userSession = {
        status: "error",
        role: "anonymous",
        userId: "",
        authType: "none",
        error: error?.message || "session-check-failed",
      };
    }
    this.notify();
    return this.userSession;
  }

  get isAdmin() {
    return this.userSession?.role === "admin";
  }

  async loadTripCompanions(tripId = this.activeTripId) {
    const trip = tripsData[tripId];
    if (!trip) return [];
    const localCompanions = readStoredTripCompanions(tripId);
    if (localCompanions.length) trip.companions = localCompanions;

    try {
      const remoteCompanions = await enrichmentService.fetchTripCompanions(tripId);
      if (remoteCompanions.length) {
        trip.companions = remoteCompanions;
        writeStoredTripCompanions(tripId, remoteCompanions);
      }
    } catch {}

    this.notify();
    return trip.companions || [];
  }

  async inviteTripCompanion(tripId = this.activeTripId, companionInput = {}) {
    const trip = tripsData[tripId];
    if (!trip) return { ok: false, error: "missing-trip" };
    const email = normalizeEmailInput(companionInput.email);
    if (!email) return { ok: false, error: "invalid-email" };

    const name = String(companionInput.name || "").trim();
    const role = normalizeCompanionRoleInput(companionInput.role || "viewer");
    const inviteMethod = normalizeInviteMethodInput(companionInput.inviteMethod || "email");
    const personalMessage = String(companionInput.personalMessage || "").trim() || "Plan it. Live it. Remember it.";
    const inviteUrl = companionInput.inviteUrl || createTripInviteUrl(tripId);
    const current = trip.companions || readStoredTripCompanions(tripId);
    const tripTitle = getTripInviteTitle(trip);
    const destination = trip.destination || "Trip";
    const dates = trip.dates || "Upcoming";
    const travelersCount = Math.max(2, current.filter((item) => normalizeEmailInput(item.email) !== email).length + 2);
    const coverImage = getTripInviteCoverImage(trip);
    const inviterName = this.userProfile?.name || "Thomas";
    const inviteText = buildTripInviteText({
      inviterName,
      tripTitle,
      destination,
      dates,
      travelersCount,
      personalMessage,
      inviteUrl,
    });
    const now = new Date().toISOString();
    const companion = {
      id: companionInput.id || `companion_${tripId}_${email.replace(/[^a-z0-9]+/gi, "_")}`,
      tripId,
      name,
      email,
      role,
      status: "invited",
      inviteMethod,
      personalMessage,
      tripTitle,
      destination,
      dates,
      travelersCount,
      coverImage,
      inviteUrl,
      inviteText,
      createdAt: now,
      updatedAt: now,
    };

    const withoutDuplicate = current.filter((item) => item.email !== email);
    trip.companions = [companion, ...withoutDuplicate];
    writeStoredTripCompanions(tripId, trip.companions);
    this.notify();

    try {
      const result = await enrichmentService.inviteTripCompanion(tripId, companion);
      if (result.companion) {
        trip.companions = [result.companion, ...withoutDuplicate];
        writeStoredTripCompanions(tripId, trip.companions);
        this.notify();
      }
      return { ok: true, companion: result.companion || companion, source: "worker" };
    } catch (error) {
      return { ok: true, companion, source: "local", error: error?.message || "worker-companion-fallback" };
    }
  }

  async removeTripCompanion(tripId = this.activeTripId, companionId) {
    const trip = tripsData[tripId];
    if (!trip || !companionId) return false;
    trip.companions = (trip.companions || []).filter((companion) => companion.id !== companionId);
    writeStoredTripCompanions(tripId, trip.companions);
    this.notify();

    try {
      await enrichmentService.deleteTripCompanion(tripId, companionId);
    } catch {}
    return true;
  }

  toggleCompanionQr(companionId = "") {
    this.activeCompanionQrId = this.activeCompanionQrId === companionId ? "" : companionId;
    this.notify();
  }

  updateUserProfile(updates = {}, options = {}) {
    this.userProfile = {
      ...this.userProfile,
      ...updates,
      notifications: { ...this.userProfile.notifications, ...(updates.notifications || {}) },
      privacy: { ...this.userProfile.privacy, ...(updates.privacy || {}) },
    };
    this.userAvatar = this.userProfile.avatarUrl;
    this.userPreferences = new Set(this.userProfile.personas || []);
    writeStoredUserProfile(this.userProfile);
    if (options.notify !== false) this.notify();
  }

  updateUserProfileField(field, value, options = {}) {
    if (!field) return;
    this.updateUserProfile({ [field]: value }, options);
  }

  updateNestedUserProfileField(group, field, value, options = {}) {
    if (!group || !field || !this.userProfile[group]) return;
    this.updateUserProfile({
      [group]: {
        ...this.userProfile[group],
        [field]: value,
      },
    }, options);
  }

  addCustomPersona(label) {
    const cleanLabel = String(label || "").trim().replace(/\s+/g, " ").slice(0, 42);
    if (!cleanLabel || !this.isAdmin) return false;
    const existing = new Set([...(this.userProfile.customPersonas || []), ...Array.from(this.userPreferences), ...DEFAULT_TRAVELER_PERSONAS]);
    if (existing.has(cleanLabel)) return false;
    this.userProfile = {
      ...this.userProfile,
      customPersonas: [...(this.userProfile.customPersonas || []), cleanLabel],
      personas: [...(this.userProfile.personas || []), cleanLabel],
    };
    this.userPreferences = new Set(this.userProfile.personas || []);
    writeStoredUserProfile(this.userProfile);
    this.notify();
    return true;
  }

  removeCustomPersona(label) {
    const cleanLabel = String(label || "").trim();
    if (!cleanLabel || !this.isAdmin) return false;
    this.userProfile = {
      ...this.userProfile,
      customPersonas: (this.userProfile.customPersonas || []).filter((persona) => persona !== cleanLabel),
      personas: (this.userProfile.personas || []).filter((persona) => persona !== cleanLabel),
    };
    this.userPreferences = new Set(this.userProfile.personas || []);
    writeStoredUserProfile(this.userProfile);
    this.notify();
    return true;
  }

  resetUserProfile() {
    this.userProfile = readStoredUserProfile();
    this.userAvatar = this.userProfile.avatarUrl;
    this.userPreferences = new Set(this.userProfile.personas || []);
    this.notify();
  }

  get activeTrip() {
    return tripsData[this.activeTripId] || tripsData.paris;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this));
  }

  setView(view) {
    if (this.activeView !== view) {
      this.activeView = view;
      this.notify();
    }
  }

  setTrip(tripId) {
    if (tripsData[tripId] && this.activeTripId !== tripId) {
      this.activeTripId = tripId;
      this.loadTripCompanions(tripId);
      if (!this.quickCaptureOpen) {
        this.quickCaptureTripId = tripId;
      }
      this.refreshWeather();
      this.refreshTourismDiscovery(tripId);
      this.refreshEventDiscovery(tripId);
      this.refreshTripIntelligence(tripId);
      this.notify();
    }
  }

  async refreshWeather() {
    const trip = this.activeTrip;
    const [lat, lng] = trip.center || [48.8566, 2.3522];
    const liveWeather = await fetchOpenMeteoWeather(lat, lng);
    if (liveWeather) {
      trip.weather = {
        ...trip.weather,
        ...liveWeather
      };
      this.notify();
    }
  }

  getTourismDiscoveryStatus(tripId = this.activeTripId) {
    return this.tourismDiscoveryStatus[tripId] || { status: "idle", error: "", updatedAt: "" };
  }

  async refreshTourismDiscovery(tripId = this.activeTripId, options = {}) {
    const trip = tripsData[tripId];
    if (!trip || !Array.isArray(trip.center)) return { status: "error", error: "invalid-trip-center" };

    const existing = [...(trip.tourismPois || []), ...(trip.hiddenGems || []), ...(trip.osmPlaces || [])];
    if (this.tourismDiscoveryStatus[tripId]?.status === "loading" && !options.force) return this.tourismDiscoveryStatus[tripId];
    if (existing.length && !options.force) return this.tourismDiscoveryStatus[tripId] || { status: "ready", error: "" };

    this.tourismDiscoveryStatus[tripId] = {
      status: "loading",
      error: "",
      updatedAt: new Date().toISOString(),
    };
    if (options.notify !== false) this.notify();

    try {
      const [topResult, hiddenResult, osmResult] = await Promise.all([
        enrichmentService.discoverTopPois({
          coordinates: trip.center,
          radiusMeters: options.radiusMeters || 4500,
          limit: options.topLimit || 14,
        }),
        enrichmentService.discoverHiddenGems({
          coordinates: trip.center,
          radiusMeters: options.hiddenRadiusMeters || 6500,
          limit: options.hiddenLimit || 10,
        }),
        enrichmentService.discoverNearby({
          coordinates: trip.center,
          radiusMeters: options.osmRadiusMeters || 2200,
          intent: "traveler",
        }),
      ]);

      const tourismPois = (topResult?.places || []).map((place) => normalizeTourismIdea(place, "poi"));
      const hiddenGems = (hiddenResult?.places || []).map((place) => normalizeTourismIdea(place, "hidden"));
      const osmPlaces = (osmResult?.places || []).map((place) => normalizeTourismIdea(place, "osm"));
      await this.enrichDiscoveryMedia([...tourismPois, ...hiddenGems, ...osmPlaces].slice(0, 8));
      const status = getOpenTripMapStatus([topResult, hiddenResult]);
      const updatedAt = new Date().toISOString();

      trip.tourismPois = tourismPois;
      trip.hiddenGems = hiddenGems;
      trip.osmPlaces = osmPlaces;
      this.tourismDiscoveryStatus[tripId] = {
        status: tourismPois.length || hiddenGems.length || osmPlaces.length ? "ready" : status,
        error: status === "not-configured" ? "missing-opentripmap-api-key" : (topResult?.error || hiddenResult?.error || ""),
        updatedAt,
      };

      if (tourismPois.length || hiddenGems.length || osmPlaces.length) {
        writeStoredTourismDiscovery(tripId, { tourismPois, hiddenGems, osmPlaces, updatedAt });
      }
    } catch (error) {
      this.tourismDiscoveryStatus[tripId] = {
        status: "error",
        error: error?.message || "opentripmap-discovery-failed",
        updatedAt: new Date().toISOString(),
      };
    }

    this.notify();
    return this.tourismDiscoveryStatus[tripId];
  }

  async enrichDiscoveryMedia(ideas = []) {
    await Promise.allSettled(ideas.map(async (idea) => {
      if (!idea || !idea.id) return;
      const media = await enrichmentService.refreshMedia({
        id: idea.id,
        title: idea.title,
        canonicalName: idea.title,
        coordinates: idea.coordinates,
        wikidataId: idea.wikidataId || "",
        categories: idea.categories || [idea.category].filter(Boolean),
        sourceUrl: idea.sourceUrl || "",
      });
      const hero = media?.hero;
      if (hero?.imageUrl && !hero.illustrativeOnly) {
        idea.image = hero.imageUrl;
        idea.imageProvider = hero.provider || "";
        idea.imageAttribution = hero.attributionText || hero.creatorName || "";
        idea.media = media;
      }
    }));
  }

  async refreshEventDiscovery(tripId = this.activeTripId, options = {}) {
    const trip = tripsData[tripId];
    if (!trip || !Array.isArray(trip.center)) return { status: "error", error: "invalid-trip-center" };
    if (this.eventDiscoveryStatus[tripId]?.status === "loading" && !options.force) return this.eventDiscoveryStatus[tripId];
    if ((trip.events || []).some((event) => ["ticketmaster", "bandsintown"].includes(event.sourceRole || event.provider)) && !options.force) {
      return this.eventDiscoveryStatus[tripId] || { status: "ready", error: "" };
    }

    this.eventDiscoveryStatus[tripId] = {
      status: "loading",
      error: "",
      updatedAt: new Date().toISOString(),
    };

    try {
      const events = await fetchConcertsForTrip(trip.destination, trip.center);
      const existingTitles = new Set((trip.events || []).map((event) => event.title));
      const liveEvents = (events || []).filter((event) => !existingTitles.has(event.title));
      trip.events = [...liveEvents, ...(trip.events || [])].slice(0, 24);
      this.eventDiscoveryStatus[tripId] = {
        status: liveEvents.length ? "ready" : "fallback",
        error: "",
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.eventDiscoveryStatus[tripId] = {
        status: "error",
        error: error?.message || "event-discovery-failed",
        updatedAt: new Date().toISOString(),
      };
    }

    this.notify();
    return this.eventDiscoveryStatus[tripId];
  }

  getTripIntelligenceStatus(tripId = this.activeTripId) {
    return this.tripIntelligenceStatus[tripId] || { status: "idle", error: "", updatedAt: "" };
  }

  async refreshTripIntelligence(tripId = this.activeTripId, options = {}) {
    const trip = tripsData[tripId];
    if (!trip || !Array.isArray(trip.center)) return { status: "error", error: "invalid-trip-center" };
    if (this.tripIntelligenceStatus[tripId]?.status === "loading" && !options.force) return this.tripIntelligenceStatus[tripId];
    if (trip.tripIntelligence?.updatedAt && !options.force) return this.tripIntelligenceStatus[tripId] || { status: "ready", error: "" };

    this.tripIntelligenceStatus[tripId] = {
      status: "loading",
      error: "",
      updatedAt: new Date().toISOString(),
    };
    if (options.notify !== false) this.notify();

    try {
      const result = await fetchTripIntelligence(trip, options);
      trip.tripIntelligence = result;
      trip.outdoorIntel = result.outdoor || null;
      trip.travelSignals = result.signals || [];
      trip.mobilityOptions = result.mobility || [];
      trip.civicEvents = result.civicEvents || [];
      trip.headsUps = result.headsUps || [];
      if (trip.civicEvents.length) {
        const existingTitles = new Set((trip.events || []).map((event) => event.title));
        trip.events = [
          ...trip.civicEvents.filter((event) => !existingTitles.has(event.title)),
          ...(trip.events || []),
        ].slice(0, 24);
      }
      this.tripIntelligenceStatus[tripId] = {
        status: "ready",
        error: "",
        updatedAt: result.updatedAt || new Date().toISOString(),
        providerStatus: result.providerStatus || [],
      };
    } catch (error) {
      this.tripIntelligenceStatus[tripId] = {
        status: "error",
        error: error?.message || "trip-intelligence-failed",
        updatedAt: new Date().toISOString(),
      };
    }

    this.notify();
    return this.tripIntelligenceStatus[tripId];
  }

  toggleTripMode(enabled) {
    this.tripMode = enabled !== undefined ? enabled : !this.tripMode;
    this.notify();
  }

  setPlanSubTab(tab) {
    this.planSubTab = tab;
    this.notify();
  }

  setPlanViewMode(mode) {
    this.planViewMode = mode;
    this.notify();
  }

  setActiveDay(index) {
    this.activeDayIndex = index;
    this.notify();
  }

  setMapDayFilter(index) {
    this.mapDayFilter = index === null || index === undefined ? null : Number(index);
    this.notify();
  }

  setSearchQuery(query, options = {}) {
    this.searchQuery = query;
    if (options.notify !== false) {
      this.notify();
    }
  }

  setSearchCategory(category) {
    this.searchCategory = category;
    this.notify();
  }

  setSearchSubFilter(filter) {
    this.searchSubFilter = filter;
    this.notify();
  }

  async createCustomTrip(tripInput) {
    const id = tripInput.id || `trip_${Date.now()}`;
    const destination = tripInput.destination || "Custom Trip";
    // Auto-detect flag emoji if not specified
    const flag = (tripInput.flag && tripInput.flag !== "🗺️") ? tripInput.flag : getCountryFlagEmoji(destination);

    const newTrip = {
      id,
      destination,
      flag,
      dates: tripInput.dates || "Upcoming",
      daysCount: Number(tripInput.daysCount) || 7,
      startDate: tripInput.startDate || new Date().toISOString().split("T")[0],
      status: "Upcoming",
      statusText: "Trip created",
      tripMode: true,
      center: tripInput.center || [48.8566, 2.3522],
      zoom: 13,
      flightRoute: {
        originIata: tripInput.originAirport?.iata || "",
        destinationIata: tripInput.destinationAirport?.iata || "",
        originLabel: formatAirportLabel(tripInput.originAirport),
        destinationLabel: formatAirportLabel(tripInput.destinationAirport),
        flightType: normalizeFlightType(tripInput.flightType || "regular"),
        departureDate: tripInput.startDate || "",
      },
      flightPreference: normalizeFlightType(tripInput.flightType || "regular"),
      flightSearch: { status: "idle", offers: [], updatedAt: "" },
      weather: { temp: "20°C", condition: "Fair", forecast: [] },
      upcomingActivity: { title: destination, subtitle: tripInput.dates, image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80" },
      checklist: Array.isArray(tripInput.checklist) && tripInput.checklist.length
        ? tripInput.checklist
        : [{ id: "flight", label: "Search flights", completed: false }, { id: "stay", label: "Book your stay", completed: false }, { id: "exp", label: "Choose experiences", completed: false }],
      mapPins: [],
      calendarEvents: [],
      ideas: [],
      events: [],
      tourismPois: [],
      hiddenGems: [],
      osmPlaces: []
    };

    tripsData[id] = newTrip;
    this.checklists[id] = [...newTrip.checklist];
    this.activeTripId = id;
    this.tripCreateOpen = false;
    this.activeView = "plan";
    this.planSubTab = "plan";
    this.planViewMode = getDefaultPlanViewMode();
    this.notify();
    this.refreshTourismDiscovery(id);
    this.refreshEventDiscovery(id);
    this.refreshTripIntelligence(id);

    // Async sync with Cloudflare D1
    try {
      await enrichmentService.createTrip({
        id,
        destination: newTrip.destination,
        flag: newTrip.flag,
        dates: newTrip.dates,
        daysCount: newTrip.daysCount,
        startDate: newTrip.startDate,
        latitude: newTrip.center[0],
        longitude: newTrip.center[1],
        originIata: newTrip.flightRoute.originIata,
        destinationIata: newTrip.flightRoute.destinationIata,
        originLabel: newTrip.flightRoute.originLabel,
        destinationLabel: newTrip.flightRoute.destinationLabel,
        flightType: newTrip.flightRoute.flightType,
      });
    } catch (e) {
      console.warn("D1 trip sync fallback:", e);
    }
  }

  async updateTripTitle(tripId, newDestination) {
    const trip = tripsData[tripId];
    if (!trip || !newDestination) return;

    // Auto detect country flag emoji
    const flag = getCountryFlagEmoji(newDestination);

    trip.destination = newDestination;
    trip.flag = flag;
    if (trip.upcomingActivity) {
      trip.upcomingActivity.title = newDestination;
    }

    this.notify();

    // Async sync with Cloudflare D1
    try {
      await enrichmentService.updateTrip(tripId, { destination: newDestination, flag });
    } catch (e) {
      console.warn("D1 trip title update fallback:", e);
    }
  }

  async updateTripDetails(tripId, updates = {}) {
    const trip = tripsData[tripId];
    if (!trip) return;
    const destination = updates.destination || trip.destination;
    const flag = getCountryFlagEmoji(destination);
    const daysCount = Math.max(1, Number(updates.daysCount) || trip.daysCount || 7);

    trip.destination = destination;
    trip.flag = flag;
    trip.startDate = updates.startDate || trip.startDate;
    trip.daysCount = daysCount;
    trip.dates = updates.dates || trip.dates;
    trip.center = updates.center || trip.center;
    trip.statusText = "Trip updated";
    trip.tourismPois = [];
    trip.hiddenGems = [];
    trip.osmPlaces = [];
    trip.events = [];
    trip.tripIntelligence = null;
    trip.outdoorIntel = null;
    trip.travelSignals = [];
    trip.mobilityOptions = [];
    trip.civicEvents = [];
    trip.headsUps = [];
    trip.flightSearch = { status: "idle", offers: [], updatedAt: "" };

    if (trip.upcomingActivity) {
      trip.upcomingActivity.title = destination;
      trip.upcomingActivity.subtitle = trip.dates;
    }

    if (updates.destinationAirport) {
      trip.flightRoute = {
        ...(trip.flightRoute || {}),
        destinationIata: updates.destinationAirport.iata,
        destinationLabel: formatAirportLabel(updates.destinationAirport),
        departureDate: trip.startDate,
      };
    } else if (trip.flightRoute) {
      trip.flightRoute.departureDate = trip.startDate;
    }

    this.notify();
    this.refreshTourismDiscovery(tripId, { force: true });
    this.refreshEventDiscovery(tripId, { force: true });
    this.refreshTripIntelligence(tripId, { force: true });

    try {
      await enrichmentService.updateTrip(tripId, {
        destination,
        flag,
        dates: trip.dates,
        daysCount,
        startDate: trip.startDate,
        latitude: trip.center?.[0],
        longitude: trip.center?.[1],
        destinationIata: trip.flightRoute?.destinationIata || "",
        destinationLabel: trip.flightRoute?.destinationLabel || "",
      });
    } catch (e) {
      console.warn("D1 trip details update fallback:", e);
    }
  }

  async updateTripFlightRoute(tripId, updates = {}) {
    const trip = tripsData[tripId];
    if (!trip) return;
    const originAirport = updates.originAirport || getAirportByIata(updates.originIata);
    const destinationAirport = updates.destinationAirport || getAirportByIata(updates.destinationIata);
    const flightType = normalizeFlightType(updates.flightType || trip.flightRoute?.flightType || trip.flightPreference || "regular");

    trip.flightRoute = {
      ...(trip.flightRoute || {}),
      originIata: originAirport?.iata || "",
      destinationIata: destinationAirport?.iata || "",
      originLabel: formatAirportLabel(originAirport),
      destinationLabel: formatAirportLabel(destinationAirport),
      flightType,
      departureDate: trip.startDate || trip.flightRoute?.departureDate || "",
    };
    trip.flightPreference = flightType;
    trip.flightSearch = { status: "idle", offers: [], updatedAt: "" };

    this.notify();

    try {
      await enrichmentService.updateTrip(tripId, {
        originIata: trip.flightRoute.originIata,
        destinationIata: trip.flightRoute.destinationIata,
        originLabel: trip.flightRoute.originLabel,
        destinationLabel: trip.flightRoute.destinationLabel,
        flightType: trip.flightRoute.flightType,
      });
    } catch (e) {
      console.warn("D1 trip flight route update fallback:", e);
    }
  }

  async searchFlightsForActiveTrip(options = {}) {
    const trip = this.activeTrip;
    if (!trip) return;
    trip.flightSearch = {
      ...(trip.flightSearch || {}),
      status: "loading",
      error: "",
      offers: trip.flightSearch?.offers || [],
    };
    this.notify();

    try {
      const result = await searchFlightsForTrip(trip, options);
      trip.flightSearch = {
        ...result,
        status: result.status || "ready",
        offers: result.offers || [],
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      trip.flightSearch = {
        status: "error",
        error: error?.message || "flight-search-failed",
        offers: [],
        updatedAt: new Date().toISOString(),
      };
    }
    this.notify();
  }

  async addCalendarEvent(tripId, eventInput) {
    const trip = tripsData[tripId];
    if (!trip) return;

    const newEvt = {
      id: eventInput.id || `evt_${Date.now()}`,
      title: eventInput.title || "New Activity",
      type: eventInput.type || "sight",
      icon: eventInput.icon || "📍",
      dayIndex: Number(eventInput.dayIndex) || 0,
      dayName: eventInput.dayName || "Day 1",
      startTime: eventInput.startTime || "10:00",
      endTime: eventInput.endTime || "12:00",
      location: eventInput.location || "",
      colorScheme: eventInput.colorScheme || "peach"
    };

    trip.calendarEvents = trip.calendarEvents || [];
    trip.calendarEvents.push(newEvt);
    writeStoredCalendarEvents(tripId, trip.calendarEvents);
    this.notify();

    // Async sync with Cloudflare D1
    try {
      await enrichmentService.addTripEvent(tripId, newEvt);
    } catch (e) {
      console.warn("D1 event sync fallback:", e);
    }
  }

  updateCalendarEvent(tripId, eventId, updates) {
    const trip = tripsData[tripId];
    if (!trip || !trip.calendarEvents) return;
    const evt = trip.calendarEvents.find((e) => e.id === eventId);
    if (evt) {
      Object.assign(evt, updates);
      writeStoredCalendarEvents(tripId, trip.calendarEvents);
      this.notify();
      enrichmentService.updateTripEvent(tripId, eventId, { ...evt }).catch((e) => {
        console.warn("D1 event update fallback:", e);
      });
    }
  }

  deleteCalendarEvent(tripId, eventId) {
    const trip = tripsData[tripId];
    if (!trip || !trip.calendarEvents) return;
    trip.calendarEvents = trip.calendarEvents.filter((e) => e.id !== eventId);
    writeStoredCalendarEvents(tripId, trip.calendarEvents);
    this.notify();
    enrichmentService.deleteTripEvent(tripId, eventId).catch((e) => {
      console.warn("D1 event delete fallback:", e);
    });
  }

  async toggleSavedPlace(placeId) {
    if (this.savedPlaceIds.has(placeId)) {
      this.savedPlaceIds.delete(placeId);
    } else {
      this.savedPlaceIds.add(placeId);
    }
    try {
      localStorage.setItem("trip_saved_places", JSON.stringify([...this.savedPlaceIds]));
    } catch {}
    this.notify();

    // Async sync with Cloudflare D1
    try {
      await enrichmentService.toggleSavedPlace(placeId);
    } catch (e) {
      console.warn("D1 saved place toggle fallback:", e);
    }
  }

  toggleCheckitem(itemId) {
    const list = this.checklists[this.activeTripId];
    if (list) {
      const item = list.find((i) => i.id === itemId);
      if (item) {
        item.completed = !item.completed;
        this.notify();
      }
    }
  }

  addChecklistItem(label) {
    if (!label || !label.trim()) return;
    if (!this.checklists[this.activeTripId]) {
      this.checklists[this.activeTripId] = [];
    }
    const list = this.checklists[this.activeTripId];
    const newItem = {
      id: `chk_${Date.now()}`,
      label: label.trim(),
      completed: false
    };
    list.push(newItem);
    this.notify();
  }

  updateChecklistItem(itemId, newLabel) {
    if (!newLabel || !newLabel.trim()) return;
    const list = this.checklists[this.activeTripId];
    if (list) {
      const item = list.find((i) => i.id === itemId);
      if (item) {
        item.label = newLabel.trim();
        this.notify();
      }
    }
  }

  deleteChecklistItem(itemId) {
    const list = this.checklists[this.activeTripId];
    if (list) {
      this.checklists[this.activeTripId] = list.filter((i) => i.id !== itemId);
      this.notify();
    }
  }

  async addMoment(momentInput) {
    const newMoment = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tripId: momentInput.tripId || this.quickCaptureTripId || this.activeTripId,
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      ...momentInput
    };

    this.moments.unshift(newMoment);
    this.notify();
    saveStoredMoment(newMoment).catch((error) => console.warn("Moment local save fallback:", error));

    // Async sync with Cloudflare D1
    try {
      await enrichmentService.createMoment(newMoment);
    } catch (e) {
      console.warn("D1 moment sync fallback:", e);
    }

    return newMoment;
  }

  updateMoment(momentId, updates = {}) {
    const moment = this.moments.find((item) => item.id === momentId);
    if (!moment) return;
    Object.assign(moment, updates, { updatedAt: new Date().toISOString() });
    this.notify();
    saveStoredMoment(moment).catch((error) => console.warn("Moment local update fallback:", error));
  }

  // --- Cloudflare Worker & OpenStreetMap Integration Methods ---

  async checkBackendHealth() {
    try {
      const apiBase = import.meta.env?.VITE_TRIP_API_BASE || (typeof window !== "undefined" && window.location.origin.includes("8787") ? "" : "https://trip.thomasrynell.workers.dev");
      const res = await fetch(`${apiBase}/api/health`, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        this.backendHealth = { status: "connected", bindings: data.bindings || {} };
      } else {
        this.backendHealth = { status: "standalone", bindings: {} };
      }
    } catch {
      this.backendHealth = { status: "standalone", bindings: {} };
    }
    this.notify();
  }

  async requestCurrentLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        this.userLocation = coords;
        
        // Resolve location area via Worker / Nominatim
        try {
          const res = await enrichmentService.resolveLocation({ coordinates: coords });
          if (res) {
            this.locationResolved = res;
          }
        } catch (e) {
          console.warn("Location resolve warning:", e);
        }

        // Discover live nearby traveler POIs via Worker / Overpass
        try {
          const scan = await enrichmentService.discoverNearby({ coordinates: coords, radiusMeters: 2000 });
          if (scan && scan.places && scan.places.length) {
            this.liveNearbyPlaces = scan.places;
          }
        } catch (e) {
          console.warn("Nearby scan warning:", e);
        }

        this.notify();
      },
      (err) => {
        console.warn("User location request denied or failed:", err);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  async scanNearbyForArea(coords, radius = 2000) {
    try {
      const scan = await enrichmentService.discoverNearby({ coordinates: coords, radiusMeters: radius });
      if (scan && scan.places && scan.places.length) {
        return scan.places;
      }
    } catch (e) {
      console.warn("Scan nearby area failed:", e);
    }
    return [];
  }
}

export const state = new AppState();
