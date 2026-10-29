# BeShare TV — Étape 1 : Base de Données & Sécurité Supabase

## 1. Vue d'ensemble de l'Architecture
Ce module fournit la base de données PostgreSQL complète et les politiques de sécurité Row Level Security (RLS) pour **BeShare TV**, garantissant l'étanchéité absolue des informations sensibles entre le panneau d'administration Web et les applications clientes Android / Android TV.

### Principe de Sécurité Zéro-Fuite
- **Table `sources` (M3U, Xtream Codes, Stalker Portal) :**
  - RLS activée avec politique restrictive `is_admin()`.
  - **Aucun client Android ou utilisateur public ne peut interroger cette table.**
  - Les URLs serveurs, noms d'utilisateurs, mots de passe et adresses MAC ne quittent JAMAIS le serveur ou l'Edge Function.
- **Tables Catalogue (`categories`, `channels`, `movies`, `series`, `episodes`, `epg_programs`) :**
  - Seuls les abonnés actifs (`is_active = true` et `expires_at > NOW()`) peuvent interroger le contenu actif (`is_active = true`).
  - L'administrateur conserve les droits d'écriture, mise à jour et suppression complète (CRUD).
- **Contrôle Multi-Écrans (`client_devices`) :**
  - Chaque compte abonné dispose d'un quota d'écrans simultanés (`max_devices`, défaut: 2).
  - Les appareils sont rattachés par UUID matériel unique avec horodatage `last_seen_at`.

---

## 2. Déploiement du Schéma SQL

### Option A : Depuis l'interface Web Supabase Studio (Recommandé sur Mobile ou Desktop)
1. Rendez-vous sur votre tableau de bord [Supabase Dashboard](https://supabase.com/dashboard).
2. Sélectionnez ou créez votre projet BeShare TV.
3. Dans la barre latérale gauche, cliquez sur **SQL Editor**.
4. Cliquez sur **New Query**.
5. Copiez et collez l'intégralité du fichier `supabase/migrations/01_schema_and_security.sql`.
6. Cliquez sur le bouton vert **RUN**.
7. Vérifiez l'affichage de *Success: Success. No rows returned*.

### Option B : Via la CLI Supabase
```bash
supabase db push
# ou directement avec psql
psql "postgresql://postgres:[VOTRE_MOT_DE_PASSE]@db.[VOTRE_PROJECT_REF].supabase.co:5432/postgres" -f supabase/migrations/01_schema_and_security.sql
```

---

## 3. Configuration du Premier Administrateur
Lors de la création du tout premier utilisateur via l'authentification Supabase (Email/Password), le déclencheur `on_auth_user_created` lui attribue automatiquement le rôle **`admin`** dans `public.user_profiles`.

Pour promouvoir manuellement un utilisateur existant en administrateur :
```sql
UPDATE public.user_profiles
SET role = 'admin', is_active = true
WHERE email = 'votre-email@besharetv.com';
```

---

## 4. Matrice des Droits et Politiques RLS

| Table | Rôle Anonyme | Rôle Viewer (Abonné Actif) | Rôle Viewer (Expiré/Bloqué) | Rôle Admin |
| :--- | :--- | :--- | :--- | :--- |
| `sources` | ❌ Bloqué | ❌ Bloqué | ❌ Bloqué | ✅ Lecture / Écriture totale |
| `sync_logs` | ❌ Bloqué | ❌ Bloqué | ❌ Bloqué | ✅ Lecture / Écriture totale |
| `user_profiles` | ❌ Bloqué | ✅ Lecture (propre profil) | ✅ Lecture (propre profil) | ✅ Lecture / Écriture totale |
| `categories` | ❌ Bloqué | ✅ Lecture (visibles) | ❌ Bloqué | ✅ Gestion totale |
| `channels` | ❌ Bloqué | ✅ Lecture (actives) | ❌ Bloqué | ✅ Gestion totale |
| `movies` | ❌ Bloqué | ✅ Lecture (actifs) | ❌ Bloqué | ✅ Gestion totale |
| `series` | ❌ Bloqué | ✅ Lecture (actives) | ❌ Bloqué | ✅ Gestion totale |
| `episodes` | ❌ Bloqué | ✅ Lecture (actifs) | ❌ Bloqué | ✅ Gestion totale |
| `epg_programs` | ❌ Bloqué | ✅ Lecture | ❌ Bloqué | ✅ Gestion totale |
| `client_devices` | ❌ Bloqué | ✅ CRUD (propres appareils) | ❌ Bloqué | ✅ Gestion globale |
| `user_favorites` | ❌ Bloqué | ✅ CRUD (propres favoris) | ❌ Bloqué | ✅ Gestion globale |

---

## 5. Étape 2 : Déploiement des Edge Functions & Moteur de Synchronisation

Les Edge Functions sont situées dans `/supabase/functions/` et intègrent le moteur de parsing et d'assainissement :

### Structure des modules :
- **`/supabase/functions/_shared/ssrf.ts`** :
  - Bloque les IPs privées (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  - Bloque les boucles locales (127.0.0.0/8, ::1, localhost)
  - Bloque les métadonnées Cloud (169.254.169.254, metadata.google.internal)
  - Bloque les ports sensibles (22, 25, 3306, 5432, 6379, etc.)
  - Timeout d'annulation automatique et limitation de taille (40 Mo max anti-DoS).
- **`/supabase/functions/_shared/sanitizer.ts`** :
  - Caviarde automatiquement les mots de passe, tokens et clés secrètes avant toute insertion dans `sync_logs` ou affichage console.
- **`/supabase/functions/_shared/m3u_parser.ts`** :
  - Parseur en streaming pour flux M3U/M3U8 avec classification automatique (Live TV, Films VOD, Séries).
- **`/supabase/functions/_shared/xtream_client.ts`** :
  - Client API v2 Xtream Codes avec négociation `player_api.php` et construction d'URLs sécurisées.
- **`/supabase/functions/_shared/stalker_client.ts`** :
  - Client Stalker Portal (Ministra) avec Handshake MAC et résolution de liens de lecture.
- **`/supabase/functions/sync-source/index.ts`** :
  - Edge Function principale effectuant la synchronisation complète et les écritures par lots dans PostgreSQL.
- **`/supabase/functions/test-source/index.ts`** :
  - Edge Function de diagnostic pour tester une source avant enregistrement.

### Déploiement via Supabase CLI :
```bash
# Déploiement des fonctions Edge
supabase functions deploy sync-source --no-verify-jwt=false
supabase functions deploy test-source --no-verify-jwt=false

# Définition des variables secrètes sur Supabase
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="votre-cle-service-role"
```

### Automatisation de la synchronisation (Optionnel avec pg_cron dans Supabase SQL) :
```sql
-- Planifier une synchronisation automatique toutes les 24 heures pour les sources actives
SELECT cron.schedule(
    'beshare-auto-sync-sources',
    '0 3 * * *', -- Tous les jours à 03h00 du matin
    $$
    SELECT net.http_post(
        url := 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/sync-source',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object('source_id', id)
    )
    FROM public.sources
    WHERE is_active = true;
    $$
);
```
