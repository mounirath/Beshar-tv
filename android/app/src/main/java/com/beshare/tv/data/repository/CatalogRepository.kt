package com.beshare.tv.data.repository

import android.content.Context
import com.beshare.tv.data.api.ApiClient
import com.beshare.tv.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Repository gérant l'accès au catalogue autorisé et la gestion des erreurs réseau.
 */
class CatalogRepository(private val context: Context) {

    private val api = ApiClient.getService(context)

    suspend fun performHandshake(): Result<HandshakeResponse> = withContext(Dispatchers.IO) {
        try {
            val deviceId = ApiClient.getOrCreateDeviceId(context)
            val response = api.deviceHandshake(deviceId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Erreur serveur HTTP ${response.code()}"
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCategories(type: String): Result<List<Category>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getCategories(type)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.categories)
            } else {
                Result.failure(Exception("HTTP ${response.code()} : ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getChannels(categoryId: String?, page: Int = 1): Result<ChannelsResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.getChannels(categoryId, page)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("HTTP ${response.code()} : ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMovies(categoryId: String?, search: String?, page: Int = 1): Result<List<Movie>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getMovies(categoryId, search, page)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.movies)
            } else {
                Result.failure(Exception("HTTP ${response.code()} : ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSeries(categoryId: String?, search: String?, page: Int = 1): Result<List<Series>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getSeries(categoryId, search, page)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.series)
            } else {
                Result.failure(Exception("HTTP ${response.code()} : ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getEpisodes(seriesId: String): Result<List<Episode>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getEpisodes(seriesId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.episodes)
            } else {
                Result.failure(Exception("HTTP ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getEpg(channelId: String): Result<List<EpgProgram>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getEpg(channelId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.programs)
            } else {
                Result.failure(Exception("HTTP ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resolveStreamUrl(type: String, id: String): Result<StreamResolveResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.resolveStream(type, id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Flux indisponible ou terminal non autorisé (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
