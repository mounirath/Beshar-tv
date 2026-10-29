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

    /**
     * Génère ou récupère l'identifiant matériel unique du terminal (UUID sécurisé).
     */
    fun getOrCreateDeviceId(context: Context): String {
        cachedDeviceId?.let { return it }

        val prefs = context.getSharedPreferences("beshare_device_prefs", Context.MODE_PRIVATE)
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

    fun setAuthToken(token: String?) {
        this.authToken = token
    }

    fun getService(context: Context): BeShareApiService {
        if (apiService == null) {
            val deviceId = getOrCreateDeviceId(context)

            val headerInterceptor = Interceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()
                    .header("apikey", BuildConfig.SUPABASE_ANON_KEY)
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

            val baseUrl = BuildConfig.CLIENT_API_URL.let {
                if (it.endsWith("/")) it else "$it/"
            }

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
