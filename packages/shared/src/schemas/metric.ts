import { z } from "zod";

export const valueTypeSchema = z.enum(["number", "choice", "text"]);
export type ValueType = z.infer<typeof valueTypeSchema>;

export const choiceOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  sortOrder: z.number().int(),
});
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;

export const metricSchema = z.object({
  id: z.string(),
  groupId: z.string().nullable(),
  name: z.string(),
  valueType: valueTypeSchema,
  unit: z.string().nullable(),
  sortOrder: z.number().int(),
  isArchived: z.boolean(),
  choiceOptions: z.array(choiceOptionSchema),
});
export type Metric = z.infer<typeof metricSchema>;

const choiceOptionLabelSchema = z.string().min(1).max(50);

export const createMetricInputSchema = z
  .object({
    name: z.string().min(1).max(50),
    valueType: valueTypeSchema,
    unit: z.string().min(1).max(20).nullable().optional(),
    groupId: z.string().nullable().optional(),
    choiceOptions: z.array(choiceOptionLabelSchema).optional(),
  })
  .refine((data) => data.valueType !== "choice" || (data.choiceOptions?.length ?? 0) > 0, {
    message: "choice タイプには選択肢を1つ以上指定してください",
    path: ["choiceOptions"],
  });
export type CreateMetricInput = z.infer<typeof createMetricInputSchema>;

export const updateMetricInputSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  unit: z.string().min(1).max(20).nullable().optional(),
  groupId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isArchived: z.boolean().optional(),
  choiceOptions: z.array(choiceOptionLabelSchema).optional(),
});
export type UpdateMetricInput = z.infer<typeof updateMetricInputSchema>;
