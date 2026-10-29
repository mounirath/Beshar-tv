/**
 * BeShare TV — Client Sécurisé Xtream Codes API v2
 * Chemin: /supabase/functions/_shared/xtream_client.ts
 * 
 * Gestion de l'authentification et de la synchronisation avec les serveurs Xtream Codes.
 * Utilise le fetch sécurisé safeFetch (SSRF safe) et sanitizeUrl pour les logs.
 */

import { safeFetch } from './ssrf.ts';
import { sanitizeLogMessage } from './sanitizer.ts';

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface XtreamUserInfo {
  username: string;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  max_connections: string;
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    timezone: string;
  };
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface XtreamLiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  category_id: string;
}

export interface XtreamVodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  year: string;
  container_extension: string;
  category_id: string;
}

export interface XtreamSeries {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  rating: string;
  releaseDate: string;
  category_id: string;
}

export class XtreamClient {
  private baseUrl: string;
  private user: string;
  private pass: string;

  constructor(creds: XtreamCredentials) {
    let cleanUrl = creds.serverUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    this.baseUrl = cleanUrl;
    this.user = encodeURIComponent(creds.username.trim());
    this.pass = encodeURIComponent(creds.password.trim());
  }

  private getApiUrl(action?: string, extraParams: Record<string, string | undefined> = {}): string {
    const params = new URLSearchParams();
    params.set('username', decodeURIComponent(this.user));
    params.set('password', decodeURIComponent(this.pass));
    if (action) params.set('action', action);
    for (const [k, v] of Object.entries(extraParams)) {
      if (v !== undefined) {
        params.set(k, v);
      }
    }
    return `${this.baseUrl}/player_api.php?${params.toString()}`;
  }

  /**
   * Authentification et vérification de validité du compte
   */
  async authenticate(): Promise<XtreamUserInfo> {
    const url = this.getApiUrl();
    try {
      const response = await safeFetch(url, { timeoutMs: 15000 });
      if (!response.ok) {
        throw new Error(`Erreur HTTP Xtream: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      if (!data.user_info || data.user_info.auth === 0) {
        throw new Error('Identifiants Xtream Codes invalides ou compte inactif');
      }

      return data.user_info;
    } catch (err: any) {
      throw new Error(`[Xtream Auth] ${sanitizeLogMessage(err.message)}`);
    }
  }

  /**
   * Récupère les catégories Live, VOD ou Séries
   */
  async getCategories(type: 'live' | 'vod' | 'series'): Promise<XtreamCategory[]> {
    const action = type === 'live' 
      ? 'get_live_categories' 
      : type === 'vod' 
      ? 'get_vod_categories' 
      : 'get_series_categories';

    const url = this.getApiUrl(action);
    const response = await safeFetch(url, { timeoutMs: 20000 });
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Récupère la liste des chaînes en direct
   */
  async getLiveStreams(categoryId?: string): Promise<XtreamLiveStream[]> {
    const extra = categoryId ? { category_id: categoryId } : {};
    const url = this.getApiUrl('get_live_streams', extra);
    const response = await safeFetch(url, { timeoutMs: 30000 });
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Récupère la liste des films VOD
   */
  async getVodStreams(categoryId?: string): Promise<XtreamVodStream[]> {
    const extra = categoryId ? { category_id: categoryId } : {};
    const url = this.getApiUrl('get_vod_streams', extra);
    const response = await safeFetch(url, { timeoutMs: 30000 });
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Récupère la liste des séries
   */
  async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
    const extra = categoryId ? { category_id: categoryId } : {};
    const url = this.getApiUrl('get_series', extra);
    const response = await safeFetch(url, { timeoutMs: 30000 });
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Génère l'URL de flux Live d'un canal
   */
  buildLiveStreamUrl(streamId: number, extension: 'ts' | 'm3u8' = 'm3u8'): string {
    return `${this.baseUrl}/live/${this.user}/${this.pass}/${streamId}.${extension}`;
  }

  /**
   * Génère l'URL d'un film VOD
   */
  buildMovieStreamUrl(streamId: number, extension: string = 'mp4'): string {
    return `${this.baseUrl}/movie/${this.user}/${this.pass}/${streamId}.${extension}`;
  }

  /**
   * Génère l'URL d'un épisode de série
   */
  buildEpisodeStreamUrl(episodeId: number, extension: string = 'mp4'): string {
    return `${this.baseUrl}/series/${this.user}/${this.pass}/${episodeId}.${extension}`;
  }
}
