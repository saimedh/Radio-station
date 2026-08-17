"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Music,
  Send,
  Headphones,
  Signal,
  X,
} from "lucide-react";
import { playlists, type Track } from "./tracks";

type CallStatus = "idle" | "dialing" | "ringing" | "connected" | "ended";

interface Message {
  id: string;
  sender: "rj" | "caller" | "system";
  text: string;
  time: string;
}

export default function RadioCallAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [textPrompt, setTextPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Sound Synthesizers for Telephone Experience
  const playDualTone = (freq1: number, freq2: number, duration: number) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
      osc2.frequency.setValueAtTime(freq2, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + duration);
      osc2.stop(ctx.currentTime + duration);
    } catch {
      // Ignored
    }
  };

  const playTelephoneRing = () => {
    // Standard telephone ring: 440Hz + 480Hz
    playDualTone(440, 480, 1.6);
  };

  const playPickupChime = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.3);
      });
    } catch {
      // Ignored
    }
  };

  const playHangupTone = () => {
    playDualTone(480, 620, 0.4);
  };

  // Text-To-Speech with Radio Jockey Voice
  const speakAsRJ = useCallback((text: string) => {
    if (!speakerEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.06;
      utterance.pitch = 1.1;

      const voices = window.speechSynthesis.getVoices();
      const rjVoice = voices.find(
        (v) =>
          v.lang.includes("en-IN") ||
          v.name.includes("India") ||
          v.name.includes("Pooja") ||
          v.name.includes("Kavya") ||
          v.name.includes("Samantha") ||
          v.name.includes("Google UK English Female")
      );
      if (rjVoice) utterance.voice = rjVoice;

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignored
    }
  }, [speakerEnabled]);

  const addMessage = useCallback((sender: "rj" | "caller" | "system", text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { id: Math.random().toString(), sender, text, time: timeStr }]);
  }, []);

  // Format call timer
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Intelligent Radio Jockey Response Engine
  const handleCallerStatement = useCallback((userInput: string) => {
    if (!userInput.trim()) return;
    addMessage("caller", userInput);
    setLiveTranscript("");

    const q = userInput.toLowerCase().trim();

    // 1. Check for specific Telugu songs
    const playlistEntries = Object.entries(playlists);
    let matchedTrack: { track: Track; playlistName: string; index: number } | null = null;
    let matchedPlaylistName: string | null = null;

    // Check playlist matches
    for (const [pName] of playlistEntries) {
      const cleanPName = pName.toLowerCase().replace(/\(.*?\)/g, "").trim();
      if (q.includes(cleanPName) || (cleanPName.length > 4 && q.includes(cleanPName.split(" ")[0]))) {
        matchedPlaylistName = pName;
        break;
      }
    }

    // Check individual track matches
    for (const [pName, tList] of playlistEntries) {
      for (let idx = 0; idx < tList.length; idx++) {
        const trk = tList[idx];
        if (!trk) continue;
        const titleLower = trk.title.toLowerCase();
        const cleanTitle = titleLower.replace(/\(.*?\)/g, "").trim();
        if (q.includes(cleanTitle) || (cleanTitle.length > 4 && q.includes(cleanTitle.split(" ")[0]))) {
          matchedTrack = { track: trk, playlistName: pName, index: idx };
          break;
        }
      }
      if (matchedTrack) break;
    }

    // RJ Dialogue Generation
    if (matchedTrack) {
      const matched = matchedTrack as { track: Track; playlistName: string; index: number };
      const song = matched.track;
      const playlistName = matched.playlistName;
      const index = matched.index;
      const responses = [
        `Super choice caller! '${song.title}' from '${song.film}' is an absolute masterpiece! Tuning your radio frequency and dedicating this track to you right now! Enjoy!`,
        `Oh wow, what a banger! Cues up '${song.title}' right away on Nostalgia Radio. Spinning it live on-air for you!`,
        `Love this track! '${song.title}' coming right up on 98.3 Telugu Nostalgia Radio! Keep listening!`,
      ];
      const rjResponse = responses[Math.floor(Math.random() * responses.length)] || responses[0];

      setTimeout(() => {
        addMessage("rj", rjResponse);
        speakAsRJ(rjResponse);
        // Dispatch track to player
        window.dispatchEvent(
          new CustomEvent("voice-command-select-track", {
            detail: { playlistName, trackIndex: index },
          })
        );
      }, 500);
      return;
    }

    if (matchedPlaylistName) {
      const rjResponse = `You got it caller! Switching the entire station over to the '${matchedPlaylistName}' album right now. Sit back and enjoy the nostalgia!`;
      setTimeout(() => {
        addMessage("rj", rjResponse);
        speakAsRJ(rjResponse);
        window.dispatchEvent(
          new CustomEvent("voice-command-select-playlist", {
            detail: { playlistName: matchedPlaylistName },
          })
        );
      }, 500);
      return;
    }

    // Generic friendly RJ banter & recommendation
    if (q.includes("romantic") || q.includes("love")) {
      const rjResponse = "A romantic melody dedication? Say no more! Playing 'Chilipiga' from Orange for all the lovers tuned in today!";
      setTimeout(() => {
        addMessage("rj", rjResponse);
        speakAsRJ(rjResponse);
        window.dispatchEvent(
          new CustomEvent("voice-command-select-track", {
            detail: { playlistName: "Orange (Full Album)", trackIndex: 0 },
          })
        );
      }, 500);
      return;
    }

    if (q.includes("spb") || q.includes("balu") || q.includes("90s")) {
      const rjResponse = "The legendary SPB sir! Here is 'Naa Cheli Rojave' from Roja dedicated specially to you!";
      setTimeout(() => {
        addMessage("rj", rjResponse);
        speakAsRJ(rjResponse);
        window.dispatchEvent(
          new CustomEvent("voice-command-select-track", {
            detail: { playlistName: "Roja Radio", trackIndex: 0 },
          })
        );
      }, 500);
      return;
    }

    if (q.includes("hello") || q.includes("hi") || q.includes("namaste") || q.includes("who is this")) {
      const rjResponse = "Hello caller! You are live with RJ Priya on 90s Telugu Nostalgia Radio! Tell me your name and what song you want to hear today!";
      setTimeout(() => {
        addMessage("rj", rjResponse);
        speakAsRJ(rjResponse);
      }, 500);
      return;
    }

    // Default witty RJ response
    const defaultResponses = [
      `Awesome request caller! Playing a top nostalgic hit for you right now on Nostalgia Radio!`,
      `Got your dedication on the board! Spinning a great track right away!`,
      `Thank you for calling in! Here is a superhit number for everyone listening!`,
    ];
    const genericResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    setTimeout(() => {
      addMessage("rj", genericResponse);
      speakAsRJ(genericResponse);
      window.dispatchEvent(new CustomEvent("voice-command-next"));
    }, 500);
  }, [addMessage, speakAsRJ]);

  // Start Call Function
  const startCall = async () => {
    setIsOpen(true);
    setStatus("dialing");
    setMessages([]);
    setCallDuration(0);
    setLiveTranscript("");

    // Unlock AudioContext and request Mic permissions on user gesture
    try {
      getAudioContext();
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch {
      // Permission might be handled by browser modal
    }

    playDualTone(941, 1336, 0.2); // DTMF tone

    // Transition to ringing after 1 sec
    setTimeout(() => {
      setStatus("ringing");
      playTelephoneRing();

      ringIntervalRef.current = window.setInterval(() => {
        playTelephoneRing();
      }, 3500);

      // RJ Answers after 3.8 seconds
      setTimeout(() => {
        if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
        setStatus("connected");
        playPickupChime();

        const welcomeText =
          "Namaskaram! You are live on Nostalgia Telugu Radio with RJ Priya! Who's on the line, and what song would you like to dedicate today?";
        addMessage("rj", welcomeText);
        speakAsRJ(welcomeText);

        // Start call duration timer
        timerIntervalRef.current = window.setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);

        // Start microphone recognition
        startContinuousListening();
      }, 3800);
    }, 1200);
  };

  // End Call Function
  const endCall = useCallback(() => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    playHangupTone();
    setStatus("ended");
    setIsListening(false);
    addMessage("system", "Call ended by caller. Thanks for calling Nostalgia Radio!");

    setTimeout(() => {
      setStatus("idle");
      setIsOpen(false);
    }, 1600);
  }, [addMessage]);

  // Continuous speech recognition during active call
  const startContinuousListening = () => {
    if (typeof window === "undefined") return;
    const Win = window as any;
    const SpeechRec = Win.SpeechRecognition || Win.webkitSpeechRecognition;

    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onstart = () => setIsListening(true);

      rec.onresult = (event: any) => {
        if (isMuted) return;
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setLiveTranscript(text);

        if (event.results[current].isFinal) {
          handleCallerStatement(text);
        }
      };

      rec.onerror = () => {
        // Keep alive during call
      };

      rec.onend = () => {
        if (status === "connected" && !isMuted) {
          try {
            rec.start();
          } catch {
            // Ignored
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      // Ignored
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textPrompt.trim() || status !== "connected") return;
    handleCallerStatement(textPrompt);
    setTextPrompt("");
  };

  const sampleDedications = [
    "Play Singari from Dude!",
    "Play Chilipiga from Orange",
    "Play Aaya Sher (The Paradise)",
    "Play Nuvvu Naatho Emannavo by SPB",
    "Play Arjun Reddy songs",
    "Play a romantic 90s melody",
  ];

  return (
    <>
      {/* Top Header "Call RJ" Button */}
      <button
        onClick={startCall}
        aria-label="Call Radio Jockey"
        className="relative flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-2 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.3)] backdrop-blur-xl transition hover:bg-emerald-500/30 hover:border-emerald-400 hover:text-white active:scale-95 cursor-pointer animate-pulse"
      >
        <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
          Call RJ (Live AI)
        </span>
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </button>

      {/* Interactive Phone Call Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="relative flex flex-col h-[600px] w-full max-w-md overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-b from-neutral-900 via-black to-neutral-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.2)] text-white">
            
            {/* Call Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-red-400 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  ON AIR
                </div>
                <div className="flex items-center gap-1 text-[11px] text-white/60">
                  <Signal className="h-3.5 w-3.5 text-emerald-400" />
                  <span>98.3 FM Studio</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSpeakerEnabled(!speakerEnabled)}
                  title={speakerEnabled ? "Speakerphone On" : "Speakerphone Off"}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 transition"
                >
                  {speakerEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-white/40" />}
                </button>
                <button
                  onClick={endCall}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Caller Info & Visual Avatar */}
            <div className="my-4 flex flex-col items-center justify-center text-center shrink-0">
              <div className="relative flex items-center justify-center">
                {/* Acoustic Soundwave Rings */}
                {status === "connected" && (
                  <>
                    <div className="absolute h-28 w-28 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
                    <div className="absolute h-24 w-24 rounded-full bg-teal-500/30 animate-pulse" />
                  </>
                )}
                {status === "ringing" && (
                  <div className="absolute h-24 w-24 rounded-full bg-amber-500/25 animate-ping duration-700" />
                )}

                {/* Avatar Icon */}
                <div
                  className={`relative z-10 grid h-16 w-16 place-items-center rounded-full shadow-2xl transition-all ${
                    status === "connected"
                      ? "bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 text-black shadow-emerald-500/40 scale-105"
                      : status === "ringing" || status === "dialing"
                      ? "bg-amber-500/30 border border-amber-400/50 text-amber-300 animate-pulse"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  <Headphones className="h-7 w-7" />
                </div>
              </div>

              <h3 className="mt-3 text-base font-semibold tracking-wide text-white">
                RJ Priya (AI Host)
              </h3>

              <div className="mt-0.5 text-xs text-white/60">
                {status === "dialing" && "Dialing 98.3 FM Studio..."}
                {status === "ringing" && "Calling Studio (Ringing)..."}
                {status === "connected" && (
                  <span className="text-emerald-400 font-medium tabular-nums flex items-center gap-1.5 justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Connected · {formatDuration(callDuration)}
                  </span>
                )}
                {status === "ended" && <span className="text-red-400">Call Disconnected</span>}
              </div>
            </div>

            {/* In-Call Live Dialogue Subtitles & Chat Window */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2.5 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "caller"
                      ? "items-end"
                      : m.sender === "rj"
                      ? "items-start"
                      : "items-center"
                  }`}
                >
                  {m.sender !== "system" ? (
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                        m.sender === "caller"
                          ? "bg-emerald-600/30 border border-emerald-500/40 text-emerald-100 rounded-tr-sm"
                          : "bg-white/10 border border-white/15 text-white/90 rounded-tl-sm"
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-60 mb-0.5">
                        {m.sender === "caller" ? "You (Caller)" : "RJ Priya"}
                      </div>
                      <p className="leading-relaxed">{m.text}</p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/40 italic text-center py-1">
                      {m.text}
                    </span>
                  )}
                </div>
              ))}

              {liveTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-emerald-200 italic animate-pulse">
                    "...{liveTranscript}"
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Dedication Prompt Suggestions */}
            {status === "connected" && (
              <div className="mt-3 shrink-0">
                <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span>Quick Song Dedications</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {sampleDedications.map((ded) => (
                    <button
                      key={ded}
                      onClick={() => handleCallerStatement(ded)}
                      className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10.5px] text-white/80 hover:bg-white/15 hover:text-white transition cursor-pointer"
                    >
                      {ded}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* In-Call Controls Bottom Bar */}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 shrink-0">
              {/* Mute Mic */}
              <button
                disabled={status !== "connected"}
                onClick={() => setIsMuted(!isMuted)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs transition ${
                  isMuted
                    ? "border-red-500/40 bg-red-500/20 text-red-300"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/15"
                } disabled:opacity-30 cursor-pointer`}
              >
                {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </button>

              {/* Text send during call */}
              <form onSubmit={handleManualSend} className="flex-1 mx-2 flex items-center relative">
                <input
                  type="text"
                  placeholder={status === "connected" ? "Or type to RJ..." : "Connecting..."}
                  disabled={status !== "connected"}
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  className="w-full rounded-full border border-white/10 bg-black/50 py-1.5 pl-3 pr-8 text-xs text-white placeholder-white/35 outline-none focus:border-emerald-400/50"
                />
                <button
                  type="submit"
                  disabled={status !== "connected" || !textPrompt.trim()}
                  className="absolute right-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-black hover:opacity-90 disabled:opacity-30 transition"
                >
                  <Send className="h-3 w-3" />
                </button>
              </form>

              {/* End Call Button */}
              <button
                onClick={endCall}
                title="End Call"
                className="grid h-10 w-10 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 hover:bg-red-500 transition active:scale-95 cursor-pointer"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
