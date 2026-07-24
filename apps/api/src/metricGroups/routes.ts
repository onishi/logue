import { createMetricGroupInputSchema, updateMetricGroupInputSchema } from "@logue/shared";
import { Hono } from "hono";
import type { AuthVariables } from "../auth/middleware";
import { requireAuth } from "../auth/middleware";
import {
  createMetricGroup,
  deleteMetricGroup,
  listMetricGroups,
  toPublicMetricGroup,
  updateMetricGroup,
} from "../db/metricGroups";
import type { Env } from "../env";
import { parseJsonBody } from "../http";

const metricGroups = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

metricGroups.use("*", requireAuth);

metricGroups.get("/", async (c) => {
  const groups = await listMetricGroups(c.env.DB, c.get("user").id);
  return c.json(groups.map(toPublicMetricGroup));
});

metricGroups.post("/", async (c) => {
  const parsed = createMetricGroupInputSchema.safeParse(await parseJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const group = await createMetricGroup(c.env.DB, c.get("user").id, parsed.data);
  return c.json(toPublicMetricGroup(group), 201);
});

metricGroups.patch("/:id", async (c) => {
  const parsed = updateMetricGroupInputSchema.safeParse(await parseJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const updated = await updateMetricGroup(
    c.env.DB,
    c.get("user").id,
    c.req.param("id"),
    parsed.data,
  );
  if (!updated) {
    return c.json({ error: "not_found" }, 404);
  }
  return c.json(toPublicMetricGroup(updated));
});

metricGroups.delete("/:id", async (c) => {
  const deleted = await deleteMetricGroup(c.env.DB, c.get("user").id, c.req.param("id"));
  if (!deleted) {
    return c.json({ error: "not_found" }, 404);
  }
  return c.body(null, 204);
});

export default metricGroups;
