import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Tv,
  Search,
  Radio,
  RefreshCw,
  Play,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { EPGProgram, Channel } from '../types';
import { SourceService } from '../services/sourceService';

interface EpgGuideViewProps {
  lang: 'fr' | 'ar';
  channels: Channel[];
  onPlayChannel?: (channel: Channel) => void;
}

export const EpgGuideView: React.FC<EpgGuideViewProps> = ({ lang, channels, onPlayChannel }) => {
  const [programs, setPrograms] = useState<EPGProgram[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, [selectedChannelId]);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await SourceService.getEpgPrograms(
        selectedChannelId === 'all' ? undefined : selectedChannelId
      );
      setPrograms(data);
    } catch (err) {
      console.error('Erreur chargement EPG:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    await loadPrograms();
    setRefreshing(false);
  };

  const isRTL = lang === 'ar';
  const now = new Date();

  // Helper to format start / end times
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  // Helper to calculate progress percentage for currently broadcasting show
  const getProgress = (startIso: string, endIso: string) => {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const current = now.getTime();
    if (current < start) return 0;
    if (current > end) return 100;
    return Math.round(((current - start) / (end - start)) * 100);
  };

  const isLiveNow = (startIso: string, endIso: string) => {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const current = now.getTime();
    return current >= start && current <= end;
  };

  const filteredPrograms = programs.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {lang === 'fr' ? 'Guide Électronique des Programmes (EPG)' : 'دليل البرامج الإلكتروني (EPG)'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'fr'
              ? 'Consultez la grille des programmes en cours et à venir, synchronisée avec XMLTV et les flux autorisés.'
              : 'استعراض جدول البرامج المباشرة والقادمة المتزامنة تلقائياً من ملفات XMLTV.'}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700/80 transition-all shadow"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{lang === 'fr' ? 'Actualiser le Guide' : 'تحديث الدليل'}</span>
        </button>
      </div>

      {/* Filter and Channel Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Channel Selector */}
        <div className="relative">
          <Tv className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
          <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className={`w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors ${
              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          >
            <option value="all">{lang === 'fr' ? 'Toutes les chaînes TV' : 'جميع القنوات'}</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.channel_num ? `${ch.channel_num}. ` : ''}{ch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="sm:col-span-2 relative">
          <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'fr' ? 'Rechercher une émission, un match, un film...' : 'بحث في البرامج والمباريات...'}
            className={`w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors ${
              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>
      </div>

      {/* Program Timeline List */}
      {loading ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">{lang === 'fr' ? 'Chargement de la grille EPG...' : 'جاري تحميل الدليل...'}</p>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60 space-y-2">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="font-semibold text-white text-xs">
            {lang === 'fr' ? 'Aucun programme disponible' : 'لا توجد برامج متاحة'}
          </div>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            {lang === 'fr'
              ? 'Ajoutez et synchronisez vos sources Xtream Codes ou M3U pour alimenter le guide des programmes (EPG).'
              : 'أضف اشتراكك في Xtream Codes أو M3U لعرض الدليل الإلكتروني للبرامج (EPG).'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPrograms.map((prog) => {
            const isLive = isLiveNow(prog.start_time, prog.end_time);
            const progress = getProgress(prog.start_time, prog.end_time);
            const channel = channels.find((c) => c.id === prog.channel_id);

            return (
              <div
                key={prog.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isLive
                    ? 'bg-gradient-to-r from-sky-950/40 to-slate-900 border-sky-500/40 shadow-lg shadow-sky-950/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Time Box */}
                    <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center shrink-0">
                      <div className="text-xs font-bold font-mono text-white">
                        {formatTime(prog.start_time)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatTime(prog.end_time)}
                      </div>
                    </div>

                    {/* Program Information */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            {lang === 'fr' ? 'EN DIRECT' : 'مباشر الآن'}
                          </span>
                        )}

                        {prog.category && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60 font-medium">
                            {prog.category}
                          </span>
                        )}

                        {channel && (
                          <span className="text-xs font-medium text-sky-400 flex items-center gap-1">
                            <Tv className="w-3 h-3 text-sky-400" />
                            {channel.name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-white mt-1.5">
                        {prog.title}
                      </h3>

                      {prog.description && (
                        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                          {prog.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions / Channel Preview */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {channel && onPlayChannel && (
                      <button
                        onClick={() => onPlayChannel(channel)}
                        className="px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
                        <span>{lang === 'fr' ? 'Regarder' : 'مشاهدة'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Progress Bar */}
                {isLive && (
                  <div className="mt-3 pt-3 border-t border-sky-500/20 flex items-center gap-3">
                    <span className="text-[10px] text-sky-400 font-mono font-medium">
                      {progress}%
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(prog.end_time)}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
