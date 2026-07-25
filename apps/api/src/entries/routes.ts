import { Hono } from "hono";
import { createEntryInputSchema, updateEntryInputSchema } from "@logue/shared";
import type { Env } from "../env";
import { requireAuth, type AuthVariables } from "../auth/middleware";
import { listChoiceOptions } from "../db/choiceOptions";
import {
  createEntry,
  deleteEntry,
  findEntryById,
  listEntries,
  toPublicEntry,
  updateEntry,
} from "../db/entries";
import { findMetricById, type MetricRow } from "../db/metrics";

const entries = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

entries.use("*", requireAuth);

async function validateValueForMetric(
  db: D1Database,
  metric: MetricRow,
  value: string,
): Promise<string | null> {
  if (metric.type === "number") {
    return Number.isFinite(Number(value)) ? null : "value_must_be_a_number";
  }
  if (metric.type === "choice") {
    const options = await listChoiceOptions(db, metric.id);
    return options.some((o) => o.id === value) ? null : "value_must_be_a_valid_choice_option";
  }
  return null;
}

entries.get("/", async (c) => {
  const userId = c.get("user").id;
  const metricId = c.req.query("metricId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const rows = await listEntries(c.env.DB, userId, { metricId, from, to });
  return c.json(rows.map(toPublicEntry));
});

entries.post("/", async (c) => {
  const userId = c.get("user").id;
  const parsed = createEntryInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }
  const input = parsed.data;

  const metric = await findMetricById(c.env.DB, userId, input.metricId);
  if (!metric) return c.json({ error: "metric_not_found" }, 400);

  const valueError = await validateValueForMetric(c.env.DB, metric, input.value);
  if (valueError) return c.json({ error: valueError }, 400);

  const created = await createEntry(c.env.DB, {
    userId,
    metricId: input.metricId,
    value: input.value,
    recordedAt: input.recordedAt,
  });
  return c.json(toPublicEntry(created), 201);
});

entries.patch("/:id", async (c) => {
  const userId = c.get("user").id;
  const id = c.req.param("id");
  const existing = await findEntryById(c.env.DB, userId, id);
  if (!existing) return c.json({ error: "not_found" }, 404);

  const parsed = updateEntryInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }
  const input = parsed.data;

  if (input.value !== undefined) {
    const metric = await findMetricById(c.env.DB, userId, existing.metric_id);
    if (!metric) return c.json({ error: "metric_not_found" }, 400);
    const valueError = await validateValueForMetric(c.env.DB, metric, input.value);
    if (valueError) return c.json({ error: valueError }, 400);
  }

  const updated = await updateEntry(c.env.DB, userId, id, input);
  if (!updated) return c.json({ error: "not_found" }, 404);
  return c.json(toPublicEntry(updated));
});

entries.delete("/:id", async (c) => {
  const userId = c.get("user").id;
  const deleted = await deleteEntry(c.env.DB, userId, c.req.param("id"));
  if (!deleted) return c.json({ error: "not_found" }, 404);
  return c.body(null, 204);
});

export default entries;
