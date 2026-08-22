package org.wagaya.logue.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import org.wagaya.logue.auth.AuthRepository
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.ui.entry.EntryScreen
import org.wagaya.logue.ui.login.LoginScreen

private const val ROUTE_LOGIN = "login"
private const val ROUTE_ENTRY = "entry"

/**
 * Phase A のナビゲーション。画面は「ログイン」「記録する」の2つのみ（下部タブは未実装）。
 * 記録一覧・グラフ・項目管理・CSV・設定は Phase B/C で追加する。
 */
@Composable
fun LogueNavHost(authRepository: AuthRepository, apiService: ApiService) {
    val navController: NavHostController = rememberNavController()
    val startDestination = if (authRepository.isSignedIn) ROUTE_ENTRY else ROUTE_LOGIN

    NavHost(navController = navController, startDestination = startDestination) {
        composable(ROUTE_LOGIN) {
            LoginScreen(
                authRepository = authRepository,
                onSignedIn = {
                    navController.navigate(ROUTE_ENTRY) {
                        popUpTo(ROUTE_LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(ROUTE_ENTRY) {
            EntryScreen(apiService = apiService)
        }
    }
}
