-- Migration number: 0006 	 2026-07-24T06:30:36.183Z

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users (id),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
