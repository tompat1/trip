-- Temporary curated Crete destination cache for the Worker fallback.
-- Covers the master-plan Crete examples beyond central Heraklion POIs.

INSERT INTO places (
  id, canonical_name, local_name, country_code, region, municipality, latitude, longitude,
  osm_type, osm_id, wikidata_id, wikipedia_url, official_website, categories, confidence, created_at, updated_at
) VALUES
  ('seed-heraklion', 'Heraklion', 'Ηράκλειο', 'GR', 'Crete', 'Heraklion', 35.3387, 25.1442, '', '', '', '', '', '["Destination","City","Hub"]', 0.76, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-fodele', 'Fodele', 'Φόδελε', 'GR', 'Crete', 'Malevizi', 35.3832, 24.9588, '', '', '', '', '', '["Village","Culture"]', 0.66, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-bali-crete', 'Bali', 'Μπαλί', 'GR', 'Crete', 'Mylopotamos', 35.4144, 24.7837, '', '', '', '', '', '["Beach","Village"]', 0.66, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-panormos', 'Panormos', 'Πάνορμος', 'GR', 'Crete', 'Mylopotamos', 35.4195, 24.6906, '', '', '', '', '', '["Village","Harbor"]', 0.66, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-rethymnon', 'Rethymno', 'Ρέθυμνο', 'GR', 'Crete', 'Rethymno', 35.3656, 24.4823, '', '', '', '', '', '["Destination","City","Old town"]', 0.74, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-georgioupoli', 'Georgioupoli', 'Γεωργιούπολη', 'GR', 'Crete', 'Apokoronas', 35.3626, 24.2608, '', '', '', '', '', '["Village","Beach"]', 0.68, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-lake-kournas', 'Lake Kournas', 'Λίμνη Κουρνά', 'GR', 'Crete', 'Apokoronas', 35.3314, 24.2777, '', '', '', '', '', '["Lake","Nature"]', 0.7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-chania', 'Chania', 'Χανιά', 'GR', 'Crete', 'Chania', 35.5138, 24.0180, '', '', '', '', '', '["Destination","City","Old town"]', 0.76, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  canonical_name = excluded.canonical_name,
  local_name = excluded.local_name,
  country_code = excluded.country_code,
  region = excluded.region,
  municipality = excluded.municipality,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  categories = excluded.categories,
  confidence = excluded.confidence,
  updated_at = excluded.updated_at;

INSERT INTO place_aliases (
  id, place_id, alias, language, normalized_alias, source_id, created_at
) VALUES
  ('alias-seed-heraklion-iraklio', 'seed-heraklion', 'Iraklio', 'en', 'iraklio', 'source-seed-heraklion', CURRENT_TIMESTAMP),
  ('alias-seed-heraklion-herakleion', 'seed-heraklion', 'Herakleion', 'en', 'herakleion', 'source-seed-heraklion', CURRENT_TIMESTAMP),
  ('alias-seed-ammoudara-amoudara', 'seed-ammoudara', 'Amoudara Beach', 'en', 'amoudara beach', 'source-seed-ammoudara', CURRENT_TIMESTAMP),
  ('alias-seed-rethymnon-rethymno', 'seed-rethymnon', 'Rethymnon', 'en', 'rethymnon', 'source-seed-rethymnon', CURRENT_TIMESTAMP),
  ('alias-seed-lake-kournas-kourna', 'seed-lake-kournas', 'Kournas Lake', 'en', 'kournas lake', 'source-seed-lake-kournas', CURRENT_TIMESTAMP)
ON CONFLICT(place_id, normalized_alias, language) DO UPDATE SET
  alias = excluded.alias,
  source_id = excluded.source_id;

INSERT INTO place_sources (
  id, place_id, provider, provider_id, name, type, url, confidence, retrieved_at
) VALUES
  ('source-seed-heraklion', 'seed-heraklion', 'trip-curated-seed', 'heraklion', 'Trip curated Crete seed', 'curated', '', 0.76, CURRENT_TIMESTAMP),
  ('source-seed-fodele', 'seed-fodele', 'trip-curated-seed', 'fodele', 'Trip curated Crete seed', 'curated', '', 0.66, CURRENT_TIMESTAMP),
  ('source-seed-bali-crete', 'seed-bali-crete', 'trip-curated-seed', 'bali-crete', 'Trip curated Crete seed', 'curated', '', 0.66, CURRENT_TIMESTAMP),
  ('source-seed-panormos', 'seed-panormos', 'trip-curated-seed', 'panormos', 'Trip curated Crete seed', 'curated', '', 0.66, CURRENT_TIMESTAMP),
  ('source-seed-rethymnon', 'seed-rethymnon', 'trip-curated-seed', 'rethymno', 'Trip curated Crete seed', 'curated', '', 0.74, CURRENT_TIMESTAMP),
  ('source-seed-georgioupoli', 'seed-georgioupoli', 'trip-curated-seed', 'georgioupoli', 'Trip curated Crete seed', 'curated', '', 0.68, CURRENT_TIMESTAMP),
  ('source-seed-lake-kournas', 'seed-lake-kournas', 'trip-curated-seed', 'lake-kournas', 'Trip curated Crete seed', 'curated', '', 0.7, CURRENT_TIMESTAMP),
  ('source-seed-chania', 'seed-chania', 'trip-curated-seed', 'chania', 'Trip curated Crete seed', 'curated', '', 0.76, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  type = excluded.type,
  url = excluded.url,
  confidence = excluded.confidence,
  retrieved_at = excluded.retrieved_at;

INSERT INTO place_facts (
  id, place_id, key, label, value_json, source_id, confidence, volatility, retrieved_at, refresh_after
) VALUES
  ('fact-seed-heraklion-name', 'seed-heraklion', 'name', 'Name', '"Heraklion"', 'source-seed-heraklion', 0.78, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-heraklion-category', 'seed-heraklion', 'category', 'Category', '"City hub"', 'source-seed-heraklion', 0.76, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-heraklion-area', 'seed-heraklion', 'area', 'Area', '"North coast of central Crete"', 'source-seed-heraklion', 0.72, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-fodele-name', 'seed-fodele', 'name', 'Name', '"Fodele"', 'source-seed-fodele', 0.7, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-fodele-category', 'seed-fodele', 'category', 'Category', '"Village"', 'source-seed-fodele', 0.66, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-fodele-area', 'seed-fodele', 'area', 'Area', '"West of Heraklion"', 'source-seed-fodele', 0.64, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-bali-crete-name', 'seed-bali-crete', 'name', 'Name', '"Bali"', 'source-seed-bali-crete', 0.7, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-bali-crete-category', 'seed-bali-crete', 'category', 'Category', '"Beach village"', 'source-seed-bali-crete', 0.66, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-bali-crete-area', 'seed-bali-crete', 'area', 'Area', '"Mylopotamos coast"', 'source-seed-bali-crete', 0.64, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-panormos-name', 'seed-panormos', 'name', 'Name', '"Panormos"', 'source-seed-panormos', 0.7, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-panormos-category', 'seed-panormos', 'category', 'Category', '"Harbor village"', 'source-seed-panormos', 0.66, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-panormos-area', 'seed-panormos', 'area', 'Area', '"Mylopotamos coast"', 'source-seed-panormos', 0.64, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-rethymnon-name', 'seed-rethymnon', 'name', 'Name', '"Rethymno"', 'source-seed-rethymnon', 0.78, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-rethymnon-category', 'seed-rethymnon', 'category', 'Category', '"Old town city"', 'source-seed-rethymnon', 0.74, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-rethymnon-area', 'seed-rethymnon', 'area', 'Area', '"Central north Crete"', 'source-seed-rethymnon', 0.7, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-georgioupoli-name', 'seed-georgioupoli', 'name', 'Name', '"Georgioupoli"', 'source-seed-georgioupoli', 0.72, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-georgioupoli-category', 'seed-georgioupoli', 'category', 'Category', '"Beach village"', 'source-seed-georgioupoli', 0.68, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-georgioupoli-area', 'seed-georgioupoli', 'area', 'Area', '"Apokoronas coast"', 'source-seed-georgioupoli', 0.66, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-lake-kournas-name', 'seed-lake-kournas', 'name', 'Name', '"Lake Kournas"', 'source-seed-lake-kournas', 0.74, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-lake-kournas-category', 'seed-lake-kournas', 'category', 'Category', '"Lake"', 'source-seed-lake-kournas', 0.7, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-lake-kournas-area', 'seed-lake-kournas', 'area', 'Area', '"Near Georgioupoli"', 'source-seed-lake-kournas', 0.68, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-chania-name', 'seed-chania', 'name', 'Name', '"Chania"', 'source-seed-chania', 0.78, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-chania-category', 'seed-chania', 'category', 'Category', '"Old town city"', 'source-seed-chania', 0.76, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-chania-area', 'seed-chania', 'area', 'Area', '"Western Crete"', 'source-seed-chania', 0.72, 'stable', CURRENT_TIMESTAMP, NULL)
ON CONFLICT(id) DO UPDATE SET
  value_json = excluded.value_json,
  confidence = excluded.confidence,
  volatility = excluded.volatility,
  retrieved_at = excluded.retrieved_at;
