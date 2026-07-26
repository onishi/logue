import { useState } from "react";
import { EntryFormScreen } from "./features/entries/EntryFormScreen";
import { EntryListScreen } from "./features/entries/EntryListScreen";
import { MetricManagementScreen } from "./features/metrics/MetricManagementScreen";
import { useAuth } from "./hooks/useAuth";

const TABS = [
  { key: "entry", label: "記録する" },
  { key: "list", label: "記録一覧" },
  { key: "metrics", label: "記録項目管理" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function App({ apiBaseUrl }: { apiBaseUrl: string }) {
  const auth = useAuth(apiBaseUrl);
  const [activeTab, setActiveTab] = useState<TabKey>("entry");

  return (
    <main>
      <h1>logue</h1>
      <p>日常の記録をするアプリ</p>

      {auth.status === "loading" && <p>読み込み中...</p>}

      {auth.status === "unauthenticated" && (
        <button type="button" onClick={auth.login}>
          Google でログイン
        </button>
      )}

      {auth.status === "authenticated" && (
        <div>
          <p>{auth.user.name ?? auth.user.email} でログイン中</p>
          <button type="button" onClick={() => void auth.logout()}>
            ログアウト
          </button>

          <nav>
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
          {activeTab === "metrics" && <MetricManagementScreen apiBaseUrl={apiBaseUrl} />}
        </div>
      )}
    </main>
  );
}

export default App;
