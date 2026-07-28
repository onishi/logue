import type { Entry, Metric } from "@logue/shared";
import { useMemo, useState } from "react";
import { useEntries } from "../../hooks/useEntries";
import { useMetricGroups } from "../../hooks/useMetricGroups";
import { useMetrics } from "../../hooks/useMetrics";
import { MetricValueInput } from "./MetricValueInput";

function formatValue(metric: Metric | undefined, value: string): string {
  if (!metric) return value;
  if (metric.type === "choice") {
    return metric.choiceOptions.find((o) => o.id === value)?.label ?? value;
  }
  if (metric.type === "number") {
    return metric.unit ? `${value} ${metric.unit}` : value;
  }
  return value;
}

function EntryCell({
  metric,
  date,
  entry,
  onSave,
  onDelete,
}: {
  metric: Metric;
  date: string;
  entry: Entry | undefined;
  onSave: (value: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const startEditing = () => {
    setValue(entry?.value ?? "");
    setEditing(true);
  };

  if (editing) {
    return (
      <td>
        <MetricValueInput
          metric={metric}
          value={value}
          disabled={false}
          ariaLabel={`${metric.name}（${date}）`}
          onChange={setValue}
        />
        <button
          type="button"
          onClick={async () => {
            const trimmed = value.trim();
            if (trimmed) await onSave(trimmed);
            setEditing(false);
          }}
        >
          保存
        </button>
        <button type="button" onClick={() => setEditing(false)}>
          キャンセル
        </button>
      </td>
    );
  }

  if (!entry) {
    return (
      <td>
        <button type="button" onClick={startEditing} aria-label={`${metric.name}（${date}）を追加`}>
          追加
        </button>
      </td>
    );
  }

  return (
    <td>
      <span>{formatValue(metric, entry.value)}</span>
      <button type="button" onClick={startEditing} aria-label={`${metric.name}（${date}）を編集`}>
        編集
      </button>
      <button type="button" onClick={onDelete} aria-label={`${metric.name}（${date}）を削除`}>
        削除
      </button>
    </td>
  );
}

export function EntryListScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { groups } = useMetricGroups(apiBaseUrl);
  const { metrics } = useMetrics(apiBaseUrl);
  const { entries, create, remove } = useEntries(apiBaseUrl);

  const [groupFilter, setGroupFilter] = useState("");
  const [metricFilter, setMetricFilter] = useState("");

  const metricsInGroup = groupFilter
    ? metrics.filter((m) => m.metricGroupId === groupFilter)
    : metrics;

  // フィルタなしのときは全項目を列に出すと空欄だらけの巨大な表になるため、
  // 記録が1件もない項目は列から省く。グループ・記録項目で絞り込んだ場合はその範囲を尊重する。
  const metricColumns = useMemo(() => {
    const base = metricFilter
      ? metricsInGroup.filter((m) => m.id === metricFilter)
      : groupFilter
        ? metricsInGroup
        : metricsInGroup.filter((m) => entries.some((e) => e.metricId === m.id));
    return [...base].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [metricsInGroup, metricFilter, groupFilter, entries]);

  const columnMetricIds = useMemo(() => new Set(metricColumns.map((m) => m.id)), [metricColumns]);

  const entryByDateAndMetric = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const entry of entries) {
      if (columnMetricIds.has(entry.metricId)) {
        map.set(`${entry.recordedAt}|${entry.metricId}`, entry);
      }
    }
    return map;
  }, [entries, columnMetricIds]);

  const dates = useMemo(() => {
    const unique = new Set<string>();
    for (const entry of entries) {
      if (columnMetricIds.has(entry.metricId)) unique.add(entry.recordedAt);
    }
    return [...unique].sort().reverse();
  }, [entries, columnMetricIds]);

  return (
    <div className="screen">
      <h2>記録一覧</h2>
      <label>
        グループで絞り込み
        <select
          aria-label="グループで絞り込み"
          value={groupFilter}
          onChange={(e) => {
            setGroupFilter(e.target.value);
            setMetricFilter("");
          }}
        >
          <option value="">すべて</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        記録項目で絞り込み
        <select
          aria-label="記録項目で絞り込み"
          value={metricFilter}
          onChange={(e) => setMetricFilter(e.target.value)}
        >
          <option value="">すべて</option>
          {metricsInGroup.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      {metricColumns.length === 0 || dates.length === 0 ? (
        <p>記録がありません。</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>日付</th>
                {metricColumns.map((metric) => (
                  <th key={metric.id}>
                    {metric.name}
                    {metric.unit ? `（${metric.unit}）` : ""}
                    {metric.isArchived && " [アーカイブ済み]"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => (
                <tr key={date}>
                  <th scope="row">{date}</th>
                  {metricColumns.map((metric) => {
                    const entry = entryByDateAndMetric.get(`${date}|${metric.id}`);
                    return (
                      <EntryCell
                        key={metric.id}
                        metric={metric}
                        date={date}
                        entry={entry}
                        onSave={async (value) => {
                          await create({ metricId: metric.id, value, recordedAt: date });
                        }}
                        onDelete={() => {
                          if (entry) void remove(entry.id);
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
