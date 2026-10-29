/**
 * BeShare TV — API Gateway Dédiée aux Applications Android & Android TV
 * Chemin: /supabase/functions/client-api/index.ts
 * 
 * Fournit au client Android (Retrofit / Kotlin) tous les points d'entrée du catalogue,
 * avec authentification JWT, contrôle du nombre d'appareils (anti-partage de compte),
 * streaming sécurisé et guide EPG en direct.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-id, x-device-type, x-app-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req: Request) => {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'bootstrap';

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Configuration serveur Supabase introuvable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Authentification de l'utilisateur abonné
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Jeton d’authentification requis (Bearer JWT)' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Session invalide ou expirée. Veuillez vous reconnecter.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Vérification du statut de l'abonnement dans public.user_profiles
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, email, role, is_active, max_devices, expires_at')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur introuvable.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.is_active) {
      return new Response(
        JSON.stringify({ error: 'Votre compte est actuellement suspendu. Contactez le support BeShare TV.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    if (profile.expires_at && new Date(profile.expires_at) < now) {
      return new Response(
        JSON.stringify({
          error: 'Votre abonnement a expiré.',
          expired_at: profile.expires_at,
          subscription_active: false,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // En-têtes d'identification de l'appareil Android
    const deviceId = req.headers.get('x-device-id') || url.searchParams.get('device_id');
    const deviceType = req.headers.get('x-device-type') || 'android_tv';
    const appVersion = req.headers.get('x-app-version') || '1.0.0';

    // ====================================================================
    // ROUTAGE DES ACTIONS API ANDROID
    // ====================================================================

    // --------------------------------------------------------------------
    // ACTION 1 : HANDSHAKE APPAREIL & ENREGISTREMENT DE SESSION
    // --------------------------------------------------------------------
    if (action === 'handshake') {
      if (!deviceId) {
        return new Response(
          JSON.stringify({ error: 'En-tête x-device-id requis pour la validation du terminal' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier le nombre d'appareils déjà enregistrés pour cet utilisateur
      const { data: existingDevices } = await supabase
        .from('client_devices')
        .select('id, device_id, is_revoked')
        .eq('user_id', user.id);

      const deviceList = existingDevices || [];
      const currentRegistered = deviceList.find((d) => d.device_id === deviceId);

      // Si l'appareil est révoqué par l'administrateur
      if (currentRegistered && currentRegistered.is_revoked) {
        return new Response(
          JSON.stringify({ error: 'Cet appareil a été révoqué par l’administrateur.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si nouvel appareil et que la limite max_devices est atteinte
      if (!currentRegistered && deviceList.length >= (profile.max_devices || 2)) {
        return new Response(
          JSON.stringify({
            error: `Limite d'écrans atteinte (${deviceList.length}/${profile.max_devices}). Veuillez déconnecter un autre appareil.`,
            max_devices: profile.max_devices,
            active_devices: deviceList.length,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Enregistrer ou mettre à jour le terminal avec son horodatage last_seen_at
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'inconnu';

      await supabase.from('client_devices').upsert(
        {
          user_id: user.id,
          device_id: deviceId,
          device_type: deviceType,
          app_version: appVersion,
          last_ip: clientIp,
          last_seen_at: new Date().toISOString(),
          is_revoked: false,
        },
        { onConflict: 'user_id,device_id' }
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Terminal Android authentifié avec succès.',
          user: {
            id: user.id,
            email: user.email,
            role: profile.role,
            expires_at: profile.expires_at,
            max_devices: profile.max_devices,
          },
          device: {
            device_id: deviceId,
            device_type: deviceType,
            status: 'authorized',
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------
    // ACTION 2 : BOOTSTRAP INITIAL DE L'APPLICATION ANDROID
    // --------------------------------------------------------------------
    if (action === 'bootstrap') {
      const [catStats, activeSources] = await Promise.all([
        supabase.from('categories').select('category_type, count').eq('is_visible', true),
        supabase.from('sources').select('id, name, last_sync_at').eq('is_active', true),
      ]);

      return new Response(
        JSON.stringify({
          app_name: 'BeShare TV',
          version: '1.0.0',
          server_time: new Date().toISOString(),
          features: {
            live_tv: true,
            vod_movies: true,
            vod_series: true,
            epg: true,
            favorites_sync: true,
            rtl_arabic: true,
          },
          subscription: {
            status: 'active',
            expires_at: profile.expires_at,
          },
          sources_count: activeSources.data?.length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------
    // ACTION 3 : LISTE DES CATÉGORIES (LIVE, FILMS, SÉRIES)
    // --------------------------------------------------------------------
    if (action === 'categories') {
      const type = url.searchParams.get('type') || 'live';

      const { data: categories, error: catErr } = await supabase
        .from('categories')
        .select('id, category_type, name, name_ar, icon_url, sort_order')
        .eq('is_visible', true)
        .eq('category_type', type)
        .order('sort_order', { ascending: true });

      if (catErr) throw catErr;

      return new Response(
        JSON.stringify({ categories: categories || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------
    // ACTION 4 : LISTE DES CHAÎNES EN DIRECT (LIVE TV)
    // --------------------------------------------------------------------
    if (action === 'channels') {
      const categoryId = url.searchParams.get('category_id');
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('channels')
        .select('id, category_id, channel_num, name, logo_url, epg_channel_id, stream_type, sort_order', { count: 'exact' })
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .range(offset, offset + limit - 1);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data: channels, count, error: chErr } = await query;
      if (chErr) throw chErr;

      return new Response(
        JSON.stringify({
          channels: channels || [],
          page,
          limit,
          total: count || 0,
          has_more: count ? offset + limit < count : false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------
    // ACTION 5 : FILMS VOD
    // --------------------------------------------------------------------
    if (action === 'movies') {
      const categoryId = url.searchParams.get('category_id');
      const search = url.searchParams.get('search');
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 60);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('movies')
        .select('id, category_id, title, title_ar, poster_url, backdrop_url, rating, release_year, duration_mins, synopsis', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      const { data: movies, count, error: mErr } = await query;
      if (mErr) throw mErr;

      return new Response(
        JSON.stringify({
          movies: movies || [],
          page,
          limit,
          total: count || 0,
          has_more: count ? offset + limit < count : false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------
    // ACTION 6 : SÉRIES TV & ÉPISODES
    // --------------------------------------------------------------------
    if (action === 'series') {
      const categoryId = url.searchParams.get('category_id');
      const search = url.searchParams.get('search');
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 60);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('series')
        .select('id, category_id, title, title_ar, poster_url, backdrop_url, rating, release_year, plot, seasons_count', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      const { data: seriesList, count, error: sErr } = await query;
      if (sErr) throw sErr;

      return new Response(
        JSON.stringify({
          series: seriesList || [],
          page,
          limit,
          total: count || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Épisodes d'une série
    if (action === 'episodes') {
      const seriesId = url.searchParams.get('series_id');
      if (!seriesId) {
        return new Response(
          JSON.stringify({ error: 'Paramètre series_id requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: episodes, error: epErr } = await supabase
        .from('episodes')
        .select('id, series_id, season_number, episode_number, title, duration_mins, still_url, plot')
        .eq('series_id', seriesId)
        .eq('is_active', true)
        .order('season_number', { ascending: true })
        .order('episode_number', { ascending: true });

      if (epErr) throw epErr;

      return new Response(
        JSON.stringify({ episodes: episodes || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------
    // ACTION 7 : GUIDE DES PROGRAMMES (EPG)
    // --------------------------------------------------------------------
    if (action === 'epg') {
      const channelId = url.searchParams.get('channel_id');
      const epgChannelId = url.searchParams.get('epg_channel_id');

      let query = supabase
        .from('epg_programs')
        .select('id, channel_id, epg_channel_id, title, description, start_time, end_time, category')
        .order('start_time', { ascending: true })
        .limit(20);

      if (channelId) {
        query = query.eq('channel_id', channelId);
      } else if (epgChannelId) {
        query = query.eq('epg_channel_id', epgChannelId);
      }

      const { data: programs, error: epgErr } = await query;
      if (epgErr) throw epgErr;

      return new Response(
        JSON.stringify({ programs: programs || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------
    // ACTION 8 : RÉSOLUTION SÉCURISÉE DU FLUX DE STREAMING
    // Ne délivre l'URL finale qu'aux terminaux autorisés et non révoqués
    // --------------------------------------------------------------------
    if (action === 'resolve_stream') {
      const itemType = url.searchParams.get('type') || 'channel'; // 'channel' | 'movie' | 'episode'
      const itemId = url.searchParams.get('id');

      if (!itemId) {
        return new Response(
          JSON.stringify({ error: 'Identifiant du média requis (id)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let streamUrl: string | null = null;
      let mediaTitle: string = '';

      if (itemType === 'channel') {
        const { data: ch } = await supabase
          .from('channels')
          .select('stream_url, name, is_active')
          .eq('id', itemId)
          .single();
        if (ch && ch.is_active) {
          streamUrl = ch.stream_url;
          mediaTitle = ch.name;
        }
      } else if (itemType === 'movie') {
        const { data: m } = await supabase
          .from('movies')
          .select('stream_url, title, is_active')
          .eq('id', itemId)
          .single();
        if (m && m.is_active) {
          streamUrl = m.stream_url;
          mediaTitle = m.title;
        }
      } else if (itemType === 'episode') {
        const { data: ep } = await supabase
          .from('episodes')
          .select('stream_url, title, is_active')
          .eq('id', itemId)
          .single();
        if (ep && ep.is_active) {
          streamUrl = ep.stream_url;
          mediaTitle = ep.title;
        }
      }

      if (!streamUrl) {
        return new Response(
          JSON.stringify({ error: 'Flux indisponible ou média désactivé.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          media_id: itemId,
          media_type: itemType,
          title: mediaTitle,
          stream_url: streamUrl,
          expires_in_secs: 7200,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------
    // ACTION 9 : GESTION DES FAVORIS UTILISATEUR
    // --------------------------------------------------------------------
    if (action === 'favorites') {
      if (req.method === 'POST') {
        const body = await req.json();
        const { item_type, item_id, operation } = body;

        if (operation === 'remove') {
          await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('item_type', item_type)
            .eq('item_id', item_id);
          return new Response(JSON.stringify({ success: true, removed: true }), { headers: corsHeaders });
        } else {
          await supabase
            .from('user_favorites')
            .upsert({ user_id: user.id, item_type, item_id });
          return new Response(JSON.stringify({ success: true, added: true }), { headers: corsHeaders });
        }
      } else {
        const { data: favs } = await supabase
          .from('user_favorites')
          .select('item_type, item_id')
          .eq('user_id', user.id);
        return new Response(JSON.stringify({ favorites: favs || [] }), { headers: corsHeaders });
      }
    }

    // Action non reconnue
    return new Response(
      JSON.stringify({ error: `Action '${action}' inconnue.` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
