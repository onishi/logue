import { shiftDate } from "../date";

describe("shiftDate", () => {
  it("moves forward by one day", () => {
    expect(shiftDate("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("moves backward by one day", () => {
    expect(shiftDate("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("crosses a year boundary", () => {
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("returns the same date when shifting by zero", () => {
    expect(shiftDate("2026-02-15", 0)).toBe("2026-02-15");
  });
});
