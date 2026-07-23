import type { User } from "@logue/shared";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiUrl } from "../lib/apiClient";

type AuthState =
  { status: "loading" } | { status: "authenticated"; user: User } | { status: "unauthenticated" };

export function useAuth(apiBaseUrl: string) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch(apiBaseUrl, "/api/auth/me");
      if (res.ok) {
        const user = (await res.json()) as User;
        setState({ status: "authenticated", user });
        return;
      }
    } catch {
      // ネットワークエラー時も未ログイン扱いにする
    }
    setState({ status: "unauthenticated" });
  }, [apiBaseUrl]);

  useEffect(() => {
    // データ取得ライブラリを導入するまでの暫定実装。マウント時に認証状態を取得する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const login = useCallback(() => {
    window.location.href = apiUrl(apiBaseUrl, "/api/auth/login");
  }, [apiBaseUrl]);

  const logout = useCallback(async () => {
    await apiFetch(apiBaseUrl, "/api/auth/logout", { method: "POST" });
    setState({ status: "unauthenticated" });
  }, [apiBaseUrl]);

  return { ...state, login, logout, refresh };
}
