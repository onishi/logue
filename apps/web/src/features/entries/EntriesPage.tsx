import type { ApiClient } from "@logue/shared/client";
import type { Entry, Metric } from "@logue/shared";
import { useState } from "react";
import { useMetrics } from "../metrics/useMetrics";
import { useEntries } from "./useEntries";
import { EntryValueInput, type EntryValuePayload } from "./EntryValueInput";

function formatRecordedAt(recordedAt: string): string {
  const date = new Date(recordedAt);
  return Number.isNaN(date.getTime()) ? recordedAt : date.toLocaleString("ja-JP");
}

function formatEntryValue(entry: Entry, metric: Metric | undefined): string {
  if (entry.valueNumber !== null) {
    return metric?.unit ? `${entry.valueNumber}${metric.unit}` : `${entry.valueNumber}`;
  }
  return entry.valueText ?? "";
}

export function EntriesPage({ client }: { client: ApiClient }) {
  const metricsHook = useMetrics(client, { includeArchived: true });
  const entriesHook = useEntries(client, { limit: 50 });
  const [drafts, setDrafts] = useState<Record<string, EntryValuePayload>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EntryValuePayload>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const activeMetrics = metricsHook.metrics.filter((metric) => !metric.isArchived);
  const metricById = new Map(metricsHook.metrics.map((metric) => [metric.id, metric]));

  const handleRecord = async (metric: Metric) => {
    const draft = drafts[metric.id] ?? {};
    if (draft.valueNumber === undefined && !draft.valueText) {
      return;
    }
    setActionError(null);
    try {
      await entriesHook.create({
        metricId: metric.id,
        valueNumber: draft.valueNumber,
        valueText: draft.valueText,
        recordedAt: new Date().toISOString(),
      });
      setDrafts((prev) => ({ ...prev, [metric.id]: {} }));
    } catch {
      setActionError("記録の保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この記録を削除しますか？")) return;
    await entriesHook.remove(id);
  };

  const startEdit = (entry: Entry) => {
    setEditingEntryId(entry.id);
    setEditDraft({
      valueNumber: entry.valueNumber ?? undefined,
      valueText: entry.valueText ?? undefined,
    });
  };

  const saveEdit = async (entry: Entry) => {
    setActionError(null);
    try {
      await entriesHook.update(entry.id, {
        valueNumber: editDraft.valueNumber,
        valueText: editDraft.valueText,
      });
      setEditingEntryId(null);
    } catch {
      setActionError("記録の更新に失敗しました");
    }
  };

  return (
    <div className="entries-page">
      {actionError && <p role="alert">{actionError}</p>}

      <section>
        <h3>記録する</h3>
        {activeMetrics.length === 0 && (
          <p>記録項目がまだありません。「記録項目管理」から追加してください。</p>
        )}
        <ul>
          {activeMetrics.map((metric) => (
            <li key={metric.id} className="entry-input-row">
              <span className="metric-name">{metric.name}</span>
              <EntryValueInput
                metric={metric}
                value={drafts[metric.id] ?? {}}
                onChange={(value) => setDrafts((prev) => ({ ...prev, [metric.id]: value }))}
              />
              <button type="button" onClick={() => void handleRecord(metric)}>
                記録する
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>最近の記録</h3>
        <ul>
          {entriesHook.entries.map((entry) => {
            const metric = metricById.get(entry.metricId);
            return (
              <li key={entry.id} className="entry-row">
                {editingEntryId === entry.id && metric ? (
                  <>
                    <EntryValueInput metric={metric} value={editDraft} onChange={setEditDraft} />
                    <button type="button" onClick={() => void saveEdit(entry)}>
                      保存
                    </button>
                    <button type="button" onClick={() => setEditingEntryId(null)}>
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <span className="entry-recorded-at">{formatRecordedAt(entry.recordedAt)}</span>
                    <span className="metric-name">{metric?.name ?? "(削除済み)"}</span>
                    <span className="entry-value">{formatEntryValue(entry, metric)}</span>
                    {metric && (
                      <button type="button" onClick={() => startEdit(entry)}>
                        編集
                      </button>
                    )}
                    <button type="button" onClick={() => void handleDelete(entry.id)}>
                      削除
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
