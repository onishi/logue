import { createMetricInputSchema } from "../metric";

describe("createMetricInputSchema", () => {
  it("accepts a number metric without choice options", () => {
    const result = createMetricInputSchema.safeParse({
      name: "体重",
      valueType: "number",
      unit: "kg",
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one choice option for choice metrics", () => {
    const result = createMetricInputSchema.safeParse({ name: "気分", valueType: "choice" });
    expect(result.success).toBe(false);
  });

  it("accepts a choice metric with choice options", () => {
    const result = createMetricInputSchema.safeParse({
      name: "気分",
      valueType: "choice",
      choiceOptions: ["good", "normal", "bad"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createMetricInputSchema.safeParse({ name: "", valueType: "text" });
    expect(result.success).toBe(false);
  });
});
