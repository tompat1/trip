import { composeEditorialProfile, createPlaceProfileEnvelope, createVerifiedFactBundle } from "./editorialComposer.js";
import { enrichPlaceMedia } from "./mediaAggregator.js";
import { normalizeOsmElement, normalizeWorkerNearbyPlace } from "./normalizers.js";
import { resolveLocationContext } from "./placeResolver.js";
import { createPlaceProfileContract, createProviderStatus, PROVIDER_STATUS } from "./schemas.js";
import { calculateFlightDistance, getAirportByIata, searchAirports } from "../services/airportService.js";
import { fetchRouteDirections } from "../services/routeService.js";
import { fetchConcertsForTrip, searchConcerts } from "../services/concertService.js";
import { fetchOpenTripMapPlaceDetails, fetchOpenTripMapPlaces, OPENTRIPMAP_HIDDEN_GEMS_KINDS, OPENTRIPMAP_TOURISM_KINDS } from "../services/openTripMapService.js";
import { getPersonaDiscoveryContext, rankItemsByPersonas } from "../utils/personaSignals.js";

export { calculateFlightDistance, getAirportByIata, searchAirports, fetchRouteDirections, fetchConcertsForTrip, searchConcerts, fetchOpenTripMapPlaceDetails, fetchOpenTripMapPlaces };

const DEFAULT_WORKER_API_BASE = "https://trip.thomasrynell.workers.dev";
export const ADMIN_SESSION_STORAGE_KEY = "trip-admin-session-token-v1";

