"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { playlists, type Track } from "./tracks";
import { ambientEngine } from "./ambient-sound-engine";

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

declare namespace YT {
  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { target: Player; data: number }) => void;
      onError?: (event: { target: Player; data: number }) => void;
    };
  }
  class Player {
    constructor(element: string | HTMLElement, options: PlayerOptions);
    loadVideoById(videoId: string): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    setVolume(volume: number): void;
    getVolume(): number;
    destroy(): void;
  }
  const PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

type Props = Record<string, never>;

const PLAYLISTS = Object.entries(playlists);

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function GlassShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-white/10 bg-gradient-to-b from-white/[0.15] to-white/[0.055] backdrop-blur-3xl backdrop-saturate-[1.7] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] ${className}`}>
      {children}
    </div>
  );
}

function TransportButton({ label, onClick, children, className = "" }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button aria-label={label} onClick={onClick} className={`grid h-11 w-11 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95 ${className}`}>
      {children}
    </button>
  );
}

function PlayIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <Play className="ml-0.5 h-5 w-5 fill-current text-black" />
  ) : (
    <Pause className="h-5 w-5 fill-current text-black" />
  );
}

function Vinyl({ track: song, playing, mobile = false }: { track: Track | undefined; playing: boolean; mobile?: boolean }) {
  const size = mobile ? "h-16 w-16" : "h-20 w-20";
  return (
    <div className={`relative shrink-0 ${size}`}>
      <div className={`vinyl-spin relative h-full w-full rounded-full border border-white/15 bg-[radial-gradient(circle_at_center,#30302d_0_9%,#11110f_10%_18%,#24231f_19%_44%,#0a0908_45%_100%)] shadow-2xl ${playing ? "[animation-play-state:running]" : "[animation-play-state:paused]"}`}>
        <div className="absolute inset-2 grid place-items-center overflow-hidden rounded-full border border-white/10 bg-black/50">
          {song?.videoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg`}
              alt={song.title}
              className="h-full w-full object-cover rounded-full filter saturate-[0.85] contrast-[1.1]"
            />
          ) : (
            <div className="aspect-video w-[88%] rounded-[5px] bg-black/45 px-1 text-center text-[7px] uppercase tracking-[0.12em] text-white/45 grid place-items-center">
              Add licensed YouTube video
            </div>
          )}
        </div>
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1918] ring-2 ring-white/60 shadow-inner" />
      </div>
    </div>
  );
}

function SeekBar({ progress, onSeek }: { progress: number; onSeek: (value: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    node.setPointerCapture(event.pointerId);
    const update = (clientX: number) => {
      const rect = node.getBoundingClientRect();
      const value = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(value);
    };
    update(event.clientX);
    const move = (moveEvent: PointerEvent) => update(moveEvent.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  return (
    <div ref={ref} onPointerDown={handlePointerDown} className="seek-input group relative h-6 w-full cursor-pointer touch-none" aria-label="Seek">
      <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/15" />
      <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--color-accent)] shadow-[0_0_10px_rgba(240,138,56,0.75)]" style={{ width: `${progress * 100}%` }} />
      <div className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-0 shadow-[0_0_8px_rgba(255,176,93,0.9)] transition group-hover:opacity-100" style={{ left: `calc(${progress * 100}% - 5px)` }} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-10 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 px-1">
      <GlassShell className="rounded-[26px] p-4 text-center text-white/70">
        <p className="text-sm font-semibold text-white">Add your licensed YouTube uploads</p>
        <p className="mt-1 text-xs">Edit <code className="text-white">app/tracks.ts</code>. One track = one line.</p>
      </GlassShell>
    </div>
  );
}

export default function MusicPlayer(_: Props) {
  const [playlistName, setPlaylistName] = useState(PLAYLISTS[0]?.[0] ?? "Roja Radio");
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<YT.Player | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  const tracks = playlists[playlistName] ?? [];
  const current = tracks[trackIndex];

  const stopTicker = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const syncProgress = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.getDuration !== "function") return;
    const nextDuration = player.getDuration() || current?.duration || 0;
    const nextElapsed = player.getCurrentTime() || 0;
    setDuration(nextDuration);
    setElapsed(nextElapsed);
    setProgress(nextDuration ? nextElapsed / nextDuration : 0);
  }, [current?.duration]);

  const startTicker = useCallback(() => {
    stopTicker();
    intervalRef.current = window.setInterval(syncProgress, 400);
  }, [stopTicker, syncProgress]);

  const playTrack = useCallback((index: number, autoplay = false) => {
    ambientEngine.stopAllVoices();
    ambientEngine.playRadioTuningStatic();
    ambientEngine.triggerOccasionalBumper();
    setTrackIndex(index);
    setProgress(0);
    setElapsed(0);
    const song = tracks[index];
    if (!song?.videoId) {
      setPlaying(false);
      return;
    }
    window.setTimeout(() => {
      const p = playerRef.current;
      if (!p || typeof p.loadVideoById !== "function") return;
      p.loadVideoById(song.videoId);
      if (autoplay) p.playVideo();
    }, 0);
  }, [tracks]);

  const next = useCallback(() => {
    ambientEngine.stopAllVoices();
    if (!tracks.length) return;
    playTrack((trackIndex + 1) % tracks.length, true);
  }, [playTrack, trackIndex, tracks.length]);

  const previous = useCallback(() => {
    ambientEngine.stopAllVoices();
    if (!tracks.length) return;
    playTrack((trackIndex - 1 + tracks.length) % tracks.length, true);
  }, [playTrack, trackIndex, tracks.length]);

  // Handle sleep timer auto-pause
  useEffect(() => {
    const handleSleepTimer = () => {
      const p = playerRef.current;
      if (p && typeof p.pauseVideo === "function") {
        p.pauseVideo();
        setPlaying(false);
      }
    };
    window.addEventListener("sleep-timer-expired", handleSleepTimer);
    return () => window.removeEventListener("sleep-timer-expired", handleSleepTimer);
  }, []);

  // Broadcast current track info to voice assistant
  useEffect(() => {
    if (current) {
      window.dispatchEvent(
        new CustomEvent("radio-current-track-info", {
          detail: {
            title: current.title,
            artist: current.artist,
            film: current.film,
            playlistName,
            playing,
          },
        })
      );
    }
  }, [current, playlistName, playing]);

  const seek = useCallback((value: number) => {
    const target = (playerRef.current?.getDuration() || duration || current?.duration || 0) * value;
    if (playerRef.current && target >= 0 && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(target, true);
      setElapsed(target);
      setProgress(value);
    }
  }, [current?.duration, duration]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p || !current?.videoId) return;
    if (typeof p.playVideo !== "function") return;
    try {
      const state = typeof p.getPlayerState === "function" ? p.getPlayerState() : -1;
      if (state === window.YT?.PlayerState.PLAYING) {
        p.pauseVideo();
      } else {
        p.playVideo();
      }
    } catch {
      p.playVideo();
    }
  }, [current?.videoId]);

  const changePlaylist = useCallback((name: string) => {
    ambientEngine.stopAllVoices();
    ambientEngine.playCassetteClick();
    ambientEngine.playRadioTuningStatic();
    setPlaylistName(name);
    setTrackIndex(0);
    setPlaying(false);
    setProgress(0);
    setElapsed(0);
    setDuration(0);
  }, []);

  // Handle voice commands
  useEffect(() => {
    const handleVoicePlay = () => {
      const p = playerRef.current;
      if (p && typeof p.playVideo === "function") {
        p.playVideo();
      }
    };

    const handleVoicePause = () => {
      const p = playerRef.current;
      if (p && typeof p.pauseVideo === "function") {
        p.pauseVideo();
      }
    };

    const handleVoiceNext = () => next();
    const handleVoicePrev = () => previous();
    const handleVoiceRestart = () => seek(0);

    const handleVoiceSelectPlaylist = (e: any) => {
      const name = e.detail?.playlistName;
      if (name && playlists[name]) {
        changePlaylist(name);
        window.setTimeout(() => {
          const p = playerRef.current;
          const targetSong = playlists[name]?.[0];
          if (p && targetSong?.videoId && typeof p.loadVideoById === "function") {
            p.loadVideoById(targetSong.videoId);
            p.playVideo();
            setPlaying(true);
          }
        }, 150);
      }
    };

    const handleVoiceSelectTrack = (e: any) => {
      const { playlistName: targetPlaylist, trackIndex: targetIndex } = e.detail || {};
      if (targetPlaylist && playlists[targetPlaylist]) {
        setPlaylistName(targetPlaylist);
        setTrackIndex(targetIndex);
        setProgress(0);
        setElapsed(0);
        ambientEngine.stopAllVoices();
        ambientEngine.playRadioTuningStatic();
        window.setTimeout(() => {
          const song = playlists[targetPlaylist]?.[targetIndex];
          const p = playerRef.current;
          if (p && song?.videoId && typeof p.loadVideoById === "function") {
            p.loadVideoById(song.videoId);
            p.playVideo();
            setPlaying(true);
          }
        }, 150);
      }
    };

    const handleVoiceDuck = () => {
      const p = playerRef.current;
      if (p && typeof p.setVolume === "function") {
        p.setVolume(20);
      }
    };

    const handleVoiceUnduck = () => {
      const p = playerRef.current;
      if (p && typeof p.setVolume === "function") {
        p.setVolume(100);
      }
    };

    window.addEventListener("voice-command-play", handleVoicePlay);
    window.addEventListener("voice-command-pause", handleVoicePause);
    window.addEventListener("voice-command-next", handleVoiceNext);
    window.addEventListener("voice-command-prev", handleVoicePrev);
    window.addEventListener("voice-command-restart", handleVoiceRestart);
    window.addEventListener("voice-command-duck", handleVoiceDuck);
    window.addEventListener("voice-command-unduck", handleVoiceUnduck);
    window.addEventListener("voice-command-select-playlist", handleVoiceSelectPlaylist);
    window.addEventListener("voice-command-select-track", handleVoiceSelectTrack);

    return () => {
      window.removeEventListener("voice-command-play", handleVoicePlay);
      window.removeEventListener("voice-command-pause", handleVoicePause);
      window.removeEventListener("voice-command-next", handleVoiceNext);
      window.removeEventListener("voice-command-prev", handleVoicePrev);
      window.removeEventListener("voice-command-restart", handleVoiceRestart);
      window.removeEventListener("voice-command-duck", handleVoiceDuck);
      window.removeEventListener("voice-command-unduck", handleVoiceUnduck);
      window.removeEventListener("voice-command-select-playlist", handleVoiceSelectPlaylist);
      window.removeEventListener("voice-command-select-track", handleVoiceSelectTrack);
    };
  }, [changePlaylist, next, previous, seek]);

  const cbRef = useRef({ syncProgress, startTicker, stopTicker, next });
  useEffect(() => { cbRef.current = { syncProgress, startTicker, stopTicker, next }; });

  const playerCreatedRef = useRef(false);

  useEffect(() => {
    const init = () => {
      if (
        playerCreatedRef.current ||
        !window.YT?.Player ||
        !playerWrapperRef.current ||
        !document.contains(playerWrapperRef.current)
      ) return;

      playerCreatedRef.current = true;

      const host = document.createElement("div");
      host.style.cssText = "width:100%;height:100%";
      playerWrapperRef.current.appendChild(host);

      playerRef.current = new window.YT.Player(host, {
        width: "100%",
        height: "100%",
        videoId: current?.videoId ?? "",
        playerVars: {
          playsinline: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => cbRef.current.syncProgress(),
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState.PLAYING) {
              setPlaying(true);
              cbRef.current.startTicker();
            } else if (event.data === window.YT?.PlayerState.PAUSED) {
              setPlaying(false);
              cbRef.current.stopTicker();
              cbRef.current.syncProgress();
            } else if (event.data === window.YT?.PlayerState.ENDED) {
              setPlaying(false);
              cbRef.current.stopTicker();
              cbRef.current.next();
            }
          },
          onError: (event) => {
            setPlaying(false);
            cbRef.current.stopTicker();
            track("youtube_player_error", { code: event.data, videoId: current?.videoId ?? "" });
            cbRef.current.next();
          },
        },
      });
    };

    if (window.YT?.Player) {
      init();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); init(); };
    }

    // No destroy() in cleanup: playerCreatedRef keeps init() idempotent across
    // StrictMode's double-invoke, and MusicPlayer never unmounts in normal use.
    return () => { cbRef.current.stopTicker(); };
  }, []);

  useEffect(() => {
    if (!playerRef.current || !current?.videoId) return;
    // The YT.Player object is created synchronously but its methods (loadVideoById,
    // playVideo, etc.) are only attached after the async onReady event fires.
    // Skip if the player isn't fully initialised yet.
    if (typeof playerRef.current.loadVideoById !== "function") return;
    playerRef.current.loadVideoById(current.videoId);
    setPlaying(false);
    setProgress(0);
    setElapsed(0);
  }, [current?.videoId]);

  const playlistOptions = useMemo(() => PLAYLISTS.map(([name]) => name), []);

  if (!current) return <><EmptyState /><div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2">{playlistOptions.length > 1 && <select aria-label="Playlist" value={playlistName} onChange={(e) => changePlaylist(e.target.value)} className="rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs text-white backdrop-blur-xl">{playlistOptions.map((name) => <option key={name}>{name}</option>)}</select>}</div></>;

  return (
    <section className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-10 w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2">
      {/* Stable wrapper — keeps iframe in viewport with minimal visibility so browser doesn't throttle audio */}
      <div
        ref={playerWrapperRef}
        aria-hidden="true"
        style={{ position: "fixed", bottom: "10px", right: "10px", width: "200px", height: "113px", opacity: 0.001, pointerEvents: "none", zIndex: -1 }}
      />
      <div className="mb-2 flex items-center justify-center gap-2">
        <select
          aria-label="Playlist"
          value={playlistName}
          onChange={(e) => changePlaylist(e.target.value)}
          className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 outline-none backdrop-blur-xl transition hover:bg-black/60 cursor-pointer"
        >
          {playlistOptions.map((name) => (
            <option key={name} value={name} className="bg-neutral-900 text-white">
              {name} ({playlists[name]?.length ?? 0} tracks)
            </option>
          ))}
        </select>
        <div className="rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[10px] font-semibold tracking-wider text-[var(--color-accent-soft)] backdrop-blur-xl">
          {trackIndex + 1} / {tracks.length}
        </div>
      </div>

      <div className="hidden sm:flex">
        <GlassShell className="w-full rounded-full p-3 pr-5">
          <div className="flex items-center gap-4">
            <Vinyl track={current} playing={playing} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{current.title}</div>
              <div className="truncate text-[12.5px] text-white/70">{current.artist} · {current.film}</div>
              <SeekBar progress={progress} onSeek={seek} />
              <div className="flex justify-between text-[10.5px] tabular-nums text-white/55">
                <span>{formatTime(elapsed)}</span><span>{formatTime(duration || current.duration)}</span>
              </div>
            </div>
            <div className="flex items-center">
              <TransportButton label="Previous track" onClick={previous}>
                <SkipBack className="h-4 w-4" />
              </TransportButton>
              <button aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[var(--color-accent-soft)] to-[var(--color-accent)] text-black ring-1 ring-white/25 shadow-[0_8px_24px_rgba(240,138,56,0.4)] transition active:scale-95"><PlayIcon paused={!playing} /></button>
              <TransportButton label="Next track" onClick={next}>
                <SkipForward className="h-4 w-4" />
              </TransportButton>
            </div>
          </div>
        </GlassShell>
      </div>

      <div className="sm:hidden">
        <GlassShell className="rounded-[26px] p-4">
          <div className="flex items-center gap-3">
            <Vinyl track={current} playing={playing} mobile />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{current.title}</div>
              <div className="truncate text-xs text-white/70">{current.artist} · {current.film}</div>
            </div>
          </div>
          <div className="mt-2"><SeekBar progress={progress} onSeek={seek} /></div>
          <div className="relative mt-1 flex min-h-11 items-center justify-between text-[10.5px] tabular-nums text-white/55">
            <div className="flex gap-2"><span>{formatTime(elapsed)}</span><span>/</span><span>{formatTime(duration || current.duration)}</span></div>
            <div className="absolute left-1/2 flex -translate-x-1/2 items-center">
              <TransportButton label="Previous track" onClick={previous}>
                <SkipBack className="h-4 w-4" />
              </TransportButton>
              <button aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} className="grid h-[52px] w-[52px] place-items-center rounded-full bg-gradient-to-b from-[var(--color-accent-soft)] to-[var(--color-accent)] text-black ring-1 ring-white/25 shadow-[0_8px_24px_rgba(240,138,56,0.4)] transition active:scale-95"><PlayIcon paused={!playing} /></button>
              <TransportButton label="Next track" onClick={next}>
                <SkipForward className="h-4 w-4" />
              </TransportButton>
            </div>
          </div>
        </GlassShell>
      </div>
    </section>
  );
}
