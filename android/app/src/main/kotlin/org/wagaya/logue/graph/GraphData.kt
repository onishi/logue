package org.wagaya.logue.graph

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import org.wagaya.logue.network.dto.Entry

// apps/web/src/lib/graphData.ts の一部（toDailySeries/movingAverage/computeYAxisDomain）を
// 移植したもの。週別/月別集約（aggregateByGranularity）は未対応（日別のみ）。

data class SeriesPoint(val date: String, val value: Double)

/** entry の value を日付ごとに平均し、日次の時系列に変換する（数値に変換できない value は無視）。 */
fun toDailySeries(entries: List<Entry>): List<SeriesPoint> {
    data class Bucket(var total: Double, var count: Int)

    val buckets = LinkedHashMap<String, Bucket>()
    for (entry in entries) {
        val value = entry.value.toDoubleOrNull() ?: continue
        if (!value.isFinite()) continue
        val bucket = buckets.getOrPut(entry.recordedAt) { Bucket(0.0, 0) }
        bucket.total += value
        bucket.count += 1
    }
    return buckets.entries
        .map { (date, bucket) -> SeriesPoint(date, bucket.total / bucket.count) }
        .sortedBy { it.date }
}

/**
 * windowDays 日の移動平均を算出する。データが欠けている日があっても、実際に存在するデータ点の
 * うち直近 windowDays 暦日以内のものだけを平均する（カレンダー日ベース）。
 */
fun movingAverage(series: List<SeriesPoint>, windowDays: Int): List<SeriesPoint> {
    if (windowDays <= 1) return series
    return series.mapIndexed { index, point ->
        var total = 0.0
        var count = 0
        val pointDate = LocalDate.parse(point.date)
        for (i in index downTo 0) {
            val diff = ChronoUnit.DAYS.between(LocalDate.parse(series[i].date), pointDate)
            if (diff >= windowDays) break
            total += series[i].value
            count += 1
        }
        SeriesPoint(point.date, total / count)
    }
}

/**
 * グラフのY軸の表示範囲を、系列の最小値〜最大値に対して上下20%の余白を持たせて算出する。
 * 最小値が0以上の場合は下限も0未満にはしない（マイナス側の余白を作らない）。
 * 値が全て同じ（レンジ0）の場合は、その値の20%（0の場合は1）を余白として使う。
 */
fun computeYAxisDomain(series: List<SeriesPoint>): Pair<Double, Double>? {
    if (series.isEmpty()) return null
    val values = series.map { it.value }
    val min = values.min()
    val max = values.max()
    val range = max - min
    val padding = if (range > 0) range * 0.2 else (kotlin.math.abs(min) * 0.2).takeIf { it > 0 } ?: 1.0
    val lower = if (min >= 0) maxOf(0.0, min - padding) else min - padding
    return lower to (max + padding)
}
