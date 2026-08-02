const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/** シート名を Sheets API の A1 記法用にクォートする（シングルクォートはエスケープする）。 */
export function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replaceAll("'", "''")}'`;
}

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

async function throwIfNotOk(response: Response, action: string): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `Google Sheets API ${action}に失敗しました: ${response.status} ${await response.text()}`,
    );
  }
}

/** 指定シートの使用範囲全体の値を取得する。シートが空の場合は空配列を返す。 */
export async function getValues(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
): Promise<string[][]> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(quoteSheetName(sheetName))}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  await throwIfNotOk(response, "の値取得");
  const body = await response.json<{ values?: string[][] }>();
  return body.values ?? [];
}

/**
 * 指定シートを丸ごとクリアしてから、左上（A1）を起点に値を書き込む（洗い替え）。
 * シート内に以前の同期で書いた残骸が残らないよう、書き込み前に必ずシート全体をクリアする。
 */
export async function clearAndWriteValues(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: string[][],
): Promise<void> {
  const quoted = quoteSheetName(sheetName);
  const clearUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(quoted)}:clear`;
  const clearResponse = await fetch(clearUrl, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(clearResponse, "のクリア");

  if (values.length === 0) return;

  const writeRange = `${quoted}!A1`;
  const writeUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=RAW`;
  const writeResponse = await fetch(writeUrl, {
    method: "PUT",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ range: writeRange, majorDimension: "ROWS", values }),
  });
  await throwIfNotOk(writeResponse, "への書き込み");
}
