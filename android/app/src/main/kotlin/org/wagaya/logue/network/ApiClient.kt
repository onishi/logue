package org.wagaya.logue.network

import android.content.Context
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import org.wagaya.logue.BuildConfig
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

// apps/web/src/lib/apiClient.ts の CSRF_HEADER_NAME/VALUE と対になる。API側の
// requireCsrfHeader（apps/api/src/csrf.ts）が POST リクエストにこのヘッダーを要求する。
private const val CSRF_HEADER_NAME = "X-Logue-Client"
private const val CSRF_HEADER_VALUE = "android"

private class CsrfHeaderInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .header(CSRF_HEADER_NAME, CSRF_HEADER_VALUE)
            .build()
        return chain.proceed(request)
    }
}

object ApiClient {
    private val json = Json { ignoreUnknownKeys = true }

    fun create(context: Context, cookieJar: SessionCookieJar): ApiService {
        val okHttpClient = OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .addInterceptor(CsrfHeaderInterceptor())
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        return retrofit.create(ApiService::class.java)
    }
}
