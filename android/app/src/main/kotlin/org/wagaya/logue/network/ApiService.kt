package org.wagaya.logue.network

import org.wagaya.logue.network.dto.CreateEntryInput
import org.wagaya.logue.network.dto.CreateMetricGroupInput
import org.wagaya.logue.network.dto.CreateMetricInput
import org.wagaya.logue.network.dto.Entry
import org.wagaya.logue.network.dto.Metric
import org.wagaya.logue.network.dto.MetricGroup
import org.wagaya.logue.network.dto.MobileLoginRequest
import org.wagaya.logue.network.dto.UpdateMetricGroupInput
import org.wagaya.logue.network.dto.UpdateMetricInput
import org.wagaya.logue.network.dto.UpdateUserSettingsInput
import org.wagaya.logue.network.dto.User
import org.wagaya.logue.network.dto.UserSettings
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * apps/api の REST API をそのまま利用する。エンドポイントの形は
 * apps/web/src/lib/*Api.ts（entriesApi.ts / metricsApi.ts / metricGroupsApi.ts）と対応する。
 * Phase B時点では記録項目グループ・記録項目のCRUDまでを追加している。並び替え
 * （PUT /reorder）はドラッグ操作のCompose実装コストが高いため未対応（Phase C以降で検討）。
 * グラフ・CSV・設定に必要なエンドポイントは Phase C で追加する。
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

    @POST("api/metric-groups")
    suspend fun createMetricGroup(@Body body: CreateMetricGroupInput): MetricGroup

    @PATCH("api/metric-groups/{id}")
    suspend fun updateMetricGroup(@Path("id") id: String, @Body body: UpdateMetricGroupInput): MetricGroup

    @DELETE("api/metric-groups/{id}")
    suspend fun deleteMetricGroup(@Path("id") id: String)

    @GET("api/metrics")
    suspend fun listMetrics(): List<Metric>

    @POST("api/metrics")
    suspend fun createMetric(@Body body: CreateMetricInput): Metric

    @PATCH("api/metrics/{id}")
    suspend fun updateMetric(@Path("id") id: String, @Body body: UpdateMetricInput): Metric

    @DELETE("api/metrics/{id}")
    suspend fun deleteMetric(@Path("id") id: String)

    @GET("api/entries")
    suspend fun listEntries(
        @Query("metricId") metricId: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): List<Entry>

    @POST("api/entries")
    suspend fun createEntry(@Body body: CreateEntryInput): Entry

    @GET("api/user-settings")
    suspend fun getUserSettings(): UserSettings

    @PATCH("api/user-settings")
    suspend fun updateUserSettings(@Body body: UpdateUserSettingsInput): UserSettings
}
