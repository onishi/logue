import type { User } from "@logue/shared";
import { useEffect, useState } from "react";
import { Icon } from "./components/Icon";
import { UserMenu } from "./components/UserMenu";
import { BulkEntryScreen } from "./features/entries/BulkEntryScreen";
import { CsvScreen } from "./features/entries/CsvScreen";
import { EntryFormScreen } from "./features/entries/EntryFormScreen";
import { EntryListScreen } from "./features/entries/EntryListScreen";
import { GraphScreen } from "./features/graphs/GraphScreen";
import { MetricManagementScreen } from "./features/metrics/MetricManagementScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { useAuth } from "./hooks/useAuth";
import { useUserSettings } from "./hooks/useUserSettings";
import { entryDateFromSearch, pathForTab, tabFromPath, type TabKey } from "./lib/navigation";
import { handleRippleDown } from "./lib/ripple";

const TABS = [
  { key: "entry", label: "記録する", icon: "edit_square" },
  { key: "list", label: "記録一覧", icon: "list_alt" },
  { key: "graphs", label: "グラフ", icon: "monitoring" },
  { key: "metrics", label: "項目管理", icon: "sell" },
] as const;

function AuthenticatedApp({
  apiBaseUrl,
  user,
  onLogout,
}: {
  apiBaseUrl: string;
  user: User;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => tabFromPath(window.location.pathname));
  const [entryFormDate, setEntryFormDate] = useState<string | undefined>(() =>
    entryDateFromSearch(window.location.search),
  );
  const { settings, setTheme } = useUserSettings(apiBaseUrl);

  const navigate = (tab: TabKey, date?: string) => {
    window.history.pushState(null, "", pathForTab(tab, date));
    setActiveTab(tab);
    setEntryFormDate(date);
  };

  const editDate = (date: string) => {
    navigate("entry", date);
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(tabFromPath(window.location.pathname));
      setEntryFormDate(entryDateFromSearch(window.location.search));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
        <a
          href={pathForTab("entry")}
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("entry");
          }}
        >
          logue
        </a>
        <UserMenu
          user={user}
          onOpenMetrics={() => navigate("metrics")}
          onOpenCsv={() => navigate("csv")}
          onOpenSettings={() => navigate("settings")}
          onLogout={onLogout}
        />
      </header>

      <div className="app-content">
        {activeTab === "entry" && (
          <EntryFormScreen
            key={entryFormDate ?? "today"}
            apiBaseUrl={apiBaseUrl}
            initialDate={entryFormDate}
          />
        )}
        {activeTab === "list" && (
          <EntryListScreen
            apiBaseUrl={apiBaseUrl}
            onEditDate={editDate}
            onOpenBulk={() => navigate("bulk")}
          />
        )}
        {activeTab === "bulk" && <BulkEntryScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === "csv" && <CsvScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === "graphs" && <GraphScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === "metrics" && <MetricManagementScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === "settings" && (
          <SettingsScreen
            apiBaseUrl={apiBaseUrl}
            theme={settings.theme}
            onChangeTheme={(t) => void setTheme(t)}
          />
        )}
      </div>

      <nav className="tab-nav" aria-label="画面切り替え">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-current={activeTab === tab.key ? "page" : undefined}
            onClick={() => {
              // タブから直接「記録する」を開いたときは常に今日の日付にリセットする。
              navigate(tab.key);
            }}
          >
            <Icon name={tab.icon} className="tab-icon" />
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
      <main onPointerDown={handleRippleDown}>
        <AuthenticatedApp
          apiBaseUrl={apiBaseUrl}
          user={auth.user}
          onLogout={() => void auth.logout()}
        />
      </main>
    );
  }

  return (
    <main className="landing" onPointerDown={handleRippleDown}>
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
