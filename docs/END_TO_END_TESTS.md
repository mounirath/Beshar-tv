# BeShare TV — Procédure de Test de Bout en Bout (End-to-End Test Suite)

Ce document détaille les 6 scénarios de test formels pour valider l'intégrité, la sécurité et la synchronisation de bout en bout entre le **Panneau Web**, **Supabase** et l'**Application Android TV**.

---

## Scénario 1 : Vérification de l'Étanchéité RLS Supabase (Anti-Fuite Fournisseurs)

### Objectif :
Démontrer mathématiquement qu'aucun abonné ni requête publique ne peut lire les mots de passe, URLs ou adresses MAC dans la table `public.sources`.

### Procédure de Test (à exécuter dans Supabase SQL Editor) :
```sql
-- 1. Insérer un profil viewer standard fictif
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'viewer_test@besharetv.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_profiles (id, email, role, is_active, expires_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'viewer_test@besharetv.com', 'viewer', true, NOW() + INTERVAL '1 year')
ON CONFLICT DO NOTHING;

-- 2. Simuler une session connectée sous ce compte non-administrateur
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

-- 3. Tenter d'interroger la table des sources et mots de passe
SELECT * FROM public.sources;
```

### Résultat Attendu :
- **Nombre de lignes retournées :** `0 rows` (Ensemble vide).
- **Statut :** Succès de la politique RLS. Les secrets des fournisseurs sont strictement isolés de tout utilisateur autre que l'administrateur.

---

## Scénario 2 : Blocage des Attaques SSRF (Server-Side Request Forgery)

### Objectif :
Valider que l'Edge Function bloque immédiatement toute tentative d'atteindre les métadonnées Cloud (AWS/GCP), les adresses de bouclage local ou les ports internes.

### Matrice des Vecteurs Testés :

| Vecteur d'Attaque | URL Testée | Résultat Attendu |
| :--- | :--- | :--- |
| **Cloud Metadata AWS/GCP** | `http://169.254.169.254/latest/meta-data` | ❌ **Bloqué** (IP lien-local interdite) |
| **Loopback Localhost** | `http://127.0.0.1:5432` | ❌ **Bloqué** (Loopback et port PostgreSQL interdits) |
| **Réseau Privé Interne** | `http://192.168.1.1:8080/stream.m3u8` | ❌ **Bloqué** (Plage RFC 1918 privée interdite) |
| **Port Sensible Redis** | `http://my-stream.tv:6379/playlist.m3u8` | ❌ **Bloqué** (Port système sensible 6379 interdit) |
| **Protocole Fichier Local** | `file:///etc/passwd` | ❌ **Bloqué** (Protocole `file:` non autorisé) |
| **Source Publique Autorisée** | `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` | ✅ **Autorisé** (Protocole https et hôte public) |

---

## Scénario 3 : Assainissement des Journaux (Zéro Mot de Passe en Clair)

### Objectif :
Vérifier qu'en cas d'erreur de connexion auprès d'un fournisseur Xtream Codes ou Stalker, aucun mot de passe n'apparaît dans la table `public.sync_logs`.

### Test :
Envoi d'une chaîne d'erreur simulée :
`"Échec authentification sur http://provider.stream:8080/live/user1/SecretPassword123/stream.m3u8"`

### Résultat Attendu dans `sync_logs` :
`"Échec authentification sur http://provider.stream:8080/live/user1/[REDACTED]/stream.m3u8"`

---

## Scénario 4 : Contrôle Multi-Écrans Android (`HTTP 429 Too Many Devices`)

### Objectif :
Valider la limitation du nombre d'appareils simultanés (`max_devices = 2`).

### Procédure :
1. L'application Android A émet un handshake avec `x-device-id: device-uuid-001`.
   - **Réponse :** `HTTP 200 OK` (1/2 écran actif).
2. L'application Android B émet un handshake avec `x-device-id: device-uuid-002`.
   - **Réponse :** `HTTP 200 OK` (2/2 écrans actifs).
3. Une troisième application C tente un handshake avec `x-device-id: device-uuid-003`.
   - **Réponse :** `HTTP 429 Too Many Requests` :
     ```json
     {
       "error": "Limite d'écrans atteinte (2/2). Veuillez déconnecter un autre appareil.",
       "max_devices": 2,
       "active_devices": 2
     }
     ```
   - L'application C affiche immédiatement l'écran d'alerte sans crasher.

---

## Scénario 5 : Lecture Vidéo HLS & Zapping ExoPlayer

### Objectif :
Tester le démarrage du flux et le décodage vidéo avec l'ExoPlayer AndroidX Media3.

### Test de Flux Témoin HLS Standard :
- **URL :** `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`
- **Résolution :** 1080p / 720p adaptatif.
- **Vérifications :**
  - Démarrage de la lecture en moins de 1,2 seconde.
  - Absence de saccade grâce au buffer adaptatif (DefaultLoadControl).
  - Contrôle via la télécommande D-pad (OK = Pause/Play).

---

## Scénario 6 : Actualisation Dynamique sans Recompilation APK

### Objectif :
Vérifier qu'une modification apportée dans le Panneau Web est visible sur l'application Android sans mise à jour APK.

### Procédure :
1. Dans le Panneau Web, ajoutez une chaîne « France Info Direct » ou activez une catégorie masquée.
2. Déclenchez la synchronisation.
3. Sur votre Android TV, retournez à l'écran d'accueil ou appuyez sur l'onglet Live TV.
4. **Constat :** La nouvelle chaîne et sa catégorie apparaissent instantanément dans la grille Jetpack Compose.
