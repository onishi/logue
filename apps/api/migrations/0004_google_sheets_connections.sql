-- Migration number: 0004 	 2026-08-02T00:00:00.000Z

CREATE TABLE google_sheets_connections (
  user_id TEXT PRIMARY KEY REFERENCES users (id),
  refresh_token TEXT NOT NULL,
  spreadsheet_id TEXT,
  sheet_name TEXT NOT NULL DEFAULT 'logue',
  sync_enabled INTEGER NOT NULL DEFAULT 0,
  last_synced_at TEXT,
  last_error TEXT,
  last_snapshot_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
