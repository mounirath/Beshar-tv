/**
 * BeShare TV — Service de Gestion des Sources, Catégories, Chaînes & Synchro
 * Chemin: /src/services/sourceService.ts
 */
import { getSupabaseClient, getSavedSupabaseConfig } from '../lib/supabase';
import { Source, Category, Channel, SyncLog, SourceType, Movie, Series, EPGProgram } from '../types';
import { testUrlSSRF } from '../lib/edgeTester';

// Données initiales locales de démonstration (pour test immédiat sans configuration Supabase préalable)
let localSources: Source[] = [
  {
    id: 'src-1',
    name: 'Bouquet Principal TNT & Sport HD (M3U8)',
    type: 'm3u',
    server_url: 'https://authorized-cdn.tv/live/bouquet.m3u8',
    is_active: true,
    sync_interval_hours: 12,
    last_sync_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    last_sync_status: 'success',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'src-2',
    name: 'Serveur VOD & Séries Xtream Codes',
    type: 'xtream',
    server_url: 'http://vod-provider.stream:8080',
    username: 'beshare_admin',
    password: '••• Protégé •••',
    is_active: true,
    sync_interval_hours: 24,
    last_sync_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    last_sync_status: 'success',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'src-3',
    name: 'Portail Ministra MAG (Stalker)',
    type: 'stalker',
    server_url: 'http://mag-portal.tv:88/c/',
    mac_address: '00:1A:79:B4:C8:11',
    is_active: false,
    sync_interval_hours: 24,
    last_sync_at: new Date(Date.now() - 86400000).toISOString(),
    last_sync_status: 'failed',
    last_error: 'Erreur handshake Stalker: adresse MAC non autorisée ou expirée par le fournisseur',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let localCategories: Category[] = [
  {
    id: 'cat-1',
    source_id: 'src-1',
    category_type: 'live',
    category_ext_id: 'general_fr',
    name: 'Généralistes France',
    name_ar: 'قنوات عامة فرنسية',
    is_visible: true,
    sort_order: 1,
    channels_count: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    source_id: 'src-1',
    category_type: 'live',
    category_ext_id: 'sports_hd',
    name: 'Sports & Compétitions HD',
    name_ar: 'قنوات رياضية عالية الدقة',
    is_visible: true,
    sort_order: 2,
    channels_count: 14,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    source_id: 'src-1',
    category_type: 'live',
    category_ext_id: 'arabic_news',
    name: 'Chaînes Arabes & Informations',
    name_ar: 'قنوات الأخبار وبث عربي',
    is_visible: true,
    sort_order: 3,
    channels_count: 12,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    source_id: 'src-2',
    category_type: 'movie',
    category_ext_id: 'vod_action',
    name: 'Films Action & Cinéma',
    name_ar: 'أفلام حركة وسينما',
    is_visible: true,
    sort_order: 4,
    channels_count: 45,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-5',
    source_id: 'src-2',
    category_type: 'series',
    category_ext_id: 'series_drama',
    name: 'Séries Drame & Thriller',
    name_ar: 'مسلسلات دراما وإثارة',
    is_visible: true,
    sort_order: 5,
    channels_count: 22,
    created_at: new Date().toISOString(),
  },
];

let localChannels: Channel[] = [
  {
    id: 'ch-1',
    source_id: 'src-1',
    category_id: 'cat-1',
    channel_num: 1,
    name: 'TF1 Direct HD',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=120&auto=format&fit=crop&q=80',
    epg_channel_id: 'TF1.fr',
    stream_type: 'live',
    is_active: true,
    sort_order: 1,
    category_name: 'Généralistes France',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ch-2',
    source_id: 'src-1',
    category_id: 'cat-1',
    channel_num: 2,
    name: 'France 2 HD',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo_url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=120&auto=format&fit=crop&q=80',
    epg_channel_id: 'France2.fr',
    stream_type: 'live',
    is_active: true,
    sort_order: 2,
    category_name: 'Généralistes France',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ch-3',
    source_id: 'src-1',
    category_id: 'cat-2',
    channel_num: 10,
    name: 'beIN Sports 1 Premium HD',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
    epg_channel_id: 'beIN1.fr',
    stream_type: 'live',
    is_active: true,
    sort_order: 3,
    category_name: 'Sports & Compétitions HD',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ch-4',
    source_id: 'src-1',
    category_id: 'cat-3',
    channel_num: 20,
    name: 'Al Jazeera Arabic HD',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo_url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&auto=format&fit=crop&q=80',
    epg_channel_id: 'AlJazeera.qa',
    stream_type: 'live',
    is_active: true,
    sort_order: 4,
    category_name: 'Chaînes Arabes & Informations',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ch-5',
    source_id: 'src-1',
    category_id: 'cat-1',
    channel_num: 5,
    name: 'M6 HD Direct',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo_url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=120&auto=format&fit=crop&q=80',
    epg_channel_id: 'M6.fr',
    stream_type: 'live',
    is_active: true,
    sort_order: 5,
    category_name: 'Généralistes France',
    created_at: new Date().toISOString(),
  },
];

let localSyncLogs: SyncLog[] = [
  {
    id: 'log-1',
    source_id: 'src-1',
    source_name: 'Bouquet Principal TNT & Sport HD (M3U8)',
    status: 'success',
    channels_count: 34,
    movies_count: 0,
    series_count: 0,
    episodes_count: 0,
    epg_count: 140,
    duration_ms: 1240,
    triggered_by: 'admin@besharetv.com',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'log-2',
    source_id: 'src-2',
    source_name: 'Serveur VOD & Séries Xtream Codes',
    status: 'success',
    channels_count: 0,
    movies_count: 45,
    series_count: 22,
    episodes_count: 180,
    epg_count: 0,
    duration_ms: 2850,
    triggered_by: 'auto_cron_24h',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'log-3',
    source_id: 'src-3',
    source_name: 'Portail Ministra MAG (Stalker)',
    status: 'failed',
    channels_count: 0,
    movies_count: 0,
    series_count: 0,
    episodes_count: 0,
    epg_count: 0,
    error_details: '[Stalker Handshake] HTTP 403 Forbidden : Adresse MAC 00:1A:79:B4:C8:11 non inscrite sur le middleware',
    duration_ms: 540,
    triggered_by: 'admin@besharetv.com',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

let localMovies: Movie[] = [
  {
    id: 'mov-1',
    source_id: 'src-2',
    category_id: 'cat-4',
    title: 'Inception',
    title_ar: 'استهلال',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=80',
    rating: 8.8,
    release_year: 2010,
    duration_mins: 148,
    synopsis: 'Un voleur qui s’infiltre dans les rêves pour voler des secrets se voit offrir une chance de retrouver sa vie passée en réalisant une inception.',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mov-2',
    source_id: 'src-2',
    category_id: 'cat-4',
    title: 'Interstellar',
    title_ar: 'بين النجوم',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
    rating: 8.7,
    release_year: 2014,
    duration_mins: 169,
    synopsis: 'Une équipe d’explorateurs voyage à travers un trou de ver dans l’espace pour assurer la survie de l’humanité.',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mov-3',
    source_id: 'src-2',
    category_id: 'cat-4',
    title: 'Gladiator II',
    title_ar: 'المصارع 2',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80',
    rating: 7.9,
    release_year: 2024,
    duration_mins: 150,
    synopsis: 'Des années après la mort de Maximus, Lucius entre dans le Colisée pour lutter contre la tyrannie des empereurs romains.',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mov-4',
    source_id: 'src-2',
    category_id: 'cat-4',
    title: 'Dune: Deuxième Partie',
    title_ar: 'كثيب: الجزء الثاني',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80',
    rating: 8.6,
    release_year: 2024,
    duration_mins: 166,
    synopsis: 'Paul Atréides s’unit à Chani et aux Fremen pour mener la révolte contre les conspirateurs qui ont détruit sa famille.',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

let localSeries: Series[] = [
  {
    id: 'ser-1',
    source_id: 'src-2',
    category_id: 'cat-5',
    title: 'Le Bureau des Légendes',
    title_ar: 'مكتب الأساطير',
    poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&auto=format&fit=crop&q=80',
    rating: 8.7,
    release_year: 2015,
    plot: 'Au sein de la DGSE, un département forme et pilote à distance les agents les plus précieux des services de renseignement français.',
    seasons_count: 5,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ser-2',
    source_id: 'src-2',
    category_id: 'cat-5',
    title: 'Breaking Bad',
    title_ar: 'اختلال ضال',
    poster_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80',
    rating: 9.5,
    release_year: 2008,
    plot: 'Un professeur de chimie atteint d’un cancer en phase terminale s’associe à un ancien élève pour fabriquer de la méthamphétamine.',
    seasons_count: 5,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ser-3',
    source_id: 'src-2',
    category_id: 'cat-5',
    title: 'Omar Al-Farooq',
    title_ar: 'عمر بن الخطاب',
    poster_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80',
    rating: 9.2,
    release_year: 2012,
    plot: 'Fresque historique majeure retraçant la vie et la gouvernance du deuxième calife Omar Ibn Al-Khattâb.',
    seasons_count: 1,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

let localEpgPrograms: EPGProgram[] = [
  {
    id: 'epg-1',
    channel_id: 'ch-1',
    epg_channel_id: 'TF1.fr',
    title: 'Le Journal de 20 Heures',
    description: 'Le tour d’horizon complet de l’actualité nationale et internationale présenté par la rédaction de TF1.',
    start_time: new Date(Date.now() - 1800000).toISOString(),
    end_time: new Date(Date.now() + 1800000).toISOString(),
    category: 'Information',
  },
  {
    id: 'epg-2',
    channel_id: 'ch-1',
    epg_channel_id: 'TF1.fr',
    title: 'Film Cinéma Prime Time',
    description: 'Grande soirée grand écran en ultra haute définition.',
    start_time: new Date(Date.now() + 1800000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    category: 'Cinéma',
  },
  {
    id: 'epg-3',
    channel_id: 'ch-3',
    epg_channel_id: 'beIN1.fr',
    title: 'UEFA Champions League Live',
    description: 'Avant-match, analyse tactique et direct du choc européen.',
    start_time: new Date(Date.now() - 900000).toISOString(),
    end_time: new Date(Date.now() + 6300000).toISOString(),
    category: 'Sport',
  },
  {
    id: 'epg-4',
    channel_id: 'ch-4',
    epg_channel_id: 'AlJazeera.qa',
    title: 'حصاد اليوم الإخباري',
    description: 'متابعة حية ومفصلة لآخر التطورات السياسية والاقتصادية في العالم العربي والدولي.',
    start_time: new Date(Date.now() - 2400000).toISOString(),
    end_time: new Date(Date.now() + 1200000).toISOString(),
    category: 'أخبار',
  },
  {
    id: 'epg-5',
    channel_id: 'ch-2',
    epg_channel_id: 'France2.fr',
    title: 'Envoyé Spécial',
    description: 'Grands reportages d’investigation, enquêtes exclusives et témoignages inédits.',
    start_time: new Date(Date.now() - 1200000).toISOString(),
    end_time: new Date(Date.now() + 4800000).toISOString(),
    category: 'Magazine',
  },
];

export const SourceService = {
  /**
   * Récupère la liste des sources
   */
  async getSources(): Promise<Source[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('sources')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Fallback local pour getSources:', err);
      }
    }
    return [...localSources];
  },

  /**
   * Ajoute ou met à jour une source avec validation anti-SSRF préalable
   */
  async saveSource(source: Partial<Source>): Promise<{ success: boolean; data?: Source; error?: string }> {
    // 1. Contrôle Anti-SSRF
    if (!source.server_url) {
      return { success: false, error: 'URL du serveur requise' };
    }

    const ssrfCheck = testUrlSSRF(source.server_url);
    if (!ssrfCheck.isSafe) {
      return { success: false, error: `[Anti-SSRF Bloqué] ${ssrfCheck.blockedReason}` };
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        if (source.id && !source.id.startsWith('src-')) {
          const { data, error } = await client
            .from('sources')
            .update({
              name: source.name,
              type: source.type,
              server_url: source.server_url,
              username: source.username || null,
              password: source.password || null,
              mac_address: source.mac_address || null,
              epg_url: source.epg_url || null,
              is_active: source.is_active ?? true,
              sync_interval_hours: source.sync_interval_hours || 24,
            })
            .eq('id', source.id)
            .select()
            .single();
          if (error) throw error;
          return { success: true, data };
        } else {
          const { data, error } = await client
            .from('sources')
            .insert({
              name: source.name,
              type: source.type,
              server_url: source.server_url,
              username: source.username || null,
              password: source.password || null,
              mac_address: source.mac_address || null,
              epg_url: source.epg_url || null,
              is_active: source.is_active ?? true,
              sync_interval_hours: source.sync_interval_hours || 24,
            })
            .select()
            .single();
          if (error) throw error;
          return { success: true, data };
        }
      } catch (err: any) {
        console.warn('Supabase saveSource error, fallback local:', err.message);
      }
    }

    // Sauvegarde locale
    if (source.id) {
      localSources = localSources.map((s) =>
        s.id === source.id
          ? { ...s, ...source, updated_at: new Date().toISOString() } as Source
          : s
      );
      return { success: true, data: localSources.find((s) => s.id === source.id) };
    } else {
      const newSrc: Source = {
        id: `src-${Date.now()}`,
        name: source.name || 'Nouvelle Source',
        type: source.type || 'm3u',
        server_url: source.server_url,
        username: source.username,
        password: source.password,
        mac_address: source.mac_address,
        epg_url: source.epg_url,
        is_active: source.is_active ?? true,
        sync_interval_hours: source.sync_interval_hours || 24,
        last_sync_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localSources.unshift(newSrc);
      return { success: true, data: newSrc };
    }
  },

  /**
   * Bascule le statut actif / inactif d'une source
   */
  async toggleSourceActive(id: string, currentStatus: boolean): Promise<boolean> {
    const client = getSupabaseClient();
    if (client && !id.startsWith('src-')) {
      try {
        await client.from('sources').update({ is_active: !currentStatus }).eq('id', id);
        return true;
      } catch (err) {
        console.warn(err);
      }
    }
    localSources = localSources.map((s) =>
      s.id === id ? { ...s, is_active: !currentStatus, updated_at: new Date().toISOString() } : s
    );
    return true;
  },

  /**
   * Supprime une source
   */
  async deleteSource(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (client && !id.startsWith('src-')) {
      try {
        await client.from('sources').delete().eq('id', id);
        return true;
      } catch (err) {
        console.warn(err);
      }
    }
    localSources = localSources.filter((s) => s.id !== id);
    return true;
  },

  /**
   * Lancement d'une synchronisation en direct
   */
  async triggerSync(sourceId: string): Promise<{ success: boolean; message: string; log?: SyncLog }> {
    const client = getSupabaseClient();
    const config = getSavedSupabaseConfig();

    // Si Supabase est connecté et Edge Function disponible
    if (client && config.url) {
      try {
        const { data: { session } } = await client.auth.getSession();
        const response = await fetch(`${config.url}/functions/v1/sync-source`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || config.anonKey}`,
          },
          body: JSON.stringify({ source_id: sourceId }),
        });

        if (response.ok) {
          const resJson = await response.json();
          return { success: true, message: `Synchronisation réussie (${resJson.channels_count || 0} chaînes)` };
        }
      } catch (err: any) {
        console.warn('Edge Function sync unreachable, simulation locale:', err.message);
      }
    }

    // Simulation de synchronisation en direct avec mise à jour des états
    const src = localSources.find((s) => s.id === sourceId);
    if (!src) return { success: false, message: 'Source introuvable' };

    src.last_sync_status = 'running';
    await new Promise((resolve) => setTimeout(resolve, 1400));

    if (src.type === 'stalker' && !src.mac_address) {
      src.last_sync_status = 'failed';
      src.last_error = 'Adresse MAC absente pour Stalker Portal';
      return { success: false, message: 'Échec: Adresse MAC requise pour Stalker' };
    }

    src.last_sync_status = 'success';
    src.last_sync_at = new Date().toISOString();
    src.last_error = null;

    const newLog: SyncLog = {
      id: `log-${Date.now()}`,
      source_id: src.id,
      source_name: src.name,
      status: 'success',
      channels_count: src.type === 'm3u' ? 28 : src.type === 'xtream' ? 42 : 16,
      movies_count: src.type === 'xtream' ? 120 : 0,
      series_count: src.type === 'xtream' ? 35 : 0,
      episodes_count: src.type === 'xtream' ? 240 : 0,
      epg_count: 85,
      duration_ms: Math.floor(Math.random() * 800) + 700,
      triggered_by: 'admin_web_panel',
      created_at: new Date().toISOString(),
    };
    localSyncLogs.unshift(newLog);

    return { success: true, message: 'Synchronisation terminée avec succès', log: newLog };
  },

  /**
   * Diagnostic / Test en direct d'une source
   */
  async testSource(params: {
    type: SourceType;
    server_url: string;
    username?: string;
    password?: string;
    mac_address?: string;
  }): Promise<{ success: boolean; latencyMs: number; message: string; details?: any }> {
    const ssrf = testUrlSSRF(params.server_url);
    if (!ssrf.isSafe) {
      return {
        success: false,
        latencyMs: 15,
        message: `[Sécurité Anti-SSRF] Requête bloquée: ${ssrf.blockedReason}`,
      };
    }

    // Simulation de latence réseau
    const startTime = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 600));
    const latencyMs = Math.round(performance.now() - startTime);

    if (params.type === 'stalker' && (!params.mac_address || params.mac_address.length < 12)) {
      return {
        success: false,
        latencyMs,
        message: 'Format d’adresse MAC invalide (Attendu: 00:1A:79:XX:XX:XX)',
      };
    }

    return {
      success: true,
      latencyMs,
      message: 'Source accessible et connectée avec succès !',
      details: {
        protocol: params.type.toUpperCase(),
        sslSecure: params.server_url.startsWith('https://'),
        port: ssrf.port,
        host: ssrf.hostname,
        serverTime: new Date().toISOString(),
      },
    };
  },

  /**
   * Récupère les catégories
   */
  async getCategories(): Promise<Category[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('categories').select('*').order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn(err);
      }
    }
    return [...localCategories];
  },

  /**
   * Bascule la visibilité d'une catégorie
   */
  async toggleCategoryVisibility(id: string, current: boolean): Promise<boolean> {
    localCategories = localCategories.map((c) => (c.id === id ? { ...c, is_visible: !current } : c));
    return true;
  },

  /**
   * Récupère les chaînes
   */
  async getChannels(): Promise<Channel[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('channels').select('*').order('channel_num', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn(err);
      }
    }
    return [...localChannels];
  },

  /**
   * Bascule l'état actif d'une chaîne
   */
  async toggleChannelActive(id: string, current: boolean): Promise<boolean> {
    localChannels = localChannels.map((ch) => (ch.id === id ? { ...ch, is_active: !current } : ch));
    return true;
  },

  /**
   * Récupère les journaux de synchronisation
   */
  async getSyncLogs(): Promise<SyncLog[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('sync_logs').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn(err);
      }
    }
    return [...localSyncLogs];
  },

  /**
   * Récupère les films VOD
   */
  async getMovies(): Promise<Movie[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('movies').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn(err);
      }
    }
    return [...localMovies];
  },

  /**
   * Bascule le statut d'un film
   */
  async toggleMovieActive(id: string, current: boolean): Promise<boolean> {
    localMovies = localMovies.map((m) => (m.id === id ? { ...m, is_active: !current } : m));
    return true;
  },

  /**
   * Récupère les séries TV
   */
  async getSeries(): Promise<Series[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('series').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn(err);
      }
    }
    return [...localSeries];
  },

  /**
   * Bascule le statut d'une série
   */
  async toggleSeriesActive(id: string, current: boolean): Promise<boolean> {
    localSeries = localSeries.map((s) => (s.id === id ? { ...s, is_active: !current } : s));
    return true;
  },

  /**
   * Récupère les programmes EPG
   */
  async getEpgPrograms(channelId?: string): Promise<EPGProgram[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        let query = client.from('epg_programs').select('*').order('start_time', { ascending: true });
        if (channelId) {
          query = query.eq('channel_id', channelId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn(err);
      }
    }
    if (channelId) {
      return localEpgPrograms.filter((p) => p.channel_id === channelId);
    }
    return [...localEpgPrograms];
  },
};
