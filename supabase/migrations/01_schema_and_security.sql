-- ====================================================================
-- BeShare TV — Étape 1 : Schéma PostgreSQL, Sécurité & RLS Supabase
-- Version: 1.0.0 (Production-Ready)
-- Compatible: Supabase PostgreSQL 15+ / Cloud SQL
-- ====================================================================

-- 1. EXTENSIONS REQUISES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. TABLE DES PROFILS UTILISATEURS (RBAC & GESTION DES ABONNEMENTS)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_devices INTEGER NOT NULL DEFAULT 2 CHECK (max_devices >= 1 AND max_devices <= 10),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 3. TABLE DES SOURCES FOURNISSEURS (M3U, XTREAM CODES, STALKER)
-- STRICTEMENT CONFIDENTIEL — ACCÈS ADMIN SEULEMENT (AUCUN LEAK CLIENT)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('m3u', 'xtream', 'stalker')),
    server_url TEXT NOT NULL,
    username TEXT,
    password TEXT,
    mac_address TEXT, -- Spécifique Stalker Portal (ex: 00:1A:79:XX:XX:XX)
    epg_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_interval_hours INTEGER NOT NULL DEFAULT 24 CHECK (sync_interval_hours >= 1),
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT DEFAULT 'pending' CHECK (last_sync_status IN ('pending', 'running', 'success', 'failed', 'partial')),
    last_error TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 4. TABLE DES CATÉGORIES (TV DIRECT, FILMS VOD, SÉRIES)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.sources(id) ON DELETE CASCADE,
    category_type TEXT NOT NULL CHECK (category_type IN ('live', 'movie', 'series')),
    category_ext_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    name_ar TEXT, -- Nom en Arabe pour l'interface bilingue RTL
    icon_url TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categories_source_ext UNIQUE (source_id, category_type, category_ext_id)
);

-- ====================================================================
-- 5. TABLE DES CHAÎNES EN DIRECT (LIVE TV)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    channel_ext_id TEXT,
    channel_num INTEGER,
    name TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    logo_url TEXT,
    epg_channel_id TEXT,
    stream_type TEXT NOT NULL DEFAULT 'live',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_channels_source_ext UNIQUE (source_id, channel_ext_id)
);

-- ====================================================================
-- 6. TABLE DES FILMS (VOD MOVIES)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    movie_ext_id TEXT,
    title TEXT NOT NULL,
    title_ar TEXT,
    stream_url TEXT NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    rating NUMERIC(3, 1) DEFAULT 0.0,
    release_year INTEGER,
    duration_mins INTEGER,
    synopsis TEXT,
    stream_format TEXT DEFAULT 'mp4',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_movies_source_ext UNIQUE (source_id, movie_ext_id)
);

-- ====================================================================
-- 7. TABLE DES SÉRIES (VOD SERIES)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    series_ext_id TEXT,
    title TEXT NOT NULL,
    title_ar TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    rating NUMERIC(3, 1) DEFAULT 0.0,
    release_year INTEGER,
    plot TEXT,
    seasons_count INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_series_source_ext UNIQUE (source_id, series_ext_id)
);

-- ====================================================================
-- 8. TABLE DES ÉPISODES (VOD EPISODES)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
    episode_ext_id TEXT,
    season_number INTEGER NOT NULL DEFAULT 1,
    episode_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    duration_mins INTEGER,
    still_url TEXT,
    plot TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_episodes_series_ext UNIQUE (series_id, season_number, episode_number)
);

-- ====================================================================
-- 9. TABLE EPG (ELECTRONIC PROGRAM GUIDE)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.epg_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    epg_channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 10. TABLE DES JOURNAUX DE SYNCHRONISATION ET ERREURS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.sources(id) ON DELETE CASCADE,
    source_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('started', 'running', 'success', 'failed', 'partial')),
    channels_count INTEGER DEFAULT 0,
    movies_count INTEGER DEFAULT 0,
    series_count INTEGER DEFAULT 0,
    episodes_count INTEGER DEFAULT 0,
    epg_count INTEGER DEFAULT 0,
    error_details TEXT,
    duration_ms INTEGER,
    triggered_by TEXT NOT NULL DEFAULT 'admin_manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 11. TABLE DES APPAREILS CLIENTS ANDROID & ANDROID TV
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.client_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT NOT NULL DEFAULT 'android_tv' CHECK (device_type IN ('android_mobile', 'android_tv', 'web')),
    app_version TEXT,
    last_ip TEXT,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_device UNIQUE (user_id, device_id)
);

-- ====================================================================
-- 12. TABLE DES FAVORIS UTILISATEURS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('channel', 'movie', 'series')),
    item_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite UNIQUE (user_id, item_type, item_id)
);

