import type { Entry } from "../types/entry";
import type { Metric } from "../types/metric";
import { buildGridRows, metricColumnLabel, parseGridRows } from "../sheetGrid";

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

const archivedMetric: Metric = {
  id: "m3",
  metricGroupId: null,
  name: "旧項目",
  type: "text",
  unit: null,
  sortOrder: 2,
  isArchived: true,
  choiceOptions: [],
};

describe("metricColumnLabel", () => {
  it("includes the unit and archive marker", () => {
    expect(metricColumnLabel(weightMetric)).toBe("体重（kg）");
    expect(metricColumnLabel(conditionMetric)).toBe("体調");
    expect(metricColumnLabel(archivedMetric)).toBe("旧項目 [アーカイブ済み]");
  });
});

describe("buildGridRows", () => {
  it("builds a header row and date rows, formatting choice values as labels", () => {
    const entries: Entry[] = [
      { id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m2", value: "o1", recordedAt: "2026-07-02" },
    ];
    const rows = buildGridRows([weightMetric, conditionMetric], entries);
    expect(rows).toEqual([
      ["日付", "体重（kg）", "体調"],
      ["2026-07-02", "", "良い"],
      ["2026-07-01", "70", ""],
    ]);
  });

  it("writes number values without a unit suffix so they remain re-importable", () => {
    const entries: Entry[] = [
      { id: "e1", metricId: "m1", value: "70.5", recordedAt: "2026-07-01" },
    ];
    const rows = buildGridRows([weightMetric], entries);
    expect(rows[1]).toEqual(["2026-07-01", "70.5"]);
  });

  it("includes metrics with no entries as empty columns rather than dropping them", () => {
    const entries: Entry[] = [{ id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" }];
    const rows = buildGridRows([weightMetric, conditionMetric], entries);
    expect(rows[0]).toEqual(["日付", "体重（kg）", "体調"]);
  });
});

describe("parseGridRows", () => {
  const metrics = [weightMetric, conditionMetric];

  it("parses matching columns, skipping empty cells", () => {
    const rows = [
      ["日付", "体重（kg）", "体調"],
      ["2026-07-02", "", "良い"],
      ["2026-07-01", "70", ""],
    ];
    const result = parseGridRows(rows, metrics);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      { metricId: "m2", recordedAt: "2026-07-02", value: "o1" },
      { metricId: "m1", recordedAt: "2026-07-01", value: "70" },
    ]);
  });

  it("round-trips buildGridRows output back into the same entries", () => {
    const entries: Entry[] = [
      { id: "e1", metricId: "m1", value: "70.5", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m2", value: "o1", recordedAt: "2026-07-02" },
    ];
    const built = buildGridRows(metrics, entries);
    const result = parseGridRows(built, metrics);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        { metricId: "m1", recordedAt: "2026-07-01", value: "70.5" },
        { metricId: "m2", recordedAt: "2026-07-02", value: "o1" },
      ]),
    );
  });

  it("reports an issue when the header's first column is not 日付", () => {
    const result = parseGridRows([["date", "体重（kg）"]], metrics);
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["1列目のヘッダーは「日付」である必要があります。"]);
  });

  it("reports an issue for an unmatched column but keeps parsing others", () => {
    const rows = [
      ["日付", "体重（kg）", "不明な項目"],
      ["2026-07-01", "70", "x"],
    ];
    const result = parseGridRows(rows, metrics);
    expect(result.issues).toEqual([
      "列「不明な項目」に一致する記録項目が見つからないためスキップします。",
    ]);
    expect(result.rows).toEqual([{ metricId: "m1", recordedAt: "2026-07-01", value: "70" }]);
  });

  it("reports an issue for a malformed date", () => {
    const result = parseGridRows(
      [
        ["日付", "体重（kg）"],
        ["2026/07/01", "70"],
      ],
      metrics,
    );
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["2行目: 日付「2026/07/01」の形式が不正です（YYYY-MM-DD）。"]);
  });

  it("reports an issue for a non-numeric value in a number column", () => {
    const result = parseGridRows(
      [
        ["日付", "体重（kg）"],
        ["2026-07-01", "abc"],
      ],
      metrics,
    );
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["2行目「体重（kg）」: 数値「abc」が不正です。"]);
  });

  it("reports an issue for a choice value with no matching option", () => {
    const result = parseGridRows(
      [
        ["日付", "体調"],
        ["2026-07-01", "最高"],
      ],
      metrics,
    );
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["2行目「体調」: 選択肢「最高」が見つかりません。"]);
  });

  it("returns an issue for empty input", () => {
    const result = parseGridRows([], metrics);
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["データが空です。"]);
  });

  it("ignores blank trailing rows", () => {
    const result = parseGridRows([["日付", "体重（kg）"], ["2026-07-01", "70"], [""]], metrics);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([{ metricId: "m1", recordedAt: "2026-07-01", value: "70" }]);
  });
});
