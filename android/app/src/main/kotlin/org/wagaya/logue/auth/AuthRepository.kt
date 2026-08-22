package org.wagaya.logue.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import org.wagaya.logue.BuildConfig
import org.wagaya.logue.network.ApiService
import org.wagaya.logue.network.SessionCookieJar
import org.wagaya.logue.network.dto.MobileLoginRequest
import org.wagaya.logue.network.dto.User

/**
 * Credential Manager（Sign in with Google）で Google ID トークンを取得し、
 * API 側の POST /api/auth/mobile-login に渡してセッション（Cookie）を確立する。
 *
 * serverClientId には Google Cloud Console 上の「ウェブ アプリケーション」種別の
 * OAuth クライアントID（apps/api の GOOGLE_CLIENT_ID と同じもの）を使う。加えて、
 * Google Cloud Console 側でこのアプリの applicationId + 署名証明書のSHA-1を登録した
 * 「Android」種別のOAuthクライアントの作成も必要（詳細は docs/google-oauth-setup.md）。
 */
class AuthRepository(
    private val context: Context,
    private val apiService: ApiService,
    private val cookieJar: SessionCookieJar,
) {
    private val credentialManager = CredentialManager.create(context)

    val isSignedIn: Boolean
        get() = cookieJar.hasSession()

    suspend fun signIn(): Result<User> {
        return try {
            val option = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_SERVER_CLIENT_ID).build()
            val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
            val response = credentialManager.getCredential(context, request)

            val credential = response.credential
            if (credential !is CustomCredential ||
                credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                return Result.failure(IllegalStateException("想定外のCredential種別です"))
            }

            val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
            val user = apiService.mobileLogin(MobileLoginRequest(googleIdTokenCredential.idToken))
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signOut() {
        runCatching { apiService.logout() }
        cookieJar.clear()
    }
}
