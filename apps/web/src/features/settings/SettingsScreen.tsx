import type { ThemeSetting } from "@logue/shared";

const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: "system", label: "端末の設定に合わせる" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

export function SettingsScreen({
  theme,
  onChangeTheme,
}: {
  theme: ThemeSetting;
  onChangeTheme: (theme: ThemeSetting) => void;
}) {
  return (
    <div className="screen">
      <h2>設定</h2>
      <fieldset>
        <legend>テーマ</legend>
        {THEME_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={() => onChangeTheme(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
