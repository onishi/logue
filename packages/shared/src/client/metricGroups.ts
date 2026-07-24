import { z } from "zod";
import {
  metricGroupSchema,
  type CreateMetricGroupInput,
  type MetricGroup,
  type UpdateMetricGroupInput,
} from "../schemas/metricGroup";
import { apiRequest, type ApiClientOptions } from "./http";

export function createMetricGroupsClient(options: ApiClientOptions) {
  return {
    list: async (): Promise<MetricGroup[]> => {
      const body = await apiRequest(options, "/api/metric-groups");
      return z.array(metricGroupSchema).parse(body);
    },
    create: async (input: CreateMetricGroupInput): Promise<MetricGroup> => {
      const body = await apiRequest(options, "/api/metric-groups", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return metricGroupSchema.parse(body);
    },
    update: async (id: string, input: UpdateMetricGroupInput): Promise<MetricGroup> => {
      const body = await apiRequest(options, `/api/metric-groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return metricGroupSchema.parse(body);
    },
    remove: async (id: string): Promise<void> => {
      await apiRequest(options, `/api/metric-groups/${id}`, { method: "DELETE" });
    },
  };
}
