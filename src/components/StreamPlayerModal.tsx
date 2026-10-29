/**
 * BeShare TV — Lecteur Vidéo de Test Résilient (HLS, MP4 & Proxy Sécurisé)
 * Chemin: /src/components/StreamPlayerModal.tsx
 * 
 * Permet à l'administrateur de tester la lecture réelle d'un flux HLS (.m3u8) ou MP4
 * avec contournement automatique du Mixed Content (HTTP sur HTTPS) et CORS via /api/stream-proxy,
 * diagnostic de connectivité en direct et compatibilité ExoPlayer native.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Copy,
  ExternalLink,
  Activity,
  Check,
  Info,
  Shield,
  Smartphone
} from 'lucide-react';
import Hls from 'hls.js';
import { Channel } from '../types';

interface StreamPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  lang: 'fr' | 'ar';
}

export const StreamPlayerModal: React.FC<StreamPlayerModalProps> = ({
  isOpen,
  onClose,
  channel,
  lang,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-enable proxy if webpage is on HTTPS and stream is plain HTTP (prevents browser Mixed Content blocking)
  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const rawUrl = channel?.stream_url || '';
  const isHttpStream = rawUrl.startsWith('http://');

  const [useProxy, setUseProxy] = useState<boolean>(isHttpsPage && isHttpStream);
  const [streamStats, setStreamStats] = useState<{
    resolution?: string;
    bitrate?: string;
    protocol: string;
    loadVia: 'proxy' | 'direct';
  }>({
    protocol: 'HLS / Live',
    loadVia: isHttpsPage && isHttpStream ? 'proxy' : 'direct',
  });

  // Diagnostic states
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    tested: boolean;
    success: boolean;
    status?: number;
    latencyMs?: number;
    contentType?: string;
    message: string;
  } | null>(null);

  const getEffectiveUrl = useCallback(
    (originalUrl: string, proxyEnabled: boolean) => {
      if (!originalUrl) return '';
      if (proxyEnabled) {
        return `/api/stream-proxy?url=${encodeURIComponent(originalUrl)}`;
      }
      return originalUrl;
    },
    []
  );

  const initPlayer = useCallback(
    (forceProxy?: boolean) => {
      if (!channel || !videoRef.current) return;

      const video = videoRef.current;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      setErrorMsg(null);
      const shouldProxy = forceProxy !== undefined ? forceProxy : useProxy;
      const effectiveUrl = getEffectiveUrl(channel.stream_url, shouldProxy);
      const isHls =
        channel.stream_url.includes('.m3u8') ||
        channel.stream_url.includes('/live/') ||
        shouldProxy;

      setStreamStats((prev) => ({
        ...prev,
        loadVia: shouldProxy ? 'proxy' : 'direct',
      }));

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });

        hlsRef.current = hls;
        hls.loadSource(effectiveUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
          setErrorMsg(null);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          const level = hls.levels[data.level];
          if (level) {
            setStreamStats((prev) => ({
              ...prev,
              resolution: `${level.width}x${level.height}`,
              bitrate: `${Math.round(level.bitrate / 1000)} kbps`,
            }));
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // If direct failed and proxy is not yet used, auto-switch to proxy!
                if (!shouldProxy) {
                  console.warn('Direct stream failed, switching to secure stream proxy...');
                  setUseProxy(true);
                  initPlayer(true);
                  return;
                }
                setErrorMsg(
                  lang === 'fr'
                    ? 'Erreur réseau : flux distant inaccessible ou serveur IPTV hors ligne.'
                    : 'خطأ في الشبكة: تعذر الوصول إلى البث أو الخادم غير متاح.'
                );
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setErrorMsg(
                  lang === 'fr'
                    ? 'Format média non décodable par le navigateur (codec audio/vidéo incompatible).'
                    : 'صيغة الفيديو غير مدعومة مباشرة في متصفح الويب.'
                );
                hls.recoverMediaError();
                break;
              default:
                setErrorMsg(
                  lang === 'fr'
                    ? 'Impossible de charger ce flux dans le navigateur.'
                    : 'تعذر تشغيل هذا البث داخل المتصفح.'
                );
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS for Safari
        video.src = effectiveUrl;
        video.addEventListener('loadedmetadata', () => {
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        });
        video.onerror = () => {
          if (!shouldProxy) {
            setUseProxy(true);
            initPlayer(true);
          } else {
            setErrorMsg(lang === 'fr' ? 'Échec de lecture du flux' : 'تعذر تشغيل البث');
          }
        };
      } else {
        // Standard MP4 fallback
        video.src = effectiveUrl;
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    },
    [channel, useProxy, lang, getEffectiveUrl]
  );

  useEffect(() => {
    if (!isOpen || !channel) return;

    // Reset proxy mode according to current protocol
    const autoProxy = isHttpsPage && channel.stream_url.startsWith('http://');
    setUseProxy(autoProxy);
    setDiagResult(null);

    // Short timeout to let the modal mount its ref
    const timer = setTimeout(() => {
      initPlayer(autoProxy);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, [isOpen, channel]);

  if (!isOpen || !channel) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleToggleProxy = () => {
    const nextProxy = !useProxy;
    setUseProxy(nextProxy);
    initPlayer(nextProxy);
  };

  const handleCopyUrl = () => {
    if (!channel) return;
    navigator.clipboard.writeText(channel.stream_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunDiagnostic = async () => {
    if (!channel) return;
    setIsDiagnosing(true);
    setDiagResult(null);

    try {
      const res = await fetch(`/api/test-stream?url=${encodeURIComponent(channel.stream_url)}`);
      const data = await res.json();
      setDiagResult({
        tested: true,
        success: data.success,
        status: data.status,
        latencyMs: data.latencyMs,
        contentType: data.contentType,
        message: data.message || (data.success ? 'Flux accessible' : 'Erreur de connexion'),
      });
    } catch (err: any) {
      setDiagResult({
        tested: true,
        success: false,
        message: `Erreur diagnostic : ${err.message}`,
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3 min-w-0">
            {channel.logo_url ? (
              <img
                src={channel.logo_url}
                alt={channel.name}
                className="w-9 h-9 rounded-xl object-contain bg-slate-950 p-1 border border-slate-800 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white truncate">{channel.name}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold shrink-0">
                  LIVE
                </span>
                {useProxy && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono shrink-0">
                    PROXY ACTIF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {channel.category_name || (lang === 'fr' ? 'Diffusion en direct' : 'بث مباشر')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Canvas */}
        <div className="relative bg-black aspect-video flex items-center justify-center group overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain"
          />

          {/* Error & Diagnostic Overlay */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/92 flex flex-col items-center justify-center p-5 text-center space-y-3 z-10 overflow-y-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1 max-w-md">
                <div className="text-white text-sm font-bold">
                  {lang === 'fr' ? 'Échec de lecture du flux' : 'تعذر تشغيل البث في المتصفح'}
                </div>
                <div className="text-xs text-rose-300 font-medium">{errorMsg}</div>
                <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                  {lang === 'fr'
                    ? 'Les navigateurs bloquent souvent les flux IPTV (requêtes HTTP sur page HTTPS ou absence d’en-têtes CORS).'
                    : 'تقوم متصفحات الويب بحظر روابط البث عبر بروتوكول HTTP غير المشفر أو غياب ترويسات CORS.'}
                </p>
              </div>

              {/* Action Buttons for Troubleshooting */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleToggleProxy}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-600/30"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {useProxy
                      ? (lang === 'fr' ? 'Tenter en Direct (Sans Proxy)' : 'تجربة بدون بروكسي')
                      : (lang === 'fr' ? 'Activer le Proxy Sécurisé' : 'تفعيل البروكسي الآمن')}
                  </span>
                </button>

                <button
                  onClick={handleRunDiagnostic}
                  disabled={isDiagnosing}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                  <span>{lang === 'fr' ? 'Diagnostiquer le Serveur' : 'فحص الخادم'}</span>
                </button>

                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (lang === 'fr' ? 'Copié !' : 'تم النسخ!') : (lang === 'fr' ? 'Copier le lien' : 'نسخ الرابط')}</span>
                </button>
              </div>

              {/* Diagnostic Result Box */}
              {diagResult && (
                <div
                  className={`p-3 rounded-xl border text-xs text-left max-w-md w-full space-y-1.5 mt-2 ${
                    diagResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>
                      {diagResult.success
                        ? (lang === 'fr' ? 'Serveur joignable' : 'الخادم متاح')
                        : (lang === 'fr' ? 'Serveur inaccessible' : 'الخادم غير مستجيب')}
                    </span>
                    {diagResult.latencyMs && (
                      <span className="font-mono text-[10px]">{diagResult.latencyMs} ms</span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{diagResult.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Player Overlay Controls */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleMute}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur transition-all cursor-pointer"
                title={isMuted ? 'Activer le son' : 'Couper le son'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <span className="text-[11px] text-slate-300 font-mono ml-1">
                {isMuted ? (lang === 'fr' ? '(Muet)' : '(كتم)') : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              {streamStats.resolution && (
                <span className="px-2 py-0.5 rounded bg-white/10 text-emerald-400 text-[11px]">
                  {streamStats.resolution}
                </span>
              )}
              {streamStats.bitrate && (
                <span className="text-[11px] text-slate-300">{streamStats.bitrate}</span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  streamStats.loadVia === 'proxy'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                }`}
              >
                {streamStats.loadVia === 'proxy' ? 'PROXY' : 'DIRECT'}
              </span>
            </div>
          </div>
        </div>

        {/* Native Android / ExoPlayer Compatibility Notice */}
        <div className="p-3.5 bg-slate-950/70 border-t border-slate-800 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-slate-200">
              {lang === 'fr'
                ? 'Compatibilité Android TV & Smartphone (Application Native)'
                : 'التوافق مع أجهزة أندرويد وتلفزيونات Android TV'}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'fr'
                ? 'L’application Android BeShare TV utilise ExoPlayer / Media3 directement : elle lit vos flux http:// sans aucune restriction de navigateur (pas de blocage Mixed Content ni de CORS).'
                : 'تطبيق BeShare TV على أندرويد يستخدم ExoPlayer الأصلي مباشرة: يشغل روابط http:// بسلاسة وبدون أي قيود متصفح أو حظر أمني.'}
            </p>
          </div>
        </div>

        {/* Footer Technical Metadata & Quick Tools */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 min-w-0 max-w-full">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate font-mono text-[11px] text-slate-300">
              {channel.stream_url.replace(/(live\/[^\/]+\/)[^\/]+(\/)/, '$1[PROTÉGÉ]$2')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={handleCopyUrl}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] flex items-center gap-1 transition-all cursor-pointer"
              title={lang === 'fr' ? 'Copier l’URL' : 'نسخ الرابط'}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? (lang === 'fr' ? 'Copié' : 'تم النسخ') : (lang === 'fr' ? 'Copier' : 'نسخ')}</span>
            </button>

            <a
              href={`vlc://${channel.stream_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] flex items-center gap-1 transition-all"
              title={lang === 'fr' ? 'Ouvrir dans VLC' : 'فتح في VLC'}
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              <span>VLC</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
