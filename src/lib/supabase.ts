/**
 * BeShare TV — Client Supabase
 * Initialise le client Supabase avec support de configuration dynamique
 */
import { createClient } from '@supabase/supabase-js';

const defaultUrl = import.meta.env.VITE_SUPABASE_URL || '';
const defaultAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const getSavedSupabaseConfig = () => {
  const customUrl = localStorage.getItem('beshare_supabase_url');
  const customKey = localStorage.getItem('beshare_supabase_anon_key');
  return {
    url: customUrl || defaultUrl,
    anonKey: customKey || defaultAnonKey,
    isCustom: Boolean(customUrl && customKey),
  };
};

export const saveSupabaseConfig = (url: string, anonKey: string) => {
  if (url && anonKey) {
    localStorage.setItem('beshare_supabase_url', url.trim());
    localStorage.setItem('beshare_supabase_anon_key', anonKey.trim());
  } else {
    localStorage.removeItem('beshare_supabase_url');
    localStorage.removeItem('beshare_supabase_anon_key');
  }
};

export const getSupabaseClient = () => {
  const { url, anonKey } = getSavedSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }
  try {
    return createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.error('Erreur initialisation Supabase:', err);
    return null;
  }
};
