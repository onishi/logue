import type { Entry, Metric } from "@logue/shared";
import { useMemo, useState } from "react";
import { useEntries } from "../../hooks/useEntries";
import { useMetricGroups } from "../../hooks/useMetricGroups";
import { useMetrics } from "../../hooks/useMetrics";

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

function EntryRow({
  entry,
  metric,
  onDelete,
  onUpdate,
}: {
  entry: Entry;
  metric: Metric | undefined;
  onDelete: () => void;
  onUpdate: (value: string, recordedAt: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.value);
  const [recordedAt, setRecordedAt] = useState(entry.recordedAt);

  if (editing) {
    return (
      <li>
        <input
          aria-label={`${metric?.name ?? entry.metricId} の日付`}
          type="date"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
        />
        <input
          aria-label={`${metric?.name ?? entry.metricId} の値`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          onClick={async () => {
            await onUpdate(value, recordedAt);
            setEditing(false);
          }}
        >
          保存
        </button>
        <button type="button" onClick={() => setEditing(false)}>
          キャンセル
        </button>
      </li>
    );
  }

  return (
    <li>
      {entry.recordedAt} - {metric?.name ?? "(削除済みの記録項目)"}:{" "}
      {formatValue(metric, entry.value)}
      <button type="button" onClick={() => setEditing(true)}>
        編集
      </button>
      <button type="button" onClick={onDelete}>
        削除
      </button>
    </li>
  );
}

export function EntryListScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { groups } = useMetricGroups(apiBaseUrl);
  const { metrics } = useMetrics(apiBaseUrl);
  const { entries, update, remove } = useEntries(apiBaseUrl);

  const [groupFilter, setGroupFilter] = useState("");
  const [metricFilter, setMetricFilter] = useState("");

  const metricsById = useMemo(() => new Map(metrics.map((m) => [m.id, m])), [metrics]);

  const metricsInGroup = groupFilter
    ? metrics.filter((m) => m.metricGroupId === groupFilter)
    : metrics;

  const visibleEntries = entries
    .filter((e) =>
      metricFilter ? e.metricId === metricFilter : metricsInGroup.some((m) => m.id === e.metricId),
    )
    .slice()
    .reverse();

  return (
    <div>
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
      {visibleEntries.length === 0 ? (
        <p>記録がありません。</p>
      ) : (
        <ul>
          {visibleEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              metric={metricsById.get(entry.metricId)}
              onDelete={() => void remove(entry.id)}
              onUpdate={(value, recordedAt) => update(entry.id, { value, recordedAt })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