export function createEnrichmentService(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || (() => new Date());
  const apiBase = options.apiBase ?? getDefaultApiBase();

  return {
    async getSession() {
      const url = buildApiUrl(apiBase, "/api/session");
      const response = await fetchImpl(url.href, { headers: createApiHeaders() });
      if (!response.ok) throw new Error(`worker-session-http-${response.status}`);
      return response.json();
    },

    async loginAdmin(input = {}) {
      const url = buildApiUrl(apiBase, "/api/admin/session");
      const response = await fetchImpl(url.href, {
        method: "POST",
        headers: createApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          email: input.email,
          password: input.password,
        }),
      });
      if (!response.ok) throw new Error(`worker-admin-login-http-${response.status}`);
      const data = await response.json();
      storeAdminSessionToken(data.session?.token || data.token || "");
      return data;
    },

    async loginAccount(input = {}) {
      const url = buildApiUrl(apiBase, "/api/auth/session");
      const response = await fetchImpl(url.href, {
        method: "POST",
        headers: createApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          inviteTripId: input.inviteTripId || "",
        }),
      });
      if (!response.ok) throw new Error(`worker-account-login-http-${response.status}`);
      const data = await response.json();
      storeAdminSessionToken(data.session?.token || data.token || "");
      return data;
    },

    async registerAccount(input = {}) {
      const url = buildApiUrl(apiBase, "/api/auth/register");
      const response = await fetchImpl(url.href, {
        method: "POST",
        headers: createApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          password: input.password,
          inviteTripId: input.inviteTripId || "",
        }),
      });
      if (!response.ok) {
        const error = new Error(`worker-account-register-http-${response.status}`);
        error.status = response.status;
        throw error;
      }
      const data = await response.json();
      storeAdminSessionToken(data.session?.token || data.token || "");
      return data;
    },

    async logoutAdmin() {
      const url = buildApiUrl(apiBase, "/api/auth/session");
      try {
        const response = await fetchImpl(url.href, {
          method: "DELETE",
          headers: createApiHeaders(),
        });
        if (!response.ok) throw new Error(`worker-admin-logout-http-${response.status}`);
        return response.json();
      } finally {
        clearStoredAdminSessionToken();
      }
    },

    async resolveLocation(input = {}) {
      const workerLocation = await resolveWorkerLocation(input, { apiBase, fetchImpl, now }).catch(() => null);
      if (workerLocation) return workerLocation;
      return resolveLocationContext({ ...input, fetchImpl });
    },

    normalizeNearbyElement(element, origin, helpers = {}) {
      return normalizeOsmElement(element, origin, helpers);
    },

    async discoverNearby(input = {}) {
      const coordinates = normalizeCoordinates(input.coordinates);
      const personaContext = getPersonaDiscoveryContext(input.personas || []);
      if (!coordinates) {
        return {
          status: "error",
          updatedAt: now().toISOString(),
          error: "Location is needed before scanning nearby places.",
          places: [],
          providerStatus: [createProviderStatus({ provider: "trip-worker", status: PROVIDER_STATUS.error, error: "invalid-coordinates" })],
        };
      }

      try {
        const url = buildApiUrl(apiBase, "/api/places/nearby");
        url.searchParams.set("lat", String(coordinates[0]));
        url.searchParams.set("lng", String(coordinates[1]));
        url.searchParams.set("radius", String(input.radiusMeters || 1500));
        url.searchParams.set("intent", input.intent || personaContext.osmIntent || "traveler");
        if (personaContext.personas.length) url.searchParams.set("personas", personaContext.personas.join("|"));
        if (input.force) url.searchParams.set("refresh", "1");

        const response = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`worker-nearby-http-${response.status}`);
        const payload = await response.json();
        const places = rankItemsByPersonas((payload.places || [])
          .map((place) => normalizeWorkerNearbyPlace(place, coordinates))
          .filter(Boolean), personaContext.personas);

        return {
          status: "ready",
          updatedAt: payload.generatedAt || now().toISOString(),
          refreshAfter: payload.refreshAfter || "",
          error: places.length ? "" : "No strong nearby traveler places found yet. Try a wider area later.",
          places,
          providerStatus: payload.providerStatus || [],
          coverage: payload.coverage || "partial",
          personaContext,
          source: "trip-worker",
        };
      } catch (error) {
        if (typeof input.fallback === "function") return input.fallback(error);
        return {
          status: "error",
          updatedAt: now().toISOString(),
          error: "Nearby scan could not reach the Trip Worker right now.",
          places: [],
          providerStatus: [createProviderStatus({ provider: "trip-worker", status: PROVIDER_STATUS.error, error: error?.message || "worker-nearby-failed" })],
        };
      }
    },

    async discoverTopPois(input = {}) {
      const personaContext = getPersonaDiscoveryContext(input.personas || []);
      const kinds = mergeOpenTripMapKinds(input.kinds || OPENTRIPMAP_TOURISM_KINDS, personaContext.openTripMapKinds);
      return discoverOpenTripMapViaWorker({
        ...input,
        kinds,
        rate: input.rate || "2",
        limit: input.limit || 24,
      }, { apiBase, fetchImpl }).catch(() => fetchOpenTripMapPlaces({
        ...input,
        kinds,
        rate: input.rate || "2",
        limit: input.limit || 24,
        fetchImpl,
      })).then((result) => ({
        ...result,
        places: rankItemsByPersonas(result?.places || [], personaContext.personas),
        personaContext,
      }));
    },

    async discoverHiddenGems(input = {}) {
      const personaContext = getPersonaDiscoveryContext(input.personas || []);
      const kinds = mergeOpenTripMapKinds(input.kinds || OPENTRIPMAP_HIDDEN_GEMS_KINDS, personaContext.openTripMapKinds);
      return discoverOpenTripMapViaWorker({
        ...input,
        kinds,
        rate: input.rate || "1",
        limit: input.limit || 18,
      }, { apiBase, fetchImpl }).catch(() => fetchOpenTripMapPlaces({
        ...input,
        kinds,
        rate: input.rate || "1",
        limit: input.limit || 18,
        fetchImpl,
      })).then((result) => ({
        ...result,
        places: rankItemsByPersonas(result?.places || [], personaContext.personas),
        personaContext,
      }));
    },

    async discoverFoursquarePlaces(input = {}) {
      const personaContext = getPersonaDiscoveryContext(input.personas || []);
      const coordinates = normalizeCoordinates(input.coordinates || [input.lat, input.lng]);
      if (!coordinates) throw new Error("invalid-coordinates");
      const url = buildApiUrl(apiBase, "/api/foursquare/places");
      url.searchParams.set("lat", String(coordinates[0]));
      url.searchParams.set("lng", String(coordinates[1]));
      url.searchParams.set("radius", String(input.radiusMeters || 1800));
      url.searchParams.set("limit", String(input.limit || 20));
      url.searchParams.set("intent", input.intent || personaContext.osmIntent || "food");
      const res = await fetchImpl(url.href, { headers: { Accept: "application/json" } }).catch(() => null);
      if (!res || !res.ok) return { status: "error", places: [] };
      const data = await res.json().catch(() => ({}));
      return {
        status: data.status || "ok",
        places: rankItemsByPersonas(data.places || [], personaContext.personas),
        providerStatus: data.providerStatus || [],
      };
    },

    async fetchOpenTripMapDetails(xid, options = {}) {
      return fetchOpenTripMapDetailsViaWorker(xid, { ...options, apiBase, fetchImpl })
        .catch(() => fetchOpenTripMapPlaceDetails(xid, { ...options, fetchImpl }));
    },

    createFacts(place, context = {}) {
      return createVerifiedFactBundle(place, context);
    },

    composeEditorial(place, options = {}) {
      const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
      return composeEditorialProfile(place, { ...options, facts });
    },

    async generateEditorial(place, options = {}) {
      const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
      const localEditorial = composeEditorialProfile(place, { ...options, facts });
      return generateWorkerEditorial(place, {
        ...options,
        facts,
        apiBase,
        fetchImpl,
        now,
        fallbackEditorial: localEditorial,
      }).catch(() => localEditorial);
    },

    async refreshMedia(place, options = {}) {
      const workerMedia = await refreshWorkerMedia(place, { ...options, apiBase, fetchImpl, now }).catch((error) => ({
        hero: null,
        gallery: [],
        roles: {},
        attributions: [],
        coverage: { images: "fallback" },
        providerStatus: [createProviderStatus({ provider: "trip-worker-media", status: PROVIDER_STATUS.error, error: error?.message || "worker-media-failed" })],
        generatedAt: now().toISOString(),
        refreshAfter: new Date(now().getTime() + 1000 * 60 * 30).toISOString(),
      }));
      if (workerMedia.hero?.imageUrl || options.workerOnly) return workerMedia;

      const fallbackMedia = await enrichPlaceMedia(place, { ...options, fetchImpl }).catch((error) => createMediaFailure(error, now));
      return {
        ...fallbackMedia,
        providerStatus: [...(workerMedia.providerStatus || []), ...(fallbackMedia.providerStatus || [])],
      };
    },

    async lockHeroImage(place, image, options = {}) {
      return lockWorkerHeroImage(place, image, { ...options, apiBase, fetchImpl, now });
    },

    async enrichPlace(place, options = {}) {
      const workerProfile = await fetchWorkerPlaceProfile(place, { apiBase, fetchImpl }).catch(() => null);
      if (workerProfile && workerProfile.coverage !== "coordinates-only" && workerProfile.facts?.length) {
        return createPlaceProfileContract({
          ...workerProfile,
          providerStatus: workerProfile.providerStatus || [],
        });
      }

      const facts = options.facts || createVerifiedFactBundle(place, options.locationContext || {});
      const media = options.media || await enrichPlaceMedia(place, { fetchImpl }).catch((error) => createMediaFailure(error, now));
      const envelope = createPlaceProfileEnvelope(place, {
        ...options,
        facts,
        media,
        attributions: options.attributions || media.attributions || [],
      });

      return createPlaceProfileContract({
        ...envelope,
        media,
        providerStatus: media.providerStatus || [],
      });
    },

    createProfileContract(input = {}) {
      return createPlaceProfileContract(input);
    },

    // --- D1 User Trips & Itinerary Persistence Methods ---

    async fetchTrips() {
      const url = buildApiUrl(apiBase, "/api/trips");
      const res = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`worker-trips-http-${res.status}`);
      const data = await res.json();
      return data.trips || [];
    },

    async createTrip(tripData) {
      const url = buildApiUrl(apiBase, "/api/trips");
      const res = await fetchImpl(url.href, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(tripData),
      });
      if (!res.ok) throw new Error(`worker-create-trip-http-${res.status}`);
      return res.json();
    },

    async updateTrip(tripId, tripData) {
      const url = buildApiUrl(apiBase, `/api/trips/${encodeURIComponent(tripId)}`);
      const res = await fetchImpl(url.href, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(tripData),
      });
      if (!res.ok) throw new Error(`worker-update-trip-http-${res.status}`);
      return res.json();
    },

    async fetchTripEvents(tripId) {
      const url = buildApiUrl(apiBase, `/api/trips/${encodeURIComponent(tripId)}/events`);
      const res = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`worker-events-http-${res.status}`);
      const data = await res.json();
      return (data.events || []).map(normalizeTripEvent);
    },

    async addTripEvent(tripId, eventData) {
      const url = buildApiUrl(apiBase, `/api/trips/${encodeURIComponent(tripId)}/events`);
      const res = await fetchImpl(url.href, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error(`worker-add-event-http-${res.status}`);
      const data = await res.json();
      return { ...data, event: normalizeTripEvent(data.event) };
    },

    async updateTripEvent(tripId, eventId, eventData) {
      const url = buildApiUrl(apiBase, `/api/trips/${encodeURIComponent(tripId)}/events/${encodeURIComponent(eventId)}`);
      const res = await fetchImpl(url.href, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error(`worker-update-event-http-${res.status}`);
      const data = await res.json();
      return { ...data, event: normalizeTripEvent(data.event) };
    },

    async deleteTripEvent(tripId, eventId) {
      const url = buildApiUrl(apiBase, `/api/trips/${encodeURIComponent(tripId)}/events/${encodeURIComponent(eventId)}`);
      const res = await fetchImpl(url.href, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`worker-delete-event-http-${res.status}`);
      return res.json();
    },

    async fetchTripCompanions(tripId) {
      const url = buildApiUrl(apiBase, `/api/trips/${encodeURIComponent(tripId)}/companions`);
      const res = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`worker-companions-http-${res.status}`);
      const data = await res.json();
      return (data.companions || []).map(normalizeTripCompanion);
    },

    async inviteTripCompanion(tripId, companionData) {
      const url = buildApiUrl(apiBase, `/api/trips/${encodeURIComponent(tripId)}/companions`);
      const res = await fetchImpl(url.href, {
        method: "POST",
        headers: createApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(companionData),
      });
      if (!res.ok) throw new Error(`worker-invite-companion-http-${res.status}`);
      const data = await res.json();
      return { ...data, companion: normalizeTripCompanion(data.companion) };
    },

    async deleteTripCompanion(tripId, companionId) {
      const url = buildApiUrl(apiBase, `/api/trips/${encodeURIComponent(tripId)}/companions/${encodeURIComponent(companionId)}`);
      const res = await fetchImpl(url.href, {
        method: "DELETE",
        headers: createApiHeaders(),
      });
      if (!res.ok) throw new Error(`worker-delete-companion-http-${res.status}`);
      return res.json();
    },

    async fetchSavedPlaces() {
      const url = buildApiUrl(apiBase, "/api/user/saved-places");
      const res = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`worker-saved-places-http-${res.status}`);
      const data = await res.json();
      return data.savedPlaceIds || [];
    },

    async toggleSavedPlace(placeId) {
      const url = buildApiUrl(apiBase, "/api/user/saved-places/toggle");
      const res = await fetchImpl(url.href, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      if (!res.ok) throw new Error(`worker-toggle-saved-http-${res.status}`);
      return res.json();
    },

    async fetchMoments() {
      const url = buildApiUrl(apiBase, "/api/user/moments");
      const res = await fetchImpl(url.href, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`worker-moments-http-${res.status}`);
      const data = await res.json();
      return data.moments || [];
    },

    async createMoment(momentData) {
      const url = buildApiUrl(apiBase, "/api/user/moments");
      const res = await fetchImpl(url.href, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(momentData),
      });
      if (!res.ok) throw new Error(`worker-create-moment-http-${res.status}`);
      return res.json();
    },
  };
}

