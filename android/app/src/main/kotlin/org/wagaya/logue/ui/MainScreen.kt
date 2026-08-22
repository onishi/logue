package org.wagaya.logue.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import kotlinx.coroutines.launch
import org.wagaya.logue.auth.AuthRepository
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.ui.csv.CsvScreen
import org.wagaya.logue.ui.entry.EntryScreen
import org.wagaya.logue.ui.entrylist.EntryListScreen
import org.wagaya.logue.ui.graph.GraphScreen
import org.wagaya.logue.ui.metrics.MetricManagementScreen
import org.wagaya.logue.ui.settings.SettingsScreen

private enum class BottomTab(val label: String, val icon: ImageVector) {
    Entry("記録する", Icons.Filled.Add),
    EntryList("記録一覧", Icons.Filled.List),
    Graph("グラフ", Icons.Filled.Info),
    Metrics("項目管理", Icons.Filled.Edit),
}

private sealed interface Screen {
    data class Bottom(val tab: BottomTab) : Screen
    data object Csv : Screen
    data object Settings : Screen
}

/**
 * Web版の App.tsx（activeTab による画面切り替え）に相当。ネストした NavHost は使わず、
 * シンプルな状態で画面を切り替える（Web版と同じ方針）。Web版と同様、下部タブは
 * 記録する/記録一覧/グラフ/項目管理の4つとし（Web版と同じ構成）、CSV入出力・設定は
 * 右上のメニューから開く。
 */
@Composable
fun MainScreen(
    authRepository: AuthRepository,
    apiService: ApiService,
    themeSetting: String,
    onThemeSettingChange: (String) -> Unit,
    onSignedOut: () -> Unit,
) {
    var screen by remember { mutableStateOf<Screen>(Screen.Bottom(BottomTab.Entry)) }
    var menuExpanded by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("logue") },
                actions = {
                    IconButton(onClick = { menuExpanded = true }) {
                        Icon(Icons.Filled.MoreVert, contentDescription = "メニュー")
                    }
                    DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                        DropdownMenuItem(
                            text = { Text("CSV入出力") },
                            onClick = {
                                menuExpanded = false
                                screen = Screen.Csv
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("設定") },
                            onClick = {
                                menuExpanded = false
                                screen = Screen.Settings
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("ログアウト") },
                            onClick = {
                                menuExpanded = false
                                coroutineScope.launch {
                                    authRepository.signOut()
                                    onSignedOut()
                                }
                            },
                        )
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                BottomTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = screen == Screen.Bottom(tab),
                        onClick = { screen = Screen.Bottom(tab) },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when (val current = screen) {
                is Screen.Bottom -> when (current.tab) {
                    BottomTab.Entry -> EntryScreen(apiService = apiService)
                    BottomTab.EntryList -> EntryListScreen(apiService = apiService)
                    BottomTab.Graph -> GraphScreen(apiService = apiService)
                    BottomTab.Metrics -> MetricManagementScreen(apiService = apiService)
                }
                Screen.Csv -> CsvScreen(apiService = apiService)
                Screen.Settings -> SettingsScreen(
                    apiService = apiService,
                    themeSetting = themeSetting,
                    onThemeSettingChange = onThemeSettingChange,
                )
            }
        }
    }
}
