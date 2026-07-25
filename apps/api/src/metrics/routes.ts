import { Hono } from "hono";
import {
  createMetricInputSchema,
  reorderMetricsInputSchema,
  updateMetricInputSchema,
} from "@logue/shared";
import type { Env } from "../env";
import { requireAuth, type AuthVariables } from "../auth/middleware";
import { deleteChoiceOptions, replaceChoiceOptions } from "../db/choiceOptions";
import { deleteEntriesByMetricId } from "../db/entries";
import {
  createMetric,
  deleteMetric,
  findMetricById,
  listMetrics,
  toPublicMetric,
  updateMetric,
} from "../db/metrics";

const metrics = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

metrics.use("*", requireAuth);

metrics.get("/", async (c) => {
  const rows = await listMetrics(c.env.DB, c.get("user").id);
  return c.json(await Promise.all(rows.map((row) => toPublicMetric(c.env.DB, row))));
});

metrics.post("/", async (c) => {
  const userId = c.get("user").id;
  const parsed = createMetricInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }
  const input = parsed.data;
  if (input.type === "choice" && (!input.choiceOptions || input.choiceOptions.length === 0)) {
    return c.json({ error: "choice_options_required" }, 400);
  }

  const sortOrder = input.sortOrder ?? (await listMetrics(c.env.DB, userId)).length;
  const created = await createMetric(c.env.DB, {
    userId,
    metricGroupId: input.metricGroupId ?? null,
    name: input.name,
    type: input.type,
    unit: input.unit ?? null,
    sortOrder,
  });

  if (input.type === "choice" && input.choiceOptions) {
    await replaceChoiceOptions(
      c.env.DB,
      created.id,
      input.choiceOptions.map((o) => o.label),
    );
  }

  return c.json(await toPublicMetric(c.env.DB, created), 201);
});

metrics.put("/reorder", async (c) => {
  const userId = c.get("user").id;
  const parsed = reorderMetricsInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  await Promise.all(
    parsed.data.orderedIds.map((id, index) =>
      updateMetric(c.env.DB, userId, id, { sortOrder: index }),
    ),
  );
  const rows = await listMetrics(c.env.DB, userId);
  return c.json(await Promise.all(rows.map((row) => toPublicMetric(c.env.DB, row))));
});

metrics.patch("/:id", async (c) => {
  const userId = c.get("user").id;
  const id = c.req.param("id");
  const existing = await findMetricById(c.env.DB, userId, id);
  if (!existing) return c.json({ error: "not_found" }, 404);

  const parsed = updateMetricInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }
  const input = parsed.data;
  if (input.choiceOptions !== undefined && existing.type !== "choice") {
    return c.json({ error: "choice_options_not_applicable" }, 400);
  }

  const updated = await updateMetric(c.env.DB, userId, id, {
    metricGroupId: input.metricGroupId,
    name: input.name,
    unit: input.unit,
    sortOrder: input.sortOrder,
    isArchived: input.isArchived,
  });
  if (!updated) return c.json({ error: "not_found" }, 404);

  if (input.choiceOptions !== undefined) {
    await replaceChoiceOptions(
      c.env.DB,
      id,
      input.choiceOptions.map((o) => o.label),
    );
  }

  return c.json(await toPublicMetric(c.env.DB, updated));
});

metrics.delete("/:id", async (c) => {
  const userId = c.get("user").id;
  const id = c.req.param("id");
  const existing = await findMetricById(c.env.DB, userId, id);
  if (!existing) return c.json({ error: "not_found" }, 404);

  await deleteEntriesByMetricId(c.env.DB, id);
  await deleteChoiceOptions(c.env.DB, id);
  await deleteMetric(c.env.DB, userId, id);
  return c.body(null, 204);
});

export default metrics;
