package org.wagaya.logue

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import org.wagaya.logue.ui.LogueNavHost
import org.wagaya.logue.ui.theme.LogueTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as LogueApplication

        setContent {
            // ログイン前・設定未取得の間は "system"。ログイン後、設定画面（SettingsScreen）が
            // /api/user-settings から取得した値でこれを更新する。
            var themeSetting by remember { mutableStateOf("system") }

            LogueTheme(themeSetting = themeSetting) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    LogueNavHost(
                        authRepository = app.authRepository,
                        apiService = app.apiService,
                        themeSetting = themeSetting,
                        onThemeSettingChange = { themeSetting = it },
                    )
                }
            }
        }
    }
}
