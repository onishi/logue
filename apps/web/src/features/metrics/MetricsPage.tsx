import type { ApiClient } from "@logue/shared/client";
import type { CreateMetricInput, Metric } from "@logue/shared";
import { useState } from "react";
import { useMetricGroups } from "../metricGroups/useMetricGroups";
import { MetricGroupForm } from "../metricGroups/MetricGroupForm";
import { useMetrics } from "./useMetrics";
import { MetricForm } from "./MetricForm";
import { computeReorder } from "../../lib/reorder";

const VALUE_TYPE_LABELS: Record<Metric["valueType"], string> = {
  number: "数値",
  choice: "選択肢",
  text: "自由入力",
};

const UNGROUPED_KEY = "__ungrouped__";

export function MetricsPage({ client }: { client: ApiClient }) {
  const groupsHook = useMetricGroups(client);
  const metricsHook = useMetrics(client, { includeArchived: true });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [creatingMetricGroupId, setCreatingMetricGroupId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeMetrics = metricsHook.metrics.filter((metric) => !metric.isArchived);
  const archivedMetrics = metricsHook.metrics.filter((metric) => metric.isArchived);

  const bucketFor = (groupId: string | null) =>
    activeMetrics.filter(
      (metric) => (metric.groupId ?? UNGROUPED_KEY) === (groupId ?? UNGROUPED_KEY),
    );

  const handleDeleteMetric = async (id: string) => {
    if (!window.confirm("この記録項目を削除しますか？")) return;
    setActionError(null);
    try {
      await metricsHook.remove(id);
    } catch {
      setActionError("削除できませんでした。記録が存在する記録項目はアーカイブしてください。");
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm("このグループを削除しますか？内の記録項目は未分類になります。")) return;
    await groupsHook.remove(id);
    await metricsHook.refresh();
  };

  const handleReorderMetric = async (bucket: Metric[], index: number, direction: "up" | "down") => {
    const changes = computeReorder(bucket, index, direction);
    if (!changes) return;
    for (const change of changes) {
      await metricsHook.update(change.id, { sortOrder: change.sortOrder });
    }
  };

  const renderMetricRow = (metric: Metric, bucket: Metric[], index: number) => (
    <li key={metric.id} className="metric-row">
      {editingMetricId === metric.id ? (
        <MetricForm
          groups={groupsHook.groups}
          initial={metric}
          onSubmit={async (input) => {
            await metricsHook.update(metric.id, input);
            setEditingMetricId(null);
          }}
          onCancel={() => setEditingMetricId(null)}
        />
      ) : (
        <>
          <span className="metric-name">{metric.name}</span>
          <span className="metric-type">{VALUE_TYPE_LABELS[metric.valueType]}</span>
          {metric.unit && <span className="metric-unit">{metric.unit}</span>}
          <button type="button" onClick={() => void handleReorderMetric(bucket, index, "up")}>
            ↑
          </button>
          <button type="button" onClick={() => void handleReorderMetric(bucket, index, "down")}>
            ↓
          </button>
          <button type="button" onClick={() => setEditingMetricId(metric.id)}>
            編集
          </button>
          <button
            type="button"
            onClick={() => void metricsHook.update(metric.id, { isArchived: true })}
          >
            アーカイブ
          </button>
          <button type="button" onClick={() => void handleDeleteMetric(metric.id)}>
            削除
          </button>
        </>
      )}
    </li>
  );

  const renderMetricGroupSection = (groupId: string | null, title: string) => {
    const bucket = bucketFor(groupId);
    return (
      <section key={groupId ?? UNGROUPED_KEY} className="metric-group-section">
        <h4>{title}</h4>
        <ul>{bucket.map((metric, index) => renderMetricRow(metric, bucket, index))}</ul>
        {creatingMetricGroupId === (groupId ?? UNGROUPED_KEY) ? (
          <MetricForm
            groups={groupsHook.groups}
            defaultGroupId={groupId}
            onSubmit={async (input) => {
              // このフォームは initial を渡していないため、常に CreateMetricInput 形式で呼ばれる
              await metricsHook.create(input as CreateMetricInput);
              setCreatingMetricGroupId(null);
            }}
            onCancel={() => setCreatingMetricGroupId(null)}
          />
        ) : (
          <button type="button" onClick={() => setCreatingMetricGroupId(groupId ?? UNGROUPED_KEY)}>
            記録項目を追加
          </button>
        )}
      </section>
    );
  };

  return (
    <div className="metrics-page">
      {actionError && <p role="alert">{actionError}</p>}

      <section>
        <h3>グループ</h3>
        <ul>
          {groupsHook.groups.map((group, index) => (
            <li key={group.id} className="metric-group-row">
              {editingGroupId === group.id ? (
                <>
                  <input
                    value={editingGroupName}
                    onChange={(event) => setEditingGroupName(event.target.value)}
                    aria-label="グループ名"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const trimmed = editingGroupName.trim();
                      if (!trimmed) return;
                      await groupsHook.update(group.id, { name: trimmed });
                      setEditingGroupId(null);
                    }}
                  >
                    保存
                  </button>
                  <button type="button" onClick={() => setEditingGroupId(null)}>
                    キャンセル
                  </button>
                </>
              ) : (
                <>
                  <span>{group.name}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const changes = computeReorder(groupsHook.groups, index, "up");
                      if (!changes) return;
                      for (const change of changes) {
                        await groupsHook.update(change.id, { sortOrder: change.sortOrder });
                      }
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const changes = computeReorder(groupsHook.groups, index, "down");
                      if (!changes) return;
                      for (const change of changes) {
                        await groupsHook.update(change.id, { sortOrder: change.sortOrder });
                      }
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGroupId(group.id);
                      setEditingGroupName(group.name);
                    }}
                  >
                    名前を変更
                  </button>
                  <button type="button" onClick={() => void handleDeleteGroup(group.id)}>
                    削除
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <MetricGroupForm onSubmit={groupsHook.create} />
      </section>

      <section>
        <h3>記録項目</h3>
        {groupsHook.groups.map((group) => renderMetricGroupSection(group.id, group.name))}
        {renderMetricGroupSection(null, "未分類")}
      </section>

      {archivedMetrics.length > 0 && (
        <details>
          <summary>アーカイブ済み ({archivedMetrics.length})</summary>
          <ul>
            {archivedMetrics.map((metric) => (
              <li key={metric.id} className="metric-row">
                <span className="metric-name">{metric.name}</span>
                <button
                  type="button"
                  onClick={() => void metricsHook.update(metric.id, { isArchived: false })}
                >
                  復元
                </button>
                <button type="button" onClick={() => void handleDeleteMetric(metric.id)}>
                  削除
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
