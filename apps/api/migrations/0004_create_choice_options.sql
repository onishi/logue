-- Migration number: 0004 	 2026-07-24T06:30:33.191Z

CREATE TABLE choice_options (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL REFERENCES metrics (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_choice_options_metric_id ON choice_options (metric_id);