export const enrichmentService = createEnrichmentService();

export function getTripApiBase() {
  return getDefaultApiBase();
}

export function buildTripApiUrl(path) {
  return buildApiUrl(getDefaultApiBase(), path);
}

function getDefaultApiBase() {
  const envBase = import.meta.env?.VITE_TRIP_API_BASE;
  if (envBase) return envBase;
  if (typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname)) return DEFAULT_WORKER_API_BASE;
  return "";
}

function buildApiUrl(base, path) {
  if (!base) return new URL(path, typeof window !== "undefined" ? window.location.origin : "https://trip.rynell.org");
  return new URL(path, base.endsWith("/") ? base : `${base}/`);
}

async function discoverOpenTripMapViaWorker(input = {}, options = {}) {
  const coordinates = normalizeCoordinates(input.coordinates || [input.lat, input.lng]);
  if (!coordinates) throw new Error("invalid-coordinates");
  const url = buildApiUrl(options.apiBase, "/api/opentripmap/places");
  url.searchParams.set("lat", String(coordinates[0]));
  url.searchParams.set("lng", String(coordinates[1]));
  url.searchParams.set("radius", String(input.radiusMeters || input.radius || 2000));
  url.searchParams.set("limit", String(input.limit || 24));
  url.searchParams.set("kinds", input.kinds || OPENTRIPMAP_TOURISM_KINDS);
  if (input.rate) url.searchParams.set("rate", String(input.rate));
  if (input.lang) url.searchParams.set("lang", input.lang);
  if (Array.isArray(input.personas) && input.personas.length) url.searchParams.set("personas", input.personas.join("|"));
  const res = await options.fetchImpl(url.href, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`worker-opentripmap-http-${res.status}`);
  const data = await res.json();
  return {
    status: "ok",
    places: data.places || [],
    providerStatus: data.providerStatus || [],
    error: "",
  };
}

