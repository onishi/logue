package org.wagaya.logue.network

import org.wagaya.logue.network.dto.CreateEntryInput
import org.wagaya.logue.network.dto.Entry
import org.wagaya.logue.network.dto.Metric
import org.wagaya.logue.network.dto.MetricGroup
import org.wagaya.logue.network.dto.MobileLoginRequest
import org.wagaya.logue.network.dto.User
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * apps/api の REST API をそのまま利用する。エンドポイントの形は
 * apps/web/src/lib/*Api.ts（entriesApi.ts / metricsApi.ts / metricGroupsApi.ts）と対応する。
 * Phase A（このスキャフォールド時点）ではログイン・記録する画面に必要な最小限のみ定義し、
 * 記録一覧・グラフ・CSV・設定に必要なエンドポイントは Phase B/C で追加する。
 */
interface ApiService {
    @POST("api/auth/mobile-login")
    suspend fun mobileLogin(@Body body: MobileLoginRequest): User

    @GET("api/auth/me")
    suspend fun me(): User

    @POST("api/auth/logout")
    suspend fun logout()

    @GET("api/metric-groups")
    suspend fun listMetricGroups(): List<MetricGroup>

    @GET("api/metrics")
    suspend fun listMetrics(): List<Metric>

    @GET("api/entries")
    suspend fun listEntries(
        @Query("metricId") metricId: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): List<Entry>

    @POST("api/entries")
    suspend fun createEntry(@Body body: CreateEntryInput): Entry
}
