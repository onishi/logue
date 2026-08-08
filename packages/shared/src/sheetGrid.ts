import type { CreateEntryInput, Entry } from "./types/entry";
import type { Metric } from "./types/metric";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function metricColumnLabel(metric: Metric): string {
  return `${metric.name}${metric.unit ? `（${metric.unit}）` : ""}${metric.isArchived ? " [アーカイブ済み]" : ""}`;
}

function formatCellValue(metric: Metric, value: string): string {
  if (metric.type === "choice") {
    return metric.choiceOptions.find((o) => o.id === value)?.label ?? value;
  }
  return value;
}

/**
 * 記録項目×日付のグリッド（ヘッダー行＋日付ごとの行）を構築する。
 * CSVエクスポート画面の絞り込み（記録がある項目のみ表示）は適用しない。呼び出し側で
 * 表示用に絞り込みたい場合は、渡す metrics 自体を絞り込んでから呼び出す。
 */
export function buildGridRows(metrics: Metric[], entries: Entry[]): string[][] {
  const sortedMetrics = [...metrics].sort((a, b) => a.sortOrder - b.sortOrder);
  const metricById = new Map(sortedMetrics.map((m) => [m.id, m]));

  const entryByDateAndMetric = new Map<string, Entry>();
  const dates = new Set<string>();
  for (const entry of entries) {
    if (!metricById.has(entry.metricId)) continue;
    entryByDateAndMetric.set(`${entry.recordedAt}|${entry.metricId}`, entry);
    dates.add(entry.recordedAt);
  }
  const sortedDates = [...dates].sort().reverse();

  const header = ["日付", ...sortedMetrics.map(metricColumnLabel)];
  const body = sortedDates.map((date) => [
    date,
    ...sortedMetrics.map((metric) => {
      const entry = entryByDateAndMetric.get(`${date}|${metric.id}`);
      return entry ? formatCellValue(metric, entry.value) : "";
    }),
  ]);
  return [header, ...body];
}

export type GridParseResult = {
  rows: CreateEntryInput[];
  issues: string[];
};

/**
 * 数値セルをパースする。素の数値としてそのまま解釈できない場合、記録項目に単位が
 * 設定されていればセル末尾の単位表記（「70kg」「70 kg」など）を取り除いて再試行する
 * （エクスポート時の表示用フォーマットや、単位付きでコピペされた値を許容するため）。
 */
function parseNumberCell(raw: string, unit: string | null): string | null {
  if (raw !== "" && Number.isFinite(Number(raw))) return raw;
  if (unit && raw.endsWith(unit)) {
    const stripped = raw.slice(0, raw.length - unit.length).trim();
    if (stripped !== "" && Number.isFinite(Number(stripped))) return stripped;
  }
  return null;
}

/**
 * buildGridRows と対になるパーサー。CSVエクスポート/インポート・スプレッドシート同期の
 * 両方で共用する。空欄セルは「未入力」として読み飛ばすのみで、削除は行わない
 * （一部の列・行だけ埋まった状態でも安全に取り込めるようにするため）。
 */
export function parseGridRows(rows: string[][], metrics: Metric[]): GridParseResult {
  const table = rows.filter((row) => !(row.length === 1 && row[0] === ""));
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

  const result: CreateEntryInput[] = [];
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
        result.push({ metricId: metric.id, recordedAt: date, value: option.id });
        return;
      }

      if (metric.type === "number") {
        const value = parseNumberCell(raw, metric.unit);
        if (value === null) {
          issues.push(
            `${lineNumber}行目「${metricColumnLabel(metric)}」: 数値「${raw}」が不正です。`,
          );
          return;
        }
        result.push({ metricId: metric.id, recordedAt: date, value });
        return;
      }

      result.push({ metricId: metric.id, recordedAt: date, value: raw });
    });
  });

  return { rows: result, issues };
}
