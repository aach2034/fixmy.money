export const marketingLeadsSchema = `
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
  )
`;
