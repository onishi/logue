import type { Metric, MetricGroup } from "@logue/shared";
import { useEffect, useState } from "react";
import { useEntries } from "../../hooks/useEntries";
import { useMetricGroups } from "../../hooks/useMetricGroups";
import { useMetrics } from "../../hooks/useMetrics";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function MetricInput({
  metric,
  value,
  disabled,
  onChange,
}: {
  metric: Metric;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (metric.type === "choice") {
    return (
      <select
        aria-label={metric.name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">未入力</option>
        {metric.choiceOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (metric.type === "number") {
    return (
      <input
        aria-label={metric.name}
        type="number"
        step="any"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      aria-label={metric.name}
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function groupedActiveMetrics(
  metrics: Metric[],
  groups: MetricGroup[],
): { group: MetricGroup | null; metrics: Metric[] }[] {
  const active = metrics.filter((m) => !m.isArchived);
  const sections = groups.map((group) => ({
    group,
    metrics: active.filter((m) => m.metricGroupId === group.id),
  }));
  const ungrouped = active.filter((m) => m.metricGroupId === null);
  return ungrouped.length > 0 ? [...sections, { group: null, metrics: ungrouped }] : sections;
}

export function EntryFormScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { groups } = useMetricGroups(apiBaseUrl);
  const { metrics } = useMetrics(apiBaseUrl);

  const [recordedAt, setRecordedAt] = useState(todayDateString());
  const {
    entries,
    status: entriesStatus,
    create,
  } = useEntries(apiBaseUrl, { from: recordedAt, to: recordedAt });
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 選択中の日付にすでに記録済みの値をフォームへ反映する（同じ項目・同じ日は上書き保存になる）。
  // 取得中は入力欄を disabled にしておき、読み込み完了前にユーザーが入力した内容を
  // この反映処理が上書きしてしまわないようにする。
  useEffect(() => {
    if (entriesStatus !== "loaded") return;
    const next: Record<string, string> = {};
    for (const entry of entries) {
      next[entry.metricId] = entry.value;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(next);
  }, [entries, entriesStatus]);

  const inputsDisabled = entriesStatus === "loading" || submitting;

  const sections = groupedActiveMetrics(metrics, groups).filter((s) => s.metrics.length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const changed = Object.entries(values).filter(([, value]) => value.trim() !== "");
    if (changed.length === 0) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await Promise.all(
        changed.map(([metricId, value]) => create({ metricId, value: value.trim(), recordedAt })),
      );
      setMessage("記録しました");
    } catch {
      setMessage("記録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (sections.length === 0) {
    return (
      <div className="screen">
        <h2>記録する</h2>
        <p>記録項目がまだありません。「記録項目管理」から記録項目を追加してください。</p>
      </div>
    );
  }

  return (
    <form className="screen" onSubmit={(e) => void submit(e)}>
      <h2>記録する</h2>
      <label>
        日付
        <input
          aria-label="記録日"
          type="date"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
        />
      </label>
      {sections.map(({ group, metrics: sectionMetrics }) => (
        <fieldset key={group?.id ?? "ungrouped"}>
          <legend>{group?.name ?? "未分類"}</legend>
          {sectionMetrics.map((metric) => (
            <label key={metric.id}>
              {metric.name}
              {metric.unit ? `（${metric.unit}）` : ""}
              <MetricInput
                metric={metric}
                value={values[metric.id] ?? ""}
                disabled={inputsDisabled}
                onChange={(value) => setValues((prev) => ({ ...prev, [metric.id]: value }))}
              />
            </label>
          ))}
        </fieldset>
      ))}
      <button type="submit" disabled={inputsDisabled}>
        記録する
      </button>
      {entriesStatus === "loading" && <p>読み込み中...</p>}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
