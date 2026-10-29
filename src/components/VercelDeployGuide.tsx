/**
 * BeShare TV — Guide de Déploiement Vercel
 * Chemin: /src/components/VercelDeployGuide.tsx
 */
import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Terminal, Globe, Shield, Sparkles } from 'lucide-react';

interface VercelDeployGuideProps {
  lang: 'fr' | 'ar';
}

export const VercelDeployGuide: React.FC<VercelDeployGuideProps> = ({ lang }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs border border-slate-700">
              ▲
            </span>
            <h3 className="font-bold text-base text-white">
              {lang === 'fr' ? 'Déploiement du Panneau Web sur Vercel' : 'نشر لوحة التحكم على Vercel'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'fr'
              ? 'Mise en ligne ultra-rapide sur CDN mondial sécurisé avec configuration vercel.json intégrée.'
              : 'نشر سريع على شبكة CDN العالمية مع ضبط ملف vercel.json تلقائياً.'}
          </p>
        </div>

        <a
          href="https://vercel.com/new"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-bold flex items-center gap-2 transition-colors shadow-lg"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {lang === 'fr' ? 'Ouvrir Vercel Dashboard' : 'فتح منصة Vercel'}
        </a>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
            1
          </div>
          <div className="font-bold text-xs text-white">
            {lang === 'fr' ? 'Connecter le Dépôt Git' : 'ربط مستودع Git'}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {lang === 'fr'
              ? 'Importez votre projet GitHub / GitLab dans Vercel. Le framework « Vite » sera détecté automatiquement.'
              : 'استورد مستودع المشروع في Vercel. سيتعرف النظام تلقائياً على Vite.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
            2
          </div>
          <div className="font-bold text-xs text-white">
            {lang === 'fr' ? 'Variables d’Environnement' : 'متغيرات البيئة'}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {lang === 'fr'
              ? 'Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les paramètres du projet Vercel.'
              : 'أضف رابط ومفتاح Supabase في إعدادات البيئة في Vercel.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
            3
          </div>
          <div className="font-bold text-xs text-white">
            {lang === 'fr' ? 'Fichier vercel.json Actif' : 'ملف vercel.json جاهز'}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {lang === 'fr'
              ? 'Le fichier vercel.json configure les réécritures SPA et les en-têtes de sécurité anti-clickjacking.'
              : 'يتكفل ملف vercel.json بالتوجيه السلس للـ SPA وحماية الرؤوس الأمنية.'}
          </p>
        </div>
      </div>

      {/* Environment Variables Reference Box */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>{lang === 'fr' ? 'Variables requises sur Vercel :' : 'المتغيرات المطلوبة في Vercel:'}</span>
          <span className="text-[10px] text-emerald-400 font-mono">Clés Publiques RLS (Aucun secret requis)</span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-indigo-300">VITE_SUPABASE_URL</span>
            <button
              onClick={() => copyText('url', 'VITE_SUPABASE_URL')}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              {copied === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-indigo-300">VITE_SUPABASE_ANON_KEY</span>
            <button
              onClick={() => copyText('key', 'VITE_SUPABASE_ANON_KEY')}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              {copied === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
