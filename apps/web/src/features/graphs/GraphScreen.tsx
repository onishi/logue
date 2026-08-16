import type { Metric } from "@logue/shared";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEntries } from "../../hooks/useEntries";
import { useMetrics } from "../../hooks/useMetrics";
import {
  aggregateByGranularity,
  computeYAxisDomain,
  movingAverage,
  seriesColorVar,
  toDailySeries,
  type Granularity,
  type SeriesPoint,
} from "../../lib/graphData";

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "日別",
  week: "週別",
  month: "月別",
};

const MOVING_AVERAGE_PRESETS = [
  { value: 0, label: "なし" },
  { value: 7, label: "7日移動平均" },
  { value: 30, label: "30日移動平均" },
  { value: -1, label: "カスタム" },
] as const;

function formatValue(value: unknown): string {
  if (typeof value !== "number") return "";
  return Number(value.toFixed(2)).toString();
}

export function GraphScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { metrics, status: metricsStatus } = useMetrics(apiBaseUrl);
  const { entries, status: entriesStatus } = useEntries(apiBaseUrl);

  const numberMetrics = useMemo(
    () =>
      metrics.filter((m): m is Metric & { type: "number" } => m.type === "number" && !m.isArchived),
    [metrics],
  );

  const [granularity, setGranularity] = useState<Granularity>("day");
  const [movingAveragePreset, setMovingAveragePreset] = useState<number>(0);
  const [customWindow, setCustomWindow] = useState(14);

  const movingAverageWindow = movingAveragePreset === -1 ? customWindow : movingAveragePreset;

  const seriesByMetricId = useMemo(() => {
    const map = new Map<string, SeriesPoint[]>();
    for (const metric of numberMetrics) {
      const metricEntries = entries.filter((e) => e.metricId === metric.id);
      let series = toDailySeries(metricEntries);
      if (movingAverageWindow > 1) series = movingAverage(series, movingAverageWindow);
      series = aggregateByGranularity(series, granularity);
      map.set(metric.id, series);
    }
    return map;
  }, [numberMetrics, entries, movingAverageWindow, granularity]);

  if (metricsStatus === "loading") {
    return (
      <div className="screen">
        <h2>グラフ</h2>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (numberMetrics.length === 0) {
    return (
      <div className="screen">
        <h2>グラフ</h2>
        <p>数値型の記録項目がまだありません。「項目管理」から数値項目を追加してください。</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>グラフ</h2>

      <div className="control-group">
        <div className="control-group-row">
          <select
            aria-label="表示単位"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
          >
            {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((key) => (
              <option key={key} value={key}>
                {GRANULARITY_LABELS[key]}
              </option>
            ))}
          </select>
          <select
            aria-label="移動平均"
            value={movingAveragePreset}
            onChange={(e) => setMovingAveragePreset(Number(e.target.value))}
          >
            {MOVING_AVERAGE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        {movingAveragePreset === -1 && (
          <input
            aria-label="移動平均の期間（日）"
            type="number"
            min={2}
            value={customWindow}
            onChange={(e) => setCustomWindow(Number(e.target.value))}
          />
        )}
      </div>

      {numberMetrics.map((metric, index) => {
        const series = seriesByMetricId.get(metric.id) ?? [];
        const label = metric.unit ? `${metric.name}（${metric.unit}）` : metric.name;
        return (
          <div key={metric.id} className="chart-card">
            <h3>{label}</h3>
            {entriesStatus === "loading" ? (
              <p>読み込み中...</p>
            ) : series.length === 0 ? (
              <p>記録がありません。</p>
            ) : (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text)" tick={{ fill: "var(--text)" }} />
                    <YAxis
                      stroke="var(--text)"
                      tick={{ fill: "var(--text)" }}
                      domain={computeYAxisDomain(series)}
                    />
                    <Tooltip formatter={(value: unknown) => formatValue(value)} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={label}
                      stroke={seriesColorVar(index)}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
