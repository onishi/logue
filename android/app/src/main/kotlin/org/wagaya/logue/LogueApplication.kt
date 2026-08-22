package org.wagaya.logue

import android.app.Application
import org.wagaya.logue.auth.AuthRepository
import org.wagaya.logue.network.ApiClient
import org.wagaya.logue.network.SessionCookieJar

/**
 * DIコンテナは使わず、Application レベルでシングルトンを手動構築する最小構成。
 * 画面数が増えて依存関係が複雑になってきたら Hilt 等の導入を検討する。
 */
class LogueApplication : Application() {
    val cookieJar: SessionCookieJar by lazy { SessionCookieJar(this) }
    val apiService by lazy { ApiClient.create(this, cookieJar) }
    val authRepository: AuthRepository by lazy { AuthRepository(this, apiService, cookieJar) }
}
