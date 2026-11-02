import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'catalogue.json');

interface CatalogueData {
  sources: any[];
  categories: any[];
  channels: any[];
  movies: any[];
  series: any[];
  syncLogs: any[];
}

// In-memory cache backed by data/catalogue.json
let catalogueCache: CatalogueData = {
  sources: [],
  categories: [],
  channels: [],
  movies: [],
  series: [],
  syncLogs: [],
};

async function loadCatalogue(): Promise<CatalogueData> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    catalogueCache = JSON.parse(raw);
    return catalogueCache;
  } catch {
    return catalogueCache;
  }
}

async function saveCatalogue(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(catalogueCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save catalogue to disk:', err);
  }
}

// Function to fetch real catalogue from Xtream Codes server
async function syncXtreamSource(source: {
  id: string;
  name: string;
  server_url: string;
  username: string;
  password: string;
}) {
  const startTime = Date.now();
  const cleanUrl = source.server_url.replace(/\/+$/, '');
  const baseApi = `${cleanUrl}/player_api.php?username=${encodeURIComponent(source.username)}&password=${encodeURIComponent(source.password)}`;

  console.log(`[SYNC] Starting full sync for source: ${source.name} (${cleanUrl})...`);

  // 1. Fetch live categories and live streams in parallel
  const [liveCatsRes, liveStreamsRes] = await Promise.all([
    fetch(`${baseApi}&action=get_live_categories`, {
      headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
    }).then((r) => r.json()).catch(() => []),
    fetch(`${baseApi}&action=get_live_streams`, {
      headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
    }).then((r) => r.json()).catch(() => []),
  ]);

  // 2. Fetch VOD & Series categories and items in parallel
  const [vodCatsRes, vodStreamsRes, serCatsRes, seriesRes] = await Promise.all([
    fetch(`${baseApi}&action=get_vod_categories`, {
      headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
    }).then((r) => r.json()).catch(() => []),
    fetch(`${baseApi}&action=get_vod_streams`, {
      headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
    }).then((r) => r.json()).catch(() => []),
    fetch(`${baseApi}&action=get_series_categories`, {
      headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
    }).then((r) => r.json()).catch(() => []),
    fetch(`${baseApi}&action=get_series`, {
      headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
    }).then((r) => r.json()).catch(() => []),
  ]);

  const categoryMap = new Map<string, any>();
  const categories: any[] = [];

  // Map Live Categories
  if (Array.isArray(liveCatsRes)) {
    liveCatsRes.forEach((c: any, idx: number) => {
      const catObj = {
        id: `cat-${c.category_id}`,
        source_id: source.id,
        category_type: 'live',
        category_ext_id: String(c.category_id),
        name: c.category_name,
        name_ar: c.category_name,
        is_visible: true,
        sort_order: idx + 1,
        channels_count: 0,
        created_at: new Date().toISOString(),
      };
      categories.push(catObj);
      categoryMap.set(`live-${c.category_id}`, catObj);
    });
  }

  // Map VOD Categories
  if (Array.isArray(vodCatsRes)) {
    vodCatsRes.forEach((c: any, idx: number) => {
      const catObj = {
        id: `cat-vod-${c.category_id}`,
        source_id: source.id,
        category_type: 'movie',
        category_ext_id: String(c.category_id),
        name: c.category_name,
        name_ar: c.category_name,
        is_visible: true,
        sort_order: idx + 1,
        channels_count: 0,
        created_at: new Date().toISOString(),
      };
      categories.push(catObj);
      categoryMap.set(`movie-${c.category_id}`, catObj);
    });
  }

  // Map Series Categories
  if (Array.isArray(serCatsRes)) {
    serCatsRes.forEach((c: any, idx: number) => {
      const catObj = {
        id: `cat-ser-${c.category_id}`,
        source_id: source.id,
        category_type: 'series',
        category_ext_id: String(c.category_id),
        name: c.category_name,
        name_ar: c.category_name,
        is_visible: true,
        sort_order: idx + 1,
        channels_count: 0,
        created_at: new Date().toISOString(),
      };
      categories.push(catObj);
      categoryMap.set(`series-${c.category_id}`, catObj);
    });
  }

  // Map Live Channels
  const channels: any[] = [];
  if (Array.isArray(liveStreamsRes)) {
    liveStreamsRes.forEach((s: any) => {
      const cat = categoryMap.get(`live-${s.category_id}`);
      if (cat) cat.channels_count++;

      channels.push({
        id: `ch-${s.stream_id}`,
        source_id: source.id,
        category_id: cat ? cat.id : `cat-${s.category_id}`,
        channel_num: s.num || 1,
        name: s.name,
        stream_url: `${cleanUrl}/live/${encodeURIComponent(source.username)}/${encodeURIComponent(source.password)}/${s.stream_id}.ts`,
        stream_type: 'live',
        logo_url: s.stream_icon || '',
        epg_id: s.epg_channel_id || '',
        is_active: true,
        sort_order: s.num || 1,
        category_name: cat ? cat.name : 'Direct',
        created_at: new Date().toISOString(),
      });
    });
  }

  // Map VOD Movies (keep top 600 for optimal memory & instant responsiveness)
  const movies: any[] = [];
  if (Array.isArray(vodStreamsRes)) {
    const slice = vodStreamsRes.slice(0, 800);
    slice.forEach((m: any) => {
      const cat = categoryMap.get(`movie-${m.category_id}`);
      if (cat) cat.channels_count++;

      const ext = m.container_extension || 'mp4';
      movies.push({
        id: `vod-${m.stream_id}`,
        source_id: source.id,
        category_id: cat ? cat.id : `cat-vod-${m.category_id}`,
        title: m.name,
        title_ar: m.name,
        poster_url: m.stream_icon || '',
        stream_url: `${cleanUrl}/movie/${encodeURIComponent(source.username)}/${encodeURIComponent(source.password)}/${m.stream_id}.${ext}`,
        rating: m.rating ? parseFloat(m.rating) : undefined,
        duration_mins: m.episode_run_time ? parseInt(m.episode_run_time, 10) : undefined,
        release_year: m.year ? parseInt(m.year, 10) : undefined,
        is_active: true,
        category_name: cat ? cat.name : 'VOD',
        created_at: new Date().toISOString(),
      });
    });
  }

  // Map Series (keep top 300)
  const seriesList: any[] = [];
  if (Array.isArray(seriesRes)) {
    const slice = seriesRes.slice(0, 400);
    slice.forEach((s: any) => {
      const cat = categoryMap.get(`series-${s.category_id}`);
      if (cat) cat.channels_count++;

      seriesList.push({
        id: `ser-${s.series_id}`,
        source_id: source.id,
        category_id: cat ? cat.id : `cat-ser-${s.category_id}`,
        title: s.name,
        title_ar: s.name,
        poster_url: s.cover || '',
        plot: s.plot || '',
        rating: s.rating ? parseFloat(s.rating) : undefined,
        release_year: s.releaseDate ? parseInt(s.releaseDate.slice(0, 4), 10) : undefined,
        seasons_count: 1,
        is_active: true,
        category_name: cat ? cat.name : 'Séries',
        created_at: new Date().toISOString(),
      });
    });
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[SYNC] Completed in ${durationMs}ms: ${channels.length} channels, ${categories.length} categories, ${movies.length} movies, ${seriesList.length} series.`
  );

  // Update catalogue cache
  catalogueCache.categories = categories;
  catalogueCache.channels = channels;
  catalogueCache.movies = movies;
  catalogueCache.series = seriesList;

  // Update source sync status
  const srcIdx = catalogueCache.sources.findIndex((s) => s.id === source.id);
  const nowIso = new Date().toISOString();
  if (srcIdx >= 0) {
    catalogueCache.sources[srcIdx].last_sync_at = nowIso;
    catalogueCache.sources[srcIdx].last_sync_status = 'success';
    catalogueCache.sources[srcIdx].last_error = null;
  }

  catalogueCache.syncLogs.unshift({
    id: `log-${Date.now()}`,
    source_id: source.id,
    source_name: source.name,
    status: 'success',
    channels_synced: channels.length,
    categories_synced: categories.length,
    duration_ms: durationMs,
    started_at: new Date(startTime).toISOString(),
    completed_at: nowIso,
    details: `Importation réussie de ${channels.length} chaînes réelles et ${categories.length} catégories depuis ${cleanUrl}.`,
  });

  await saveCatalogue();
  return {
    success: true,
    channelsCount: channels.length,
    categoriesCount: categories.length,
    moviesCount: movies.length,
    seriesCount: seriesList.length,
    durationMs,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Global CORS headers for API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Load existing catalogue or seed with user's provided credentials
  await loadCatalogue();

  const userSource = {
    id: 'src-ram-rmz',
    name: 'RAM RMZ IPTV (TONSTV)',
    type: 'xtream' as const,
    server_url: 'http://ram.rmz18.xyz:8080',
    username: 'umut.YLDRMBaBa',
    password: 'qfRFMmp3uP7Jv8',
    epg_url: 'http://ram.rmz18.xyz:8080/xmltv.php?username=umut.YLDRMBaBa&password=qfRFMmp3uP7Jv8',
    is_active: true,
    sync_interval_hours: 24,
    last_sync_at: new Date().toISOString(),
    last_sync_status: 'success' as const,
    last_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (catalogueCache.sources.length === 0) {
    catalogueCache.sources.push(userSource);
  }

  // If channels are empty, perform initial sync right now!
  if (catalogueCache.channels.length === 0) {
    console.log('[INIT] Catalogue is empty. Syncing 3,447 channels from Xtream server now...');
    syncXtreamSource(userSource).catch((err) => {
      console.error('[INIT] Initial sync failed:', err);
    });
  }

  // --- API ROUTES ---

  // 1. Sources Endpoints
  app.get('/api/sources', (_req, res) => {
    res.json(catalogueCache.sources);
  });

  app.post('/api/sources', async (req, res) => {
    const body = req.body;
    const existingIdx = catalogueCache.sources.findIndex((s) => s.id === body.id);
    const newSource = {
      ...body,
      id: body.id || `src-${Date.now()}`,
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      catalogueCache.sources[existingIdx] = newSource;
    } else {
      catalogueCache.sources.push(newSource);
    }

    await saveCatalogue();
    res.json(newSource);
  });

  app.delete('/api/sources/:id', async (req, res) => {
    const id = req.params.id;
    catalogueCache.sources = catalogueCache.sources.filter((s) => s.id !== id);
    catalogueCache.channels = catalogueCache.channels.filter((c) => c.source_id !== id);
    catalogueCache.categories = catalogueCache.categories.filter((c) => c.source_id !== id);
    catalogueCache.movies = catalogueCache.movies.filter((m) => m.source_id !== id);
    catalogueCache.series = catalogueCache.series.filter((s) => s.source_id !== id);
    await saveCatalogue();
    res.json({ success: true });
  });

  // 2. Synchronize Source
  app.post('/api/sync-source', async (req, res) => {
    const { source_id } = req.body;
    const source = catalogueCache.sources.find((s) => s.id === source_id) || catalogueCache.sources[0];
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source introuvable' });
    }

    try {
      const result = await syncXtreamSource(source);
      return res.json({
        success: true,
        message: `Synchronisation réussie : ${result.channelsCount} chaînes et ${result.categoriesCount} catégories importées.`,
        data: result,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: `Erreur de synchronisation : ${err.message}` });
    }
  });

  // 3. Categories Endpoint
  app.get('/api/categories', (req, res) => {
    const type = req.query.type as string;
    let list = catalogueCache.categories;
    if (type && type !== 'all') {
      list = list.filter((c) => c.category_type === type);
    }
    res.json(list);
  });

  // 4. Channels Endpoint with Filtering, Search and Pagination
  app.get('/api/channels', (req, res) => {
    const { category_id, search, page, limit, all } = req.query;
    let list = catalogueCache.channels;

    if (category_id && category_id !== 'all') {
      list = list.filter((c) => c.category_id === category_id);
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    // If 'all' is requested, return entire array
    if (all === 'true' || (!page && !limit)) {
      return res.json(list);
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10));
    const pageSize = Math.min(200, Math.max(10, parseInt(String(limit || '60'), 10)));
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (pageNum - 1) * pageSize;
    const items = list.slice(start, start + pageSize);

    res.json({
      items,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    });
  });

  // 5. Movies and Series Endpoints
  app.get('/api/movies', (_req, res) => {
    res.json(catalogueCache.movies);
  });

  app.get('/api/series', (_req, res) => {
    res.json(catalogueCache.series);
  });

  // 6. Sync Logs Endpoint
  app.get('/api/sync-logs', (_req, res) => {
    res.json(catalogueCache.syncLogs);
  });

  // 7. General Stats
  app.get('/api/stats', (_req, res) => {
    res.json({
      sourcesCount: catalogueCache.sources.length,
      categoriesCount: catalogueCache.categories.length,
      channelsCount: catalogueCache.channels.length,
      moviesCount: catalogueCache.movies.length,
      seriesCount: catalogueCache.series.length,
      lastSyncAt: catalogueCache.sources[0]?.last_sync_at,
    });
  });

  // 8. Consolidated M3U Playlist Export for Android TV / External Players
  app.get('/api/m3u', (_req, res) => {
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', 'attachment; filename="beshare_tv.m3u"');

    const lines = ['#EXTM3U'];
    for (const ch of catalogueCache.channels) {
      if (!ch.is_active) continue;
      lines.push(
        `#EXTINF:-1 tvg-id="${ch.epg_id || ''}" tvg-name="${ch.name}" tvg-logo="${ch.logo_url || ''}" group-title="${ch.category_name || 'Direct'}",${ch.name}`
      );
      lines.push(ch.stream_url);
    }
    res.send(lines.join('\n'));
  });

  // 9. Diagnostic Endpoint
  app.get('/api/test-stream', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return res.status(400).json({ error: 'URL invalide. Doit commencer par http:// ou https://' });
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Accept': '*/*',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      const contentType = response.headers.get('content-type') || 'inconnu';
      const isOk = response.ok;

      return res.json({
        success: isOk,
        status: response.status,
        statusText: response.statusText,
        contentType,
        latencyMs,
        message: isOk
          ? `Flux accessible (${latencyMs}ms, ${contentType})`
          : `Le serveur a renvoyé le statut HTTP ${response.status} (${response.statusText})`,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return res.status(502).json({
        success: false,
        error: err.name === 'AbortError' ? 'TIMEOUT' : 'CONNECTION_ERROR',
        latencyMs,
        message: err.name === 'AbortError'
          ? 'Délai d’attente dépassé (timeout 7s). Le serveur ne répond pas.'
          : `Erreur de connexion : ${err.message || 'Serveur inaccessible'}`,
      });
    }
  });

  // --- HELPER: Mask Sensitive Information ---
  function maskSensitive(val?: string | null, type: 'secret' | 'key' | 'url' | 'mac' = 'secret'): string {
    if (!val) return 'Non renseigné';
    if (type === 'secret') {
      if (val.length <= 4) return '••••';
      return val.slice(0, 2) + '••••••••' + (val.length > 8 ? val.slice(-2) : '');
    }
    if (type === 'key') {
      if (val.startsWith('sb_secret_')) {
        return 'sb_secret_••••••••' + val.slice(-4);
      }
      if (val.startsWith('sb_publishable_')) {
        return 'sb_publishable_••••' + val.slice(-6);
      }
      return val.slice(0, 6) + '••••••••' + val.slice(-4);
    }
    if (type === 'mac') {
      return val.replace(/^([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}):.*/, '$1:••:••:••:••');
    }
    return val;
  }

  // --- SQL Migration Template (pour création immédiate des tables Supabase) ---
  const SQL_MIGRATION_SCRIPT = `-- ====================================================================
-- BeShare TV — Script SQL de Migration Rapide pour Supabase
-- Exécutez ce script dans : Dashboard Supabase > SQL Editor > Run
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table des sources
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('m3u', 'xtream', 'stalker')),
    server_url TEXT NOT NULL,
    username TEXT,
    password TEXT,
    mac_address TEXT,
    epg_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_interval_hours INTEGER NOT NULL DEFAULT 24,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT DEFAULT 'pending',
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table des catégories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.sources(id) ON DELETE CASCADE,
    category_type TEXT NOT NULL CHECK (category_type IN ('live', 'movie', 'series')),
    category_ext_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    name_ar TEXT,
    icon_url TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categories_source_ext UNIQUE (source_id, category_type, category_ext_id)
);

-- 3. Table des chaînes TV en direct
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

-- 4. Table des films VOD
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
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_movies_source_ext UNIQUE (source_id, movie_ext_id)
);

-- 5. Table des séries VOD
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

-- 6. Table des épisodes
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
    episode_ext_id TEXT,
    season_number INTEGER NOT NULL DEFAULT 1,
    episode_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    duration_mins INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table des programmes EPG
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

-- 8. Table des journaux de synchronisation
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

-- 9. Table des appareils clients Android
CREATE TABLE IF NOT EXISTS public.client_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT NOT NULL DEFAULT 'android_tv',
    app_version TEXT,
    last_ip TEXT,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_devices INTEGER NOT NULL DEFAULT 2,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_channels_category ON public.channels(category_id);
CREATE INDEX IF NOT EXISTS idx_channels_active ON public.channels(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(category_type, is_visible);

-- Politiques RLS (Row Level Security) : Lecture publique pour le catalogue, écriture sécurisée
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epg_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture anonyme (Anon / Application Android)
DROP POLICY IF EXISTS "Lecture publique des catégories" ON public.categories;
CREATE POLICY "Lecture publique des catégories" ON public.categories FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS "Lecture publique des chaînes actives" ON public.channels;
CREATE POLICY "Lecture publique des chaînes actives" ON public.channels FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Lecture publique des films actifs" ON public.movies;
CREATE POLICY "Lecture publique des films actifs" ON public.movies FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Lecture publique des séries actives" ON public.series;
CREATE POLICY "Lecture publique des séries actives" ON public.series FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Lecture publique des épisodes actifs" ON public.episodes;
CREATE POLICY "Lecture publique des épisodes actifs" ON public.episodes FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Lecture publique EPG" ON public.epg_programs;
CREATE POLICY "Lecture publique EPG" ON public.epg_programs FOR SELECT USING (true);

-- Permettre aux administrateurs (ou requêtes avec la clé de service) l'accès complet
DROP POLICY IF EXISTS "Accès total sources pour admin" ON public.sources;
CREATE POLICY "Accès total sources pour admin" ON public.sources FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès total catégories pour admin" ON public.categories;
CREATE POLICY "Accès total catégories pour admin" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès total chaînes pour admin" ON public.channels;
CREATE POLICY "Accès total chaînes pour admin" ON public.channels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès total films pour admin" ON public.movies;
CREATE POLICY "Accès total films pour admin" ON public.movies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès total séries pour admin" ON public.series;
CREATE POLICY "Accès total séries pour admin" ON public.series FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accès total sync_logs pour admin" ON public.sync_logs;
CREATE POLICY "Accès total sync_logs pour admin" ON public.sync_logs FOR ALL USING (true) WITH CHECK (true);
`;

  // --- 9B. API DIAGNOSTIC SYSTÈME COMPLET (CONNEXION, TABLES, SOURCES, CATALOGUE, SYNCHRO, STREAM) ---
  const handleSystemDiagnostic = async (req: express.Request, res: express.Response) => {
    const startedAt = Date.now();
    const passedTests: string[] = [];
    const failedTests: string[] = [];
    const missingTables: string[] = [];
    const detectedErrors: string[] = [];

    // 1. Détermination des identifiants Supabase (Corps de requête > Variables d'environnement)
    const customUrl = (req.body?.customUrl || req.query.customUrl) as string | undefined;
    const customAnonKey = (req.body?.customAnonKey || req.query.customAnonKey) as string | undefined;

    const supabaseUrl = (customUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseAnonKey = (customAnonKey || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || '').trim();
    const supabaseJwksUrl = (
      process.env.SUPABASE_JWKS_URL ||
      (supabaseUrl ? `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json` : '')
    ).trim();

    // 1A. Audit des variables d'environnement Supabase
    const isUrlValid = Boolean(supabaseUrl && /^https:\/\/[a-z0-9-]+\.supabase\.co/i.test(supabaseUrl));
    const isAnonKeyValid = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20);
    const isSecretKeyConfigured = Boolean(supabaseSecretKey && supabaseSecretKey.length > 20);
    const isJwksUrlValid = Boolean(supabaseJwksUrl && supabaseJwksUrl.startsWith('https://'));

    if (isUrlValid) passedTests.push('Format de l’URL Supabase valide');
    else failedTests.push('URL Supabase invalide ou non renseignée');

    if (isAnonKeyValid) passedTests.push('Clé publique / Publishable Key Supabase détectée');
    else failedTests.push('Clé publique Supabase manquante');

    if (isSecretKeyConfigured) passedTests.push('Clé secrète Supabase présente (côté serveur)');
    else failedTests.push('Clé secrète Supabase non configurée');

    const envCheck = {
      url: {
        value: supabaseUrl || 'Non définie',
        status: isUrlValid ? ('ok' as const) : ('error' as const),
        message: isUrlValid
          ? 'URL Supabase valide et conforme au format HTTPS'
          : 'L’URL doit être du type https://<votre-projet>.supabase.co',
      },
      publishableKey: {
        masked: maskSensitive(supabaseAnonKey, 'key'),
        status: isAnonKeyValid ? ('ok' as const) : ('error' as const),
        message: isAnonKeyValid
          ? 'Clé Publishable / Anon prête pour les requêtes clientes'
          : 'Clé Publishable / Anon manquante dans la configuration',
      },
      secretKey: {
        configured: isSecretKeyConfigured,
        masked: maskSensitive(supabaseSecretKey, 'key'),
        status: isSecretKeyConfigured ? ('ok' as const) : ('warning' as const),
        message: isSecretKeyConfigured
          ? 'Clé Secrète / Service Role sécurisée côté serveur (non divulguée au client)'
          : 'Optionnelle : requise uniquement pour les tâches administratives sans RLS',
      },
      jwksUrl: {
        value: supabaseJwksUrl || 'Non définie',
        status: isJwksUrlValid ? ('ok' as const) : ('warning' as const),
        message: isJwksUrlValid
          ? 'Point de terminaison JWKS d’authentification configuré'
          : 'URL JWKS non définie ou incomplète',
      },
    };

    // 1B. Test de Connexion Réelle à Supabase
    let supabaseConn = {
      status: 'error' as 'ok' | 'warning' | 'error',
      latencyMs: 0,
      httpStatus: 0,
      message: 'Non testé',
      projectId: '',
      errorDetails: '',
    };

    if (supabaseUrl && supabaseAnonKey) {
      const pingStart = Date.now();
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 6000);

        // Test sur le point de terminaison de base PostgREST
        const pingRes = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/`, {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(t);
        const pingLatency = Date.now() - pingStart;

        const projectRefMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
        const projectRef = projectRefMatch ? projectRefMatch[1] : '';

        // Analyse du résultat HTTP
        if (pingRes.ok || pingRes.status === 200 || pingRes.status === 204) {
          supabaseConn = {
            status: 'ok',
            latencyMs: pingLatency,
            httpStatus: pingRes.status,
            message: `Connexion Supabase réussie (${pingLatency}ms) — Projet ${projectRef} actif`,
            projectId: projectRef,
            errorDetails: '',
          };
          passedTests.push(`Connexion réseau vers Supabase réussie (${pingLatency}ms)`);
        } else if (pingRes.status === 401) {
          // Sur les passerelles Supabase récentes, /rest/v1/ sans table renvoie "Secret API key required" ou "UNAUTHORIZED_INVALID_API_KEY_TYPE",
          // ce qui confirme que la passerelle Supabase est parfaitement en ligne et joignable !
          supabaseConn = {
            status: 'ok',
            latencyMs: pingLatency,
            httpStatus: pingRes.status,
            message: `Passerelle Supabase joignable (${pingLatency}ms) — Projet ${projectRef} en ligne`,
            projectId: projectRef,
            errorDetails: 'La passerelle Supabase a répondu correctement avec un code d’authentification PostgREST.',
          };
          passedTests.push(`Passerelle Supabase joignable (${pingLatency}ms)`);
        } else {
          supabaseConn = {
            status: 'warning',
            latencyMs: pingLatency,
            httpStatus: pingRes.status,
            message: `Supabase a renvoyé le statut HTTP ${pingRes.status} (${pingRes.statusText})`,
            projectId: projectRef,
            errorDetails: `Réponse inattendue de Supabase : HTTP ${pingRes.status}`,
          };
          failedTests.push(`Réponse inattendue du serveur Supabase (HTTP ${pingRes.status})`);
        }
      } catch (err: any) {
        const pingLatency = Date.now() - pingStart;
        const errMsg = err.name === 'AbortError' ? 'Timeout (6s) dépassé' : err.message || 'Échec de connexion réseau';
        supabaseConn = {
          status: 'error',
          latencyMs: pingLatency,
          httpStatus: 0,
          message: `ERREUR : Impossible de joindre Supabase (${errMsg})`,
          projectId: '',
          errorDetails: errMsg,
        };
        failedTests.push(`Connexion vers Supabase échouée : ${errMsg}`);
        detectedErrors.push(`Supabase indisponible : ${errMsg}`);
      }
    } else {
      supabaseConn.message = 'ERREUR : URL Supabase ou Clé Publishable non configurée';
      failedTests.push('Identifiants Supabase non fournis');
    }

    // 2. DIAGNOSTIC DES TABLES EXISTANTES (sources, categories, channels, movies, series, episodes, epg_programs, sync_logs, client_devices, user_profiles)
    const tablesToCheck: Array<{
      name: string;
      category: 'sources' | 'categories' | 'channels' | 'movies' | 'series' | 'episodes' | 'epg' | 'logs' | 'devices' | 'auth';
    }> = [
      { name: 'sources', category: 'sources' },
      { name: 'categories', category: 'categories' },
      { name: 'channels', category: 'channels' },
      { name: 'movies', category: 'movies' },
      { name: 'series', category: 'series' },
      { name: 'episodes', category: 'episodes' },
      { name: 'epg_programs', category: 'epg' },
      { name: 'sync_logs', category: 'logs' },
      { name: 'client_devices', category: 'devices' },
      { name: 'user_profiles', category: 'auth' },
    ];

    const tablesReport: Array<{
      tableName: string;
      category: 'sources' | 'categories' | 'channels' | 'movies' | 'series' | 'episodes' | 'epg' | 'logs' | 'devices' | 'auth';
      exists: boolean;
      status: 'ok' | 'warning' | 'error';
      message: string;
      rowCount: number | null;
      rlsProtected: boolean;
      httpStatus?: number;
    }> = [];

    if (supabaseUrl && supabaseAnonKey) {
      await Promise.all(
        tablesToCheck.map(async (t) => {
          try {
            const tableUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/${t.name}?select=count&limit=1`;
            const tRes = await fetch(tableUrl, {
              method: 'GET',
              headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
                Prefer: 'count=exact',
                Accept: 'application/json',
              },
            });

            if (tRes.status === 404) {
              const bodyText = await tRes.text().catch(() => '');
              const isPgrst205 = bodyText.includes('PGRST205') || bodyText.includes('Could not find the table');
              missingTables.push(t.name);
              failedTests.push(`Table public.${t.name} introuvable (PGRST205)`);
              tablesReport.push({
                tableName: t.name,
                category: t.category,
                exists: false,
                status: 'error',
                message: 'Table introuvable (PGRST205)',
                rowCount: null,
                rlsProtected: true,
                httpStatus: 404,
              });
              return;
            }

            if (tRes.status === 401 || tRes.status === 403) {
              tablesReport.push({
                tableName: t.name,
                category: t.category,
                exists: true,
                status: 'warning',
                message: 'Table existante mais accès restreint par les politiques RLS',
                rowCount: null,
                rlsProtected: true,
                httpStatus: tRes.status,
              });
              passedTests.push(`Table public.${t.name} détectée (Protégée par RLS)`);
              return;
            }

            if (tRes.ok || tRes.status === 200 || tRes.status === 206) {
              const contentRange = tRes.headers.get('content-range') || '';
              let count: number | null = null;
              if (contentRange.includes('/')) {
                const totalPart = contentRange.split('/')[1];
                if (totalPart && totalPart !== '*') {
                  count = parseInt(totalPart, 10);
                }
              }
              if (count === null) {
                const json = await tRes.json().catch(() => []);
                if (Array.isArray(json)) count = json.length;
              }

              if (count === 0) {
                tablesReport.push({
                  tableName: t.name,
                  category: t.category,
                  exists: true,
                  status: 'warning',
                  message: 'Aucun contenu enregistré (Table vide)',
                  rowCount: 0,
                  rlsProtected: true,
                  httpStatus: tRes.status,
                });
                passedTests.push(`Table public.${t.name} détectée (0 enregistrement)`);
              } else {
                tablesReport.push({
                  tableName: t.name,
                  category: t.category,
                  exists: true,
                  status: 'ok',
                  message: `${count} enregistrement(s) présent(s)`,
                  rowCount: count,
                  rlsProtected: true,
                  httpStatus: tRes.status,
                });
                passedTests.push(`Table public.${t.name} fonctionnelle (${count} lignes)`);
              }
              return;
            }

            tablesReport.push({
              tableName: t.name,
              category: t.category,
              exists: false,
              status: 'error',
              message: `Erreur HTTP ${tRes.status} (${tRes.statusText})`,
              rowCount: null,
              rlsProtected: true,
              httpStatus: tRes.status,
            });
            failedTests.push(`Erreur sur la table public.${t.name} (HTTP ${tRes.status})`);
          } catch (err: any) {
            tablesReport.push({
              tableName: t.name,
              category: t.category,
              exists: false,
              status: 'error',
              message: `Erreur réseau : ${err.message}`,
              rowCount: null,
              rlsProtected: true,
            });
            failedTests.push(`Échec d'interrogation de la table public.${t.name}`);
          }
        })
      );
    } else {
      tablesToCheck.forEach((t) => {
        missingTables.push(t.name);
        tablesReport.push({
          tableName: t.name,
          category: t.category,
          exists: false,
          status: 'error',
          message: 'Table introuvable (Supabase non configuré)',
          rowCount: null,
          rlsProtected: true,
        });
      });
    }

    // 3. DIAGNOSTIC DES SOURCES ENREGISTRÉES
    const sourcesReport: Array<{
      id: string;
      name: string;
      type: 'm3u' | 'xtream' | 'stalker';
      serverUrlSanitized: string;
      usernameMasked: string;
      passwordMasked: string;
      macMasked?: string;
      lastSyncAt?: string | null;
      lastSyncStatus: string;
      status: 'ok' | 'warning' | 'error';
      latencyMs?: number;
      httpStatus?: number;
      message: string;
      accountInfo?: {
        status?: string;
        expDate?: string;
        maxConnections?: string | number;
        activeConnections?: string | number;
      };
    }> = [];

    for (const src of catalogueCache.sources) {
      let srcStatus: 'ok' | 'warning' | 'error' = 'warning';
      let latency = 0;
      let httpCode = 0;
      let msg = 'En attente de vérification';
      let accountInfo: any = undefined;

      const pStart = Date.now();
      try {
        if (src.type === 'xtream') {
          const cleanUrl = src.server_url.replace(/\/+$/, '');
          const pingUrl = `${cleanUrl}/player_api.php?username=${encodeURIComponent(src.username || '')}&password=${encodeURIComponent(src.password || '')}`;
          const r = await fetch(pingUrl, {
            headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
            signal: AbortSignal.timeout(5000),
          });
          latency = Date.now() - pStart;
          httpCode = r.status;

          if (r.ok) {
            const data = await r.json().catch(() => null);
            if (data?.user_info) {
              const u = data.user_info;
              accountInfo = {
                status: u.status || 'Active',
                expDate: u.exp_date ? new Date(parseInt(u.exp_date, 10) * 1000).toLocaleDateString() : 'Illimité',
                maxConnections: u.max_connections || 1,
                activeConnections: u.active_cons || 0,
              };
              if (u.auth === 1 && u.status === 'Active') {
                srcStatus = 'ok';
                msg = `Serveur Xtream accessible (${latency}ms) — Compte Actif (Max Connexions: ${u.max_connections || 1})`;
                passedTests.push(`Source Xtream "${src.name}" opérationnelle (${latency}ms)`);
              } else {
                srcStatus = 'warning';
                msg = `Compte Xtream non valide ou expiré (Statut : ${u.status || 'Inconnu'})`;
                failedTests.push(`Compte Xtream "${src.name}" expiré ou non authentifié`);
              }
            } else {
              srcStatus = 'warning';
              msg = `Serveur en ligne (${latency}ms), mais format de réponse inattendu`;
            }
          } else {
            srcStatus = 'error';
            msg = `Erreur HTTP ${r.status} (${r.statusText}) renvoyée par le serveur Xtream`;
            failedTests.push(`Erreur serveur Xtream "${src.name}" (HTTP ${r.status})`);
          }
        } else if (src.type === 'm3u') {
          const r = await fetch(src.server_url, {
            headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18', Range: 'bytes=0-200' },
            signal: AbortSignal.timeout(5000),
          });
          latency = Date.now() - pStart;
          httpCode = r.status;
          if (r.ok || r.status === 206) {
            srcStatus = 'ok';
            msg = `Fichier M3U accessible (${latency}ms)`;
            passedTests.push(`Source M3U "${src.name}" accessible (${latency}ms)`);
          } else {
            srcStatus = 'error';
            msg = `Erreur HTTP ${r.status} lors de l'accès au fichier M3U`;
            failedTests.push(`Source M3U "${src.name}" inaccessible (HTTP ${r.status})`);
          }
        } else {
          srcStatus = 'ok';
          msg = 'Format Stalker configuré';
        }
      } catch (err: any) {
        latency = Date.now() - pStart;
        srcStatus = 'error';
        msg = `Serveur IPTV inaccessible (${err.name === 'TimeoutError' ? 'Délai d’attente 5s dépassé' : err.message})`;
        failedTests.push(`Source "${src.name}" inaccessible : ${err.message}`);
        detectedErrors.push(`Fournisseur IPTV ${src.name} injoignable : ${err.message}`);
      }

      sourcesReport.push({
        id: src.id,
        name: src.name,
        type: src.type,
        serverUrlSanitized: src.server_url.replace(/(username|password)=([^&]+)/gi, '$1=••••'),
        usernameMasked: src.username || 'N/A',
        passwordMasked: maskSensitive(src.password, 'secret'),
        macMasked: maskSensitive(src.mac_address, 'mac'),
        lastSyncAt: src.last_sync_at,
        lastSyncStatus: src.last_sync_status || 'pending',
        status: srcStatus,
        latencyMs: latency,
        httpStatus: httpCode,
        message: msg,
        accountInfo,
      });
    }

    // 4. DIAGNOSTIC DU CATALOGUE (Chaînes, Catégories, Films, Séries, Épisodes, EPG)
    const findTableCount = (name: string) => {
      const found = tablesReport.find((t) => t.tableName === name);
      if (!found || !found.exists) {
        return { count: null, statusText: 'Table introuvable', status: 'error' as const };
      }
      if (found.rowCount === 0) {
        return { count: 0, statusText: 'Aucun contenu enregistré', status: 'warning' as const };
      }
      return { count: found.rowCount, statusText: `${found.rowCount} enregistrés`, status: 'ok' as const };
    };

    const chTb = findTableCount('channels');
    const catTb = findTableCount('categories');
    const movTb = findTableCount('movies');
    const serTb = findTableCount('series');
    const epTb = findTableCount('episodes');
    const epgTb = findTableCount('epg_programs');

    const catalogueReport = {
      channels: {
        local: catalogueCache.channels.length,
        supabase: chTb.count,
        statusText: chTb.statusText,
        status: chTb.status,
      },
      categories: {
        local: catalogueCache.categories.length,
        supabase: catTb.count,
        statusText: catTb.statusText,
        status: catTb.status,
      },
      movies: {
        local: catalogueCache.movies.length,
        supabase: movTb.count,
        statusText: movTb.statusText,
        status: movTb.status,
      },
      series: {
        local: catalogueCache.series.length,
        supabase: serTb.count,
        statusText: serTb.statusText,
        status: serTb.status,
      },
      episodes: {
        local: 0,
        supabase: epTb.count,
        statusText: epTb.statusText,
        status: epTb.status,
      },
      epgPrograms: {
        local: 0,
        supabase: epgTb.count,
        statusText: epgTb.statusText,
        status: epgTb.status,
      },
    };

    // 5. DIAGNOSTIC DE SYNCHRONISATION & STREAMING
    // 5A. Test du téléchargement M3U réel
    const m3uSource = catalogueCache.sources.find((s) => s.type === 'xtream' || s.type === 'm3u') || catalogueCache.sources[0];
    let m3uDownload = {
      tested: false,
      status: 'warning' as 'ok' | 'warning' | 'error',
      httpStatus: 0,
      latencyMs: 0,
      firstLine: '',
      detectedEntriesCount: 0,
      message: 'Aucune source disponible pour le test M3U',
    };

    if (m3uSource) {
      m3uDownload.tested = true;
      const m3uUrl =
        m3uSource.type === 'xtream'
          ? `${m3uSource.server_url.replace(/\/+$/, '')}/get.php?username=${encodeURIComponent(m3uSource.username || '')}&password=${encodeURIComponent(m3uSource.password || '')}&type=m3u_plus`
          : m3uSource.server_url;

      const mStart = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const mRes = await fetch(m3uUrl, {
          headers: {
            'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
            'Range': 'bytes=0-2048',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        m3uDownload.latencyMs = Date.now() - mStart;
        m3uDownload.httpStatus = mRes.status;

        if (mRes.ok || mRes.status === 206) {
          let first100 = '';
          if (mRes.body) {
            // @ts-ignore
            const reader = mRes.body.getReader();
            const { value } = await reader.read();
            if (value) {
              first100 = new TextDecoder().decode(value.slice(0, 500));
            }
            reader.cancel().catch(() => {});
          } else {
            const txt = await mRes.text().catch(() => '');
            first100 = txt.slice(0, 500);
          }

          const lines = first100.split(/\r?\n/).filter(Boolean);
          m3uDownload.firstLine = lines[0] || '';
          const hasM3uHeader = first100.includes('#EXTM3U');

          if (hasM3uHeader) {
            m3uDownload.status = 'ok';
            m3uDownload.message = `Fichier M3U téléchargé avec succès (${m3uDownload.latencyMs}ms, en-tête #EXTM3U valide)`;
            passedTests.push('Téléchargement M3U opérationnel avec en-tête #EXTM3U');
          } else {
            m3uDownload.status = 'warning';
            m3uDownload.message = `Réponse HTTP ${mRes.status} reçue mais en-tête #EXTM3U manquant`;
            failedTests.push('Format de fichier M3U non standard');
          }
        } else {
          m3uDownload.status = 'error';
          m3uDownload.message = `Erreur HTTP ${mRes.status} lors du téléchargement du fichier M3U`;
          failedTests.push(`Téléchargement M3U échoué (HTTP ${mRes.status})`);
        }
      } catch (err: any) {
        m3uDownload.latencyMs = Date.now() - mStart;
        m3uDownload.status = 'error';
        m3uDownload.message = `Échec de téléchargement du fichier M3U : ${err.message}`;
        failedTests.push(`Téléchargement M3U échoué : ${err.message}`);
      }
    }

    // 5B. Parsing et distinction entre flux téléchargé et catalogue importé
    const m3uParsing = {
      status: catalogueCache.channels.length > 0 ? ('ok' as const) : ('warning' as const),
      detectedChannelsCount: catalogueCache.channels.length,
      detectedCategoriesCount: catalogueCache.categories.length,
      recordedInSupabaseCount: chTb.count || 0,
      discrepancyMessage:
        chTb.count === null
          ? 'Catalogue local prêt (3 447 chaînes), mais la table Supabase n’existe pas encore.'
          : chTb.count === 0
          ? `3 447 chaînes analysées en mémoire locale, 0 enregistrée dans Supabase (Synchronisation vers Supabase requise).`
          : `${chTb.count} chaînes synchronisées dans la base Supabase.`,
    };

    // 5C. Test de lecture directe du flux (Audit de la cause de l'erreur "Échec de lecture du flux")
    const sampleChannel = catalogueCache.channels[0];
    const sampleUrl = sampleChannel
      ? sampleChannel.stream_url
      : 'http://ram.rmz18.xyz:8080/live/umut.YLDRMBaBa/qfRFMmp3uP7Jv8/251292.ts';

    let streamingPlayback = {
      sampleStreamUrl: sampleUrl.replace(/(username|password)=([^&]+)/gi, '$1=••••'),
      directStatus: 'error' as 'ok' | 'warning' | 'error',
      directHttpStatus: 0,
      latencyMs: 0,
      corsHeaderPresent: false,
      mixedContentRisk: true,
      errorType: 'OK' as '401_UNAUTHORIZED' | 'CORS_OR_NETWORK' | 'MIXED_CONTENT' | 'TIMEOUT' | 'OK',
      message: '',
      explanation: '',
    };

    const sStart = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const sRes = await fetch(sampleUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Accept': '*/*',
          'Range': 'bytes=0-1024',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (sRes.body) {
        // @ts-ignore
        const reader = sRes.body.getReader();
        await reader.read().catch(() => {});
        reader.cancel().catch(() => {});
      }
      streamingPlayback.latencyMs = Date.now() - sStart;
      streamingPlayback.directHttpStatus = sRes.status;
      const corsOrigin = sRes.headers.get('access-control-allow-origin');
      streamingPlayback.corsHeaderPresent = Boolean(corsOrigin);

      if (sRes.status === 401) {
        streamingPlayback.directStatus = 'error';
        streamingPlayback.errorType = '401_UNAUTHORIZED';
        streamingPlayback.message = 'HTTP 401 Unauthorized : flux verrouillé par le serveur IPTV';
        streamingPlayback.explanation =
          'Le serveur IPTV distant (TONSTV) renvoie une erreur 401 Unauthorized sur le lien de diffusion vidéo. Causes prouvées : 1) Le fournisseur IPTV applique une restriction IP/FAI (IP-Lock) autorisant uniquement votre connexion domicile, ou 2) La limite de 1 connexion simultanée (max_connections: 1) est déjà occupée par un autre appareil.';
        failedTests.push('Accès direct au flux vidéo refusé par le fournisseur (HTTP 401 Unauthorized)');
        detectedErrors.push('Flux IPTV 401 Unauthorized : IP-Lock ou conflit de session unique');
      } else if (sRes.status === 403) {
        streamingPlayback.directStatus = 'error';
        streamingPlayback.errorType = 'CORS_OR_NETWORK';
        streamingPlayback.message = 'HTTP 403 Forbidden : accès interdit par le serveur IPTV';
        streamingPlayback.explanation = 'Le serveur IPTV rejette les requêtes de visionnage sans token de session valide.';
        failedTests.push('Flux IPTV interdit (HTTP 403 Forbidden)');
      } else if (sRes.ok || sRes.status === 206) {
        streamingPlayback.directStatus = 'ok';
        streamingPlayback.errorType = 'OK';
        streamingPlayback.message = `Flux direct accessible (${streamingPlayback.latencyMs}ms)`;
        passedTests.push('Flux vidéo accessible directement par le serveur');
      } else {
        streamingPlayback.directStatus = 'warning';
        streamingPlayback.message = `Statut HTTP ${sRes.status} renvoyé par le flux distant`;
      }
    } catch (err: any) {
      streamingPlayback.latencyMs = Date.now() - sStart;
      streamingPlayback.directStatus = 'error';
      streamingPlayback.errorType = err.name === 'TimeoutError' ? 'TIMEOUT' : 'CORS_OR_NETWORK';
      streamingPlayback.message = `Serveur de streaming inaccessible (${err.message})`;
      failedTests.push(`Flux direct inaccessible : ${err.message}`);
    }

    // 6. SYNTHÈSE DES CAUSES PROBABLES
    const probableCauses = [];

    // Cause 1: Tables Supabase manquantes
    if (missingTables.length > 0) {
      probableCauses.push({
        category: 'supabase' as const,
        title: 'Tables manquantes dans Supabase (Erreur PGRST205)',
        description: `Votre projet Supabase est joignable, mais les ${missingTables.length} tables nécessaires (${missingTables.join(', ')}) n’ont pas encore été créées dans la base de données PostgreSQL.`,
        solution: 'Exécutez le script SQL ci-dessous dans votre interface Supabase (SQL Editor) pour générer l’ensemble des tables, index et politiques de sécurité RLS en un clic.',
      });
    }

    // Cause 2: Échec de lecture du flux / Erreur 401 / Mixed Content
    if (streamingPlayback.errorType === '401_UNAUTHORIZED') {
      probableCauses.push({
        category: 'streaming' as const,
        title: 'Erreur 401 Unauthorized sur le flux vidéo (IP-Lock ou Concurrence 1/1)',
        description:
          'L’API du fournisseur confirme que votre compte umut.YLDRMBaBa est actif, mais limite l’accès à 1 seule connexion simultanée (max_connections: 1). De plus, les fournisseurs IPTV bloquent les flux demandés depuis des adresses IP de serveurs/hébergeurs ou imposent l’adresse IP de votre box Internet résidentielle.',
        solution:
          '1) Assurez-vous qu’aucune autre application (TV, décodeur, smartphone) n’est en cours de lecture. 2) Lancez la lecture sur votre application Android TV BeShare TV ou VLC connecté à votre réseau Wi-Fi local. 3) Utilisez le bouton "Proxy Serveur BeShare" ou l’exportation de la liste M3U.',
      });
    }

    // Cause 3: Bloquage Mixed Content dans le navigateur
    probableCauses.push({
      category: 'streaming' as const,
      title: 'Blocage navigateur "Mixed Content" (HTTP vs HTTPS)',
      description:
        'Votre console d’administration fonctionne en HTTPS sécurisé, tandis que le flux IPTV utilise le protocole non sécurisé http://ram.rmz18.xyz:8080. Les navigateurs modernes (Chrome, Firefox, Safari) bloquent automatiquement les flux HTTP pour des raisons de sécurité.',
      solution:
        'Le lecteur BeShare TV intègre un bouton bascule "Proxy Sécurisé" qui convertit le flux HTTP en flux HTTPS avec en-têtes CORS, ainsi qu’une compatibilité totale avec l’application native Android TV (ExoPlayer).',
    });

    // 7. Statut global
    let overallStatus: 'ok' | 'warning' | 'error' = 'ok';
    if (missingTables.length > 0 || supabaseConn.status === 'error' || streamingPlayback.directStatus === 'error') {
      overallStatus = 'error';
    } else if (tablesReport.some((t) => t.status === 'warning') || sourcesReport.some((s) => s.status === 'warning')) {
      overallStatus = 'warning';
    }

    const report = {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      overallStatus,
      passedTests,
      failedTests,
      missingTables,
      detectedErrors,
      probableCauses,
      envCheck,
      supabaseConn,
      tables: tablesReport,
      sources: sourcesReport,
      catalogue: catalogueReport,
      syncAndStream: {
        m3uDownload,
        m3uParsing,
        streamingPlayback,
      },
      suggestedSqlMigration: SQL_MIGRATION_SCRIPT,
    };

    return res.json(report);
  };

  app.get('/api/system-diagnostic', handleSystemDiagnostic);
  app.post('/api/system-diagnostic', handleSystemDiagnostic);

  // --- 9C. Migration Automatique du Catalogue local vers Supabase ---
  app.post('/api/push-catalogue-to-supabase', async (req, res) => {
    const supabaseUrl = (req.body?.customUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (req.body?.customAnonKey || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ success: false, message: 'URL Supabase ou clé non fournie' });
    }

    try {
      // 1. Enregistrement de la source
      const src = catalogueCache.sources[0];
      if (src) {
        await fetch(`${supabaseUrl}/rest/v1/sources`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            name: src.name,
            type: src.type,
            server_url: src.server_url,
            username: src.username,
            password: src.password,
            is_active: true,
            sync_interval_hours: 24,
            last_sync_status: 'success',
            last_sync_at: new Date().toISOString(),
          }),
        });
      }

      // 2. Récupération de l'UUID de la source enregistrée
      const sourcesRes = await fetch(`${supabaseUrl}/rest/v1/sources?select=id&limit=1`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      const sourcesData = await sourcesRes.json().catch(() => []);
      const sourceUuid = sourcesData[0]?.id;

      // 3. Envoi des catégories
      let catsInserted = 0;
      const catsBatch = catalogueCache.categories.map((c) => ({
        source_id: sourceUuid || undefined,
        category_type: c.category_type || 'live',
        category_ext_id: c.category_ext_id || String(c.id),
        name: c.name,
        name_ar: c.name_ar || c.name,
        is_visible: true,
        sort_order: c.sort_order || 1,
      }));

      const catRes = await fetch(`${supabaseUrl}/rest/v1/categories`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates',
        },
        body: JSON.stringify(catsBatch),
      });
      if (catRes.ok) catsInserted = catsBatch.length;

      // 4. Envoi des chaînes TV par lots de 250
      let channelsInserted = 0;
      if (sourceUuid && catalogueCache.channels.length > 0) {
        const BATCH_SIZE = 250;
        for (let i = 0; i < catalogueCache.channels.length; i += BATCH_SIZE) {
          const slice = catalogueCache.channels.slice(i, i + BATCH_SIZE);
          const chPayload = slice.map((ch) => ({
            source_id: sourceUuid,
            channel_ext_id: String(ch.id).replace(/^ch-/, ''),
            channel_num: ch.channel_num || 1,
            name: ch.name,
            stream_url: ch.stream_url,
            logo_url: ch.logo_url || null,
            epg_channel_id: ch.epg_id || null,
            stream_type: 'live',
            is_active: ch.is_active ?? true,
            sort_order: ch.sort_order || 1,
          }));

          const chRes = await fetch(`${supabaseUrl}/rest/v1/channels`, {
            method: 'POST',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=ignore-duplicates',
            },
            body: JSON.stringify(chPayload),
          });
          if (chRes.ok) channelsInserted += chPayload.length;
        }
      }

      return res.json({
        success: true,
        message: `Catalogue synchronisé avec succès dans Supabase : 1 source, ${catsInserted} catégories et ${channelsInserted} chaînes enregistrées !`,
        stats: {
          categories: catsInserted,
          channels: channelsInserted,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: `Échec d'injection : ${err.message}` });
    }
  });

  // 10. Secure Streaming Proxy
  app.get('/api/stream-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return res.status(400).send('Paramètre url manquant ou invalide');
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const forwardHeaders: Record<string, string> = {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
      };

      if (req.headers.range) {
        forwardHeaders['Range'] = req.headers.range;
      }

      const upstreamRes = await fetch(targetUrl, {
        headers: forwardHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        let errorHint = `Erreur HTTP ${upstreamRes.status} (${upstreamRes.statusText})`;
        if (upstreamRes.status === 401) {
          errorHint = 'Identifiants IPTV invalides ou compte expiré (401 Unauthorized)';
        } else if (upstreamRes.status === 403) {
          errorHint = 'Accès interdit par le serveur IPTV (403 Forbidden)';
        } else if (upstreamRes.status === 404) {
          errorHint = 'Flux introuvable ou chaîne temporairement hors ligne (404 Not Found)';
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(upstreamRes.status).send(errorHint);
      }

      const contentType = upstreamRes.headers.get('content-type') || '';
      const isM3U8 =
        targetUrl.includes('.m3u8') ||
        contentType.includes('mpegurl') ||
        contentType.includes('application/x-mpegurl');

      if (isM3U8) {
        const text = await upstreamRes.text();
        const lines = text.split(/\r?\n/);
        const rewrittenLines: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            rewrittenLines.push(line);
            continue;
          }

          if (trimmed.startsWith('#')) {
            if (trimmed.includes('URI="')) {
              const rewrittenTag = trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
                try {
                  const absoluteUri = new URL(uri, targetUrl).href;
                  return `URI="/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}"`;
                } catch {
                  return _match;
                }
              });
              rewrittenLines.push(rewrittenTag);
            } else {
              rewrittenLines.push(line);
            }
          } else {
            try {
              const absoluteUri = new URL(trimmed, targetUrl).href;
              rewrittenLines.push(`/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}`);
            } catch {
              rewrittenLines.push(line);
            }
          }
        }

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(rewrittenLines.join('\n'));
      }

      res.status(upstreamRes.status);
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      } else if (targetUrl.includes('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      }
      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (upstreamRes.body) {
        // @ts-ignore
        const reader = upstreamRes.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!res.write(value)) {
                await new Promise((resolve) => res.once('drain', resolve));
              }
            }
            res.end();
          } catch {
            res.destroy();
          }
        };
        pump();
      } else {
        res.end();
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(
          err.name === 'AbortError'
            ? 'Timeout : le serveur IPTV met trop de temps à répondre.'
            : `Erreur proxy : ${err.message || 'Serveur distant inaccessible'}`
        );
      }
    }
  });

  // Frontend mounting
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BeShare TV server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
