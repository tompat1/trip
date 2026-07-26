import { tripsData } from "./data/tripsData.js";
import { enrichmentService } from "./enrichment/enrichmentService.js";
import { getCountryFlagEmoji } from "./utils/countryEmoji.js";
import { fetchOpenMeteoWeather } from "./services/weatherService.js";

class AppState {
  constructor() {
    this.activeView = "landing"; // Initial entry view: "landing" | "home" | "live" | "plan" | "search" | "profile"
    this.activeTripId = "paris"; // "paris" | "crete"
    this.tripMode = false; // Default: Planning mode ("Before you go" / Just got home from Crete!)
    
    // Plan view settings
    this.planSubTab = "plan"; // "overview" | "plan" | "explore" | "journal" | "story"
    this.planViewMode = "week"; // "day" | "week" | "timeline" | "map"
    this.activeDayIndex = 0;

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

    // Moments & Captures
    this.moments = [
      {
        id: "m1",
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

    // Generated AI Editorial Stories store
    this.generatedStories = {};

    this.quickCaptureOpen = false;
    this.activeLightboxMedia = null;
    this.activeEventDrawer = null; // { mode: 'create'|'edit', event: {} }
    this.calendarDayFilter = "all"; // 'all' or '0'..'6'
    this.listeners = new Set();
    this.checkBackendHealth();
    this.loadD1Trips();
    this.refreshWeather();
  }

  toggleQuickCapture(open) {
    this.quickCaptureOpen = open !== undefined ? open : !this.quickCaptureOpen;
    this.notify();
  }

  setGeneratedStory(tripId, story) {
    this.generatedStories[tripId] = story;
    this.notify();
  }

  setCalendarDayFilter(filter) {
    this.calendarDayFilter = String(filter);
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
              daysCount: 7,
              startDate: new Date().toISOString().split("T")[0],
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
              events: []
            };
          } else {
            tripsData[t.id].flag = resolvedFlag;
          }
        });
        this.notify();
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
      this.refreshWeather();
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
      daysCount: 7,
      startDate: new Date().toISOString().split("T")[0],
      status: "Upcoming",
      statusText: "Trip created",
      tripMode: true,
      center: tripInput.center || [48.8566, 2.3522],
      zoom: 13,
      weather: { temp: "20°C", condition: "Fair", forecast: [] },
      upcomingActivity: { title: destination, subtitle: tripInput.dates, image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80" },
      checklist: [{ id: "stay", label: "Book your stay", completed: false }, { id: "exp", label: "Choose experiences", completed: false }],
      mapPins: [],
      calendarEvents: [],
      ideas: [],
      events: []
    };

    tripsData[id] = newTrip;
    this.checklists[id] = [...newTrip.checklist];
    this.activeTripId = id;
    this.notify();

    // Async sync with Cloudflare D1
    try {
      await enrichmentService.createTrip({
        id,
        destination: newTrip.destination,
        flag: newTrip.flag,
        dates: newTrip.dates,
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
      this.notify();
    }
  }

  deleteCalendarEvent(tripId, eventId) {
    const trip = tripsData[tripId];
    if (!trip || !trip.calendarEvents) return;
    trip.calendarEvents = trip.calendarEvents.filter((e) => e.id !== eventId);
    this.notify();
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
