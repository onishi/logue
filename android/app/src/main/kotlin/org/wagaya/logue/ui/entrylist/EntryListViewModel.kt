package org.wagaya.logue.ui.entrylist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.Entry
import org.wagaya.logue.network.dto.Metric

data class EntryListUiState(
    val loading: Boolean = true,
    val dates: List<String> = emptyList(),
    val columns: List<Metric> = emptyList(),
    val cells: Map<String, String> = emptyMap(), // key: "date|metricId" -> 表示用の値
    val errorMessage: String? = null,
)

/**
 * Web版の EntryListScreen（ピボットテーブル表示）の Phase B 相当。グループ・記録項目での
 * 絞り込みは未対応（Phase Cで追加）。列は「記録が1件以上ある記録項目」のみ（Web版のフィルタ
 * なし時の挙動と同じ）。choice型の値は選択肢ラベルに変換して表示する。
 */
class EntryListViewModel(private val apiService: ApiService) : ViewModel() {
    private val _uiState = MutableStateFlow(EntryListUiState())
    val uiState: StateFlow<EntryListUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, errorMessage = null)
            runCatching {
                val metrics = apiService.listMetrics()
                val entries = apiService.listEntries()
                metrics to entries
            }.onSuccess { (metrics, entries) ->
                _uiState.value = buildUiState(metrics, entries)
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    errorMessage = error.message ?: "読み込みに失敗しました",
                )
            }
        }
    }

    private fun buildUiState(metrics: List<Metric>, entries: List<Entry>): EntryListUiState {
        val metricById = metrics.associateBy { it.id }
        val columnMetricIds = entries.mapNotNull { metricById[it.metricId]?.id }.toSet()
        val columns = metrics.filter { it.id in columnMetricIds }.sortedBy { it.sortOrder }
        val dates = entries.map { it.recordedAt }.toSortedSet(compareByDescending { it })

        val cells = entries.mapNotNull { entry ->
            val metric = metricById[entry.metricId] ?: return@mapNotNull null
            if (metric.id !in columnMetricIds) return@mapNotNull null
            val displayValue = if (metric.type == "choice") {
                metric.choiceOptions.firstOrNull { it.id == entry.value }?.label ?: entry.value
            } else {
                entry.value
            }
            "${entry.recordedAt}|${metric.id}" to displayValue
        }.toMap()

        return EntryListUiState(loading = false, dates = dates.toList(), columns = columns, cells = cells)
    }
}
