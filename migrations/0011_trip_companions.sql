-- TRIP Database Migration 0011: Trip travel companions

CREATE TABLE IF NOT EXISTS trip_companions (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'invited',
  invite_method TEXT NOT NULL DEFAULT 'email',
  personal_message TEXT NOT NULL DEFAULT '',
  trip_title TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  dates TEXT NOT NULL DEFAULT '',
  travelers_count INTEGER NOT NULL DEFAULT 1,
  cover_image TEXT NOT NULL DEFAULT '',
  invited_by TEXT NOT NULL DEFAULT 'default_user',
  invite_url TEXT NOT NULL DEFAULT '',
  invite_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_companions_unique ON trip_companions(trip_id, email);
CREATE INDEX IF NOT EXISTS idx_trip_companions_trip ON trip_companions(trip_id, created_at);
