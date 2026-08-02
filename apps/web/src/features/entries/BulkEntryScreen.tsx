import { useEffect, useMemo, useState } from "react";
import { useEntries } from "../../hooks/useEntries";
import { useMetrics } from "../../hooks/useMetrics";
import { shiftDate } from "../../lib/date";
import { MetricValueInput } from "./MetricValueInput";

const MAX_RANGE_DAYS = 90;

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// from〜to（両端含む、降順=直近日から）の日付一覧を返す。from > to の場合は空配列。
function buildDateRange(from: string, to: string): string[] {
  if (from > to) return [];
  const dates: string[] = [];
  let cursor = to;
  while (cursor >= from && dates.length <= MAX_RANGE_DAYS) {
    dates.push(cursor);
    cursor = shiftDate(cursor, -1);
  }
  return dates;
}

export function BulkEntryScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { metrics } = useMetrics(apiBaseUrl);
  const activeMetrics = useMemo(() => metrics.filter((m) => !m.isArchived), [metrics]);

  const [metricId, setMetricId] = useState("");
  const [from, setFrom] = useState(() => shiftDate(todayDateString(), -6));
  const [to, setTo] = useState(() => todayDateString());
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 記録項目が読み込まれたら最初の項目を初期選択する（未選択のままだと何も入力できないため）。
  useEffect(() => {
    if (!metricId && activeMetrics.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMetricId(activeMetrics[0]!.id);
    }
  }, [activeMetrics, metricId]);

  const metric = activeMetrics.find((m) => m.id === metricId);

  const {
    entries,
    status: entriesStatus,
    create,
    remove,
  } = useEntries(apiBaseUrl, { metricId, from, to });

  const entryByDate = useMemo(() => new Map(entries.map((e) => [e.recordedAt, e])), [entries]);

  // 選択中の項目・期間に既に記録済みの値をフォームへ反映する（同じ項目・同じ日は上書き保存になる）。
  useEffect(() => {
    if (entriesStatus !== "loaded") return;
    const next: Record<string, string> = {};
    for (const entry of entries) {
      next[entry.recordedAt] = entry.value;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(next);
  }, [entries, entriesStatus]);

  const dates = useMemo(() => buildDateRange(from, to), [from, to]);
  const invalidRange = from > to;
  const rangeTooLarge = !invalidRange && dates.length > MAX_RANGE_DAYS;
  const inputsDisabled = entriesStatus === "loading" || submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metric || invalidRange || rangeTooLarge) return;

    const toUpsert: { value: string; recordedAt: string }[] = [];
    const toDeleteIds: string[] = [];
    for (const date of dates) {
      const value = (values[date] ?? "").trim();
      const existing = entryByDate.get(date);
      if (value !== "") {
        toUpsert.push({ value, recordedAt: date });
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
        ...toUpsert.map((input) => create({ metricId: metric.id, ...input })),
        ...toDeleteIds.map((id) => remove(id)),
      ]);
      setMessage(`${toUpsert.length}件を記録しました`);
    } catch {
      setMessage("記録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (activeMetrics.length === 0) {
    return (
      <div className="screen">
        <h2>過去データを一括入力</h2>
        <p>記録項目がまだありません。「項目管理」から記録項目を追加してください。</p>
      </div>
    );
  }

  return (
    <form className="screen" onSubmit={(e) => void submit(e)}>
      <h2>過去データを一括入力</h2>
      <div className="control-group">
        <label>
          記録項目
          <select
            aria-label="一括入力する記録項目"
            value={metricId}
            onChange={(e) => setMetricId(e.target.value)}
          >
            {activeMetrics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.unit ? `（${m.unit}）` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          開始日
          <input
            aria-label="一括入力の開始日"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          終了日
          <input
            aria-label="一括入力の終了日"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>

      {invalidRange ? (
        <p role="alert">開始日は終了日より前の日付にしてください。</p>
      ) : rangeTooLarge ? (
        <p role="alert">
          一度に入力できるのは{MAX_RANGE_DAYS}日分までです。期間を短くしてください。
        </p>
      ) : (
        metric && (
          <div className="entry-fields">
            {dates.map((date) => (
              <label key={date} className="entry-field">
                <span className="field-label">{date}</span>
                <div className="entry-input-row">
                  <MetricValueInput
                    metric={metric}
                    value={values[date] ?? ""}
                    disabled={inputsDisabled}
                    ariaLabel={`${date} の記録`}
                    onChange={(value) => setValues((prev) => ({ ...prev, [date]: value }))}
                  />
                </div>
              </label>
            ))}
          </div>
        )
      )}

      <button type="submit" disabled={inputsDisabled || invalidRange || rangeTooLarge}>
        まとめて記録する
      </button>
      {entriesStatus === "loading" && <p>読み込み中...</p>}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
