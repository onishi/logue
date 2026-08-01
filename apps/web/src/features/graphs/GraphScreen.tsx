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
  const { metrics } = useMetrics(apiBaseUrl);
  const { entries } = useEntries(apiBaseUrl);

  const numberMetrics = useMemo(
    () =>
      metrics.filter((m): m is Metric & { type: "number" } => m.type === "number" && !m.isArchived),
    [metrics],
  );

  const [granularity, setGranularity] = useState<Granularity>("day");
  const [movingAveragePreset, setMovingAveragePreset] = useState<number>(0);
  const [customWindow, setCustomWindow] = useState(14);
  const [showTable, setShowTable] = useState(false);

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
        <label>
          表示単位
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
        </label>

        <label>
          移動平均
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
        </label>
        {movingAveragePreset === -1 && (
          <label>
            期間（日）
            <input
              aria-label="移動平均の期間（日）"
              type="number"
              min={2}
              value={customWindow}
              onChange={(e) => setCustomWindow(Number(e.target.value))}
            />
          </label>
        )}

        <button type="button" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "グラフで見る" : "表で見る"}
        </button>
      </div>

      {numberMetrics.map((metric, index) => {
        const series = seriesByMetricId.get(metric.id) ?? [];
        const label = metric.unit ? `${metric.name}（${metric.unit}）` : metric.name;
        return (
          <div key={metric.id} className="chart-card">
            <h3>{label}</h3>
            {series.length === 0 ? (
              <p>記録がありません。</p>
            ) : showTable ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>{label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((point) => (
                      <tr key={point.date}>
                        <td>{point.date}</td>
                        <td>{formatValue(point.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text)" tick={{ fill: "var(--text)" }} />
                    <YAxis stroke="var(--text)" tick={{ fill: "var(--text)" }} />
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
