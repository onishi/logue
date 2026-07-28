import type { User } from "@logue/shared";
import { useEffect, useState } from "react";
import { EntryFormScreen } from "./features/entries/EntryFormScreen";
import { EntryListScreen } from "./features/entries/EntryListScreen";
import { GraphScreen } from "./features/graphs/GraphScreen";
import { MetricManagementScreen } from "./features/metrics/MetricManagementScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { useAuth } from "./hooks/useAuth";
import { useUserSettings } from "./hooks/useUserSettings";

const TABS = [
  { key: "entry", label: "記録する", icon: "✏️" },
  { key: "list", label: "記録一覧", icon: "📋" },
  { key: "graphs", label: "グラフ", icon: "📈" },
  { key: "metrics", label: "項目管理", icon: "🏷️" },
  { key: "settings", label: "設定", icon: "⚙️" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AuthenticatedApp({
  apiBaseUrl,
  user,
  onLogout,
}: {
  apiBaseUrl: string;
  user: User;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("entry");
  const [entryFormDate, setEntryFormDate] = useState<string | undefined>(undefined);
  const { settings, setTheme } = useUserSettings(apiBaseUrl);

  const editDate = (date: string) => {
    setEntryFormDate(date);
    setActiveTab("entry");
  };

  useEffect(() => {
    if (settings.theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = settings.theme;
    }
  }, [settings.theme]);

  return (
    <div className="app">
      <h1 className="sr-only">logue</h1>
      <header className="app-header">
        <span className="brand" aria-hidden="true">
          logue
        </span>
        <div className="account-bar">
          <span className="account-name">{user.name ?? user.email} でログイン中</span>
          <button type="button" className="icon-button" onClick={onLogout} aria-label="ログアウト">
            ⏻
          </button>
        </div>
      </header>

      <div className="app-content">
        {activeTab === "entry" && (
          <EntryFormScreen
            key={entryFormDate ?? "today"}
            apiBaseUrl={apiBaseUrl}
            initialDate={entryFormDate}
          />
        )}
        {activeTab === "list" && <EntryListScreen apiBaseUrl={apiBaseUrl} onEditDate={editDate} />}
        {activeTab === "graphs" && <GraphScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === "metrics" && <MetricManagementScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === "settings" && (
          <SettingsScreen theme={settings.theme} onChangeTheme={(t) => void setTheme(t)} />
        )}
      </div>

      <nav className="tab-nav" aria-label="画面切り替え">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-current={activeTab === tab.key ? "page" : undefined}
            onClick={() => {
              // タブから直接「記録する」を開いたときは常に今日の日付にリセットする
              if (tab.key === "entry") setEntryFormDate(undefined);
              setActiveTab(tab.key);
            }}
          >
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function App({ apiBaseUrl }: { apiBaseUrl: string }) {
  const auth = useAuth(apiBaseUrl);

  if (auth.status === "authenticated") {
    return (
      <main>
        <AuthenticatedApp
          apiBaseUrl={apiBaseUrl}
          user={auth.user}
          onLogout={() => void auth.logout()}
        />
      </main>
    );
  }

  return (
    <main className="landing">
      <h1>logue</h1>
      <p>日常の記録をするアプリ</p>

      {auth.status === "loading" && <p>読み込み中...</p>}

      {auth.status === "unauthenticated" && (
        <button type="button" onClick={auth.login}>
          Google でログイン
        </button>
      )}
    </main>
  );
}

export default App;
