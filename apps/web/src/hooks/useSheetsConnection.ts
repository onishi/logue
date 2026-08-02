import { useCallback, useEffect, useState } from "react";
import {
  disconnectSheets,
  getSheetsConnectionStatus,
  triggerSheetsSync,
  updateSheetsConnectionConfig,
  type SheetsConnectionStatus,
  type SheetsSyncResult,
} from "../lib/sheetsApi";

type Status = "loading" | "loaded" | "error";

export function useSheetsConnection(apiBaseUrl: string) {
  const [connection, setConnection] = useState<SheetsConnectionStatus>({ connected: false });
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await getSheetsConnectionStatus(apiBaseUrl);
      setConnection(result);
      setStatus("loaded");
    } catch {
      setStatus("error");
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const updateConfig = useCallback(
    async (input: { spreadsheetId?: string; sheetName?: string; syncEnabled?: boolean }) => {
      const updated = await updateSheetsConnectionConfig(apiBaseUrl, input);
      setConnection(updated);
      return updated;
    },
    [apiBaseUrl],
  );

  const sync = useCallback(async (): Promise<SheetsSyncResult> => {
    const result = await triggerSheetsSync(apiBaseUrl);
    await refresh();
    return result;
  }, [apiBaseUrl, refresh]);

  const disconnect = useCallback(async () => {
    await disconnectSheets(apiBaseUrl);
    await refresh();
  }, [apiBaseUrl, refresh]);

  return { connection, status, refresh, updateConfig, sync, disconnect };
}
