/**
 * BeShare TV — Simulateur & Bac à Sable de l'API Android (Étape 4)
 * Chemin: /src/components/AndroidApiPlayground.tsx
 * 
 * Permet de tester en direct toutes les requêtes que l'application Android TV
 * exécutera via Retrofit (Handshake, Catégories, Chaînes, Résolution de flux).
 */
import React, { useState } from 'react';
import {
  Smartphone,
  Tv,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Code2,
  Layers,
  Radio,
  Film,
  ListVideo,
  Clock,
  Terminal,
  RefreshCw
} from 'lucide-react';

interface AndroidApiPlaygroundProps {
  lang: 'fr' | 'ar';
}

export const AndroidApiPlayground: React.FC<AndroidApiPlaygroundProps> = ({ lang }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('handshake');
  const [simDeviceId, setSimDeviceId] = useState('android-tv-box-uuid-9874');
  const [simDeviceType, setSimDeviceType] = useState<'android_tv' | 'android_mobile'>('android_tv');
  const [simCategoryType, setSimCategoryType] = useState<'live' | 'movie' | 'series'>('live');
  const [simMaxDevices, setSimMaxDevices] = useState(2);
  const [currentDevicesCount, setCurrentDevicesCount] = useState(1);

  const [isRunning, setIsRunning] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [statusCode, setStatusCode] = useState<number>(200);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [copied, setCopied] = useState(false);

  const runSimulation = async (endpoint: string) => {
    setIsRunning(true);
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 120)); // simulated low latency
    const duration = Math.round(performance.now() - start);
    setLatencyMs(duration);

    if (endpoint === 'handshake') {
      if (currentDevicesCount >= simMaxDevices) {
        setStatusCode(429);
        setApiResponse({
          error: `Limite d'écrans atteinte (${currentDevicesCount}/${simMaxDevices}). Veuillez déconnecter un autre appareil.`,
          max_devices: simMaxDevices,
          active_devices: currentDevicesCount,
          solution: 'Révocation nécessaire depuis le panneau web',
        });
      } else {
        setStatusCode(200);
        setApiResponse({
          success: true,
          message: 'Terminal Android TV authentifié avec succès.',
          user: {
            id: 'usr_7f8b9e6a1234',
            email: 'client@besharetv.com',
            role: 'viewer',
            expires_at: '2027-10-28T22:30:00Z',
            max_devices: simMaxDevices,
          },
          device: {
            device_id: simDeviceId,
            device_type: simDeviceType,
            status: 'authorized',
          },
        });
      }
    } else if (endpoint === 'bootstrap') {
      setStatusCode(200);
      setApiResponse({
        app_name: 'BeShare TV',
        version: '1.0.0',
        server_time: new Date().toISOString(),
        features: {
          live_tv: true,
          vod_movies: true,
          vod_series: true,
          epg: true,
          favorites_sync: true,
          rtl_arabic: true,
        },
        subscription: {
          status: 'active',
          expires_at: '2027-10-28T22:30:00Z',
        },
      });
    } else if (endpoint === 'categories') {
      setStatusCode(200);
      setApiResponse({
        categories: [
          {
            id: 'c1a2-live-01',
            category_type: simCategoryType,
            name: simCategoryType === 'live' ? 'Sports & Compétitions HD' : simCategoryType === 'movie' ? 'Films Action' : 'Séries Drame',
            name_ar: simCategoryType === 'live' ? 'قنوات رياضية عالية الدقة' : simCategoryType === 'movie' ? 'أفلام حركة وسينما' : 'مسلسلات دراما',
            sort_order: 1,
            is_visible: true,
          },
          {
            id: 'c1a2-live-02',
            category_type: simCategoryType,
            name: simCategoryType === 'live' ? 'Généralistes France' : simCategoryType === 'movie' ? 'Comédies' : 'Séries Policières',
            name_ar: simCategoryType === 'live' ? 'قنوات عامة فرنسية' : simCategoryType === 'movie' ? 'أفلام كوميدية' : 'مسلسلات تشويق',
            sort_order: 2,
            is_visible: true,
          },
        ],
      });
    } else if (endpoint === 'channels') {
      setStatusCode(200);
      setApiResponse({
        channels: [
          {
            id: 'ch-101',
            channel_num: 1,
            name: 'TF1 Direct HD',
            logo_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=120',
            epg_channel_id: 'TF1.fr',
            stream_type: 'live',
            sort_order: 1,
          },
          {
            id: 'ch-102',
            channel_num: 2,
            name: 'beIN Sports 1 Premium HD',
            logo_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120',
            epg_channel_id: 'beIN1.fr',
            stream_type: 'live',
            sort_order: 2,
          },
        ],
        page: 1,
        limit: 50,
        total: 14,
        has_more: false,
      });
    } else if (endpoint === 'resolve_stream') {
      setStatusCode(200);
      setApiResponse({
        success: true,
        media_id: 'ch-102',
        media_type: 'channel',
        title: 'beIN Sports 1 Premium HD',
        stream_url: 'https://authorized-cdn.tv/live/bein1.m3u8',
        expires_in_secs: 7200,
        security_token: 'tok_live_stream_9918237',
      });
    } else if (endpoint === 'epg') {
      setStatusCode(200);
      setApiResponse({
        programs: [
          {
            id: 'epg-01',
            epg_channel_id: 'beIN1.fr',
            title: 'Ligue des Champions — Direct Multiplex',
            description: 'Soirée européenne en direct avec analyses d’avant-match.',
            start_time: '2026-10-29T20:00:00Z',
            end_time: '2026-10-29T23:00:00Z',
            category: 'Sport',
          },
          {
            id: 'epg-02',
            epg_channel_id: 'beIN1.fr',
            title: 'Le Club du Dimanche — Débrief',
            description: 'Retour complet sur les meilleurs moments et résumés des rencontres.',
            start_time: '2026-10-29T23:00:00Z',
            end_time: '2026-10-30T00:30:00Z',
            category: 'Talk-Show',
          },
        ],
      });
    }

    setIsRunning(false);
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">
              {lang === 'fr' 
                ? 'Étape 4 : API Gateway Dédiée à l’Application Android' 
                : 'المرحلة 4: واجهة برمجية متخصصة لتطبيق أندرويد'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'fr'
              ? 'Endpoints Retrofit / JSON sécurisés : Handshake, limitation d’écrans, catalogue Live/VOD et flux tokenisé.'
              : 'نقاط نهاية برمجية سريعة ومحمية لجميع أقسام التطبيق مع ضبط حصة الأجهزة.'}
          </p>
        </div>

        <span className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold">
          Edge Function /client-api
        </span>
      </div>

      {/* Endpoint Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { id: 'handshake', label: '1. Handshake TV', desc: 'Contrôle écrans' },
          { id: 'bootstrap', label: '2. Bootstrap', desc: 'Initialisation' },
          { id: 'categories', label: '3. Catégories', desc: 'FR & Arabe RTL' },
          { id: 'channels', label: '4. Chaînes Live', desc: 'Grille TV' },
          { id: 'resolve_stream', label: '5. Résolution Flux', desc: 'ExoPlayer URL' },
          { id: 'epg', label: '6. Guide EPG', desc: 'Programmes' },
        ].map((ep) => (
          <button
            key={ep.id}
            onClick={() => {
              setSelectedEndpoint(ep.id);
              runSimulation(ep.id);
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedEndpoint === ep.id
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 border-indigo-500'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <div className="text-xs">{ep.label}</div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{ep.desc}</div>
          </button>
        ))}
      </div>

      {/* Simulator Parameters Bar */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-white">
              {lang === 'fr' ? 'Paramètres du Terminal Simulé :' : 'إعدادات الجهاز التجريبي:'}
            </span>
          </div>

          <button
            onClick={() => runSimulation(selectedEndpoint)}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {lang === 'fr' ? 'Exécuter la Requête' : 'تنفيذ الطلب البرمجي'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-slate-400 text-[11px]">x-device-id (UUID Matériel)</label>
            <input
              type="text"
              value={simDeviceId}
              onChange={(e) => setSimDeviceId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-[11px]">x-device-type</label>
            <select
              value={simDeviceType}
              onChange={(e) => setSimDeviceType(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
            >
              <option value="android_tv">android_tv (Téléviseur / Box)</option>
              <option value="android_mobile">android_mobile (Smartphone / Tablette)</option>
            </select>
          </div>

          {selectedEndpoint === 'handshake' && (
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">Écrans actifs / Quota Max</label>
              <div className="flex items-center gap-2">
                <select
                  value={currentDevicesCount}
                  onChange={(e) => setCurrentDevicesCount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value={1}>1 appareil actif</option>
                  <option value={2}>2 appareils actifs (Quota)</option>
                  <option value={3}>3 appareils actifs (Dépassement)</option>
                </select>
              </div>
            </div>
          )}

          {selectedEndpoint === 'categories' && (
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">Paramètre type</label>
              <select
                value={simCategoryType}
                onChange={(e) => {
                  setSimCategoryType(e.target.value as any);
                  runSimulation('categories');
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
              >
                <option value="live">live (Chaînes Direct)</option>
                <option value="movie">movie (Films VOD)</option>
                <option value="series">series (Séries TV)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Response Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              {lang === 'fr' ? 'Réponse du Serveur (JSON) :' : 'رد الخادم (JSON):'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
              statusCode === 200
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              HTTP {statusCode}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">{latencyMs} ms</span>
          </div>

          <button
            onClick={() => copyCode(JSON.stringify(apiResponse, null, 2))}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? (lang === 'fr' ? 'Copié !' : 'تم النسخ') : (lang === 'fr' ? 'Copier le JSON' : 'نسخ الرد')}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-72">
          <pre>{JSON.stringify(apiResponse || { message: 'Cliquez sur Exécuter la Requête' }, null, 2)}</pre>
        </div>
      </div>

      {/* Kotlin Retrofit Code Preview */}
      <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold font-mono">
            <Code2 className="w-4 h-4" />
            <span>BeShareApiService.kt (Module Android Retrofit — Étape 5)</span>
          </div>
          <span className="text-[11px] text-slate-400">Kotlin Coroutines / suspend</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
          {selectedEndpoint === 'handshake' && (
            <pre>{`@POST("client-api?action=handshake")
suspend fun deviceHandshake(
    @Header("x-device-id") deviceId: String,
    @Header("x-device-type") deviceType: String = "android_tv"
): Response<HandshakeResponse>`}</pre>
          )}

          {selectedEndpoint === 'categories' && (
            <pre>{`@GET("client-api?action=categories")
suspend fun getCategories(
    @Query("type") type: String // "live", "movie", "series"
): Response<CategoriesResponse>`}</pre>
          )}

          {selectedEndpoint === 'channels' && (
            <pre>{`@GET("client-api?action=channels")
suspend fun getChannels(
    @Query("category_id") categoryId: String?,
    @Query("page") page: Int = 1
): Response<ChannelsResponse>`}</pre>
          )}

          {selectedEndpoint === 'resolve_stream' && (
            <pre>{`@GET("client-api?action=resolve_stream")
suspend fun resolveStream(
    @Query("type") type: String, // "channel" | "movie"
    @Query("id") id: String
): Response<StreamResolveResponse>`}</pre>
          )}

          {selectedEndpoint === 'bootstrap' && (
            <pre>{`@GET("client-api?action=bootstrap")
suspend fun getBootstrap(): Response<BootstrapResponse>`}</pre>
          )}

          {selectedEndpoint === 'epg' && (
            <pre>{`@GET("client-api?action=epg")
suspend fun getEpg(
    @Query("channel_id") channelId: String
): Response<EpgResponse>`}</pre>
          )}
        </div>
      </div>
    </div>
  );
};
