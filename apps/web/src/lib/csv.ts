export { metricColumnLabel } from "@logue/shared";

function escapeField(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeField).join(",")).join("\r\n");
}

// RFC4180 相当のクォート（"..."内の , や改行、"" によるエスケープ）に対応した CSV パーサー。
// 先頭に UTF-8 BOM が付いていた場合は取り除く。
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < input.length) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += char;
        i += 1;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
    } else if (char === ",") {
      pushField();
      i += 1;
    } else if (char === "\r") {
      pushRow();
      i += input[i + 1] === "\n" ? 2 : 1;
    } else if (char === "\n") {
      pushRow();
      i += 1;
    } else {
      field += char;
      i += 1;
    }
  }
  if (field !== "" || row.length > 0) {
    pushRow();
  }
  return rows;
}

// Excel 等で開いても文字化けしないよう UTF-8 BOM (U+FEFF) を付与する。
const UTF8_BOM = String.fromCharCode(0xfeff);

// CSVをブラウザのダウンロードとしてトリガーする。
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
