CREATE TABLE IF NOT EXISTS provider_health (
  provider TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unknown',
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  last_latency_ms INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  circuit_open_until TEXT
);

CREATE TABLE IF NOT EXISTS enrichment_cache_index (
  cache_key TEXT PRIMARY KEY,
  place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  coverage TEXT NOT NULL DEFAULT 'partial',
  generated_at TEXT NOT NULL,
  refresh_after TEXT NOT NULL,
  provider_status_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_enrichment_cache_refresh ON enrichment_cache_index(refresh_after);
CREATE INDEX IF NOT EXISTS idx_enrichment_cache_place ON enrichment_cache_index(place_id, operation);
