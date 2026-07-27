import type { CreateMetricGroupInput } from "@logue/shared";
import { useState, type FormEvent } from "react";

export type MetricGroupFormProps = {
  onSubmit: (input: CreateMetricGroupInput) => Promise<unknown>;
};

export function MetricGroupForm({ onSubmit }: MetricGroupFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("グループ名を入力してください");
      return;
    }
    setError(null);
    await onSubmit({ name: trimmed });
    setName("");
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="metric-group-form">
      <label>
        新しいグループ
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例: 筋トレ"
          maxLength={50}
        />
      </label>
      <button type="submit">追加</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
