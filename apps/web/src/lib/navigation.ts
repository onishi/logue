export const TAB_PATHS = {
  entry: "/",
  list: "/entries",
  graphs: "/graphs",
  metrics: "/metrics",
  settings: "/settings",
} as const;

export type TabKey = keyof typeof TAB_PATHS;

const PATH_TABS = new Map<string, TabKey>(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as TabKey]),
);

export function tabFromPath(pathname: string): TabKey {
  return PATH_TABS.get(pathname) ?? "entry";
}

export function entryDateFromSearch(search: string): string | undefined {
  const date = new URLSearchParams(search).get("date");
  return date !== null && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

export function pathForTab(tab: TabKey, entryDate?: string): string {
  const path = TAB_PATHS[tab];
  return tab === "entry" && entryDate ? `${path}?date=${encodeURIComponent(entryDate)}` : path;
}
