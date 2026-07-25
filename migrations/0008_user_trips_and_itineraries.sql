-- TRIP Database Migration 0008: User Trips, Itineraries, Saved Places & Moments

CREATE TABLE IF NOT EXISTS user_trips (
  id TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  flag TEXT NOT NULL DEFAULT '🗺️',
  dates TEXT NOT NULL DEFAULT '',
  days_count INTEGER NOT NULL DEFAULT 7,
  start_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Upcoming',
  status_text TEXT NOT NULL DEFAULT '',
  trip_mode INTEGER NOT NULL DEFAULT 1,
  latitude REAL NOT NULL DEFAULT 0.0,
  longitude REAL NOT NULL DEFAULT 0.0,
  zoom INTEGER NOT NULL DEFAULT 13,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);

CREATE TABLE IF NOT EXISTS trip_itinerary_events (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'sight',
  icon TEXT NOT NULL DEFAULT '📍',
  day_index INTEGER NOT NULL DEFAULT 0,
  day_name TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL DEFAULT '10:00',
  end_time TEXT NOT NULL DEFAULT '12:00',
  location TEXT NOT NULL DEFAULT '',
  color_scheme TEXT NOT NULL DEFAULT 'peach',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_itinerary_trip ON trip_itinerary_events(trip_id, day_index);

CREATE TABLE IF NOT EXISTS user_saved_places (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  place_id TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_saved_places_unique ON user_saved_places(user_id, place_id);

CREATE TABLE IF NOT EXISTS user_moments (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL DEFAULT 'paris',
  type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_moments_trip ON user_moments(trip_id);
