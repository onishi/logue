function escapeField(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeField).join(",")).join("\r\n");
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
