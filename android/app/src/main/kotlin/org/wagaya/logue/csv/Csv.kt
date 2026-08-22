package org.wagaya.logue.csv

// apps/web/src/lib/csv.ts の toCsv/parseCsv をそのまま移植したもの（Android版のCSV入出力
// でも同じフォーマット・エスケープ規則を使うことで、Web版と書き出し/読み込みの互換性を保つ）。

private val NEEDS_QUOTE = Regex("[\",\r\n]")

private fun escapeField(field: String): String =
    if (NEEDS_QUOTE.containsMatchIn(field)) "\"" + field.replace("\"", "\"\"") + "\"" else field

fun toCsv(rows: List<List<String>>): String =
    rows.joinToString("\r\n") { row -> row.joinToString(",") { escapeField(it) } }

/**
 * RFC4180相当のクォート（"..."内の,や改行、""によるエスケープ）に対応したCSVパーサー。
 * 先頭にUTF-8 BOMが付いていた場合は取り除く。
 */
fun parseCsv(text: String): List<List<String>> {
    val input = if (text.isNotEmpty() && text[0] == '\uFEFF') text.substring(1) else text
    val rows = mutableListOf<List<String>>()
    var row = mutableListOf<String>()
    val field = StringBuilder()
    var inQuotes = false
    var i = 0

    fun pushField() {
        row.add(field.toString())
        field.setLength(0)
    }
    fun pushRow() {
        pushField()
        rows.add(row)
        row = mutableListOf()
    }

    while (i < input.length) {
        val char = input[i]
        if (inQuotes) {
            if (char == '"') {
                if (i + 1 < input.length && input[i + 1] == '"') {
                    field.append('"')
                    i += 2
                } else {
                    inQuotes = false
                    i += 1
                }
            } else {
                field.append(char)
                i += 1
            }
            continue
        }
        when (char) {
            '"' -> {
                inQuotes = true
                i += 1
            }
            ',' -> {
                pushField()
                i += 1
            }
            '\r' -> {
                pushRow()
                i += if (i + 1 < input.length && input[i + 1] == '\n') 2 else 1
            }
            '\n' -> {
                pushRow()
                i += 1
            }
            else -> {
                field.append(char)
                i += 1
            }
        }
    }
    if (field.isNotEmpty() || row.isNotEmpty()) {
        pushRow()
    }
    return rows
}
