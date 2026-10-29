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
  Smartphone,
  Code2,
  Calendar,
  CheckSquare,
  Square,
  Minus,
  FolderInput,
  X,
  Filter,
  RotateCcw
} from 'lucide-react';

import { Source, Category, Channel, SyncLog, SourceType } from './types';
import { SourceService } from './services/sourceService';
import { SourceModal } from './components/SourceModal';
import { StreamPlayerModal } from './components/StreamPlayerModal';
import { CategoryManager } from './components/CategoryManager';
import { SyncLogsView } from './components/SyncLogsView';
import { VercelDeployGuide } from './components/VercelDeployGuide';
import { AndroidApiPlayground } from './components/AndroidApiPlayground';
import { AndroidCodeExplorer } from './components/AndroidCodeExplorer';
import { EndToEndTestRunner } from './components/EndToEndTestRunner';
import { VodManager } from './components/VodManager';
import { EpgGuideView } from './components/EpgGuideView';
import { getSavedSupabaseConfig, saveSupabaseConfig, getSupabaseClient } from './lib/supabase';
import { testUrlSSRF } from './lib/edgeTester';
import { SQL_TABLES } from './data/schemaData';

export default function App() {
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const [activeSection, setActiveSection] = useState<'sources' | 'channels' | 'vod' | 'epg' | 'categories' | 'logs' | 'android_api' | 'android_code' | 'e2e_tests' | 'ssrf_lab' | 'database' | 'vercel'>('sources');

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

  // Source modal configuration state
  const [sourceTypeForModal, setSourceTypeForModal] = useState<SourceType>('xtream');

  // Actions
  const handleAddSourceWithType = (type: SourceType = 'xtream') => {
    setEditingSource(null);
    setSourceTypeForModal(type);
    setIsSourceModalOpen(true);
  };

  const handleAddSource = () => {
    handleAddSourceWithType('xtream');
  };

  const handleEditSource = (source: Source) => {
    setEditingSource(source);
    setSourceTypeForModal(source.type);
    setIsSourceModalOpen(true);
  };

  const handleResetAllData = async () => {
    const confirmMsg =
      lang === 'fr'
        ? 'Réinitialiser entièrement les données locales ? Tous les serveurs et chaînes seront vidés.'
        : 'هل أنت متأكد من تفريغ كافة البيانات؟ سيتم مسح كافة السيرفرات والقنوات المحلية.';
    if (!window.confirm(confirmMsg)) return;

    SourceService.clearAllData();
    await loadAllData();
    showNotification(
      'success',
      lang === 'fr'
        ? 'Toutes les données ont été réinitialisées avec succès'
        : 'تم تفريغ وحذف جميع البيانات بنجاح'
    );
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

  const handlePlayStream = (title: string, streamUrl: string) => {
    setPlayingChannel({
      id: `preview-${Date.now()}`,
      source_id: 'preview',
      name: title,
      stream_url: streamUrl,
      stream_type: 'vod',
      is_active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
    });
    setIsPlayerOpen(true);
  };

  // Channel Bulk Actions State
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());
  const [channelCategoryFilter, setChannelCategoryFilter] = useState<string>('all');
  const [isMoveCategoryOpen, setIsMoveCategoryOpen] = useState(false);
  const [targetCategoryForMove, setTargetCategoryForMove] = useState<string>('');
  const [batchActionLoading, setBatchActionLoading] = useState(false);

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

  const filteredChannels = channels.filter((ch) => {
    const matchesSearch =
      ch.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
      (ch.category_name && ch.category_name.toLowerCase().includes(channelSearch.toLowerCase()));
    const matchesCategory =
      channelCategoryFilter === 'all' || ch.category_id === channelCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isAllFilteredSelected =
    filteredChannels.length > 0 &&
    filteredChannels.every((ch) => selectedChannelIds.has(ch.id));

  const isSomeFilteredSelected =
    filteredChannels.some((ch) => selectedChannelIds.has(ch.id)) && !isAllFilteredSelected;

  const handleToggleSelectChannel = (id: string) => {
    setSelectedChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Unselect all filtered channels
      setSelectedChannelIds((prev) => {
        const next = new Set(prev);
        filteredChannels.forEach((ch) => next.delete(ch.id));
        return next;
      });
    } else {
      // Select all filtered channels
      setSelectedChannelIds((prev) => {
        const next = new Set(prev);
        filteredChannels.forEach((ch) => next.add(ch.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedChannelIds(new Set());
  };

  const handleBatchToggleActive = async (isActive: boolean) => {
    if (selectedChannelIds.size === 0) return;
    setBatchActionLoading(true);
    const ids = Array.from(selectedChannelIds);
    await SourceService.setChannelsActive(ids, isActive);
    const updated = await SourceService.getChannels();
    setChannels(updated);
    setBatchActionLoading(false);
    showNotification(
      'success',
      lang === 'fr'
        ? `${ids.length} chaîne(s) ${isActive ? 'activée(s)' : 'désactivée(s)'} avec succès`
        : `${isActive ? 'تم تفعيل' : 'تم تعطيل'} ${ids.length} قناة بنجاح`
    );
  };

  const handleBatchDelete = async () => {
    if (selectedChannelIds.size === 0) return;
    const count = selectedChannelIds.size;
    const confirmMsg =
      lang === 'fr'
        ? `Supprimer définitivement ${count} chaîne(s) sélectionnée(s) ?`
        : `هل أنت متأكد من حذف ${count} قناة محددة بشكل نهائي؟`;
    if (!window.confirm(confirmMsg)) return;

    setBatchActionLoading(true);
    const ids = Array.from(selectedChannelIds);
    await SourceService.deleteChannels(ids);
    setSelectedChannelIds(new Set());
    await loadAllData();
    setBatchActionLoading(false);
    showNotification(
      'success',
      lang === 'fr'
        ? `${count} chaîne(s) supprimée(s) avec succès`
        : `تم حذف ${count} قناة بنجاح`
    );
  };

  const handleBatchMoveCategory = async () => {
    if (selectedChannelIds.size === 0 || !targetCategoryForMove) return;
    setBatchActionLoading(true);
    const ids = Array.from(selectedChannelIds);
    await SourceService.moveChannelsToCategory(ids, targetCategoryForMove);
    setIsMoveCategoryOpen(false);
    const targetCat = categories.find((c) => c.id === targetCategoryForMove);
    setTargetCategoryForMove('');
    await loadAllData();
    setBatchActionLoading(false);
    showNotification(
      'success',
      lang === 'fr'
        ? `${ids.length} chaîne(s) déplacée(s) vers « ${targetCat?.name || 'Catégorie'} »`
        : `تم نقل ${ids.length} قناة إلى « ${targetCat?.name_ar || targetCat?.name || 'التصنيف'} »`
    );
  };

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
              onClick={() => setActiveSection('vod')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'vod'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4 text-pink-400" />
                <span>{lang === 'fr' ? 'Films & Séries (VOD)' : 'الأفلام والمسلسلات VOD'}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-pink-500/20 text-pink-300 font-mono">
                VOD
              </span>
            </button>

            <button
              onClick={() => setActiveSection('epg')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'epg'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>{lang === 'fr' ? 'Guide TV (EPG)' : 'دليل البرامج EPG'}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 font-mono">
                EPG
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
              onClick={() => setActiveSection('android_code')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'android_code'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span>{lang === 'fr' ? 'App Android Kotlin (Étape 5)' : 'كود أندرويد (المرحلة 5)'}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono">
                KOTLIN
              </span>
            </button>

            <button
              onClick={() => setActiveSection('e2e_tests')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSection === 'e2e_tests'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'fr' ? 'Tests Bout en Bout (Étape 6)' : 'الفحص الشامل (المرحلة 6)'}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                TESTS
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
                      ? 'Configurez exclusivement vos propres accès Xtream Codes, Stalker Portal ou M3U. Aucun serveur par défaut.'
                      : 'إعداد اشتراكاتك الخاصة حصرياً (Xtream Codes أو Stalker أو M3U). لا توجد أي سيرفرات افتراضية.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  {sources.length > 0 && (
                    <button
                      onClick={handleResetAllData}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/40 border border-slate-700 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title={lang === 'fr' ? 'Tout réinitialiser' : 'إعادة ضبط وحذف الكل'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{lang === 'fr' ? 'Tout vider' : 'تفريغ الكل'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleAddSource}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all justify-center cursor-pointer flex-1 sm:flex-initial"
                  >
                    <Plus className="w-4 h-4" />
                    {lang === 'fr' ? 'Nouvelle Source' : 'إضافة مصدر'}
                  </button>
                </div>
              </div>

              {/* Sources List or Empty State */}
              {sources.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                    <Server className="w-8 h-8" />
                  </div>

                  <div className="max-w-xl mx-auto space-y-2">
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {lang === 'fr'
                        ? 'Tous les serveurs par défaut ont été retirés'
                        : 'تمت إزالة كافة السيرفرات الافتراضية'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {lang === 'fr'
                        ? 'Ajoutez directement vos propres identifiants Xtream Codes IPTV, votre portail Stalker (MAG) ou votre playlist M3U pour alimenter votre catalogue :'
                        : 'أضف مباشرة بيانات اشتراكك في Xtream Codes أو بوابة Stalker (MAG) أو رابط M3U لبدء الاستخدام:'}
                    </p>
                  </div>

                  {/* 3 Quick Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto pt-2">
                    {/* 1. Xtream Codes */}
                    <div
                      onClick={() => handleAddSourceWithType('xtream')}
                      className="group relative p-5 rounded-2xl bg-slate-950/90 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-950/20 transition-all cursor-pointer shadow-lg flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                              Xtream Codes IPTV
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                              RECOMMANDÉ
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {lang === 'fr'
                              ? 'URL du serveur, identifiant (Username) et mot de passe (Password).'
                              : 'رابط الخادم واسم المستخدم وكلمة مرور حساب Xtream.'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                        <span>{lang === 'fr' ? 'Configurer Xtream Codes' : 'إعداد Xtream Codes'}</span>
                        <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* 2. Stalker Portal */}
                    <div
                      onClick={() => handleAddSourceWithType('stalker')}
                      className="group relative p-5 rounded-2xl bg-slate-950/90 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/20 transition-all cursor-pointer shadow-lg flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Radio className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                              Portail Stalker (MAG)
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                              MAC MAG
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {lang === 'fr'
                              ? 'URL du portail Ministra / Stalker et votre adresse MAC MAG (00:1A:79:...).'
                              : 'رابط بوابة Stalker مع عنوان MAC للجهاز المسجل (00:1A:79:...).'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
                        <span>{lang === 'fr' ? 'Configurer Stalker' : 'إعداد بوابة Stalker'}</span>
                        <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* 3. M3U Playlist */}
                    <div
                      onClick={() => handleAddSourceWithType('m3u')}
                      className="group relative p-5 rounded-2xl bg-slate-950/90 border border-sky-500/30 hover:border-sky-400 hover:bg-sky-950/20 transition-all cursor-pointer shadow-lg flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ListVideo className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors">
                              Lien M3U / M3U8
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                              FICHIER / LIEN
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {lang === 'fr'
                              ? 'Lien direct HTTP/HTTPS vers votre playlist M3U ou flux M3U8.'
                              : 'رابط مباشر لقائمة تشغيل M3U أو بث M3U8 مباشر.'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:text-sky-300">
                        <span>{lang === 'fr' ? 'Configurer M3U' : 'إعداد رابط M3U'}</span>
                        <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Sources Cards Grid */
                <div className="grid grid-cols-1 gap-4">
                  {sources.map((src) => {
                    const isSyncing = syncingId === src.id || src.last_sync_status === 'running';

                    return (
                      <div
                        key={src.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          src.is_active
                            ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-xl'
                            : 'bg-slate-900/40 border-slate-855 opacity-70'
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
                              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                              {isSyncing
                                ? (lang === 'fr' ? 'Synchro...' : 'مزامنة...')
                                : (lang === 'fr' ? 'Synchroniser' : 'مزامنة الآن')}
                            </button>

                            {/* Toggle Active Switch */}
                            <button
                              onClick={() => handleToggleSource(src.id, src.is_active)}
                              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
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
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                              title={lang === 'fr' ? 'Modifier' : 'تعديل'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete Source */}
                            <button
                              onClick={() => handleDeleteSource(src.id)}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
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
              )}
            </div>
          )}

          {/* SECTION 2: CHANNELS & STREAM PLAYER */}
          {activeSection === 'channels' && (
            <div className="space-y-4">
              {/* Header with Search and Category Filter */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-sky-400" />
                    {lang === 'fr' ? 'Chaînes TV en Direct & Lecteur de Test' : 'قنوات البث التلفزيوني ومحاكي التشغيل'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'fr'
                      ? 'Testez vos flux, activez ou déplacez vos chaînes par lot en un clic.'
                      : 'تجربة تشغيل روابط HLS، وتفعيل أو نقل أو حذف القنوات دفعة واحدة.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                  {/* Category Filter Select */}
                  <div className="relative min-w-[180px]">
                    <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={channelCategoryFilter}
                      onChange={(e) => setChannelCategoryFilter(e.target.value)}
                      className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="all">
                        {lang === 'fr' ? 'Toutes les catégories' : 'جميع التصنيفات'} ({channels.length})
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === 'ar' && c.name_ar ? c.name_ar : c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder={lang === 'fr' ? 'Rechercher une chaîne...' : 'بحث عن قناة...'}
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bulk Actions Control Bar */}
              <div className={`p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                selectedChannelIds.size > 0
                  ? 'bg-indigo-950/40 border-indigo-500/40 shadow-lg shadow-indigo-950/30'
                  : 'bg-slate-900/80 border-slate-800'
              }`}>
                {/* Select All Checkbox & Count */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title={isAllFilteredSelected ? (lang === 'fr' ? 'Tout désélectionner' : 'إلغاء تحديد الكل') : (lang === 'fr' ? 'Tout sélectionner' : 'تحديد الكل')}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                      isAllFilteredSelected
                        ? 'bg-indigo-600 text-white'
                        : isSomeFilteredSelected
                        ? 'bg-indigo-600/40 text-indigo-300'
                        : 'border border-slate-500'
                    }`}>
                      {isAllFilteredSelected ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : isSomeFilteredSelected ? (
                        <Minus className="w-3 h-3 stroke-[3]" />
                      ) : null}
                    </span>
                    <span>
                      {isAllFilteredSelected
                        ? (lang === 'fr' ? 'Tout désélectionner' : 'إلغاء التحديد')
                        : (lang === 'fr' ? 'Tout sélectionner' : 'تحديد الكل')}
                    </span>
                  </button>

                  {/* Selection counter badge */}
                  {selectedChannelIds.size > 0 ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      {selectedChannelIds.size} {lang === 'fr' ? 'sélectionnée(s)' : 'محددة'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {lang === 'fr'
                        ? `${filteredChannels.length} chaîne(s) affichée(s)`
                        : `عرض ${filteredChannels.length} قناة`}
                    </span>
                  )}
                </div>

                {/* Batch Actions Buttons (Active when at least 1 is selected) */}
                {selectedChannelIds.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
                    {/* Batch Activate */}
                    <button
                      type="button"
                      disabled={batchActionLoading}
                      onClick={() => handleBatchToggleActive(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title={lang === 'fr' ? 'Activer les chaînes sélectionnées' : 'تفعيل القنوات المحددة'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'fr' ? 'Activer' : 'تفعيل'}</span>
                    </button>

                    {/* Batch Deactivate */}
                    <button
                      type="button"
                      disabled={batchActionLoading}
                      onClick={() => handleBatchToggleActive(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title={lang === 'fr' ? 'Désactiver les chaînes sélectionnées' : 'تعطيل القنوات المحددة'}
                    >
                      <Power className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lang === 'fr' ? 'Désactiver' : 'تعطيل'}</span>
                    </button>

                    {/* Batch Move to Category */}
                    <button
                      type="button"
                      disabled={batchActionLoading}
                      onClick={() => {
                        setTargetCategoryForMove(categories[0]?.id || '');
                        setIsMoveCategoryOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                      title={lang === 'fr' ? 'Déplacer vers une autre catégorie' : 'نقل إلى تصنيف آخر'}
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                      <span>{lang === 'fr' ? 'Déplacer vers...' : 'نقل إلى تصنيف...'}</span>
                    </button>

                    {/* Batch Delete */}
                    <button
                      type="button"
                      disabled={batchActionLoading}
                      onClick={handleBatchDelete}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title={lang === 'fr' ? 'Supprimer les chaînes sélectionnées' : 'حذف القنوات المحددة'}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>{lang === 'fr' ? 'Supprimer' : 'حذف'}</span>
                    </button>

                    {/* Clear selection */}
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={lang === 'fr' ? 'Annuler la sélection' : 'إلغاء التحديد'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Channels Grid */}
              {filteredChannels.length === 0 ? (
                <div className="p-10 sm:p-14 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 text-sky-400 flex items-center justify-center mx-auto shadow-inner">
                    <Radio className="w-7 h-7" />
                  </div>

                  {sources.length === 0 ? (
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="font-bold text-white text-base">
                        {lang === 'fr' ? 'Aucune chaîne — Aucun serveur actif' : 'لا توجد قنوات — لا يوجد سيرفر مفعل حالياً'}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {lang === 'fr'
                          ? 'Tous les serveurs par défaut ont été retirés. Ajoutez directement votre compte Xtream Codes, votre portail Stalker ou votre fichier M3U pour commencer.'
                          : 'تمت إزالة كافة السيرفرات الافتراضية. أضف بيانات اشتراكك في Xtream Codes أو Stalker أو M3U لتحميل القنوات مباشرة.'}
                      </p>
                      <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={() => handleAddSourceWithType('xtream')}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                        >
                          <Zap className="w-4 h-4" />
                          <span>{lang === 'fr' ? 'Ajouter Xtream Codes' : 'إضافة Xtream Codes'}</span>
                        </button>
                        <button
                          onClick={() => handleAddSourceWithType('m3u')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ListVideo className="w-4 h-4" />
                          <span>{lang === 'fr' ? 'Ajouter M3U / Stalker' : 'إضافة M3U / Stalker'}</span>
                        </button>
                      </div>
                    </div>
                  ) : channels.length === 0 ? (
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="font-bold text-white text-base">
                        {lang === 'fr' ? 'Aucune chaîne synchronisée' : 'لم يتم استيراد قنوات بعد'}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {lang === 'fr'
                          ? 'Vos sources sont configurées mais aucune chaîne n’a encore été synchronisée. Lancez une synchronisation depuis l’onglet Sources.'
                          : 'مصادر البث معرفة لديك ولكن لم تتم مزامنة القنوات بعد. اضغط على زر المزامنة في قسم السيرفرات.'}
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={() => setActiveSection('sources')}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer mx-auto"
                        >
                          <Server className="w-4 h-4" />
                          <span>{lang === 'fr' ? 'Aller aux Sources & Synchroniser' : 'الانتقال لقسم السيرفرات والمزامنة'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="font-bold text-white text-base">
                        {lang === 'fr' ? 'Aucune chaîne ne correspond à vos filtres' : 'لا توجد قنوات تطابق البحث الحالي'}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {lang === 'fr'
                          ? 'Essayez de modifier votre recherche ou filtre de catégorie pour voir les chaînes disponibles.'
                          : 'جرب تغيير معايير البحث أو اختيار تصنيف آخر لعرض القنوات.'}
                      </p>
                      <button
                        onClick={() => {
                          setChannelSearch('');
                          setChannelCategoryFilter('all');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer mx-auto"
                      >
                        {lang === 'fr' ? 'Réinitialiser les filtres' : 'إعادة ضبط الفلاتر'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredChannels.map((ch) => {
                    const isSelected = selectedChannelIds.has(ch.id);

                    return (
                      <div
                        key={ch.id}
                        onClick={() => handleToggleSelectChannel(ch.id)}
                        className={`p-4 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500/70 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-950/30'
                            : ch.is_active
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                            : 'bg-slate-900/50 border-slate-850 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Channel Select Checkbox */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectChannel(ch.id);
                            }}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40 ring-2 ring-indigo-500'
                                : 'bg-slate-950 border border-slate-700 group-hover:border-indigo-400 text-transparent'
                            }`}
                            title={isSelected ? (lang === 'fr' ? 'Désélectionner' : 'إلغاء التحديد') : (lang === 'fr' ? 'Sélectionner' : 'تحديد')}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>

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

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Live Test Stream Button */}
                          <button
                            onClick={() => handlePlayChannel(ch)}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title={lang === 'fr' ? 'Tester le flux en direct' : 'تجربة تشغيل البث'}
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{lang === 'fr' ? 'Tester' : 'تشغيل'}</span>
                          </button>

                          {/* Active Toggle */}
                          <button
                            onClick={() => handleToggleChannel(ch.id, ch.is_active)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
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
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MOVE TO CATEGORY BATCH MODAL */}
          {isMoveCategoryOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FolderInput className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-base text-white">
                      {lang === 'fr' ? 'Déplacer vers une catégorie' : 'نقل إلى تصنيف'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsMoveCategoryOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-300">
                  {lang === 'fr'
                    ? `Choisissez la catégorie de destination pour les ${selectedChannelIds.size} chaîne(s) sélectionnée(s) :`
                    : `اختر التصنيف الجديد لـ ${selectedChannelIds.size} قناة محددة :`}
                </p>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      onClick={() => setTargetCategoryForMove(cat.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        targetCategoryForMove === cat.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="targetCategory"
                          checked={targetCategoryForMove === cat.id}
                          onChange={() => setTargetCategoryForMove(cat.id)}
                          className="accent-indigo-600"
                        />
                        <span className="text-xs font-semibold">
                          {lang === 'ar' && cat.name_ar ? cat.name_ar : cat.name}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {cat.category_type}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsMoveCategoryOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {lang === 'fr' ? 'Annuler' : 'إلغاء'}
                  </button>
                  <button
                    type="button"
                    disabled={!targetCategoryForMove || batchActionLoading}
                    onClick={handleBatchMoveCategory}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <FolderInput className="w-4 h-4" />
                    <span>
                      {lang === 'fr'
                        ? `Déplacer (${selectedChannelIds.size})`
                        : `نقل (${selectedChannelIds.size})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: VOD (FILMS & SERIES) */}
          {activeSection === 'vod' && (
            <VodManager
              lang={lang}
              onPlayStream={handlePlayStream}
            />
          )}

          {/* SECTION: EPG GUIDE */}
          {activeSection === 'epg' && (
            <EpgGuideView
              lang={lang}
              channels={channels}
              onPlayChannel={handlePlayChannel}
            />
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

          {/* SECTION: ANDROID KOTLIN CODE EXPLORER (ÉTAPE 5) */}
          {activeSection === 'android_code' && (
            <AndroidCodeExplorer lang={lang} />
          )}

          {/* SECTION: END-TO-END TESTS RUNNER (ÉTAPE 6) */}
          {activeSection === 'e2e_tests' && (
            <EndToEndTestRunner lang={lang} />
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
        defaultType={sourceTypeForModal}
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
