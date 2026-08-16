import MusicPlayer from "./music-player";
import Clock from "./clock";
import AmbiancePanel from "./ambiance-panel";
import SleepTimer from "./sleep-timer";
import { Radio, TvMinimalPlay } from "lucide-react";

function GrainOverlay() {
  const filter = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(%23n)" opacity="0.65" />
    </svg>
  `);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none mix-blend-overlay opacity-30"
      style={{ backgroundImage: `url("data:image/svg+xml,${filter}")` }}
    />
  );
}

function TopRow() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-3 sm:px-6 pt-3 sm:pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
      <div className="flex items-center gap-2">
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-xl">
          <Clock />
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3.5 py-2 backdrop-blur-xl text-white/70">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span>90s Telugu Radio</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AmbiancePanel />
        <SleepTimer />
        <div className="hidden sm:flex gap-1.5">
          <a
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/80 backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
            href="https://www.youtube.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
          >
            <TvMinimalPlay className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

export default function Page() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden">
      <div aria-hidden="true" className="hero-bg fixed inset-0 -z-20 bg-cover bg-center" />
      <div aria-hidden="true" className="fixed inset-0 -z-[19] bg-gradient-to-b from-black/35 via-transparent to-black/80" />
      <GrainOverlay />
      <TopRow />
      <MusicPlayer />
    </main>
  );
}
