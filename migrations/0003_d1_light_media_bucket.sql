CREATE TABLE IF NOT EXISTS light_media_objects (
  key TEXT PRIMARY KEY,
  place_id TEXT REFERENCES places(id) ON DELETE SET NULL,
  image_id TEXT REFERENCES place_images(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  byte_size INTEGER NOT NULL DEFAULT 0,
  body_text TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_light_media_place ON light_media_objects(place_id);
CREATE INDEX IF NOT EXISTS idx_light_media_image ON light_media_objects(image_id);
