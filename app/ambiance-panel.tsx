"use client";

import { useState } from "react";
import {
  CloudRain,
  Moon,
  Disc3,
  Train,
  Radio,
  X,
  SlidersHorizontal,
  Mic,
  Volume2,
  Bell,
  CassetteTape,
} from "lucide-react";
import { ambientEngine } from "./ambient-sound-engine";

interface AmbianceLayer {
  id: string;
  name: string;
  IconComponent: React.ComponentType<{ className?: string }>;
  subtitle: string;
  volume: number;
  enabled: boolean;
}

export default function AmbiancePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [radioFx, setRadioFx] = useState(true);
  const [rjMode, setRjMode] = useState(true);
  const [transistorMode, setTransistorMode] = useState(false);

  const [layers, setLayers] = useState<AmbianceLayer[]>([
    {
      id: "rain",
      name: "Monsoon Rain & Thunder",
      IconComponent: CloudRain,
      subtitle: "Gentle roof drops with distant thunder",
      volume: 0.65,
      enabled: false,
    },
    {
      id: "crickets",
      name: "Crickets & Night Breeze",
      IconComponent: Moon,
      subtitle: "Summer midnight terrace chirping",
      volume: 0.6,
      enabled: false,
    },
    {
      id: "tape",
      name: "Vinyl Crackle & Tape Hiss",
      IconComponent: Disc3,
      subtitle: "Analog magnetic cassette tape noise",
      volume: 0.5,
      enabled: false,
    },
    {
      id: "train",
      name: "Distant Train & Evening",
      IconComponent: Train,
      subtitle: "Rhythmic railway chug & faint whistle",
      volume: 0.55,
      enabled: false,
    },
  ]);

  const updateEngine = (layerId: string, enabled: boolean, volume: number) => {
    const activeVol = enabled ? volume : 0;
    if (layerId === "rain") ambientEngine.setRain(activeVol);
    if (layerId === "crickets") ambientEngine.setCrickets(activeVol);
    if (layerId === "tape") ambientEngine.setTapeHiss(activeVol);
    if (layerId === "train") ambientEngine.setDistantTrain(activeVol);
  };

  const toggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === id) {
          const nextEnabled = !layer.enabled;
          updateEngine(layer.id, nextEnabled, layer.volume);
          return { ...layer, enabled: nextEnabled };
        }
        return layer;
      })
    );
  };

  const changeVolume = (id: string, vol: number) => {
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === id) {
          updateEngine(layer.id, layer.enabled, vol);
          return { ...layer, volume: vol };
        }
        return layer;
      })
    );
  };

  const toggleRadioFx = () => {
    const next = !radioFx;
    setRadioFx(next);
    ambientEngine.setRadioFxEnabled(next);
    if (next) ambientEngine.playRadioTuningStatic();
  };

  const toggleRjMode = () => {
    const next = !rjMode;
    setRjMode(next);
    ambientEngine.setRjModeEnabled(next);
  };

  const toggleTransistorMode = () => {
    const next = !transistorMode;
    setTransistorMode(next);
    ambientEngine.setTransistorMode(next);
  };

  const activeCount = layers.filter((l) => l.enabled).length;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Ambiance & Sound Effects"
        className={`relative flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] backdrop-blur-xl transition hover:bg-white/15 active:scale-95 ${
          activeCount > 0 || rjMode || transistorMode
            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
            : "bg-black/30 text-white/80"
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Ambiance & FX</span>
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[9px] font-bold text-black">
            {activeCount}
          </span>
        )}
      </button>

      {/* Slide-over / Modal Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="fixed top-16 right-4 sm:right-6 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto w-[min(400px,calc(100vw-2rem))] rounded-3xl border border-white/15 bg-black/90 p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-[var(--color-accent-soft)]">
                  Retro Sound & Radio FX
                </h3>
                <p className="text-[11px] text-white/60">Ambiance layers, Telugu RJ voice & analog filters</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                aria-label="Close Ambiance Panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Ambient Sound Sliders */}
            <div className="mt-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 px-1">
                Background Soundscapes
              </div>
              {layers.map((layer) => {
                const Icon = layer.IconComponent;
                return (
                  <div
                    key={layer.id}
                    className={`rounded-2xl border p-3 transition ${
                      layer.enabled
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-white/5 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-full ${
                            layer.enabled
                              ? "bg-[var(--color-accent)] text-black"
                              : "bg-white/10 text-white/70"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white/90">{layer.name}</div>
                          <div className="text-[10px] text-white/50">{layer.subtitle}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleLayer(layer.id)}
                        className={`h-6 w-11 rounded-full p-0.5 transition ${
                          layer.enabled ? "bg-[var(--color-accent)]" : "bg-white/20"
                        }`}
                        aria-label={`Toggle ${layer.name}`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-white transition-transform ${
                            layer.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {layer.enabled && (
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-[10px] text-white/50">Vol</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={layer.volume}
                          onChange={(e) => changeVolume(layer.id, parseFloat(e.target.value))}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[var(--color-accent)]"
                          aria-label={`${layer.name} volume`}
                        />
                        <span className="w-8 text-right text-[10px] tabular-nums text-white/60">
                          {Math.round(layer.volume * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vintage Radio Features Section */}
            <div className="mt-5 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 px-1">
                90s Radio & Voice FX
              </div>

              {/* Telugu RJ Station Drops Toggle */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-8 w-8 place-items-center rounded-full ${rjMode ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/70"}`}>
                      <Mic className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white/90">Telugu RJ Voice Bumpers</div>
                      <div className="text-[10px] text-white/50">Station IDs & dedications every 3 tracks</div>
                    </div>
                  </div>
                  <button
                    onClick={toggleRjMode}
                    className={`h-6 w-11 rounded-full p-0.5 transition ${
                      rjMode ? "bg-[var(--color-accent)]" : "bg-white/20"
                    }`}
                    aria-label="Toggle RJ Mode"
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        rjMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {rjMode && (
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-[10px] text-white/60 italic">"Namaskaram! Meeru vintunnaru 90s Roja Radio..."</span>
                    <button
                      onClick={() => ambientEngine.playRjBumper()}
                      className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-semibold tracking-wider uppercase text-amber-300 hover:bg-white/20 active:scale-95"
                    >
                      Test Drop
                    </button>
                  </div>
                )}
              </div>

              {/* FM Radio Tuning Static Toggle */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/90">FM Frequency Tuning Static</div>
                    <div className="text-[10px] text-white/50">Analog frequency sweep on song change</div>
                  </div>
                </div>
                <button
                  onClick={toggleRadioFx}
                  className={`h-6 w-11 rounded-full p-0.5 transition ${
                    radioFx ? "bg-[var(--color-accent)]" : "bg-white/20"
                  }`}
                  aria-label="Toggle Radio Tuning Static"
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      radioFx ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Transistor Radio Speaker Filter */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`grid h-8 w-8 place-items-center rounded-full ${transistorMode ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/70"}`}>
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/90">Vintage Transistor Speaker EQ</div>
                    <div className="text-[10px] text-white/50">Bandpass filter for 1994 portable radio feel</div>
                  </div>
                </div>
                <button
                  onClick={toggleTransistorMode}
                  className={`h-6 w-11 rounded-full p-0.5 transition ${
                    transistorMode ? "bg-[var(--color-accent)]" : "bg-white/20"
                  }`}
                  aria-label="Toggle Transistor Mode"
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      transistorMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Retro Quick Sound Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => ambientEngine.playAirTimeChime()}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-[10px] font-semibold text-white/80 hover:bg-white/10 active:scale-95"
                >
                  <Bell className="h-3.5 w-3.5 text-amber-400" />
                  <span>AIR Time Chime</span>
                </button>
                <button
                  onClick={() => ambientEngine.playCassetteClick()}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-[10px] font-semibold text-white/80 hover:bg-white/10 active:scale-95"
                >
                  <CassetteTape className="h-3.5 w-3.5 text-amber-400" />
                  <span>Cassette Clunk</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
