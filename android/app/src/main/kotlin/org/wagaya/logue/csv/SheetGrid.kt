package org.wagaya.logue.csv

import java.time.DateTimeException
import java.time.LocalDate
import org.wagaya.logue.network.dto.CreateEntryInput
import org.wagaya.logue.network.dto.Entry
import org.wagaya.logue.network.dto.Metric

// packages/shared/src/sheetGrid.ts の buildGridRows/parseGridRows をそのまま移植したもの。
// CSVエクスポート/インポートのフォーマット（列ヘッダー「日付,項目名（単位）,...」、日付の
// 表記ゆれ許容〈issue #90〉、単位付き数値の許容〈issue #81〉、単位なし項目名での列一致
// 〈issue #90〉）をWeb版と揃えることで、Web版で書き出したCSVをAndroidアプリで読み込む
// （逆も同様）ことができるようにする。

private val DATE_PATTERN = Regex("""^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$""")
private val TRAILING_WEEKDAY_PATTERN = Regex("""[（(][^）)]*[）)]\s*$""")

fun metricColumnLabel(metric: Metric): String {
    val unitPart = if (metric.unit != null) "（${metric.unit}）" else ""
    val archivedPart = if (metric.isArchived) " [アーカイブ済み]" else ""
    return "${metric.name}$unitPart$archivedPart"
}

private fun normalizeDate(raw: String): String? {
    val withoutWeekday = raw.replace(TRAILING_WEEKDAY_PATTERN, "").trim()
    val match = DATE_PATTERN.matchEntire(withoutWeekday) ?: return null
    val (yearStr, monthStr, dayStr) = match.destructured
    val year = yearStr.toInt()
    val month = monthStr.toInt()
    val day = dayStr.toInt()
    if (month !in 1..12 || day !in 1..31) return null

    // うるう年を含む実在日かどうかを確認する（java.time を使うと日付妥当性チェックが簡潔）。
    val valid = try {
        LocalDate.of(year, month, day)
        true
    } catch (e: DateTimeException) {
        false
    }
    if (!valid) return null

    return "$yearStr-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}"
}

private fun findMetricByName(nameToMetrics: Map<String, List<Metric>>, label: String): Metric? {
    val candidates = nameToMetrics[label] ?: return null
    return if (candidates.size == 1) candidates[0] else null
}

private fun formatCellValue(metric: Metric, value: String): String =
    if (metric.type == "choice") {
        metric.choiceOptions.firstOrNull { it.id == value }?.label ?: value
    } else {
        value
    }

/**
 * 記録項目×日付のグリッド（ヘッダー行＋日付ごとの行）を構築する。CSVエクスポート画面の絞り込み
 * （記録がある項目のみ表示）は適用しない。呼び出し側で表示用に絞り込みたい場合は、渡す metrics
 * 自体を絞り込んでから呼び出す。
 */
fun buildGridRows(metrics: List<Metric>, entries: List<Entry>): List<List<String>> {
    val sortedMetrics = metrics.sortedBy { it.sortOrder }
    val metricById = sortedMetrics.associateBy { it.id }

    val entryByDateAndMetric = mutableMapOf<String, Entry>()
    val dates = mutableSetOf<String>()
    for (entry in entries) {
        if (!metricById.containsKey(entry.metricId)) continue
        entryByDateAndMetric["${entry.recordedAt}|${entry.metricId}"] = entry
        dates.add(entry.recordedAt)
    }
    val sortedDates = dates.sortedDescending()

    val header = listOf("日付") + sortedMetrics.map { metricColumnLabel(it) }
    val body = sortedDates.map { date ->
        listOf(date) + sortedMetrics.map { metric ->
            val entry = entryByDateAndMetric["$date|${metric.id}"]
            if (entry != null) formatCellValue(metric, entry.value) else ""
        }
    }
    return listOf(header) + body
}

// "Infinity"/"NaN" のような文字列も Double.parseDouble 的には解釈できてしまうため、
// isFinite() で明示的に弾く（JS版の Number.isFinite(Number(raw)) と同じ意図）。
private fun isFiniteNumber(text: String): Boolean = text.toDoubleOrNull()?.isFinite() == true

private fun parseNumberCell(raw: String, unit: String?): String? {
    if (raw.isNotEmpty() && isFiniteNumber(raw)) return raw
    if (unit != null && raw.endsWith(unit)) {
        val stripped = raw.substring(0, raw.length - unit.length).trim()
        if (stripped.isNotEmpty() && isFiniteNumber(stripped)) return stripped
    }
    return null
}

data class GridParseResult(val rows: List<CreateEntryInput>, val issues: List<String>)

/**
 * buildGridRows と対になるパーサー。空欄セルは「未入力」として読み飛ばすのみで、削除は行わない
 * （一部の列・行だけ埋まった状態でも安全に取り込めるようにするため）。
 */
fun parseGridRows(rows: List<List<String>>, metrics: List<Metric>): GridParseResult {
    val table = rows.filter { !(it.size == 1 && it[0] == "") }
    val issues = mutableListOf<String>()
    if (table.isEmpty()) {
        return GridParseResult(emptyList(), listOf("データが空です。"))
    }

    val header = table[0]
    val body = table.drop(1)
    if (header.getOrElse(0) { "" } != "日付") {
        issues.add("1列目のヘッダーは「日付」である必要があります。")
        return GridParseResult(emptyList(), issues)
    }

    val labelToMetric = metrics.associateBy { metricColumnLabel(it) }
    val nameToMetrics = metrics.groupBy { it.name }

    val columns: List<Metric?> = header.drop(1).map { label ->
        val metric = labelToMetric[label] ?: findMetricByName(nameToMetrics, label)
        if (metric == null) {
            issues.add("列「$label」に一致する記録項目が見つからないためスキップします。")
        }
        metric
    }

    val result = mutableListOf<CreateEntryInput>()
    body.forEachIndexed { bodyIndex, line ->
        val lineNumber = bodyIndex + 2 // ヘッダー行を1行目として数える
        val rawDate = line.getOrElse(0) { "" }.trim()
        val date = normalizeDate(rawDate)
        if (date == null) {
            issues.add("${lineNumber}行目: 日付「$rawDate」の形式が不正です（YYYY-MM-DD）。")
            return@forEachIndexed
        }

        columns.forEachIndexed { columnIndex, metric ->
            if (metric == null) return@forEachIndexed
            val raw = line.getOrElse(columnIndex + 1) { "" }.trim()
            if (raw.isEmpty()) return@forEachIndexed

            when (metric.type) {
                "choice" -> {
                    val option = metric.choiceOptions.firstOrNull { it.label == raw }
                    if (option == null) {
                        issues.add("${lineNumber}行目「${metricColumnLabel(metric)}」: 選択肢「$raw」が見つかりません。")
                        return@forEachIndexed
                    }
                    result.add(CreateEntryInput(metric.id, option.id, date))
                }
                "number" -> {
                    val value = parseNumberCell(raw, metric.unit)
                    if (value == null) {
                        issues.add("${lineNumber}行目「${metricColumnLabel(metric)}」: 数値「$raw」が不正です。")
                        return@forEachIndexed
                    }
                    result.add(CreateEntryInput(metric.id, value, date))
                }
                else -> result.add(CreateEntryInput(metric.id, raw, date))
            }
        }
    }

    return GridParseResult(result, issues)
}
