import { tripsData } from "./data/tripsData.js";
import { enrichmentService } from "./enrichment/enrichmentService.js";
import { getCountryFlagEmoji } from "./utils/countryEmoji.js";
import { fetchOpenMeteoWeather } from "./services/weatherService.js";
import { fetchConcertsForTrip } from "./services/concertService.js";

function getDefaultPlanViewMode() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "week";
  }

  return window.matchMedia("(pointer: coarse), (max-width: 540px)").matches ? "day" : "week";
}

const CALENDAR_EVENTS_STORAGE_PREFIX = "trip_calendar_events_";
const TOURISM_DISCOVERY_STORAGE_PREFIX = "trip_tourism_discovery_";

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

function getOpenTripMapStatus(results = []) {
  const statuses = results
    .flatMap((result) => result?.providerStatus || [])
    .filter((status) => status.provider === "opentripmap" || !status.provider);
  const missingKey = statuses.some((status) => status.status === "not-configured" || status.error === "missing-opentripmap-api-key" || status.error === "missing-opentripmap-key");
  if (missingKey) return "not-configured";
  if (statuses.some((status) => status.status === "error")) return "error";
  return "ready";
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

    // User Profile Avatar & Preferences
    this.userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80";
    try {
      const savedAvatar = localStorage.getItem("trip_user_avatar");
      if (savedAvatar) this.userAvatar = savedAvatar;
    } catch {}

    let savedPrefs = ["☕ Coffee Lover", "🍕 Foodie", "🎵 Concert Goer", "🎨 Art Enthusiast"];
    try {
      const stored = localStorage.getItem("trip_user_preferences");
      if (stored) savedPrefs = JSON.parse(stored);
    } catch {}
    this.userPreferences = new Set(savedPrefs);

    // Live Geolocation & Worker API Integration State
    this.userLocation = null; // [lat, lng]
    this.locationResolved = null; // { area, town, city, country }
    this.liveNearbyPlaces = [];
    this.backendHealth = { status: "checking", bindings: {} };
    this.tourismDiscoveryStatus = {};
    this.eventDiscoveryStatus = {};

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
        this.tourismDiscoveryStatus[tripId] = {
          status: "cached",
          error: "",
          updatedAt: storedDiscovery.updatedAt,
        };
      } else {
        tripsData[tripId].tourismPois = tripsData[tripId].tourismPois || [];
        tripsData[tripId].hiddenGems = tripsData[tripId].hiddenGems || [];
        tripsData[tripId].osmPlaces = tripsData[tripId].osmPlaces || [];
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
    this.tripCreateOpen = false;
    this.listeners = new Set();
    this.checkBackendHealth();
    this.loadD1Trips();
    this.refreshWeather();
    this.refreshTourismDiscovery();
    this.refreshEventDiscovery();
  }

  toggleQuickCapture(open) {
    this.quickCaptureOpen = open !== undefined ? open : !this.quickCaptureOpen;
    if (this.quickCaptureOpen && !tripsData[this.quickCaptureTripId]) {
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
              weather: { temp: "22°C", condition: "Sunny", forecast: [] },
              upcomingActivity: { title: t.destination, subtitle: t.dates || "Upcoming", image: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=600&q=80" },
              checklist: [{ id: "stay", label: "Book your stay", completed: false }],
              calendarEvents: [],
              ideas: [],
              events: [],
              tourismPois: [],
              hiddenGems: [],
              osmPlaces: []
            };
          } else {
            tripsData[t.id].flag = resolvedFlag;
            tripsData[t.id].dates = t.dates || tripsData[t.id].dates;
            tripsData[t.id].daysCount = Number(t.days_count || t.daysCount) || tripsData[t.id].daysCount;
            tripsData[t.id].startDate = t.start_date || t.startDate || tripsData[t.id].startDate;
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
    this.userAvatar = url;
    try {
      localStorage.setItem("trip_user_avatar", url);
    } catch {}
    this.notify();
  }

  toggleUserPreference(pref) {
    if (!pref) return;
    if (this.userPreferences.has(pref)) {
      this.userPreferences.delete(pref);
    } else {
      this.userPreferences.add(pref);
    }
    try {
      localStorage.setItem("trip_user_preferences", JSON.stringify(Array.from(this.userPreferences)));
    } catch {}
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
      if (!this.quickCaptureOpen) {
        this.quickCaptureTripId = tripId;
      }
      this.refreshWeather();
      this.refreshTourismDiscovery(tripId);
      this.refreshEventDiscovery(tripId);
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
      weather: { temp: "20°C", condition: "Fair", forecast: [] },
      upcomingActivity: { title: destination, subtitle: tripInput.dates, image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80" },
      checklist: Array.isArray(tripInput.checklist) && tripInput.checklist.length
        ? tripInput.checklist
        : [{ id: "stay", label: "Book your stay", completed: false }, { id: "exp", label: "Choose experiences", completed: false }],
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
        longitude: newTrip.center[1]
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
      id: `m_${Date.now()}`,
      tripId: momentInput.tripId || this.quickCaptureTripId || this.activeTripId,
      date: new Date().toISOString().split("T")[0],
      ...momentInput
    };

    this.moments.unshift(newMoment);
    this.notify();

    // Async sync with Cloudflare D1
    try {
      await enrichmentService.createMoment(newMoment);
    } catch (e) {
      console.warn("D1 moment sync fallback:", e);
    }
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
