/**
 * tripState mixin — trip CRUD, calendar events, flight routes, saved places,
 * checklists, and D1 sync.
 */
import { tripsData } from "../data/tripsData.js";
import { enrichmentService } from "../enrichment/enrichmentService.js";
import { formatAirportLabel, getAirportByIata } from "../services/airportService.js";
import { normalizeFlightType, searchFlightsForTrip } from "../services/flightService.js";
import { fetchDynamicDestinationBrief } from "../services/destinationService.js";
import { resolveTripCenter } from "../app/mapController.js";
import { getCountryFlagEmoji } from "../utils/countryEmoji.js";
import {
  buildTripFlightRoute,
  getDefaultPlanViewMode,
  mergeCalendarEvents,
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

  async syncGuestDraftTripsToAccount() {
    if (!this.isAuthenticated) return;
    const allTrips = Object.values(tripsData);
    const guestDraftTrips = allTrips.filter((t) => t.syncStatus === "needs-auth" || (!t.userId && t.syncStatus !== "synced"));

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
    await this.syncGuestDraftTripsToAccount();
    try {
      const res = await enrichmentService.fetchTrips();
      const remoteTrips = Array.isArray(res) ? res : (Array.isArray(res?.trips) ? res.trips : []);
      if (remoteTrips.length) {
        remoteTrips.forEach((t) => {
          const resolvedFlag =
            t.flag && t.flag.length <= 4 && !t.flag.match(/^[a-zA-Z]/)
              ? t.flag
              : getCountryFlagEmoji(t.destination);
          if (!tripsData[t.id]) {
            tripsData[t.id] = {
              id: t.id,
              userId: t.user_id || t.userId || "",
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
              upcomingActivity: {
                title: t.destination,
                subtitle: t.dates || "Upcoming",
                image: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=600&q=80",
              },
              checklist: [{ id: "stay", label: "Book your stay", completed: false }],
              calendarEvents: [],
              ideas: [],
              events: [],
              companions: readStoredTripCompanions(t.id),
              tourismPois: [],
              hiddenGems: [],
              osmPlaces: [],
            };
          } else {
            tripsData[t.id].flag = resolvedFlag;
            tripsData[t.id].dates = t.dates || tripsData[t.id].dates;
            tripsData[t.id].daysCount = Number(t.days_count || t.daysCount) || tripsData[t.id].daysCount;
            tripsData[t.id].startDate = t.start_date || t.startDate || tripsData[t.id].startDate;
            tripsData[t.id].flightRoute = buildTripFlightRoute(t, tripsData[t.id]);
            tripsData[t.id].flightPreference = normalizeFlightType(
              t.flight_type || tripsData[t.id].flightPreference || "regular"
            );
          }
        });

        if (!this.activeTripId || !tripsData[this.activeTripId]) {
          this.activeTripId = remoteTrips[0]?.id || null;
        }

        await Promise.all(
          remoteTrips.map(async (t) => {
            const trip = tripsData[t.id];
            if (!trip) return;
            try {
              const remoteEvents = await enrichmentService.fetchTripEvents(t.id);
              if (remoteEvents.length) {
                trip.calendarEvents = mergeCalendarEvents(trip.calendarEvents || [], remoteEvents);
              }
              const storedEvents = readStoredCalendarEvents(t.id);
              if (storedEvents) trip.calendarEvents = storedEvents;
            } catch {
              const storedEvents = readStoredCalendarEvents(t.id);
              if (storedEvents) trip.calendarEvents = storedEvents;
            }
          })
        );

        this.notify();
        this.refreshTourismDiscovery(this.activeTripId);
        this.refreshEventDiscovery(this.activeTripId);
        this.refreshTripIntelligence(this.activeTripId, { notify: false });
      }
    } catch (e) {
      console.warn("D1 trips load fallback:", e);
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
      tripMode: true,
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

    const flag = getCountryFlagEmoji(newDestination);
    trip.destination = newDestination;
    trip.flag = flag;
    if (trip.upcomingActivity) trip.upcomingActivity.title = newDestination;

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
