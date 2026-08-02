import type { Metric } from "@logue/shared";
import { type GridParseResult, parseGridRows } from "@logue/shared";
import { parseCsv } from "./csv";

export type CsvImportResult = GridParseResult;

// CSVエクスポートと対になるインポート処理。実体は共有パッケージの parseGridRows で、
// スプレッドシート同期（apps/api）と同じ列マッチング・バリデーションロジックを使う。
export function parseEntriesCsv(csvText: string, metrics: Metric[]): CsvImportResult {
  return parseGridRows(parseCsv(csvText), metrics);
}
