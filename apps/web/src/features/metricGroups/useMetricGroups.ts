import type { ApiClient } from "@logue/shared/client";
import type { CreateMetricGroupInput, MetricGroup, UpdateMetricGroupInput } from "@logue/shared";
import { useCallback, useEffect, useState } from "react";

export function useMetricGroups(client: ApiClient) {
  const [groups, setGroups] = useState<MetricGroup[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await client.metricGroups.list();
      setGroups([...result].sort((a, b) => a.sortOrder - b.sortOrder));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [client]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateMetricGroupInput) => {
      const created = await client.metricGroups.create(input);
      setGroups((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      return created;
    },
    [client],
  );

  const update = useCallback(
    async (id: string, input: UpdateMetricGroupInput) => {
      const updated = await client.metricGroups.update(id, input);
      setGroups((prev) =>
        prev
          .map((group) => (group.id === id ? updated : group))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
      return updated;
    },
    [client],
  );

  const remove = useCallback(
    async (id: string) => {
      await client.metricGroups.remove(id);
      setGroups((prev) => prev.filter((group) => group.id !== id));
    },
    [client],
  );

  return { groups, status, refresh, create, update, remove };
}