function mergeOpenTripMapKinds(baseKinds = "", personaKinds = "") {
  return [...new Set(
    [baseKinds, personaKinds]
      .flatMap((value) => String(value || "").split(","))
      .map((value) => value.trim())
      .filter(Boolean)
  )].join(",");
}

async function fetchOpenTripMapDetailsViaWorker(xid, options = {}) {
  if (!xid) return null;
  const url = buildApiUrl(options.apiBase, `/api/opentripmap/places/${encodeURIComponent(xid)}`);
  if (options.lang) url.searchParams.set("lang", options.lang);
  const res = await options.fetchImpl(url.href, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`worker-opentripmap-details-http-${res.status}`);
  const data = await res.json();
  return data.place || null;
}

function normalizeCoordinates(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lat, lng] = value.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

async function resolveWorkerLocation(input = {}, options = {}) {
  const coordinates = normalizeCoordinates(input.coordinates);
  if (!coordinates) return null;
  const url = buildApiUrl(options.apiBase, "/api/location/resolve");
  const response = await options.fetchImpl(url.href, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates,
      accuracyMeters: input.accuracyMeters,
      title: input.title,
      category: input.category,
    }),
  });
  if (!response.ok) throw new Error(`worker-location-http-${response.status}`);
  const payload = await response.json();
  return normalizeWorkerLocationPayload(payload, coordinates);
}

