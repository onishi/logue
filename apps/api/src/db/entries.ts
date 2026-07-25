import type { Entry } from "@logue/shared";

export type EntryRow = {
  id: string;
  user_id: string;
  metric_id: string;
  value: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
};

export async function listEntries(
  db: D1Database,
  userId: string,
  filters: { metricId?: string; from?: string; to?: string } = {},
): Promise<EntryRow[]> {
  const conditions = ["user_id = ?"];
  const values: unknown[] = [userId];

  if (filters.metricId !== undefined) {
    conditions.push("metric_id = ?");
    values.push(filters.metricId);
  }
  if (filters.from !== undefined) {
    conditions.push("recorded_at >= ?");
    values.push(filters.from);
  }
  if (filters.to !== undefined) {
    conditions.push("recorded_at <= ?");
    values.push(filters.to);
  }

  const { results } = await db
    .prepare(`SELECT * FROM entries WHERE ${conditions.join(" AND ")} ORDER BY recorded_at`)
    .bind(...values)
    .all<EntryRow>();
  return results;
}

export async function findEntryById(
  db: D1Database,
  userId: string,
  id: string,
): Promise<EntryRow | null> {
  const row = await db
    .prepare("SELECT * FROM entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<EntryRow>();
  return row ?? null;
}

export async function createEntry(
  db: D1Database,
  params: { userId: string; metricId: string; value: string; recordedAt: string },
): Promise<EntryRow> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO entries (id, user_id, metric_id, value, recorded_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id, params.userId, params.metricId, params.value, params.recordedAt)
    .run();
  const created = await findEntryById(db, params.userId, id);
  if (!created) {
    throw new Error("entry 作成後にレコードを取得できませんでした");
  }
  return created;
}

export async function updateEntry(
  db: D1Database,
  userId: string,
  id: string,
  patch: { value?: string; recordedAt?: string },
): Promise<EntryRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.value !== undefined) {
    sets.push("value = ?");
    values.push(patch.value);
  }
  if (patch.recordedAt !== undefined) {
    sets.push("recorded_at = ?");
    values.push(patch.recordedAt);
  }

  if (sets.length > 0) {
    sets.push("updated_at = ?");
    values.push(new Date().toISOString());
    await db
      .prepare(`UPDATE entries SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  return findEntryById(db, userId, id);
}

export async function deleteEntry(db: D1Database, userId: string, id: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteEntriesByMetricId(db: D1Database, metricId: string): Promise<void> {
  await db.prepare("DELETE FROM entries WHERE metric_id = ?").bind(metricId).run();
}

export function toPublicEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    metricId: row.metric_id,
    value: row.value,
    recordedAt: row.recorded_at,
  };
}
