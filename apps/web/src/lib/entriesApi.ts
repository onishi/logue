import type { CreateEntryInput, Entry, UpdateEntryInput } from "@logue/shared";
import { apiJson, jsonRequestInit } from "./apiClient";

export function listEntries(
  baseUrl: string,
  filters: { metricId?: string; from?: string; to?: string } = {},
): Promise<Entry[]> {
  const params = new URLSearchParams();
  if (filters.metricId) params.set("metricId", filters.metricId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return apiJson(baseUrl, `/api/entries${query ? `?${query}` : ""}`);
}

export function createEntry(baseUrl: string, input: CreateEntryInput): Promise<Entry> {
  return apiJson(baseUrl, "/api/entries", jsonRequestInit("POST", input));
}

export function updateEntry(baseUrl: string, id: string, input: UpdateEntryInput): Promise<Entry> {
  return apiJson(baseUrl, `/api/entries/${id}`, jsonRequestInit("PATCH", input));
}

export function deleteEntry(baseUrl: string, id: string): Promise<void> {
  return apiJson(baseUrl, `/api/entries/${id}`, { method: "DELETE" });
}
