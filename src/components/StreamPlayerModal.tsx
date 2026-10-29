/**
 * BeShare TV — Lecteur Vidéo de Test (HLS & MP4)
 * Chemin: /src/components/StreamPlayerModal.tsx
 * 
 * Permet à l'administrateur de tester la lecture réelle d'un flux HLS (.m3u8) ou MP4
 * avec inspection de la latence, codec et métadonnées techniques.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Radio, AlertTriangle, ShieldCheck } from 'lucide-react';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Muted by default to allow autoplay in browsers
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamStats, setStreamStats] = useState<{
    resolution?: string;
    bitrate?: string;
    bufferedSecs?: number;
    protocol: string;
  }>({ protocol: 'HLS / Live' });

  useEffect(() => {
    if (!isOpen || !channel || !videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: Hls | null = null;
    setErrorMsg(null);

    const streamUrl = channel.stream_url;
    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('/live/');

    if (isHls && Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });

      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });

      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hlsInstance?.levels[data.level];
        if (level) {
          setStreamStats((prev) => ({
            ...prev,
            resolution: `${level.width}x${level.height}`,
            bitrate: `${Math.round(level.bitrate / 1000)} kbps`,
          }));
        }
      });

      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMsg(lang === 'fr' ? 'Erreur réseau : flux distant inaccessible ou hors ligne.' : 'خطأ في الشبكة: تعذر الوصول إلى البث.');
              hlsInstance?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMsg(lang === 'fr' ? 'Erreur de décodage média : format de flux non reconnu.' : 'خطأ في فك ترميز الفيديو.');
              hlsInstance?.recoverMediaError();
              break;
            default:
              setErrorMsg(lang === 'fr' ? 'Erreur critique de lecture du flux.' : 'خطأ غير متوقع في المشغل.');
              hlsInstance?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS Native HLS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    } else {
      // Fallback standard HTML5 video (MP4 / WebM)
      video.src = streamUrl;
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [isOpen, channel, lang]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            {channel.logo_url ? (
              <img
                src={channel.logo_url}
                alt={channel.name}
                className="w-8 h-8 rounded-lg object-contain bg-slate-800 p-0.5 border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">{channel.name}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {channel.category_name || (lang === 'fr' ? 'Diffusion en direct' : 'بث مباشر')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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

          {errorMsg && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
              <div className="text-white text-sm font-semibold">
                {lang === 'fr' ? 'Échec de lecture du flux' : 'تعذر تشغيل البث'}
              </div>
              <div className="text-xs text-slate-400 max-w-md">{errorMsg}</div>
            </div>
          )}

          {/* Quick Player Overlay Controls */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <span className="text-[11px] text-slate-300 font-mono ml-2">
                {isMuted ? (lang === 'fr' ? '(Muet)' : '(كتم)') : ''}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
              {streamStats.resolution && (
                <span className="px-2 py-0.5 rounded bg-white/10 text-emerald-400 text-[11px]">
                  {streamStats.resolution}
                </span>
              )}
              {streamStats.bitrate && (
                <span className="text-[11px] text-slate-300">{streamStats.bitrate}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Technical Metadata */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate max-w-md font-mono text-[11px]">
              {channel.stream_url.replace(/(live\/[^\/]+\/)[^\/]+(\/)/, '$1[PROTÉGÉ]$2')}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {lang === 'fr' ? 'ExoPlayer / Media3 Compatible' : 'متوافق مع ExoPlayer'}
          </div>
        </div>
      </div>
    </div>
  );
};
