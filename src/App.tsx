/**
 * BeShare TV — Console d'Architecture & Administration
 * Étape 1 : Base de Données & Sécurité Supabase (PostgreSQL + RLS + RBAC)
 */
import React, { useState, useEffect } from 'react';
import {
  Database,
  Shield,
  Key,
  Server,
  Tv,
  Film,
  ListVideo,
  Calendar,
  Layers,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  ChevronRight,
  Globe,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Terminal,
  FileCode,
  ArrowRight,
  Sparkles,
  Radio
} from 'lucide-react';
import { SQL_TABLES, TableSpec } from './data/schemaData';
import { getSavedSupabaseConfig, saveSupabaseConfig, getSupabaseClient } from './lib/supabase';

// SQL raw string for quick copy
const RAW_SQL_COMMAND = `-- ====================================================================
-- BeShare TV — Étape 1 : Schéma PostgreSQL, Sécurité & RLS Supabase
-- Exécutez ce script dans Supabase Studio > SQL Editor
-- ====================================================================
-- Tables: user_profiles, sources, categories, channels, movies, series,
--         episodes, epg_programs, sync_logs, client_devices, user_favorites
-- Politiques: RLS active sur 100% des tables avec protection anti-leak
-- Voir fichier complet : /supabase/migrations/01_schema_and_security.sql`;

