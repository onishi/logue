import type { CreateMetricInput, Metric, MetricGroup, MetricType } from "@logue/shared";
import { useState } from "react";
import { useMetricGroups } from "../../hooks/useMetricGroups";
import { useMetrics } from "../../hooks/useMetrics";

const METRIC_TYPE_LABELS: Record<MetricType, string> = {
  number: "数値",
  choice: "選択肢",
  text: "自由入力",
};

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
}

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
        <div key={index}>
          <input
            aria-label={`選択肢 ${index + 1}`}
            value={label}
            onChange={(e) => {
              const next = [...labels];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <button type="button" onClick={() => onChange(labels.filter((_, i) => i !== index))}>
            選択肢を削除
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
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
}: {
  group: MetricGroup;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  if (editing) {
    return (
      <li>
        <input
          aria-label={`${group.name} の新しい名前`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          onClick={async () => {
            await onRename(name);
            setEditing(false);
          }}
        >
          保存
        </button>
        <button
          type="button"
          onClick={() => {
            setName(group.name);
            setEditing(false);
          }}
        >
          キャンセル
        </button>
      </li>
    );
  }

  return (
    <li>
      <span>{group.name}</span>
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        aria-label={`${group.name} を上に移動`}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        aria-label={`${group.name} を下に移動`}
      >
        ↓
      </button>
      <button type="button" onClick={() => setEditing(true)}>
        編集
      </button>
      <button type="button" onClick={onDelete}>
        削除
      </button>
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

  return (
    <section>
      <h2>記録項目グループ</h2>
      <ul>
        {groups.map((group, index) => (
          <GroupRow
            key={group.id}
            group={group}
            canMoveUp={index > 0}
            canMoveDown={index < groups.length - 1}
            onMoveUp={() => void reorder(moveItem(groups, index, -1).map((g) => g.id))}
            onMoveDown={() => void reorder(moveItem(groups, index, 1).map((g) => g.id))}
            onRename={async (name) => {
              if (name.trim()) await update(group.id, { name: name.trim() });
            }}
            onDelete={() => {
              if (window.confirm(`グループ「${group.name}」を削除しますか？`))
                void remove(group.id);
            }}
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
    <div>
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
      <button
        type="button"
        onClick={async () => {
          if (!name.trim()) return;
          await onSave({
            name: name.trim(),
            unit: unit.trim() || null,
            metricGroupId: metricGroupId || null,
          });
        }}
      >
        保存
      </button>
      <button type="button" onClick={onCancel}>
        キャンセル
      </button>
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
    <div>
      <p>選択肢</p>
      <LabelListEditor labels={labels} onChange={setLabels} />
      <button
        type="button"
        onClick={() => {
          const cleaned = labels.map((l) => l.trim()).filter((l) => l.length > 0);
          if (cleaned.length > 0) void onSave(cleaned);
        }}
      >
        選択肢を保存
      </button>
    </div>
  );
}

function MetricRow({
  metric,
  groups,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onSaveGeneral,
  onSaveChoiceOptions,
  onToggleArchive,
  onDelete,
}: {
  metric: Metric;
  groups: MetricGroup[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveGeneral: (input: {
    name: string;
    unit: string | null;
    metricGroupId: string | null;
  }) => Promise<void>;
  onSaveChoiceOptions: (labels: string[]) => Promise<void>;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li>
      <div>
        <strong>{metric.name}</strong> ({METRIC_TYPE_LABELS[metric.type]}
        {metric.unit ? ` / ${metric.unit}` : ""}) - {metricGroupLabel(groups, metric.metricGroupId)}
        {metric.isArchived && " [アーカイブ済み]"}
      </div>
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        aria-label={`${metric.name} を上に移動`}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        aria-label={`${metric.name} を下に移動`}
      >
        ↓
      </button>
      <button type="button" onClick={() => setEditing((v) => !v)}>
        {editing ? "閉じる" : "編集"}
      </button>
      <button type="button" onClick={onToggleArchive}>
        {metric.isArchived ? "再表示する" : "アーカイブする"}
      </button>
      <button type="button" onClick={onDelete}>
        削除
      </button>
      {editing && (
        <MetricGeneralFields
          metric={metric}
          groups={groups}
          onSave={async (input) => {
            await onSaveGeneral(input);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
      {editing && metric.type === "choice" && (
        <MetricChoiceOptionsEditor metric={metric} onSave={onSaveChoiceOptions} />
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

  return (
    <section>
      <h2>記録項目</h2>
      <ul>
        {metrics.map((metric, index) => (
          <MetricRow
            key={metric.id}
            metric={metric}
            groups={groups}
            canMoveUp={index > 0}
            canMoveDown={index < metrics.length - 1}
            onMoveUp={() => void reorder(moveItem(metrics, index, -1).map((m) => m.id))}
            onMoveDown={() => void reorder(moveItem(metrics, index, 1).map((m) => m.id))}
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
    <div>
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
