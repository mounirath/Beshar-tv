/**
 * BeShare TV — Types pour le Diagnostic Système
 * Module: /src/types/diagnostic.ts
 */

export type DiagnosticStatus = 'ok' | 'warning' | 'error';

export interface SupabaseEnvCheck {
  url: { value: string; status: DiagnosticStatus; message: string };
  publishableKey: { masked: string; status: DiagnosticStatus; message: string };
  secretKey: { configured: boolean; masked: string; status: DiagnosticStatus; message: string };
  jwksUrl: { value: string; status: DiagnosticStatus; message: string };
}

export interface SupabaseConnTest {
  status: DiagnosticStatus;
  latencyMs: number;
  httpStatus?: number;
  message: string;
  projectId?: string;
  errorDetails?: string;
}

export interface TableDiagnosticItem {
  tableName: string;
  category: 'sources' | 'categories' | 'channels' | 'movies' | 'series' | 'episodes' | 'epg' | 'logs' | 'devices' | 'auth';
  exists: boolean;
  status: DiagnosticStatus;
  message: string; // "OK", "Table introuvable", "Aucun contenu enregistré", "Accès refusé par RLS"
  rowCount: number | null;
  rlsProtected: boolean;
  httpStatus?: number;
}

export interface SourceDiagnosticItem {
  id: string;
  name: string;
  type: 'm3u' | 'xtream' | 'stalker';
  serverUrlSanitized: string;
  usernameMasked: string;
  passwordMasked: string;
  macMasked?: string;
  lastSyncAt?: string | null;
  lastSyncStatus: string;
  status: DiagnosticStatus;
  latencyMs?: number;
  httpStatus?: number;
  message: string;
  accountInfo?: {
    status?: string;
    expDate?: string;
    maxConnections?: string | number;
    activeConnections?: string | number;
  };
}

export interface CatalogueCounterItem {
  local: number;
  supabase: number | null;
  statusText: string;
  status: DiagnosticStatus;
}

export interface CatalogueDiagnosticCounters {
  channels: CatalogueCounterItem;
  categories: CatalogueCounterItem;
  movies: CatalogueCounterItem;
  series: CatalogueCounterItem;
  episodes: CatalogueCounterItem;
  epgPrograms: CatalogueCounterItem;
}

export interface SyncAndStreamDiagnostic {
  m3uDownload: {
    tested: boolean;
    status: DiagnosticStatus;
    httpStatus?: number;
    latencyMs?: number;
    firstLine?: string;
    detectedEntriesCount?: number;
    message: string;
  };
  m3uParsing: {
    status: DiagnosticStatus;
    detectedChannelsCount: number;
    detectedCategoriesCount: number;
    recordedInSupabaseCount: number;
    discrepancyMessage: string;
  };
  streamingPlayback: {
    sampleStreamUrl: string;
    directStatus: DiagnosticStatus;
    directHttpStatus?: number;
    latencyMs?: number;
    corsHeaderPresent: boolean;
    mixedContentRisk: boolean;
    errorType?: '401_UNAUTHORIZED' | 'CORS_OR_NETWORK' | 'MIXED_CONTENT' | 'TIMEOUT' | 'OK';
    message: string;
    explanation: string;
  };
}

export interface ProbableCause {
  category: 'supabase' | 'streaming' | 'synchronization';
  title: string;
  description: string;
  solution: string;
}

export interface SystemDiagnosticReport {
  timestamp: string;
  overallStatus: DiagnosticStatus;
  passedTests: string[];
  failedTests: string[];
  missingTables: string[];
  detectedErrors: string[];
  probableCauses: ProbableCause[];
  envCheck: SupabaseEnvCheck;
  supabaseConn: SupabaseConnTest;
  tables: TableDiagnosticItem[];
  sources: SourceDiagnosticItem[];
  catalogue: CatalogueDiagnosticCounters;
  syncAndStream: SyncAndStreamDiagnostic;
  suggestedSqlMigration: string;
}
