/**
 * BeShare TV — Gestionnaire de Catégories (Live, Films, Séries)
 * Chemin: /src/components/CategoryManager.tsx
 */
import React, { useState } from 'react';
import { Eye, EyeOff, Radio, Film, ListVideo, Search, Check, Layers } from 'lucide-react';
import { Category, CategoryType } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  onToggleVisibility: (id: string, current: boolean) => void;
  lang: 'fr' | 'ar';
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onToggleVisibility,
  lang,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = categories.filter((c) => {
    const matchesType = activeFilter === 'all' || c.category_type === activeFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name_ar && c.name_ar.includes(searchQuery));
    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            {lang === 'fr' ? 'Gestion des Catégories du Catalogue' : 'إدارة تصنيفات الكتالوج'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'fr'
              ? 'Organisez les bouquets TV, films et séries diffusés vers les applications Android'
              : 'تنظيم باقات القنوات والأفلام والمسلسلات لتطبيقات أندرويد'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'fr' ? 'Tout' : 'الكل'}
          </button>
          <button
            onClick={() => setActiveFilter('live')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'live' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Live TV
          </button>
          <button
            onClick={() => setActiveFilter('movie')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'movie' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Films VOD
          </button>
          <button
            onClick={() => setActiveFilter('series')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'series' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListVideo className="w-3.5 h-3.5" />
            Séries
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder={lang === 'fr' ? 'Filtrer les catégories par nom...' : 'البحث في التصنيفات...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Categories Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="font-semibold text-white text-xs">
            {lang === 'fr' ? 'Aucune catégorie disponible' : 'لا توجد تصنيفات حالياً'}
          </div>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            {lang === 'fr'
              ? 'Ajoutez votre source Xtream Codes ou M3U pour créer et organiser automatiquement vos catégories TV et VOD.'
              : 'قم بإضافة اشتراك Xtream Codes أو M3U لإنشاء وتنظيم باقات القنوات والأفلام تلقائياً.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((cat) => (
          <div
            key={cat.id}
            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
              cat.is_visible
                ? 'bg-slate-950/80 border-slate-800 text-white'
                : 'bg-slate-950/40 border-slate-850 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                cat.category_type === 'live'
                  ? 'bg-sky-500/15 text-sky-400'
                  : cat.category_type === 'movie'
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}>
                {cat.category_type === 'live' ? (
                  <Radio className="w-4 h-4" />
                ) : cat.category_type === 'movie' ? (
                  <Film className="w-4 h-4" />
                ) : (
                  <ListVideo className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{cat.name}</span>
                  {cat.name_ar && (
                    <span className="text-[11px] text-indigo-400 font-sans" dir="rtl">
                      ({cat.name_ar})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {cat.channels_count || 0} {lang === 'fr' ? 'contenus' : 'عنصر'}
                </div>
              </div>
            </div>

            <button
              onClick={() => onToggleVisibility(cat.id, cat.is_visible)}
              className={`p-2 rounded-lg border transition-colors ${
                cat.is_visible
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={cat.is_visible ? (lang === 'fr' ? 'Masquer dans l’application' : 'إخفاء في التطبيق') : (lang === 'fr' ? 'Afficher' : 'إظهار')}
            >
              {cat.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};
