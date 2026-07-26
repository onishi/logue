import type { ThemeSetting, UserSettings } from "@logue/shared";
import { useCallback, useEffect, useState } from "react";
import { getUserSettings, updateUserSettings } from "../lib/userSettingsApi";

type Status = "loading" | "loaded" | "error";

export function useUserSettings(apiBaseUrl: string) {
  const [settings, setSettings] = useState<UserSettings>({ theme: "system" });
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await getUserSettings(apiBaseUrl);
      setSettings(result);
      setStatus("loaded");
    } catch {
      setStatus("error");
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const setTheme = useCallback(
    async (theme: ThemeSetting) => {
      // ラジオボタンなどの controlled input は onChange 内で同期的に state を更新しないと
      // ネイティブのトグルが直後に React によって元に戻されてしまうため、楽観的に反映する。
      setSettings({ theme });
      try {
        const updated = await updateUserSettings(apiBaseUrl, { theme });
        setSettings(updated);
        return updated;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [apiBaseUrl, refresh],
  );

  return { settings, status, refresh, setTheme };
}
