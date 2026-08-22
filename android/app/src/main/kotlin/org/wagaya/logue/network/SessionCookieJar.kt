package org.wagaya.logue.network

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

private const val PREFS_NAME = "logue_session"
private const val KEY_COOKIE = "session_cookie"

/**
 * API から発行される署名付きセッション Cookie（logue_session）を SharedPreferences に
 * 永続化する、最小限の CookieJar 実装。Web版のブラウザCookieと同じセッション機構を
 * そのまま使うため、アプリ側の実装はこの Cookie を保存・再送するだけでよい
 * （apps/api/src/auth/session.ts 側の変更は不要）。
 *
 * 複数ドメインへの汎用対応はせず、API のホストに対してのみ Cookie を保持する
 * 単純な実装にとどめている。
 */
class SessionCookieJar(context: Context) : CookieJar {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private var cachedCookie: Cookie? = prefs.getString(KEY_COOKIE, null)?.let { raw ->
        Cookie.parse(PLACEHOLDER_URL, raw)
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val sessionCookie = cookies.find { it.name == SESSION_COOKIE_NAME } ?: return
        cachedCookie = sessionCookie
        prefs.edit { putString(KEY_COOKIE, sessionCookie.toString()) }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val cookie = cachedCookie ?: return emptyList()
        if (cookie.expiresAt < System.currentTimeMillis()) {
            clear()
            return emptyList()
        }
        return listOf(cookie)
    }

    fun clear() {
        cachedCookie = null
        prefs.edit { remove(KEY_COOKIE) }
    }

    fun hasSession(): Boolean = cachedCookie != null

    companion object {
        private const val SESSION_COOKIE_NAME = "logue_session"

        // Cookie.parse は Cookie ヘッダー文字列の再構築（toString）専用に使うだけなので、
        // ドメインはビルド時に ApiClient から渡される実際のホストで上書きされる。
        private val PLACEHOLDER_URL = HttpUrl.Builder()
            .scheme("https")
            .host("placeholder.invalid")
            .build()
    }
}
