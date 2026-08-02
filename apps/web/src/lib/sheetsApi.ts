import { apiFetch, apiJson, apiUrl, jsonRequestInit } from "./apiClient";

export type SheetsConnectionStatus =
  | { connected: false }
  | {
      connected: true;
      spreadsheetId: string | null;
      sheetName: string;
      syncEnabled: boolean;
      lastSyncedAt: string | null;
      lastError: string | null;
    };

export type SheetsSyncResult = {
  ok: boolean;
  issues: string[];
  lastSyncedAt: string | null;
  lastError: string | null;
};

export function getSheetsConnectionStatus(baseUrl: string): Promise<SheetsConnectionStatus> {
  return apiJson(baseUrl, "/api/sheets");
}

export function updateSheetsConnectionConfig(
  baseUrl: string,
  input: { spreadsheetId?: string; sheetName?: string; syncEnabled?: boolean },
): Promise<SheetsConnectionStatus> {
  return apiJson(baseUrl, "/api/sheets", jsonRequestInit("PATCH", input));
}

export function triggerSheetsSync(baseUrl: string): Promise<SheetsSyncResult> {
  return apiJson(baseUrl, "/api/sheets/sync", { method: "POST" });
}

export async function disconnectSheets(baseUrl: string): Promise<void> {
  await apiFetch(baseUrl, "/api/sheets", { method: "DELETE" });
}

/** OAuth同意フローはフルページ遷移が必要なため fetch では扱わない。 */
export function sheetsConnectUrl(baseUrl: string): string {
  return apiUrl(baseUrl, "/api/sheets/connect");
}
