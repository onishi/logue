import { z } from "zod";

export const themeSettingSchema = z.enum(["system", "light", "dark"]);
export type ThemeSetting = z.infer<typeof themeSettingSchema>;

export const userSettingsSchema = z.object({
  theme: themeSettingSchema,
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateUserSettingsInputSchema = z.object({
  theme: themeSettingSchema.optional(),
});
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsInputSchema>;
