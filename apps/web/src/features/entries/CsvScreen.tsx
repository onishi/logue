import { buildGridRows } from "@logue/shared";
import { useMemo, useState } from "react";
import { CollapsibleSection } from "../../components/CollapsibleSection";
import { useEntries } from "../../hooks/useEntries";
import { useMetricGroups } from "../../hooks/useMetricGroups";
import { useMetrics } from "../../hooks/useMetrics";
import { downloadCsv, toCsv } from "../../lib/csv";
import { type CsvImportResult, parseEntriesCsv, parseEntriesTsv } from "../../lib/csvImport";
import { todayDateString } from "../../lib/date";

const MAX_VISIBLE_ISSUES = 20;
const TSV_PLACEHOLDER = "日付\t体重（kg）\t体調\n2026-07-01\t70\t良い";

export function CsvScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { groups } = useMetricGroups(apiBaseUrl);
  const { metrics } = useMetrics(apiBaseUrl);
  const { entries, create } = useEntries(apiBaseUrl);

  const [groupFilter, setGroupFilter] = useState("");
  const [metricFilter, setMetricFilter] = useState("");
  const [tsvText, setTsvText] = useState("");
  const [importPreview, setImportPreview] = useState<CsvImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const metricsInGroup = groupFilter
    ? metrics.filter((m) => m.metricGroupId === groupFilter)
    : metrics;

  // フィルタなしのときは全項目を対象にすると空欄だらけの巨大なCSVになるため、
  // 記録が1件もない項目は除く。グループ・記録項目で絞り込んだ場合はその範囲を尊重する。
  const exportMetrics = useMemo(() => {
    const base = metricFilter
      ? metricsInGroup.filter((m) => m.id === metricFilter)
      : groupFilter
        ? metricsInGroup
        : metricsInGroup.filter((m) => entries.some((e) => e.metricId === m.id));
    return [...base].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [metricsInGroup, metricFilter, groupFilter, entries]);

  const csvRows = useMemo(() => buildGridRows(exportMetrics, entries), [exportMetrics, entries]);
  const hasExportData = csvRows.length > 1; // ヘッダー行のみでなくデータ行があるか

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setImportPreview(parseEntriesCsv(text, metrics));
      setImportMessage(null);
    };
    reader.readAsText(file);
  };

  const handleTsvImport = () => {
    setImportPreview(parseEntriesTsv(tsvText, metrics));
    setImportMessage(null);
  };

  const confirmImport = async () => {
    if (!importPreview || importPreview.rows.length === 0) return;
    setImporting(true);
    try {
      await Promise.all(importPreview.rows.map((row) => create(row)));
      setImportMessage(`${importPreview.rows.length}件を読み込みました`);
      setImportPreview(null);
      setTsvText("");
    } catch {
      setImportMessage("読み込みに失敗しました");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="screen">
      <h2>CSV入出力</h2>

      <section>
        <h3>エクスポート</h3>
        <CollapsibleSection label="絞り込み">
          <label>
            グループで絞り込み
            <select
              aria-label="グループで絞り込み"
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setMetricFilter("");
              }}
            >
              <option value="">すべて</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            記録項目で絞り込み
            <select
              aria-label="記録項目で絞り込み"
              value={metricFilter}
              onChange={(e) => setMetricFilter(e.target.value)}
            >
              <option value="">すべて</option>
              {metricsInGroup.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </CollapsibleSection>

        {hasExportData ? (
          <button
            type="button"
            onClick={() => downloadCsv(toCsv(csvRows), `logue-entries-${todayDateString()}.csv`)}
          >
            CSVでダウンロード
          </button>
        ) : (
          <p>書き出せる記録がありません。</p>
        )}
      </section>

      <section>
        <h3>インポート</h3>
        <label>
          CSVから読み込む
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSVから読み込む"
            onChange={handleCsvFileChange}
          />
        </label>

        <label>
          スプレッドシートからコピーした内容を貼り付けて読み込む
          <textarea
            aria-label="スプレッドシートからコピーした内容を貼り付けて読み込む"
            value={tsvText}
            onChange={(e) => setTsvText(e.target.value)}
            placeholder={TSV_PLACEHOLDER}
            rows={6}
          />
        </label>
        <button type="button" onClick={handleTsvImport} disabled={!tsvText.trim()}>
          貼り付けた内容を読み込む
        </button>

        {importPreview && (
          <div role="status" className="import-preview">
            <p>{importPreview.rows.length}件を読み込みます。</p>
            {importPreview.issues.length > 0 && (
              <ul>
                {importPreview.issues.slice(0, MAX_VISIBLE_ISSUES).map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
                {importPreview.issues.length > MAX_VISIBLE_ISSUES && (
                  <li>ほか{importPreview.issues.length - MAX_VISIBLE_ISSUES}件</li>
                )}
              </ul>
            )}
            <button
              type="button"
              onClick={() => void confirmImport()}
              disabled={importing || importPreview.rows.length === 0}
            >
              インポートする
            </button>
            <button type="button" onClick={() => setImportPreview(null)} disabled={importing}>
              キャンセル
            </button>
          </div>
        )}
        {importMessage && <p role="status">{importMessage}</p>}
      </section>
    </div>
  );
}
