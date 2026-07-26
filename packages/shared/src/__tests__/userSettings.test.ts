import {
  themeSettingSchema,
  updateUserSettingsInputSchema,
  userSettingsSchema,
} from "../types/userSettings";

describe("userSettings schemas", () => {
  it("accepts the three known theme values", () => {
    for (const theme of ["system", "light", "dark"]) {
      expect(themeSettingSchema.safeParse(theme).success).toBe(true);
    }
    expect(themeSettingSchema.safeParse("blue").success).toBe(false);
  });

  it("validates a full settings object", () => {
    expect(userSettingsSchema.safeParse({ theme: "dark" }).success).toBe(true);
    expect(userSettingsSchema.safeParse({}).success).toBe(false);
  });

  it("allows an empty update input", () => {
    expect(updateUserSettingsInputSchema.safeParse({}).success).toBe(true);
    expect(updateUserSettingsInputSchema.safeParse({ theme: "light" }).success).toBe(true);
  });
});
