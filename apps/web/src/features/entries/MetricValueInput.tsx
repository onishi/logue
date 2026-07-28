import type { Metric } from "@logue/shared";

export function MetricValueInput({
  metric,
  value,
  disabled,
  ariaLabel,
  onChange,
}: {
  metric: Metric;
  value: string;
  disabled: boolean;
  ariaLabel?: string;
  onChange: (value: string) => void;
}) {
  const label = ariaLabel ?? metric.name;

  if (metric.type === "choice") {
    return (
      <select
        aria-label={label}
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
        aria-label={label}
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
      aria-label={label}
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
