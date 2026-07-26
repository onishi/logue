import type { CreateMetricInput, Metric, UpdateMetricInput } from "@logue/shared";
import { apiJson, jsonRequestInit } from "./apiClient";

export function listMetrics(baseUrl: string): Promise<Metric[]> {
  return apiJson(baseUrl, "/api/metrics");
}

export function createMetric(baseUrl: string, input: CreateMetricInput): Promise<Metric> {
  return apiJson(baseUrl, "/api/metrics", jsonRequestInit("POST", input));
}

export function updateMetric(
  baseUrl: string,
  id: string,
  input: UpdateMetricInput,
): Promise<Metric> {
  return apiJson(baseUrl, `/api/metrics/${id}`, jsonRequestInit("PATCH", input));
}

export function deleteMetric(baseUrl: string, id: string): Promise<void> {
  return apiJson(baseUrl, `/api/metrics/${id}`, { method: "DELETE" });
}

export function reorderMetrics(baseUrl: string, orderedIds: string[]): Promise<Metric[]> {
  return apiJson(baseUrl, "/api/metrics/reorder", jsonRequestInit("PUT", { orderedIds }));
}
