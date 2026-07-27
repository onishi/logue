-- Migration number: 0003 	 2026-07-27T14:00:00.000Z

CREATE UNIQUE INDEX idx_entries_metric_recorded_at ON entries (metric_id, recorded_at);
