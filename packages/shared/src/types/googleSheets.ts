import { z } from "zod";

export const updateGoogleSheetsConfigInputSchema = z.object({
  spreadsheetId: z.string().optional(),
  sheetName: z.string().optional(),
  syncEnabled: z.boolean().optional(),
});
export type UpdateGoogleSheetsConfigInput = z.infer<typeof updateGoogleSheetsConfigInputSchema>;
