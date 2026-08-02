import type { ThemeSetting } from "@logue/shared";
import { useEffect, useState } from "react";
import { useSheetsConnection } from "../../hooks/useSheetsConnection";
import { sheetsConnectUrl } from "../../lib/sheetsApi";

const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: "system", label: "端末の設定に合わせる" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

function sheetsRedirectMessage(): string | null {
  const param = new URLSearchParams(window.location.search).get("sheets");
  if (param === "connected") {
    return "Googleスプレッドシートと連携しました。同期するスプレッドシートを設定してください。";
  }
  if (param === "no_refresh_token") {
    return "連携に失敗しました。もう一度お試しください。";
  }
  return null;
}

function SheetsConnectionSection({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { connection, status, updateConfig, sync, disconnect } = useSheetsConnection(apiBaseUrl);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [sheetNameInput, setSheetNameInput] = useState("logue");
  const [redirectMessage] = useState(sheetsRedirectMessage);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (connection.connected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpreadsheetInput(connection.spreadsheetId ?? "");
      setSheetNameInput(connection.sheetName);
    }
  }, [connection]);

  if (status === "loading") {
    return (
      <fieldset>
        <legend>Googleスプレッドシート連携</legend>
        <p>読み込み中...</p>
      </fieldset>
    );
  }

  if (!connection.connected) {
    return (
      <fieldset>
        <legend>Googleスプレッドシート連携</legend>
        <p>記録データをGoogleスプレッドシートと双方向に同期できます。</p>
        {redirectMessage && <p role="status">{redirectMessage}</p>}
        <a href={sheetsConnectUrl(apiBaseUrl)}>
          <button type="button">Googleスプレッドシートと連携する</button>
        </a>
      </fieldset>
    );
  }

  const saveConfig = async () => {
    try {
      await updateConfig({ spreadsheetId: spreadsheetInput, sheetName: sheetNameInput });
      setActionMessage("設定を保存しました");
    } catch {
      setActionMessage("設定の保存に失敗しました");
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setActionMessage(null);
    try {
      const result = await sync();
      setActionMessage(
        result.ok ? "同期しました" : `同期でエラーが発生しました: ${result.issues.join(" / ")}`,
      );
    } catch {
      setActionMessage("同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("スプレッドシート連携を解除しますか？")) return;
    await disconnect();
  };

  return (
    <fieldset>
      <legend>Googleスプレッドシート連携</legend>
      {redirectMessage && <p role="status">{redirectMessage}</p>}
      <label>
        スプレッドシートのURLまたはID
        <input
          aria-label="スプレッドシートのURLまたはID"
          value={spreadsheetInput}
          onChange={(e) => setSpreadsheetInput(e.target.value)}
        />
      </label>
      <label>
        シート（タブ）名
        <input
          aria-label="シート（タブ）名"
          value={sheetNameInput}
          onChange={(e) => setSheetNameInput(e.target.value)}
        />
      </label>
      <button type="button" onClick={() => void saveConfig()}>
        設定を保存
      </button>
      <label>
        <input
          type="checkbox"
          checked={connection.syncEnabled}
          onChange={(e) => void updateConfig({ syncEnabled: e.target.checked })}
        />
        自動同期を有効にする（1時間ごと）
      </label>
      <button type="button" onClick={() => void handleSyncNow()} disabled={syncing}>
        今すぐ同期
      </button>
      {connection.lastSyncedAt && (
        <p>最終同期: {new Date(connection.lastSyncedAt).toLocaleString()}</p>
      )}
      {connection.lastError && <p role="alert">{connection.lastError}</p>}
      {actionMessage && <p role="status">{actionMessage}</p>}
      <button type="button" className="button-danger" onClick={() => void handleDisconnect()}>
        連携を解除
      </button>
    </fieldset>
  );
}

export function SettingsScreen({
  apiBaseUrl,
  theme,
  onChangeTheme,
}: {
  apiBaseUrl: string;
  theme: ThemeSetting;
  onChangeTheme: (theme: ThemeSetting) => void;
}) {
  return (
    <div className="screen">
      <h2>設定</h2>
      <fieldset>
        <legend>テーマ</legend>
        {THEME_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={() => onChangeTheme(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <SheetsConnectionSection apiBaseUrl={apiBaseUrl} />
    </div>
  );
}
