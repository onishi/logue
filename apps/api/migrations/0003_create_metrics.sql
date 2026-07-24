-- Migration number: 0003 	 2026-07-24T06:30:32.027Z

CREATE TABLE metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  group_id TEXT REFERENCES metric_groups (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('number', 'choice', 'text')),
  unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_metrics_user_id ON metrics (user_id);
CREATE INDEX idx_metrics_group_id ON metrics (group_id);
