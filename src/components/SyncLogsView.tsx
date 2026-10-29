/**
 * BeShare TV — Journalisation Détaillée des Synchronisations & Erreurs
 * Chemin: /src/components/SyncLogsView.tsx
 */
import React, { useState } from 'react';
import { History, CheckCircle2, AlertTriangle, RefreshCw, Clock, Filter, Radio, Film, ListVideo } from 'lucide-react';
import { SyncLog } from '../types';

interface SyncLogsViewProps {
  logs: SyncLog[];
  onRefresh: () => void;
  lang: 'fr' | 'ar';
}

export const SyncLogsView: React.FC<SyncLogsViewProps> = ({ logs, onRefresh, lang }) => {
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  const filteredLogs = logs.filter((l) => (filter === 'all' ? true : l.status === filter));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              {lang === 'fr' ? 'Historique des Synchronisations & Audit d’Erreurs' : 'سجل المزامنة وتدقيق الأخطاء'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'fr'
                ? 'Suivi des durées, volumes d’imports et erreurs sécurisées sans secrets'
                : 'متابعة أوقات التنفيذ وعدد العناصر المستوردة وتفاصيل الأخطاء'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'fr' ? 'Tous' : 'الكل'}
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === 'success' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'fr' ? 'Succès' : 'الناجحة'}
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === 'failed' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'fr' ? 'Échecs' : 'الأخطاء'}
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={lang === 'fr' ? 'Actualiser' : 'تحديث'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            {lang === 'fr' ? 'Aucun journal correspondant' : 'لا توجد سجلات مطابقة'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                log.status === 'success'
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {log.status === 'success' ? (
                    <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SUCCÈS
                    </span>
                  ) : log.status === 'running' ? (
                    <span className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 text-[11px] font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> EN COURS
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/20 flex items-center gap-1 text-[11px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" /> ÉCHEC
                    </span>
                  )}
                  <span className="font-semibold text-xs text-white">
                    {log.source_name || 'Source'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  {log.duration_ms && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {log.duration_ms} ms
                    </span>
                  )}
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Counts Badge Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {log.channels_count > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-mono flex items-center gap-1">
                    <Radio className="w-3 h-3" /> {log.channels_count} {lang === 'fr' ? 'chaînes' : 'قناة'}
                  </span>
                )}
                {log.movies_count > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-mono flex items-center gap-1">
                    <Film className="w-3 h-3" /> {log.movies_count} {lang === 'fr' ? 'films' : 'فيلم'}
                  </span>
                )}
                {log.series_count > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono flex items-center gap-1">
                    <ListVideo className="w-3 h-3" /> {log.series_count} {lang === 'fr' ? 'séries' : 'مسلسل'}
                  </span>
                )}
                <span className="text-[11px] text-slate-500">
                  {lang === 'fr' ? 'Déclenché par :' : 'بواسطة:'} {log.triggered_by}
                </span>
              </div>

              {/* Error Details (Sanitized) */}
              {log.error_details && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs font-mono break-all">
                  <span className="font-bold text-rose-400">Erreur : </span>
                  {log.error_details}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
