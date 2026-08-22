package org.wagaya.logue.ui.entry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.CreateEntryInput
import org.wagaya.logue.network.dto.Metric

private val DATE_FORMATTER: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE

data class EntryUiState(
    val loading: Boolean = true,
    val metrics: List<Metric> = emptyList(),
    val values: Map<String, String> = emptyMap(),
    val submitting: Boolean = false,
    val message: String? = null,
    val errorMessage: String? = null,
)

/**
 * Web版の EntryFormScreen（apps/web/src/features/entries/EntryFormScreen.tsx）の
 * Phase A 相当。今日の日付固定・グループ分けなし・既存記録の事前読み込みなしの
 * 最小構成（Phase B以降で日付ページャー・グループ表示・既存値の反映を追加する）。
 */
class EntryViewModel(private val apiService: ApiService) : ViewModel() {
    private val _uiState = MutableStateFlow(EntryUiState())
    val uiState: StateFlow<EntryUiState> = _uiState.asStateFlow()

    init {
        loadMetrics()
    }

    private fun loadMetrics() {
        viewModelScope.launch {
            runCatching { apiService.listMetrics() }
                .onSuccess { metrics ->
                    val active = metrics.filter { !it.isArchived }
                    _uiState.value = _uiState.value.copy(loading = false, metrics = active)
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        loading = false,
                        errorMessage = error.message ?: "記録項目の取得に失敗しました",
                    )
                }
        }
    }

    fun updateValue(metricId: String, value: String) {
        _uiState.value = _uiState.value.copy(
            values = _uiState.value.values + (metricId to value),
        )
    }

    fun submit() {
        val state = _uiState.value
        val recordedAt = LocalDate.now().format(DATE_FORMATTER)
        val inputs = state.metrics.mapNotNull { metric ->
            val value = state.values[metric.id]?.trim()
            if (value.isNullOrEmpty()) null else CreateEntryInput(metric.id, value, recordedAt)
        }
        if (inputs.isEmpty()) return

        _uiState.value = state.copy(submitting = true, message = null, errorMessage = null)
        viewModelScope.launch {
            runCatching { inputs.forEach { apiService.createEntry(it) } }
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        submitting = false,
                        values = emptyMap(),
                        message = "記録しました",
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        submitting = false,
                        errorMessage = error.message ?: "記録に失敗しました",
                    )
                }
        }
    }
}
