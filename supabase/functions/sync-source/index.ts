/**
 * BeShare TV — Edge Function Principale de Synchronisation
 * Chemin: /supabase/functions/sync-source/index.ts
 * 
 * Exécute la synchronisation sécurisée côté serveur d'une source autorisée
 * (M3U, Xtream Codes ou Stalker Portal) avec protection SSRF et zéro fuite de logs.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { safeFetch } from '../_shared/ssrf.ts';
import { sanitizeLogMessage } from '../_shared/sanitizer.ts';
import { parseM3UContent } from '../_shared/m3u_parser.ts';
import { XtreamClient } from '../_shared/xtream_client.ts';
import { StalkerClient } from '../_shared/stalker_client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Gestion de la négociation préalable CORS OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = performance.now();
  let sourceId: string | null = null;
  let sourceName: string = 'Source Inconnue';
  let logId: string | null = null;

  // Initialisation du client Supabase avec Service Role (Strictement réservé au serveur)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Configuration Supabase Service Role manquante sur le serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Vérification de l'authentification et des privilèges Admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'En-tête d’autorisation manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Jeton d’authentification invalide ou expiré' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérification du rôle admin dans public.user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || !profile.is_active) {
      return new Response(
        JSON.stringify({ error: 'Action réservée aux administrateurs autorisés' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extraction du payload de requête
    const body = await req.json();
    sourceId = body.source_id;

    if (!sourceId) {
      return new Response(
        JSON.stringify({ error: 'Paramètre source_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Récupération des informations confidentielles de la source depuis Supabase
    const { data: source, error: sourceErr } = await supabase
      .from('sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceErr || !source) {
      return new Response(
        JSON.stringify({ error: 'Source introuvable ou inexistante' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    sourceName = source.name;

    // 4. Création de l'entrée initiale de journalisation sync_logs
    const { data: logEntry } = await supabase
      .from('sync_logs')
      .insert({
        source_id: sourceId,
        source_name: sourceName,
        status: 'running',
        triggered_by: user.email || 'admin_manual',
      })
      .select('id')
      .single();

    if (logEntry) {
      logId = logEntry.id;
    }

    // Mise à jour de l'état de la source à "running"
    await supabase
      .from('sources')
      .update({ last_sync_status: 'running', last_error: null })
      .eq('id', sourceId);

    let totalChannels = 0;
    let totalMovies = 0;
    let totalSeries = 0;
    let totalEpisodes = 0;

    // ====================================================================
    // TRAITEMENT PAR TYPE DE SOURCE
    // ====================================================================

    if (source.type === 'm3u') {
      // --------------------------------------------------
      // A. SOURCE M3U / M3U8
      // --------------------------------------------------
      const response = await safeFetch(source.server_url, {
        timeoutMs: 30000,
        maxSizeBytes: 50 * 1024 * 1024,
      });

      if (!response.ok) {
        throw new Error(`Serveur M3U distant inaccessible (HTTP ${response.status})`);
      }

      const textContent = await response.text();
      const parsed = parseM3UContent(textContent);

      // Upsert des catégories
      const categoryRows = Array.from(parsed.categories.values()).map((c, idx) => ({
        source_id: sourceId,
        category_type: c.type,
        category_ext_id: c.extId,
        name: c.name,
        sort_order: idx + 1,
      }));

      if (categoryRows.length > 0) {
        await supabase
          .from('categories')
          .upsert(categoryRows, { onConflict: 'source_id,category_type,category_ext_id' });
      }

      // Récupération des IDs internes de catégories
      const { data: dbCategories } = await supabase
        .from('categories')
        .select('id, category_ext_id, category_type')
        .eq('source_id', sourceId);

      const categoryMap = new Map<string, string>();
      if (dbCategories) {
        for (const cat of dbCategories) {
          categoryMap.set(`${cat.category_type}_${cat.category_ext_id}`, cat.id);
        }
      }

      // Upsert des chaînes Live TV par lots de 250
      const channelRows = parsed.channels.map((ch, idx) => ({
        source_id: sourceId,
        category_id: categoryMap.get(`live_${ch.categoryExtId}`) || null,
        channel_ext_id: ch.extId,
        channel_num: ch.channelNum || idx + 1,
        name: ch.name,
        stream_url: ch.streamUrl,
        logo_url: ch.logoUrl || null,
        epg_channel_id: ch.epgChannelId || null,
        is_active: true,
      }));

      for (let i = 0; i < channelRows.length; i += 250) {
        const batch = channelRows.slice(i, i + 250);
        await supabase.from('channels').upsert(batch, { onConflict: 'source_id,channel_ext_id' });
      }
      totalChannels = channelRows.length;

      // Upsert des films VOD par lots de 250
      const movieRows = parsed.movies.map((m) => ({
        source_id: sourceId,
        category_id: categoryMap.get(`movie_${m.categoryExtId}`) || null,
        movie_ext_id: m.extId,
        title: m.title,
        stream_url: m.streamUrl,
        poster_url: m.posterUrl || null,
        is_active: true,
      }));

      for (let i = 0; i < movieRows.length; i += 250) {
        const batch = movieRows.slice(i, i + 250);
        await supabase.from('movies').upsert(batch, { onConflict: 'source_id,movie_ext_id' });
      }
      totalMovies = movieRows.length;

    } else if (source.type === 'xtream') {
      // --------------------------------------------------
      // B. SOURCE XTREAM CODES
      // --------------------------------------------------
      const client = new XtreamClient({
        serverUrl: source.server_url,
        username: source.username || '',
        password: source.password || '',
      });

      // Valider compte
      await client.authenticate();

      // Catégories Live
      const liveCats = await client.getCategories('live');
      const categoryRows = liveCats.map((c, idx) => ({
        source_id: sourceId,
        category_type: 'live',
        category_ext_id: String(c.category_id),
        name: c.category_name,
        sort_order: idx + 1,
      }));

      if (categoryRows.length > 0) {
        await supabase
          .from('categories')
          .upsert(categoryRows, { onConflict: 'source_id,category_type,category_ext_id' });
      }

      // Map des catégories créées
      const { data: dbCategories } = await supabase
        .from('categories')
        .select('id, category_ext_id')
        .eq('source_id', sourceId)
        .eq('category_type', 'live');

      const catMap = new Map<string, string>();
      if (dbCategories) {
        for (const c of dbCategories) {
          catMap.set(c.category_ext_id, c.id);
        }
      }

      // Récupération des flux live
      const liveStreams = await client.getLiveStreams();
      const channelRows = liveStreams.map((s) => ({
        source_id: sourceId,
        category_id: catMap.get(String(s.category_id)) || null,
        channel_ext_id: String(s.stream_id),
        channel_num: s.num || null,
        name: s.name,
        stream_url: client.buildLiveStreamUrl(s.stream_id, 'm3u8'),
        logo_url: s.stream_icon || null,
        epg_channel_id: s.epg_channel_id || null,
        is_active: true,
      }));

      for (let i = 0; i < channelRows.length; i += 250) {
        const batch = channelRows.slice(i, i + 250);
        await supabase.from('channels').upsert(batch, { onConflict: 'source_id,channel_ext_id' });
      }
      totalChannels = channelRows.length;

    } else if (source.type === 'stalker') {
      // --------------------------------------------------
      // C. SOURCE STALKER PORTAL (MINISTRA)
      // --------------------------------------------------
      if (!source.mac_address) {
        throw new Error('Adresse MAC manquante pour la source Stalker Portal');
      }

      const client = new StalkerClient({
        portalUrl: source.server_url,
        macAddress: source.mac_address,
      });

      // Handshake initial
      await client.handshake();

      // Genres
      const genres = await client.getGenres();
      const catRows = genres.map((g, idx) => ({
        source_id: sourceId,
        category_type: 'live',
        category_ext_id: String(g.id),
        name: g.title,
        sort_order: idx + 1,
      }));

      if (catRows.length > 0) {
        await supabase.from('categories').upsert(catRows, { onConflict: 'source_id,category_type,category_ext_id' });
      }

      const { data: dbCategories } = await supabase
        .from('categories')
        .select('id, category_ext_id')
        .eq('source_id', sourceId);

      const catMap = new Map<string, string>();
      if (dbCategories) {
        for (const c of dbCategories) {
          catMap.set(c.category_ext_id, c.id);
        }
      }

      // Canaux
      const channels = await client.getAllChannels();
      const channelRows = channels.map((ch) => ({
        source_id: sourceId,
        category_id: catMap.get(String(ch.tv_genre_id)) || null,
        channel_ext_id: String(ch.id),
        channel_num: ch.number ? parseInt(ch.number, 10) : null,
        name: ch.name,
        stream_url: ch.cmd, // URL Stalker protégée
        logo_url: ch.logo || null,
        epg_channel_id: ch.xmltv_id || null,
        is_active: true,
      }));

      for (let i = 0; i < channelRows.length; i += 250) {
        const batch = channelRows.slice(i, i + 250);
        await supabase.from('channels').upsert(batch, { onConflict: 'source_id,channel_ext_id' });
      }
      totalChannels = channelRows.length;
    }

    // 5. Finalisation en succès
    const durationMs = Math.round(performance.now() - startTime);

    await supabase
      .from('sources')
      .update({
        last_sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', sourceId);

    if (logId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'success',
          channels_count: totalChannels,
          movies_count: totalMovies,
          series_count: totalSeries,
          episodes_count: totalEpisodes,
          duration_ms: durationMs,
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        source_id: sourceId,
        source_name: sourceName,
        status: 'success',
        channels_count: totalChannels,
        movies_count: totalMovies,
        series_count: totalSeries,
        duration_ms: durationMs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const sanitizedError = sanitizeLogMessage(err.message || 'Erreur inconnue');

    // Mise à jour de la source en échec
    if (sourceId) {
      await supabase
        .from('sources')
        .update({
          last_sync_status: 'failed',
          last_error: sanitizedError,
        })
        .eq('id', sourceId);
    }

    // Mise à jour du journal d'erreur
    if (logId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          error_details: sanitizedError,
          duration_ms: durationMs,
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        source_id: sourceId,
        status: 'failed',
        error: sanitizedError,
        duration_ms: durationMs,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
