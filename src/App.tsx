/**
 * BeShare TV — Panneau d'Administration Web Central & Orchestrateur
 * Technologies : React, TypeScript, Vite, Tailwind CSS et Supabase
 * Déploiement : Vercel
 * Bilingue : Français et Arabe (Support RTL complet)
 */
import React, { useState, useEffect } from 'react';
import {
  Tv,
  Server,
  Plus,
  RefreshCw,
  Play,
  Layers,
  History,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Film,
  ListVideo,
  Globe,
  Settings,
  Lock,
  Cpu,
  Search,
  Check,
  ChevronRight,
  ExternalLink,
  Clock,
  Zap,
  Power,
  Smartphone
} from 'lucide-react';

import { Source, Category, Channel, SyncLog } from './types';
import { SourceService } from './services/sourceService';
import { SourceModal } from './components/SourceModal';
import { StreamPlayerModal } from './components/StreamPlayerModal';
import { CategoryManager } from './components/CategoryManager';
import { SyncLogsView } from './components/SyncLogsView';
import { VercelDeployGuide } from './components/VercelDeployGuide';
import { AndroidApiPlayground } from './components/AndroidApiPlayground';
import { getSavedSupabaseConfig, saveSupabaseConfig, getSupabaseClient } from './lib/supabase';
import { testUrlSSRF } from './lib/edgeTester';
import { SQL_TABLES } from './data/schemaData';

