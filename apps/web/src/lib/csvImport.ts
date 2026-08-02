import type { CreateEntryInput, Metric } from "@logue/shared";
import { metricColumnLabel, parseCsv } from "./csv";

export type CsvImportResult = {
  rows: CreateEntryInput[];
  issues: string[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// CSVエクスポートと対になるインポート処理。
// 空欄のセルは「未入力」として読み飛ばすのみで、既存の記録を削除することはない
// （エクスポートしたCSVの一部の列・行だけを編集して再インポートしても安全なようにするため）。
export function parseEntriesCsv(csvText: string, metrics: Metric[]): CsvImportResult {
  const table = parseCsv(csvText).filter((row) => !(row.length === 1 && row[0] === ""));
  const issues: string[] = [];
  if (table.length === 0) {
    return { rows: [], issues: ["データが空です。"] };
  }

  const header = table[0]!;
  const body = table.slice(1);
  if ((header[0] ?? "") !== "日付") {
    issues.push("1列目のヘッダーは「日付」である必要があります。");
    return { rows: [], issues };
  }

  const labelToMetric = new Map(metrics.map((m) => [metricColumnLabel(m), m]));
  const columns: (Metric | undefined)[] = header.slice(1).map((label) => {
    const metric = labelToMetric.get(label);
    if (!metric) {
      issues.push(`列「${label}」に一致する記録項目が見つからないためスキップします。`);
    }
    return metric;
  });

  const rows: CreateEntryInput[] = [];
  body.forEach((line, bodyIndex) => {
    const lineNumber = bodyIndex + 2; // ヘッダー行を1行目として数える
    const date = line[0] ?? "";
    if (!DATE_PATTERN.test(date)) {
      issues.push(`${lineNumber}行目: 日付「${date}」の形式が不正です（YYYY-MM-DD）。`);
      return;
    }

    columns.forEach((metric, columnIndex) => {
      if (!metric) return;
      const raw = (line[columnIndex + 1] ?? "").trim();
      if (raw === "") return;

      if (metric.type === "choice") {
        const option = metric.choiceOptions.find((o) => o.label === raw);
        if (!option) {
          issues.push(
            `${lineNumber}行目「${metricColumnLabel(metric)}」: 選択肢「${raw}」が見つかりません。`,
          );
          return;
        }
        rows.push({ metricId: metric.id, recordedAt: date, value: option.id });
        return;
      }

      if (metric.type === "number") {
        if (!Number.isFinite(Number(raw))) {
          issues.push(
            `${lineNumber}行目「${metricColumnLabel(metric)}」: 数値「${raw}」が不正です。`,
          );
          return;
        }
        rows.push({ metricId: metric.id, recordedAt: date, value: raw });
        return;
      }

      rows.push({ metricId: metric.id, recordedAt: date, value: raw });
    });
  });

  return { rows, issues };
}
