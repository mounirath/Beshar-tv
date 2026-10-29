package com.beshare.tv.data.api

import android.content.Context
import android.provider.Settings
import com.beshare.tv.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * Singleton client Retrofit pour l'application Android.
 */
object ApiClient {

    private var apiService: BeShareApiService? = null
    private var authToken: String? = null
    private var cachedDeviceId: String? = null

    private const val PREFS_NAME = "beshare_device_prefs"
    private const val KEY_CUSTOM_URL = "custom_client_api_url"
    private const val KEY_CUSTOM_ANON_KEY = "custom_anon_key"
    private const val KEY_DEMO_MODE = "demo_mode_enabled"

    /**
     * Génère ou récupère l'identifiant matériel unique du terminal (UUID sécurisé).
     */
    fun getOrCreateDeviceId(context: Context): String {
        cachedDeviceId?.let { return it }

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var deviceId = prefs.getString("device_unique_id", null)

        if (deviceId.isNullOrEmpty()) {
            val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            deviceId = if (!androidId.isNullOrEmpty() && androidId != "9774d56d682e549c") {
                UUID.nameUUIDFromBytes(androidId.toByteArray()).toString()
            } else {
                UUID.randomUUID().toString()
            }
            prefs.edit().putString("device_unique_id", deviceId).apply()
        }

        cachedDeviceId = deviceId
        return deviceId
    }

    /**
     * Alias pratique pour getOrCreateDeviceId
     */
    fun getDeviceId(context: Context): String = getOrCreateDeviceId(context)

    fun setAuthToken(token: String?) {
        this.authToken = token
    }

    /**
     * Vérifie si le mode démonstration hors-ligne/échantillon est actif.
     */
    fun isDemoMode(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_DEMO_MODE, false)
    }

    fun setDemoMode(context: Context, enabled: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_DEMO_MODE, enabled).apply()
    }

    /**
     * Récupère l'URL de base configurée ou celle par défaut.
     */
    fun getBaseUrl(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val custom = prefs.getString(KEY_CUSTOM_URL, null)?.trim()
        val raw = if (!custom.isNullOrEmpty()) custom else BuildConfig.CLIENT_API_URL
        return if (raw.endsWith("/")) raw else "$raw/"
    }

    /**
     * Récupère la clé Supabase Anon active.
     */
    fun getAnonKey(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val custom = prefs.getString(KEY_CUSTOM_ANON_KEY, null)?.trim()
        return if (!custom.isNullOrEmpty()) custom else BuildConfig.SUPABASE_ANON_KEY
    }

    /**
     * Vérifie si l'URL pointe encore sur le placeholder factice par défaut.
     */
    fun isPlaceholderUrl(context: Context): Boolean {
        val currentUrl = getBaseUrl(context).lowercase()
        return currentUrl.contains("your_project_id") || currentUrl.contains("your-project-id")
    }

    /**
     * Met à jour l'URL et la clé Supabase dynamiquement depuis l'application.
     */
    fun updateServerConfig(context: Context, newUrl: String?, newAnonKey: String?) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().apply {
            if (newUrl.isNullOrBlank()) {
                remove(KEY_CUSTOM_URL)
            } else {
                var cleanedUrl = newUrl.trim()
                if (!cleanedUrl.startsWith("http://") && !cleanedUrl.startsWith("https://")) {
                    cleanedUrl = "https://$cleanedUrl"
                }
                if (!cleanedUrl.contains("/functions/v1/client-api") && cleanedUrl.contains(".supabase.co")) {
                    cleanedUrl = "${cleanedUrl.removeSuffix("/")}/functions/v1/client-api/"
                }
                putString(KEY_CUSTOM_URL, cleanedUrl)
            }

            if (newAnonKey.isNullOrBlank()) {
                remove(KEY_CUSTOM_ANON_KEY)
            } else {
                putString(KEY_CUSTOM_ANON_KEY, newAnonKey.trim())
            }
            apply()
        }
        // Réinitialise le service Retrofit
        apiService = null
    }

    fun getService(context: Context): BeShareApiService {
        if (apiService == null) {
            val deviceId = getOrCreateDeviceId(context)
            val anonKey = getAnonKey(context)

            val headerInterceptor = Interceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()
                    .header("apikey", anonKey)
                    .header("x-device-id", deviceId)
                    .header("x-device-type", if (isTvDevice(context)) "android_tv" else "android_mobile")
                    .header("x-app-version", BuildConfig.VERSION_NAME)

                authToken?.let {
                    requestBuilder.header("Authorization", "Bearer $it")
                }

                chain.proceed(requestBuilder.build())
            }

            val logging = HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.NONE
            }

            val okHttpClient = OkHttpClient.Builder()
                .addInterceptor(headerInterceptor)
                .addInterceptor(logging)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(25, TimeUnit.SECONDS)
                .build()

            val baseUrl = getBaseUrl(context)

            val retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            apiService = retrofit.create(BeShareApiService::class.java)
        }
        return apiService!!
    }

    private fun isTvDevice(context: Context): Boolean {
        val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as? android.app.UiModeManager
        return uiModeManager?.currentModeType == android.content.res.Configuration.UI_MODE_TYPE_TELEVISION
    }
}
