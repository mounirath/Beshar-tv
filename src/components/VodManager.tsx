import React, { useState, useEffect } from 'react';
import {
  Film,
  ListVideo,
  Search,
  Star,
  Clock,
  Calendar,
  Layers,
  Power,
  Play,
  CheckCircle2,
  Filter,
  Eye,
  Tv,
  Sparkles
} from 'lucide-react';
import { Movie, Series } from '../types';
import { SourceService } from '../services/sourceService';

interface VodManagerProps {
  lang: 'fr' | 'ar';
  onPlayStream?: (title: string, streamUrl: string) => void;
}

export const VodManager: React.FC<VodManagerProps> = ({ lang, onPlayStream }) => {
  const [tab, setTab] = useState<'movies' | 'series'>('movies');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Movie | Series | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [movList, serList] = await Promise.all([
        SourceService.getMovies(),
        SourceService.getSeries(),
      ]);
      setMovies(movList);
      setSeries(serList);
    } catch (err) {
      console.error('Erreur chargement VOD:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMovie = async (id: string, current: boolean) => {
    await SourceService.toggleMovieActive(id, current);
    const updated = await SourceService.getMovies();
    setMovies(updated);
  };

  const handleToggleSeries = async (id: string, current: boolean) => {
    await SourceService.toggleSeriesActive(id, current);
    const updated = await SourceService.getSeries();
    setSeries(updated);
  };

  const filteredMovies = movies.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.title_ar && m.title_ar.includes(search)) ||
      (m.synopsis && m.synopsis.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSeries = series.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.title_ar && s.title_ar.includes(search)) ||
      (s.plot && s.plot.toLowerCase().includes(search.toLowerCase()))
  );

  const isRTL = lang === 'ar';

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {lang === 'fr' ? 'Catalogue Vidéo à la Demande (VOD)' : 'مكتبة الفيديو حسب الطلب (VOD)'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'fr'
              ? 'Gérez vos films et séries TV extraits des fournisseurs Xtream Codes et M3U autorisés.'
              : 'إدارة مكتبة الأفلام والمسلسلات المستوردة من مصادر Xtream Codes و M3U المصرح بها.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => { setTab('movies'); setSearch(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              tab === 'movies'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? 'Films' : 'الأفلام'} ({movies.length})</span>
          </button>
          <button
            onClick={() => { setTab('series'); setSearch(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              tab === 'series'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListVideo className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? 'Séries TV' : 'المسلسلات'} ({series.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3 relative">
          <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'fr'
                ? tab === 'movies' ? 'Rechercher un film (titre, synopsis)...' : 'Rechercher une série...'
                : 'البحث عن فيلم أو مسلسل...'
            }
            className={`w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors ${
              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <span className="text-slate-400">{lang === 'fr' ? 'Actifs / Total' : 'المفعلة / الإجمالي'}</span>
          <span className="font-bold font-mono text-emerald-400">
            {tab === 'movies'
              ? `${movies.filter((m) => m.is_active).length} / ${movies.length}`
              : `${series.filter((s) => s.is_active).length} / ${series.length}`}
          </span>
        </div>
      </div>

      {/* Grid of Movies or Series */}
      {loading ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">{lang === 'fr' ? 'Chargement du catalogue...' : 'جاري تحميل المحتوى...'}</p>
        </div>
      ) : tab === 'movies' ? (
        filteredMovies.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60">
            <Film className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">{lang === 'fr' ? 'Aucun film trouvé.' : 'لم يتم العثور على أفلام.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-pink-500/50 transition-all flex flex-col"
              >
                {/* Poster Container */}
                <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <Film className="w-12 h-12" />
                    </div>
                  )}

                  {/* Rating Tag */}
                  {movie.rating && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-amber-300 text-[11px] font-bold flex items-center gap-1 shadow">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{movie.rating}</span>
                    </div>
                  )}

                  {/* Year Tag */}
                  {movie.release_year && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[11px] font-mono shadow">
                      {movie.release_year}
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  {onPlayStream && (
                    <button
                      onClick={() => onPlayStream(movie.title, movie.stream_url)}
                      className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-lg shadow-pink-600/50 transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </button>
                  )}
                </div>

                {/* Content Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-pink-400 transition-colors">
                        {movie.title}
                      </h3>
                      {movie.title_ar && (
                        <span className="text-[11px] text-slate-400 font-arabic font-medium shrink-0" dir="rtl">
                          {movie.title_ar}
                        </span>
                      )}
                    </div>

                    {movie.synopsis && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {movie.synopsis}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{movie.duration_mins ? `${movie.duration_mins} min` : 'N/A'}</span>
                    </div>

                    <button
                      onClick={() => handleToggleMovie(movie.id, movie.is_active)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all ${
                        movie.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{movie.is_active ? (lang === 'fr' ? 'Actif' : 'مفعل') : (lang === 'fr' ? 'Inactif' : 'معطل')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Series Tab */
        filteredSeries.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60">
            <ListVideo className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">{lang === 'fr' ? 'Aucune série trouvée.' : 'لم يتم العثور على مسلسلات.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSeries.map((serie) => (
              <div
                key={serie.id}
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-purple-500/50 transition-all flex flex-col"
              >
                {/* Poster Container */}
                <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
                  {serie.poster_url ? (
                    <img
                      src={serie.poster_url}
                      alt={serie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <ListVideo className="w-12 h-12" />
                    </div>
                  )}

                  {/* Rating Tag */}
                  {serie.rating && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-amber-300 text-[11px] font-bold flex items-center gap-1 shadow">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{serie.rating}</span>
                    </div>
                  )}

                  {/* Seasons Count Badge */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-purple-950/80 backdrop-blur-md border border-purple-700/60 text-purple-300 text-[11px] font-semibold flex items-center gap-1 shadow">
                    <Layers className="w-3 h-3" />
                    <span>{serie.seasons_count} {lang === 'fr' ? 'Saisons' : 'مواسم'}</span>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-purple-400 transition-colors">
                        {serie.title}
                      </h3>
                      {serie.title_ar && (
                        <span className="text-[11px] text-slate-400 font-arabic font-medium shrink-0" dir="rtl">
                          {serie.title_ar}
                        </span>
                      )}
                    </div>

                    {serie.plot && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {serie.plot}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{serie.release_year || 'N/A'}</span>
                    </div>

                    <button
                      onClick={() => handleToggleSeries(serie.id, serie.is_active)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all ${
                        serie.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{serie.is_active ? (lang === 'fr' ? 'Actif' : 'مفعل') : (lang === 'fr' ? 'Inactif' : 'معطل')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
