-- Migration number: 0002 	 2026-07-25T07:00:00.000Z

CREATE TABLE metric_groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_metric_groups_user_id ON metric_groups (user_id);

CREATE TABLE metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  metric_group_id TEXT REFERENCES metric_groups (id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('number', 'choice', 'text')),
  unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_metrics_user_id ON metrics (user_id);
CREATE INDEX idx_metrics_metric_group_id ON metrics (metric_group_id);

CREATE TABLE choice_options (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL REFERENCES metrics (id),
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_choice_options_metric_id ON choice_options (metric_id);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  metric_id TEXT NOT NULL REFERENCES metrics (id),
  value TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_entries_user_id ON entries (user_id);
CREATE INDEX idx_entries_metric_id_recorded_at ON entries (metric_id, recorded_at);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users (id),
  theme TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
