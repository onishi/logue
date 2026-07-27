import type { ApiClient, ListEntriesParams } from "@logue/shared/client";
import type { CreateEntryInput, Entry, UpdateEntryInput } from "@logue/shared";
import { useCallback, useEffect, useState } from "react";

function byRecordedAtDesc(a: Entry, b: Entry): number {
  return b.recordedAt.localeCompare(a.recordedAt);
}

export function useEntries(client: ApiClient, params: ListEntriesParams = {}) {
  const { metricId, from, to, limit } = params;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await client.entries.list({ metricId, from, to, limit });
      setEntries([...result].sort(byRecordedAtDesc));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [client, metricId, from, to, limit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateEntryInput) => {
      const created = await client.entries.create(input);
      setEntries((prev) => [created, ...prev].sort(byRecordedAtDesc));
      return created;
    },
    [client],
  );

  const update = useCallback(
    async (id: string, input: UpdateEntryInput) => {
      const updated = await client.entries.update(id, input);
      setEntries((prev) =>
        prev.map((entry) => (entry.id === id ? updated : entry)).sort(byRecordedAtDesc),
      );
      return updated;
    },
    [client],
  );

  const remove = useCallback(
    async (id: string) => {
      await client.entries.remove(id);
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    },
    [client],
  );

  return { entries, status, refresh, create, update, remove };
}
