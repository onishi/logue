import type { CreateMetricInput, Metric, MetricGroup, MetricType } from "@logue/shared";
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useDragReorder } from "../../hooks/useDragReorder";
import { useMetricGroups } from "../../hooks/useMetricGroups";
import { useMetrics } from "../../hooks/useMetrics";

const METRIC_TYPE_LABELS: Record<MetricType, string> = {
  number: "数値",
  choice: "選択肢",
  text: "自由入力",
};

function LabelListEditor({
  labels,
  onChange,
}: {
  labels: string[];
  onChange: (labels: string[]) => void;
}) {
  return (
    <div>
      {labels.map((label, index) => (
        <div key={index} className="entry-input-row">
          <input
            aria-label={`選択肢 ${index + 1}`}
            value={label}
            onChange={(e) => {
              const next = [...labels];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            className="icon-button button-danger"
            onClick={() => onChange(labels.filter((_, i) => i !== index))}
            aria-label={`選択肢 ${index + 1} を削除`}
          >
            <Icon name="close" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...labels, ""])}>
        選択肢を追加
      </button>
    </div>
  );
}

function GroupRow({
  group,
  onRename,
  onDelete,
  isDragging,
  isDropTarget,
  dragHandleProps,
}: {
  group: MetricGroup;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
  dragHandleProps: { onPointerDown: (e: React.PointerEvent) => void };
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  if (editing) {
    return (
      <li data-drag-id={group.id}>
        <div className="row-header">
          <input
            aria-label={`${group.name} の新しい名前`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="icon-button button-danger"
            onClick={onDelete}
            aria-label={`${group.name} を削除`}
          >
            <Icon name="delete" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`${group.name} の編集をキャンセル`}
            onClick={() => {
              setName(group.name);
              setEditing(false);
            }}
          >
            <Icon name="close" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`${group.name} の変更を保存`}
            onClick={async () => {
              await onRename(name);
              setEditing(false);
            }}
          >
            <Icon name="check" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      data-drag-id={group.id}
      className={
        [isDragging && "dragging", isDropTarget && "drop-target"].filter(Boolean).join(" ") ||
        undefined
      }
    >
      <div className="row-header">
        <button
          type="button"
          className="icon-button drag-handle"
          aria-label={`${group.name} をドラッグして並び替え`}
          {...dragHandleProps}
        >
          <Icon name="drag_indicator" />
        </button>
        <span className="row-summary">{group.name}</span>
        <div className="row-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setEditing(true)}
            aria-label={`${group.name} を編集`}
          >
            <Icon name="edit_square" />
          </button>
        </div>
      </div>
    </li>
  );
}

function GroupManager({
  groups,
  create,
  update,
  remove,
  reorder,
}: {
  groups: MetricGroup[];
  create: ReturnType<typeof useMetricGroups>["create"];
  update: ReturnType<typeof useMetricGroups>["update"];
  remove: ReturnType<typeof useMetricGroups>["remove"];
  reorder: ReturnType<typeof useMetricGroups>["reorder"];
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const { displayItems, draggingId, overId, dragHandleProps } = useDragReorder(
    groups,
    (orderedIds) => void reorder(orderedIds),
  );

  return (
    <section>
      <h2>記録項目グループ</h2>
      <ul>
        {displayItems.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            onRename={async (name) => {
              if (name.trim()) await update(group.id, { name: name.trim() });
            }}
            onDelete={() => {
              if (window.confirm(`グループ「${group.name}」を削除しますか？`))
                void remove(group.id);
            }}
            isDragging={draggingId === group.id}
            isDropTarget={overId === group.id}
            dragHandleProps={dragHandleProps(group.id)}
          />
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newGroupName.trim()) return;
          void create({ name: newGroupName.trim() }).then(() => setNewGroupName(""));
        }}
      >
        <input
          aria-label="新しいグループ名"
          placeholder="新しいグループ名"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <button type="submit">グループを追加</button>
      </form>
    </section>
  );
}

function metricGroupLabel(groups: MetricGroup[], metricGroupId: string | null): string {
  if (metricGroupId === null) return "未分類";
  return groups.find((g) => g.id === metricGroupId)?.name ?? "未分類";
}

function MetricGeneralFields({
  metric,
  groups,
  onSave,
  onCancel,
}: {
  metric: Metric;
  groups: MetricGroup[];
  onSave: (input: {
    name: string;
    unit: string | null;
    metricGroupId: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(metric.name);
  const [unit, setUnit] = useState(metric.unit ?? "");
  const [metricGroupId, setMetricGroupId] = useState(metric.metricGroupId ?? "");

  return (
    <div className="edit-section">
      <label>
        名前
        <input
          aria-label={`${metric.name} の新しい名前`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {metric.type === "number" && (
        <label>
          単位
          <input
            aria-label={`${metric.name} の単位`}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </label>
      )}
      <label>
        グループ
        <select
          aria-label={`${metric.name} のグループ`}
          value={metricGroupId}
          onChange={(e) => setMetricGroupId(e.target.value)}
        >
          <option value="">未分類</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <div className="panel-actions">
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label={`${metric.name} の編集をキャンセル`}
        >
          <Icon name="close" />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={`${metric.name} の変更を保存`}
          onClick={async () => {
            if (!name.trim()) return;
            await onSave({
              name: name.trim(),
              unit: unit.trim() || null,
              metricGroupId: metricGroupId || null,
            });
          }}
        >
          <Icon name="check" />
        </button>
      </div>
    </div>
  );
}

function MetricChoiceOptionsEditor({
  metric,
  onSave,
}: {
  metric: Metric;
  onSave: (labels: string[]) => Promise<void>;
}) {
  const [labels, setLabels] = useState(metric.choiceOptions.map((o) => o.label));

  return (
    <div className="edit-section">
      <p>選択肢</p>
      <LabelListEditor labels={labels} onChange={setLabels} />
      <div className="panel-actions">
        <button
          type="button"
          className="icon-button"
          aria-label={`${metric.name} の選択肢を保存`}
          onClick={() => {
            const cleaned = labels.map((l) => l.trim()).filter((l) => l.length > 0);
            if (cleaned.length > 0) void onSave(cleaned);
          }}
        >
          <Icon name="check" />
        </button>
      </div>
    </div>
  );
}

function MetricRow({
  metric,
  groups,
  onSaveGeneral,
  onSaveChoiceOptions,
  onToggleArchive,
  onDelete,
  isDragging,
  isDropTarget,
  dragHandleProps,
}: {
  metric: Metric;
  groups: MetricGroup[];
  onSaveGeneral: (input: {
    name: string;
    unit: string | null;
    metricGroupId: string | null;
  }) => Promise<void>;
  onSaveChoiceOptions: (labels: string[]) => Promise<void>;
  onToggleArchive: () => void;
  onDelete: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
  dragHandleProps: { onPointerDown: (e: React.PointerEvent) => void };
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li
      data-drag-id={metric.id}
      className={
        [isDragging && "dragging", isDropTarget && "drop-target"].filter(Boolean).join(" ") ||
        undefined
      }
    >
      <div className="row-header">
        <button
          type="button"
          className="icon-button drag-handle"
          aria-label={`${metric.name} をドラッグして並び替え`}
          {...dragHandleProps}
        >
          <Icon name="drag_indicator" />
        </button>
        <div className="row-summary">
          <strong>{metric.name}</strong> ({METRIC_TYPE_LABELS[metric.type]}
          {metric.unit ? ` / ${metric.unit}` : ""}) -{" "}
          {metricGroupLabel(groups, metric.metricGroupId)}
          {metric.isArchived && " [アーカイブ済み]"}
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setEditing((v) => !v)}
            aria-label={editing ? `${metric.name} の編集を閉じる` : `${metric.name} を編集`}
          >
            <Icon name={editing ? "close" : "edit_square"} />
          </button>
        </div>
      </div>
      {editing && (
        <>
          <MetricGeneralFields
            metric={metric}
            groups={groups}
            onSave={async (input) => {
              await onSaveGeneral(input);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
          {metric.type === "choice" && (
            <MetricChoiceOptionsEditor metric={metric} onSave={onSaveChoiceOptions} />
          )}
          <div className="danger-zone">
            <button
              type="button"
              className="icon-button"
              onClick={onToggleArchive}
              aria-label={
                metric.isArchived
                  ? `${metric.name} を再表示する`
                  : `${metric.name} をアーカイブする`
              }
            >
              <Icon name={metric.isArchived ? "unarchive" : "archive"} />
            </button>
            <button
              type="button"
              className="icon-button button-danger"
              onClick={onDelete}
              aria-label={`${metric.name} を削除`}
            >
              <Icon name="delete" />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function NewMetricForm({
  groups,
  onCreate,
}: {
  groups: MetricGroup[];
  onCreate: (input: CreateMetricInput) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<MetricType>("number");
  const [unit, setUnit] = useState("");
  const [metricGroupId, setMetricGroupId] = useState("");
  const [choiceLabels, setChoiceLabels] = useState<string[]>(["", ""]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const cleanedChoiceLabels = choiceLabels.map((l) => l.trim()).filter((l) => l.length > 0);
    if (type === "choice" && cleanedChoiceLabels.length === 0) return;

    onCreate({
      name: name.trim(),
      type,
      unit: type === "number" && unit.trim() ? unit.trim() : null,
      metricGroupId: metricGroupId || null,
      ...(type === "choice"
        ? { choiceOptions: cleanedChoiceLabels.map((label) => ({ label })) }
        : {}),
    });
    setName("");
    setUnit("");
    setChoiceLabels(["", ""]);
  };

  return (
    <form onSubmit={submit}>
      <h3>新しい記録項目を追加</h3>
      <label>
        名前
        <input
          aria-label="新しい記録項目の名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        種別
        <select
          aria-label="新しい記録項目の種別"
          value={type}
          onChange={(e) => setType(e.target.value as MetricType)}
        >
          <option value="number">数値</option>
          <option value="choice">選択肢</option>
          <option value="text">自由入力</option>
        </select>
      </label>
      {type === "number" && (
        <label>
          単位
          <input
            aria-label="新しい記録項目の単位"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </label>
      )}
      <label>
        グループ
        <select
          aria-label="新しい記録項目のグループ"
          value={metricGroupId}
          onChange={(e) => setMetricGroupId(e.target.value)}
        >
          <option value="">未分類</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      {type === "choice" && <LabelListEditor labels={choiceLabels} onChange={setChoiceLabels} />}
      <button type="submit">記録項目を追加</button>
    </form>
  );
}

function MetricManager({ apiBaseUrl, groups }: { apiBaseUrl: string; groups: MetricGroup[] }) {
  const { metrics, create, update, remove, reorder } = useMetrics(apiBaseUrl);
  const { displayItems, draggingId, overId, dragHandleProps } = useDragReorder(
    metrics,
    (orderedIds) => void reorder(orderedIds),
  );

  return (
    <section>
      <h2>記録項目</h2>
      <ul>
        {displayItems.map((metric) => (
          <MetricRow
            key={metric.id}
            metric={metric}
            groups={groups}
            onSaveGeneral={(input) => update(metric.id, input).then(() => undefined)}
            onSaveChoiceOptions={(labels) =>
              update(metric.id, { choiceOptions: labels.map((label) => ({ label })) }).then(
                () => undefined,
              )
            }
            onToggleArchive={() => void update(metric.id, { isArchived: !metric.isArchived })}
            onDelete={() => {
              if (window.confirm(`記録項目「${metric.name}」を削除しますか？`))
                void remove(metric.id);
            }}
            isDragging={draggingId === metric.id}
            isDropTarget={overId === metric.id}
            dragHandleProps={dragHandleProps(metric.id)}
          />
        ))}
      </ul>
      <NewMetricForm groups={groups} onCreate={(input) => void create(input)} />
    </section>
  );
}

export function MetricManagementScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { groups, create, update, remove, reorder } = useMetricGroups(apiBaseUrl);

  return (
    <div className="screen">
      <GroupManager
        groups={groups}
        create={create}
        update={update}
        remove={remove}
        reorder={reorder}
      />
      <MetricManager apiBaseUrl={apiBaseUrl} groups={groups} />
    </div>
  );
}
