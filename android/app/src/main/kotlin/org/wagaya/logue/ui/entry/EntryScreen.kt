package org.wagaya.logue.ui.entry

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.Metric

@Composable
fun EntryScreen(apiService: ApiService) {
    val viewModel: EntryViewModel = viewModel(
        factory = viewModelFactory {
            initializer { EntryViewModel(apiService) }
        },
    )
    val uiState by viewModel.uiState.collectAsState()

    when {
        uiState.loading -> Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) { CircularProgressIndicator() }

        uiState.metrics.isEmpty() -> Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text("記録項目がまだありません。Web版の「項目管理」から追加してください。")
        }

        else -> Column(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(uiState.metrics, key = { it.id }) { metric ->
                    MetricInputField(
                        metric = metric,
                        value = uiState.values[metric.id] ?: "",
                        onValueChange = { viewModel.updateValue(metric.id, it) },
                    )
                }
            }

            uiState.message?.let {
                Text(it, modifier = Modifier.padding(horizontal = 16.dp))
            }
            uiState.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = 16.dp))
            }

            Button(
                onClick = { viewModel.submit() },
                enabled = !uiState.submitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
            ) {
                Text("記録する")
            }
        }
    }
}

/**
 * Phase A では種別に関わらずテキスト入力欄で統一している（number は数値キーボードのみ出し分け）。
 * choice 型は本来「選択肢ラベル→ID」への変換とピッカーUIが必要（Web版の
 * MetricValueInput.tsx を参照）だが、Phase A のスコープ外としてまだ実装していない。
 * choice型の記録項目を運用する場合は、Phase B でのピッカー実装まではWeb版を使うこと。
 */
@Composable
private fun MetricInputField(metric: Metric, value: String, onValueChange: (String) -> Unit) {
    val label = if (metric.unit != null) "${metric.name}（${metric.unit}）" else metric.name
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        keyboardOptions = if (metric.type == "number") {
            KeyboardOptions(keyboardType = KeyboardType.Decimal)
        } else {
            KeyboardOptions.Default
        },
        modifier = Modifier.fillMaxWidth(),
    )
}
