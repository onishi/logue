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

export async function createMetricGroup(
  db: D1Database,
  params: { userId: string; name: string; sortOrder: number },
): Promise<MetricGroupRow> {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO metric_groups (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)")
    .bind(id, params.userId, params.name, params.sortOrder)
    .run();
  const created = await findMetricGroupById(db, params.userId, id);
  if (!created) {
    throw new Error("metric_group 作成後にレコードを取得できませんでした");
  }
  return created;
}

export async function updateMetricGroup(
  db: D1Database,
  userId: string,
  id: string,
  patch: { name?: string; sortOrder?: number },
): Promise<MetricGroupRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    values.push(patch.name);
  }
  if (patch.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    values.push(patch.sortOrder);
  }

  if (sets.length > 0) {
    sets.push("updated_at = ?");
    values.push(new Date().toISOString());
    await db
      .prepare(`UPDATE metric_groups SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  return findMetricGroupById(db, userId, id);
}

export async function deleteMetricGroup(
  db: D1Database,
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM metric_groups WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export function toPublicMetricGroup(row: MetricGroupRow): MetricGroup {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}
