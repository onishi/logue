package org.wagaya.logue.ui.metrics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.ChoiceOptionInput
import org.wagaya.logue.network.dto.CreateMetricGroupInput
import org.wagaya.logue.network.dto.CreateMetricInput
import org.wagaya.logue.network.dto.Metric
import org.wagaya.logue.network.dto.MetricGroup
import org.wagaya.logue.network.dto.UpdateMetricGroupInput
import org.wagaya.logue.network.dto.UpdateMetricInput

data class MetricManagementUiState(
    val loading: Boolean = true,
    val groups: List<MetricGroup> = emptyList(),
    val metrics: List<Metric> = emptyList(),
    val errorMessage: String? = null,
)

/**
 * Web版の MetricManagementScreen（apps/web/src/features/metrics/MetricManagementScreen.tsx）の
 * Phase B 相当。ドラッグ&ドロップによる並び替え（useDragReorder）はComposeでの実装コストが
 * 高いため未対応（新規作成順のまま）。グループの「未分類」への付け替え（metricGroupIdを
 * 明示的にnullへ戻す操作）もPhase Bでは未対応（PATCHの部分更新でnullと未指定を区別する
 * シリアライズ対応が必要なため。Phase Cで対応予定）。
 */
class MetricManagementViewModel(private val apiService: ApiService) : ViewModel() {
    private val _uiState = MutableStateFlow(MetricManagementUiState())
    val uiState: StateFlow<MetricManagementUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, errorMessage = null)
            runCatching {
                val groups = apiService.listMetricGroups()
                val metrics = apiService.listMetrics()
                groups to metrics
            }.onSuccess { (groups, metrics) ->
                _uiState.value = _uiState.value.copy(loading = false, groups = groups, metrics = metrics)
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    errorMessage = error.message ?: "読み込みに失敗しました",
                )
            }
        }
    }

    fun createGroup(name: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            runCatching { apiService.createMetricGroup(CreateMetricGroupInput(name.trim())) }
                .onSuccess { refresh() }
                .onFailure { setError(it) }
        }
    }

    fun renameGroup(id: String, name: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            runCatching { apiService.updateMetricGroup(id, UpdateMetricGroupInput(name.trim())) }
                .onSuccess { refresh() }
                .onFailure { setError(it) }
        }
    }

    fun deleteGroup(id: String) {
        viewModelScope.launch {
            runCatching { apiService.deleteMetricGroup(id) }
                .onSuccess { refresh() }
                .onFailure { setError(it) }
        }
    }

    fun createMetric(
        name: String,
        type: String,
        unit: String?,
        metricGroupId: String?,
        choiceLabels: List<String>,
    ) {
        if (name.isBlank()) return
        val options = choiceLabels.map { it.trim() }.filter { it.isNotEmpty() }
        if (type == "choice" && options.isEmpty()) return

        viewModelScope.launch {
            runCatching {
                apiService.createMetric(
                    CreateMetricInput(
                        metricGroupId = metricGroupId,
                        name = name.trim(),
                        type = type,
                        unit = if (type == "number" && !unit.isNullOrBlank()) unit.trim() else null,
                        choiceOptions = if (type == "choice") options.map { ChoiceOptionInput(it) } else null,
                    ),
                )
            }.onSuccess { refresh() }.onFailure { setError(it) }
        }
    }

    fun renameMetric(id: String, name: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            runCatching { apiService.updateMetric(id, UpdateMetricInput(name = name.trim())) }
                .onSuccess { refresh() }
                .onFailure { setError(it) }
        }
    }

    fun toggleArchive(metric: Metric) {
        viewModelScope.launch {
            runCatching { apiService.updateMetric(metric.id, UpdateMetricInput(isArchived = !metric.isArchived)) }
                .onSuccess { refresh() }
                .onFailure { setError(it) }
        }
    }

    fun deleteMetric(id: String) {
        viewModelScope.launch {
            runCatching { apiService.deleteMetric(id) }
                .onSuccess { refresh() }
                .onFailure { setError(it) }
        }
    }

    private fun setError(error: Throwable) {
        _uiState.value = _uiState.value.copy(errorMessage = error.message ?: "操作に失敗しました")
    }
}
