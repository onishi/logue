package org.wagaya.logue.ui.csv

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import java.io.BufferedReader
import java.io.InputStreamReader
import org.wagaya.logue.network.ApiService

@Composable
fun CsvScreen(apiService: ApiService) {
    val context = LocalContext.current
    val viewModel: CsvViewModel = viewModel(
        factory = viewModelFactory {
            initializer { CsvViewModel(apiService) }
        },
    )
    val uiState by viewModel.uiState.collectAsState()

    val exportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("text/csv"),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        context.contentResolver.openOutputStream(uri)?.use { stream ->
            stream.write(viewModel.buildExportCsvText().toByteArray(Charsets.UTF_8))
        }
    }

    val importLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        context.contentResolver.openInputStream(uri)?.use { stream ->
            val text = BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).readText()
            viewModel.previewImport(text)
        }
    }

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
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("エクスポート", style = MaterialTheme.typography.titleMedium)
        if (uiState.entries.isEmpty()) {
            Text("書き出せる記録がありません。")
        } else {
            Button(
                onClick = { exportLauncher.launch("logue-entries.csv") },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("CSVでエクスポート") }
        }

        HorizontalDivider()

        Text("インポート", style = MaterialTheme.typography.titleMedium)
        Button(
            onClick = { importLauncher.launch(arrayOf("text/csv", "text/comma-separated-values", "*/*")) },
            modifier = Modifier.fillMaxWidth(),
        ) { Text("CSVファイルを選択") }

        val preview = uiState.importPreview
        if (preview != null) {
            Text("${preview.rows.size}件を読み込みます", style = MaterialTheme.typography.bodyMedium)
            if (preview.issues.isNotEmpty()) {
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(preview.issues) { issue ->
                        Text(issue, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { viewModel.confirmImport() },
                    enabled = !uiState.importing && preview.rows.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("この内容で読み込む") }
                TextButton(onClick = { viewModel.cancelImport() }) { Text("キャンセル") }
            }
        }

        uiState.message?.let { Text(it) }
        uiState.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}
