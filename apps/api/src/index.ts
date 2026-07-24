import { Hono } from "hono";
import { cors } from "hono/cors";
import authRoutes from "./auth/routes";
import type { AuthVariables } from "./auth/middleware";
import type { Env } from "./env";
import metricGroupsRoutes from "./metricGroups/routes";
import metricsRoutes from "./metrics/routes";
import entriesRoutes from "./entries/routes";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("/api/*", (c, next) =>
  cors({
    origin: c.env.WEB_ORIGIN,
    credentials: true,
  })(c, next),
);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.route("/api/auth", authRoutes);
app.route("/api/metric-groups", metricGroupsRoutes);
app.route("/api/metrics", metricsRoutes);
app.route("/api/entries", entriesRoutes);

export default app;
