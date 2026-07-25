import type { Metric, MetricType } from "@logue/shared";
import {
  listChoiceOptions,
  replaceChoiceOptions,
  toPublicChoiceOption,
  type ChoiceOptionRow,
} from "./choiceOptions";

export type MetricRow = {
  id: string;
  user_id: string;
  metric_group_id: string | null;
  name: string;
  type: MetricType;
  unit: string | null;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

export async function listMetrics(db: D1Database, userId: string): Promise<MetricRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM metrics WHERE user_id = ? ORDER BY sort_order")
    .bind(userId)
    .all<MetricRow>();
  return results;
}

export async function findMetricById(
  db: D1Database,
  userId: string,
  id: string,
): Promise<MetricRow | null> {
  const row = await db
    .prepare("SELECT * FROM metrics WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<MetricRow>();
  return row ?? null;
}

export async function createMetric(
  db: D1Database,
  params: {
    userId: string;
    metricGroupId: string | null;
    name: string;
    type: MetricType;
    unit: string | null;
    sortOrder: number;
  },
): Promise<MetricRow> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO metrics (id, user_id, metric_group_id, name, type, unit, sort_order, is_archived)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      params.userId,
      params.metricGroupId,
      params.name,
      params.type,
      params.unit,
      params.sortOrder,
      0,
    )
    .run();
  const created = await findMetricById(db, params.userId, id);
  if (!created) {
    throw new Error("metric 作成後にレコードを取得できませんでした");
  }
  return created;
}

export async function updateMetric(
  db: D1Database,
  userId: string,
  id: string,
  patch: {
    metricGroupId?: string | null;
    name?: string;
    unit?: string | null;
    sortOrder?: number;
    isArchived?: boolean;
  },
): Promise<MetricRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.metricGroupId !== undefined) {
    sets.push("metric_group_id = ?");
    values.push(patch.metricGroupId);
  }
  if (patch.name !== undefined) {
    sets.push("name = ?");
    values.push(patch.name);
  }
  if (patch.unit !== undefined) {
    sets.push("unit = ?");
    values.push(patch.unit);
  }
  if (patch.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    values.push(patch.sortOrder);
  }
  if (patch.isArchived !== undefined) {
    sets.push("is_archived = ?");
    values.push(patch.isArchived ? 1 : 0);
  }

  if (sets.length > 0) {
    sets.push("updated_at = ?");
    values.push(new Date().toISOString());
    await db
      .prepare(`UPDATE metrics SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, userId)
      .run();
  }

  return findMetricById(db, userId, id);
}

export async function deleteMetric(db: D1Database, userId: string, id: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM metrics WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function clearMetricGroupReferences(
  db: D1Database,
  userId: string,
  metricGroupId: string,
): Promise<void> {
  await db
    .prepare("UPDATE metrics SET metric_group_id = ? WHERE metric_group_id = ? AND user_id = ?")
    .bind(null, metricGroupId, userId)
    .run();
}

export { replaceChoiceOptions };

export async function toPublicMetric(db: D1Database, row: MetricRow): Promise<Metric> {
  const choiceOptions: ChoiceOptionRow[] =
    row.type === "choice" ? await listChoiceOptions(db, row.id) : [];
  return {
    id: row.id,
    metricGroupId: row.metric_group_id,
    name: row.name,
    type: row.type,
    unit: row.unit,
    sortOrder: row.sort_order,
    isArchived: row.is_archived === 1,
    choiceOptions: choiceOptions.map(toPublicChoiceOption),
  };
}
