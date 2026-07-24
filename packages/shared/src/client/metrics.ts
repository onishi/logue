import { z } from "zod";
import {
  metricSchema,
  type CreateMetricInput,
  type Metric,
  type UpdateMetricInput,
} from "../schemas/metric";
import { apiRequest, type ApiClientOptions } from "./http";

export function createMetricsClient(options: ApiClientOptions) {
  return {
    list: async (params: { includeArchived?: boolean } = {}): Promise<Metric[]> => {
      const query = params.includeArchived ? "?includeArchived=true" : "";
      const body = await apiRequest(options, `/api/metrics${query}`);
      return z.array(metricSchema).parse(body);
    },
    create: async (input: CreateMetricInput): Promise<Metric> => {
      const body = await apiRequest(options, "/api/metrics", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return metricSchema.parse(body);
    },
    update: async (id: string, input: UpdateMetricInput): Promise<Metric> => {
      const body = await apiRequest(options, `/api/metrics/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return metricSchema.parse(body);
    },
    remove: async (id: string): Promise<void> => {
      await apiRequest(options, `/api/metrics/${id}`, { method: "DELETE" });
    },
  };
}
