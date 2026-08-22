package org.wagaya.logue.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.UpdateUserSettingsInput

data class SettingsUiState(
    val loading: Boolean = true,
    val theme: String = "system",
    val errorMessage: String? = null,
)

/**
 * Web版の SettingsScreen（apps/web/src/features/settings/SettingsScreen.tsx）のうち
 * テーマ設定のみの Phase C 相当。Googleスプレッドシート連携の設定はアプリ内OAuthフローの
 * 実装が別途必要なため未対応（Web版を使うこと）。
 *
 * 取得したテーマ設定は onThemeSettingChange 経由で呼び出し側（MainActivity が保持する状態）に
 * も反映し、実際に画面のテーマへ反映されるようにする。
 */
class SettingsViewModel(
    private val apiService: ApiService,
    private val onThemeSettingChange: (String) -> Unit,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching { apiService.getUserSettings() }
                .onSuccess { settings ->
                    _uiState.value = _uiState.value.copy(loading = false, theme = settings.theme)
                    onThemeSettingChange(settings.theme)
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        loading = false,
                        errorMessage = error.message ?: "読み込みに失敗しました",
                    )
                }
        }
    }

    fun updateTheme(theme: String) {
        val previous = _uiState.value.theme
        _uiState.value = _uiState.value.copy(theme = theme)
        onThemeSettingChange(theme)
        viewModelScope.launch {
            runCatching { apiService.updateUserSettings(UpdateUserSettingsInput(theme = theme)) }
                .onFailure { error ->
                    // 保存に失敗したら表示を元に戻す
                    _uiState.value = _uiState.value.copy(
                        theme = previous,
                        errorMessage = error.message ?: "保存に失敗しました",
                    )
                    onThemeSettingChange(previous)
                }
        }
    }
}
