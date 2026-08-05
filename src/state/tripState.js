/**
 * tripState mixin — trip CRUD, calendar events, flight routes, saved places,
 * checklists, and D1 sync.
 */
import { cloneDemoSampleTrips, tripsData } from "../data/tripsData.js";
import { enrichmentService } from "../enrichment/enrichmentService.js";
import { formatAirportLabel, getAirportByIata } from "../services/airportService.js";
import { normalizeFlightType, searchFlightsForTrip } from "../services/flightService.js";
import { fetchDynamicDestinationBrief } from "../services/destinationService.js";
import { resolveTripCenter } from "../app/mapController.js";
import { getCountryFlagEmoji } from "../utils/countryEmoji.js";
import { formatTripDateRangeFromParts, getTripDateStatus, inferStartDateFromText } from "../utils/tripDates.js";
import {
  buildTripFlightRoute,
  filterTripScopedItems,
  getDefaultPlanViewMode,
  isTripContentInScope,
  mergeCalendarEvents,
  removeStoredCalendarEvents,
  removeStoredTourismDiscovery,
  readStoredCalendarEvents,
  readStoredTripCompanions,
  writeStoredCalendarEvents,
} from "./helpers.js";

export const tripStateMixin = {
  // ── D1 trip loading & cleanup ─────────────────────────────────────────────

  clearUserOwnedTrips() {
    Object.keys(tripsData).forEach((id) => {
      delete tripsData[id];
      delete this.checklists?.[id];
      delete this.tourismDiscoveryStatus?.[id];
      delete this.eventDiscoveryStatus?.[id];
      delete this.tripIntelligenceStatus?.[id];
    });
    this.activeTripId = null;
    this.notify();
  },

  restoreDemoTrips() {
    const demoTrips = cloneDemoSampleTrips();
    Object.entries(demoTrips).forEach(([id, trip]) => {
      if (!tripsData[id]) {
        tripsData[id] = trip;
        if (trip.checklist) this.checklists[id] = [...trip.checklist];
        this.tourismDiscoveryStatus[id] = this.tourismDiscoveryStatus[id] || { status: "idle", error: "", updatedAt: "" };
        this.eventDiscoveryStatus[id] = this.eventDiscoveryStatus[id] || { status: "idle", error: "", updatedAt: "" };
        this.tripIntelligenceStatus[id] = this.tripIntelligenceStatus[id] || { status: "idle", error: "", updatedAt: "" };
      }
    });
    if (!this.activeTripId || !tripsData[this.activeTripId]) {
      this.activeTripId = Object.keys(demoTrips)[0] || null;
    }
  },

  async syncGuestDraftTripsToAccount() {
    if (!this.isAuthenticated) return;
    const allTrips = Object.values(tripsData);
    const guestDraftTrips = allTrips.filter((t) =>
      !t.isDemoTrip &&
      t.syncStatus !== "demo" &&
      (t.syncStatus === "needs-auth" || (!t.userId && t.syncStatus !== "synced"))
    );

    if (guestDraftTrips.length === 0) return;

    for (const trip of guestDraftTrips) {
      try {
        await enrichmentService.createTrip({
          id: trip.id,
          destination: trip.destination,
          flag: trip.flag,
          dates: trip.dates,
          daysCount: trip.daysCount,
          startDate: trip.startDate,
          latitude: trip.center ? trip.center[0] : 40.4168,
          longitude: trip.center ? trip.center[1] : -3.7038,
          originIata: trip.flightRoute?.originIata,
          destinationIata: trip.flightRoute?.destinationIata,
          originLabel: trip.flightRoute?.originLabel,
          destinationLabel: trip.flightRoute?.destinationLabel,
          flightType: trip.flightRoute?.flightType,
        });
        trip.syncStatus = "synced";
        trip.userId = this.userSession?.userId || "";
      } catch (e) {
        console.warn("Guest draft sync warning:", e);
      }
    }
  },

  async loadD1Trips() {
    if (this.isAdmin) this.restoreDemoTrips();
    this.tripSyncStatus = { status: "loading", error: "", updatedAt: "" };
    this.notify();
    await this.syncGuestDraftTripsToAccount();
    try {
      const res = await enrichmentService.fetchTrips();
      const remoteTrips = Array.isArray(res) ? res : (Array.isArray(res?.trips) ? res.trips : []);
      if (remoteTrips.length) {
        remoteTrips.forEach((t) => {
          const existingTrip = tripsData[t.id] || {};
          const center = getLoadedTripCenter(t, existingTrip);
          const flightRoute = buildTripFlightRoute(t, existingTrip);
          const destination = getLoadedTripDestination(t, existingTrip, flightRoute, center);
          const daysCount = Number(t.days_count || t.daysCount) || existingTrip.daysCount || 7;
          const startDate = getLoadedTripStartDate(t, existingTrip);
          const dates = t.dates || existingTrip.dates || formatTripDateRangeFromParts(startDate, daysCount);
          const resolvedFlag =
            t.flag && t.flag.length <= 4 && !t.flag.match(/^[a-zA-Z]/)
              ? t.flag
              : getCountryFlagEmoji(destination);
          if (!tripsData[t.id]) {
            tripsData[t.id] = {
              id: t.id,
              userId: t.user_id || t.userId || "",
              destination,
              language: getTripLanguage(destination, t.language || existingTrip.language),
              flag: resolvedFlag,
              dates,
              daysCount,
              startDate,
              status: "Upcoming",
              statusText: "Trip loaded",
              tripMode: isTripLiveWindow(startDate, daysCount),
              center,
              zoom: 12,
              flightRoute,
              flightPreference: normalizeFlightType(t.flight_type || existingTrip.flightPreference || "regular"),
              flightSearch: { status: "idle", offers: [], updatedAt: "" },
              weather: existingTrip.weather || { temp: "22°C", condition: "Sunny", forecast: [] },
              upcomingActivity: {
                title: destination,
                subtitle: dates || "Upcoming",
                image: existingTrip.upcomingActivity?.image || getDestinationImage(destination),
              },
              checklist: existingTrip.checklist || [{ id: "stay", label: "Book your stay", completed: false }],
              calendarEvents: [],
              ideas: existingTrip.ideas || [],
              events: existingTrip.events || [],
              companions: readStoredTripCompanions(t.id),
              tourismPois: [],
              hiddenGems: [],
              osmPlaces: [],
              syncStatus: "synced",
            };
          } else {
            const trip = tripsData[t.id];
            const previousDestination = trip.destination;
            const previousCenter = trip.center;
            trip.userId = t.user_id || t.userId || trip.userId || "";
            trip.flag = resolvedFlag;
            trip.destination = destination;
            trip.language = getTripLanguage(destination, t.language || trip.language);
            trip.dates = dates || trip.dates;
            trip.daysCount = daysCount || trip.daysCount;
            trip.startDate = startDate || trip.startDate;
            trip.tripMode = isTripLiveByDate(trip);
            trip.center = center;
            trip.flightRoute = flightRoute;
            tripsData[t.id].flightPreference = normalizeFlightType(
              t.flight_type || tripsData[t.id].flightPreference || "regular"
            );
            if (trip.upcomingActivity) {
              trip.upcomingActivity = {
                ...trip.upcomingActivity,
                title: destination,
                subtitle: trip.dates,
                image: trip.upcomingActivity.image || getDestinationImage(destination),
              };
            }
            trip.syncStatus = "synced";
            if (hasTripScopeChanged(previousDestination, previousCenter, trip)) {
              clearTripDiscoveryForScope(this, trip.id, trip);
            } else {
              clearOutOfScopePlaces(this, trip.id, trip);
            }
          }
        });

        if (!this.activeTripId || !tripsData[this.activeTripId]) {
          this.activeTripId = remoteTrips[0]?.id || null;
        }
        this.tripMode = isTripLiveByDate(this.activeTrip);

        await Promise.all(
          remoteTrips.map(async (t) => {
            const trip = tripsData[t.id];
            if (!trip) return;
            try {
              const remoteEvents = await enrichmentService.fetchTripEvents(t.id);
              const scopedRemoteEvents = filterTripScopedItems(remoteEvents || [], trip);
              if (scopedRemoteEvents.length) {
                trip.calendarEvents = mergeCalendarEvents(trip.calendarEvents || [], scopedRemoteEvents);
              }
              const storedEvents = readStoredCalendarEvents(t.id);
              if (storedEvents) trip.calendarEvents = mergeScopedCalendarEvents(t.id, trip, storedEvents);
            } catch {
              const storedEvents = readStoredCalendarEvents(t.id);
              if (storedEvents) trip.calendarEvents = mergeScopedCalendarEvents(t.id, trip, storedEvents);
            }
          })
        );

        this.notify();
        this.refreshTourismDiscovery(this.activeTripId);
        this.refreshEventDiscovery(this.activeTripId);
        this.refreshTripIntelligence(this.activeTripId, { notify: false });
      }
      this.tripSyncStatus = { status: "ready", error: "", updatedAt: new Date().toISOString() };
      this.notify();
    } catch (e) {
      this.tripSyncStatus = {
        status: "error",
        error: e?.message || "trips-load-failed",
        updatedAt: new Date().toISOString(),
      };
      console.warn("D1 trips load fallback:", e);
      this.notify();
    }
  },

  // ── Trip creation ──────────────────────────────────────────────────────────

  async createCustomTrip(tripInput) {
    const id = tripInput.id || `trip_${Date.now()}`;
    const destination = tripInput.destination || "Custom Trip";
    const flag =
      tripInput.flag && tripInput.flag !== "🗺️" ? tripInput.flag : getCountryFlagEmoji(destination);

    const resolvedCenter = tripInput.center || resolveTripCenter(destination);

    const newTrip = {
      id,
      destination,
      flag,
      dates: tripInput.dates || "Upcoming",
      daysCount: Number(tripInput.daysCount) || 7,
      startDate: tripInput.startDate || new Date().toISOString().split("T")[0],
      status: "Upcoming",
      statusText: "Trip created",
      tripMode: isTripLiveWindow(
        tripInput.startDate || new Date().toISOString().split("T")[0],
        Number(tripInput.daysCount) || 7
      ),
      center: resolvedCenter,
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
      upcomingActivity: {
        title: destination,
        subtitle: tripInput.dates,
        image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
      },
      checklist:
        Array.isArray(tripInput.checklist) && tripInput.checklist.length
          ? tripInput.checklist
          : [
              { id: "flight", label: "Search flights", completed: false },
              { id: "stay", label: "Book your stay", completed: false },
              { id: "exp", label: "Choose experiences", completed: false },
            ],
      mapPins: [],
      calendarEvents: [],
      ideas: [],
      events: [],
      tourismPois: [],
      hiddenGems: [],
      osmPlaces: [],
    };

    tripsData[id] = newTrip;
    this.checklists[id] = [...newTrip.checklist];
    this.activeTripId = id;
    this.tripCreateOpen = false;
    this.activeView = "plan";
    this.planSubTab = "overview";
    this.notify();

    // Fetch dynamic Wikipedia destination brief & hero image immediately
    fetchDynamicDestinationBrief(destination).then((brief) => {
      if (brief) {
        this.destinationSummaries = this.destinationSummaries || {};
        this.destinationSummaries[destination] = brief;
        if (brief.heroImage) {
          newTrip.heroImage = brief.heroImage;
          if (newTrip.upcomingActivity) newTrip.upcomingActivity.image = brief.heroImage;
        }
        this.notify();
      }
    }).catch(() => {});

    // Trigger live POI discovery immediately for this trip
    Promise.allSettled([
      this.refreshTourismDiscovery(id, { force: true }),
      this.refreshEventDiscovery(id, { force: true }),
      this.refreshTripIntelligence(id, { force: true }),
    ]).then(() => {
      this.notify();
    });

    if (this.isAuthenticated) {
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
        newTrip.syncStatus = "synced";
      } catch (e) {
        // 401 means the user is not signed in — trip exists in-memory/localStorage but won't survive across devices.
        const isAuthError = e?.message?.includes("-401") || e?.status === 401;
        newTrip.syncStatus = isAuthError ? "needs-auth" : "sync-error";
        if (!isAuthError) console.warn("D1 trip sync fallback:", e);
      }
    } else {
      newTrip.syncStatus = "needs-auth";
    }
    this.notify();
  },

  // ── Trip updates ───────────────────────────────────────────────────────────

  async updateTripTitle(tripId, newDestination) {
    const trip = tripsData[tripId];
    if (!trip || !newDestination) return;

    const previousDestination = trip.destination;
    const previousCenter = trip.center;
    const flag = getCountryFlagEmoji(newDestination);
    trip.destination = newDestination;
    trip.flag = flag;
    if (trip.upcomingActivity) trip.upcomingActivity.title = newDestination;
    if (hasTripScopeChanged(previousDestination, previousCenter, trip)) {
      clearTripDiscoveryForScope(this, tripId, trip);
    }

    this.notify();

    try {
      await enrichmentService.updateTrip(tripId, { destination: newDestination, flag });
    } catch (e) {
      console.warn("D1 trip title update fallback:", e);
    }
  },

  async updateTripDetails(tripId, updates = {}) {
    const trip = tripsData[tripId];
    if (!trip) return;
    const previousDestination = trip.destination;
    const previousCenter = trip.center;
    const destination = updates.destination || trip.destination;
    const flag = getCountryFlagEmoji(destination);
    const daysCount = Math.max(1, Number(updates.daysCount) || trip.daysCount || 7);

    trip.destination = destination;
    trip.flag = flag;
    trip.startDate = updates.startDate || trip.startDate;
    trip.daysCount = daysCount;
    trip.dates = updates.dates || trip.dates;
    trip.center = updates.center || trip.center;
    trip.tripMode = isTripLiveByDate(trip);
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

    if (hasTripScopeChanged(previousDestination, previousCenter, trip)) {
      clearTripDiscoveryForScope(this, tripId, trip);
    } else {
      clearOutOfScopePlaces(this, tripId, trip);
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
  },

  async updateTripFlightRoute(tripId, updates = {}) {
    const trip = tripsData[tripId];
    if (!trip) return;
    const originAirport = updates.originAirport || getAirportByIata(updates.originIata);
    const destinationAirport = updates.destinationAirport || getAirportByIata(updates.destinationIata);
    const flightType = normalizeFlightType(
      updates.flightType || trip.flightRoute?.flightType || trip.flightPreference || "regular"
    );

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
  },

  // ── Flight search ──────────────────────────────────────────────────────────

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
  },

  // ── Calendar events ────────────────────────────────────────────────────────

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
      colorScheme: eventInput.colorScheme || "peach",
    };

    trip.calendarEvents = trip.calendarEvents || [];
    if (!isTripContentInScope(newEvt, trip)) return;
    trip.calendarEvents.push(newEvt);
    writeStoredCalendarEvents(tripId, trip.calendarEvents);
    this.notify();

    try {
      await enrichmentService.addTripEvent(tripId, newEvt);
    } catch (e) {
      console.warn("D1 event sync fallback:", e);
    }
  },

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
  },

  deleteCalendarEvent(tripId, eventId) {
    const trip = tripsData[tripId];
    if (!trip || !trip.calendarEvents) return;
    trip.calendarEvents = trip.calendarEvents.filter((e) => e.id !== eventId);
    writeStoredCalendarEvents(tripId, trip.calendarEvents);
    this.notify();
    enrichmentService.deleteTripEvent(tripId, eventId).catch((e) => {
      console.warn("D1 event delete fallback:", e);
    });
  },

  // ── Saved places ───────────────────────────────────────────────────────────

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

    try {
      await enrichmentService.toggleSavedPlace(placeId);
    } catch (e) {
      console.warn("D1 saved place toggle fallback:", e);
    }
  },

  // ── Checklists ─────────────────────────────────────────────────────────────

  toggleCheckitem(itemId) {
    const list = this.checklists[this.activeTripId];
    if (list) {
      const item = list.find((i) => i.id === itemId);
      if (item) {
        item.completed = !item.completed;
        this.notify();
      }
    }
  },

  addChecklistItem(label) {
    if (!label || !label.trim()) return;
    if (!this.checklists[this.activeTripId]) this.checklists[this.activeTripId] = [];
    this.checklists[this.activeTripId].push({
      id: `chk_${Date.now()}`,
      label: label.trim(),
      completed: false,
    });
    this.notify();
  },

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
  },

  deleteChecklistItem(itemId) {
    const list = this.checklists[this.activeTripId];
    if (list) {
      this.checklists[this.activeTripId] = list.filter((i) => i.id !== itemId);
      this.notify();
    }
  },
};

