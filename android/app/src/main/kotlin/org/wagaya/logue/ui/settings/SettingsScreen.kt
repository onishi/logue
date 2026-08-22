package org.wagaya.logue.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import org.wagaya.logue.network.ApiService

private val THEME_OPTIONS = listOf("system" to "端末の設定に合わせる", "light" to "ライト", "dark" to "ダーク")

@Composable
fun SettingsScreen(apiService: ApiService, themeSetting: String, onThemeSettingChange: (String) -> Unit) {
    val viewModel: SettingsViewModel = viewModel(
        factory = viewModelFactory {
            initializer { SettingsViewModel(apiService, onThemeSettingChange) }
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("テーマ", style = MaterialTheme.typography.titleMedium)
        THEME_OPTIONS.forEach { (value, label) ->
            FilterChip(
                selected = uiState.theme == value,
                onClick = { viewModel.updateTheme(value) },
                label = { Text(label) },
            )
        }

        Text(
            "Googleスプレッドシート連携はAndroidアプリでは未対応です。Web版の設定画面をご利用ください。",
            style = MaterialTheme.typography.bodySmall,
        )

        uiState.errorMessage?.let { message ->
            Text(message, color = MaterialTheme.colorScheme.error)
        }
    }
}
