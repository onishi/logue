import type { Entry } from "@logue/shared";

export type EntryRow = {
  id: string;
  user_id: string;
  metric_id: string;
  value_number: number | null;
  value_text: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
};

export type ListEntriesFilter = {
  metricId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

export async function listEntries(
  db: D1Database,
  userId: string,
  filter: ListEntriesFilter = {},
): Promise<EntryRow[]> {
  const conditions = ["user_id = ?"];
  const params: unknown[] = [userId];

  if (filter.metricId) {
    conditions.push("metric_id = ?");
    params.push(filter.metricId);
  }
  if (filter.from) {
    conditions.push("recorded_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("recorded_at <= ?");
    params.push(filter.to);
  }

  const limit = Math.min(filter.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  params.push(limit);

  const { results } = await db
    .prepare(
      `SELECT * FROM entries WHERE ${conditions.join(" AND ")} ORDER BY recorded_at DESC LIMIT ?`,
    )
    .bind(...params)
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
  userId: string,
  params: {
    metricId: string;
    valueNumber: number | null;
    valueText: string | null;
    recordedAt: string;
  },
): Promise<EntryRow> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO entries (id, user_id, metric_id, value_number, value_text, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, params.metricId, params.valueNumber, params.valueText, params.recordedAt)
    .run();

  const created = await findEntryById(db, userId, id);
  if (!created) {
    throw new Error("entry 作成後にレコードを取得できませんでした");
  }
  return created;
}

export async function updateEntry(
  db: D1Database,
  userId: string,
  id: string,
  params: { valueNumber?: number | null; valueText?: string | null; recordedAt?: string },
): Promise<EntryRow | null> {
  const existing = await findEntryById(db, userId, id);
  if (!existing) return null;

  const valueNumber = params.valueNumber === undefined ? existing.value_number : params.valueNumber;
  const valueText = params.valueText === undefined ? existing.value_text : params.valueText;
  const recordedAt = params.recordedAt ?? existing.recorded_at;

  await db
    .prepare(
      `UPDATE entries
       SET value_number = ?, value_text = ?, recorded_at = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    )
    .bind(valueNumber, valueText, recordedAt, id, userId)
    .run();

  return findEntryById(db, userId, id);
}

export async function deleteEntry(db: D1Database, userId: string, id: string): Promise<boolean> {
  const existing = await findEntryById(db, userId, id);
  if (!existing) return false;

  await db.prepare("DELETE FROM entries WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return true;
}

export function toPublicEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    metricId: row.metric_id,
    valueNumber: row.value_number,
    valueText: row.value_text,
    recordedAt: row.recorded_at,
  };
}
