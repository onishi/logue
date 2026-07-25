import { z } from "zod";

export const metricTypeSchema = z.enum(["number", "choice", "text"]);
export type MetricType = z.infer<typeof metricTypeSchema>;

export const choiceOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  sortOrder: z.number().int(),
});
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;

export const metricSchema = z.object({
  id: z.string(),
  metricGroupId: z.string().nullable(),
  name: z.string(),
  type: metricTypeSchema,
  unit: z.string().nullable(),
  sortOrder: z.number().int(),
  isArchived: z.boolean(),
  choiceOptions: z.array(choiceOptionSchema),
});
export type Metric = z.infer<typeof metricSchema>;

export const createMetricInputSchema = z.object({
  metricGroupId: z.string().nullable().optional(),
  name: z.string().min(1),
  type: metricTypeSchema,
  unit: z.string().min(1).nullable().optional(),
  sortOrder: z.number().int().optional(),
  choiceOptions: z.array(z.object({ label: z.string().min(1) })).optional(),
});
export type CreateMetricInput = z.infer<typeof createMetricInputSchema>;

export const updateMetricInputSchema = z.object({
  metricGroupId: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  unit: z.string().min(1).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isArchived: z.boolean().optional(),
  choiceOptions: z.array(z.object({ label: z.string().min(1) })).optional(),
});
export type UpdateMetricInput = z.infer<typeof updateMetricInputSchema>;

export const reorderMetricsInputSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderMetricsInput = z.infer<typeof reorderMetricsInputSchema>;
