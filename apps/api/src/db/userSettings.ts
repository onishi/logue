import type { UserSettings } from "@logue/shared";

export type UserSettingsRow = {
  user_id: string;
  theme: string | null;
  created_at: string;
  updated_at: string;
};

export async function findUserSettings(
  db: D1Database,
  userId: string,
): Promise<UserSettingsRow | null> {
  const row = await db
    .prepare("SELECT * FROM user_settings WHERE user_id = ?")
    .bind(userId)
    .first<UserSettingsRow>();
  return row ?? null;
}

export async function upsertUserSettings(
  db: D1Database,
  userId: string,
  patch: { theme?: string | null },
): Promise<UserSettingsRow> {
  const existing = await findUserSettings(db, userId);

  if (!existing) {
    await db
      .prepare("INSERT INTO user_settings (user_id, theme) VALUES (?, ?)")
      .bind(userId, patch.theme ?? null)
      .run();
  } else if (patch.theme !== undefined) {
    await db
      .prepare("UPDATE user_settings SET theme = ?, updated_at = ? WHERE user_id = ?")
      .bind(patch.theme, new Date().toISOString(), userId)
      .run();
  }

  const updated = await findUserSettings(db, userId);
  if (!updated) {
    throw new Error("user_settings 更新後にレコードを取得できませんでした");
  }
  return updated;
}

export function toPublicUserSettings(row: UserSettingsRow | null): UserSettings {
  const theme = row?.theme;
  return { theme: theme === "light" || theme === "dark" ? theme : "system" };
}
