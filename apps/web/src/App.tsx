import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useApiClient } from "./hooks/useApiClient";
import { EntriesPage } from "./features/entries/EntriesPage";
import { MetricsPage } from "./features/metrics/MetricsPage";

type Tab = "entries" | "metrics";

function App({ apiBaseUrl }: { apiBaseUrl: string }) {
  const auth = useAuth(apiBaseUrl);
  const client = useApiClient(apiBaseUrl);
  const [tab, setTab] = useState<Tab>("entries");

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
            <button
              type="button"
              onClick={() => setTab("entries")}
              aria-current={tab === "entries"}
            >
              記録
            </button>
            <button
              type="button"
              onClick={() => setTab("metrics")}
              aria-current={tab === "metrics"}
            >
              記録項目管理
            </button>
          </nav>

          {tab === "entries" ? <EntriesPage client={client} /> : <MetricsPage client={client} />}
        </div>
      )}
    </main>
  );
}

export default App;
