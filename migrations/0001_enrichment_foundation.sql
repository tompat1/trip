-- Trip Planner Deluxe enrichment foundation.
-- Apply with Wrangler after TRIP_DB is created and bound.

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  local_name TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  municipality TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  osm_type TEXT NOT NULL DEFAULT '',
  osm_id TEXT NOT NULL DEFAULT '',
  wikidata_id TEXT NOT NULL DEFAULT '',
  wikipedia_url TEXT NOT NULL DEFAULT '',
  official_website TEXT NOT NULL DEFAULT '',
  categories TEXT NOT NULL DEFAULT '[]',
  confidence REAL NOT NULL DEFAULT 0.5,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_places_coordinates ON places(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_places_osm ON places(osm_type, osm_id);
CREATE INDEX IF NOT EXISTS idx_places_wikidata ON places(wikidata_id);

CREATE TABLE IF NOT EXISTS place_aliases (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT '',
  normalized_alias TEXT NOT NULL,
  source_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_place_aliases_unique ON place_aliases(place_id, normalized_alias, language);
CREATE INDEX IF NOT EXISTS idx_place_aliases_lookup ON place_aliases(normalized_alias);

CREATE TABLE IF NOT EXISTS place_sources (
  id TEXT PRIMARY KEY,
  place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'external',
  url TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL DEFAULT 0.5,
  retrieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_place_sources_place ON place_sources(place_id);
CREATE INDEX IF NOT EXISTS idx_place_sources_provider ON place_sources(provider, provider_id);

CREATE TABLE IF NOT EXISTS place_facts (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  value_json TEXT NOT NULL,
  source_id TEXT REFERENCES place_sources(id) ON DELETE SET NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  volatility TEXT NOT NULL DEFAULT 'stable',
  retrieved_at TEXT NOT NULL,
  refresh_after TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_place_facts_place ON place_facts(place_id);
CREATE INDEX IF NOT EXISTS idx_place_facts_key ON place_facts(place_id, key);
CREATE INDEX IF NOT EXISTS idx_place_facts_refresh ON place_facts(refresh_after);

CREATE TABLE IF NOT EXISTS place_images (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  source_page_url TEXT NOT NULL DEFAULT '',
  creator_name TEXT NOT NULL DEFAULT '',
  creator_url TEXT NOT NULL DEFAULT '',
  license_code TEXT NOT NULL DEFAULT '',
  license_name TEXT NOT NULL DEFAULT '',
  license_url TEXT NOT NULL DEFAULT '',
  attribution_text TEXT NOT NULL DEFAULT '',
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  exact_location INTEGER NOT NULL DEFAULT 0,
  approximate_location INTEGER NOT NULL DEFAULT 0,
  illustrative_only INTEGER NOT NULL DEFAULT 0,
  visual_role TEXT NOT NULL DEFAULT 'illustrative',
  relevance_score REAL NOT NULL DEFAULT 0,
  quality_score REAL NOT NULL DEFAULT 0,
  final_score REAL NOT NULL DEFAULT 0,
  perceptual_hash TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'pending',
  hero_locked INTEGER NOT NULL DEFAULT 0,
  checked_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_place_images_place ON place_images(place_id);
CREATE INDEX IF NOT EXISTS idx_place_images_role ON place_images(place_id, visual_role, final_score);
CREATE INDEX IF NOT EXISTS idx_place_images_provider ON place_images(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_place_images_hash ON place_images(perceptual_hash);

CREATE TABLE IF NOT EXISTS place_editorial_profiles (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  editorial_json TEXT NOT NULL,
  source_ids_json TEXT NOT NULL DEFAULT '[]',
  validation_json TEXT NOT NULL DEFAULT '{}',
  route_context_hash TEXT NOT NULL DEFAULT '',
  traveller_context_hash TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL DEFAULT 0.5,
  editorial_version TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'generated',
  generated_at TEXT NOT NULL,
  refresh_after TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_editorial_place ON place_editorial_profiles(place_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_editorial_review ON place_editorial_profiles(review_status);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  origin_place_id TEXT REFERENCES places(id) ON DELETE SET NULL,
  destination_place_id TEXT REFERENCES places(id) ON DELETE SET NULL,
  route_context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_places (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  route_role TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_route_places_unique ON route_places(route_id, place_id);
CREATE INDEX IF NOT EXISTS idx_route_places_position ON route_places(route_id, position);

CREATE TABLE IF NOT EXISTS media_reviews (
  id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL REFERENCES place_images(id) ON DELETE CASCADE,
  reviewer TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_reviews_image ON media_reviews(image_id);
