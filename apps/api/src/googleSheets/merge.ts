export type CellMap = Map<string, string>;

export function cellKey(metricId: string, recordedAt: string): string {
  return `${metricId}|${recordedAt}`;
}

/**
 * アプリ側・シート側・前回同期時点のスナップショットの3つを突き合わせ、マージ後の値を返す。
 * 値が空文字列のセルは「記録なし」を表す。
 *
 * - 片方だけがスナップショットから変化していれば、変化した側を採用する
 * - 両方が（互いに異なる値に）変化していた場合はシート側を優先する
 *   （スプレッドシートをマスターデータとして扱いたいというユーザー要件のため）
 *
 * Google Sheets API はセル単位の最終更新時刻を提供しないため、「前回同期時点との差分」で
 * どちら側が変更したかを判定する（正確な時刻ベースの last-write-wins ではない）。
 */
export function mergeCells(app: CellMap, sheet: CellMap, snapshot: CellMap): CellMap {
  const keys = new Set([...app.keys(), ...sheet.keys(), ...snapshot.keys()]);
  const merged: CellMap = new Map();

  for (const key of keys) {
    const appValue = app.get(key) ?? "";
    const sheetValue = sheet.get(key) ?? "";
    const snapshotValue = snapshot.get(key) ?? "";

    let resolved: string;
    if (appValue === sheetValue) {
      resolved = appValue;
    } else if (appValue !== snapshotValue && sheetValue === snapshotValue) {
      resolved = appValue;
    } else if (sheetValue !== snapshotValue && appValue === snapshotValue) {
      resolved = sheetValue;
    } else {
      resolved = sheetValue;
    }

    if (resolved !== "") {
      merged.set(key, resolved);
    }
  }

  return merged;
}
