import { computeReorder } from "../reorder";

const ITEMS = [
  { id: "a", sortOrder: 0 },
  { id: "b", sortOrder: 1 },
  { id: "c", sortOrder: 2 },
];

describe("computeReorder", () => {
  it("swaps sortOrder with the previous item when moving up", () => {
    expect(computeReorder(ITEMS, 1, "up")).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);
  });

  it("swaps sortOrder with the next item when moving down", () => {
    expect(computeReorder(ITEMS, 1, "down")).toEqual([
      { id: "b", sortOrder: 2 },
      { id: "c", sortOrder: 1 },
    ]);
  });

  it("returns null when moving the first item up", () => {
    expect(computeReorder(ITEMS, 0, "up")).toBeNull();
  });

  it("returns null when moving the last item down", () => {
    expect(computeReorder(ITEMS, 2, "down")).toBeNull();
  });
});
