package org.wagaya.logue.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import org.wagaya.logue.auth.AuthRepository
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.ui.login.LoginScreen

private const val ROUTE_LOGIN = "login"
private const val ROUTE_MAIN = "main"

/**
 * Phase B のナビゲーション。「ログイン」と、下部タブ3つ（記録する/記録一覧/項目管理）を持つ
 * 「メイン」の2ルートのみ。タブ切り替え自体は MainScreen 内のローカル状態で行う
 * （ネストした NavHost にはしない）。グラフ・CSV・設定は Phase C で追加する。
 */
@Composable
fun LogueNavHost(authRepository: AuthRepository, apiService: ApiService) {
    val navController: NavHostController = rememberNavController()
    val startDestination = if (authRepository.isSignedIn) ROUTE_MAIN else ROUTE_LOGIN

    NavHost(navController = navController, startDestination = startDestination) {
        composable(ROUTE_LOGIN) {
            LoginScreen(
                authRepository = authRepository,
                onSignedIn = {
                    navController.navigate(ROUTE_MAIN) {
                        popUpTo(ROUTE_LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(ROUTE_MAIN) {
            MainScreen(
                authRepository = authRepository,
                apiService = apiService,
                onSignedOut = {
                    navController.navigate(ROUTE_LOGIN) {
                        popUpTo(ROUTE_MAIN) { inclusive = true }
                    }
                },
            )
        }
    }
}
