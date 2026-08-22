package org.wagaya.logue.ui.csv

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.wagaya.logue.csv.GridParseResult
import org.wagaya.logue.csv.buildGridRows
import org.wagaya.logue.csv.parseCsv
import org.wagaya.logue.csv.parseGridRows
import org.wagaya.logue.csv.toCsv
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.Entry
import org.wagaya.logue.network.dto.Metric

// Excel等で開いても文字化けしないよう付与するUTF-8 BOM（apps/web/src/lib/csv.ts と同じ方針）。
const val UTF8_BOM = "\uFEFF"

data class CsvUiState(
    val loading: Boolean = true,
    val metrics: List<Metric> = emptyList(),
    val entries: List<Entry> = emptyList(),
    val importPreview: GridParseResult? = null,
    val importing: Boolean = false,
    val message: String? = null,
    val errorMessage: String? = null,
)

/**
 * Web版の CsvScreen（apps/web/src/features/entries/CsvScreen.tsx）の Phase C 相当。
 * グループ・記録項目での絞り込みは未対応（常に全項目・全記録を対象とする）。
 * TSV貼り付けインポートは対応せず、ファイル選択（Storage Access Framework）のみ。
 */
class CsvViewModel(private val apiService: ApiService) : ViewModel() {
    private val _uiState = MutableStateFlow(CsvUiState())
    val uiState: StateFlow<CsvUiState> = _uiState.asStateFlow()

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
                _uiState.value = _uiState.value.copy(loading = false, metrics = metrics, entries = entries)
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    errorMessage = error.message ?: "読み込みに失敗しました",
                )
            }
        }
    }

    fun buildExportCsvText(): String {
        val state = _uiState.value
        return UTF8_BOM + toCsv(buildGridRows(state.metrics, state.entries))
    }

    fun previewImport(csvText: String) {
        val result = parseGridRows(parseCsv(csvText), _uiState.value.metrics)
        _uiState.value = _uiState.value.copy(importPreview = result, message = null, errorMessage = null)
    }

    fun cancelImport() {
        _uiState.value = _uiState.value.copy(importPreview = null)
    }

    fun confirmImport() {
        val preview = _uiState.value.importPreview ?: return
        if (preview.rows.isEmpty()) return

        _uiState.value = _uiState.value.copy(importing = true)
        viewModelScope.launch {
            runCatching { preview.rows.forEach { apiService.createEntry(it) } }
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        importing = false,
                        importPreview = null,
                        message = "${preview.rows.size}件を読み込みました",
                    )
                    refresh()
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        importing = false,
                        errorMessage = error.message ?: "読み込みに失敗しました",
                    )
                }
        }
    }
}