function normalizeWorkerLocationPayload(payload = {}, coordinates) {
  const location = payload.location || {};
  const profilePlace = payload.placeProfile?.place || {};
  const city = cleanAreaName(location.city || profilePlace.municipality || profilePlace.canonicalName || "");
  const region = cleanAreaName(location.region || profilePlace.region || "");
  const countryCode = String(location.countryCode || profilePlace.countryCode || "").toUpperCase();
  return {
    latitude: coordinates[0],
    longitude: coordinates[1],
    countryCode,
    countryName: getFactValue(payload.placeProfile?.facts, "country") || "",
    region,
    county: "",
    municipality: city,
    locality: city,
    neighbourhood: "",
    postcode: "",
    timezone: "",
    primaryLanguage: countryCode === "GR" ? "el" : "en",
    localLanguages: countryCode === "GR" ? ["el", "en"] : ["en"],
    confidence: Number(location.confidence || profilePlace.confidence || 0.65),
    matchLevel: location.matchLevel || "",
    sourceIds: (payload.placeProfile?.sources || []).map((source) => source.id).filter(Boolean),
    providerStatus: payload.providerStatus || [],
    placeProfile: payload.placeProfile || null,
    area: {
      city,
      town: "",
      village: "",
      suburb: "",
      county: "",
      region,
      island: inferIsland(region),
      country: getFactValue(payload.placeProfile?.facts, "country") || "",
      countryCode,
      locality: city,
      neighbourhood: "",
      postcode: "",
      displayName: getFactValue(payload.placeProfile?.facts, "displayName") || [city, region].filter(Boolean).join(", "),
      osmId: profilePlace.osmId || "",
      osmType: cleanAreaType(profilePlace.categories?.[0] || profilePlace.osmType || "OpenStreetMap area"),
      placeType: profilePlace.categories?.[0] || "",
      boundingBox: [],
      resolvedPlaceId: location.placeId || profilePlace.id || "",
      canonicalName: profilePlace.canonicalName || city,
      localName: profilePlace.localName || "",
      aliases: profilePlace.aliases || [],
      wikidataId: profilePlace.wikidataId || "",
      wikipediaUrl: profilePlace.wikipediaUrl || "",
      matchLevel: location.matchLevel || "",
      confidence: Number(location.confidence || profilePlace.confidence || 0.65),
    },
    place: {
      ...profilePlace,
      id: profilePlace.id || location.placeId || "current-location",
      canonicalName: profilePlace.canonicalName || city || "Current location",
      coordinates,
    },
  };
}

