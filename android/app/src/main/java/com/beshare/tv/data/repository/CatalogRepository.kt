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
                    allowed = true,
                    deviceId = ApiClient.getDeviceId(context),
                    activeSessions = 1,
                    maxConcurrentDevices = 2,
                    sessionToken = "demo-session-token",
                    message = "Mode Démonstration Actif"
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
            return@withContext Result.success(ChannelsResponse(channels = demoList, total = demoList.size, page = 1))
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
                Result.success(ChannelsResponse(channels = demoList, total = demoList.size, page = 1))
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
                    streamUrl = demoUrl,
                    expiresAtUtc = "2099-12-31T23:59:59Z",
                    drmType = null,
                    licenseUrl = null
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
                    streamUrl = fallbackUrl,
                    expiresAtUtc = "2099-12-31T23:59:59Z",
                    drmType = null,
                    licenseUrl = null
                )
            )
        }
    }

    // --- Échantillons du Mode Démo & Test ExoPlayer ---

    private fun getDemoCategories(type: String): List<Category> {
        return when (type) {
            "live" -> listOf(
                Category("cat_live_general", "Généralistes & Infos", "live"),
                Category("cat_live_sports", "Sports & Directs", "live"),
                Category("cat_live_cinema", "Cinéma & Séries", "live"),
                Category("cat_live_docs", "Découverte & Science", "live")
            )
            "movies" -> listOf(
                Category("cat_mov_action", "Action & SF", "movies"),
                Category("cat_mov_animation", "Animation & Famille", "movies"),
                Category("cat_mov_docs", "Documentaires", "movies")
            )
            "series" -> listOf(
                Category("cat_ser_dram", "Drame & Thriller", "series"),
                Category("cat_ser_sf", "Science-Fiction", "series")
            )
            else -> listOf(Category("cat_all", "Tous les flux", type))
        }
    }

    private fun getDemoChannels(): List<Channel> {
        return listOf(
            Channel(
                id = "demo_f24",
                channelNumber = 1,
                name = "France 24 HD (Direct)",
                categoryId = "cat_live_general",
                streamUrl = "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8",
                logoUrl = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&h=200&fit=crop",
                currentProgram = EpgProgram("epg_1", "demo_f24", "Le Journal International", "Actualités mondiales en direct", "14:00", "15:00", 65)
            ),
            Channel(
                id = "demo_bbb_live",
                channelNumber = 2,
                name = "BeShare Cinema 4K",
                categoryId = "cat_live_cinema",
                streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                logoUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop",
                currentProgram = EpgProgram("epg_2", "demo_bbb_live", "Big Buck Bunny - Grand Format", "Animation 4K HDR en diffusion continue", "14:30", "15:30", 40)
            ),
            Channel(
                id = "demo_tos_live",
                channelNumber = 3,
                name = "Sci-Fi Universe Live",
                categoryId = "cat_live_cinema",
                streamUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
                logoUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&h=200&fit=crop",
                currentProgram = EpgProgram("epg_3", "demo_tos_live", "Tears of Steel (Sci-Fi HLS)", "Production futuriste et effets visuels avancés", "15:00", "16:00", 25)
            ),
            Channel(
                id = "demo_sintel_live",
                channelNumber = 4,
                name = "Animation 24/7",
                categoryId = "cat_live_general",
                streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                logoUrl = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&h=200&fit=crop",
                currentProgram = EpgProgram("epg_4", "demo_sintel_live", "Sintel : La Quête Épique", "Long métrage d'animation et d'aventure", "15:15", "16:30", 15)
            ),
            Channel(
                id = "demo_cosmos",
                channelNumber = 5,
                name = "Planète & Découverte",
                categoryId = "cat_live_docs",
                streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                logoUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=200&fit=crop",
                currentProgram = EpgProgram("epg_5", "demo_cosmos", "Exploration Spatiale", "Les mystères des étoiles et galaxies", "14:45", "15:45", 55)
            )
        )
    }

    private fun getDemoMovies(): List<Movie> {
        return listOf(
            Movie(
                id = "demo_mov_tos",
                title = "Tears of Steel",
                year = 2024,
                durationMinutes = 82,
                rating = "4K HDR",
                categoryId = "cat_mov_action",
                posterUrl = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop",
                streamUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
                plot = "Dans un futur dystopique à Amsterdam, un groupe de survivants tente de sauver l'humanité face à une armée de robots sentients."
            ),
            Movie(
                id = "demo_mov_bbb",
                title = "Big Buck Bunny",
                year = 2023,
                durationMinutes = 68,
                rating = "Tout Public",
                categoryId = "cat_mov_animation",
                posterUrl = "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&h=600&fit=crop",
                streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                plot = "Un lièvre bienveillant décide de se venger de trois petits rongeurs turbulents qui terrorisent les animaux de la forêt."
            ),
            Movie(
                id = "demo_mov_sintel",
                title = "Sintel - La Gardienne",
                year = 2024,
                durationMinutes = 95,
                rating = "Aventure",
                categoryId = "cat_mov_action",
                posterUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
                streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                plot = "Une jeune combattante solitaire traverse des terres hostiles à la recherche de son dragonneau capturé par des bêtes colossales."
            ),
            Movie(
                id = "demo_mov_cosmos",
                title = "Chroniques de l'Espace",
                year = 2025,
                durationMinutes = 110,
                rating = "Documentaire",
                categoryId = "cat_mov_docs",
                posterUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop",
                streamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                plot = "Une plongée spectaculaire au cœur des télescopes orbitaux et des découvertes astrophysiques les plus récentes."
            )
        )
    }

    private fun getDemoSeries(): List<Series> {
        return listOf(
            Series(
                id = "demo_ser_odyssey",
                title = "Solaris Odyssey",
                seasonsCount = 2,
                categoryId = "cat_ser_sf",
                posterUrl = "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400&h=600&fit=crop",
                plot = "L'équipage d'une station spatiale autonome fait face à des anomalies temporelles et des présences inconnues."
            ),
            Series(
                id = "demo_ser_cyber",
                title = "Neon Protocol",
                seasonsCount = 1,
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
                durationMinutes = 48,
                streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                plot = "L'équipage reçoit une transmission cryptée provenant d'un secteur non cartographié."
            ),
            Episode(
                id = "${seriesId}_ep2",
                seriesId = seriesId,
                seasonNumber = 1,
                episodeNumber = 2,
                title = "Épisode 2 : L'Horizon Caché",
                durationMinutes = 52,
                streamUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
                plot = "Une avarie moteur contraint le vaisseau à stationner près d'une nébuleuse instable."
            )
        )
    }

    private fun getDemoEpg(channelId: String): List<EpgProgram> {
        return listOf(
            EpgProgram("epg_demo_1", channelId, "Édition Spéciale Direct", "Couverture complète de l'actualité", "14:00", "15:00", 75),
            EpgProgram("epg_demo_2", channelId, "Le Grand Reportage", "Enquête exclusive sur le terrain", "15:00", "16:00", 0),
            EpgProgram("epg_demo_3", channelId, "Soirée Cinéma Première", "Diffusion événement en qualité Master 4K", "16:00", "18:00", 0)
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
