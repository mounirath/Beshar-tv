package com.beshare.tv.data.model

import com.google.gson.annotations.SerializedName

/**
 * Modèle de données d'une catégorie (Live TV, VOD, Séries) avec support bilingue FR/AR.
 */
data class Category(
    @SerializedName("id") val id: String,
    @SerializedName("category_type") val categoryType: String,
    @SerializedName("name") val name: String,
    @SerializedName("name_ar") val nameAr: String?,
    @SerializedName("icon_url") val iconUrl: String?,
    @SerializedName("sort_order") val sortOrder: Int = 0
)

/**
 * Modèle de données d'une chaîne de télévision en direct.
 */
data class Channel(
    @SerializedName("id") val id: String,
    @SerializedName("category_id") val categoryId: String?,
    @SerializedName("channel_num") val channelNum: Int?,
    @SerializedName("name") val name: String,
    @SerializedName("logo_url") val logoUrl: String?,
    @SerializedName("epg_channel_id") val epgChannelId: String?,
    @SerializedName("stream_type") val streamType: String = "live",
    @SerializedName("sort_order") val sortOrder: Int = 0,
    var isFavorite: Boolean = false
)

/**
 * Modèle d'un film VOD.
 */
data class Movie(
    @SerializedName("id") val id: String,
    @SerializedName("category_id") val categoryId: String?,
    @SerializedName("title") val title: String,
    @SerializedName("title_ar") val titleAr: String?,
    @SerializedName("poster_url") val posterUrl: String?,
    @SerializedName("backdrop_url") val backdropUrl: String?,
    @SerializedName("rating") val rating: Float?,
    @SerializedName("release_year") val releaseYear: Int?,
    @SerializedName("duration_mins") val durationMins: Int?,
    @SerializedName("synopsis") val synopsis: String?
)

/**
 * Modèle d'une série TV.
 */
data class Series(
    @SerializedName("id") val id: String,
    @SerializedName("category_id") val categoryId: String?,
    @SerializedName("title") val title: String,
    @SerializedName("title_ar") val titleAr: String?,
    @SerializedName("poster_url") val posterUrl: String?,
    @SerializedName("backdrop_url") val backdropUrl: String?,
    @SerializedName("rating") val rating: Float?,
    @SerializedName("release_year") val releaseYear: Int?,
    @SerializedName("plot") val plot: String?,
    @SerializedName("seasons_count") val seasonsCount: Int = 1
)

/**
 * Modèle d'un épisode de série.
 */
data class Episode(
    @SerializedName("id") val id: String,
    @SerializedName("series_id") val seriesId: String,
    @SerializedName("season_number") val seasonNumber: Int,
    @SerializedName("episode_number") val episodeNumber: Int,
    @SerializedName("title") val title: String,
    @SerializedName("duration_mins") val durationMins: Int?,
    @SerializedName("still_url") val stillUrl: String?,
    @SerializedName("plot") val plot: String?
)

/**
 * Modèle d'un programme EPG (Guide TV).
 */
data class EpgProgram(
    @SerializedName("id") val id: String,
    @SerializedName("channel_id") val channelId: String?,
    @SerializedName("epg_channel_id") val epgChannelId: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String?,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("category") val category: String?
)

/**
 * Réponses de l'API Gateway (/client-api).
 */
data class HandshakeResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("user") val user: UserInfo?,
    @SerializedName("device") val device: DeviceInfo?
)

data class UserInfo(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("role") val role: String,
    @SerializedName("expires_at") val expiresAt: String?,
    @SerializedName("max_devices") val maxDevices: Int
)

data class DeviceInfo(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("device_type") val deviceType: String,
    @SerializedName("status") val status: String
)

data class BootstrapResponse(
    @SerializedName("app_name") val appName: String,
    @SerializedName("version") val version: String,
    @SerializedName("server_time") val serverTime: String
)

data class CategoriesResponse(
    @SerializedName("categories") val categories: List<Category>
)

data class ChannelsResponse(
    @SerializedName("channels") val channels: List<Channel>,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("total") val total: Int,
    @SerializedName("has_more") val hasMore: Boolean
)

data class MoviesResponse(
    @SerializedName("movies") val movies: List<Movie>,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("total") val total: Int
)

data class SeriesResponse(
    @SerializedName("series") val series: List<Series>,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("total") val total: Int
)

data class EpisodesResponse(
    @SerializedName("episodes") val episodes: List<Episode>
)

data class EpgResponse(
    @SerializedName("programs") val programs: List<EpgProgram>
)

data class StreamResolveResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("media_id") val mediaId: String,
    @SerializedName("media_type") val mediaType: String,
    @SerializedName("title") val title: String,
    @SerializedName("stream_url") val streamUrl: String,
    @SerializedName("expires_in_secs") val expiresInSecs: Long
)
