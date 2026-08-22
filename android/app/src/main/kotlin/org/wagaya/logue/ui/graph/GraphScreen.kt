package org.wagaya.logue.ui.graph

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import kotlin.math.roundToInt
import org.wagaya.logue.graph.SeriesPoint
import org.wagaya.logue.graph.computeYAxisDomain
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.Metric

private val MOVING_AVERAGE_OPTIONS = listOf(0 to "なし", 7 to "7日移動平均", 30 to "30日移動平均")

@Composable
fun GraphScreen(apiService: ApiService) {
    val viewModel: GraphViewModel = viewModel(
        factory = viewModelFactory {
            initializer { GraphViewModel(apiService) }
        },
    )
    val uiState by viewModel.uiState.collectAsState()

    if (uiState.loading) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) { CircularProgressIndicator() }
        return
    }

    if (uiState.numberMetrics.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
        ) {
            Text("数値型の記録項目がまだありません。「項目管理」から数値項目を追加してください。")
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MOVING_AVERAGE_OPTIONS.forEach { (days, label) ->
                    FilterChip(
                        selected = uiState.movingAverageWindow == days,
                        onClick = { viewModel.setMovingAverageWindow(days) },
                        label = { Text(label) },
                    )
                }
            }
        }
        items(uiState.numberMetrics, key = { it.id }) { metric ->
            val series = viewModel.seriesFor(metric.id)
            MetricChart(metric, series)
        }
    }
}

@Composable
private fun MetricChart(metric: Metric, series: List<SeriesPoint>) {
    val label = if (metric.unit != null) "${metric.name}（${metric.unit}）" else metric.name
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, style = MaterialTheme.typography.titleSmall)
        if (series.isEmpty()) {
            Text("記録がありません。", style = MaterialTheme.typography.bodyMedium)
        } else {
            val domain = computeYAxisDomain(series)
            val color = MaterialTheme.colorScheme.primary
            if (domain != null) {
                Text(
                    "${formatValue(domain.second)} ─ ${formatValue(domain.first)}",
                    style = MaterialTheme.typography.labelSmall,
                )
            }
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp),
            ) {
                if (domain == null) return@Canvas
                val (minY, maxY) = domain
                val range = (maxY - minY).let { if (it > 0) it else 1.0 }
                val stepX = if (series.size > 1) size.width / (series.size - 1) else 0f
                val points = series.mapIndexed { index, point ->
                    val x = index * stepX
                    val normalized = ((point.value - minY) / range).toFloat()
                    val y = size.height - normalized * size.height
                    Offset(x, y)
                }
                for (i in 0 until points.size - 1) {
                    drawLine(color = color, start = points[i], end = points[i + 1], strokeWidth = 4f)
                }
                points.forEach { point -> drawCircle(color = color, radius = 5f, center = point) }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(series.first().date, style = MaterialTheme.typography.labelSmall)
                if (series.size > 1) {
                    Text(series.last().date, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

private fun formatValue(value: Double): String {
    val rounded = (value * 100).roundToInt() / 100.0
    return if (rounded == rounded.toLong().toDouble()) rounded.toLong().toString() else rounded.toString()
}
