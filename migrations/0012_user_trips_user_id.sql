-- TRIP Database Migration 0012: Add user_id to user_trips for per-user scoping

ALTER TABLE user_trips ADD COLUMN user_id TEXT NOT NULL DEFAULT 'anonymous';
ALTER TABLE user_trips ADD COLUMN user_name TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_user_trips_user ON user_trips(user_id);
