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
