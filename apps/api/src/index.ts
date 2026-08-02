import { Hono } from "hono";
import { cors } from "hono/cors";
import authRoutes from "./auth/routes";
import entriesRoutes from "./entries/routes";
import { listEnabledGoogleSheetsConnections } from "./db/googleSheets";
import googleSheetsRoutes from "./googleSheets/routes";
import { syncUserSheets } from "./googleSheets/sync";
import metricGroupsRoutes from "./metricGroups/routes";
import metricsRoutes from "./metrics/routes";
import userSettingsRoutes from "./userSettings/routes";
import type { AuthVariables } from "./auth/middleware";
import type { Env } from "./env";

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
app.route("/api/user-settings", userSettingsRoutes);
app.route("/api/sheets", googleSheetsRoutes);

/** 1時間ごとの Cron Trigger から呼ばれ、連携が有効な全ユーザーのスプレッドシート同期を行う。
 * 1ユーザーの失敗が他のユーザーの同期を止めないよう、個別に catch する。 */
async function scheduled(_event: ScheduledController, env: Env): Promise<void> {
  const connections = await listEnabledGoogleSheetsConnections(env.DB);
  await Promise.all(
    connections.map(async (connection) => {
      try {
        await syncUserSheets(env, connection.user_id);
      } catch (error) {
        console.error(`スプレッドシート同期に失敗しました (user=${connection.user_id}):`, error);
      }
    }),
  );
}

// Cloudflare Workers のエントリーポイントは fetch/scheduled の両方を必要とするが、
// `.request()` を使う既存の各種テスト（`import app from "./index"`）を壊さないよう、
// Hono アプリ本体はそのまま default export しつつ scheduled をプロパティとして追加する。
export default Object.assign(app, { scheduled });
