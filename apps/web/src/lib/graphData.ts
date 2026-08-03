export type Granularity = "day" | "week" | "month";

export type SeriesPoint = { date: string; value: number };

export type MetricSeries = { metricId: string; points: SeriesPoint[] };

function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function diffDays(laterDate: string, earlierDate: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (parseDateUTC(laterDate).getTime() - parseDateUTC(earlierDate).getTime()) / msPerDay,
  );
}

function isoWeekLabel(dateStr: string): string {
  const date = parseDateUTC(dateStr);
  const dayNr = (date.getUTCDay() + 6) % 7; // 月曜=0 … 日曜=6
  const thursday = new Date(date.getTime());
  thursday.setUTCDate(thursday.getUTCDate() - dayNr + 3);

  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);

  const weekNumber =
    1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${thursday.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/** entry の value を日付ごとに平均し、日次の時系列に変換する（数値に変換できない value は無視） */
export function toDailySeries(entries: { value: string; recordedAt: string }[]): SeriesPoint[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const entry of entries) {
    const value = Number(entry.value);
    if (!Number.isFinite(value)) continue;
    const bucket = buckets.get(entry.recordedAt) ?? { total: 0, count: 0 };
    bucket.total += value;
    bucket.count += 1;
    buckets.set(entry.recordedAt, bucket);
  }
  return [...buckets.entries()]
    .map(([date, { total, count }]) => ({ date, value: total / count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * windowDays 日の移動平均を算出する。データが欠けている日があっても、実際に存在する
 * データ点のうち直近 windowDays 暦日以内のものだけを平均する（カレンダー日ベース）。
 */
export function movingAverage(series: SeriesPoint[], windowDays: number): SeriesPoint[] {
  if (windowDays <= 1) return series;
  return series.map((point, index) => {
    let total = 0;
    let count = 0;
    for (let i = index; i >= 0; i--) {
      if (diffDays(point.date, series[i]!.date) >= windowDays) break;
      total += series[i]!.value;
      count += 1;
    }
    return { date: point.date, value: total / count };
  });
}

/** 日次の時系列を日別/週別/月別の粒度に集約する（週別/月別は期間内の値の平均） */
export function aggregateByGranularity(
  series: SeriesPoint[],
  granularity: Granularity,
): SeriesPoint[] {
  if (granularity === "day") return series;
  const buckets = new Map<string, { total: number; count: number }>();
  for (const point of series) {
    const label = granularity === "week" ? isoWeekLabel(point.date) : point.date.slice(0, 7);
    const bucket = buckets.get(label) ?? { total: 0, count: 0 };
    bucket.total += point.value;
    bucket.count += 1;
    buckets.set(label, bucket);
  }
  return [...buckets.entries()]
    .map(([date, { total, count }]) => ({ date, value: total / count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 複数 metric の時系列を、グラフ用に日付ラベルをキーとした1つの配列にまとめる */
export function mergeSeriesForChart(seriesList: MetricSeries[]): Record<string, number | string>[] {
  const labels = [...new Set(seriesList.flatMap((s) => s.points.map((p) => p.date)))].sort();
  return labels.map((label) => {
    const row: Record<string, number | string> = { label };
    for (const series of seriesList) {
      const point = series.points.find((p) => p.date === label);
      if (point) row[series.metricId] = point.value;
    }
    return row;
  });
}

/**
 * グラフのY軸の表示範囲を、系列の最小値〜最大値に対して上下20%の余白を持たせて算出する。
 * 最小値が0以上の場合は下限も0未満にはしない（マイナス側の余白を作らない）。
 * 値が全て同じ（レンジ0）の場合は、その値の20%（0の場合は1）を余白として使う。
 */
export function computeYAxisDomain(series: SeriesPoint[]): [number, number] | undefined {
  if (series.length === 0) return undefined;
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const padding = range > 0 ? range * 0.2 : Math.abs(min) * 0.2 || 1;
  const lower = min >= 0 ? Math.max(0, min - padding) : min - padding;
  return [lower, max + padding];
}

const SERIES_COLOR_SLOTS = 8;

/** metric の（選択状態に関わらない）固定インデックスから、常に同じ配色スロットを返す */
export function seriesColorVar(stableIndex: number): string {
  return `var(--series-${(stableIndex % SERIES_COLOR_SLOTS) + 1})`;
}
