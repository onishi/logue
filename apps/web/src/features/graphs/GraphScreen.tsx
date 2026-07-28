import type { Metric } from "@logue/shared";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
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
  mergeSeriesForChart,
  movingAverage,
  seriesColorVar,
  toDailySeries,
  type Granularity,
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
  const colorByMetricId = useMemo(
    () => new Map(numberMetrics.map((m, index) => [m.id, seriesColorVar(index)])),
    [numberMetrics],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [movingAveragePreset, setMovingAveragePreset] = useState<number>(0);
  const [customWindow, setCustomWindow] = useState(14);
  const [showTable, setShowTable] = useState(false);

  const movingAverageWindow = movingAveragePreset === -1 ? customWindow : movingAveragePreset;

  const selectedMetrics = numberMetrics.filter((m) => selectedIds.has(m.id));

  const chartData = useMemo(() => {
    const seriesList = selectedMetrics.map((metric) => {
      const metricEntries = entries.filter((e) => e.metricId === metric.id);
      let series = toDailySeries(metricEntries);
      if (movingAverageWindow > 1) series = movingAverage(series, movingAverageWindow);
      series = aggregateByGranularity(series, granularity);
      return { metricId: metric.id, points: series };
    });
    return mergeSeriesForChart(seriesList);
  }, [selectedMetrics, entries, movingAverageWindow, granularity]);

  const toggleMetric = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (numberMetrics.length === 0) {
    return (
      <div className="screen">
        <h2>グラフ</h2>
        <p>数値型の記録項目がまだありません。「記録項目管理」から数値項目を追加してください。</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>グラフ</h2>

      <fieldset>
        <legend>表示する記録項目</legend>
        {numberMetrics.map((metric) => (
          <label key={metric.id}>
            <input
              type="checkbox"
              checked={selectedIds.has(metric.id)}
              onChange={() => toggleMetric(metric.id)}
            />
            {metric.name}
            {metric.unit ? `（${metric.unit}）` : ""}
          </label>
        ))}
      </fieldset>

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

      {selectedMetrics.length === 0 ? (
        <p>記録項目を1つ以上選択してください。</p>
      ) : showTable ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>日付</th>
                {selectedMetrics.map((metric) => (
                  <th key={metric.id}>
                    {metric.name}
                    {metric.unit ? `（${metric.unit}）` : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.label as string}>
                  <td>{row.label}</td>
                  {selectedMetrics.map((metric) => (
                    <td key={metric.id}>{formatValue(row[metric.id])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-card">
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text)" tick={{ fill: "var(--text)" }} />
                <YAxis stroke="var(--text)" tick={{ fill: "var(--text)" }} />
                <Tooltip formatter={(value: unknown) => formatValue(value)} />
                {selectedMetrics.length >= 2 && <Legend />}
                {selectedMetrics.map((metric) => (
                  <Line
                    key={metric.id}
                    type="monotone"
                    dataKey={metric.id}
                    name={metric.name}
                    stroke={colorByMetricId.get(metric.id)}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
