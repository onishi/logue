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
  { key: "entry", label: "記録する" },
  { key: "list", label: "記録一覧" },
  { key: "graphs", label: "グラフ" },
  { key: "metrics", label: "記録項目管理" },
  { key: "settings", label: "設定" },
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
  const { settings, setTheme } = useUserSettings(apiBaseUrl);

  useEffect(() => {
    if (settings.theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = settings.theme;
    }
  }, [settings.theme]);

  return (
    <div className="app">
      <div className="account-bar">
        <p>{user.name ?? user.email} でログイン中</p>
        <button type="button" onClick={onLogout}>
          ログアウト
        </button>
      </div>

      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-current={activeTab === tab.key ? "page" : undefined}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "entry" && <EntryFormScreen apiBaseUrl={apiBaseUrl} />}
      {activeTab === "list" && <EntryListScreen apiBaseUrl={apiBaseUrl} />}
      {activeTab === "graphs" && <GraphScreen apiBaseUrl={apiBaseUrl} />}
      {activeTab === "metrics" && <MetricManagementScreen apiBaseUrl={apiBaseUrl} />}
      {activeTab === "settings" && (
        <SettingsScreen theme={settings.theme} onChangeTheme={(t) => void setTheme(t)} />
      )}
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
