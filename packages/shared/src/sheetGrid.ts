import type { CreateEntryInput, Entry } from "./types/entry";
import type { Metric } from "./types/metric";

const DATE_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
// 末尾の曜日表記（「(火)」「（火）」など）を取り除く
const TRAILING_WEEKDAY_PATTERN = /[（(][^）)]*[）)]\s*$/;

export function metricColumnLabel(metric: Metric): string {
  return `${metric.name}${metric.unit ? `（${metric.unit}）` : ""}${metric.isArchived ? " [アーカイブ済み]" : ""}`;
}

/**
 * セルの日付表記を YYYY-MM-DD に正規化する。区切りは「-」「/」どちらも許容し、
 * 月・日はゼロ埋めなしでもよい。末尾に「(火)」のような曜日表記が付いていても取り除く。
 * 実在しない日付（2月30日など）は不正として null を返す。
 */
function normalizeDate(raw: string): string | null {
  const withoutWeekday = raw.replace(TRAILING_WEEKDAY_PATTERN, "").trim();
  const match = DATE_PATTERN.exec(withoutWeekday);
  if (!match) return null;
  const yearStr = match[1]!;
  const monthStr = match[2]!;
  const dayStr = match[3]!;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${yearStr}-${monthStr.padStart(2, "0")}-${dayStr.padStart(2, "0")}`;
}

function findMetricByName(nameToMetrics: Map<string, Metric[]>, label: string): Metric | undefined {
  const candidates = nameToMetrics.get(label);
  return candidates?.length === 1 ? candidates[0] : undefined;
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
  // 単位なしの項目名だけの列見出し（例:「体重」）も、単位付き列（「体重（kg）」）に
  // 一意に対応するなら受け入れる。同名項目が複数ある場合は曖昧なので対象外。
  const nameToMetrics = new Map<string, Metric[]>();
  for (const m of metrics) {
    const list = nameToMetrics.get(m.name);
    if (list) {
      list.push(m);
    } else {
      nameToMetrics.set(m.name, [m]);
    }
  }
  const columns: (Metric | undefined)[] = header.slice(1).map((label) => {
    const metric = labelToMetric.get(label) ?? findMetricByName(nameToMetrics, label);
    if (!metric) {
      issues.push(`列「${label}」に一致する記録項目が見つからないためスキップします。`);
    }
    return metric;
  });

  const result: CreateEntryInput[] = [];
  body.forEach((line, bodyIndex) => {
    const lineNumber = bodyIndex + 2; // ヘッダー行を1行目として数える
    const rawDate = (line[0] ?? "").trim();
    const date = normalizeDate(rawDate);
    if (!date) {
      issues.push(`${lineNumber}行目: 日付「${rawDate}」の形式が不正です（YYYY-MM-DD）。`);
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
