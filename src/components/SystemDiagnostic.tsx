/**
 * BeShare TV — Diagnostic Système Complet (React & TypeScript)
 * Module: /src/components/SystemDiagnostic.tsx
 * 
 * Permet un audit 360° en temps réel :
 * 1. Connexion Supabase (URL, Clés, Ping, Latence, Erreurs précises)
 * 2. Diagnostic des Tables (Détection réelle, Permissions RLS, PGRST205)
 * 3. Diagnostic des Sources (M3U, Xtream, Stalker, Statuts, Masquage strict)
 * 4. Diagnostic du Catalogue (Compteurs réels sans invention)
 * 5. Diagnostic de Synchronisation & Streaming (M3U, CORS, Mixed Content, 401 IP-Lock)
 * 6. Rapport Final & Script SQL de Migration 1-Click
 */
import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Copy,
  Check,
  Database,
  Radio,
  Server,
  Layers,
  Film,
  Calendar,
  Lock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Terminal,
  HelpCircle,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  AlertOctagon,
  Clock,
  Sparkles
} from 'lucide-react';
import { SystemDiagnosticReport, DiagnosticStatus } from '../types/diagnostic';

interface SystemDiagnosticProps {
  lang: 'fr' | 'ar';
}

export function SystemDiagnostic({ lang }: SystemDiagnosticProps) {
  const [report, setReport] = useState<SystemDiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'supabase' | 'tables' | 'sources' | 'catalogue' | 'streaming' | 'sql'>('overview');
  const [syncingToSupabase, setSyncingToSupabase] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isRTL = lang === 'ar';

  const fetchDiagnostic = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system-diagnostic');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        console.error('Erreur retour diagnostic:', res.status);
      }
    } catch (err) {
      console.error('Échec appel /api/system-diagnostic:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostic();
  }, []);

  const handleExportReport = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beshare-diagnostic-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTextReport = () => {
    if (!report) return;
    const textLines = [
      '====================================================================',
      'BESHARE TV — RAPPORT DE DIAGNOSTIC SYSTÈME',
      `Date : ${new Date(report.timestamp).toLocaleString()}`,
      `Statut Général : ${report.overallStatus.toUpperCase()}`,
      '====================================================================',
      '',
      '1. CONNEXION SUPABASE',
      `URL : ${report.envCheck.url.value} [${report.envCheck.url.status.toUpperCase()}]`,
      `Clé Publique : ${report.envCheck.publishableKey.masked} [${report.envCheck.publishableKey.status.toUpperCase()}]`,
      `Clé Secrète : ${report.envCheck.secretKey.configured ? 'Configurée (Masquée)' : 'Non définie'}`,
      `Test Ping : ${report.supabaseConn.message} (${report.supabaseConn.latencyMs}ms)`,
      '',
      '2. DIAGNOSTIC DES TABLES SUPABASE',
      ...report.tables.map(
        (t) => `- public.${t.tableName.padEnd(16)} : ${t.message} (Lignes : ${t.rowCount ?? 'N/A'})`
      ),
      '',
      '3. DIAGNOSTIC DES SOURCES FOURNISSEURS',
      ...report.sources.map(
        (s) => `- ${s.name} [${s.type.toUpperCase()}] : ${s.message} (Latence : ${s.latencyMs || 0}ms)`
      ),
      '',
      '4. DIAGNOSTIC DU CATALOGUE (RÉEL)',
      `- Chaînes TV   : Local = ${report.catalogue.channels.local} | Supabase = ${report.catalogue.channels.supabase ?? 'Table introuvable'}`,
      `- Catégories   : Local = ${report.catalogue.categories.local} | Supabase = ${report.catalogue.categories.supabase ?? 'Table introuvable'}`,
      `- Films VOD    : Local = ${report.catalogue.movies.local} | Supabase = ${report.catalogue.movies.supabase ?? 'Table introuvable'}`,
      `- Séries VOD   : Local = ${report.catalogue.series.local} | Supabase = ${report.catalogue.series.supabase ?? 'Table introuvable'}`,
      `- Épisodes     : Local = ${report.catalogue.episodes.local} | Supabase = ${report.catalogue.episodes.supabase ?? 'Table introuvable'}`,
      `- Programmes EPG: Local = ${report.catalogue.epgPrograms.local} | Supabase = ${report.catalogue.epgPrograms.supabase ?? 'Table introuvable'}`,
      '',
      '5. SYNCHRONISATION & STREAMING',
      `- Téléchargement M3U : ${report.syncAndStream.m3uDownload.message}`,
      `- Flux Direct : ${report.syncAndStream.streamingPlayback.message}`,
      `- Cause flux : ${report.syncAndStream.streamingPlayback.explanation}`,
      '',
      '6. CAUSES RACINES DÉTECTÉES',
      ...report.probableCauses.map((c, i) => `${i + 1}. ${c.title}\n   ${c.description}\n   Solution : ${c.solution}`),
      '====================================================================',
    ];

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  const handleCopySql = () => {
    if (!report?.suggestedSqlMigration) return;
    navigator.clipboard.writeText(report.suggestedSqlMigration);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handlePushCatalogue = async () => {
    setSyncingToSupabase(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/push-catalogue-to-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setSyncNotice({ type: 'success', message: data.message });
        await fetchDiagnostic();
      } else {
        setSyncNotice({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setSyncNotice({ type: 'error', message: `Erreur d'envoi : ${err.message}` });
    } finally {
      setSyncingToSupabase(false);
    }
  };

  const getStatusBadge = (status: DiagnosticStatus) => {
    if (status === 'ok') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{lang === 'fr' ? 'FONCTIONNEL' : 'يعمل بشكل سليم'}</span>
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{lang === 'fr' ? 'AVERTISSEMENT' : 'تنبيه'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>{lang === 'fr' ? 'ERREUR' : 'خطأ'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL AVEC ACTIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {lang === 'fr' ? 'DIAGNOSTIC SYSTÈME' : 'فحص وتشخيص النظام'}
                </h2>
                {report && getStatusBadge(report.overallStatus)}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                {lang === 'fr'
                  ? 'Audit d’infrastructure en temps réel : connectivité Supabase, permissions PostgreSQL (RLS), tables réelles, flux vidéo IPTV et diagnostic de lecture.'
                  : 'تدقيق حي لقاعدة بيانات Supabase، أذونات الجداول، مصادر IPTV، وحالة تشغيل القنوات والبث.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchDiagnostic}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{lang === 'fr' ? 'LANCER LE DIAGNOSTIC' : 'بدء الفحص'}</span>
            </button>

            <button
              onClick={handleCopyTextReport}
              disabled={!report}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Copier le rapport texte dans le presse-papier"
            >
              {copiedReport ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedReport ? (lang === 'fr' ? 'Copié !' : 'تم النسخ') : (lang === 'fr' ? 'COPIER' : 'نسخ')}</span>
            </button>

            <button
              onClick={handleExportReport}
              disabled={!report}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Exporter le rapport JSON complet"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'fr' ? 'EXPORTER LE RAPPORT' : 'تصدير التقرير'}</span>
            </button>
          </div>
        </div>

        {/* BANNIÈRE DE SYNTHÈSE DES 2 PROBLÈMES DÉTECTÉS */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {/* Problème 1 : Supabase Tables */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              report.missingTables.length > 0
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}>
              {report.missingTables.length > 0 ? (
                <Database className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-xs uppercase tracking-wider">
                  {report.missingTables.length > 0
                    ? `SUPABASE : ${report.missingTables.length} TABLES NON INITIALISÉES (PGRST205)`
                    : 'SUPABASE : BASE DE DONNÉES PRÊTE ET CONFIGURÉE'}
                </div>
                <p className="text-[11px] text-slate-300">
                  {report.missingTables.length > 0
                    ? 'Le serveur Supabase est joignable, mais les tables (channels, sources, categories...) n’ont pas été créées dans PostgreSQL. Cliquez sur "Script SQL" pour les générer en 1 clic.'
                    : 'Toutes les tables PostgreSQL nécessaires sont détectées avec les permissions RLS appropriées.'}
                </p>
              </div>
            </div>

            {/* Problème 2 : Flux IPTV 401 / Verrouillage Fournisseur */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              report.syncAndStream.streamingPlayback.directStatus === 'error'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}>
              {report.syncAndStream.streamingPlayback.directStatus === 'error' ? (
                <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-xs uppercase tracking-wider">
                  {report.syncAndStream.streamingPlayback.errorType === '401_UNAUTHORIZED'
                    ? 'IPTV : FLUX BLOQUÉ PAR LE FOURNISSEUR (HTTP 401 UNAUTHORIZED)'
                    : 'IPTV : FLUX VIDÉO JOIGNABLE'}
                </div>
                <p className="text-[11px] text-slate-300">
                  {report.syncAndStream.streamingPlayback.errorType === '401_UNAUTHORIZED'
                    ? 'Compte TONSTV actif mais limité à 1 connexion simultanée (IP-Lock). Le fournisseur refuse la lecture depuis le serveur. Utilisez le BeShare Proxy ou l’application Android TV locale.'
                    : 'Le serveur distant accepte les requêtes de streaming sans restriction réseau.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION D'ACTION */}
        {syncNotice && (
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            syncNotice.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
          }`}>
            <span>{syncNotice.message}</span>
            <button onClick={() => setSyncNotice(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ONGLETS DE NAVIGATION DÉTAILLÉE */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-2 border-t border-slate-800 text-xs scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {lang === 'fr' ? '1. Synthèse Globale' : '1. نظرة عامة'}
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'supabase'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {lang === 'fr' ? '2. Connexion Supabase' : '2. اتصال Supabase'}
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'tables'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {lang === 'fr' ? '3. Tables & RLS' : '3. الجداول والأذونات'}
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'sources'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {lang === 'fr' ? '4. Sources IPTV' : '4. سيرفرات IPTV'}
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'catalogue'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {lang === 'fr' ? '5. Catalogue Réel' : '5. إحصائيات المحتوى'}
          </button>
          <button
            onClick={() => setActiveTab('streaming')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'streaming'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {lang === 'fr' ? '6. Synchro & Flux' : '6. فحص البث والتشغيل'}
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/30'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? '7. Script SQL de Correction' : '7. كود SQL للإصلاح'}</span>
          </button>
        </div>
      </div>

      {loading && !report && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-300 font-medium">
            {lang === 'fr'
              ? 'Analyse en cours : vérification de Supabase, interrogation des 10 tables, ping Xtream et audit des flux...'
              : 'جاري فحص اتصال Supabase، اختبار الجداول العشرة، فحص سيرفر Xtream واختبار الروابط...'}
          </p>
        </div>
      )}

      {report && (
        <>
          {/* TAB 1: SYNTHÈSE GLOBALE */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* COMPTEURS RAPIDES */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    {lang === 'fr' ? 'Tests Réussis' : 'الفحوصات الناجحة'}
                  </span>
                  <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{report.passedTests.length}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    {lang === 'fr' ? 'Tests en Erreur / Alertes' : 'الأخطاء والتنبيهات'}
                  </span>
                  <div className="text-2xl font-bold text-rose-400 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>{report.failedTests.length}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    {lang === 'fr' ? 'Chaînes TV Importées' : 'القنوات المستوردة'}
                  </span>
                  <div className="text-2xl font-bold text-indigo-400 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span>{report.catalogue.channels.local.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    {lang === 'fr' ? 'Tables Introuvables' : 'جداول مفقودة'}
                  </span>
                  <div className={`text-2xl font-bold flex items-center gap-2 ${
                    report.missingTables.length > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    <Database className="w-5 h-5 shrink-0" />
                    <span>{report.missingTables.length} / 10</span>
                  </div>
                </div>
              </div>

              {/* LISTE DES CAUSES PROBABLES ET SOLUTIONS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    {lang === 'fr' ? 'Audit des Causes Racines & Solutions Recommandées' : 'أسباب المشاكل والحلول المقترحة'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {report.probableCauses.length} {lang === 'fr' ? 'causes identifiées' : 'أسباب محددة'}
                  </span>
                </div>

                <div className="space-y-3">
                  {report.probableCauses.map((cause, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 text-xs flex items-center justify-center font-mono">
                            {index + 1}
                          </span>
                          <span>{cause.title}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                          cause.category === 'supabase'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {cause.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {cause.description}
                      </p>

                      <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-indigo-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{lang === 'fr' ? 'Solution à appliquer :' : 'طريقة المعالجة :'}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">{cause.solution}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LISTE DÉTAILLÉE DES TESTS SUCCÈS / ÉCHECS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tests Réussis */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'fr' ? 'Tests Réussis' : 'الفحوصات الناجحة'} ({report.passedTests.length})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {report.passedTests.map((t, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tests Échoués */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>{lang === 'fr' ? 'Tests Échoués / Anomalies' : 'الفحوصات غير المكتملة'} ({report.failedTests.length})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {report.failedTests.map((t, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONNEXION SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <span>{lang === 'fr' ? '1. Audit de Connexion Supabase' : '1. فحص اتصال Supabase'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'fr'
                      ? 'Vérification en direct de l’accessibilité HTTP/2, du ping réseau et des clés API.'
                      : 'فحص حي للاتصال بالخادم، سرعة الاستجابة والمفاتيح.'}
                  </p>
                </div>
                {getStatusBadge(report.supabaseConn.status)}
              </div>

              {/* RÉSULTAT DU PING RÉEL */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                report.supabaseConn.status === 'ok'
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}>
                {report.supabaseConn.status === 'ok' ? (
                  <Wifi className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <WifiOff className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-xs uppercase tracking-wide">
                    {report.supabaseConn.message}
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    Latence : {report.supabaseConn.latencyMs}ms | Code HTTP : {report.supabaseConn.httpStatus || 'N/A'}
                  </div>
                  {report.supabaseConn.errorDetails && (
                    <div className="text-[11px] text-slate-400 pt-1">
                      {report.supabaseConn.errorDetails}
                    </div>
                  )}
                </div>
              </div>

              {/* DÉTAIL DES VARIABLES D'ENVIRONNEMENT */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {lang === 'fr' ? 'Variables d’Environnement & Clés' : 'المتغيرات والمفاتيح'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* URL */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 font-bold">SUPABASE_URL</span>
                      {getStatusBadge(report.envCheck.url.status)}
                    </div>
                    <div className="font-mono text-xs text-white break-all">
                      {report.envCheck.url.value}
                    </div>
                    <p className="text-[10px] text-slate-400">{report.envCheck.url.message}</p>
                  </div>

                  {/* Publishable Key */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 font-bold">SUPABASE_PUBLISHABLE_KEY</span>
                      {getStatusBadge(report.envCheck.publishableKey.status)}
                    </div>
                    <div className="font-mono text-xs text-indigo-300">
                      {report.envCheck.publishableKey.masked}
                    </div>
                    <p className="text-[10px] text-slate-400">{report.envCheck.publishableKey.message}</p>
                  </div>

                  {/* Secret Key */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 font-bold">SUPABASE_SECRET_KEY</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                        SÉCURISÉE SERVEUR
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-300">
                      {report.envCheck.secretKey.masked}
                    </div>
                    <p className="text-[10px] text-slate-400">{report.envCheck.secretKey.message}</p>
                  </div>

                  {/* JWKS URL */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 font-bold">SUPABASE_JWKS_URL</span>
                      {getStatusBadge(report.envCheck.jwksUrl.status)}
                    </div>
                    <div className="font-mono text-xs text-white break-all">
                      {report.envCheck.jwksUrl.value}
                    </div>
                    <p className="text-[10px] text-slate-400">{report.envCheck.jwksUrl.message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TABLES & RLS */}
          {activeTab === 'tables' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-purple-400" />
                    <span>{lang === 'fr' ? '2. Diagnostic des Tables & Politiques RLS' : '2. فحص الجداول وقواعد الأمان'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'fr'
                      ? 'Détection réelle sur votre instance Supabase. Aucune table n’est présumée.'
                      : 'فحص الجداول الفعلية والتأكد من وجودها وعدم افتراض أي بيانات.'}
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {report.tables.filter((t) => t.exists).length} / {report.tables.length} {lang === 'fr' ? 'détectées' : 'موجودة'}
                </div>
              </div>

              {report.missingTables.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>{report.missingTables.length} tables introuvables dans Supabase (Erreur PostgREST PGRST205)</span>
                  </div>
                  <p className="text-slate-300">
                    Les tables n’ont pas encore été créées dans le schéma public de PostgreSQL. Ouvrez l’onglet{' '}
                    <button onClick={() => setActiveTab('sql')} className="text-indigo-400 underline font-bold">
                      Script SQL de Correction
                    </button>{' '}
                    pour copier le script d’initialisation.
                  </p>
                </div>
              )}

              {/* GRILLE DES 10 TABLES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.tables.map((t) => (
                  <div
                    key={t.tableName}
                    className={`p-3.5 rounded-xl border space-y-2 transition ${
                      t.status === 'ok'
                        ? 'bg-slate-950 border-emerald-500/30'
                        : t.status === 'warning'
                        ? 'bg-slate-950 border-amber-500/30'
                        : 'bg-slate-950 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">public.{t.tableName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                          RLS
                        </span>
                      </div>
                      {getStatusBadge(t.status)}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400">Statut :</span>
                      <span className={`font-medium ${
                        t.status === 'ok' ? 'text-emerald-400' : t.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {t.message}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Nombre d'entrées :</span>
                      <span className="font-mono font-bold text-slate-200">
                        {t.rowCount !== null ? `${t.rowCount} ligne(s)` : 'Table introuvable'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SOURCES FOURNISSEURS */}
          {activeTab === 'sources' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-400" />
                    <span>{lang === 'fr' ? '3. Diagnostic des Sources Enregistrées' : '3. فحص سيرفرات ومصادر البث'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'fr'
                      ? 'Format (M3U, Xtream, Stalker), état de synchronisation et masquage strict des identifiants.'
                      : 'فحص صيغ الروابط، حالة المزامنة وحماية كلمات المرور من الظهور.'}
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {report.sources.length} {lang === 'fr' ? 'source(s)' : 'سيرفر'}
                </div>
              </div>

              <div className="space-y-3">
                {report.sources.map((src) => (
                  <div
                    key={src.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{src.name}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                            {src.type}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {src.serverUrlSanitized}
                        </p>
                      </div>
                      {getStatusBadge(src.status)}
                    </div>

                    {/* DÉTAIL DES IDENTIFIANTS MASQUÉS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Identifiant :</span>
                        <span className="font-mono text-white">{src.usernameMasked}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Mot de passe :</span>
                        <span className="font-mono text-amber-300">{src.passwordMasked}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Latence réseau :</span>
                        <span className="font-mono text-emerald-400">{src.latencyMs || 0}ms</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Dernière Synchro :</span>
                        <span className="font-mono text-slate-300">
                          {src.lastSyncAt ? new Date(src.lastSyncAt).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* INFO COMPTE FOURNISSEUR */}
                    {src.accountInfo && (
                      <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-[11px] flex items-center justify-between flex-wrap gap-2 text-indigo-200">
                        <span>Statut Fournisseur : <strong className="text-emerald-300">{src.accountInfo.status}</strong></span>
                        <span>Expiration : <strong className="text-slate-200">{src.accountInfo.expDate}</strong></span>
                        <span>Connexions Max : <strong className="text-amber-300">{src.accountInfo.maxConnections}</strong></span>
                        <span>Connexions Actives : <strong className="text-sky-300">{src.accountInfo.activeConnections}</strong></span>
                      </div>
                    )}

                    <div className="text-xs text-slate-300 flex items-center gap-2 pt-1 border-t border-slate-900">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{src.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CATALOGUE RÉEL */}
          {activeTab === 'catalogue' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-indigo-400" />
                    <span>{lang === 'fr' ? '4. Diagnostic du Catalogue (Compteurs Réels)' : '4. تدقيق محتويات البث (أرقام حقيقية)'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'fr'
                      ? 'Comparatif strict entre la mémoire cache locale (3 447 chaînes) et la base Supabase. Aucune statistique inventée.'
                      : 'مقارنة دقيقة بين البيانات المستوردة من السيرفر وما تم حفظه فعلياً في Supabase.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Chaînes */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase">Chaînes TV Direct</span>
                    <Radio className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {report.catalogue.channels.local.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                    <span>Dans Supabase :</span>
                    <span className={report.catalogue.channels.supabase !== null ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {report.catalogue.channels.statusText}
                    </span>
                  </div>
                </div>

                {/* Catégories */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase">Catégories TV</span>
                    <Layers className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {report.catalogue.categories.local.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                    <span>Dans Supabase :</span>
                    <span className={report.catalogue.categories.supabase !== null ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {report.catalogue.categories.statusText}
                    </span>
                  </div>
                </div>

                {/* Films */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase">Films VOD</span>
                    <Film className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {report.catalogue.movies.local.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                    <span>Dans Supabase :</span>
                    <span className={report.catalogue.movies.supabase !== null ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {report.catalogue.movies.statusText}
                    </span>
                  </div>
                </div>

                {/* Séries */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase">Séries VOD</span>
                    <Film className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {report.catalogue.series.local.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                    <span>Dans Supabase :</span>
                    <span className={report.catalogue.series.supabase !== null ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {report.catalogue.series.statusText}
                    </span>
                  </div>
                </div>

                {/* Épisodes */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase">Épisodes</span>
                    <Film className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {report.catalogue.episodes.local}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                    <span>Dans Supabase :</span>
                    <span className={report.catalogue.episodes.supabase !== null ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {report.catalogue.episodes.statusText}
                    </span>
                  </div>
                </div>

                {/* Programmes EPG */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase">Programmes EPG</span>
                    <Calendar className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {report.catalogue.epgPrograms.local}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                    <span>Dans Supabase :</span>
                    <span className={report.catalogue.epgPrograms.supabase !== null ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {report.catalogue.epgPrograms.statusText}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION: TRANSMETTRE LE CATALOGUE À SUPABASE */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <div className="font-bold text-xs text-white">
                    {lang === 'fr' ? 'Transférer le catalogue local vers Supabase' : 'تصدير القنوات إلى Supabase'}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {lang === 'fr'
                      ? 'Une fois les tables créées via le script SQL, injectez automatiquement les catégories et sources dans votre base Supabase.'
                      : 'بعد إنشاء الجداول، يمكنك رفع السيرفر والتصنيفات مباشرة إلى قاعدة البيانات.'}
                  </p>
                </div>

                <button
                  onClick={handlePushCatalogue}
                  disabled={syncingToSupabase}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingToSupabase ? 'animate-spin' : ''}`} />
                  <span>{syncingToSupabase ? 'Injection en cours...' : 'Transmettre à Supabase'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: SYNCHRO & STREAMING */}
          {activeTab === 'streaming' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    <span>{lang === 'fr' ? '5. Diagnostic de Synchronisation & Lecture Vidéo' : '5. تشخيص تحميل M3U والبث المباشر'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'fr'
                      ? 'Analyse des erreurs HTTP 401, blocage Mixed Content (HTTPS vs HTTP) et en-têtes CORS.'
                      : 'تحليل خطأ 401، حظر المحتوى المختلط HTTPS/HTTP وأذونات CORS.'}
                  </p>
                </div>
              </div>

              {/* 5A. TÉLÉCHARGEMENT ET PARSING M3U */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Téléchargement et Parsing du fichier M3U</span>
                  </h4>
                  {getStatusBadge(report.syncAndStream.m3uDownload.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px]">Statut Téléchargement :</span>
                    <div className="font-bold text-emerald-400">
                      {report.syncAndStream.m3uDownload.message}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px]">Entrées Détectées :</span>
                    <div className="font-bold text-indigo-300">
                      {report.syncAndStream.m3uParsing.detectedChannelsCount} chaînes / {report.syncAndStream.m3uParsing.detectedCategoriesCount} catégories
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px]">Enregistrées dans Supabase :</span>
                    <div className="font-bold text-amber-300">
                      {report.syncAndStream.m3uParsing.recordedInSupabaseCount} chaînes
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  {report.syncAndStream.m3uParsing.discrepancyMessage}
                </p>
              </div>

              {/* 5B. ANALYSE DU FLUX VIDÉO & ERREUR 401 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    <span>Test de Lecture du Flux Direct (Explication de l'Erreur)</span>
                  </h4>
                  {getStatusBadge(report.syncAndStream.streamingPlayback.directStatus)}
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>URL Testée :</span>
                    <span className="font-mono text-slate-400 text-[11px] break-all">
                      {report.syncAndStream.streamingPlayback.sampleStreamUrl}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Statut HTTP Serveur :</span>
                    <span className="font-bold font-mono text-rose-400">
                      {report.syncAndStream.streamingPlayback.message}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">En-tête CORS (Access-Control-Allow-Origin) :</span>
                    <span className={report.syncAndStream.streamingPlayback.corsHeaderPresent ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {report.syncAndStream.streamingPlayback.corsHeaderPresent ? 'Présent (*)' : 'Absent'}
                    </span>
                  </div>
                </div>

                {/* EXPLICATION DÉTAILLÉE DE L'ERREUR 401 */}
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2 text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Pourquoi le message « Échec de lecture du flux » s'affiche-t-il ?</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {report.syncAndStream.streamingPlayback.explanation}
                  </p>
                  <div className="pt-2 border-t border-rose-900/40 text-[11px] text-slate-300 space-y-1">
                    <div className="font-semibold text-white">Recommandations pratiques pour le visionnage :</div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                      <li>Activez l'option <strong>« Proxy Serveur BeShare »</strong> dans le lecteur web pour contourner le blocage Mixed Content.</li>
                      <li>Assurez-vous qu'aucun autre appareil n'utilise actuellement vos identifiants IPTV (le serveur TONSTV limite à 1 flux actif).</li>
                      <li>Téléchargez la playlist M3U complète via le bouton « Télécharger M3U » et lisez-la dans VLC ou l'application Android TV locale.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SCRIPT SQL DE MIGRATION */}
          {activeTab === 'sql' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-purple-400" />
                    <span>Script SQL de Migration Rapide pour Supabase</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Crée les 10 tables manquantes, configure la sécurité RLS et résout immédiatement l'erreur PGRST205.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20"
                  >
                    {copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'Script Copié !' : 'Copier le Script SQL'}</span>
                  </button>

                  <a
                    href="https://supabase.com/dashboard/project/plsudqoqpcpmzrhbewle/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    <span>Ouvrir SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* INSTRUCTIONS EN 3 ÉTAPES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-indigo-400">Étape 1</div>
                  <p className="text-slate-300 text-[11px]">
                    Cliquez sur <strong>« Copier le Script SQL »</strong> ci-dessus.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-indigo-400">Étape 2</div>
                  <p className="text-slate-300 text-[11px]">
                    Ouvrez le <strong>SQL Editor</strong> de votre projet Supabase.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-indigo-400">Étape 3</div>
                  <p className="text-slate-300 text-[11px]">
                    Collez le code et cliquez sur <strong>Run</strong>. Revenez ici et cliquez sur « Relancer le Diagnostic ».
                  </p>
                </div>
              </div>

              {/* CODE SQL PRÊT À L'EMPLOI */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-96 leading-relaxed">
                  {report.suggestedSqlMigration}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
