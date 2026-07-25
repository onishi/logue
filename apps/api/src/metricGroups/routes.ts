import { Hono } from "hono";
import {
  createMetricGroupInputSchema,
  reorderMetricGroupsInputSchema,
  updateMetricGroupInputSchema,
} from "@logue/shared";
import type { Env } from "../env";
import { requireAuth, type AuthVariables } from "../auth/middleware";
import {
  createMetricGroup,
  deleteMetricGroup,
  listMetricGroups,
  toPublicMetricGroup,
  updateMetricGroup,
} from "../db/metricGroups";
import { clearMetricGroupReferences } from "../db/metrics";

const metricGroups = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

metricGroups.use("*", requireAuth);

metricGroups.get("/", async (c) => {
  const rows = await listMetricGroups(c.env.DB, c.get("user").id);
  return c.json(rows.map(toPublicMetricGroup));
});

metricGroups.post("/", async (c) => {
  const userId = c.get("user").id;
  const parsed = createMetricGroupInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const sortOrder = parsed.data.sortOrder ?? (await listMetricGroups(c.env.DB, userId)).length;
  const created = await createMetricGroup(c.env.DB, { userId, name: parsed.data.name, sortOrder });
  return c.json(toPublicMetricGroup(created), 201);
});

metricGroups.put("/reorder", async (c) => {
  const userId = c.get("user").id;
  const parsed = reorderMetricGroupsInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  await Promise.all(
    parsed.data.orderedIds.map((id, index) =>
      updateMetricGroup(c.env.DB, userId, id, { sortOrder: index }),
    ),
  );
  const rows = await listMetricGroups(c.env.DB, userId);
  return c.json(rows.map(toPublicMetricGroup));
});

metricGroups.patch("/:id", async (c) => {
  const userId = c.get("user").id;
  const parsed = updateMetricGroupInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const updated = await updateMetricGroup(c.env.DB, userId, c.req.param("id"), parsed.data);
  if (!updated) return c.json({ error: "not_found" }, 404);
  return c.json(toPublicMetricGroup(updated));
});

metricGroups.delete("/:id", async (c) => {
  const userId = c.get("user").id;
  const id = c.req.param("id");
  await clearMetricGroupReferences(c.env.DB, userId, id);
  const deleted = await deleteMetricGroup(c.env.DB, userId, id);
  if (!deleted) return c.json({ error: "not_found" }, 404);
  return c.body(null, 204);
});

export default metricGroups;
