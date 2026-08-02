import type { Metric } from "@logue/shared";
import { parseEntriesCsv } from "../csvImport";

const weightMetric: Metric = {
  id: "m1",
  metricGroupId: "g1",
  name: "体重",
  type: "number",
  unit: "kg",
  sortOrder: 0,
  isArchived: false,
  choiceOptions: [],
};

const conditionMetric: Metric = {
  id: "m2",
  metricGroupId: "g2",
  name: "体調",
  type: "choice",
  unit: null,
  sortOrder: 1,
  isArchived: false,
  choiceOptions: [
    { id: "o1", label: "良い", sortOrder: 0 },
    { id: "o2", label: "普通", sortOrder: 1 },
  ],
};

const memoMetric: Metric = {
  id: "m3",
  metricGroupId: "g1",
  name: "メモ",
  type: "text",
  unit: null,
  sortOrder: 2,
  isArchived: false,
  choiceOptions: [],
};

const metrics = [weightMetric, conditionMetric, memoMetric];

describe("parseEntriesCsv", () => {
  it("parses matching columns into create-entry rows, skipping empty cells", () => {
    const csv = ["日付,体重（kg）,体調", "2026-07-02,,良い", "2026-07-01,70,"].join("\r\n");
    const result = parseEntriesCsv(csv, metrics);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      { metricId: "m2", recordedAt: "2026-07-02", value: "o1" },
      { metricId: "m1", recordedAt: "2026-07-01", value: "70" },
    ]);
  });

  it("round-trips text-type values", () => {
    const csv = ["日付,メモ", "2026-07-01,hello world"].join("\r\n");
    const result = parseEntriesCsv(csv, metrics);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      { metricId: "m3", recordedAt: "2026-07-01", value: "hello world" },
    ]);
  });

  it("reports an issue and returns no rows when the header's first column is not 日付", () => {
    const result = parseEntriesCsv("date,体重（kg）\n2026-07-01,70", metrics);
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["1列目のヘッダーは「日付」である必要があります。"]);
  });

  it("reports an issue for a column that doesn't match any metric, but keeps other columns", () => {
    const csv = ["日付,体重（kg）,不明な項目", "2026-07-01,70,x"].join("\r\n");
    const result = parseEntriesCsv(csv, metrics);
    expect(result.issues).toEqual([
      "列「不明な項目」に一致する記録項目が見つからないためスキップします。",
    ]);
    expect(result.rows).toEqual([{ metricId: "m1", recordedAt: "2026-07-01", value: "70" }]);
  });

  it("reports an issue for a malformed date and skips that row", () => {
    const csv = ["日付,体重（kg）", "2026/07/01,70"].join("\r\n");
    const result = parseEntriesCsv(csv, metrics);
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["2行目: 日付「2026/07/01」の形式が不正です（YYYY-MM-DD）。"]);
  });

  it("reports an issue for a non-numeric value in a number column", () => {
    const csv = ["日付,体重（kg）", "2026-07-01,abc"].join("\r\n");
    const result = parseEntriesCsv(csv, metrics);
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["2行目「体重（kg）」: 数値「abc」が不正です。"]);
  });

  it("reports an issue for a choice value that doesn't match any option", () => {
    const csv = ["日付,体調", "2026-07-01,最高"].join("\r\n");
    const result = parseEntriesCsv(csv, metrics);
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["2行目「体調」: 選択肢「最高」が見つかりません。"]);
  });

  it("returns an issue for empty input", () => {
    const result = parseEntriesCsv("", metrics);
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["データが空です。"]);
  });

  it("ignores blank trailing lines", () => {
    const csv = "日付,体重（kg）\n2026-07-01,70\n\n";
    const result = parseEntriesCsv(csv, metrics);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([{ metricId: "m1", recordedAt: "2026-07-01", value: "70" }]);
  });
});
