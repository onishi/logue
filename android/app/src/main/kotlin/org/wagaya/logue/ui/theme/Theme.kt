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

/**
 * themeSetting は Web版の ThemeSetting（"system" | "light" | "dark"、
 * packages/shared/src/types/userSettings.ts）と同じ値をそのまま受け取る。
 * ログイン前・設定未取得の間は "system" として端末設定に従う。
 */
@Composable
fun LogueTheme(
    themeSetting: String = "system",
    content: @Composable () -> Unit,
) {
    val darkTheme = when (themeSetting) {
        "light" -> false
        "dark" -> true
        else -> isSystemInDarkTheme()
    }
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(colorScheme = colorScheme, content = content)
}
