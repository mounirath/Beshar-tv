/**
 * BeShare TV — Sanitizer de Logs et Protection des Identifiants
 * Chemin: /supabase/functions/_shared/sanitizer.ts
 * 
 * Garantit qu'aucun mot de passe, token, clé secrète ou paramètre d'authentification
 * n'apparaisse dans les journaux d'exécution console ou la table sync_logs.
 */

// Liste des motifs sensibles à caviarder dans les URLs et messages d'erreurs
const SENSITIVE_QUERY_PARAMS = [
  'password',
  'pass',
  'pwd',
  'token',
  'auth',
  'key',
  'secret',
  'mac',
  'signature',
];

/**
 * Caviarde les paramètres sensibles d'une URL
 * Ex: http://server.com/live/user/12345/stream.m3u8 -> http://server.com/live/user/[REDACTED]/stream.m3u8
 */
export function sanitizeUrl(urlStr: string): string {
  if (!urlStr || typeof urlStr !== 'string') return '';

  try {
    const url = new URL(urlStr);

    // Caviarder dans les paramètres de requête
    for (const param of SENSITIVE_QUERY_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, '[REDACTED]');
      }
    }

    // Caviarder si l'URL contient des credentials http://user:pass@host
    if (url.password) {
      url.password = '[REDACTED]';
    }

    // Caviarder les segments de chemin typiques Xtream (ex: /live/username/password/123.m3u8)
    const segments = url.pathname.split('/');
    if (segments.length >= 4 && (segments[1] === 'live' || segments[1] === 'movie' || segments[1] === 'series')) {
      // segments: ["", "live", "username", "password", "stream.ts"]
      if (segments[3] && segments[3] !== '[REDACTED]') {
        segments[3] = '[REDACTED]';
      }
      url.pathname = segments.join('/');
    }

    return url.toString();
  } catch {
    // Si ce n'est pas une URL stricte, masquer par regex
    return urlStr
      .replace(/password=([^&]+)/gi, 'password=[REDACTED]')
      .replace(/pass=([^&]+)/gi, 'pass=[REDACTED]')
      .replace(/token=([^&]+)/gi, 'token=[REDACTED]');
  }
}

/**
 * Nettoie un message d'erreur ou log avant insertion dans sync_logs ou console
 */
export function sanitizeLogMessage(message: string | unknown): string {
  if (!message) return '';
  const text = typeof message === 'string' ? message : JSON.stringify(message);

  return text
    .replace(/(password|pass|pwd|token|secret)\s*[:=]\s*["']?([^"'&\s]+)["']?/gi, '$1=[REDACTED]')
    .replace(/(https?:\/\/[^\s]+)/gi, (match) => sanitizeUrl(match))
    .slice(0, 4000); // Évite les dépassements de taille dans PostgreSQL
}
