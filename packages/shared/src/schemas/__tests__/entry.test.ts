import { createEntryInputSchema } from "../entry";

describe("createEntryInputSchema", () => {
  it("accepts a numeric value", () => {
    const result = createEntryInputSchema.safeParse({ metricId: "m1", valueNumber: 65.5 });
    expect(result.success).toBe(true);
  });

  it("accepts a text value", () => {
    const result = createEntryInputSchema.safeParse({ metricId: "m1", valueText: "良い" });
    expect(result.success).toBe(true);
  });

  it("rejects when neither valueNumber nor valueText is given", () => {
    const result = createEntryInputSchema.safeParse({ metricId: "m1" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed recordedAt", () => {
    const result = createEntryInputSchema.safeParse({
      metricId: "m1",
      valueNumber: 1,
      recordedAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});
