# BeShare TV — Application Android & Android TV (Étape 5)

## 1. Technologies & Architecture
- **Langage :** Kotlin 2.0+
- **Interface Utilisateur :** Jetpack Compose + Compose for TV (`androidx.tv:tv-material`, `androidx.tv:tv-foundation`)
- **Navigation Télécommande :** Support complet des touches directionnelles (D-pad), surbrillance et contours de focus natifs (`Modifier.focusable()`).
- **Moteur Vidéo :** AndroidX Media3 ExoPlayer (HLS `.m3u8`, VOD `.mp4`, buffer adaptatif, faible latence).
- **Architecture :** MVVM (Model-View-ViewModel), Coroutines, StateFlow.
- **Réseau :** Retrofit 2 + OkHttp avec intercepteur matériel (`x-device-id`).
- **Localisation :** Bilingue Français et Arabe (Support natif du mode RTL).

---

## 2. Structure du Code Source Android

```
/android
├── build.gradle.kts                      # Configuration Gradle racine
├── settings.gradle.kts                   # Définition des modules et dépôts
├── gradle/
│   └── libs.versions.toml                # Version Catalog (dépendances unifiées)
└── app/
    ├── build.gradle.kts                  # Dépendances Jetpack Compose & Media3 ExoPlayer
    └── src/main/
        ├── AndroidManifest.xml           # Déclaration Leanback (TV) & Mobile
        ├── res/
        │   ├── values/strings.xml        # Textes en Français
        │   ├── values-ar/strings.xml     # Textes en Arabe (RTL)
        │   └── values/styles.xml         # Thème sombre immersif
        └── java/com/beshare/tv/
            ├── MainActivity.kt           # Point d'entrée de l'application
            ├── data/
            │   ├── model/Models.kt       # Modèles de données (Channel, Category, VOD, EPG)
            │   ├── api/
            │   │   ├── BeShareApiService.kt # Contrat d'API Retrofit
            │   │   └── ApiClient.kt      # Client OkHttp avec injection x-device-id
            │   └── repository/
            │       └── CatalogRepository.kt # Couche d'accès aux données et gestion d'erreurs
            └── ui/
                ├── viewmodel/
                │   └── MainViewModel.kt  # ViewModel MVVM avec gestion du quota d'écrans
                ├── player/
                │   └── PlayerActivity.kt # Lecteur plein écran Media3 ExoPlayer (D-pad friendly)
                ├── screens/
                │   └── HomeScreen.kt     # Écran d'accueil adaptatif TV / Mobile
                └── theme/
                    └── Theme.kt          # Thème Jetpack Compose
```

---

## 3. Configuration & Génération de l'APK

### Option A : Depuis Android Studio (PC ou Mac)
1. Ouvrez Android Studio et sélectionnez **Open** > Dossier `/android`.
2. Laissez Gradle synchroniser les dépendances.
3. Vérifiez les URLs dans `app/build.gradle.kts` :
   - `SUPABASE_URL` : URL de votre projet Supabase (`https://xyz.supabase.co`)
   - `SUPABASE_ANON_KEY` : Clé publique Anon
   - `CLIENT_API_URL` : URL de l'Edge Function (`https://xyz.supabase.co/functions/v1/client-api`)
4. Cliquez sur **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. L'APK se trouvera dans : `app/build/outputs/apk/debug/app-debug.apk`.

### Option B : Depuis la ligne de commande ou Termux (Smartphone Android)
```bash
cd android
./gradlew assembleDebug
```

---

## 4. Installation sur Android TV & Box Connectées (Sideloading)

Pour installer l'application sur une TV connectée (Google TV, Xiaomi Mi Box, Nvidia Shield, Fire TV) :

1. **Via l'application "Send files to TV" :**
   - Installez "Send files to TV" depuis le Google Play Store sur votre téléphone et sur votre Android TV.
   - Envoyez le fichier `app-debug.apk` depuis votre téléphone vers la TV.
   - Sur la TV, ouvrez un gestionnaire de fichiers (ex: File Commander) et installez l'APK.

2. **Via ADB sans fil :**
   - Activez les *Options développeurs* et le *Débogage réseau* sur votre Android TV.
   - Connectez-vous depuis votre terminal :
     ```bash
     adb connect IP_DE_VOTRE_TV:5555
     adb install -r app/build/outputs/apk/debug/app-debug.apk
     ```
