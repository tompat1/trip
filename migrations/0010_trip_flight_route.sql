-- TRIP Migration 0010: Persist flight route references for trip creation.

ALTER TABLE user_trips ADD COLUMN origin_iata TEXT NOT NULL DEFAULT '';
ALTER TABLE user_trips ADD COLUMN destination_iata TEXT NOT NULL DEFAULT '';
ALTER TABLE user_trips ADD COLUMN origin_label TEXT NOT NULL DEFAULT '';
ALTER TABLE user_trips ADD COLUMN destination_label TEXT NOT NULL DEFAULT '';
ALTER TABLE user_trips ADD COLUMN flight_type TEXT NOT NULL DEFAULT 'regular';

CREATE INDEX IF NOT EXISTS idx_user_trips_flight_route ON user_trips(origin_iata, destination_iata);