export default function App() {
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const [activeSection, setActiveSection] = useState<'sources' | 'channels' | 'categories' | 'logs' | 'android_api' | 'ssrf_lab' | 'database' | 'vercel'>('android_api');

  // Core Data State
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playingChannel, setPlayingChannel] = useState<Channel | null>(null);

  // Syncing state per source ID
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search filter for channels
  const [channelSearch, setChannelSearch] = useState('');

  // Supabase Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [testingConn, setTestingConn] = useState(false);
  const [connVerified, setConnVerified] = useState(false);

  // SSRF Lab State
  const [labUrl, setLabUrl] = useState('http://169.254.169.254/latest/meta-data');
  const [labReport, setLabReport] = useState(() => testUrlSSRF('http://169.254.169.254/latest/meta-data'));

  const isRTL = lang === 'ar';

  useEffect(() => {
    loadAllData();
    const config = getSavedSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseAnonKey(config.anonKey);
    if (config.url && config.anonKey) {
      setConnVerified(true);
    }
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [srcs, cats, chs, logs] = await Promise.all([
        SourceService.getSources(),
        SourceService.getCategories(),
        SourceService.getChannels(),
        SourceService.getSyncLogs(),
      ]);
      setSources(srcs);
      setCategories(cats);
      setChannels(chs);
      setSyncLogs(logs);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Actions
  const handleAddSource = () => {
    setEditingSource(null);
    setIsSourceModalOpen(true);
  };

  const handleEditSource = (source: Source) => {
    setEditingSource(source);
    setIsSourceModalOpen(true);
  };

  const handleToggleSource = async (id: string, current: boolean) => {
    await SourceService.toggleSourceActive(id, current);
    const updated = await SourceService.getSources();
    setSources(updated);
    showNotification('success', lang === 'fr' ? 'Statut de la source mis à jour' : 'تم تحديث حالة المصدر');
  };

  const handleDeleteSource = async (id: string) => {
    if (window.confirm(lang === 'fr' ? 'Supprimer cette source et tout son contenu associé ?' : 'هل أنت متأكد من حذف هذا المصدر وجميع محتوياته؟')) {
      await SourceService.deleteSource(id);
      await loadAllData();
      showNotification('success', lang === 'fr' ? 'Source supprimée avec succès' : 'تم حذف المصدر بنجاح');
    }
  };

  const handleLaunchSync = async (sourceId: string) => {
    setSyncingId(sourceId);
    const res = await SourceService.triggerSync(sourceId);
    setSyncingId(null);

    await loadAllData();
    if (res.success) {
      showNotification('success', res.message);
    } else {
      showNotification('error', res.message);
    }
  };

  const handlePlayChannel = (channel: Channel) => {
    setPlayingChannel(channel);
    setIsPlayerOpen(true);
  };

  const handleToggleCategory = async (id: string, current: boolean) => {
    await SourceService.toggleCategoryVisibility(id, current);
    const cats = await SourceService.getCategories();
    setCategories(cats);
  };

  const handleToggleChannel = async (id: string, current: boolean) => {
    await SourceService.toggleChannelActive(id, current);
    const chs = await SourceService.getChannels();
    setChannels(chs);
  };

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
    (ch.category_name && ch.category_name.toLowerCase().includes(channelSearch.toLowerCase()))
  );

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white">BeShare TV</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  {lang === 'fr' ? 'Panneau d’Administration' : 'لوحة التحكم'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'fr' ? 'Gestion des Sources, Catalogue & Android TV' : 'إدارة المصادر والكتالوج وشاشات أندرويد'}
              </p>
            </div>
          </div>

          {/* Quick Actions & Language Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddSource}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              {lang === 'fr' ? 'Ajouter une Source' : 'إضافة مصدر'}
            </button>

            {/* Language Switcher */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  lang === 'fr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                FR
              </button>
              <button
                onClick={() => setLang('ar')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  lang === 'ar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                العربية
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Navigation */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar / Navigation Pill Tabs */}
        <aside className="w-full md:w-64 shrink-0 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2">
            {lang === 'fr' ? 'Navigation Principale' : 'القائمة الرئيسية'}
          </div>

          <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveSection('sources')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'sources'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4" />
                <span>{lang === 'fr' ? 'Sources Autorisées' : 'المصادر المعتمدة'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeSection === 'sources' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {sources.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('channels')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'channels'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4" />
                <span>{lang === 'fr' ? 'Chaînes Direct & Test' : 'القنوات والبث الحي'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeSection === 'channels' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {channels.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('categories')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'categories'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>{lang === 'fr' ? 'Catégories (FR / AR)' : 'التصنيفات واللغات'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeSection === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('logs')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'logs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4" />
                <span>{lang === 'fr' ? 'Journaux de Synchro' : 'سجلات المزامنة'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeSection === 'logs' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {syncLogs.length}
              </span>
            </button>

            <div className="pt-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 hidden md:block">
              {lang === 'fr' ? 'Architecture & Déploiement' : 'الهندسة والنشر'}
            </div>

            <button
              onClick={() => setActiveSection('ssrf_lab')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'ssrf_lab'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'fr' ? 'Sécurité Anti-SSRF' : 'الأمان ومكافحة SSRF'}</span>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('database')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'database'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>{lang === 'fr' ? 'Schéma Supabase (RLS)' : 'قاعدة البيانات RLS'}</span>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('android_api')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'android_api'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'fr' ? 'API Client Android (Étape 4)' : 'واجهة أندرويد (المرحلة 4)'}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                API
              </span>
            </button>

            <button
              onClick={() => setActiveSection('vercel')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'vercel'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-[11px]">▲</span>
                <span>{lang === 'fr' ? 'Déploiement Vercel' : 'نشر Vercel'}</span>
              </div>
            </button>
          </div>

          {/* Android Sync Status Indicator */}
          <div className="hidden md:block p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2 mt-4">
            <div className="text-slate-400 font-semibold text-[11px] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'fr' ? 'Synchronisation Android' : 'مزامنة أندرويد'}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'fr'
                ? 'L’application Android TV récupère automatiquement les modifications sans mise à jour APK.'
                : 'يقوم تطبيق تلفزيون أندرويد بتحديث القنوات تلقائياً دون الحاجة لإعادة تثبيت التطبيق.'}
            </p>
          </div>
        </aside>

        {/* Center Content Workspace */}
        <main className="flex-1 space-y-5 min-w-0">
          
          {/* Action Notification Toast */}
          {actionNotice && (
            <div className={`p-4 rounded-xl border flex items-center justify-between animate-in slide-in-from-top-2 duration-200 text-xs ${
              actionNotice.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/40'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-200 shadow-lg shadow-rose-950/40'
            }`}>
              <div className="flex items-center gap-2">
                {actionNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span className="font-medium">{actionNotice.message}</span>
              </div>
            </div>
          )}

          {/* SECTION 1: SOURCES MANAGEMENT */}
          {activeSection === 'sources' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-400" />
                    {lang === 'fr' ? 'Gestion des Sources Fournisseurs' : 'إدارة مصادر المزودين'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'fr'
                      ? 'Configurez vos sources M3U, Xtream Codes et Stalker Portal. Lancement et diagnostic en direct.'
                      : 'إعداد مصادر M3U و Xtream Codes و Stalker Portal. إطلاق المزامنة والفحص الفوري.'}
                  </p>
                </div>

                <button
                  onClick={handleAddSource}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all self-stretch sm:self-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  {lang === 'fr' ? 'Nouvelle Source' : 'إضافة مصدر'}
                </button>
              </div>

              {/* Sources Cards Grid */}
              <div className="grid grid-cols-1 gap-4">
                {sources.map((src) => {
                  const isSyncing = syncingId === src.id || src.last_sync_status === 'running';

                  return (
                    <div
                      key={src.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        src.is_active
                          ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-xl'
                          : 'bg-slate-900/40 border-slate-850 opacity-70'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase ${
                              src.type === 'm3u'
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                : src.type === 'xtream'
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}>
                              {src.type === 'm3u' ? 'M3U / M3U8' : src.type === 'xtream' ? 'Xtream Codes' : 'Stalker Portal'}
                            </span>

                            <h3 className="font-bold text-sm text-white">{src.name}</h3>

                            {/* Status Badge */}
                            {src.last_sync_status === 'success' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {lang === 'fr' ? 'Synchronisé' : 'متزامن'}
                              </span>
                            )}
                            {src.last_sync_status === 'failed' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {lang === 'fr' ? 'Erreur' : 'خطأ'}
                              </span>
                            )}
                            {isSyncing && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium flex items-center gap-1 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" /> {lang === 'fr' ? 'Synchro en cours...' : 'جارٍ المزامنة...'}
                              </span>
                            )}
                          </div>

                          {/* URL & Credentials Summary (Sanitized) */}
                          <div className="font-mono text-xs text-slate-400 flex flex-wrap items-center gap-4">
                            <span className="truncate max-w-md">
                              {src.server_url.replace(/(live\/[^\/]+\/)[^\/]+(\/)/, '$1[PROTÉGÉ]$2')}
                            </span>
                            {src.type === 'stalker' && src.mac_address && (
                              <span className="text-amber-400">MAC: {src.mac_address}</span>
                            )}
                            {src.type === 'xtream' && (
                              <span className="text-indigo-400">User: {src.username}</span>
                            )}
                          </div>

                          {/* Last Sync Info */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {lang === 'fr' ? 'Dernière synchro :' : 'آخر مزامنة:'}{' '}
                              {src.last_sync_at ? new Date(src.last_sync_at).toLocaleString() : (lang === 'fr' ? 'Jamais' : 'أبداً')}
                            </span>
                            <span>•</span>
                            <span>
                              {lang === 'fr' ? 'Fréquence :' : 'الدورة:'} {src.sync_interval_hours}h
                            </span>
                          </div>

                          {/* Error message preview if failed */}
                          {src.last_error && (
                            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-mono">
                              <span className="font-bold text-rose-400">Erreur : </span>
                              {src.last_error}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                          {/* Sync Button */}
                          <button
                            onClick={() => handleLaunchSync(src.id)}
                            disabled={isSyncing}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing
                              ? (lang === 'fr' ? 'Synchro...' : 'مزامنة...')
                              : (lang === 'fr' ? 'Synchroniser' : 'مزامنة الآن')}
                          </button>

                          {/* Toggle Active Switch */}
                          <button
                            onClick={() => handleToggleSource(src.id, src.is_active)}
                            className={`p-2 rounded-xl border transition-colors ${
                              src.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                            title={src.is_active ? (lang === 'fr' ? 'Désactiver la source' : 'تعطيل المصدر') : (lang === 'fr' ? 'Activer la source' : 'تفعيل المصدر')}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Edit Source */}
                          <button
                            onClick={() => handleEditSource(src)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title={lang === 'fr' ? 'Modifier' : 'تعديل'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Source */}
                          <button
                            onClick={() => handleDeleteSource(src.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                            title={lang === 'fr' ? 'Supprimer' : 'حذف'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: CHANNELS & STREAM PLAYER */}
          {activeSection === 'channels' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-sky-400" />
                    {lang === 'fr' ? 'Chaînes TV en Direct & Lecteur de Test' : 'قنوات البث التلفزيوني ومحاكي التشغيل'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'fr'
                      ? 'Testez la lecture directe de vos flux HLS (.m3u8) et vérifiez la conformité des chaînes pour Android TV.'
                      : 'تجربة تشغيل روابط HLS ومطابقتها قبل بثها إلى شاشات أندرويد.'}
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder={lang === 'fr' ? 'Rechercher une chaîne...' : 'بحث عن قناة...'}
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Channels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between group ${
                      ch.is_active
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                        : 'bg-slate-900/50 border-slate-850 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ch.logo_url ? (
                        <img
                          src={ch.logo_url}
                          alt={ch.name}
                          className="w-10 h-10 rounded-xl object-contain bg-slate-950 p-1 border border-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                          <Radio className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                          {ch.channel_num && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                              #{ch.channel_num}
                            </span>
                          )}
                          <span className="truncate">{ch.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {ch.category_name || (lang === 'fr' ? 'Généraliste' : 'عام')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Live Test Stream Button */}
                      <button
                        onClick={() => handlePlayChannel(ch)}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                        title={lang === 'fr' ? 'Tester le flux en direct' : 'تجربة تشغيل البث'}
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{lang === 'fr' ? 'Tester' : 'تشغيل'}</span>
                      </button>

                      {/* Active Toggle */}
                      <button
                        onClick={() => handleToggleChannel(ch.id, ch.is_active)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          ch.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title={ch.is_active ? 'Actif' : 'Inactif'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: CATEGORIES MANAGER */}
          {activeSection === 'categories' && (
            <CategoryManager
              categories={categories}
              onToggleVisibility={handleToggleCategory}
              lang={lang}
            />
          )}

          {/* SECTION 4: SYNC LOGS & ERROR AUDIT */}
          {activeSection === 'logs' && (
            <SyncLogsView
              logs={syncLogs}
              onRefresh={loadAllData}
              lang={lang}
            />
          )}

          {/* SECTION 5: SSRF LAB */}
          {activeSection === 'ssrf_lab' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  {lang === 'fr' ? 'Laboratoire de Test Anti-SSRF (Étape 2)' : 'مختبر فحص الحماية من ثغرات SSRF'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'fr'
                    ? 'Testez les règles de blocage des IPs privées, loopback et métadonnées cloud utilisées par le backend.'
                    : 'اختبار قواعد الحظر المفروضة على الشبكات الداخلية والبيانات السحابية.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={labUrl}
                  onChange={(e) => {
                    setLabUrl(e.target.value);
                    setLabReport(testUrlSSRF(e.target.value));
                  }}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                  placeholder="http://169.254.169.254/latest/meta-data"
                />
              </div>

              <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                labReport.isSafe
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                {labReport.isSafe ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {labReport.isSafe ? 'URL AUTORISÉE' : 'REQUÊTE BLOQUÉE PAR ANTI-SSRF'}
                  </div>
                  <div>{labReport.blockedReason || 'URL publique valide'}</div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: DATABASE SCHEMA INSPECTOR */}
          {activeSection === 'database' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                {lang === 'fr' ? 'Tables & Politiques RLS Supabase (Étape 1)' : 'جداول وقواعد حماية Supabase RLS'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SQL_TABLES.map((t) => (
                  <div key={t.name} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">public.{t.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">RLS</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{lang === 'fr' ? t.descriptionFr : t.descriptionAr}</p>
                    <div className="text-[10px] text-indigo-400 font-mono pt-1">
                      {lang === 'fr' ? t.securityFr : t.securityAr}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: ANDROID API GATEWAY (ÉTAPE 4) */}
          {activeSection === 'android_api' && (
            <AndroidApiPlayground lang={lang} />
          )}

          {/* SECTION 7: VERCEL DEPLOYMENT */}
          {activeSection === 'vercel' && (
            <VercelDeployGuide lang={lang} />
          )}

        </main>
      </div>

      {/* Modals */}
      <SourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onSaved={loadAllData}
        sourceToEdit={editingSource}
        lang={lang}
      />

      <StreamPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        channel={playingChannel}
        lang={lang}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500 bg-slate-900/60 mt-auto">
        BeShare TV &copy; {new Date().getFullYear()} — Console d'Administration & Déploiement Vercel
      </footer>
    </div>
  );
}
