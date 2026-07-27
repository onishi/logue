import type { Metric } from "@logue/shared";

export type EntryValuePayload = { valueNumber?: number; valueText?: string };

export function EntryValueInput({
  metric,
  value,
  onChange,
}: {
  metric: Metric;
  value: EntryValuePayload;
  onChange: (value: EntryValuePayload) => void;
}) {
  if (metric.valueType === "number") {
    return (
      <input
        type="number"
        step="any"
        value={value.valueNumber ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          onChange({ valueNumber: raw === "" ? undefined : Number(raw) });
        }}
        aria-label={metric.name}
      />
    );
  }

  if (metric.valueType === "choice") {
    return (
      <select
        value={value.valueText ?? ""}
        onChange={(event) => onChange({ valueText: event.target.value || undefined })}
        aria-label={metric.name}
      >
        <option value="">選択してください</option>
        {metric.choiceOptions.map((option) => (
          <option key={option.id} value={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={value.valueText ?? ""}
      onChange={(event) => onChange({ valueText: event.target.value || undefined })}
      aria-label={metric.name}
    />
  );
}
