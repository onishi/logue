import type { CreateMetricInput, Metric, UpdateMetricInput } from "@logue/shared";
import { useCallback, useEffect, useState } from "react";
import {
  createMetric,
  deleteMetric,
  listMetrics,
  reorderMetrics,
  updateMetric,
} from "../lib/metricsApi";

type Status = "loading" | "loaded" | "error";

export function useMetrics(apiBaseUrl: string) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await listMetrics(apiBaseUrl);
      setMetrics(result);
      setStatus("loaded");
    } catch {
      setStatus("error");
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateMetricInput) => {
      const created = await createMetric(apiBaseUrl, input);
      setMetrics((prev) => [...prev, created]);
      return created;
    },
    [apiBaseUrl],
  );

  const update = useCallback(
    async (id: string, input: UpdateMetricInput) => {
      const updated = await updateMetric(apiBaseUrl, id, input);
      setMetrics((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return updated;
    },
    [apiBaseUrl],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteMetric(apiBaseUrl, id);
      setMetrics((prev) => prev.filter((m) => m.id !== id));
    },
    [apiBaseUrl],
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      const reordered = await reorderMetrics(apiBaseUrl, orderedIds);
      setMetrics(reordered);
    },
    [apiBaseUrl],
  );

  return { metrics, status, refresh, create, update, remove, reorder };
}
