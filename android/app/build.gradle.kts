plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.beshare.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.beshare.tv"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // Configuration Supabase pour l'application Android (Clé Publique Anon + URL Backend)
        // Les clés de service ou mots de passe admin ne sont JAMAIS injectés ici.
        val resolvedSupabaseUrl = (project.findProperty("SUPABASE_URL") as? String)
            ?: System.getenv("SUPABASE_URL")?.takeIf { it.isNotBlank() }
            ?: "https://YOUR_PROJECT_ID.supabase.co"
        val resolvedSupabaseAnonKey = (project.findProperty("SUPABASE_ANON_KEY") as? String)
            ?: System.getenv("SUPABASE_ANON_KEY")?.takeIf { it.isNotBlank() }
            ?: "YOUR_SUPABASE_ANON_KEY"
        val resolvedClientApiUrl = (project.findProperty("CLIENT_API_URL") as? String)
            ?: System.getenv("CLIENT_API_URL")?.takeIf { it.isNotBlank() }
            ?: "${resolvedSupabaseUrl.trimEnd('/')}/functions/v1/client-api"

        buildConfigField("String", "SUPABASE_URL", "\"$resolvedSupabaseUrl\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"$resolvedSupabaseAnonKey\"")
        buildConfigField("String", "CLIENT_API_URL", "\"$resolvedClientApiUrl\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-opt-in=androidx.tv.material3.ExperimentalTvMaterial3Api",
            "-opt-in=androidx.media3.common.util.UnstableApi"
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)

    // Android TV & Leanback focus navigation
    implementation(libs.androidx.tv.foundation)
    implementation(libs.androidx.tv.material)

    // AndroidX Media3 ExoPlayer (HLS, Low-latency & VOD)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.exoplayer.hls)
    implementation(libs.androidx.media3.ui)
    implementation(libs.androidx.media3.session)

    // Retrofit & Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp.logging)

    // Image loading for channel logos & movie posters
    implementation(libs.coil.compose)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)
}
