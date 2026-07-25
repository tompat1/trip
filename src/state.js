import { tripsData } from "./data/tripsData.js";
import { enrichmentService } from "./enrichment/enrichmentService.js";

class AppState {
  constructor() {
    this.activeView = "home"; // "home" | "live" | "plan" | "search" | "profile" | "landing"
    this.activeTripId = "paris"; // "paris" | "crete"
    this.tripMode = true;
    
    // Plan view settings
    this.planSubTab = "plan"; // "overview" | "plan" | "explore" | "journal" | "story"
    this.planViewMode = "week"; // "day" | "week" | "timeline" | "map"
    this.activeDayIndex = 0;

    // Search view settings
    this.searchQuery = "Best coffee shops in Copenhagen";
    this.searchCategory = "All";
    this.searchSubFilter = "All";
    this.savedPlaceIds = new Set(["sp1", "sp2", "sp3", "sp4"]);

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

    this.listeners = new Set();
    this.checkBackendHealth();
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

  setSearchQuery(query) {
    this.searchQuery = query;
    this.notify();
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
    const newTrip = {
      id,
      destination: tripInput.destination || "Custom Trip",
      flag: tripInput.flag || "🗺️",
      dates: tripInput.dates || "Upcoming",
      daysCount: 7,
      startDate: new Date().toISOString().split("T")[0],
      status: "Upcoming",
      statusText: "Trip created",
      tripMode: true,
      center: tripInput.center || [48.8566, 2.3522],
      zoom: 13,
      weather: { temp: "20°C", condition: "Fair", forecast: [] },
      upcomingActivity: { title: tripInput.destination, subtitle: tripInput.dates, image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80" },
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

  async toggleSavedPlace(placeId) {
    if (this.savedPlaceIds.has(placeId)) {
      this.savedPlaceIds.delete(placeId);
    } else {
      this.savedPlaceIds.add(placeId);
    }
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
