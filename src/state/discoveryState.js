/**
 * discoveryState mixin — tourism POI discovery, events, trip intelligence,
 * weather, backend health, and geolocation.
 */
import { tripsData } from "../data/tripsData.js";
import { enrichmentService } from "../enrichment/enrichmentService.js";
import { fetchConcertsForTrip } from "../services/concertService.js";
import { fetchTripIntelligence } from "../services/tripDataGateway.js";
import { fetchOpenMeteoWeather } from "../services/weatherService.js";
import { getPersonaDiscoveryContext, rankItemsByPersonas } from "../utils/personaSignals.js";
import { getOpenTripMapStatus, normalizeTourismIdea, writeStoredTourismDiscovery } from "./helpers.js";

// Personas that benefit from a dedicated food/drink Overpass pass
const FOOD_PERSONAS = new Set([
  "☕ Coffee Hunter",
  "🍽️ Food Explorer",
  "🍷 Wine Seeker",
  "🌙 Night Owl",
  "🤝 Social Connector",
]);

// Overpass intent tokens for food-oriented personas
const FOOD_INTENT_MAP = {
  "☕ Coffee Hunter": "coffee",
  "🍽️ Food Explorer": "food",
  "🍷 Wine Seeker": "nightlife",
  "🌙 Night Owl": "nightlife",
  "🤝 Social Connector": "social",
};

