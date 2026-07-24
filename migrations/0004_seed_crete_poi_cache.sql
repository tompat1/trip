-- Temporary curated Crete POI cache for the Worker nearby fallback.
-- These rows come from src/data/creteSeed.js and are marked as curated/user-provided.

INSERT INTO places (
  id, canonical_name, local_name, country_code, region, municipality, latitude, longitude,
  osm_type, osm_id, wikidata_id, wikipedia_url, official_website, categories, confidence, created_at, updated_at
) VALUES
  ('seed-koules', 'Koules Fortress', '', 'GR', 'Crete', 'Heraklion', 35.3447, 25.1367, '', '', '', '', '', '["Sight","historic"]', 0.72, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-heraklion-museum', 'Heraklion Archaeological Museum', '', 'GR', 'Crete', 'Heraklion', 35.3397, 25.1389, '', '', '', '', '', '["Museum","Culture"]', 0.74, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-lions-square', 'Lions Square', 'Morosini Fountain', 'GR', 'Crete', 'Heraklion', 35.3391, 25.1320, '', '', '', '', '', '["Coffee","Sight"]', 0.68, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-peskesi', 'Peskesi', '', 'GR', 'Crete', 'Heraklion', 35.3393, 25.1319, '', '', '', '', 'https://peskesicrete.gr/', '["Restaurant","Food"]', 0.7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-venetian-walls', 'Venetian Walls', '', 'GR', 'Crete', 'Heraklion', 35.3375, 25.1262, '', '', '', '', '', '["Walk","historic"]', 0.66, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-ammoudara', 'Ammoudara Beach', '', 'GR', 'Crete', 'Heraklion', 35.3354, 25.0746, '', '', '', '', '', '["Beach"]', 0.64, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  canonical_name = excluded.canonical_name,
  local_name = excluded.local_name,
  country_code = excluded.country_code,
  region = excluded.region,
  municipality = excluded.municipality,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  official_website = excluded.official_website,
  categories = excluded.categories,
  confidence = excluded.confidence,
  updated_at = excluded.updated_at;

INSERT INTO place_sources (
  id, place_id, provider, provider_id, name, type, url, confidence, retrieved_at
) VALUES
  ('source-seed-koules', 'seed-koules', 'trip-curated-seed', 'koules', 'Trip curated Crete seed', 'curated', '', 0.72, CURRENT_TIMESTAMP),
  ('source-seed-heraklion-museum', 'seed-heraklion-museum', 'trip-curated-seed', 'museum', 'Trip curated Crete seed', 'curated', '', 0.74, CURRENT_TIMESTAMP),
  ('source-seed-lions-square', 'seed-lions-square', 'trip-curated-seed', 'lions-square', 'Trip curated Crete seed', 'curated', '', 0.68, CURRENT_TIMESTAMP),
  ('source-seed-peskesi', 'seed-peskesi', 'trip-curated-seed', 'peskesi', 'Trip curated Crete seed', 'curated', 'https://peskesicrete.gr/', 0.7, CURRENT_TIMESTAMP),
  ('source-seed-venetian-walls', 'seed-venetian-walls', 'trip-curated-seed', 'venetian-walls', 'Trip curated Crete seed', 'curated', '', 0.66, CURRENT_TIMESTAMP),
  ('source-seed-ammoudara', 'seed-ammoudara', 'trip-curated-seed', 'ammoudara', 'Trip curated Crete seed', 'curated', '', 0.64, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  type = excluded.type,
  url = excluded.url,
  confidence = excluded.confidence,
  retrieved_at = excluded.retrieved_at;

