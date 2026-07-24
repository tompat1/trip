-- Basic fact rows for temporary curated Crete POI profiles.
-- Keeps GET /api/places/enrich useful before provider-driven fact enrichment is complete.

INSERT INTO place_facts (
  id, place_id, key, label, value_json, source_id, confidence, volatility, retrieved_at, refresh_after
) VALUES
  ('fact-seed-koules-name', 'seed-koules', 'name', 'Name', '"Koules Fortress"', 'source-seed-koules', 0.78, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-koules-category', 'seed-koules', 'category', 'Category', '"Sight"', 'source-seed-koules', 0.72, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-koules-area', 'seed-koules', 'area', 'Area', '"Old Harbor"', 'source-seed-koules', 0.68, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-heraklion-museum-name', 'seed-heraklion-museum', 'name', 'Name', '"Heraklion Archaeological Museum"', 'source-seed-heraklion-museum', 0.8, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-heraklion-museum-category', 'seed-heraklion-museum', 'category', 'Category', '"Museum"', 'source-seed-heraklion-museum', 0.74, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-heraklion-museum-area', 'seed-heraklion-museum', 'area', 'Area', '"City center"', 'source-seed-heraklion-museum', 0.68, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-lions-square-name', 'seed-lions-square', 'name', 'Name', '"Lions Square"', 'source-seed-lions-square', 0.76, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-lions-square-category', 'seed-lions-square', 'category', 'Category', '"Coffee"', 'source-seed-lions-square', 0.68, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-lions-square-area', 'seed-lions-square', 'area', 'Area', '"Morosini Fountain"', 'source-seed-lions-square', 0.68, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-peskesi-name', 'seed-peskesi', 'name', 'Name', '"Peskesi"', 'source-seed-peskesi', 0.78, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-peskesi-category', 'seed-peskesi', 'category', 'Category', '"Restaurant"', 'source-seed-peskesi', 0.7, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-peskesi-website', 'seed-peskesi', 'website', 'Website', '"https://peskesicrete.gr/"', 'source-seed-peskesi', 0.7, 'volatile', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-venetian-walls-name', 'seed-venetian-walls', 'name', 'Name', '"Venetian Walls"', 'source-seed-venetian-walls', 0.72, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-venetian-walls-category', 'seed-venetian-walls', 'category', 'Category', '"Walk"', 'source-seed-venetian-walls', 0.66, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-venetian-walls-area', 'seed-venetian-walls', 'area', 'Area', '"Old city edge"', 'source-seed-venetian-walls', 0.64, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-ammoudara-name', 'seed-ammoudara', 'name', 'Name', '"Ammoudara Beach"', 'source-seed-ammoudara', 0.72, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-ammoudara-category', 'seed-ammoudara', 'category', 'Category', '"Beach"', 'source-seed-ammoudara', 0.64, 'stable', CURRENT_TIMESTAMP, NULL),
  ('fact-seed-ammoudara-area', 'seed-ammoudara', 'area', 'Area', '"West of Heraklion"', 'source-seed-ammoudara', 0.64, 'stable', CURRENT_TIMESTAMP, NULL)
ON CONFLICT(id) DO UPDATE SET
  value_json = excluded.value_json,
  confidence = excluded.confidence,
  volatility = excluded.volatility,
  retrieved_at = excluded.retrieved_at;

