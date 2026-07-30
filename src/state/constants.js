// ─── Storage keys ────────────────────────────────────────────────────────────
export const CALENDAR_EVENTS_STORAGE_PREFIX = "trip_calendar_events_";
export const TOURISM_DISCOVERY_STORAGE_PREFIX = "trip_tourism_discovery_";
export const TRIP_COMPANIONS_STORAGE_PREFIX = "trip_companions_";
export const USER_PROFILE_STORAGE_KEY = "trip_user_profile_v1";
export const ONBOARDING_STORAGE_KEY = "trip_onboarding_seen_v1";
export const THEME_STORAGE_KEY = "trip_theme_mode_v1";
export const LEGACY_USER_AVATAR_STORAGE_KEY = "trip_user_avatar";
export const LEGACY_USER_PREFERENCES_STORAGE_KEY = "trip_user_preferences";

// ─── Persona archetypes ───────────────────────────────────────────────────────
export const TRAVELER_PERSONA_ARCHETYPES = [
  ["🏛️ Architect", "Builds the trip from scratch."],
  ["🗺️ Route Master", "Finds the best roads, scenic routes and navigation."],
  ["☕ Coffee Hunter", "Discovers cafés and specialty coffee."],
  ["🍽️ Food Explorer", "Finds restaurants, taverns and local cuisine."],
  ["🍷 Wine Seeker", "Finds wine bars, vineyards, tastings and regional pours."],
  ["📸 Memory Maker", "Captures photos and videos."],
  ["🌍 Local Explorer", "Finds hidden gems away from the tourist trail."],
  ["🏛️ History Buff", "Adds historical places and cultural context."],
  ["🎨 Culture Seeker", "Museums, galleries, architecture and events."],
  ["🌄 Nature Lover", "Hiking, beaches, forests and viewpoints."],
  ["🌅 Sunrise Chaser", "Golden hour and scenic moments."],
  ["🌙 Night Owl", "Bars, nightlife, evening photography and late adventures."],
  ["🚗 Driver", "Handles transportation and navigation."],
  ["💰 Budget Keeper", "Tracks expenses and keeps the group on budget."],
  ["🛍️ Shopper", "Markets, boutiques and souvenirs."],
  ["📅 Organizer", "Keeps everyone synchronized with reminders, reservations and schedules."],
  ["🎟️ Event Scout", "Finds concerts, festivals and local happenings."],
  ["🤝 Social Connector", "Invites companions, coordinates the group and keeps everyone informed."],
];

export const DEFAULT_TRAVELER_PERSONAS = TRAVELER_PERSONA_ARCHETYPES.map(([label]) => label);

export const LEGACY_PERSONA_ALIASES = new Map([
  ["☕ Coffee Lover", "☕ Coffee Hunter"],
  ["🍕 Foodie", "🍽️ Food Explorer"],
  ["🎵 Concert Goer", "🎟️ Event Scout"],
  ["🎨 Art Enthusiast", "🎨 Culture Seeker"],
  ["🌅 Sunset Chaser", "🌅 Sunrise Chaser"],
  ["🛍️ Boutique Shopper", "🛍️ Shopper"],
  ["🏖️ Beach & Island", "🌄 Nature Lover"],
]);

// ─── Default user profile ─────────────────────────────────────────────────────
export const DEFAULT_USER_PROFILE = {
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
  personas: ["☕ Coffee Hunter", "🍽️ Food Explorer", "🎟️ Event Scout", "🎨 Culture Seeker"],
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

// ─── Admin demo moments (shown only to admin-role users) ─────────────────────
export const ADMIN_DEMO_MOMENTS = [
  {
    id: "admin_demo_paris_cafe",
    tripId: "paris",
    title: "Golden coffee stop",
    type: "photo",
    date: "2026-10-03",
    createdAt: "2026-10-03T08:30:00.000Z",
    mediaUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=82",
    media_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=82",
    placeTitle: "Saint-Germain cafe",
    placeCategory: "Coffee",
    geoLabel: "Saint-Germain, Paris",
    tags: ["Coffee Hunter", "Food Explorer"],
    adminDemo: true,
  },
  {
    id: "admin_demo_paris_evening",
    tripId: "paris",
    title: "Evening streets",
    type: "photo",
    date: "2026-10-04",
    createdAt: "2026-10-04T19:20:00.000Z",
    mediaUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=82",
    media_url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=82",
    placeTitle: "Paris evening walk",
    placeCategory: "Sight",
    geoLabel: "Paris, France",
    tags: ["Memory Maker", "Culture Seeker"],
    adminDemo: true,
  },
  {
    id: "admin_demo_paris_gallery",
    tripId: "paris",
    title: "Museum quiet hour",
    type: "photo",
    date: "2026-10-05",
    createdAt: "2026-10-05T14:10:00.000Z",
    mediaUrl: "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&w=900&q=82",
    media_url: "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&w=900&q=82",
    placeTitle: "Gallery afternoon",
    placeCategory: "Culture",
    geoLabel: "Paris, France",
    tags: ["History Buff", "Culture Seeker"],
    adminDemo: true,
  },
  {
    id: "admin_demo_crete_harbor",
    tripId: "crete",
    title: "Heraklion harbor light",
    type: "photo",
    date: "2026-07-26",
    createdAt: "2026-07-26T18:45:00.000Z",
    mediaUrl: "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=900&q=82",
    media_url: "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=900&q=82",
    placeTitle: "Heraklion harbor",
    placeCategory: "Sight",
    geoLabel: "Heraklion, Crete",
    tags: ["Memory Maker", "Sunrise Chaser"],
    adminDemo: true,
  },
  {
    id: "admin_demo_crete_food",
    tripId: "crete",
    title: "Cretan table",
    type: "photo",
    date: "2026-07-27",
    createdAt: "2026-07-27T20:15:00.000Z",
    mediaUrl: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=82",
    media_url: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=82",
    placeTitle: "Old town dinner",
    placeCategory: "Food",
    geoLabel: "Heraklion, Crete",
    tags: ["Food Explorer", "Wine"],
    adminDemo: true,
  },
];

// ─── Fallback images per tourism category ─────────────────────────────────────
export const TOURISM_IMAGE_BY_CATEGORY = {
  Food: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=700&q=80",
  Museum: "https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?auto=format&fit=crop&w=700&q=80",
  Sight: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80",
  Nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=700&q=80",
  Shopping: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=700&q=80",
  Place: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=80",
};
