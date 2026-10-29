/**
 * BeShare TV — Parseur M3U / M3U8 Hautes Performances
 * Chemin: /supabase/functions/_shared/m3u_parser.ts
 * 
 * Analyse en streaming des listes de lecture M3U8 / M3U,
 * extraction des métadonnées EXTINF, des catégories et classification (Live TV / VOD / Séries).
 */

export interface ParsedCategory {
  extId: string;
  name: string;
  type: 'live' | 'movie' | 'series';
}

export interface ParsedChannel {
  extId: string;
  name: string;
  streamUrl: string;
  logoUrl?: string;
  epgChannelId?: string;
  categoryExtId: string;
  categoryName: string;
  channelNum?: number;
}

export interface ParsedMovie {
  extId: string;
  title: string;
  streamUrl: string;
  posterUrl?: string;
  categoryExtId: string;
  categoryName: string;
  releaseYear?: number;
}

export interface ParsedSeriesItem {
  extId: string;
  title: string;
  streamUrl: string;
  posterUrl?: string;
  categoryExtId: string;
  categoryName: string;
  seasonNum?: number;
  episodeNum?: number;
}

export interface M3UParseResult {
  categories: Map<string, ParsedCategory>;
  channels: ParsedChannel[];
  movies: ParsedMovie[];
  series: ParsedSeriesItem[];
  totalParsed: number;
}

// Détection intelligente du type de contenu
function detectContentType(groupTitle: string, streamUrl: string, title: string): 'live' | 'movie' | 'series' {
  const lowerGroup = (groupTitle || '').toLowerCase();
  const lowerUrl = (streamUrl || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();

  // Détection Séries (S01E01, S01 E01, saison, episode, etc.)
  if (
    /s\d{1,2}\s?e\d{1,3}/i.test(lowerTitle) ||
    lowerGroup.includes('série') ||
    lowerGroup.includes('series') ||
    lowerGroup.includes('مسلسلات') ||
    lowerGroup.includes('season') ||
    lowerUrl.includes('/series/')
  ) {
    return 'series';
  }

  // Détection Films VOD
  if (
    lowerGroup.includes('vod') ||
    lowerGroup.includes('film') ||
    lowerGroup.includes('movie') ||
    lowerGroup.includes('cinema') ||
    lowerGroup.includes('أفلام') ||
    lowerUrl.includes('/movie/') ||
    (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mkv') || lowerUrl.endsWith('.avi')) && !lowerUrl.includes('/live/')
  ) {
    return 'movie';
  }

  return 'live';
}

// Extraction robuste des attributs d'un header #EXTINF
function parseExtInfAttributes(line: string) {
  const attributes: Record<string, string> = {};

  // Extraction par regex des paires cle="valeur" ou cle='valeur'
  const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
  let match;
  while ((match = attrRegex.exec(line)) !== null) {
    attributes[match[1].toLowerCase()] = match[2];
  }

  // Extraction du nom affiché de la chaîne (situé après la dernière virgule)
  const commaIdx = line.lastIndexOf(',');
  let displayName = '';
  if (commaIdx !== -1) {
    displayName = line.substring(commaIdx + 1).trim();
  }

  return { attributes, displayName };
}

/**
 * Parse un contenu texte M3U / M3U8 complet
 */
export function parseM3UContent(content: string, maxItemsLimit: number = 25000): M3UParseResult {
  const lines = content.split(/\r?\n/);
  const categories = new Map<string, ParsedCategory>();
  const channels: ParsedChannel[] = [];
  const movies: ParsedMovie[] = [];
  const series: ParsedSeriesItem[] = [];

  let currentAttributes: Record<string, string> | null = null;
  let currentDisplayName: string = '';
  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    if (rawLine.startsWith('#EXTINF:')) {
      const parsed = parseExtInfAttributes(rawLine);
      currentAttributes = parsed.attributes;
      currentDisplayName = parsed.displayName;
    } else if (!rawLine.startsWith('#') && currentAttributes) {
      // C'est la ligne contenant l'URL du flux
      const streamUrl = rawLine;
      const groupTitle = currentAttributes['group-title'] || 'Général';
      const categoryType = detectContentType(groupTitle, streamUrl, currentDisplayName);
      const categoryExtId = groupTitle.toLowerCase().replace(/[^a-z0-9_\u0600-\u06FF]/g, '_');

      // Enregistrer la catégorie si pas encore présente
      if (!categories.has(categoryExtId)) {
        categories.set(categoryExtId, {
          extId: categoryExtId,
          name: groupTitle,
          type: categoryType,
        });
      }

      const extId = currentAttributes['tvg-id'] || `item_${count + 1}`;
      const logoUrl = currentAttributes['tvg-logo'] || undefined;
      const epgChannelId = currentAttributes['tvg-id'] || currentAttributes['tvg-name'] || undefined;

      if (categoryType === 'live') {
        channels.push({
          extId,
          name: currentDisplayName || currentAttributes['tvg-name'] || `Chaîne ${channels.length + 1}`,
          streamUrl,
          logoUrl,
          epgChannelId,
          categoryExtId,
          categoryName: groupTitle,
          channelNum: currentAttributes['tvg-chno'] ? parseInt(currentAttributes['tvg-chno'], 10) : undefined,
        });
      } else if (categoryType === 'movie') {
        movies.push({
          extId,
          title: currentDisplayName || `Film ${movies.length + 1}`,
          streamUrl,
          posterUrl: logoUrl,
          categoryExtId,
          categoryName: groupTitle,
        });
      } else if (categoryType === 'series') {
        // Extraction éventuelle de la saison et de l'épisode
        const seMatch = currentDisplayName.match(/s(\d{1,2})\s?e(\d{1,3})/i);
        series.push({
          extId,
          title: currentDisplayName || `Série ${series.length + 1}`,
          streamUrl,
          posterUrl: logoUrl,
          categoryExtId,
          categoryName: groupTitle,
          seasonNum: seMatch ? parseInt(seMatch[1], 10) : 1,
          episodeNum: seMatch ? parseInt(seMatch[2], 10) : 1,
        });
      }

      count++;
      currentAttributes = null;
      currentDisplayName = '';

      if (count >= maxItemsLimit) {
        break;
      }
    }
  }

  return {
    categories,
    channels,
    movies,
    series,
    totalParsed: count,
  };
}
