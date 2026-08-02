export type GoogleSheetsConnectionRow = {
  user_id: string;
  refresh_token: string;
  spreadsheet_id: string | null;
  sheet_name: string;
  sync_enabled: number;
  last_synced_at: string | null;
  last_error: string | null;
  last_snapshot_json: string | null;
  created_at: string;
  updated_at: string;
};

export async function findGoogleSheetsConnection(
  db: D1Database,
  userId: string,
): Promise<GoogleSheetsConnectionRow | null> {
  const row = await db
    .prepare("SELECT * FROM google_sheets_connections WHERE user_id = ?")
    .bind(userId)
    .first<GoogleSheetsConnectionRow>();
  return row ?? null;
}

export async function listEnabledGoogleSheetsConnections(
  db: D1Database,
): Promise<GoogleSheetsConnectionRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM google_sheets_connections WHERE sync_enabled = ?")
    .bind(1)
    .all<GoogleSheetsConnectionRow>();
  return results;
}

/** OAuth連携直後の作成・再連携時の refresh_token 上書きに使う。 */
export async function upsertGoogleSheetsRefreshToken(
  db: D1Database,
  userId: string,
  encryptedRefreshToken: string,
): Promise<GoogleSheetsConnectionRow> {
  const existing = await findGoogleSheetsConnection(db, userId);
  if (!existing) {
    await db
      .prepare("INSERT INTO google_sheets_connections (user_id, refresh_token) VALUES (?, ?)")
      .bind(userId, encryptedRefreshToken)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE google_sheets_connections SET refresh_token = ?, updated_at = ? WHERE user_id = ?",
      )
      .bind(encryptedRefreshToken, new Date().toISOString(), userId)
      .run();
  }
  const updated = await findGoogleSheetsConnection(db, userId);
  if (!updated) {
    throw new Error("google_sheets_connections 更新後にレコードを取得できませんでした");
  }
  return updated;
}

export async function updateGoogleSheetsConfig(
  db: D1Database,
  userId: string,
  patch: { spreadsheetId?: string; sheetName?: string; syncEnabled?: boolean },
): Promise<GoogleSheetsConnectionRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.spreadsheetId !== undefined) {
    sets.push("spreadsheet_id = ?");
    values.push(patch.spreadsheetId);
  }
  if (patch.sheetName !== undefined) {
    sets.push("sheet_name = ?");
    values.push(patch.sheetName);
  }
  if (patch.syncEnabled !== undefined) {
    sets.push("sync_enabled = ?");
    values.push(patch.syncEnabled ? 1 : 0);
  }
  if (sets.length === 0) {
    return findGoogleSheetsConnection(db, userId);
  }
  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  await db
    .prepare(`UPDATE google_sheets_connections SET ${sets.join(", ")} WHERE user_id = ?`)
    .bind(...values, userId)
    .run();
  return findGoogleSheetsConnection(db, userId);
}

export async function updateGoogleSheetsSyncResult(
  db: D1Database,
  userId: string,
  patch: { lastSnapshotJson: string; lastError: string | null },
): Promise<void> {
  await db
    .prepare(
      "UPDATE google_sheets_connections SET last_snapshot_json = ?, last_error = ?, last_synced_at = ?, updated_at = ? WHERE user_id = ?",
    )
    .bind(
      patch.lastSnapshotJson,
      patch.lastError,
      new Date().toISOString(),
      new Date().toISOString(),
      userId,
    )
    .run();
}

export async function deleteGoogleSheetsConnection(db: D1Database, userId: string): Promise<void> {
  await db.prepare("DELETE FROM google_sheets_connections WHERE user_id = ?").bind(userId).run();
}
