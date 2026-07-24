import { createEntryInputSchema, updateEntryInputSchema } from "@logue/shared";
import { Hono } from "hono";
import type { AuthVariables } from "../auth/middleware";
import { requireAuth } from "../auth/middleware";
import {
  createEntry,
  deleteEntry,
  findEntryById,
  listEntries,
  toPublicEntry,
  updateEntry,
} from "../db/entries";
import { findMetricById, listChoiceOptions } from "../db/metrics";
import type { Env } from "../env";
import { parseJsonBody } from "../http";

const entries = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

entries.use("*", requireAuth);

async function validateValueAgainstMetric(
  db: D1Database,
  metric: { id: string; value_type: string },
  value: { valueNumber?: number; valueText?: string },
): Promise<string | null> {
  if (metric.value_type === "number") {
    if (value.valueNumber === undefined) {
      return "number タイプの記録項目には valueNumber が必要です";
    }
    return null;
  }

  if (value.valueText === undefined) {
    return `${metric.value_type} タイプの記録項目には valueText が必要です`;
  }

  if (metric.value_type === "choice") {
    const options = await listChoiceOptions(db, metric.id);
    if (!options.some((option) => option.label === value.valueText)) {
      return "valueText が選択肢に含まれていません";
    }
  }

  return null;
}

entries.get("/", async (c) => {
  const rows = await listEntries(c.env.DB, c.get("user").id, {
    metricId: c.req.query("metricId"),
    from: c.req.query("from"),
    to: c.req.query("to"),
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
  });
  return c.json(rows.map(toPublicEntry));
});

entries.post("/", async (c) => {
  const parsed = createEntryInputSchema.safeParse(await parseJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const userId = c.get("user").id;
  const metric = await findMetricById(c.env.DB, userId, parsed.data.metricId);
  if (!metric) {
    return c.json({ error: "metric_not_found" }, 404);
  }

  const validationError = await validateValueAgainstMetric(c.env.DB, metric, parsed.data);
  if (validationError) {
    return c.json({ error: "invalid_request", message: validationError }, 400);
  }

  const entry = await createEntry(c.env.DB, userId, {
    metricId: parsed.data.metricId,
    valueNumber: parsed.data.valueNumber ?? null,
    valueText: parsed.data.valueText ?? null,
    recordedAt: parsed.data.recordedAt ?? new Date().toISOString(),
  });
  return c.json(toPublicEntry(entry), 201);
});

entries.patch("/:id", async (c) => {
  const parsed = updateEntryInputSchema.safeParse(await parseJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const userId = c.get("user").id;
  const existing = await findEntryById(c.env.DB, userId, c.req.param("id"));
  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  if (parsed.data.valueNumber !== undefined || parsed.data.valueText !== undefined) {
    const metric = await findMetricById(c.env.DB, userId, existing.metric_id);
    if (!metric) {
      return c.json({ error: "metric_not_found" }, 404);
    }
    const validationError = await validateValueAgainstMetric(c.env.DB, metric, parsed.data);
    if (validationError) {
      return c.json({ error: "invalid_request", message: validationError }, 400);
    }
  }

  const updated = await updateEntry(c.env.DB, userId, c.req.param("id"), parsed.data);
  if (!updated) {
    return c.json({ error: "not_found" }, 404);
  }
  return c.json(toPublicEntry(updated));
});

entries.delete("/:id", async (c) => {
  const deleted = await deleteEntry(c.env.DB, c.get("user").id, c.req.param("id"));
  if (!deleted) {
    return c.json({ error: "not_found" }, 404);
  }
  return c.body(null, 204);
});

export default entries;
