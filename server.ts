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
