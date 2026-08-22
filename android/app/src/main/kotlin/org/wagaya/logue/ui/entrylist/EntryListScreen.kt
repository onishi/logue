package org.wagaya.logue.ui.entrylist

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.Metric

private val DATE_COLUMN_WIDTH = 96.dp
private val VALUE_COLUMN_WIDTH = 120.dp

@Composable
fun EntryListScreen(apiService: ApiService) {
    val viewModel: EntryListViewModel = viewModel(
        factory = viewModelFactory {
            initializer { EntryListViewModel(apiService) }
        },
    )
    val uiState by viewModel.uiState.collectAsState()

    when {
        uiState.loading -> Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) { CircularProgressIndicator() }

        uiState.dates.isEmpty() -> Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
        ) { Text("記録がありません。") }

        else -> {
            val horizontalScrollState = rememberScrollState()
            Column(modifier = Modifier.fillMaxSize()) {
                Row(modifier = Modifier.horizontalScroll(horizontalScrollState)) {
                    HeaderCell("日付", DATE_COLUMN_WIDTH)
                    uiState.columns.forEach { metric -> HeaderCell(columnLabel(metric), VALUE_COLUMN_WIDTH) }
                }
                HorizontalDivider()
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(uiState.dates, key = { it }) { date ->
                        Row(modifier = Modifier.horizontalScroll(horizontalScrollState)) {
                            ValueCell(date, DATE_COLUMN_WIDTH)
                            uiState.columns.forEach { metric ->
                                val value = uiState.cells["$date|${metric.id}"] ?: "—"
                                ValueCell(value, VALUE_COLUMN_WIDTH)
                            }
                        }
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}

private fun columnLabel(metric: Metric): String =
    if (metric.unit != null) "${metric.name}（${metric.unit}）" else metric.name

@Composable
private fun HeaderCell(text: String, width: Dp) {
    Text(
        text,
        style = MaterialTheme.typography.labelLarge,
        modifier = Modifier
            .width(width)
            .padding(8.dp),
    )
}

@Composable
private fun ValueCell(text: String, width: Dp) {
    Text(
        text,
        modifier = Modifier
            .width(width)
            .padding(8.dp),
    )
}