function getLoadedTripCenter(row = {}, existingTrip = {}) {
  const lat = Number(row.latitude ?? row.lat);
  const lng = Number(row.longitude ?? row.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) return [lat, lng];
  if (Array.isArray(existingTrip.center) && existingTrip.center.length === 2) return existingTrip.center;
  return resolveTripCenter(row.destination || existingTrip.destination || "");
}

function getLoadedTripStartDate(row = {}, existingTrip = {}) {
  const explicit = String(row.start_date || row.startDate || existingTrip.startDate || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  return inferStartDateFromText([row.dates, row.destination, existingTrip.dates, existingTrip.destination].filter(Boolean).join(" ")) ||
    new Date().toISOString().split("T")[0];
}

function isTripLiveWindow(startDate = "", daysCount = 1) {
  return getTripDateStatus({ startDate, daysCount }).state === "active";
}

function isTripLiveByDate(trip = {}) {
  return getTripDateStatus(trip).state === "active";
}

function mergeScopedCalendarEvents(tripId, trip, events = []) {
  const scopedEvents = filterTripScopedItems(events, trip);
  if (scopedEvents.length !== (events || []).length) {
    removeStoredCalendarEvents(tripId);
  }
  return mergeCalendarEvents(trip.calendarEvents || [], scopedEvents);
}

function getLoadedTripDestination(row = {}, existingTrip = {}, flightRoute = {}, center = []) {
  const rawDestination = String(row.destination || existingTrip.destination || "Trip").trim();
  const destinationAirport = getAirportByIata(flightRoute.destinationIata);
  const inferred = destinationAirport ? `${cleanAirportCity(destinationAirport.city)}, ${destinationAirport.country}` : inferDestinationFromCenter(center);

  if (inferred && isCountryOrSeasonTripLabel(rawDestination)) return inferred;
  return normalizeSeasonTripLabel(rawDestination) || inferred || rawDestination;
}

function normalizeSeasonTripLabel(value = "") {
  const text = String(value || "").trim();
  if (/^spain\b/i.test(text) && /fall|autumn|sept|sep|oct|20\d\d/i.test(text)) return "Madrid, Spain";
  return text;
}

function isCountryOrSeasonTripLabel(value = "") {
  const text = String(value || "").trim().toLowerCase();
  return /^(spain|france|greece|italy|portugal|denmark|sweden|japan|united kingdom|uk|usa|united states)\b/.test(text) ||
    /\b(fall|autumn|spring|summer|winter|20\d\d|sept?|oct)\b/.test(text);
}

function inferDestinationFromCenter(center = []) {
  const lat = Number(center[0]);
  const lng = Number(center[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const known = [
    { destination: "Madrid, Spain", center: [40.4168, -3.7038] },
    { destination: "Barcelona, Spain", center: [41.3874, 2.1686] },
    { destination: "Paris, France", center: [48.8566, 2.3522] },
    { destination: "Heraklion, Crete", center: [35.3391, 25.132] },
  ];
  return known.find((item) => Math.abs(item.center[0] - lat) < 0.35 && Math.abs(item.center[1] - lng) < 0.35)?.destination || "";
}

function cleanAirportCity(city = "") {
  return String(city || "").replace(/\s*\(.+?\)\s*/g, "").trim();
}

function getTripLanguage(destination = "", fallback = "") {
  const lower = String(destination || "").toLowerCase();
  if (lower.includes("spain") || lower.includes("madrid") || lower.includes("barcelona")) return "es";
  if (lower.includes("france") || lower.includes("paris")) return "fr";
  if (lower.includes("greece") || lower.includes("crete") || lower.includes("heraklion")) return "el";
  return fallback || "en";
}

function getDestinationImage(destination = "") {
  const lower = String(destination || "").toLowerCase();
  if (lower.includes("madrid")) return "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=600&q=80";
  if (lower.includes("barcelona")) return "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=600&q=80";
  if (lower.includes("crete") || lower.includes("heraklion")) return "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80";
  if (lower.includes("paris")) return "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80";
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80";
}

function hasTripScopeChanged(previousDestination = "", previousCenter = [], trip = {}) {
  const prev = String(previousDestination || "").toLowerCase();
  const next = String(trip.destination || "").toLowerCase();
  const centerChanged = Array.isArray(previousCenter) && Array.isArray(trip.center)
    ? Math.abs(Number(previousCenter[0]) - Number(trip.center[0])) > 0.5 || Math.abs(Number(previousCenter[1]) - Number(trip.center[1])) > 0.5
    : false;
  return Boolean(prev && next && prev !== next) || centerChanged;
}

function clearTripDiscoveryForScope(appState, tripId, trip) {
  trip.tourismPois = [];
  trip.hiddenGems = [];
  trip.osmPlaces = [];
  trip.events = [];
  trip.calendarEvents = [];
  trip.ideas = filterTripScopedItems(trip.ideas || [], trip);
  trip.mapPins = [];
  trip.nearbyNow = [];
  trip.liveInfo = [];
  trip.transportOptions = [];
  appState.tourismDiscoveryStatus[tripId] = { status: "idle", error: "", updatedAt: "" };
  appState.eventDiscoveryStatus[tripId] = { status: "idle", error: "", updatedAt: "" };
  removeStoredTourismDiscovery(tripId);
  removeStoredCalendarEvents(tripId);
}

function clearOutOfScopePlaces(appState, tripId, trip) {
  const scopedTourismPois = filterTripScopedItems(trip.tourismPois || [], trip);
  const scopedHiddenGems = filterTripScopedItems(trip.hiddenGems || [], trip);
  const scopedOsmPlaces = filterTripScopedItems(trip.osmPlaces || [], trip);
  const scopedEvents = filterTripScopedItems(trip.events || [], trip);
  const scopedCalendarEvents = filterTripScopedItems(trip.calendarEvents || [], trip);
  const scopedIdeas = filterTripScopedItems(trip.ideas || [], trip);
  const hasLeak =
    scopedTourismPois.length !== (trip.tourismPois || []).length ||
    scopedHiddenGems.length !== (trip.hiddenGems || []).length ||
    scopedOsmPlaces.length !== (trip.osmPlaces || []).length ||
    scopedEvents.length !== (trip.events || []).length ||
    scopedCalendarEvents.length !== (trip.calendarEvents || []).length ||
    scopedIdeas.length !== (trip.ideas || []).length;
  if (!hasLeak) return;
  trip.tourismPois = scopedTourismPois;
  trip.hiddenGems = scopedHiddenGems;
  trip.osmPlaces = scopedOsmPlaces;
  trip.events = scopedEvents;
  trip.calendarEvents = scopedCalendarEvents;
  trip.ideas = scopedIdeas;
  appState.tourismDiscoveryStatus[tripId] = { status: "idle", error: "", updatedAt: "" };
  appState.eventDiscoveryStatus[tripId] = { status: "idle", error: "", updatedAt: "" };
  removeStoredTourismDiscovery(tripId);
  removeStoredCalendarEvents(tripId);
}
