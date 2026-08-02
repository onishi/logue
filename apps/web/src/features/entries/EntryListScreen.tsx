import type { Entry, Metric } from "@logue/shared";
import { useMemo, useState } from "react";
import { useEntries } from "../../hooks/useEntries";
import { useMetricGroups } from "../../hooks/useMetricGroups";
import { useMetrics } from "../../hooks/useMetrics";
import { downloadCsv, metricColumnLabel, toCsv } from "../../lib/csv";
import { type CsvImportResult, parseEntriesCsv } from "../../lib/csvImport";
import { todayDateString } from "../../lib/date";

const MAX_VISIBLE_ISSUES = 20;

function formatValue(metric: Metric | undefined, value: string): string {
  if (!metric) return value;
  if (metric.type === "choice") {
    return metric.choiceOptions.find((o) => o.id === value)?.label ?? value;
  }
  if (metric.type === "number") {
    return metric.unit ? `${value} ${metric.unit}` : value;
  }
  return value;
}

export function EntryListScreen({
  apiBaseUrl,
  onEditDate,
  onOpenBulk,
}: {
  apiBaseUrl: string;
  onEditDate: (date: string) => void;
  onOpenBulk: () => void;
}) {
  const { groups } = useMetricGroups(apiBaseUrl);
  const { metrics } = useMetrics(apiBaseUrl);
  const { entries, create } = useEntries(apiBaseUrl);

  const [groupFilter, setGroupFilter] = useState("");
  const [metricFilter, setMetricFilter] = useState("");
  const [importPreview, setImportPreview] = useState<CsvImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const metricsInGroup = groupFilter
    ? metrics.filter((m) => m.metricGroupId === groupFilter)
    : metrics;

  // フィルタなしのときは全項目を列に出すと空欄だらけの巨大な表になるため、
  // 記録が1件もない項目は列から省く。グループ・記録項目で絞り込んだ場合はその範囲を尊重する。
  const metricColumns = useMemo(() => {
    const base = metricFilter
      ? metricsInGroup.filter((m) => m.id === metricFilter)
      : groupFilter
        ? metricsInGroup
        : metricsInGroup.filter((m) => entries.some((e) => e.metricId === m.id));
    return [...base].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [metricsInGroup, metricFilter, groupFilter, entries]);

  const columnMetricIds = useMemo(() => new Set(metricColumns.map((m) => m.id)), [metricColumns]);

  const entryByDateAndMetric = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const entry of entries) {
      if (columnMetricIds.has(entry.metricId)) {
        map.set(`${entry.recordedAt}|${entry.metricId}`, entry);
      }
    }
    return map;
  }, [entries, columnMetricIds]);

  const dates = useMemo(() => {
    const unique = new Set<string>();
    for (const entry of entries) {
      if (columnMetricIds.has(entry.metricId)) unique.add(entry.recordedAt);
    }
    return [...unique].sort().reverse();
  }, [entries, columnMetricIds]);

  const hasData = metricColumns.length > 0 && dates.length > 0;

  const csvRows = useMemo(() => {
    const header = ["日付", ...metricColumns.map(metricColumnLabel)];
    const body = dates.map((date) => [
      date,
      ...metricColumns.map((metric) => {
        const entry = entryByDateAndMetric.get(`${date}|${metric.id}`);
        return entry ? formatValue(metric, entry.value) : "";
      }),
    ]);
    return [header, ...body];
  }, [metricColumns, dates, entryByDateAndMetric]);

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

  const confirmImport = async () => {
    if (!importPreview || importPreview.rows.length === 0) return;
    setImporting(true);
    try {
      await Promise.all(importPreview.rows.map((row) => create(row)));
      setImportMessage(`${importPreview.rows.length}件を読み込みました`);
      setImportPreview(null);
    } catch {
      setImportMessage("読み込みに失敗しました");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="screen">
      <h2>記録一覧</h2>
      <button type="button" onClick={onOpenBulk}>
        過去データを一括入力
      </button>
      <label>
        CSVから読み込む
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label="CSVから読み込む"
          onChange={handleCsvFileChange}
        />
      </label>

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

      {!hasData ? (
        <p>記録がありません。</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => downloadCsv(toCsv(csvRows), `logue-entries-${todayDateString()}.csv`)}
          >
            CSVでダウンロード
          </button>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>日付</th>
                  {metricColumns.map((metric) => (
                    <th key={metric.id}>{metricColumnLabel(metric)}</th>
                  ))}
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => (
                  <tr key={date}>
                    <th scope="row">{date}</th>
                    {metricColumns.map((metric) => {
                      const entry = entryByDateAndMetric.get(`${date}|${metric.id}`);
                      return (
                        <td key={metric.id}>{entry ? formatValue(metric, entry.value) : "—"}</td>
                      );
                    })}
                    <td>
                      <button
                        type="button"
                        onClick={() => onEditDate(date)}
                        aria-label={`${date}を編集`}
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
