import { z } from "zod";

export const entrySchema = z.object({
  id: z.string(),
  metricId: z.string(),
  value: z.string(),
  recordedAt: z.string(),
});
export type Entry = z.infer<typeof entrySchema>;

export const createEntryInputSchema = z.object({
  metricId: z.string().min(1),
  value: z.string().min(1),
  recordedAt: z.string().min(1),
});
export type CreateEntryInput = z.infer<typeof createEntryInputSchema>;

export const updateEntryInputSchema = z.object({
  value: z.string().min(1).optional(),
  recordedAt: z.string().min(1).optional(),
});
export type UpdateEntryInput = z.infer<typeof updateEntryInputSchema>;
