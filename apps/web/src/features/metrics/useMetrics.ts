import type { ApiClient } from "@logue/shared/client";
import type { CreateMetricInput, Metric, UpdateMetricInput } from "@logue/shared";
import { useCallback, useEffect, useState } from "react";

export function useMetrics(client: ApiClient, options: { includeArchived?: boolean } = {}) {
  const { includeArchived = false } = options;
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await client.metrics.list({ includeArchived });
      setMetrics([...result].sort((a, b) => a.sortOrder - b.sortOrder));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [client, includeArchived]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateMetricInput) => {
      const created = await client.metrics.create(input);
      setMetrics((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      return created;
    },
    [client],
  );

  const update = useCallback(
    async (id: string, input: UpdateMetricInput) => {
      const updated = await client.metrics.update(id, input);
      setMetrics((prev) =>
        prev
          .map((metric) => (metric.id === id ? updated : metric))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
      return updated;
    },
    [client],
  );

  const remove = useCallback(
    async (id: string) => {
      await client.metrics.remove(id);
      setMetrics((prev) => prev.filter((metric) => metric.id !== id));
    },
    [client],
  );

  return { metrics, status, refresh, create, update, remove };
}
