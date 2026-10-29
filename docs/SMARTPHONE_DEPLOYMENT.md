# BeShare TV — Guide Complet de Configuration & Déploiement depuis un Smartphone

Ce guide vous permet d'installer, configurer et administrer l'intégralité du système **BeShare TV** (Backend Supabase, Panneau Web Vercel, et Application Android TV) **uniquement depuis un smartphone** (Android ou iPhone), sans avoir besoin d'un ordinateur.

---

## 1. Déploiement du Backend Supabase (depuis votre Smartphone)

1. **Ouvrez le navigateur web de votre smartphone** (Chrome, Safari ou Brave).
2. Rendez-vous sur [supabase.com](https://supabase.com) et connectez-vous à votre compte.
3. Créez un nouveau projet (ex: `beshare-tv`).
4. Dans le menu latéral de Supabase :
   - Appuyez sur **SQL Editor** (icône terminal `>_`).
   - Appuyez sur **New query** (Nouvelle requête).
   - Copiez l'intégralité du code SQL du fichier `/supabase/migrations/01_schema_and_security.sql`.
   - Collez-le dans l'éditeur et appuyez sur le bouton vert **Run**.
5. **Récupérez vos clés d'API :**
   - Allez dans **Project Settings** > **API**.
   - Notez :
     - `Project URL` (ex: `https://xyzproject.supabase.co`)
     - `anon / public key` (ex: `eyJhbGci...`)
     - `service_role key` (gardez-la confidentielle, ne la partagez jamais).

Le premier utilisateur qui s'inscrira dans votre application sera automatiquement promu **Administrateur** grâce au déclencheur SQL `on_auth_user_created`.

---

## 2. Déploiement du Panneau Web sur Vercel (depuis votre Smartphone)

1. Ouvrez [vercel.com](https://vercel.com) depuis votre smartphone.
2. Connectez-vous avec votre compte GitHub / GitLab.
3. Appuyez sur **Add New...** > **Project**.
4. Sélectionnez le dépôt Git contenant votre projet BeShare TV.
5. Dans la section **Environment Variables** (Variables d'environnement), ajoutez les 2 variables suivantes :
   - **`VITE_SUPABASE_URL`** = Votre URL de projet Supabase.
   - **`VITE_SUPABASE_ANON_KEY`** = Votre clé Anon publique Supabase.
6. Appuyez sur le bouton bleu **Deploy**.
7. En 45 secondes, Vercel génère votre URL publique sécurisée (ex: `https://beshare-tv.vercel.app`).
8. Ouvrez cette URL dans le navigateur de votre smartphone : l'interface mobile-first s'adapte à votre écran avec le mode sombre et le support bilingue Français / Arabe RTL.

---

## 3. Génération de l'APK Android sans Ordinateur (via GitHub Actions)

Grâce au fichier d'automatisation `/.github/workflows/android-build.yml` inclus dans le projet, vous n'avez pas besoin d'Android Studio ni d'un PC :

1. Ouvrez [github.com](https://github.com) depuis votre smartphone et accédez à votre dépôt BeShare TV.
2. Appuyez sur l'onglet **Actions**.
3. Sélectionnez le workflow **BeShare TV — Build & Release APK**.
4. Appuyez sur **Run workflow**.
5. En 2 minutes, GitHub compile l'application dans le cloud et génère le fichier `app-debug.apk`.
6. Téléchargez l'archive `BeShareTV-Debug-APK` directement sur le stockage de votre smartphone.

---

## 4. Installation sur Android TV / Google TV / Fire TV depuis votre Smartphone

Pour transférer et installer l'APK sur votre téléviseur sans câble :

1. **Sur votre Téléviseur (Android TV / Google TV / Fire TV) :**
   - Ouvrez le Google Play Store de votre TV et installez l'application gratuite **"Send files to TV"**.
   - Installez également un gestionnaire de fichiers gratuit sur la TV (ex: **"File Commander"** ou **"AnExplorer"**).
   - Lancez l'application "Send files to TV" et sélectionnez **RECEIVE**.

2. **Sur votre Smartphone :**
   - Installez l'application **"Send files to TV"** depuis le Play Store ou App Store.
   - Assurez-vous que votre téléphone et votre TV sont connectés au **même réseau Wi-Fi**.
   - Lancez "Send files to TV", appuyez sur **SEND** et choisissez le fichier `app-debug.apk` téléchargé à l'étape 3.
   - Sélectionnez votre téléviseur dans la liste : le fichier est transféré en quelques secondes.

3. **Installation sur la TV :**
   - Sur votre téléviseur, ouvrez le fichier `app-debug.apk` depuis "Send files to TV" ou votre gestionnaire de fichiers.
   - Autorisez l'installation d'applications de sources inconnues si le système le demande.
   - Appuyez sur **Installer**.
   - Lancez **BeShare TV** : l'icône apparaît directement dans le lanceur Android TV (Leanback).

---

## 5. Gestion Quotidienne depuis votre Smartphone

- **Ajout ou modification de sources :** Connectez-vous sur votre panneau Web Vercel depuis votre smartphone pour ajouter une source M3U, Xtream Codes ou Stalker Portal.
- **Synchronisation immédiate :** Appuyez sur « Synchroniser » : les flux et catégories se mettent à jour instantanément.
- **Aucune réinstallation requise :** L'application sur votre Android TV actualise automatiquement son catalogue sans que vous ayez à recompiler ou réinstaller l'APK !
