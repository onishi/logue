import { createMetricGroupInputSchema, reorderMetricGroupsInputSchema } from "../types/metricGroup";

describe("metricGroup schemas", () => {
  it("requires a non-empty name on create", () => {
    expect(createMetricGroupInputSchema.safeParse({ name: "体組成" }).success).toBe(true);
    expect(createMetricGroupInputSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("requires at least one id to reorder", () => {
    expect(reorderMetricGroupsInputSchema.safeParse({ orderedIds: ["g1"] }).success).toBe(true);
    expect(reorderMetricGroupsInputSchema.safeParse({ orderedIds: [] }).success).toBe(false);
  });
});
