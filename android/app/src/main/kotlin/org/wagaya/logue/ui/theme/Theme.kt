package org.wagaya.logue.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Web版（apps/web/src/index.css の --accent 系トークン）に合わせたアクセントカラー。
// 将来、他の画面を実装する際に完全なカラースキームへ拡張する。
private val AccentLight = Color(0xFF2E7D6B)
private val AccentDark = Color(0xFF7FD9C4)

private val LightColors = lightColorScheme(primary = AccentLight)
private val DarkColors = darkColorScheme(primary = AccentDark)

@Composable
fun LogueTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(colorScheme = colorScheme, content = content)
}
