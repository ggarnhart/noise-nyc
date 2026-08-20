-- noise.nyc schema — MySQL 8+ variant.
-- The app ships wired to Supabase/Postgres (supabase/migrations/), but the
-- model ports cleanly: arrays become JSON, uuid generation moves to a default
-- expression, and RLS is replaced by whatever access layer fronts the DB.

CREATE TABLE noise_reports (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  location_precise BOOLEAN NOT NULL DEFAULT FALSE,

  borough VARCHAR(40) NULL,
  neighborhood VARCHAR(60) NULL,

  floor_band ENUM('1', '2-4', '5-9', '10+') NULL,

  -- 1 = silent, 2 = fine, 3 = loud, 4 = can't sleep
  street_noise TINYINT NOT NULL,
  neighbor_noise TINYINT NOT NULL,

  -- JSON array of source slugs, e.g. '["traffic","sirens"]'
  noise_sources JSON NOT NULL,

  worst_time ENUM('early_morning', 'daytime', 'evening', 'late_night', 'all_day') NULL,

  client_id VARCHAR(64) NULL,
  is_seed BOOLEAN NOT NULL DEFAULT FALSE,

  PRIMARY KEY (id),
  CONSTRAINT chk_lat CHECK (lat BETWEEN 40.4 AND 41.0),
  CONSTRAINT chk_lng CHECK (lng BETWEEN -74.3 AND -73.6),
  CONSTRAINT chk_street CHECK (street_noise BETWEEN 1 AND 4),
  CONSTRAINT chk_neighbor CHECK (neighbor_noise BETWEEN 1 AND 4),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_lat_lng (lat, lng)
);
