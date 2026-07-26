import { z } from "zod";

export const metricGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
});
export type MetricGroup = z.infer<typeof metricGroupSchema>;

export const createMetricGroupInputSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});
export type CreateMetricGroupInput = z.infer<typeof createMetricGroupInputSchema>;

export const updateMetricGroupInputSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateMetricGroupInput = z.infer<typeof updateMetricGroupInputSchema>;

export const reorderMetricGroupsInputSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderMetricGroupsInput = z.infer<typeof reorderMetricGroupsInputSchema>;
