import { entryDateFromSearch, pathForTab, tabFromPath } from "../navigation";

describe("navigation", () => {
  it("maps known paths to tabs and falls back to the entry screen", () => {
    expect(tabFromPath("/entries")).toBe("list");
    expect(tabFromPath("/unknown")).toBe("entry");
  });

  it("keeps a valid entry edit date in the URL", () => {
    expect(pathForTab("entry", "2026-07-15")).toBe("/?date=2026-07-15");
    expect(entryDateFromSearch("?date=2026-07-15")).toBe("2026-07-15");
    expect(entryDateFromSearch("?date=not-a-date")).toBeUndefined();
  });
});
