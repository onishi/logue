package org.wagaya.logue.network.dto

import kotlinx.serialization.Serializable

// apps/api の REST API・packages/shared の型定義をそのままミラーする。
// 新しいフィールドを追加した場合は packages/shared/src/types/*.ts 側も確認すること。

@Serializable
data class User(
    val id: String,
    val email: String,
    val name: String? = null,
    val pictureUrl: String? = null,
)

@Serializable
data class MetricGroup(
    val id: String,
    val name: String,
    val sortOrder: Int,
)

@Serializable
data class ChoiceOption(
    val id: String,
    val label: String,
    val sortOrder: Int,
)

@Serializable
data class Metric(
    val id: String,
    val metricGroupId: String? = null,
    val name: String,
    val type: String, // "number" | "choice" | "text"
    val unit: String? = null,
    val sortOrder: Int,
    val isArchived: Boolean,
    val choiceOptions: List<ChoiceOption> = emptyList(),
)

@Serializable
data class Entry(
    val id: String,
    val metricId: String,
    val value: String,
    val recordedAt: String,
)

@Serializable
data class CreateEntryInput(
    val metricId: String,
    val value: String,
    val recordedAt: String,
)

@Serializable
data class MobileLoginRequest(
    val idToken: String,
)

@Serializable
data class CreateMetricGroupInput(
    val name: String,
)

@Serializable
data class UpdateMetricGroupInput(
    val name: String? = null,
)

@Serializable
data class ChoiceOptionInput(
    val label: String,
)

@Serializable
data class CreateMetricInput(
    val metricGroupId: String? = null,
    val name: String,
    val type: String,
    val unit: String? = null,
    val choiceOptions: List<ChoiceOptionInput>? = null,
)

@Serializable
data class UpdateMetricInput(
    val metricGroupId: String? = null,
    val name: String? = null,
    val unit: String? = null,
    val isArchived: Boolean? = null,
    val choiceOptions: List<ChoiceOptionInput>? = null,
)
