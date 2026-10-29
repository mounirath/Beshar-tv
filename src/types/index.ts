/**
 * BeShare TV — Types TypeScript Complets
 * Chemin: /src/types/index.ts
 */

export type SourceType = 'm3u' | 'xtream' | 'stalker';
export type SyncStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial';
export type CategoryType = 'live' | 'movie' | 'series';
export type DeviceType = 'android_mobile' | 'android_tv' | 'web';
export type UserRole = 'admin' | 'viewer';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  server_url: string;
  username?: string | null;
  password?: string | null;
  mac_address?: string | null;
  epg_url?: string | null;
  is_active: boolean;
  sync_interval_hours: number;
  last_sync_at?: string | null;
  last_sync_status: SyncStatus;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  source_id?: string | null;
  category_type: CategoryType;
  category_ext_id: string;
  name: string;
  name_ar?: string | null;
  icon_url?: string | null;
  is_visible: boolean;
  sort_order: number;
  channels_count?: number;
  created_at: string;
}

export interface Channel {
  id: string;
  source_id: string;
  category_id?: string | null;
  channel_num?: number | null;
  name: string;
  stream_url: string;
  logo_url?: string | null;
  epg_channel_id?: string | null;
  stream_type: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  category_name?: string;
}

export interface Movie {
  id: string;
  source_id: string;
  category_id?: string | null;
  title: string;
  title_ar?: string | null;
  stream_url: string;
  poster_url?: string | null;
  rating?: number | null;
  release_year?: number | null;
  duration_mins?: number | null;
  synopsis?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Series {
  id: string;
  source_id: string;
  category_id?: string | null;
  title: string;
  title_ar?: string | null;
  poster_url?: string | null;
  rating?: number | null;
  release_year?: number | null;
  plot?: string | null;
  seasons_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Episode {
  id: string;
  series_id: string;
  season_number: number;
  episode_number: number;
  title: string;
  stream_url: string;
  duration_mins?: number | null;
  still_url?: string | null;
  is_active: boolean;
}

export interface EPGProgram {
  id: string;
  channel_id?: string | null;
  epg_channel_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  category?: string | null;
}

export interface SyncLog {
  id: string;
  source_id?: string | null;
  source_name?: string | null;
  status: SyncStatus;
  channels_count: number;
  movies_count: number;
  series_count: number;
  episodes_count: number;
  epg_count: number;
  error_details?: string | null;
  duration_ms?: number | null;
  triggered_by: string;
  created_at: string;
}

export interface ClientDevice {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string | null;
  device_type: DeviceType;
  app_version?: string | null;
  last_ip?: string | null;
  last_seen_at: string;
  is_revoked: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  max_devices: number;
  expires_at?: string | null;
  created_at: string;
}
