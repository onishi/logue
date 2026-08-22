package org.wagaya.logue.ui.metrics

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.dto.Metric
import org.wagaya.logue.network.dto.MetricGroup

private val METRIC_TYPES = listOf("number" to "数値", "choice" to "選択肢", "text" to "自由入力")

@Composable
fun MetricManagementScreen(apiService: ApiService) {
    val viewModel: MetricManagementViewModel = viewModel(
        factory = viewModelFactory {
            initializer { MetricManagementViewModel(apiService) }
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

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text("記録項目グループ", style = MaterialTheme.typography.titleMedium)
        }
        items(uiState.groups, key = { "group-${it.id}" }) { group ->
            GroupRow(
                group = group,
                onRename = { viewModel.renameGroup(group.id, it) },
                onDelete = { viewModel.deleteGroup(group.id) },
            )
        }
        item {
            NewGroupForm(onCreate = { viewModel.createGroup(it) })
        }

        item { HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp)) }

        item {
            Text("記録項目", style = MaterialTheme.typography.titleMedium)
        }
        items(groupedMetrics(uiState.metrics, uiState.groups), key = { it.first?.id ?: "ungrouped" }) { (group, metrics) ->
            Column {
                Text(
                    group?.name ?: "未分類",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                metrics.forEach { metric ->
                    MetricRow(
                        metric = metric,
                        onRename = { viewModel.renameMetric(metric.id, it) },
                        onToggleArchive = { viewModel.toggleArchive(metric) },
                        onDelete = { viewModel.deleteMetric(metric.id) },
                    )
                }
            }
        }
        item {
            NewMetricForm(
                groups = uiState.groups,
                onCreate = { name, type, unit, groupId, choiceLabels ->
                    viewModel.createMetric(name, type, unit, groupId, choiceLabels)
                },
            )
        }

        uiState.errorMessage?.let { message ->
            item { Text(message, color = MaterialTheme.colorScheme.error) }
        }
    }
}

/** グループごとに記録項目をまとめる（issue #92 のWeb版と同じ方針。未分類は末尾）。 */
private fun groupedMetrics(
    metrics: List<Metric>,
    groups: List<MetricGroup>,
): List<Pair<MetricGroup?, List<Metric>>> {
    val sections = groups.map { group -> group to metrics.filter { it.metricGroupId == group.id } }
    val ungrouped = metrics.filter { it.metricGroupId == null }
    return if (ungrouped.isNotEmpty()) sections + (null to ungrouped) else sections
}

@Composable
private fun GroupRow(group: MetricGroup, onRename: (String) -> Unit, onDelete: () -> Unit) {
    var editing by remember { mutableStateOf(false) }
    var name by remember(group.id) { mutableStateOf(group.name) }

    if (!editing) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Text(group.name, modifier = Modifier.weight(1f))
            TextButton(onClick = { editing = true }) { Text("編集") }
            TextButton(onClick = onDelete) { Text("削除") }
        }
    } else {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(value = name, onValueChange = { name = it }, modifier = Modifier.weight(1f))
            TextButton(onClick = {
                onRename(name)
                editing = false
            }) { Text("保存") }
        }
    }
}

@Composable
private fun NewGroupForm(onCreate: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("新しいグループ名") },
            modifier = Modifier.weight(1f),
        )
        TextButton(onClick = {
            onCreate(name)
            name = ""
        }) { Text("追加") }
    }
}

@Composable
private fun MetricRow(
    metric: Metric,
    onRename: (String) -> Unit,
    onToggleArchive: () -> Unit,
    onDelete: () -> Unit,
) {
    var editing by remember { mutableStateOf(false) }
    var name by remember(metric.id) { mutableStateOf(metric.name) }
    val typeLabel = METRIC_TYPES.firstOrNull { it.first == metric.type }?.second ?: metric.type
    val summary = buildString {
        append(metric.name)
        append(" (")
        append(typeLabel)
        if (metric.unit != null) append(" / ${metric.unit}")
        append(")")
        if (metric.isArchived) append(" [アーカイブ済み]")
    }

    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        if (!editing) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(summary, modifier = Modifier.weight(1f))
                TextButton(onClick = { editing = true }) { Text("編集") }
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(value = name, onValueChange = { name = it }, modifier = Modifier.weight(1f))
                TextButton(onClick = {
                    onRename(name)
                    editing = false
                }) { Text("保存") }
            }
            Row {
                TextButton(onClick = onToggleArchive) {
                    Text(if (metric.isArchived) "再表示する" else "アーカイブする")
                }
                TextButton(onClick = onDelete) { Text("削除") }
            }
        }
    }
}

@Composable
private fun NewMetricForm(
    groups: List<MetricGroup>,
    onCreate: (name: String, type: String, unit: String?, groupId: String?, choiceLabels: List<String>) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("number") }
    var unit by remember { mutableStateOf("") }
    var groupId by remember { mutableStateOf<String?>(null) }
    var choiceLabelsText by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        Text("新しい記録項目を追加", style = MaterialTheme.typography.titleSmall)
        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("名前") },
            modifier = Modifier.fillMaxWidth(),
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            METRIC_TYPES.forEach { (value, label) ->
                FilterChip(selected = type == value, onClick = { type = value }, label = { Text(label) })
            }
        }

        if (type == "number") {
            OutlinedTextField(
                value = unit,
                onValueChange = { unit = it },
                label = { Text("単位") },
                modifier = Modifier.fillMaxWidth(),
            )
        }

        if (type == "choice") {
            OutlinedTextField(
                value = choiceLabelsText,
                onValueChange = { choiceLabelsText = it },
                label = { Text("選択肢（カンマ区切り）") },
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilterChip(selected = groupId == null, onClick = { groupId = null }, label = { Text("未分類") })
            groups.forEach { group ->
                FilterChip(
                    selected = groupId == group.id,
                    onClick = { groupId = group.id },
                    label = { Text(group.name) },
                )
            }
        }

        Button(
            onClick = {
                onCreate(name, type, unit.ifBlank { null }, groupId, choiceLabelsText.split(","))
                name = ""
                unit = ""
                choiceLabelsText = ""
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("記録項目を追加")
        }
    }
}
