# BeShare TV — Spécification Complète de l'API Client Android & Android TV

## 1. Vue d'ensemble de l'Architecture API
L'API Client de **BeShare TV** est servie par l'Edge Function `/supabase/functions/client-api/` et connectée à **Supabase**. Elle a été spécialement conçue pour les terminaux mobiles Android et les téléviseurs connectés **Android TV** (D-pad remote control, ExoPlayer / Media3).

### Sécurité & Étanchéité
- **Aucune clé secrète Supabase (Service Role)** ni identifiant d'administration n'est intégré dans l'application Android.
- L'application communique exclusivement avec la clé publique **`VITE_SUPABASE_ANON_KEY`** et le **Jeton JWT** de l'utilisateur abonné (`Authorization: Bearer <JWT>`).
- Contrôle strict du nombre d'appareils simultanés via `x-device-id` et `max_devices`.

---

## 2. En-têtes HTTP Requis (Obligatoires sur toutes les requêtes)

| En-tête | Type | Exemple | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | `Bearer eyJhbGci...` | Jeton d'accès JWT de session Supabase Auth. |
| `apikey` | String | `eyJhbGciOiJIUz...` | Clé Anon publique Supabase. |
| `x-device-id` | String | `d41d8cd98f00b204e9800998ecf8427e` | UUID matériel unique généré à l'installation de l'application. |
| `x-device-type` | String | `android_tv` ou `android_mobile` | Type de terminal physique. |
| `x-app-version` | String | `1.0.0` | Version du build APK Android. |

---

## 3. Matrice des Points d'Entrée (Endpoints)

Base URL : `https://VOTRE_PROJET.supabase.co/functions/v1/client-api`

### 3.1. Handshake de l'Appareil & Vérification du Quota d'Écrans
- **Endpoint :** `POST /client-api?action=handshake`
- **Rôle :** Enregistre le terminal, vérifie que le quota `max_devices` n'est pas dépassé et que l'appareil n'est pas révoqué.
- **Réponse HTTP 200 :**
```json
{
  "success": true,
  "message": "Terminal Android authentifié avec succès.",
  "user": {
    "id": "7f8b9e6a-1234-4567-89ab-cdef01234567",
    "email": "client@besharetv.com",
    "role": "viewer",
    "expires_at": "2027-10-28T22:30:00Z",
    "max_devices": 2
  },
  "device": {
    "device_id": "d41d8cd98f00b204e9800998ecf8427e",
    "device_type": "android_tv",
    "status": "authorized"
  }
}
```
- **Code d'Erreur 429 (Limite d'écrans atteinte) :**
```json
{
  "error": "Limite d'écrans atteinte (2/2). Veuillez déconnecter un autre appareil.",
  "max_devices": 2,
  "active_devices": 2
}
```

---

### 3.2. Bootstrap Initial
- **Endpoint :** `GET /client-api?action=bootstrap`
- **Rôle :** Chargement rapide des métadonnées du serveur, statut de l'abonnement et fonctionnalités actives.

---

### 3.3. Catégories du Catalogue
- **Endpoint :** `GET /client-api?action=categories&type={live|movie|series}`
- **Rôle :** Liste des catégories visibles avec noms bilingues (Français et Arabe RTL).
- **Exemple de Réponse :**
```json
{
  "categories": [
    {
      "id": "c1a2b3c4-0001",
      "category_type": "live",
      "name": "Sports & Compétitions HD",
      "name_ar": "قنوات رياضية عالية الدقة",
      "icon_url": "https://example.com/icons/sports.png",
      "sort_order": 1
    }
  ]
}
```

---

### 3.4. Chaînes en Direct (Live TV)
- **Endpoint :** `GET /client-api?action=channels&category_id={id}&page=1&limit=50`
- **Rôle :** Chaînes paginées avec logos, canal, nom et identifiant EPG.
- **Exemple de Réponse :**
```json
{
  "channels": [
    {
      "id": "e5f6a7b8-1001",
      "category_id": "c1a2b3c4-0001",
      "channel_num": 1,
      "name": "beIN Sports 1 HD",
      "logo_url": "https://example.com/logos/bein1.png",
      "epg_channel_id": "beIN1.fr",
      "stream_type": "live",
      "sort_order": 1
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 14,
  "has_more": false
}
```

---

### 3.5. Films VOD
- **Endpoint :** `GET /client-api?action=movies&category_id={id}&search={terme}&page=1&limit=30`
- **Rôle :** Liste paginée des films avec jaquette verticale, note, année et résumé.

---

### 3.6. Séries TV & Épisodes
- **Endpoint 1 (Séries) :** `GET /client-api?action=series&category_id={id}&page=1&limit=30`
- **Endpoint 2 (Épisodes) :** `GET /client-api?action=episodes&series_id={id}`
- **Rôle :** Détail des saisons et épisodes ordonnés pour lecture séquentielle.

---

### 3.7. Guide Électronique des Programmes (EPG)
- **Endpoint :** `GET /client-api?action=epg&channel_id={id}`
- **Rôle :** Émissions en cours et à venir pour affichage dans la grille horaire Android TV.

---

### 3.8. Résolution Sécurisée de Flux (Stream Resolver)
- **Endpoint :** `GET /client-api?action=resolve_stream&type={channel|movie|episode}&id={id}`
- **Rôle :** Vérifie le statut actif et non expiré de l'abonné, et renvoie l'URL de lecture directe pour AndroidX Media3 ExoPlayer.
```json
{
  "success": true,
  "media_id": "e5f6a7b8-1001",
  "media_type": "channel",
  "title": "beIN Sports 1 HD",
  "stream_url": "https://authorized-cdn.tv/live/bein1.m3u8",
  "expires_in_secs": 7200
}
```

---

## 4. Définition de l'Interface Retrofit (Kotlin Android)

Cette interface sera directement intégrée lors de l'Étape 5 dans le module Android :

```kotlin
package com.beshare.tv.data.api

import com.beshare.tv.data.model.*
import retrofit2.Response
import retrofit2.http.*

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
        @Query("type") type: String,
        @Query("id") id: String
    ): Response<StreamResolveResponse>
}
```
