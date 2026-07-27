import type {
  CreateMetricInput,
  Metric,
  MetricGroup,
  UpdateMetricInput,
  ValueType,
} from "@logue/shared";
import { useState, type FormEvent } from "react";

const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  number: "数値",
  choice: "選択肢",
  text: "自由入力",
};

export type MetricFormProps = {
  groups: MetricGroup[];
  initial?: Metric;
  defaultGroupId?: string | null;
  onSubmit: (input: CreateMetricInput | UpdateMetricInput) => Promise<void>;
  onCancel?: () => void;
};

export function MetricForm({
  groups,
  initial,
  defaultGroupId,
  onSubmit,
  onCancel,
}: MetricFormProps) {
  const isEdit = initial !== undefined;
  const [name, setName] = useState(initial?.name ?? "");
  const [valueType, setValueType] = useState<ValueType>(initial?.valueType ?? "number");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [groupId, setGroupId] = useState(initial?.groupId ?? defaultGroupId ?? "");
  const [choiceOptions, setChoiceOptions] = useState<string[]>(
    initial?.choiceOptions.map((option) => option.label) ?? [""],
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("名前を入力してください");
      return;
    }

    const trimmedOptions = choiceOptions.map((option) => option.trim()).filter(Boolean);
    if (valueType === "choice" && trimmedOptions.length === 0) {
      setError("選択肢を1つ以上指定してください");
      return;
    }

    const common = {
      name: trimmedName,
      unit: unit.trim() ? unit.trim() : null,
      groupId: groupId || null,
      ...(valueType === "choice" ? { choiceOptions: trimmedOptions } : {}),
    };

    setSubmitting(true);
    try {
      await onSubmit(isEdit ? common : { ...common, valueType });
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="metric-form">
      <label>
        名前
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} />
      </label>

      <label>
        入力タイプ
        <select
          value={valueType}
          onChange={(event) => setValueType(event.target.value as ValueType)}
          disabled={isEdit}
        >
          {Object.entries(VALUE_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        単位
        <input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          placeholder="kg など（任意）"
          maxLength={20}
        />
      </label>

      <label>
        グループ
        <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="">未分類</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>

      {valueType === "choice" && (
        <fieldset>
          <legend>選択肢</legend>
          {choiceOptions.map((option, index) => (
            <div key={index} className="choice-option-row">
              <input
                value={option}
                onChange={(event) => {
                  const next = [...choiceOptions];
                  next[index] = event.target.value;
                  setChoiceOptions(next);
                }}
                maxLength={50}
                aria-label={`選択肢 ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => setChoiceOptions(choiceOptions.filter((_, i) => i !== index))}
                disabled={choiceOptions.length <= 1}
              >
                削除
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setChoiceOptions([...choiceOptions, ""])}>
            選択肢を追加
          </button>
        </fieldset>
      )}

      {error && <p role="alert">{error}</p>}

      <div className="metric-form-actions">
        <button type="submit" disabled={submitting}>
          {isEdit ? "更新" : "追加"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
