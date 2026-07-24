import { createMetricInputSchema, updateMetricInputSchema, type Metric } from "@logue/shared";
import { Hono } from "hono";
import type { AuthVariables } from "../auth/middleware";
import { requireAuth } from "../auth/middleware";
import {
  createMetric,
  deleteMetric,
  listChoiceOptions,
  listMetrics,
  toPublicMetric,
  updateMetric,
  type MetricRow,
} from "../db/metrics";
import type { Env } from "../env";
import { parseJsonBody } from "../http";

const metrics = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

metrics.use("*", requireAuth);

async function toPublicMetricWithOptions(db: D1Database, row: MetricRow): Promise<Metric> {
  const options = row.value_type === "choice" ? await listChoiceOptions(db, row.id) : [];
  return toPublicMetric(row, options);
}

metrics.get("/", async (c) => {
  const includeArchived = c.req.query("includeArchived") === "true";
  const rows = await listMetrics(c.env.DB, c.get("user").id, { includeArchived });
  const result = await Promise.all(rows.map((row) => toPublicMetricWithOptions(c.env.DB, row)));
  return c.json(result);
});

metrics.post("/", async (c) => {
  const parsed = createMetricInputSchema.safeParse(await parseJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const metric = await createMetric(c.env.DB, c.get("user").id, parsed.data);
  return c.json(await toPublicMetricWithOptions(c.env.DB, metric), 201);
});

metrics.patch("/:id", async (c) => {
  const parsed = updateMetricInputSchema.safeParse(await parseJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const updated = await updateMetric(c.env.DB, c.get("user").id, c.req.param("id"), parsed.data);
  if (!updated) {
    return c.json({ error: "not_found" }, 404);
  }
  return c.json(await toPublicMetricWithOptions(c.env.DB, updated));
});

metrics.delete("/:id", async (c) => {
  const result = await deleteMetric(c.env.DB, c.get("user").id, c.req.param("id"));
  if (result === "not_found") {
    return c.json({ error: "not_found" }, 404);
  }
  if (result === "has_entries") {
    return c.json(
      {
        error: "has_entries",
        message: "記録が存在する記録項目は削除できません。アーカイブしてください",
      },
      409,
    );
  }
  return c.body(null, 204);
});

export default metrics;
