package com.beshare.tv.data.api

import com.beshare.tv.data.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Interface Retrofit pour la communication avec l'API Gateway BeShare TV.
 */
interface BeShareApiService {

    @POST("client-api?action=handshake")
    suspend fun deviceHandshake(
        @Header("x-device-id") deviceId: String,
        @Header("x-device-type") deviceType: String = "android_tv",
        @Header("x-app-version") appVersion: String = "1.0.0"
    ): Response<HandshakeResponse>

    @GET("client-api?action=bootstrap")
    suspend fun getBootstrap(): Response<BootstrapResponse>

    @GET("client-api?action=categories")
    suspend fun getCategories(
        @Query("type") type: String // "live", "movie", "series"
    ): Response<CategoriesResponse>

    @GET("client-api?action=channels")
    suspend fun getChannels(
        @Query("category_id") categoryId: String?,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<ChannelsResponse>

    @GET("client-api?action=movies")
    suspend fun getMovies(
        @Query("category_id") categoryId: String?,
        @Query("search") search: String?,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 30
    ): Response<MoviesResponse>

    @GET("client-api?action=series")
    suspend fun getSeries(
        @Query("category_id") categoryId: String?,
        @Query("search") search: String?,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 30
    ): Response<SeriesResponse>

    @GET("client-api?action=episodes")
    suspend fun getEpisodes(
        @Query("series_id") seriesId: String
    ): Response<EpisodesResponse>

    @GET("client-api?action=epg")
    suspend fun getEpg(
        @Query("channel_id") channelId: String
    ): Response<EpgResponse>

    @GET("client-api?action=resolve_stream")
    suspend fun resolveStream(
        @Query("type") type: String, // "channel", "movie", "episode"
        @Query("id") id: String
    ): Response<StreamResolveResponse>
}
