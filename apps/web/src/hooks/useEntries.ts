import type { CreateEntryInput, Entry, UpdateEntryInput } from "@logue/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { createEntry, deleteEntry, listEntries, updateEntry } from "../lib/entriesApi";

type Status = "loading" | "loaded" | "error";

export type EntryFilters = { metricId?: string; from?: string; to?: string };

export function useEntries(apiBaseUrl: string, filters: EntryFilters = {}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const filterKey = `${filters.metricId ?? ""}|${filters.from ?? ""}|${filters.to ?? ""}`;
  // 日付の切り替えなどでリクエストが重なったとき、古いリクエストのレスポンスが後から届いて
  // 最新の結果を上書きしないよう、最後に発行したリクエストの結果だけを反映する
  const latestRequestId = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setStatus("loading");
    try {
      const result = await listEntries(apiBaseUrl, filters);
      if (requestId !== latestRequestId.current) return;
      setEntries(result);
      setStatus("loaded");
    } catch {
      if (requestId !== latestRequestId.current) return;
      setStatus("error");
    }
    // filters は filterKey の変化でのみ再生成すればよいため個別プロパティは依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, filterKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateEntryInput) => {
      const created = await createEntry(apiBaseUrl, input);
      await refresh();
      return created;
    },
    [apiBaseUrl, refresh],
  );

  const update = useCallback(
    async (id: string, input: UpdateEntryInput) => {
      await updateEntry(apiBaseUrl, id, input);
      await refresh();
    },
    [apiBaseUrl, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteEntry(apiBaseUrl, id);
      await refresh();
    },
    [apiBaseUrl, refresh],
  );

  return { entries, status, refresh, create, update, remove };
}