function getFactValue(facts = [], key) {
  return (facts || []).find((fact) => fact.key === key)?.value || "";
}

function cleanAreaName(value = "") {
  return String(value || "")
    .replace(/^municipal unit of\s+/i, "")
    .replace(/^municipality of\s+/i, "")
    .replace(/\bmunicipal unit\b/gi, "city")
    .replace(/\bmunicipality\b/gi, "city")
    .trim();
}

function cleanAreaType(value = "") {
  const normalized = String(value || "");
  if (/municipal/i.test(normalized)) return "City";
  return normalized || "OpenStreetMap area";
}

function inferIsland(region = "") {
  return /crete/i.test(String(region)) ? "Crete" : "";
}

function normalizeTripEvent(event = {}) {
  if (!event) return event;
  return {
    ...event,
    type: event.type || event.eventType || event.event_type || "sight",
    dayIndex: Number(event.dayIndex ?? event.day_index ?? 0),
    dayName: event.dayName ?? event.day_name ?? "",
    startTime: event.startTime ?? event.start_time ?? "10:00",
    endTime: event.endTime ?? event.end_time ?? "12:00",
    colorScheme: event.colorScheme ?? event.color_scheme ?? "peach",
  };
}

function normalizeTripCompanion(companion = {}) {
  return {
    ...companion,
    tripId: companion.tripId || companion.trip_id || "",
    name: companion.name || "",
    email: companion.email || "",
    role: companion.role || "viewer",
    status: companion.status || "invited",
    inviteMethod: companion.inviteMethod || companion.invite_method || "email",
    personalMessage: companion.personalMessage || companion.personal_message || "",
    tripTitle: companion.tripTitle || companion.trip_title || "",
    destination: companion.destination || "",
    dates: companion.dates || "",
    travelersCount: Number(companion.travelersCount || companion.travelers_count || 1),
    coverImage: companion.coverImage || companion.cover_image || "",
    inviteUrl: companion.inviteUrl || companion.invite_url || "",
    inviteText: companion.inviteText || companion.invite_text || "",
    createdAt: companion.createdAt || companion.created_at || "",
    updatedAt: companion.updatedAt || companion.updated_at || "",
  };
}