-- ====================================================================
-- 13. INDEX POUR PERFORMANCES OPTIMALES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_categories_source ON public.categories(source_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(category_type, is_visible);
CREATE INDEX IF NOT EXISTS idx_channels_category ON public.channels(category_id);
CREATE INDEX IF NOT EXISTS idx_channels_active ON public.channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_epg ON public.channels(epg_channel_id);
CREATE INDEX IF NOT EXISTS idx_movies_category ON public.movies(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_series_category ON public.series(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON public.episodes(series_id, season_number);
CREATE INDEX IF NOT EXISTS idx_epg_channel_time ON public.epg_programs(channel_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_epg_channel_id ON public.epg_programs(epg_channel_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON public.sync_logs(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_user ON public.client_devices(user_id, is_revoked);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.user_favorites(user_id);

-- ====================================================================
-- 14. FONCTIONS DE SÉCURITÉ & TRIGGERS (SECURITY DEFINER)
-- ====================================================================

-- Mise à jour automatique des dates `updated_at`
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheurs updated_at
CREATE OR REPLACE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_sources_updated_at
BEFORE UPDATE ON public.sources
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_channels_updated_at
BEFORE UPDATE ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_movies_updated_at
BEFORE UPDATE ON public.movies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_series_updated_at
BEFORE UPDATE ON public.series
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_episodes_updated_at
BEFORE UPDATE ON public.episodes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Fonction vérifiant si l'utilisateur courant est Administrateur
-- Sécurité: SECURITY DEFINER + search_path public pour éviter la récursion infinie en RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND is_active = true
    );
$$;

-- Fonction vérifiant si l'utilisateur est un abonné actif valide (non expiré)
CREATE OR REPLACE FUNCTION public.is_active_subscriber()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
    );
$$;

-- Trigger à la création d'un utilisateur Supabase Auth
-- Si c'est le tout premier utilisateur inscrit ou si son email est celui de l'admin, attribution du rôle 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_count INTEGER;
    initial_role TEXT := 'viewer';
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.user_profiles;
    
    -- Le premier compte créé hérite automatiquement du statut Admin
    IF user_count = 0 THEN
        initial_role := 'admin';
    END IF;

    INSERT INTO public.user_profiles (id, email, role, is_active, max_devices, expires_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, 'client@besharetv.com'),
        initial_role,
        true,
        2,
        NOW() + INTERVAL '1 year'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 15. ACTIVATION STRICTE DU ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epg_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 16. POLITIQUES RLS (ROW LEVEL SECURITY POLICIES)
-- ====================================================================

-- --------------------------------------------------------------------
-- A. user_profiles
-- --------------------------------------------------------------------
-- L'admin a plein accès
CREATE POLICY "Admins ont un accès complet aux profils"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Chaque utilisateur peut lire son propre profil
CREATE POLICY "Les utilisateurs peuvent lire leur propre profil"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- --------------------------------------------------------------------
-- B. sources (CONFIDENTIALITÉ MAXIMALE — STRICTEMENT ADMIN)
-- Aucun token fournisseur ni mot de passe n'est visible par l'app mobile ou les utilisateurs ordinaires
-- --------------------------------------------------------------------
CREATE POLICY "Seuls les admins gèrent et consultent les sources"
ON public.sources
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- C. sync_logs (ADMIN SEULEMENT)
-- --------------------------------------------------------------------
CREATE POLICY "Seuls les admins consultent les journaux de synchro"
ON public.sync_logs
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- D. categories
-- --------------------------------------------------------------------
CREATE POLICY "Admins gèrent toutes les catégories"
ON public.categories
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Les abonnés actifs peuvent consulter les catégories visibles"
ON public.categories
FOR SELECT
TO authenticated
USING (public.is_active_subscriber() AND is_visible = true);

-- --------------------------------------------------------------------
-- E. channels (LIVE TV)
-- --------------------------------------------------------------------
CREATE POLICY "Admins gèrent toutes les chaînes"
ON public.channels
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Les abonnés actifs accèdent aux chaînes autorisées"
ON public.channels
FOR SELECT
TO authenticated
USING (public.is_active_subscriber() AND is_active = true);

-- --------------------------------------------------------------------
-- F. movies (VOD FILMS)
-- --------------------------------------------------------------------
CREATE POLICY "Admins gèrent tous les films"
ON public.movies
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Les abonnés actifs accèdent aux films autorisés"
ON public.movies
FOR SELECT
TO authenticated
USING (public.is_active_subscriber() AND is_active = true);

-- --------------------------------------------------------------------
-- G. series (VOD SÉRIES)
-- --------------------------------------------------------------------
CREATE POLICY "Admins gèrent toutes les séries"
ON public.series
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Les abonnés actifs accèdent aux séries autorisées"
ON public.series
FOR SELECT
TO authenticated
USING (public.is_active_subscriber() AND is_active = true);

-- --------------------------------------------------------------------
-- H. episodes (ÉPISODES)
-- --------------------------------------------------------------------
CREATE POLICY "Admins gèrent tous les épisodes"
ON public.episodes
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Les abonnés actifs accèdent aux épisodes autorisés"
ON public.episodes
FOR SELECT
TO authenticated
USING (public.is_active_subscriber() AND is_active = true);

-- --------------------------------------------------------------------
-- I. epg_programs (GUIDE EPG)
-- --------------------------------------------------------------------
CREATE POLICY "Admins gèrent l'EPG"
ON public.epg_programs
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Les abonnés actifs consultent le guide EPG"
ON public.epg_programs
FOR SELECT
TO authenticated
USING (public.is_active_subscriber());

-- --------------------------------------------------------------------
-- J. client_devices (CONTRÔLE DU NOMBRE D'APPAREILS CONNECTÉS)
-- --------------------------------------------------------------------
CREATE POLICY "Admins ont vue sur tous les appareils connectés"
ON public.client_devices
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "L'utilisateur gère ses propres appareils"
ON public.client_devices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "L'utilisateur enregistre son appareil"
ON public.client_devices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "L'utilisateur met à jour son propre appareil"
ON public.client_devices
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- K. user_favorites (FAVORIS CLIENT)
-- --------------------------------------------------------------------
CREATE POLICY "L'utilisateur consulte ses favoris"
ON public.user_favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "L'utilisateur ajoute un favori"
ON public.user_favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "L'utilisateur supprime un favori"
ON public.user_favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
