package com.beshare.tv.data.repository

import android.content.Context
import com.beshare.tv.data.api.ApiClient
import com.beshare.tv.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Repository gérant l'accès au catalogue autorisé, la gestion des erreurs réseau
 * et le mode démonstration hors-ligne/échantillon.
 */
class CatalogRepository(private val context: Context) {

    private fun getApi() = ApiClient.getService(context)

    suspend fun performHandshake(): Result<HandshakeResponse> = withContext(Dispatchers.IO) {
        if (ApiClient.isDemoMode(context)) {
            return@withContext Result.success(
                HandshakeResponse(
                    success = true,
                    message = "Mode Démonstration Actif",
                    error = null,
                    user = UserInfo(
                        id = "demo-user",
                        email = "demo@beshare.tv",
                        role = "subscriber",
                        expiresAt = "2099-12-31T23:59:59Z",
                        maxDevices = 2
                    ),
                    device = DeviceInfo(
                        deviceId = ApiClient.getDeviceId(context),
                        deviceType = "android_tv",
                        status = "active"
                    )
                )
            )
        }

        try {
            val deviceId = ApiClient.getOrCreateDeviceId(context)
            val response = getApi().deviceHandshake(deviceId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Erreur serveur HTTP ${response.code()}"
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            val msg = e.message ?: "Erreur réseau inconnue"
            if (ApiClient.isPlaceholderUrl(context) || msg.contains("your_project_id", ignoreCase = true)) {
                Result.failure(Exception("Serveur non configuré : L'adresse est encore sur 'your_project_id.supabase.co'. Activez le Mode Démo ou configurez votre URL Supabase."))
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun getCategories(type: String): Result<List<Category>> = withContext(Dispatchers.IO) {
        if (ApiClient.isDemoMode(context)) {
            return@withContext Result.success(getDemoCategories(type))
        }

        try {
            val response = getApi().getCategories(type)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.categories)
            } else {
                Result.failure(Exception("HTTP ${response.code()} : ${response.message()}"))
            }
        } catch (e: Exception) {
            if (ApiClient.isPlaceholderUrl(context) || (e.message?.contains("your_project_id") == true)) {
                // Si l'URL n'est pas configurée, on peut charger le catalogue démo
                Result.success(getDemoCategories(type))
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun getChannels(categoryId: String?, page: Int = 1): Result<ChannelsResponse> = withContext(Dispatchers.IO) {
        if (ApiClient.isDemoMode(context)) {
            val demoList = getDemoChannels().filter { categoryId == null || it.categoryId == categoryId }
            return@withContext Result.success(
                ChannelsResponse(
                    channels = demoList,
                    page = 1,
                    limit = demoList.size,
                    total = demoList.size,
                    hasMore = false
                )
            )
        }

        try {
            val response = getApi().getChannels(categoryId, page)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("HTTP ${response.code()} : ${response.message()}"))
            }
        } catch (e: Exception) {
            if (ApiClient.isPlaceholderUrl(context) || (e.message?.contains("your_project_id") == true)) {
                val demoList = getDemoChannels().filter { categoryId == null || it.categoryId == categoryId }
                Result.success(
                    ChannelsResponse(
                        channels = demoList,
                        page = 1,
                        limit = demoList.size,
                        total = demoList.size,
                        hasMore = false
                    )
                )
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun getMovies(categoryId: String?, search: String?, page: Int = 1): Result<List<Movie>> = withContext(Dispatchers.IO) {
        if (ApiClient.isDemoMode(context) || ApiClient.isPlaceholderUrl(context)) {
            var list = getDemoMovies()
            if (!categoryId.isNullOrEmpty()) {
                list = list.filter { it.categoryId == categoryId }
            }
            if (!search.isNullOrBlank()) {
                list = list.filter { it.title.contains(search, ignoreCase = true) }
            }
            return@withContext Result.success(list)
        }

        try {
            val response = getApi().getMovies(categoryId, search, page)
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
        if (ApiClient.isDemoMode(context) || ApiClient.isPlaceholderUrl(context)) {
            var list = getDemoSeries()
            if (!categoryId.isNullOrEmpty()) {
                list = list.filter { it.categoryId == categoryId }
            }
            if (!search.isNullOrBlank()) {
                list = list.filter { it.title.contains(search, ignoreCase = true) }
            }
            return@withContext Result.success(list)
        }

        try {
            val response = getApi().getSeries(categoryId, search, page)
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
        if (ApiClient.isDemoMode(context) || ApiClient.isPlaceholderUrl(context)) {
            return@withContext Result.success(getDemoEpisodes(seriesId))
        }

        try {
            val response = getApi().getEpisodes(seriesId)
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
        if (ApiClient.isDemoMode(context) || ApiClient.isPlaceholderUrl(context)) {
            return@withContext Result.success(getDemoEpg(channelId))
        }

        try {
            val response = getApi().getEpg(channelId)
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
        if (ApiClient.isDemoMode(context) || ApiClient.isPlaceholderUrl(context) || id.startsWith("demo_")) {
            val demoUrl = resolveDemoStream(type, id)
            return@withContext Result.success(
                StreamResolveResponse(
                    success = true,
                    mediaId = id,
                    mediaType = type,
                    title = "Flux Démo",
                    streamUrl = demoUrl,
                    expiresInSecs = 86400L
                )
            )
        }

        try {
            val response = getApi().resolveStream(type, id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Flux indisponible ou terminal non autorisé (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            val fallbackUrl = resolveDemoStream(type, id)
            Result.success(
                StreamResolveResponse(
                    success = true,
                    mediaId = id,
                    mediaType = type,
                    title = "Flux Démo (Secours)",
                    streamUrl = fallbackUrl,
                    expiresInSecs = 86400L
                )
            )
        }
    }

    // --- Échantillons du Mode Démo & Test ExoPlayer ---

    private fun getDemoCategories(type: String): List<Category> {
        return when (type) {
            "live" -> listOf(
                Category(id = "cat_live_general", categoryType = "live", name = "Généralistes & Infos", nameAr = "قنوات عامة وإخبارية", iconUrl = null, sortOrder = 1),
                Category(id = "cat_live_sports", categoryType = "live", name = "Sports & Directs", nameAr = "رياضة وبث مباشر", iconUrl = null, sortOrder = 2),
                Category(id = "cat_live_cinema", categoryType = "live", name = "Cinéma & Séries", nameAr = "أفلام ومسلسلات", iconUrl = null, sortOrder = 3),
                Category(id = "cat_live_docs", categoryType = "live", name = "Découverte & Science", nameAr = "وثائقيات وعلوم", iconUrl = null, sortOrder = 4)
            )
            "movies" -> listOf(
                Category(id = "cat_mov_action", categoryType = "movies", name = "Action & SF", nameAr = "حركة وخيال علمي", iconUrl = null, sortOrder = 1),
                Category(id = "cat_mov_animation", categoryType = "movies", name = "Animation & Famille", nameAr = "رسوم متحركة وعائلة", iconUrl = null, sortOrder = 2),
                Category(id = "cat_mov_docs", categoryType = "movies", name = "Documentaires", nameAr = "أفلام وثائقية", iconUrl = null, sortOrder = 3)
            )
            "series" -> listOf(
                Category(id = "cat_ser_dram", categoryType = "series", name = "Drame & Thriller", nameAr = "دراما وإثارة", iconUrl = null, sortOrder = 1),
                Category(id = "cat_ser_sf", categoryType = "series", name = "Science-Fiction", nameAr = "خيال علمي", iconUrl = null, sortOrder = 2)
            )
            else -> listOf(Category(id = "cat_all", categoryType = type, name = "Tous les flux", nameAr = "جميع القنوات", iconUrl = null, sortOrder = 1))
        }
    }

    private fun getDemoChannels(): List<Channel> {
        return listOf(
            Channel(
                id = "demo_f24",
                channelNum = 1,
                name = "France 24 HD (Direct)",
                categoryId = "cat_live_general",
                streamUrl = "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8",
                logoUrl = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&h=200&fit=crop",
                epgChannelId = "epg_demo_1"
            ),
            Channel(
                id = "demo_bbb_live",
                channelNum = 2,
                name = "BeShare Cinema 4K",
                categoryId = "cat_live_cinema",
                streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                logoUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop",
                epgChannelId = "epg_demo_2"
            ),
            Channel(
                id = "demo_tos_live",
                channelNum = 3,
                name = "Sci-Fi Universe Live",
                categoryId = "cat_live_cinema",
                streamUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
                logoUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&h=200&fit=crop",
                epgChannelId = "epg_demo_3"
            ),
            Channel(
                id = "demo_sintel_live",
                channelNum = 4,
                name = "Animation 24/7",
                categoryId = "cat_live_general",
                streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                logoUrl = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&h=200&fit=crop",
                epgChannelId = "epg_demo_4"
            ),
            Channel(
                id = "demo_cosmos",
                channelNum = 5,
                name = "Planète & Découverte",
                categoryId = "cat_live_docs",
                streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                logoUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=200&fit=crop",
                epgChannelId = "epg_demo_5"
            )
        )
    }

    private fun getDemoMovies(): List<Movie> {
        return listOf(
            Movie(
                id = "demo_mov_tos",
                title = "Tears of Steel",
                releaseYear = 2024,
                durationMins = 82,
                rating = 4.8f,
                categoryId = "cat_mov_action",
                posterUrl = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop",
                streamUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
                synopsis = "Dans un futur dystopique à Amsterdam, un groupe de survivants tente de sauver l'humanité face à une armée de robots sentients."
            ),
            Movie(
                id = "demo_mov_bbb",
                title = "Big Buck Bunny",
                releaseYear = 2023,
                durationMins = 68,
                rating = 4.5f,
                categoryId = "cat_mov_animation",
                posterUrl = "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&h=600&fit=crop",
                streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                synopsis = "Un lièvre bienveillant décide de se venger de trois petits rongeurs turbulents qui terrorisent les animaux de la forêt."
            ),
            Movie(
                id = "demo_mov_sintel",
                title = "Sintel - La Gardienne",
                releaseYear = 2024,
                durationMins = 95,
                rating = 4.6f,
                categoryId = "cat_mov_action",
                posterUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
                streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                synopsis = "Une jeune combattante solitaire traverse des terres hostiles à la recherche de son dragonneau capturé par des bêtes colossales."
            ),
            Movie(
                id = "demo_mov_cosmos",
                title = "Chroniques de l'Espace",
                releaseYear = 2025,
                durationMins = 110,
                rating = 4.9f,
                categoryId = "cat_mov_docs",
                posterUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop",
                streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                synopsis = "Une plongée spectaculaire au cœur des télescopes orbitaux et des découvertes astrophysiques les plus récentes."
            )
        )
    }

    private fun getDemoSeries(): List<Series> {
        return listOf(
            Series(
                id = "demo_ser_odyssey",
                title = "Solaris Odyssey",
                seasonsCount = 2,
                rating = 4.7f,
                releaseYear = 2024,
                categoryId = "cat_ser_sf",
                posterUrl = "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400&h=600&fit=crop",
                plot = "L'équipage d'une station spatiale autonome fait face à des anomalies temporelles et des présences inconnues."
            ),
            Series(
                id = "demo_ser_cyber",
                title = "Neon Protocol",
                seasonsCount = 1,
                rating = 4.6f,
                releaseYear = 2025,
                categoryId = "cat_ser_dram",
                posterUrl = "https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=400&h=600&fit=crop",
                plot = "Dans une mégapole hyper-connectée, un détective privé traque une cyber-menace capable de manipuler les flux vidéo en direct."
            )
        )
    }

    private fun getDemoEpisodes(seriesId: String): List<Episode> {
        return listOf(
            Episode(
                id = "${seriesId}_ep1",
                seriesId = seriesId,
                seasonNumber = 1,
                episodeNumber = 1,
                title = "Épisode 1 : L'Origine du Signal",
                durationMins = 48,
                streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                plot = "L'équipage reçoit une transmission cryptée provenant d'un secteur non cartographié."
            ),
            Episode(
                id = "${seriesId}_ep2",
                seriesId = seriesId,
                seasonNumber = 1,
                episodeNumber = 2,
                title = "Épisode 2 : L'Horizon Caché",
                durationMins = 52,
                streamUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
                plot = "Une avarie moteur contraint le vaisseau à stationner près d'une nébuleuse instable."
            )
        )
    }

    private fun getDemoEpg(channelId: String): List<EpgProgram> {
        return listOf(
            EpgProgram(
                id = "epg_demo_1",
                channelId = channelId,
                epgChannelId = channelId,
                title = "Édition Spéciale Direct",
                description = "Couverture complète de l'actualité",
                startTime = "14:00",
                endTime = "15:00",
                category = "Information"
            ),
            EpgProgram(
                id = "epg_demo_2",
                channelId = channelId,
                epgChannelId = channelId,
                title = "Le Grand Reportage",
                description = "Enquête exclusive sur le terrain",
                startTime = "15:00",
                endTime = "16:00",
                category = "Magazine"
            ),
            EpgProgram(
                id = "epg_demo_3",
                channelId = channelId,
                epgChannelId = channelId,
                title = "Soirée Cinéma Première",
                description = "Diffusion événement en qualité Master 4K",
                startTime = "16:00",
                endTime = "18:00",
                category = "Cinéma"
            )
        )
    }

    private fun resolveDemoStream(type: String, id: String): String {
        return when {
            id.contains("f24") -> "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8"
            id.contains("tos") -> "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8"
            id.contains("sintel") -> "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
            id.contains("cosmos") -> "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
            else -> "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        }
    }
}
