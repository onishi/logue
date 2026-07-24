import { z } from "zod";
import {
  entrySchema,
  type CreateEntryInput,
  type Entry,
  type UpdateEntryInput,
} from "../schemas/entry";
import { apiRequest, type ApiClientOptions } from "./http";

export type ListEntriesParams = {
  metricId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export function createEntriesClient(options: ApiClientOptions) {
  return {
    list: async (params: ListEntriesParams = {}): Promise<Entry[]> => {
      const query = new URLSearchParams();
      if (params.metricId) query.set("metricId", params.metricId);
      if (params.from) query.set("from", params.from);
      if (params.to) query.set("to", params.to);
      if (params.limit) query.set("limit", String(params.limit));
      const qs = query.toString();

      const body = await apiRequest(options, `/api/entries${qs ? `?${qs}` : ""}`);
      return z.array(entrySchema).parse(body);
    },
    create: async (input: CreateEntryInput): Promise<Entry> => {
      const body = await apiRequest(options, "/api/entries", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return entrySchema.parse(body);
    },
    update: async (id: string, input: UpdateEntryInput): Promise<Entry> => {
      const body = await apiRequest(options, `/api/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return entrySchema.parse(body);
    },
    remove: async (id: string): Promise<void> => {
      await apiRequest(options, `/api/entries/${id}`, { method: "DELETE" });
    },
  };
}
