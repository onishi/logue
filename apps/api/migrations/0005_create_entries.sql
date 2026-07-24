-- Migration number: 0005 	 2026-07-24T06:30:35.053Z

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  metric_id TEXT NOT NULL REFERENCES metrics (id),
  value_number REAL,
  value_text TEXT,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_entries_user_id_recorded_at ON entries (user_id, recorded_at);
CREATE INDEX idx_entries_metric_id_recorded_at ON entries (metric_id, recorded_at);
