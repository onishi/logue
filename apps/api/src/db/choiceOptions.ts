import type { ChoiceOption } from "@logue/shared";

export type ChoiceOptionRow = {
  id: string;
  metric_id: string;
  label: string;
  sort_order: number;
};

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

export async function deleteChoiceOptions(db: D1Database, metricId: string): Promise<void> {
  await db.prepare("DELETE FROM choice_options WHERE metric_id = ?").bind(metricId).run();
}

export async function replaceChoiceOptions(
  db: D1Database,
  metricId: string,
  labels: string[],
): Promise<ChoiceOptionRow[]> {
  await deleteChoiceOptions(db, metricId);
  for (const [index, label] of labels.entries()) {
    await db
      .prepare("INSERT INTO choice_options (id, metric_id, label, sort_order) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), metricId, label, index)
      .run();
  }
  return listChoiceOptions(db, metricId);
}

export function toPublicChoiceOption(row: ChoiceOptionRow): ChoiceOption {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sort_order,
  };
}
