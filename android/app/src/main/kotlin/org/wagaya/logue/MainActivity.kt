package org.wagaya.logue

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import org.wagaya.logue.ui.LogueNavHost
import org.wagaya.logue.ui.theme.LogueTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as LogueApplication

        setContent {
            LogueTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    LogueNavHost(
                        authRepository = app.authRepository,
                        apiService = app.apiService,
                    )
                }
            }
        }
    }
}
