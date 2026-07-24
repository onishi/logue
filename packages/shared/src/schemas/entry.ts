import { z } from "zod";

export const entrySchema = z.object({
  id: z.string(),
  metricId: z.string(),
  valueNumber: z.number().nullable(),
  valueText: z.string().nullable(),
  recordedAt: z.string(),
});
export type Entry = z.infer<typeof entrySchema>;

export const createEntryInputSchema = z
  .object({
    metricId: z.string(),
    valueNumber: z.number().optional(),
    valueText: z.string().min(1).optional(),
    recordedAt: z.iso.datetime().optional(),
  })
  .refine((data) => data.valueNumber !== undefined || data.valueText !== undefined, {
    message: "valueNumber か valueText のいずれかを指定してください",
    path: ["valueNumber"],
  });
export type CreateEntryInput = z.infer<typeof createEntryInputSchema>;

export const updateEntryInputSchema = z.object({
  valueNumber: z.number().optional(),
  valueText: z.string().min(1).optional(),
  recordedAt: z.iso.datetime().optional(),
});
export type UpdateEntryInput = z.infer<typeof updateEntryInputSchema>;
