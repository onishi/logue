import { z } from "zod";

export const metricGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
});
export type MetricGroup = z.infer<typeof metricGroupSchema>;

export const createMetricGroupInputSchema = z.object({
  name: z.string().min(1).max(50),
});
export type CreateMetricGroupInput = z.infer<typeof createMetricGroupInputSchema>;

export const updateMetricGroupInputSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateMetricGroupInput = z.infer<typeof updateMetricGroupInputSchema>;