async function refreshWorkerMedia(place = {}, options = {}) {
  const placeId = place.id || place.identity?.id || place.canonicalName || place.title || "place";
  const url = buildApiUrl(options.apiBase, `/api/places/${encodeURIComponent(placeId)}/media/refresh`);
  if (options.force) url.searchParams.set("refresh", "1");
  const response = await options.fetchImpl(url.href, {
    method: "POST",
    headers: createApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ place, force: Boolean(options.force) }),
  });
  if (!response.ok) throw new Error(`worker-media-http-${response.status}`);
  const payload = await response.json();
  return {
    ...(payload.media || {}),
    providerStatus: payload.providerStatus || payload.media?.providerStatus || [],
    generatedAt: payload.media?.generatedAt || payload.generatedAt || options.now().toISOString(),
    refreshAfter: payload.media?.refreshAfter || payload.refreshAfter || new Date(options.now().getTime() + 1000 * 60 * 30).toISOString(),
  };
}

async function lockWorkerHeroImage(place = {}, image = {}, options = {}) {
  const placeId = place.id || place.identity?.id || place.canonicalName || place.title || "";
  const imageId = image.id || "";
  if (!placeId || !imageId) throw new Error("worker-hero-lock-missing-id");
  const url = buildApiUrl(options.apiBase, `/api/places/${encodeURIComponent(placeId)}/hero/lock`);
  const response = await options.fetchImpl(url.href, {
    method: "POST",
    headers: createApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      imageId,
      notes: options.notes || "Selected from refreshed image choices.",
    }),
  });
  if (!response.ok) throw new Error(`worker-hero-lock-http-${response.status}`);
  const payload = await response.json();
  return {
    image: payload.image || null,
    providerStatus: payload.providerStatus || [],
    generatedAt: payload.generatedAt || options.now().toISOString(),
  };
}

function createApiHeaders(extra = {}) {
  const headers = { Accept: "application/json", ...extra };
  const token = getStoredAdminSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getStoredAdminSessionToken() {
  if (typeof window === "undefined" || !window.localStorage) return "";
  try {
    return window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeAdminSessionToken(token = "") {
  if (typeof window === "undefined" || !window.localStorage || !token) return;
  try {
    window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
  } catch {}
}

function clearStoredAdminSessionToken() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {}
}

async function generateWorkerEditorial(place = {}, options = {}) {
  const placeId = place.id || place.identity?.id || place.canonicalName || place.title || "place";
  const url = buildApiUrl(options.apiBase, `/api/places/${encodeURIComponent(placeId)}/editorial/generate`);
  const response = await options.fetchImpl(url.href, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      place,
      facts: options.facts || [],
      media: options.media || {},
      travellerProfile: options.travellerProfile || {},
      routeContext: options.routeContext || {},
    }),
  });
  if (!response.ok) throw new Error(`worker-editorial-http-${response.status}`);
  const payload = await response.json();
  return payload.editorial || options.fallbackEditorial;
}

async function fetchWorkerPlaceProfile(place = {}, options = {}) {
  const placeId = place.id || place.identity?.id || place.canonicalName || place.title || "";
  if (!placeId) return null;
  const url = buildApiUrl(options.apiBase, "/api/places/enrich");
  url.searchParams.set("id", placeId);
  const response = await options.fetchImpl(url.href, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`worker-enrich-http-${response.status}`);
  const payload = await response.json();
  return payload.placeProfile ? {
    ...payload.placeProfile,
    providerStatus: payload.providerStatus || payload.placeProfile.providerStatus || [],
    generatedAt: payload.placeProfile.generatedAt || payload.generatedAt,
    refreshAfter: payload.placeProfile.refreshAfter || payload.refreshAfter,
  } : null;
}

function createMediaFailure(error, now) {
  return {
    hero: null,
    gallery: [],
    roles: {},
    attributions: [],
    coverage: { images: "fallback" },
    providerStatus: [
      createProviderStatus({
        provider: "media",
        status: PROVIDER_STATUS.error,
        error: error?.name === "AbortError" ? "timeout" : "media-refresh-failed",
        checkedAt: now().toISOString(),
      }),
    ],
    generatedAt: now().toISOString(),
    refreshAfter: new Date(now().getTime() + 1000 * 60 * 30).toISOString(),
  };
}
