import type { CreateMetricGroupInput, MetricGroup, UpdateMetricGroupInput } from "@logue/shared";
import { apiJson, jsonRequestInit } from "./apiClient";

export function listMetricGroups(baseUrl: string): Promise<MetricGroup[]> {
  return apiJson(baseUrl, "/api/metric-groups");
}

export function createMetricGroup(
  baseUrl: string,
  input: CreateMetricGroupInput,
): Promise<MetricGroup> {
  return apiJson(baseUrl, "/api/metric-groups", jsonRequestInit("POST", input));
}

export function updateMetricGroup(
  baseUrl: string,
  id: string,
  input: UpdateMetricGroupInput,
): Promise<MetricGroup> {
  return apiJson(baseUrl, `/api/metric-groups/${id}`, jsonRequestInit("PATCH", input));
}

export function deleteMetricGroup(baseUrl: string, id: string): Promise<void> {
  return apiJson(baseUrl, `/api/metric-groups/${id}`, { method: "DELETE" });
}

export function reorderMetricGroups(baseUrl: string, orderedIds: string[]): Promise<MetricGroup[]> {
  return apiJson(baseUrl, "/api/metric-groups/reorder", jsonRequestInit("PUT", { orderedIds }));
}
