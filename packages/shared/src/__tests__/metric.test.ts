import { createMetricInputSchema, metricSchema, updateMetricInputSchema } from "../types/metric";

describe("metric schemas", () => {
  it("accepts a valid metric", () => {
    const result = metricSchema.safeParse({
      id: "m1",
      metricGroupId: null,
      name: "体重",
      type: "number",
      unit: "kg",
      sortOrder: 0,
      isArchived: false,
      choiceOptions: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid metric type", () => {
    const result = createMetricInputSchema.safeParse({ name: "体重", type: "percentage" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty metric name on create", () => {
    const result = createMetricInputSchema.safeParse({ name: "", type: "text" });
    expect(result.success).toBe(false);
  });

  it("allows a partial update payload", () => {
    const result = updateMetricInputSchema.safeParse({ isArchived: true });
    expect(result.success).toBe(true);
  });
});
