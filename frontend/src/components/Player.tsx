'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, RotateCcw, RotateCw,
  Loader2, AlertCircle, ChevronLeft,
} from 'lucide-react';
import { streamApi } from '@/lib/api';

interface PlayerProps {
  episodeId: string;
  title?: string;
  epLabel?: string;
  startAt?: number;
  onBack?: () => void;
  onProgress?: (sec: number) => void;
}

export default function Player({ episodeId, title, epLabel, startAt = 0, onBack, onProgress }: PlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef      = useRef<any>(null);
  const hbRef       = useRef<NodeJS.Timeout>();
  const hideRef     = useRef<NodeJS.Timeout>();
  const lastSaved   = useRef(0);

  const [st, setSt] = useState({
    loading: true, error: '',
    playing: false, muted: false, fullscreen: false,
    showCtrl: true, currentTime: 0, duration: 0, buffered: 0,
  });
  const set = (p: Partial<typeof st>) => setSt(s => ({ ...s, ...p }));

  // ── Load stream ──────────────────────────────────────
  useEffect(() => {
    let dead = false;
    (async () => {
      set({ loading: true, error: '' });
      try {
        const { token } = await streamApi.request(episodeId);
        const playUrl   = streamApi.playUrl(token);
        const Hls       = (await import('hls.js')).default;
        const video     = videoRef.current!;

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, backBufferLength: 60, maxBufferLength: 45 });
          hlsRef.current = hls;
          hls.loadSource(playUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (dead) return;
            if (startAt > 0) video.currentTime = startAt;
            video.play().catch(() => {});
            set({ loading: false });
          });
          hls.on(Hls.Events.ERROR, (_: any, d: any) => {
            if (d.fatal) set({ loading: false, error: 'Stream error. Please retry.' });
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = playUrl;
          if (startAt > 0) video.currentTime = startAt;
          video.play().catch(() => {});
          set({ loading: false });
        } else {
          set({ loading: false, error: 'Browser does not support HLS.' });
        }
      } catch (err: any) {
        set({ loading: false, error: err?.error || 'Failed to load stream.' });
      }
    })();
    return () => {
      dead = true;
      hlsRef.current?.destroy();
      streamApi.stop(episodeId).catch(() => {});
      clearInterval(hbRef.current);
    };
  }, [episodeId, startAt]);

  // ── Heartbeat ────────────────────────────────────────
  useEffect(() => {
    hbRef.current = setInterval(() => streamApi.heartbeat(episodeId).catch(() => {}), 30000);
    return () => clearInterval(hbRef.current);
  }, [episodeId]);

  // ── Save progress ────────────────────────────────────
  const saveProgress = useCallback((t: number, done = false) => {
    if (Math.abs(t - lastSaved.current) < 8) return;
    lastSaved.current = t;
    streamApi.progress(episodeId, t, done).catch(() => {});
    onProgress?.(t);
  }, [episodeId, onProgress]);

  // ── Video events ─────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const on  = (e: string, fn: () => void) => v.addEventListener(e, fn);
    const off = (e: string, fn: () => void) => v.removeEventListener(e, fn);

    const handlers: Record<string, () => void> = {
      play:           () => set({ playing: true }),
      pause:          () => set({ playing: false }),
      waiting:        () => set({ loading: true }),
      canplay:        () => set({ loading: false }),
      durationchange: () => set({ duration: v.duration }),
      timeupdate:     () => {
        set({ currentTime: v.currentTime });
        saveProgress(v.currentTime, v.duration > 0 && (v.duration - v.currentTime) < 30);
      },
      progress: () => {
        if (v.buffered.length)
          set({ buffered: (v.buffered.end(v.buffered.length - 1) / v.duration) * 100 });
      },
      ended: () => saveProgress(v.duration, true),
      volumechange: () => set({ muted: v.muted }),
    };

    Object.entries(handlers).forEach(([e, fn]) => on(e, fn));
    return () => Object.entries(handlers).forEach(([e, fn]) => off(e, fn));
  }, [saveProgress]);

  // ── Auto-hide controls ────────────────────────────────
  const showCtrl = useCallback(() => {
    set({ showCtrl: true });
    clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) set({ showCtrl: false });
    }, 3200);
  }, []);

  // ── Actions ───────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current!;
    v.paused ? v.play() : v.pause();
  };
  const skip = (s: number) => {
    const v = videoRef.current!;
    v.currentTime = Math.max(0, Math.min(v.currentTime + s, v.duration));
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current!;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  };
  const toggleFs = async () => {
    const el = containerRef.current!;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      set({ fullscreen: true });
    } else {
      await document.exitFullscreen?.();
      set({ fullscreen: false });
    }
  };

  const pct = st.duration > 0 ? (st.currentTime / st.duration) * 100 : 0;
  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden"
      style={{ aspectRatio: '16/9', cursor: st.showCtrl ? 'default' : 'none' }}
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
      onClick={togglePlay}
    >
      <video ref={videoRef} className="w-full h-full" playsInline style={{ display: 'block' }} />

      {/* Spinner */}
      {st.loading && !st.error && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <Loader2 size={38} className="animate-spin" style={{ color: '#9d7ffd' }} />
        </div>
      )}

      {/* Error */}
      {st.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <AlertCircle size={36} style={{ color: '#f87171' }} />
          <p className="text-sm" style={{ color: '#f87171' }}>{st.error}</p>
          <button className="btn text-sm" onClick={e => { e.stopPropagation(); window.location.reload(); }}>Retry</button>
        </div>
      )}

      {/* Controls */}
      {!st.error && (
        <div
          className="absolute inset-0 flex flex-col justify-between transition-opacity duration-300"
          style={{ opacity: st.showCtrl ? 1 : 0, pointerEvents: st.showCtrl ? 'auto' : 'none' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top bar */}
          <div className="flex items-center gap-3 px-3 pt-3" style={{ background: 'linear-gradient(rgba(0,0,0,0.65), transparent)' }}>
            {onBack && (
              <button onClick={onBack} className="w-8 h-8 rounded-xl glass flex items-center justify-center">
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {title && <p className="text-xs font-bold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</p>}
              {epLabel && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{epLabel}</p>}
            </div>
          </div>

          {/* Center */}
          <div className="flex items-center justify-center gap-10" onClick={togglePlay}>
            <button onClick={e => { e.stopPropagation(); skip(-10); }} className="w-10 h-10 rounded-full glass flex items-center justify-center">
              <RotateCcw size={17} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); togglePlay(); }}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #f040a0)' }}
            >
              {st.playing ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
            </button>
            <button onClick={e => { e.stopPropagation(); skip(10); }} className="w-10 h-10 rounded-full glass flex items-center justify-center">
              <RotateCw size={17} />
            </button>
          </div>

          {/* Bottom */}
          <div className="px-3 pb-3" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.82))' }}>
            {/* Progress */}
            <div className="progress-track mb-3 cursor-pointer" onClick={seek}>
              <div className="absolute h-full rounded" style={{ width: `${st.buffered}%`, background: 'rgba(255,255,255,0.18)' }} />
              <div className="progress-fill" style={{ width: `${pct}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md"
                style={{ left: `calc(${pct}% - 6px)` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay}>
                  {st.playing ? <Pause size={17} fill="white" /> : <Play size={17} fill="white" />}
                </button>
                <button onClick={() => { const v = videoRef.current!; v.muted = !v.muted; }}>
                  {st.muted
                    ? <VolumeX size={17} style={{ color: 'rgba(255,255,255,0.6)' }} />
                    : <Volume2 size={17} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  }
                </button>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {fmt(st.currentTime)} / {fmt(st.duration)}
                </span>
              </div>
              <button onClick={toggleFs}>
                {st.fullscreen
                  ? <Minimize size={17} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  : <Maximize size={17} style={{ color: 'rgba(255,255,255,0.6)' }} />
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
