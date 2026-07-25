import { createEntryInputSchema, updateEntryInputSchema } from "../types/entry";

describe("entry schemas", () => {
  it("requires metricId, value and recordedAt on create", () => {
    expect(
      createEntryInputSchema.safeParse({ metricId: "m1", value: "70", recordedAt: "2026-07-20" })
        .success,
    ).toBe(true);
    expect(
      createEntryInputSchema.safeParse({ metricId: "m1", value: "", recordedAt: "2026-07-20" })
        .success,
    ).toBe(false);
  });

  it("allows an update with only one field", () => {
    expect(updateEntryInputSchema.safeParse({ value: "71" }).success).toBe(true);
    expect(updateEntryInputSchema.safeParse({}).success).toBe(true);
  });
});
