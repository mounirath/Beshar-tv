/**
 * BeShare TV — Protection Anti-SSRF (Server-Side Request Forgery)
 * Chemin: /supabase/functions/_shared/ssrf.ts
 * 
 * Empêche l'accès aux réseaux internes (RFC 1918), aux adresses loopback (127.0.0.1),
 * aux métadonnées des fournisseurs Cloud (169.254.169.254) et aux protocoles non autorisés.
 */

// Plages IP privées et réservées interdites (SSRF Protection)
const FORBIDDEN_IP_PATTERNS = [
  /^127\./,                         // Loopback IPv4 (127.0.0.0/8)
  /^10\./,                          // Réseau privé classe A (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Réseau privé classe B (172.16.0.0/12)
  /^192\.168\./,                    // Réseau privé classe C (192.168.0.0/16)
  /^169\.254\./,                    // Link-local / Cloud Metadata AWS, GCP, Azure (169.254.0.0/16)
  /^0\./,                           // Adresses 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // Carrier-grade NAT (100.64.0.0/10)
  /^198\.(18|19)\./,                // Tests de benchmarks (198.18.0.0/15)
  /^224\./,                         // Multicast (224.0.0.0/4)
  /^240\./,                         // Réservé futur (240.0.0.0/4)
  /^::1$/,                          // IPv6 Loopback
  /^fc00:/i,                        // IPv6 Unique Local
  /^fe80:/i,                        // IPv6 Link-local
  /^fd[0-9a-f]{2}:/i,               // IPv6 Local
];

// Noms d'hôtes strictement interdits
const FORBIDDEN_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',       // GCP Metadata
  'instance-data',
  'kubernetes.default',
  'kubernetes.default.svc',
];

// Ports sensibles à bloquer absolument même si l'URL est publique
const FORBIDDEN_PORTS = new Set([
  21,   // FTP
  22,   // SSH
  23,   // Telnet
  25,   // SMTP
  110,  // POP3
  143,  // IMAP
  389,  // LDAP
  445,  // SMB
  1433, // MS SQL
  1521, // Oracle
  2375, // Docker
  2376, // Docker SSL
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  9200, // Elasticsearch
  27017,// MongoDB
]);

export interface SSRFValidationResult {
  isValid: boolean;
  sanitizedUrl?: URL;
  error?: string;
}

/**
 * Valide rigoureusement une URL avant toute requête réseau sortante.
 */
export function validateUrlForSSRF(rawUrl: string): SSRFValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL absente ou invalide' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: 'Format d’URL invalide' };
  }

  // 1. Restriction stricte des protocoles (HTTP et HTTPS uniquement)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: `Protocole non autorisé (${parsed.protocol}). Seuls http: et https: sont acceptés.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Vérification des noms d'hôtes bloqués
  if (FORBIDDEN_HOSTNAMES.includes(hostname)) {
    return {
      isValid: false,
      error: `Accès interdit au nom d'hôte réservé: ${hostname}`,
    };
  }

  // 3. Vérification des plages IP interdites
  for (const pattern of FORBIDDEN_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        isValid: false,
        error: `Accès interdit aux adresses IP privées, locales ou internes (${hostname})`,
      };
    }
  }

  // 4. Vérification des ports bloqués
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
  if (FORBIDDEN_PORTS.has(port)) {
    return {
      isValid: false,
      error: `Accès refusé au port système sensible ${port}`,
    };
  }

  return {
    isValid: true,
    sanitizedUrl: parsed,
  };
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxSizeBytes?: number;
}

/**
 * Wrapper de fetch sécurisé avec protection SSRF, timeout d'annulation et limitation de taille.
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 25000, maxSizeBytes = 40 * 1024 * 1024, ...fetchOptions } = options;

  const validation = validateUrlForSSRF(url);
  if (!validation.isValid || !validation.sanitizedUrl) {
    throw new Error(`[Sécurité Anti-SSRF] Requête bloquée : ${validation.error}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(fetchOptions.headers || {});
    // Header User-Agent professionnel adapté aux passerelles de diffusion
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', 'BeShareTV/1.0 (Android TV; ExoPlayer SyncEngine)');
    }

    const response = await fetch(validation.sanitizedUrl.toString(), {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    // Vérifier la destination finale en cas de redirection (Protection Anti-Open-Redirect SSRF)
    if (response.url) {
      const redirectValidation = validateUrlForSSRF(response.url);
      if (!redirectValidation.isValid) {
        throw new Error(`[Sécurité Anti-SSRF] Redirection vers une cible non autorisée : ${redirectValidation.error}`);
      }
    }

    // Vérifier la taille annoncée dans le Content-Length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      throw new Error(`[Sécurité DoS] Le flux dépasse la taille maximale autorisée de ${Math.round(maxSizeBytes / (1024 * 1024))} Mo`);
    }

    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`[Délai dépassé] Le serveur distant n'a pas répondu dans les ${timeoutMs / 1000} secondes imparties.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
