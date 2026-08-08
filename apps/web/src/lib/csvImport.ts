import type { Metric } from "@logue/shared";
import { type GridParseResult, parseGridRows } from "@logue/shared";
import { parseCsv, parseTsv } from "./csv";

export type CsvImportResult = GridParseResult;

// CSVエクスポートと対になるインポート処理。実体は共有パッケージの parseGridRows で、
// スプレッドシート同期（apps/api）と同じ列マッチング・バリデーションロジックを使う。
export function parseEntriesCsv(csvText: string, metrics: Metric[]): CsvImportResult {
  return parseGridRows(parseCsv(csvText), metrics);
}

// スプレッドシートのセル範囲をコピーしてテキストエリアに貼り付けたタブ区切りテキストの
// インポート処理。列ヘッダー形式は CSV と同じ（parseGridRows を共用）。
export function parseEntriesTsv(tsvText: string, metrics: Metric[]): CsvImportResult {
  return parseGridRows(parseTsv(tsvText), metrics);
}
