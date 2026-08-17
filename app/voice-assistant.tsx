"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Send,
  Radio,
  HelpCircle,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { playlists, type Track } from "./tracks";

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [isWakeTriggered, setIsWakeTriggered] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [responseMessage, setResponseMessage] = useState(
    'Say "Hey RJ" or "Hey Radio", then say "Play Singari", "Play Orange"...'
  );
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [currentTrackInfo, setCurrentTrackInfo] = useState<{
    title: string;
    artist: string;
    film: string;
    playlistName: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeTimeoutRef = useRef<number | null>(null);
  const isWakeTriggeredRef = useRef(false);
  const wakeWordActiveRef = useRef(false);

  useEffect(() => {
    isWakeTriggeredRef.current = isWakeTriggered;
  }, [isWakeTriggered]);

  useEffect(() => {
    wakeWordActiveRef.current = wakeWordActive;
  }, [wakeWordActive]);

  // Listen to current playing track updates
  useEffect(() => {
    const handleTrackUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setCurrentTrackInfo(e.detail);
      }
    };
    window.addEventListener("radio-current-track-info" as any, handleTrackUpdate);
    return () => window.removeEventListener("radio-current-track-info" as any, handleTrackUpdate);
  }, []);

  // Text-To-Speech with pleasant voice
  const speakResponse = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        window.dispatchEvent(new CustomEvent("voice-command-unduck"));
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.05;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.includes("en-IN") ||
            v.name.includes("India") ||
            v.name.includes("Natural") ||
            v.name.includes("Samantha") ||
            v.name.includes("Google UK English Female")
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
          window.dispatchEvent(new CustomEvent("voice-command-unduck"));
        };
        utterance.onerror = () => {
          window.dispatchEvent(new CustomEvent("voice-command-unduck"));
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        window.dispatchEvent(new CustomEvent("voice-command-unduck"));
      }
    },
    [ttsEnabled]
  );

  const getAudioContext = () => {
    if (!audioContextRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Alexa-style ascending wake chime: 784Hz (G5) -> 1046.5Hz (C6)
  const playWakeChime = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      [784, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + i * 0.1;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch {
      // AudioContext might require user interaction
    }
  };

  // Natural Language Command Processing Engine
  const processVoiceCommand = useCallback(
    (rawQuery: string) => {
      const q = rawQuery
        .toLowerCase()
        .replace(/^(hey radio|hey rj|hey alexa|radio|rj|alexa)\b/i, "")
        .trim();

      if (!q) return;

      setTranscript(rawQuery);
      setIsWakeTriggered(false);

      // 1. Playback Controls
      if (
        q.includes("pause") ||
        q.includes("stop") ||
        q.includes("hold on") ||
        q.includes("aagu") ||
        q.includes("mute")
      ) {
        window.dispatchEvent(new CustomEvent("voice-command-pause"));
        const msg = "Pausing playback";
        setResponseMessage(msg);
        speakResponse(msg);
        return;
      }

      if (
        q === "play" ||
        q === "resume" ||
        q === "start" ||
        q === "continue" ||
        q.includes("unpause") ||
        q === "play song"
      ) {
        window.dispatchEvent(new CustomEvent("voice-command-play"));
        const msg = "Resuming playback";
        setResponseMessage(msg);
        speakResponse(msg);
        return;
      }

      if (
        q.includes("next") ||
        q.includes("skip") ||
        q.includes("forward") ||
        q.includes("taruvatha")
      ) {
        window.dispatchEvent(new CustomEvent("voice-command-next"));
        const msg = "Playing next track";
        setResponseMessage(msg);
        speakResponse(msg);
        return;
      }

      if (
        q.includes("previous") ||
        q.includes("prev") ||
        q.includes("back") ||
        q.includes("mundhu") ||
        q.includes("last song")
      ) {
        window.dispatchEvent(new CustomEvent("voice-command-prev"));
        const msg = "Playing previous track";
        setResponseMessage(msg);
        speakResponse(msg);
        return;
      }

      if (
        q.includes("restart") ||
        q.includes("replay") ||
        q.includes("start over") ||
        q.includes("from beginning")
      ) {
        window.dispatchEvent(new CustomEvent("voice-command-restart"));
        const msg = "Restarting track";
        setResponseMessage(msg);
        speakResponse(msg);
        return;
      }

      // 2. Query info
      if (
        q.includes("what is playing") ||
        q.includes("which song") ||
        q.includes("current song") ||
        q.includes("who is singing") ||
        q.includes("who sang")
      ) {
        if (currentTrackInfo) {
          const msg = `Currently playing ${currentTrackInfo.title} from ${currentTrackInfo.film} by ${currentTrackInfo.artist}`;
          setResponseMessage(msg);
          speakResponse(msg);
        } else {
          const msg = "Playing Telugu Radio tracks.";
          setResponseMessage(msg);
          speakResponse(msg);
        }
        return;
      }

      // 3. Search for Playlists by Name
      const cleanedQuery = q
        .replace(/^(play|start|put on|tune into|switch to|listen to)\s+/i, "")
        .replace(/\s+(playlist|album|songs|radio|hits)$/i, "")
        .trim();

      const playlistEntries = Object.entries(playlists);

      const matchedPlaylist = playlistEntries.find(([name]) => {
        const lowerName = name.toLowerCase();
        return (
          lowerName === cleanedQuery ||
          lowerName.includes(cleanedQuery) ||
          cleanedQuery.includes(lowerName.replace(/\(.*?\)/g, "").trim().toLowerCase())
        );
      });

      if (
        matchedPlaylist &&
        (q.includes("album") || q.includes("playlist") || q.includes("songs") || cleanedQuery.length >= 3)
      ) {
        const [name] = matchedPlaylist;
        window.dispatchEvent(
          new CustomEvent("voice-command-select-playlist", { detail: { playlistName: name } })
        );
        const msg = `Sure! Playing ${name}`;
        setResponseMessage(msg);
        speakResponse(msg);
        return;
      }

      // 4. Search across all individual tracks
      let bestMatch: { track: Track; playlistName: string; index: number; score: number } | null = null;

      for (const [pName, trackList] of playlistEntries) {
        trackList.forEach((trk, idx) => {
          const titleLower = trk.title.toLowerCase();
          const artistLower = trk.artist.toLowerCase();
          const filmLower = trk.film.toLowerCase();

          let score = 0;
          if (titleLower === cleanedQuery) score = 100;
          else if (titleLower.startsWith(cleanedQuery)) score = 80;
          else if (titleLower.includes(cleanedQuery)) score = 60;
          else if (filmLower.includes(cleanedQuery)) score = 50;
          else if (artistLower.includes(cleanedQuery)) score = 40;
          else {
            const tokens = cleanedQuery.split(/\s+/);
            const matchedTokens = tokens.filter(
              (t) => titleLower.includes(t) || filmLower.includes(t) || artistLower.includes(t)
            );
            if (matchedTokens.length > 0) {
              score = (matchedTokens.length / tokens.length) * 35;
            }
          }

          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { track: trk, playlistName: pName, index: idx, score };
          }
        });
      }

      if (bestMatch && (bestMatch as any).score >= 30) {
        const { track: song, playlistName, index } = bestMatch as any;
        window.dispatchEvent(
          new CustomEvent("voice-command-select-track", {
            detail: { playlistName, trackIndex: index },
          })
        );
        const msg = `Sure! Playing ${song.title} from ${song.film}`;
        setResponseMessage(msg);
        speakResponse(msg);
        return;
      }

      // 5. Fallback
      const fallbackMsg = `Couldn't find "${rawQuery}". Try "Play Singari", "Play Orange", or "Play Arjun Reddy".`;
      setResponseMessage(fallbackMsg);
      speakResponse("I couldn't find that song. Try asking for an album or artist.");
    },
    [currentTrackInfo, speakResponse]
  );

  // Trigger wake word state and audio ducking
  const triggerWakeWord = useCallback(() => {
    setIsWakeTriggered(true);
    playWakeChime();
    window.dispatchEvent(new CustomEvent("voice-command-duck"));
    setResponseMessage('Listening for command... (e.g. "Play Singari", "Next")');

    if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
    wakeTimeoutRef.current = window.setTimeout(() => {
      setIsWakeTriggered(false);
      window.dispatchEvent(new CustomEvent("voice-command-unduck"));
    }, 7000);
  }, []);

  // Initialize and start Speech Recognition
  const initAndStartSpeech = useCallback(async () => {
    if (typeof window === "undefined") return;
    const Win = window as IWindow;
    const SpeechRec = Win.SpeechRecognition || Win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setResponseMessage("Speech Recognition is not supported on this browser. You can type commands below!");
      return;
    }

    try {
      // Request mic permission via user gesture
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermissionGranted(true);
      }
    } catch {
      setResponseMessage("Please allow microphone access in your browser to use Hands-Free Voice control.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignored
        }
      }

      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onstart = () => {
        setIsListening(true);
        setWakeWordActive(true);
      };

      rec.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript.toLowerCase().trim();
        const isFinal = event.results[current].isFinal;

        setTranscript(text);

        const hasWakeWord =
          text.includes("hey radio") ||
          text.includes("hey rj") ||
          text.includes("hey alexa") ||
          text.startsWith("radio") ||
          text.startsWith("rj") ||
          text.startsWith("alexa");

        // Case A: User said Wake Word + Command together (e.g. "hey rj play singari")
        if (hasWakeWord) {
          const stripped = text
            .replace(/^(hey radio|hey rj|hey alexa|radio|rj|alexa)\b/i, "")
            .trim();

          if (stripped.length > 2) {
            if (isFinal) {
              triggerWakeWord();
              processVoiceCommand(text);
            }
            return;
          } else {
            // Wake word alone ("Hey RJ" / "Hey Radio")
            triggerWakeWord();
            return;
          }
        }

        // Case B: Assistant is already awake and waiting for command
        if (isWakeTriggeredRef.current) {
          if (isFinal && text.length > 1) {
            processVoiceCommand(text);
          }
        }
      };

      rec.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setMicPermissionGranted(false);
          setResponseMessage("Microphone permission denied in browser settings.");
        }
      };

      rec.onend = () => {
        setIsListening(false);
        // Automatically restart listening loop if hands-free is enabled
        if (wakeWordActiveRef.current) {
          setTimeout(() => {
            try {
              rec.start();
            } catch {
              // Ignored
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setMicPermissionGranted(true);
    } catch {
      // Ignored
    }
  }, [processVoiceCommand, triggerWakeWord]);

  // Toggle Hands-Free Listening on/off
  const toggleHandsFree = () => {
    if (!wakeWordActive) {
      initAndStartSpeech();
      triggerWakeWord();
    } else {
      setWakeWordActive(false);
      setIsWakeTriggered(false);
      window.dispatchEvent(new CustomEvent("voice-command-unduck"));
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignored
        }
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    processVoiceCommand(textInput);
    setTextInput("");
  };

  const quickCommands = [
    "Play Singari",
    "Play Orange Album",
    "Play Animal songs",
    "Play Aaya Sher",
    "Play Arjun Reddy",
    "Play Nuvvu Naatho Emannavo",
    "Play Pelli Choopulu",
    "Next Song",
    "Pause Music",
  ];

  return (
    <>
      {/* Alexa-Style Glowing Top Edge Light Bar */}
      {isWakeTriggered && (
        <div className="fixed top-0 inset-x-0 z-50 h-1.5 bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 shadow-[0_0_24px_rgba(56,189,248,0.9),0_0_40px_rgba(245,158,11,0.7)] animate-pulse" />
      )}

      {/* Top Bar Trigger & Wake Word Button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            setIsOpen(true);
            if (!wakeWordActive) {
              initAndStartSpeech();
            }
            triggerWakeWord();
          }}
          aria-label="Radio Voice Assistant"
          className={`relative flex items-center gap-2 rounded-full border px-3.5 py-2 backdrop-blur-xl transition active:scale-95 cursor-pointer ${
            isWakeTriggered
              ? "border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.6)] animate-pulse"
              : wakeWordActive
              ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25"
              : "border-white/10 bg-black/30 text-white/80 hover:bg-white/15 hover:text-white"
          }`}
        >
          <div className="relative">
            {isWakeTriggered ? (
              <Zap className="h-3.5 w-3.5 text-cyan-400 animate-bounce" />
            ) : wakeWordActive ? (
              <Mic className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            )}
            {wakeWordActive && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
            {isWakeTriggered ? "Listening..." : wakeWordActive ? "Hey RJ (Active)" : "Radio AI"}
          </span>
        </button>
      </div>

      {/* Voice Assistant Glass Overlay Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-b from-neutral-900/95 via-black/90 to-neutral-950/95 p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.2)] text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-amber-500 text-black shadow-lg shadow-cyan-500/20">
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-wide">
                    Hands-Free Voice Assistant
                  </h3>
                  <p className="text-[11px] text-white/60">
                    Say <span className="text-cyan-300 font-semibold">"Hey RJ"</span> or{" "}
                    <span className="text-amber-300 font-semibold">"Hey Radio"</span> to speak
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  title={ttsEnabled ? "Voice Feedback On" : "Voice Feedback Muted"}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  {ttsEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-white/40" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Central Visualizer & Listening Orb */}
            <div className="my-6 flex flex-col items-center justify-center text-center">
              <div className="relative flex items-center justify-center">
                {/* Glowing Wave Rings */}
                {isWakeTriggered && (
                  <>
                    <div className="absolute h-32 w-32 rounded-full bg-cyan-500/25 animate-ping duration-1000" />
                    <div className="absolute h-24 w-24 rounded-full bg-amber-500/30 animate-pulse" />
                  </>
                )}

                <button
                  onClick={toggleHandsFree}
                  className={`relative z-10 grid h-20 w-20 place-items-center rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
                    isWakeTriggered
                      ? "bg-gradient-to-tr from-cyan-400 to-amber-400 text-black shadow-[0_0_36px_rgba(6,182,212,0.7)] scale-105"
                      : wakeWordActive
                      ? "bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.4)]"
                      : "border border-white/20 bg-white/10 text-white hover:bg-white/15 hover:border-white/40 shadow-xl"
                  }`}
                >
                  {isWakeTriggered ? (
                    <Zap className="h-8 w-8 animate-bounce" />
                  ) : wakeWordActive ? (
                    <Mic className="h-8 w-8 text-cyan-400" />
                  ) : (
                    <MicOff className="h-7 w-7 text-white/70" />
                  )}
                </button>
              </div>

              {/* Hands-Free Activation Banner */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={toggleHandsFree}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide transition cursor-pointer ${
                    wakeWordActive
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                      : "border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {wakeWordActive ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Hands-Free Wake Word: ON</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                      <span>Tap to Enable "Hey RJ" Listening</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Transcript Output */}
              <div className="mt-3 min-h-[3rem] px-4">
                {transcript ? (
                  <p className="text-base font-medium text-amber-200 italic">
                    "{transcript}"
                  </p>
                ) : (
                  <p className="text-xs text-white/50 tracking-wide uppercase">
                    {isWakeTriggered
                      ? "Listening for your command..."
                      : wakeWordActive
                      ? "Listening in background... Say 'Hey RJ'"
                      : "Tap button above to enable mic"}
                  </p>
                )}
                <p className="mt-1 text-xs text-white/80 font-medium">{responseMessage}</p>
              </div>
            </div>

            {/* Quick Command Chips */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                <Flame className="h-3 w-3 text-orange-400" />
                <span>Quick Prompts</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                {quickCommands.map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => processVoiceCommand(cmd)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/75 hover:bg-white/15 hover:text-white hover:border-white/20 transition cursor-pointer"
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Text Command Input Fallback */}
            <form onSubmit={handleManualSubmit} className="relative mt-3 flex items-center">
              <input
                type="text"
                placeholder="Or type a command (e.g. 'Play Singari')..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-black/50 py-2.5 pl-4 pr-11 text-xs text-white placeholder-white/40 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50"
              />
              <button
                type="submit"
                className="absolute right-1.5 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-r from-cyan-400 to-amber-500 text-black hover:opacity-90 transition active:scale-95 cursor-pointer"
              >
                <Send className="h-3 w-3" />
              </button>
            </form>

            {/* Voice Command Hint */}
            <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-white/40">
              <HelpCircle className="h-3 w-3" />
              <span>Wake words: "Hey Radio", "Hey RJ", "Radio", "Hey Alexa"</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
