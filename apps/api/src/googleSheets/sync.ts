import { buildGridRows, parseGridRows } from "@logue/shared";
import type { Env } from "../env";
import { decryptSecret } from "../crypto";
import { deleteEntry, listEntries, toPublicEntry, upsertEntry } from "../db/entries";
import {
  findGoogleSheetsConnection,
  updateGoogleSheetsSyncResult,
  type GoogleSheetsConnectionRow,
} from "../db/googleSheets";
import { listMetrics, toPublicMetric } from "../db/metrics";
import { refreshGoogleAccessToken } from "../auth/google";
import { type CellMap, cellKey, mergeCells } from "./merge";
import { clearAndWriteValues, getValues } from "./sheetsApi";

export type SyncResult = { ok: boolean; issues: string[] };

function toCellMap(rows: { metricId: string; recordedAt: string; value: string }[]): CellMap {
  const map: CellMap = new Map();
  for (const row of rows) {
    map.set(cellKey(row.metricId, row.recordedAt), row.value);
  }
  return map;
}

function parseSnapshot(json: string | null): CellMap {
  if (!json) return new Map();
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return new Map();
    return toCellMap(parsed as { metricId: string; recordedAt: string; value: string }[]);
  } catch {
    return new Map();
  }
}

function serializeSnapshot(cells: CellMap): string {
  const rows = [...cells.entries()].map(([key, value]) => {
    const [metricId, recordedAt] = key.split("|") as [string, string];
    return { metricId, recordedAt, value };
  });
  return JSON.stringify(rows);
}

function mapsEqual(a: CellMap, b: CellMap): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (b.get(key) !== value) return false;
  }
  return true;
}

export async function syncUserSheets(env: Env, userId: string): Promise<SyncResult> {
  const connection = await findGoogleSheetsConnection(env.DB, userId);
  if (!connection || !connection.spreadsheet_id) {
    return { ok: true, issues: [] };
  }

  try {
    const result = await runSync(env, userId, connection);
    await updateGoogleSheetsSyncResult(env.DB, userId, {
      lastSnapshotJson: result.snapshotJson,
      lastError: result.issues.length > 0 ? result.issues.join(" / ") : null,
    });
    return { ok: true, issues: result.issues };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGoogleSheetsSyncResult(env.DB, userId, {
      lastSnapshotJson: connection.last_snapshot_json ?? "[]",
      lastError: message,
    });
    return { ok: false, issues: [message] };
  }
}

async function runSync(
  env: Env,
  userId: string,
  connection: GoogleSheetsConnectionRow,
): Promise<{ snapshotJson: string; issues: string[] }> {
  const spreadsheetId = connection.spreadsheet_id!;
  const refreshToken = await decryptSecret(connection.refresh_token, env.SESSION_SECRET);
  const { access_token: accessToken } = await refreshGoogleAccessToken({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken,
  });

  const metricRows = await listMetrics(env.DB, userId);
  const metrics = await Promise.all(metricRows.map((row) => toPublicMetric(env.DB, row)));
  const entryRows = await listEntries(env.DB, userId, {});
  const entries = entryRows.map(toPublicEntry);

  const sheetGrid = await getValues(accessToken, spreadsheetId, connection.sheet_name);
  const { rows: sheetRows, issues } = parseGridRows(sheetGrid, metrics);

  const appMap = toCellMap(entries);
  const sheetMap = toCellMap(sheetRows);
  const snapshotMap = parseSnapshot(connection.last_snapshot_json);

  const merged = mergeCells(appMap, sheetMap, snapshotMap);

  // アプリ側へ反映（upsert/delete）
  const entryIdByKey = new Map(entries.map((e) => [cellKey(e.metricId, e.recordedAt), e.id]));
  const appKeys = new Set([...appMap.keys(), ...merged.keys()]);
  for (const key of appKeys) {
    const [metricId, recordedAt] = key.split("|") as [string, string];
    const mergedValue = merged.get(key);
    const appValue = appMap.get(key);
    if (mergedValue === appValue) continue;

    if (mergedValue === undefined) {
      const id = entryIdByKey.get(key);
      if (id) await deleteEntry(env.DB, userId, id);
    } else {
      await upsertEntry(env.DB, { userId, metricId, value: mergedValue, recordedAt });
    }
  }

  // シート側へ反映（内容が変わる場合のみ全体を洗い替え）
  if (!mapsEqual(merged, sheetMap)) {
    const mergedEntries = [...merged.entries()].map(([key, value]) => {
      const [metricId, recordedAt] = key.split("|") as [string, string];
      return { id: "", metricId, recordedAt, value };
    });
    const grid = buildGridRows(metrics, mergedEntries);
    await clearAndWriteValues(accessToken, spreadsheetId, connection.sheet_name, grid);
  }

  return { snapshotJson: serializeSnapshot(merged), issues };
}
