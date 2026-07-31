import type { Metric, MetricGroup } from "@logue/shared";
import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { useEntries } from "../../hooks/useEntries";
import { useMetricGroups } from "../../hooks/useMetricGroups";
import { useMetrics } from "../../hooks/useMetrics";
import { MetricValueInput } from "./MetricValueInput";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
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

export function EntryFormScreen({
  apiBaseUrl,
  initialDate,
}: {
  apiBaseUrl: string;
  initialDate?: string;
}) {
  const { groups } = useMetricGroups(apiBaseUrl);
  const { metrics } = useMetrics(apiBaseUrl);

  const [recordedAt, setRecordedAt] = useState(initialDate ?? todayDateString());
  const {
    entries,
    status: entriesStatus,
    create,
    remove,
  } = useEntries(apiBaseUrl, { from: recordedAt, to: recordedAt });
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const entryByMetricId = new Map(entries.map((entry) => [entry.metricId, entry]));

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
    const allMetrics = sections.flatMap((s) => s.metrics);
    const toUpsert: { metricId: string; value: string }[] = [];
    const toDeleteIds: string[] = [];
    for (const metric of allMetrics) {
      const value = (values[metric.id] ?? "").trim();
      const existing = entryByMetricId.get(metric.id);
      if (value !== "") {
        toUpsert.push({ metricId: metric.id, value });
      } else if (existing) {
        // 既存の記録を空にして保存した場合は削除扱いにする
        toDeleteIds.push(existing.id);
      }
    }
    if (toUpsert.length === 0 && toDeleteIds.length === 0) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await Promise.all([
        ...toUpsert.map((input) => create({ ...input, recordedAt })),
        ...toDeleteIds.map((id) => remove(id)),
      ]);
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
        <h2 className="sr-only">記録する</h2>
        <p>記録項目がまだありません。「項目管理」から記録項目を追加してください。</p>
      </div>
    );
  }

  return (
    <form className="screen" onSubmit={(e) => void submit(e)}>
      <h2 className="sr-only">記録する</h2>
      <input
        aria-label="記録日"
        type="date"
        value={recordedAt}
        onChange={(e) => setRecordedAt(e.target.value)}
      />
      {sections.map(({ group, metrics: sectionMetrics }) => (
        <fieldset key={group?.id ?? "ungrouped"}>
          <legend>{group?.name ?? "未分類"}</legend>
          {sectionMetrics.map((metric) => (
            <label key={metric.id}>
              <span className="field-label">
                {metric.name}
                {metric.unit ? `（${metric.unit}）` : ""}
              </span>
              <div className="entry-input-row">
                <MetricValueInput
                  metric={metric}
                  value={values[metric.id] ?? ""}
                  disabled={inputsDisabled}
                  onChange={(value) => setValues((prev) => ({ ...prev, [metric.id]: value }))}
                />
                {(values[metric.id] ?? "") !== "" && (
                  <button
                    type="button"
                    className="icon-button button-danger"
                    disabled={inputsDisabled}
                    onClick={() => setValues((prev) => ({ ...prev, [metric.id]: "" }))}
                    aria-label={`${metric.name} の入力を消す`}
                  >
                    <Icon name="close" />
                  </button>
                )}
              </div>
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