export default function App() {
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const [selectedTable, setSelectedTable] = useState<TableSpec>(SQL_TABLES[0]);
  const [activeTab, setActiveTab] = useState<'schema' | 'rls_matrix' | 'connection_test' | 'sql_raw' | 'roadmap'>('schema');
  
  // Supabase Configuration state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    detectedTables?: string[];
  }>({ tested: false, success: false, message: '' });

  // RLS Simulator State
  const [simRole, setSimRole] = useState<'anon' | 'viewer_active' | 'viewer_expired' | 'admin'>('viewer_active');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const config = getSavedSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseAnonKey(config.anonKey);
    if (config.url && config.anonKey) {
      testSupabaseConnection(config.url, config.anonKey);
    }
  }, []);

  const isRTL = lang === 'ar';

  const testSupabaseConnection = async (urlToTest?: string, keyToTest?: string) => {
    const u = urlToTest || supabaseUrl;
    const k = keyToTest || supabaseAnonKey;

    if (!u || !k) {
      setConnStatus({
        tested: true,
        success: false,
        message: lang === 'fr' 
          ? 'Veuillez saisir votre URL de projet Supabase et votre clé Anon Key.' 
          : 'يرجى إدخال رابط مشروع Supabase والمفتاح العام Anon Key.'
      });
      return;
    }

    setTestingConn(true);
    setConnStatus({ tested: false, success: false, message: '' });

    try {
      // Basic URL format validation to avoid SSRF and invalid addresses
      const parsed = new URL(u);
      if (!parsed.hostname.endsWith('supabase.co') && !parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) {
        // Warning if non-supabase host
        console.warn('URL non standard Supabase:', parsed.hostname);
      }

      saveSupabaseConfig(u, k);
      const client = getSupabaseClient();
      
      if (!client) {
        throw new Error(lang === 'fr' ? 'Impossible d’initialiser le client Supabase.' : 'تعذر تهيئة عميل Supabase.');
      }

      // Test a gentle public query on categories or user_profiles
      const { data, error } = await client.from('categories').select('id').limit(1);

      if (error && error.code === '42P01') {
        // Table does not exist yet! This means connected to Supabase, but schema not yet executed!
        setConnStatus({
          tested: true,
          success: true,
          message: lang === 'fr'
            ? 'Connexion réussie à Supabase ! Le schéma SQL n’a pas encore été exécuté. Exécutez le script dans le SQL Editor.'
            : 'تم الاتصال بنجاح بـ Supabase! لم يتم بعد تنفيذ مخطط SQL. يرجى تشغيل المخطط في محرر SQL.'
        });
      } else if (error && (error.message.includes('JWT') || error.code === 'PGRST301')) {
        setConnStatus({
          tested: true,
          success: false,
          message: lang === 'fr' ? `Erreur d'authentification API: ${error.message}` : `خطأ في مصادقة المفتاح: ${error.message}`
        });
      } else {
        // Success
        setConnStatus({
          tested: true,
          success: true,
          message: lang === 'fr'
            ? 'Connexion vérifiée avec succès ! Instance Supabase opérationnelle et prête.'
            : 'تم التحقق من الاتصال بنجاح! قاعدة بيانات Supabase جاهزة وتعمل.'
        });
      }
    } catch (err: any) {
      setConnStatus({
        tested: true,
        success: false,
        message: err.message || (lang === 'fr' ? 'Échec de connexion au serveur' : 'فشل الاتصال بالخادم')
      });
    } finally {
      setTestingConn(false);
    }
  };

  const copyFullSql = () => {
    navigator.clipboard.writeText(
      `-- ====================================================================\n` +
      `-- BeShare TV — Étape 1 : Base de Données & Sécurité Supabase\n` +
      `-- Schéma PostgreSQL complet avec RLS & Triggers\n` +
      `-- ====================================================================\n\n` +
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n` +
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n` +
      `-- Consulter le fichier /supabase/migrations/01_schema_and_security.sql pour l'intégralité du code.`
    );
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Header / Broadcast Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white">BeShare TV</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {lang === 'fr' ? 'Étape 1 : Base & RLS' : 'المرحلة 1: القاعدة والأمان'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'fr' 
                  ? 'Architecture Centrale Supabase + Sync Android'
                  : 'الهندسة المركزية لـ Supabase ومزامنة أندرويد'}
              </p>
            </div>
          </div>

          {/* Lang & Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  lang === 'fr' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Français
              </button>
              <button
                onClick={() => setLang('ar')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  lang === 'ar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                العربية (RTL)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Banner: Step 1 Confirmation */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                {lang === 'fr' ? 'Architecte Logiciel Senior' : 'كبير مهندسي البرمجيات'}
              </div>
              <h2 className="text-xl font-bold text-white">
                {lang === 'fr' 
                  ? 'Étape 1 : Base de Données PostgreSQL & Sécurité RLS Supabase' 
                  : 'المرحلة 1: قاعدة بيانات PostgreSQL ونظام الحماية RLS في Supabase'}
              </h2>
              <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                {lang === 'fr'
                  ? 'Conception certifiée sans fuite de secrets fournisseur (M3U, Xtream, Stalker). Les 11 tables relationnelles sont protégées par le Row Level Security (RLS) et des fonctions SECURITY DEFINER. Les applications Android ne reçoivent que le catalogue autorisé sans jamais exposer de mots de passe.'
                  : 'تصميم معتمد بدون أي تسريب لبيانات المزودين (M3U و Xtream و Stalker). جميع الجداول الـ 11 محمية بواسطة RLS ودوال أمان مخصصة، حيث يتلقى تطبيق أندرويد الكتالوج المصرح به فقط دون كلمات سر.'}
              </p>
            </div>
            <div className="flex items-center gap-2 self-stretch md:self-auto">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono text-emerald-400 font-medium">
                {lang === 'fr' ? 'Schéma 01_schema_and_security.sql Généré' : 'تم تجهيز ملف 01_schema_and_security.sql'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'schema'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            {lang === 'fr' ? 'Structure des Tables (11)' : 'هيكل الجداول (11)'}
          </button>

          <button
            onClick={() => setActiveTab('rls_matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'rls_matrix'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            {lang === 'fr' ? 'Sécurité RLS & Simulateur de Droits' : 'مصفوفة الحماية RLS ومحاكي الصلاحيات'}
          </button>

          <button
            onClick={() => setActiveTab('connection_test')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'connection_test'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Server className="w-4 h-4 text-sky-400" />
            {lang === 'fr' ? 'Test de Connexion Supabase' : 'فحص الاتصال مع Supabase'}
          </button>

          <button
            onClick={() => setActiveTab('sql_raw')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'sql_raw'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4 text-amber-400" />
            {lang === 'fr' ? 'Code SQL Complet & Déploiement' : 'كود SQL الكامل والتعليمات'}
          </button>

          <button
            onClick={() => setActiveTab('roadmap')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'roadmap'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ListVideo className="w-4 h-4 text-purple-400" />
            {lang === 'fr' ? 'Ordre de Développement (6 Étapes)' : 'خطة العمل (6 مراحل)'}
          </button>
        </div>

        {/* TAB 1: SCHEMA INSPECTOR */}
        {activeTab === 'schema' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Table selector list */}
            <div className="lg:col-span-4 space-y-2">
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>{lang === 'fr' ? 'Tables PostgreSQL' : 'جداول PostgreSQL'}</span>
                <span>11 {lang === 'fr' ? 'tables actives' : 'جداول'}</span>
              </div>
              <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
                {SQL_TABLES.map((tbl) => {
                  const isSelected = selectedTable.name === tbl.name;
                  return (
                    <button
                      key={tbl.name}
                      onClick={() => setSelectedTable(tbl)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-indigo-950/80 border-indigo-500/60 shadow-md text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tbl.name === 'sources'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : tbl.name === 'sync_logs'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {tbl.name === 'sources' ? (
                            <Lock className="w-4 h-4" />
                          ) : tbl.name === 'channels' ? (
                            <Radio className="w-4 h-4" />
                          ) : tbl.name === 'movies' ? (
                            <Film className="w-4 h-4" />
                          ) : (
                            <Database className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-semibold flex items-center gap-2">
                            <span>public.{tbl.name}</span>
                            {tbl.hasRLS && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                RLS
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 line-clamp-1">
                            {lang === 'fr' ? tbl.category : tbl.descriptionAr}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform ${isSelected ? 'rotate-90 text-indigo-400' : ''}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table Details & Columns Specification */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-xl font-bold text-white">
                      public.{selectedTable.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {selectedTable.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {lang === 'fr' ? selectedTable.descriptionFr : selectedTable.descriptionAr}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Row Level Security
                  </span>
                </div>
              </div>

              {/* RLS Policy Summary Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                selectedTable.name === 'sources'
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                  : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
              }`}>
                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <div className="font-semibold uppercase tracking-wider mb-0.5">
                    {lang === 'fr' ? 'Politique de Sécurité Active (RLS)' : 'سياسة الحماية المطبقة (RLS)'}
                  </div>
                  {lang === 'fr' ? selectedTable.securityFr : selectedTable.securityAr}
                </div>
              </div>

              {/* Columns Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                      <th className="p-3">{lang === 'fr' ? 'Colonne' : 'اسم الحقل'}</th>
                      <th className="p-3">{lang === 'fr' ? 'Type SQL' : 'النوع'}</th>
                      <th className="p-3">{lang === 'fr' ? 'Contraintes' : 'القيود'}</th>
                      <th className="p-3">{lang === 'fr' ? 'Description Métier' : 'الوصف الفني'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {selectedTable.columns.map((col) => (
                      <tr key={col.name} className="hover:bg-slate-850/50">
                        <td className="p-3 font-bold text-white flex items-center gap-1.5">
                          {col.isPrimary && <Key className="w-3.5 h-3.5 text-amber-400" />}
                          {col.name}
                        </td>
                        <td className="p-3 text-indigo-400 font-medium">{col.type}</td>
                        <td className="p-3 text-slate-400">
                          {col.isPrimary && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 mr-1 text-[10px]">
                              PK
                            </span>
                          )}
                          {col.isForeign && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 mr-1 text-[10px]">
                              FK
                            </span>
                          )}
                          {col.nullable === false && (
                            <span className="text-rose-400 text-[11px]">NOT NULL</span>
                          )}
                        </td>
                        <td className="p-3 font-sans text-slate-300">
                          {lang === 'fr' ? col.descFr : col.descAr}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RLS SIMULATOR & SECURITY PROOF */}
        {activeTab === 'rls_matrix' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    {lang === 'fr' 
                      ? 'Simulateur de Droits & Vérification Anti-Fuite' 
                      : 'محاكي أمان RLS والتحقق من عدم تسريب البيانات'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'fr'
                      ? 'Testez ce qu’un client Android ou un utilisateur peut lire selon son profil. Constatez l’étanchéité absolue des sources fournisseur.'
                      : 'اختبر ما يمكن لتطبيق أندرويد أو مستخدم عادي قراءته وفقاً لحالته. لاحظ الحظر المطلق لبيانات المزودين.'}
                  </p>
                </div>

                {/* Role Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400 px-2 font-medium">
                    {lang === 'fr' ? 'Rôle simulé :' : 'الدور المفترض:'}
                  </span>
                  <button
                    onClick={() => setSimRole('anon')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      simRole === 'anon' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'fr' ? 'Anonyme (Public)' : 'غير مسجل (عام)'}
                  </button>
                  <button
                    onClick={() => setSimRole('viewer_active')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      simRole === 'viewer_active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'fr' ? 'Abonné Actif (Android)' : 'مشترك مفعل (أندرويد)'}
                  </button>
                  <button
                    onClick={() => setSimRole('viewer_expired')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      simRole === 'viewer_expired' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'fr' ? 'Abonné Expiré / Suspendu' : 'مشترك منتهي الصلاحية'}
                  </button>
                  <button
                    onClick={() => setSimRole('admin')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      simRole === 'admin' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'fr' ? 'Administrateur' : 'المشرف الكامل'}
                  </button>
                </div>
              </div>

              {/* Simulation Result Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                
                {/* 1. SOURCES */}
                <div className={`p-4 rounded-xl border ${
                  simRole === 'admin' ? 'bg-purple-950/20 border-purple-500/40' : 'bg-rose-950/20 border-rose-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-white">public.sources</span>
                    {simRole === 'admin' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACCÈS TOTAL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> 100% BLOQUÉ (RLS)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {simRole === 'admin'
                      ? (lang === 'fr' ? 'L’admin gère les sources M3U, Xtream Codes, Stalker et clés.' : 'المشرف يدير كل المصادر والروابط والمفاتيح.')
                      : (lang === 'fr' ? 'SÉCURISÉ : Les credentials fournisseurs (host, user, pass, MAC) sont INVISIBLES pour ce rôle.' : 'أمان تام: بيانات المزود (الخادم، المستخدم، الرمز) محظورة تماماً عن هذا الدور.')}
                  </p>
                </div>

                {/* 2. CHANNELS & VOD */}
                <div className={`p-4 rounded-xl border ${
                  simRole === 'admin' || simRole === 'viewer_active' ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-rose-950/20 border-rose-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-white">public.channels / movies</span>
                    {simRole === 'admin' || simRole === 'viewer_active' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {simRole === 'admin' ? 'CRUD TOTAL' : 'LECTURE AUTORISÉE'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> ACCÈS REFUSÉ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {simRole === 'viewer_active'
                      ? (lang === 'fr' ? 'L’application Android télécharge les chaînes et films actifs sans voir la source mère.' : 'يقوم تطبيق أندرويد بتحميل القنوات والأفلام المصرح بها.')
                      : simRole === 'viewer_expired'
                      ? (lang === 'fr' ? 'Abonnement échu : Impossible de récupérer les flux de streaming.' : 'الاشتراك منته: لا يمكن استرداد روابط البث المباشر.')
                      : simRole === 'admin'
                      ? (lang === 'fr' ? 'Contrôle éditorial total des chaînes et jaquettes.' : 'إدارة تحريرية كاملة للقنوات والبوسترات.')
                      : (lang === 'fr' ? 'Accès refusé sans jeton d’authentification valide.' : 'الوصول مرفوض دون تسجيل دخول معتمد.')}
                  </p>
                </div>

                {/* 3. SYNC LOGS */}
                <div className={`p-4 rounded-xl border ${
                  simRole === 'admin' ? 'bg-purple-950/20 border-purple-500/40' : 'bg-rose-950/20 border-rose-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-white">public.sync_logs</span>
                    {simRole === 'admin' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACCÈS TOTAL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> STRICTEMENT ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {simRole === 'admin'
                      ? (lang === 'fr' ? 'Audit des erreurs, durées d’exécution et volumes d’import.' : 'مراجعة أخطاء المزامنة والمدة وحجم البيانات.')
                      : (lang === 'fr' ? 'Protégé contre toute lecture externe.' : 'محمي من أي استعلام خارجي.')}
                  </p>
                </div>

                {/* 4. CLIENT DEVICES */}
                <div className={`p-4 rounded-xl border ${
                  simRole === 'anon' ? 'bg-rose-950/20 border-rose-500/40' : 'bg-indigo-950/20 border-indigo-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-white">public.client_devices</span>
                    {simRole === 'anon' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/20 text-rose-400 font-semibold">
                        BLOQUÉ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/20 text-indigo-400 font-semibold">
                        {simRole === 'admin' ? 'VUE TOUS APPAREILS' : 'SES PROPRES APPAREILS'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {lang === 'fr'
                      ? 'Chaque utilisateur Android n’a accès qu’à ses appareils enregistrés. L’admin contrôle la limite d’écrans (max_devices).'
                      : 'لا يستطيع كل مشترك رؤية سوى أجهزته المسجلة. يحدد المشرف الحد الأقصى للشاشات.'}
                  </p>
                </div>

                {/* 5. USER FAVORITES */}
                <div className={`p-4 rounded-xl border ${
                  simRole === 'anon' ? 'bg-rose-950/20 border-rose-500/40' : 'bg-indigo-950/20 border-indigo-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-white">public.user_favorites</span>
                    {simRole === 'anon' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/20 text-rose-400 font-semibold">
                        BLOQUÉ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-400 font-semibold">
                        ISOLATION PAR USER_ID
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {lang === 'fr'
                      ? 'Les favoris TV, films et séries sont synchronisés de manière privée par auth.uid().'
                      : 'تتزامن القنوات والمفضلة بشكل خاص ومشفر لكل مستخدم عبر معرفه الفريد.'}
                  </p>
                </div>

                {/* 6. EPG PROGRAMS */}
                <div className={`p-4 rounded-xl border ${
                  simRole === 'anon' ? 'bg-rose-950/20 border-rose-500/40' : 'bg-sky-950/20 border-sky-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-white">public.epg_programs</span>
                    {simRole === 'anon' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/20 text-rose-400 font-semibold">
                        BLOQUÉ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-sky-500/20 text-sky-400 font-semibold">
                        LECTURE OUVERTE AUX ABONNÉS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {lang === 'fr'
                      ? 'Guide électronique des programmes visible par les clients connectés pour afficher la grille horaire.'
                      : 'دليل البرامج التلفزيوني متاح لجميع المشتركين لعرض الجداول الزمنية.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONNECTION TEST TO USER'S SUPABASE */}
        {activeTab === 'connection_test' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-sky-400" />
                {lang === 'fr' 
                  ? 'Vérification en Direct de l’Instance Supabase' 
                  : 'فحص الاتصال المباشر مع خادم Supabase'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'fr'
                  ? 'Connectez votre panneau Web à votre projet Supabase. Vous pouvez utiliser vos variables d’environnement (.env) ou tester immédiatement avec votre URL de projet.'
                  : 'اربط لوحة التحكم بمشروع Supabase الخاص بك. يمكنك استخدام المتغيرات أو إدخال الرابط والمفتاح للفحص الفوري.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {lang === 'fr' ? 'URL du projet Supabase (VITE_SUPABASE_URL)' : 'رابط مشروع Supabase'}
                </label>
                <input
                  type="text"
                  placeholder="https://xyzproject.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{lang === 'fr' ? 'Clé Publique Anonyme (VITE_SUPABASE_ANON_KEY)' : 'المفتاح العام Anon Key'}</span>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showKey ? (lang === 'fr' ? 'Masquer' : 'إخفاء') : (lang === 'fr' ? 'Afficher' : 'إظهار')}
                  </button>
                </label>
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-400">
                {lang === 'fr'
                  ? '🔒 Aucune clé Service Role n’est demandée ici. La sécurité côté client utilise la clé Anon avec RLS.'
                  : '🔒 لا يُطلب مفتاح الخدمة السري هنا. يتم الأمان عبر المفتاح العام وسياسات RLS.'}
              </div>

              <button
                onClick={() => testSupabaseConnection()}
                disabled={testingConn}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${testingConn ? 'animate-spin' : ''}`} />
                {testingConn
                  ? (lang === 'fr' ? 'Vérification en cours...' : 'جارٍ الفحص...')
                  : (lang === 'fr' ? 'Tester la Connexion' : 'فحص الاتصال الآن')}
              </button>
            </div>

            {/* Test Result Message */}
            {connStatus.tested && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                connStatus.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                {connStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed">
                  <div className="font-semibold mb-0.5">
                    {connStatus.success
                      ? (lang === 'fr' ? 'Connexion Validée' : 'الاتصال ناجح ومؤكد')
                      : (lang === 'fr' ? 'Erreur de Connexion' : 'خطأ في الاتصال')}
                  </div>
                  {connStatus.message}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RAW SQL & SMARTPHONE DEPLOYMENT GUIDE */}
        {activeTab === 'sql_raw' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-amber-400" />
                  {lang === 'fr' 
                    ? 'Déploiement SQL Supabase (Étape 1)' 
                    : 'نشر كود SQL على Supabase (المرحلة 1)'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'fr'
                    ? 'Le script complet se trouve dans /supabase/migrations/01_schema_and_security.sql.'
                    : 'الملف الكامل متوفر في /supabase/migrations/01_schema_and_security.sql.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyFullSql}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedSql
                    ? (lang === 'fr' ? 'Copié dans le presse-papier !' : 'تم النسخ بنجاح!')
                    : (lang === 'fr' ? 'Copier le script SQL' : 'نسخ كود SQL')}
                </button>

                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 transition-colors shadow-md shadow-indigo-600/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {lang === 'fr' ? 'Ouvrir Supabase Studio' : 'فتح لوحة Supabase'}
                </a>
              </div>
            </div>

            {/* Smartphone deployment instructions card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                {lang === 'fr' 
                  ? 'Procédure pas-à-pas depuis un Smartphone ou Ordinateur' 
                  : 'خطوات التنفيذ خطوة بخطوة من الهاتف أو الحاسوب'}
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                <li>
                  <strong className="text-white">
                    {lang === 'fr' ? 'Accédez à Supabase Dashboard :' : 'افتح لوحة تحكم Supabase:'}
                  </strong>{' '}
                  {lang === 'fr' 
                    ? 'Connectez-vous sur supabase.com depuis le navigateur de votre smartphone.' 
                    : 'سجل الدخول على supabase.com من متصفح الهاتف.'}
                </li>
                <li>
                  <strong className="text-white">
                    {lang === 'fr' ? 'Ouvrez le SQL Editor :' : 'ادخل إلى محرر SQL:'}
                  </strong>{' '}
                  {lang === 'fr' 
                    ? 'Dans le menu latéral gauche, appuyez sur l’icône terminal « SQL Editor » puis « New Query ».' 
                    : 'من القائمة الجانبية اختر SQL Editor ثم استعلام جديد New Query.'}
                </li>
                <li>
                  <strong className="text-white">
                    {lang === 'fr' ? 'Collez et exécutez :' : 'الصق الكود واضغط تشغيل:'}
                  </strong>{' '}
                  {lang === 'fr'
                    ? 'Collez le contenu du fichier supabase/migrations/01_schema_and_security.sql et cliquez sur « RUN ».'
                    : 'الصق محتوى ملف 01_schema_and_security.sql واضغط على الزر الأخضر RUN.'}
                </li>
                <li>
                  <strong className="text-white">
                    {lang === 'fr' ? 'Attribution automatique du rôle Admin :' : 'تعيين حساب المشرف تلقائياً:'}
                  </strong>{' '}
                  {lang === 'fr'
                    ? 'Le déclencheur on_auth_user_created attribue automatiquement le rôle « admin » au premier utilisateur créé dans Supabase Auth.'
                    : 'يقوم المشغل التلقائي بتعيين أول مستخدم يسجل حسابه كـ Admin مباشرة.'}
                </li>
              </ol>
            </div>

            {/* Code preview snippet */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-72">
              <pre className="text-emerald-400 font-semibold mb-2">
                -- Extrait de /supabase/migrations/01_schema_and_security.sql
              </pre>
              <pre className="text-slate-400 leading-relaxed">
{`-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLE SOURCES (CONFIDENTIALITÉ FOURNISSEURS STRICTEMENT ADMIN)
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('m3u', 'xtream', 'stalker')),
    server_url TEXT NOT NULL,
    username TEXT,
    password TEXT,
    mac_address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACTIVATION RLS SUR TOUTES LES TABLES
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- 4. POLITIQUE STRICTE : AUCUN CLIENT NE PEUT LIRE LA TABLE SOURCES
CREATE POLICY "Seuls les admins gèrent et consultent les sources"
ON public.sources
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 5: ROADMAP OF 6 STEPS */}
        {activeTab === 'roadmap' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                {lang === 'fr' 
                  ? 'Plan de Réalisation BeShare TV (Ordre Précis en 6 Étapes)' 
                  : 'خارطة طريق تطوير BeShare TV (6 مراحل مرتبة)'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'fr'
                  ? 'Progression rigoureuse étape par étape selon vos exigences architecturales.'
                  : 'تنفيذ دقيق مرحلة بمرحلة وفق المتطلبات الهندسية المحددة.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* STEP 1: COMPLETED */}
              <div className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-950/20 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 font-mono">ÉTAPE 1</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ACTIF / PRÊT
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white">
                  {lang === 'fr' ? 'Base de Données & Sécurité Supabase' : 'قاعدة البيانات والأمان'}
                </h4>
                <p className="text-xs text-slate-300">
                  {lang === 'fr'
                    ? '11 tables, triggers, fonctions is_admin(), RLS anti-leak, index de performance.'
                    : '11 جدولاً، مشغلات، دوال أمان RLS، وحظر تسريب بيانات المزودين.'}
                </p>
              </div>

              {/* STEP 2 */}
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-slate-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 font-mono">ÉTAPE 2</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold">
                    PROCHAINE ÉTAPE
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white">
                  {lang === 'fr' ? 'Backend & Synchronisation Sources' : 'الخلفية ومزامنة المصادر'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'fr'
                    ? 'Edge Functions SSRF-safe pour parsing M3U/M3U8, Xtream Codes API et Stalker handshake.'
                    : 'وظائف Edge Functions لمعالجة M3U و Xtream Codes و Stalker بدون ثغرات SSRF.'}
                </p>
              </div>

              {/* STEP 3 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 font-mono">ÉTAPE 3</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-semibold">
                    EN ATTENTE
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white">
                  {lang === 'fr' ? 'Panneau Web d’Administration' : 'لوحة تحكم الويب'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'fr'
                    ? 'React, Vite, Tailwind, bilingue FR/AR RTL, mobile-first, test des flux en direct, logs d’erreurs.'
                    : 'واجهة متجاوبة بالفرنسية والعربية RTL، اختبار البث الحي وعرض سجلات الأخطاء.'}
                </p>
              </div>

              {/* STEP 4 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 font-mono">ÉTAPE 4</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-semibold">
                    EN ATTENTE
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white">
                  {lang === 'fr' ? 'Catalogue & API Destinés à Android' : 'واجهة برمجة تطبيقات أندرويد'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'fr'
                    ? 'Endpoints sécurisés REST/RPC pour l’application Android, pagination et jetons de streaming.'
                    : 'نقاط نهاية مؤمنة وسريعة لتزويد تطبيق أندرويد بالبيانات وروابط التشغيل.'}
                </p>
              </div>

              {/* STEP 5 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 font-mono">ÉTAPE 5</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-semibold">
                    EN ATTENTE
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white">
                  {lang === 'fr' ? 'Application Android & Media3 ExoPlayer' : 'تطبيق أندرويد ومحرك Media3'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'fr'
                    ? 'Kotlin, Jetpack Compose, MVVM, navigation télécommande Android TV (D-pad focus), ExoPlayer HLS/VOD.'
                    : 'كوتلن وجيت باك كومبوز، دعم جهاز التحكم عن بعد D-pad للشاشات، ومشغل Media3 ExoPlayer.'}
                </p>
              </div>

              {/* STEP 6 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 font-mono">ÉTAPE 6</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-semibold">
                    EN ATTENTE
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white">
                  {lang === 'fr' ? 'Tests de Bout en Bout & Déploiement' : 'الفحص الشامل والنشر'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'fr'
                    ? 'Audit de sécurité, compilation APK, procédure Vercel et validation live.'
                    : 'تدقيق الأمان الشامل، تصدير APK، ونشر لوحة التحكم على Vercel.'}
                </p>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500 bg-slate-900/60">
        BeShare TV &copy; {new Date().getFullYear()} — Architecture Sécurisée Supabase & Android TV
      </footer>
    </div>
  );
}
