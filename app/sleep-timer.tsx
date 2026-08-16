"use client";

import { useEffect, useRef, useState } from "react";
import { Timer as TimerIcon } from "lucide-react";

interface SleepTimerProps {
  onTimerExpire?: () => void;
}

export default function SleepTimer({ onTimerExpire }: SleepTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const options = [
    { label: "Off", value: null },
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "45 min", value: 45 },
    { label: "60 min", value: 60 },
  ];

  const startTimer = (mins: number | null) => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mins === null) {
      setMinutes(null);
      setRemainingSeconds(0);
      setIsOpen(false);
      return;
    }

    setMinutes(mins);
    setRemainingSeconds(mins * 60);
    setIsOpen(false);

    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setMinutes(null);
          // Dispatch global custom event for player pause
          window.dispatchEvent(new CustomEvent("sleep-timer-expired"));
          onTimerExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Sleep Timer"
        className={`flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] backdrop-blur-xl transition hover:bg-white/15 active:scale-95 ${
          minutes !== null
            ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(240,138,56,0.3)]"
            : "bg-black/30 text-white/80"
        }`}
      >
        <TimerIcon className="h-3.5 w-3.5" />
        <span>{minutes !== null ? formatCountdown(remainingSeconds) : "Timer"}</span>
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/20"
            aria-hidden="true"
          />
          <div className="absolute right-0 top-11 z-50 w-44 rounded-2xl border border-white/15 bg-black/85 p-2 shadow-2xl backdrop-blur-2xl">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-soft)]">
              Sleep Timer
            </div>
            <div className="mt-1 space-y-1">
              {options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => startTimer(opt.value)}
                  className={`w-full rounded-xl px-3 py-1.5 text-left text-xs font-medium transition ${
                    minutes === opt.value
                      ? "bg-[var(--color-accent)] text-black font-bold"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
