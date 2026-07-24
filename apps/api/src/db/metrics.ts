import type { CreateMetricInput, Metric, UpdateMetricInput, ValueType } from "@logue/shared";

export type MetricRow = {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  value_type: ValueType;
  unit: string | null;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

export type ChoiceOptionRow = {
  id: string;
  metric_id: string;
  label: string;
  sort_order: number;
};

export async function listMetrics(
  db: D1Database,
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<MetricRow[]> {
  const sql = options.includeArchived
    ? "SELECT * FROM metrics WHERE user_id = ? ORDER BY sort_order"
    : "SELECT * FROM metrics WHERE user_id = ? AND is_archived = 0 ORDER BY sort_order";
  const { results } = await db.prepare(sql).bind(userId).all<MetricRow>();
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

export async function listChoiceOptions(
  db: D1Database,
  metricId: string,
): Promise<ChoiceOptionRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM choice_options WHERE metric_id = ? ORDER BY sort_order")
    .bind(metricId)
    .all<ChoiceOptionRow>();
  return results;
}

async function replaceChoiceOptions(
  db: D1Database,
  metricId: string,
  labels: string[],
): Promise<void> {
  await db.prepare("DELETE FROM choice_options WHERE metric_id = ?").bind(metricId).run();
  for (const [index, label] of labels.entries()) {
    await db
      .prepare("INSERT INTO choice_options (id, metric_id, label, sort_order) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), metricId, label, index)
      .run();
  }
}

async function nextMetricSortOrder(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM metrics WHERE user_id = ?")
    .bind(userId)
    .first<{ next: number }>();
  return row?.next ?? 0;
}

export async function createMetric(
  db: D1Database,
  userId: string,
  input: CreateMetricInput,
): Promise<MetricRow> {
  const id = crypto.randomUUID();
  const sortOrder = await nextMetricSortOrder(db, userId);

  await db
    .prepare(
      `INSERT INTO metrics (id, user_id, group_id, name, value_type, unit, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      userId,
      input.groupId ?? null,
      input.name,
      input.valueType,
      input.unit ?? null,
      sortOrder,
    )
    .run();

  if (input.valueType === "choice" && input.choiceOptions) {
    await replaceChoiceOptions(db, id, input.choiceOptions);
  }

  const created = await findMetricById(db, userId, id);
  if (!created) {
    throw new Error("metric 作成後にレコードを取得できませんでした");
  }
  return created;
}

export async function updateMetric(
  db: D1Database,
  userId: string,
  id: string,
  input: UpdateMetricInput,
): Promise<MetricRow | null> {
  const existing = await findMetricById(db, userId, id);
  if (!existing) return null;

  const name = input.name ?? existing.name;
  const unit = input.unit === undefined ? existing.unit : input.unit;
  const groupId = input.groupId === undefined ? existing.group_id : input.groupId;
  const sortOrder = input.sortOrder ?? existing.sort_order;
  const isArchived =
    input.isArchived === undefined ? existing.is_archived : input.isArchived ? 1 : 0;

  await db
    .prepare(
      `UPDATE metrics
       SET name = ?, unit = ?, group_id = ?, sort_order = ?, is_archived = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    )
    .bind(name, unit, groupId, sortOrder, isArchived, id, userId)
    .run();

  if (existing.value_type === "choice" && input.choiceOptions) {
    await replaceChoiceOptions(db, id, input.choiceOptions);
  }

  return findMetricById(db, userId, id);
}

export type DeleteMetricResult = "deleted" | "not_found" | "has_entries";

export async function deleteMetric(
  db: D1Database,
  userId: string,
  id: string,
): Promise<DeleteMetricResult> {
  const existing = await findMetricById(db, userId, id);
  if (!existing) return "not_found";

  const entryCount = await db
    .prepare("SELECT COUNT(*) AS count FROM entries WHERE metric_id = ?")
    .bind(id)
    .first<{ count: number }>();
  if ((entryCount?.count ?? 0) > 0) {
    return "has_entries";
  }

  await db.prepare("DELETE FROM choice_options WHERE metric_id = ?").bind(id).run();
  await db.prepare("DELETE FROM metrics WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return "deleted";
}

export function toPublicMetric(row: MetricRow, choiceOptions: ChoiceOptionRow[]): Metric {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    valueType: row.value_type,
    unit: row.unit,
    sortOrder: row.sort_order,
    isArchived: row.is_archived === 1,
    choiceOptions: choiceOptions.map((option) => ({
      id: option.id,
      label: option.label,
      sortOrder: option.sort_order,
    })),
  };
}
