package org.wagaya.logue.ui.graph

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.wagaya.logue.graph.SeriesPoint
import org.wagaya.logue.graph.movingAverage
import org.wagaya.logue.graph.toDailySeries
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.Entry
import org.wagaya.logue.network.dto.Metric

data class GraphUiState(
    val loading: Boolean = true,
    val numberMetrics: List<Metric> = emptyList(),
    val entries: List<Entry> = emptyList(),
    val movingAverageWindow: Int = 0,
    val errorMessage: String? = null,
)

/**
 * Web版の GraphScreen（apps/web/src/features/graphs/GraphScreen.tsx）のうち、日別表示・
 * 移動平均（なし/7日/30日）のみの Phase C 相当。週別/月別集約・カスタム移動平均日数・
 * 表ビューは未対応。
 */
class GraphViewModel(private val apiService: ApiService) : ViewModel() {
    private val _uiState = MutableStateFlow(GraphUiState())
    val uiState: StateFlow<GraphUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching {
                val metrics = apiService.listMetrics()
                val entries = apiService.listEntries()
                metrics to entries
            }.onSuccess { (metrics, entries) ->
                val numberMetrics = metrics.filter { it.type == "number" && !it.isArchived }
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    numberMetrics = numberMetrics,
                    entries = entries,
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    errorMessage = error.message ?: "読み込みに失敗しました",
                )
            }
        }
    }

    fun setMovingAverageWindow(days: Int) {
        _uiState.value = _uiState.value.copy(movingAverageWindow = days)
    }

    fun seriesFor(metricId: String): List<SeriesPoint> {
        val state = _uiState.value
        val daily = toDailySeries(state.entries.filter { it.metricId == metricId })
        return if (state.movingAverageWindow > 1) movingAverage(daily, state.movingAverageWindow) else daily
    }
}
