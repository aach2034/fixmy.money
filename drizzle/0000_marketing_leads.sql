CREATE TABLE IF NOT EXISTS marketing_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  offer TEXT NOT NULL,
  source TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consented_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, offer)
);

CREATE INDEX IF NOT EXISTS marketing_leads_created_at_idx
  ON marketing_leads (created_at DESC);

CREATE TABLE IF NOT EXISTS lead_rate_limits (
  rate_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rate_key, window_start)
);

CREATE INDEX IF NOT EXISTS lead_rate_limits_updated_at_idx
  ON lead_rate_limits (updated_at);
