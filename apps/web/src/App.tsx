import { useAuth } from "./hooks/useAuth";

function App({ apiBaseUrl }: { apiBaseUrl: string }) {
  const auth = useAuth(apiBaseUrl);

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
        </div>
      )}
    </main>
  );
}

export default App;