export const discoveryStateMixin = {
  // ── Backend health ─────────────────────────────────────────────────────────

  async checkBackendHealth() {
    try {
      const apiBase =
        import.meta.env?.VITE_TRIP_API_BASE ||
        (typeof window !== "undefined" && window.location.origin.includes("8787")
          ? ""
          : "https://trip.thomasrynell.workers.dev");
      const res = await fetch(`${apiBase}/api/health`, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        this.backendHealth = {
          status: "connected",
          bindings: data.bindings || {},
          secrets: data.secrets || {},
          services: data.services || {},
          generatedAt: data.generatedAt || "",
        };
      } else {
        this.backendHealth = { status: "standalone", bindings: {}, secrets: {}, services: {}, generatedAt: "" };
      }
    } catch {
      this.backendHealth = { status: "standalone", bindings: {}, secrets: {}, services: {}, generatedAt: "" };
    }
    this.notify();
  },

  // ── Weather ────────────────────────────────────────────────────────────────

  async refreshWeather() {
    // 1. Fetch live weather for user's current location (for Header badge)
    let userLat = 48.8566;
    let userLng = 2.3522;
    if (Array.isArray(this.userLocation) && this.userLocation.length === 2) {
      [userLat, userLng] = this.userLocation;
    }
    const userLiveWeather = await fetchOpenMeteoWeather(userLat, userLng);
    if (userLiveWeather) {
      this.userLocationWeather = {
        ...userLiveWeather,
        cityName: this.locationResolved?.cityName || (this.locationResolved?.formattedAddress ? this.locationResolved.formattedAddress.split(",")[0] : ""),
      };
    }

    // 2. Fetch live weather for active trip destination (for in-page trip cards)
    const trip = this.activeTrip;
    if (trip && Array.isArray(trip.center)) {
      const [tripLat, tripLng] = trip.center;
      const tripLiveWeather = await fetchOpenMeteoWeather(tripLat, tripLng);
      if (tripLiveWeather) {
        trip.weather = { ...trip.weather, ...tripLiveWeather };
      }
    }

    this.notify();
  },

  // ── Tourism discovery ──────────────────────────────────────────────────────

  getTourismDiscoveryStatus(tripId = this.activeTripId) {
    return this.tourismDiscoveryStatus[tripId] || { status: "idle", error: "", updatedAt: "" };
  },

  async refreshTourismDiscovery(tripId = this.activeTripId, options = {}) {
    const trip = tripsData[tripId];
    if (!trip || !Array.isArray(trip.center)) return { status: "error", error: "invalid-trip-center" };

    const personas = Array.from(this.userPreferences || []);
    const personaContext = getPersonaDiscoveryContext(personas);
    const personaKey = personaContext.personas.join("|");
    const existing = [...(trip.tourismPois || []), ...(trip.hiddenGems || []), ...(trip.osmPlaces || [])];
    const currentStatus = this.tourismDiscoveryStatus[tripId];
    const isPersonaMatched = (currentStatus?.personaKey || "") === personaKey;
    const DISCOVERY_MAX_AGE_MS = 1000 * 60 * 60 * 48; // 48 hours
    const updatedAtTime = currentStatus?.updatedAt ? new Date(currentStatus.updatedAt).getTime() : 0;
    const isTooOld = !updatedAtTime || Date.now() - updatedAtTime > DISCOVERY_MAX_AGE_MS;
    if (currentStatus?.status === "loading" && !options.force && isPersonaMatched) return currentStatus;
    if (existing.length && !options.force && isPersonaMatched && !isTooOld)
      return currentStatus || { status: "ready", error: "", personaKey };

    this.tourismDiscoveryStatus[tripId] = {
      status: "loading",
      error: "",
      updatedAt: new Date().toISOString(),
      personaKey,
    };
    if (options.notify !== false) this.notify();

    try {
      const [topResult, hiddenResult, osmResult] = await Promise.all([
        enrichmentService.discoverTopPois({
          coordinates: trip.center,
          radiusMeters: options.radiusMeters || 4500,
          limit: options.topLimit || 14,
          personas,
          lang: trip.language || "en",
        }),
        enrichmentService.discoverHiddenGems({
          coordinates: trip.center,
          radiusMeters: options.hiddenRadiusMeters || 6500,
          limit: options.hiddenLimit || 10,
          personas,
          lang: trip.language || "en",
        }),
        enrichmentService.discoverNearby({
          coordinates: trip.center,
          radiusMeters: options.osmRadiusMeters || 2200,
          personas,
        }),
      ]);

      let tourismPois = rankItemsByPersonas(
        (topResult?.places || []).map((place) => normalizeTourismIdea(place, "poi")),
        personas
      );
      const hiddenGems = rankItemsByPersonas(
        (hiddenResult?.places || []).map((place) => normalizeTourismIdea(place, "hidden")),
        personas
      );
      const osmPlaces = rankItemsByPersonas(
        (osmResult?.places || []).map((place) => normalizeTourismIdea(place, "osm")),
        personas
      );

      // Fallback: If OpenTripMap key is absent or returned 0 POIs, populate Top POIs via Overpass culture/heritage sights
      if (!tourismPois.length) {
        try {
          const cultureResult = await enrichmentService.discoverNearby({
            coordinates: trip.center,
            radiusMeters: options.radiusMeters || 4500,
            intent: "culture",
            personas,
          });
          if (cultureResult?.places?.length) {
            tourismPois = rankItemsByPersonas(
              cultureResult.places.map((place) => normalizeTourismIdea(place, "osm")),
              personas
            );
          }
        } catch (e) {
          console.warn("Top POIs Overpass culture fallback:", e);
        }
      }

      // Determine dominant food intent for a dedicated Overpass pass
      const foodPersonas = personas.filter((p) => FOOD_PERSONAS.has(p));
      const dominantFoodIntent = foodPersonas
        .map((p) => FOOD_INTENT_MAP[p])
        .filter(Boolean)
        .reduce((acc, intent) => {
          acc[intent] = (acc[intent] || 0) + 1;
          return acc;
        }, {});
      const topFoodIntent = Object.entries(dominantFoodIntent).sort((a, b) => b[1] - a[1])[0]?.[0];

      // Fire dedicated food/coffee pass (Foursquare first if configured, Overpass fallback)
      let foodOsmPlaces = [];
      if (topFoodIntent) {
        try {
          const fsqResult = await enrichmentService.discoverFoursquarePlaces({
            coordinates: trip.center,
            radiusMeters: options.foodRadiusMeters || 1800,
            intent: topFoodIntent,
            personas,
          });
          if (fsqResult?.places?.length) {
            foodOsmPlaces = fsqResult.places.map((place) => normalizeTourismIdea(place, "foursquare"));
          } else {
            const foodResult = await enrichmentService.discoverNearby({
              coordinates: trip.center,
              radiusMeters: options.foodRadiusMeters || 1800,
              intent: topFoodIntent,
              personas,
            });
            foodOsmPlaces = (foodResult?.places || []).map((place) => ({
              ...normalizeTourismIdea(place, "osm"),
              sourceRole: "osm-food",
              foodSource: topFoodIntent,
            }));
          }
        } catch (e) {
          console.warn("Food discovery pass fallback:", e);
        }
      }

      // Merge: dedupe food OSM places against already-found OSM places by title
      const osmTitles = new Set(osmPlaces.map((p) => p.title?.toLowerCase()));
      const newFoodPlaces = foodOsmPlaces.filter((p) => !osmTitles.has(p.title?.toLowerCase()));
      const mergedOsmPlaces = rankItemsByPersonas([...newFoodPlaces, ...osmPlaces], personas);

      await this.enrichDiscoveryMedia(
        [...tourismPois, ...hiddenGems, ...mergedOsmPlaces].slice(0, 8),
        { destination: trip.destination }
      );
      const status = getOpenTripMapStatus([topResult, hiddenResult]);
      const updatedAt = new Date().toISOString();

      trip.tourismPois = tourismPois;
      trip.hiddenGems = hiddenGems;
      trip.osmPlaces = mergedOsmPlaces;
      this.tourismDiscoveryStatus[tripId] = {
        status: tourismPois.length || hiddenGems.length || osmPlaces.length ? "ready" : status,
        error:
          status === "not-configured"
            ? "missing-opentripmap-api-key"
            : topResult?.error || hiddenResult?.error || "",
        updatedAt,
        personaKey,
      };

      if (tourismPois.length || hiddenGems.length || osmPlaces.length) {
        writeStoredTourismDiscovery(tripId, { tourismPois, hiddenGems, osmPlaces, updatedAt, personaKey });
      }
    } catch (error) {
      this.tourismDiscoveryStatus[tripId] = {
        status: "error",
        error: error?.message || "opentripmap-discovery-failed",
        updatedAt: new Date().toISOString(),
        personaKey,
      };
    }

    this.notify();
    return this.tourismDiscoveryStatus[tripId];
  },

  async enrichDiscoveryMedia(ideas = [], options = {}) {
    const destination = options.destination || this.activeTrip?.destination || "";
    await Promise.allSettled(
      ideas.map(async (idea) => {
        if (!idea || !idea.id) return;
        const media = await enrichmentService.refreshMedia({
          id: idea.id,
          title: idea.title,
          canonicalName: idea.title,
          coordinates: idea.coordinates,
          wikidataId: idea.wikidataId || "",
          categories: idea.categories || [idea.category].filter(Boolean),
          sourceUrl: idea.sourceUrl || "",
          // Thread destination so media scoring can filter generic regional images
          destinationContext: destination,
        });
        const hero = media?.hero;
        if (hero?.imageUrl && !hero.illustrativeOnly) {
          idea.image = hero.imageUrl;
          idea.imageProvider = hero.provider || "";
          idea.imageAttribution = hero.attributionText || hero.creatorName || "";
          idea.media = media;
        }
      })
    );
  },


  // ── Event discovery ────────────────────────────────────────────────────────

  async refreshEventDiscovery(tripId = this.activeTripId, options = {}) {
    const trip = tripsData[tripId];
    if (!trip || !Array.isArray(trip.center)) return { status: "error", error: "invalid-trip-center" };
    if (this.eventDiscoveryStatus[tripId]?.status === "loading" && !options.force)
      return this.eventDiscoveryStatus[tripId];
    if (
      (trip.events || []).some((event) =>
        ["ticketmaster", "bandsintown"].includes(event.sourceRole || event.provider)
      ) &&
      !options.force
    ) {
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
  },

  // ── Trip intelligence ──────────────────────────────────────────────────────

  getTripIntelligenceStatus(tripId = this.activeTripId) {
    return this.tripIntelligenceStatus[tripId] || { status: "idle", error: "", updatedAt: "" };
  },

  async refreshTripIntelligence(tripId = this.activeTripId, options = {}) {
    const trip = tripsData[tripId];
    if (!trip || !Array.isArray(trip.center)) return { status: "error", error: "invalid-trip-center" };
    if (this.tripIntelligenceStatus[tripId]?.status === "loading" && !options.force)
      return this.tripIntelligenceStatus[tripId];
    if (trip.tripIntelligence?.updatedAt && !options.force)
      return this.tripIntelligenceStatus[tripId] || { status: "ready", error: "" };

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
  },

  // ── Geolocation ────────────────────────────────────────────────────────────

  async requestCurrentLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        this.userLocation = coords;

        try {
          const res = await enrichmentService.resolveLocation({ coordinates: coords });
          if (res) this.locationResolved = res;
        } catch (e) {
          console.warn("Location resolve warning:", e);
        }

        await this.refreshWeather();

        try {
          const scan = await enrichmentService.discoverNearby({
            coordinates: coords,
            radiusMeters: 2000,
            personas: Array.from(this.userPreferences || []),
          });
          if (scan?.places?.length) {
            this.liveNearbyPlaces = scan.places;
            this.liveNearbyPlacesTripId = this.activeTripId;
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
  },

  async scanNearbyForArea(coords, radius = 2000) {
    try {
      const scan = await enrichmentService.discoverNearby({
        coordinates: coords,
        radiusMeters: radius,
        personas: Array.from(this.userPreferences || []),
      });
      if (scan?.places?.length) return scan.places;
    } catch (e) {
      console.warn("Scan nearby area failed:", e);
    }
    return [];
  },
};
