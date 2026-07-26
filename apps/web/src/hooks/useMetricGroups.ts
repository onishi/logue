import type { CreateMetricGroupInput, MetricGroup, UpdateMetricGroupInput } from "@logue/shared";
import { useCallback, useEffect, useState } from "react";
import {
  createMetricGroup,
  deleteMetricGroup,
  listMetricGroups,
  reorderMetricGroups,
  updateMetricGroup,
} from "../lib/metricGroupsApi";

type Status = "loading" | "loaded" | "error";

export function useMetricGroups(apiBaseUrl: string) {
  const [groups, setGroups] = useState<MetricGroup[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await listMetricGroups(apiBaseUrl);
      setGroups(result);
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
    async (input: CreateMetricGroupInput) => {
      const created = await createMetricGroup(apiBaseUrl, input);
      setGroups((prev) => [...prev, created]);
      return created;
    },
    [apiBaseUrl],
  );

  const update = useCallback(
    async (id: string, input: UpdateMetricGroupInput) => {
      const updated = await updateMetricGroup(apiBaseUrl, id, input);
      setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
      return updated;
    },
    [apiBaseUrl],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteMetricGroup(apiBaseUrl, id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    },
    [apiBaseUrl],
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      const reordered = await reorderMetricGroups(apiBaseUrl, orderedIds);
      setGroups(reordered);
    },
    [apiBaseUrl],
  );

  return { groups, status, refresh, create, update, remove, reorder };
}
