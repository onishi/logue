package org.wagaya.logue.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import org.wagaya.logue.ui.entry.EntryScreen
import org.wagaya.logue.ui.entrylist.EntryListScreen
import org.wagaya.logue.ui.metrics.MetricManagementScreen

private enum class Tab(val label: String, val icon: ImageVector) {
    Entry("記録する", Icons.Filled.Add),
    EntryList("記録一覧", Icons.Filled.List),
    Metrics("項目管理", Icons.Filled.Settings),
}

/**
 * Web版の App.tsx（activeTab による画面切り替え）の Phase B 相当。ネストした NavHost は使わず、
 * シンプルなタブ状態で画面を切り替える（Web版と同じ方針）。
 */
@Composable
fun MainScreen(authRepository: AuthRepository, apiService: ApiService, onSignedOut: () -> Unit) {
    var selectedTab by remember { mutableStateOf(Tab.Entry) }
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("logue") },
                actions = {
                    TextButton(onClick = {
                        coroutineScope.launch {
                            authRepository.signOut()
                            onSignedOut()
                        }
                    }) { Text("ログアウト") }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when (selectedTab) {
                Tab.Entry -> EntryScreen(apiService = apiService)
                Tab.EntryList -> EntryListScreen(apiService = apiService)
                Tab.Metrics -> MetricManagementScreen(apiService = apiService)
            }
        }
    }
}
