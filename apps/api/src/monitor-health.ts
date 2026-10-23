import type { Env } from "./env";

/**
 * monitor.wagaya.org 向けの共通ヘルスチェック規格（Monitor Health Check Protocol v1）に
 * 沿ったレスポンスを返す。仕様: https://github.com/onishi/monitor/blob/main/SPEC.md#22
 *
 * - web: D1への疎通確認
 * - batch: 毎時0分のGoogleスプレッドシート同期Cron（google_sheets_connections）。
 *   連携を有効化しているユーザーがいない場合はbatchチェック自体を省略する。
 */

interface Check {
  id: string;
  type: "web" | "batch";
  name: string;
  status: "ok" | "warning" | "critical";
  message: string;
  last_success_at?: string;
  expected_interval_sec?: number;
  checked_at: string;
}

interface SheetsSyncSummary {
  enabled_count: number;
  error_count: number;
  last_synced_at: string | null;
}

export async function checkHealth(env: Env): Promise<Response> {
  const now = new Date().toISOString();
  const checks: Check[] = [];

  let webStatus: "ok" | "critical" = "ok";
  let webMessage = "D1への疎通に成功";
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{
      count: number;
    }>();
    if (!row) throw new Error("クエリ結果が空です");
  } catch (err) {
    webStatus = "critical";
    webMessage = `D1への疎通に失敗: ${err instanceof Error ? err.message : String(err)}`;
  }
  checks.push({
    id: "web-root",
    type: "web",
    name: "D1疎通確認",
    status: webStatus,
    message: webMessage,
    checked_at: now,
  });

  try {
    const row = await env.DB.prepare(
      `SELECT
         COUNT(*) AS enabled_count,
         SUM(CASE WHEN last_error IS NOT NULL THEN 1 ELSE 0 END) AS error_count,
         MAX(last_synced_at) AS last_synced_at
       FROM google_sheets_connections
       WHERE sync_enabled = 1`,
    ).first<SheetsSyncSummary>();

    if (row && row.enabled_count > 0) {
      const {
        enabled_count: enabledCount,
        error_count: errorCount,
        last_synced_at: lastSyncedAt,
      } = row;
      let status: "ok" | "warning" | "critical";
      if (errorCount === 0) status = "ok";
      else if (errorCount < enabledCount) status = "warning";
      else status = "critical";

      checks.push({
        id: "sheets-sync-batch",
        type: "batch",
        name: "Googleスプレッドシート同期（毎時0分）",
        status,
        message:
          errorCount === 0
            ? `有効な連携${enabledCount}件すべて同期成功`
            : `有効な連携${enabledCount}件中${errorCount}件でエラー`,
        ...(lastSyncedAt ? { last_success_at: new Date(lastSyncedAt).toISOString() } : {}),
        expected_interval_sec: 3600,
        checked_at: now,
      });
    }
  } catch (err) {
    checks.push({
      id: "sheets-sync-batch",
      type: "batch",
      name: "Googleスプレッドシート同期（毎時0分）",
      status: "critical",
      message: `連携状況の取得に失敗: ${err instanceof Error ? err.message : String(err)}`,
      checked_at: now,
    });
  }

  const overall = checks.some((c) => c.status === "critical")
    ? "critical"
    : checks.some((c) => c.status === "warning")
      ? "warning"
      : "ok";

  const body = {
    protocol_version: "1.0",
    service: { id: "logue", name: "logue", environment: "production" },
    generated_at: now,
    status: overall,
    checks,
    alert_urls: [
      {
        label: "Cloudflare Workers ダッシュボード",
        url: "https://dash.cloudflare.com/?to=/:account/workers/services/view/logue-api",
      },
      { label: "GitHub リポジトリ", url: "https://github.com/onishi/logue" },
    ],
  };

  return Response.json(body, { status: 200 });
}
