import type { Metric } from "@logue/shared";
import { metricColumnLabel, parseCsv, parseTsv, toCsv } from "../csv";

describe("toCsv", () => {
  it("joins rows and fields with commas and CRLF", () => {
    expect(
      toCsv([
        ["日付", "体重（kg）"],
        ["2026-07-01", "70"],
        ["2026-07-02", "71.5"],
      ]),
    ).toBe("日付,体重（kg）\r\n2026-07-01,70\r\n2026-07-02,71.5");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(toCsv([["a,b", 'say "hi"', "line1\nline2"]])).toBe('"a,b","say ""hi""","line1\nline2"');
  });

  it("leaves plain fields (including empty ones) unquoted", () => {
    expect(toCsv([["体重", "", "70"]])).toBe("体重,,70");
  });
});

describe("parseCsv", () => {
  it("parses plain comma-separated rows split by CRLF", () => {
    expect(parseCsv("日付,体重（kg）\r\n2026-07-01,70\r\n2026-07-02,71.5")).toEqual([
      ["日付", "体重（kg）"],
      ["2026-07-01", "70"],
      ["2026-07-02", "71.5"],
    ]);
  });

  it("parses rows split by plain LF", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("unescapes quoted fields containing commas, quotes, or newlines", () => {
    expect(parseCsv('"a,b","say ""hi""","line1\nline2"')).toEqual([
      ["a,b", 'say "hi"', "line1\nline2"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    expect(parseCsv(`${String.fromCharCode(0xfeff)}a,b`)).toEqual([["a", "b"]]);
  });

  it("handles input without a trailing newline", () => {
    expect(parseCsv("a,b\n1,2\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("round-trips through toCsv", () => {
    const rows = [
      ["日付", "体重（kg）", "メモ"],
      ["2026-07-01", "70", "a,b\nc"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseTsv", () => {
  it("parses tab-separated rows split by CRLF", () => {
    expect(parseTsv("日付\t体重（kg）\r\n2026-07-01\t70\r\n2026-07-02\t71.5")).toEqual([
      ["日付", "体重（kg）"],
      ["2026-07-01", "70"],
      ["2026-07-02", "71.5"],
    ]);
  });

  it("parses rows split by plain LF", () => {
    expect(parseTsv("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    expect(parseTsv(`${String.fromCharCode(0xfeff)}a\tb`)).toEqual([["a", "b"]]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseTsv("")).toEqual([]);
  });
});

describe("metricColumnLabel", () => {
  const base: Metric = {
    id: "m1",
    metricGroupId: "g1",
    name: "体重",
    type: "number",
    unit: "kg",
    sortOrder: 0,
    isArchived: false,
    choiceOptions: [],
  };

  it("includes the unit in parentheses", () => {
    expect(metricColumnLabel(base)).toBe("体重（kg）");
  });

  it("omits the unit when absent", () => {
    expect(metricColumnLabel({ ...base, unit: null })).toBe("体重");
  });

  it("marks archived metrics", () => {
    expect(metricColumnLabel({ ...base, isArchived: true })).toBe("体重（kg） [アーカイブ済み]");
  });
});
