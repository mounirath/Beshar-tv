/**
 * BeShare TV — Outils de simulation et test local pour l'Étape 2
 * Reproduit fidèlement le comportement des Edge Functions côté client pour diagnostic immédiat.
 */

export interface SSRFTestReport {
  rawUrl: string;
  isSafe: boolean;
  blockedReason?: string;
  protocol?: string;
  hostname?: string;
  port?: number;
}

export function testUrlSSRF(rawUrl: string): SSRFTestReport {
  if (!rawUrl || !rawUrl.trim()) {
    return { rawUrl, isSafe: false, blockedReason: 'URL vide' };
  }

  try {
    const url = new URL(rawUrl.trim());
    const hostname = url.hostname.toLowerCase();
    const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);

    // Protocoles
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        rawUrl,
        isSafe: false,
        blockedReason: `Protocole non autorisé (${url.protocol}). Seuls http: et https: sont admis.`,
        protocol: url.protocol,
        hostname,
        port,
      };
    }

    // Noms d'hôtes bloqués
    const forbiddenHosts = ['localhost', 'metadata.google.internal', 'instance-data'];
    if (forbiddenHosts.includes(hostname)) {
      return {
        rawUrl,
        isSafe: false,
        blockedReason: `Nom d'hôte réservé ou sensible bloqué (${hostname})`,
        protocol: url.protocol,
        hostname,
        port,
      };
    }

    // IP privées RFC 1918 et loopback
    if (
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^::1$/.test(hostname)
    ) {
      return {
        rawUrl,
        isSafe: false,
        blockedReason: `Adresse IP privée, locale ou lien-local bloquée (${hostname})`,
        protocol: url.protocol,
        hostname,
        port,
      };
    }

    // Ports sensibles
    const sensitivePorts = [21, 22, 23, 25, 3306, 5432, 6379, 27017];
    if (sensitivePorts.includes(port)) {
      return {
        rawUrl,
        isSafe: false,
        blockedReason: `Port système interne sensible bloqué (${port})`,
        protocol: url.protocol,
        hostname,
        port,
      };
    }

    return {
      rawUrl,
      isSafe: true,
      protocol: url.protocol,
      hostname,
      port,
    };
  } catch {
    return { rawUrl, isSafe: false, blockedReason: 'Format d’URL invalide' };
  }
}

export function sanitizePreviewText(text: string): string {
  return text
    .replace(/(password|pass|pwd|token|secret)\s*[:=]\s*["']?([^"'&\s]+)["']?/gi, '$1=[REDACTED]')
    .replace(/(\/live\/[^\/]+\/)[^\/]+(\/)/gi, '$1[REDACTED]$2');
}

export function parseSampleM3U(content: string) {
  const lines = content.split('\n');
  const items: any[] = [];
  let current: any = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#EXTINF:')) {
      const matchName = trimmed.split(',').pop()?.trim() || 'Chaîne';
      const groupMatch = trimmed.match(/group-title="([^"]*)"/i);
      const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/i);
      const chnoMatch = trimmed.match(/tvg-chno="([^"]*)"/i);
      current = {
        name: matchName,
        group: groupMatch ? groupMatch[1] : 'Général',
        logo: logoMatch ? logoMatch[1] : '',
        num: chnoMatch ? chnoMatch[1] : items.length + 1,
      };
    } else if (trimmed && !trimmed.startsWith('#') && current) {
      current.url = trimmed;
      const lowerGroup = current.group.toLowerCase();
      const lowerName = current.name.toLowerCase();
      if (lowerName.includes('s01') || lowerGroup.includes('série') || lowerGroup.includes('series')) {
        current.type = 'series';
      } else if (lowerGroup.includes('film') || lowerGroup.includes('movie') || lowerGroup.includes('vod')) {
        current.type = 'movie';
      } else {
        current.type = 'live';
      }
      items.push(current);
      current = null;
    }
  }

  return items;
}
