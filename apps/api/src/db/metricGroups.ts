import type { MetricGroup } from "@logue/shared";

export type MetricGroupRow = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function listMetricGroups(db: D1Database, userId: string): Promise<MetricGroupRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM metric_groups WHERE user_id = ? ORDER BY sort_order")
    .bind(userId)
    .all<MetricGroupRow>();
  return results;
}

export async function findMetricGroupById(
  db: D1Database,
  userId: string,
  id: string,
): Promise<MetricGroupRow | null> {
  const row = await db
    .prepare("SELECT * FROM metric_groups WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<MetricGroupRow>();
  return row ?? null;
}

async function nextSortOrder(db: D1Database, table: string, userId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${table} WHERE user_id = ?`)
    .bind(userId)
    .first<{ next: number }>();
  return row?.next ?? 0;
}

export async function createMetricGroup(
  db: D1Database,
  userId: string,
  params: { name: string },
): Promise<MetricGroupRow> {
  const id = crypto.randomUUID();
  const sortOrder = await nextSortOrder(db, "metric_groups", userId);
  await db
    .prepare("INSERT INTO metric_groups (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)")
    .bind(id, userId, params.name, sortOrder)
    .run();
  const created = await findMetricGroupById(db, userId, id);
  if (!created) {
    throw new Error("metric_group 作成後にレコードを取得できませんでした");
  }
  return created;
}

export async function updateMetricGroup(
  db: D1Database,
  userId: string,
  id: string,
  params: { name?: string; sortOrder?: number },
): Promise<MetricGroupRow | null> {
  const existing = await findMetricGroupById(db, userId, id);
  if (!existing) return null;

  const name = params.name ?? existing.name;
  const sortOrder = params.sortOrder ?? existing.sort_order;

  await db
    .prepare(
      "UPDATE metric_groups SET name = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    )
    .bind(name, sortOrder, id, userId)
    .run();

  return findMetricGroupById(db, userId, id);
}

export async function deleteMetricGroup(
  db: D1Database,
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await findMetricGroupById(db, userId, id);
  if (!existing) return false;

  await db.prepare("DELETE FROM metric_groups WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return true;
}

export function toPublicMetricGroup(row: MetricGroupRow): MetricGroup {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}
