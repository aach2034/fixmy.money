CREATE TABLE IF NOT EXISTS lead_rate_limits (
  rate_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rate_key, window_start)
);

CREATE INDEX IF NOT EXISTS lead_rate_limits_updated_at_idx
  ON lead_rate_limits (updated_at);
