"use client";

// Procedural Web Audio Ambient Sound Engine, Vintage Mechanical FX & Telugu RJ Interstitials
// 100% in-browser synthesis: zero network dependencies, infinite seamless looping

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Track nodes for each ambient sound
  private rainGain: GainNode | null = null;
  private cricketsGain: GainNode | null = null;
  private tapeGain: GainNode | null = null;
  private trainGain: GainNode | null = null;

  // Active source nodes
  private rainNodes: { noise: AudioNode; filter: BiquadFilterNode; timer?: number } | null = null;
  private cricketNodes: { timer?: number } | null = null;
  private tapeNodes: { noise: AudioNode; timer?: number } | null = null;
  private trainNodes: { timer?: number; lfo?: OscillatorNode } | null = null;

  // Modes & Toggles
  private isRadioFxEnabled = true;
  private isRjModeEnabled = true;
  private isTransistorFilterEnabled = false;

  // Filters
  private transistorBandpass: BiquadFilterNode | null = null;

  // Track count tracker for RJ bumper frequency
  private trackPlayCount = 0;

  // Telugu RJ Bumper Drops
  private rjDrops = [
    {
      text: "Namaskaram! Meeru vintunnaru 90s Roja Radio... vintage Telugu nostalgia.",
      type: "station_id",
    },
    {
      text: "Cassette tirigindi... paata modhalaindi!",
      type: "cassette",
    },
    {
      text: "Terrace meeda challani gaali... chethilo radio. Idi mee Roja FM.",
      type: "evening",
    },
    {
      text: "Hyderabad nunchi Suresh gaaru adigina paata... ippudu mee kosam.",
      type: "dedication",
    },
    {
      text: "90s hits tho mee Roja Radio... continuous melody non-stop.",
      type: "station_id",
    },
  ];

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.transistorBandpass = this.ctx.createBiquadFilter();
      this.transistorBandpass.type = "allpass"; // inactive until enabled

      this.masterGain.connect(this.transistorBandpass);
      this.transistorBandpass.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Create a 5-second seamless pink/brown noise buffer
  private createNoiseBuffer(type: "pink" | "white" | "brown" = "pink"): AudioBuffer {
    if (!this.ctx) throw new Error("No audio context");
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === "white") {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === "pink") {
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === "brown") {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }
    return buffer;
  }

  // 1. Rain & Distant Thunder
  public setRain(volume: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume <= 0) {
      if (this.rainGain) {
        this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      if (this.rainNodes?.timer) {
        window.clearInterval(this.rainNodes.timer);
      }
      return;
    }

    if (!this.rainGain) {
      this.rainGain = this.ctx.createGain();
      this.rainGain.connect(this.masterGain);
    }
    this.rainGain.gain.setTargetAtTime(volume * 0.4, this.ctx.currentTime, 0.05);

    if (!this.rainNodes) {
      const buffer = this.createNoiseBuffer("pink");
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1100, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      const highpass = this.ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(200, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(highpass);
      highpass.connect(this.rainGain);
      noise.start();

      const thunderTimer = window.setInterval(() => {
        if (!this.ctx || !this.rainGain || Math.random() > 0.4) return;
        const now = this.ctx.currentTime;
        const thunderGain = this.ctx.createGain();
        thunderGain.gain.setValueAtTime(0.001, now);
        thunderGain.gain.exponentialRampToValueAtTime(0.3, now + 1.2);
        thunderGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);

        const thunderFilter = this.ctx.createBiquadFilter();
        thunderFilter.type = "lowpass";
        thunderFilter.frequency.setValueAtTime(120, now);

        const thunderBuffer = this.createNoiseBuffer("brown");
        const thunderNoise = this.ctx.createBufferSource();
        thunderNoise.buffer = thunderBuffer;
        thunderNoise.connect(thunderFilter);
        thunderFilter.connect(thunderGain);
        thunderGain.connect(this.rainGain);

        thunderNoise.start(now);
        thunderNoise.stop(now + 5);
      }, 14000);

      this.rainNodes = { noise, filter, timer: thunderTimer };
    }
  }

  // 2. Summer Crickets & Midnight Breeze
  public setCrickets(volume: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume <= 0) {
      if (this.cricketsGain) {
        this.cricketsGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      if (this.cricketNodes?.timer) {
        window.clearInterval(this.cricketNodes.timer);
        this.cricketNodes = null;
      }
      return;
    }

    if (!this.cricketsGain) {
      this.cricketsGain = this.ctx.createGain();
      this.cricketsGain.connect(this.masterGain);
    }
    this.cricketsGain.gain.setTargetAtTime(volume * 0.25, this.ctx.currentTime, 0.05);

    if (!this.cricketNodes) {
      const chirp = () => {
        if (!this.ctx || !this.cricketsGain) return;
        const now = this.ctx.currentTime;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(4600 + (Math.random() * 100 - 50), now);
        osc2.frequency.setValueAtTime(5300 + (Math.random() * 100 - 50), now);

        const chirpGain = this.ctx.createGain();
        chirpGain.gain.setValueAtTime(0.001, now);

        for (let p = 0; p < 3; p++) {
          const t = now + p * 0.06;
          chirpGain.gain.setValueAtTime(0.001, t);
          chirpGain.gain.linearRampToValueAtTime(0.2, t + 0.02);
          chirpGain.gain.linearRampToValueAtTime(0.001, t + 0.05);
        }

        osc1.connect(chirpGain);
        osc2.connect(chirpGain);
        chirpGain.connect(this.cricketsGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.22);
        osc2.stop(now + 0.22);
      };

      const timer = window.setInterval(() => {
        if (Math.random() > 0.2) chirp();
      }, 750);

      this.cricketNodes = { timer };
    }
  }

  // 3. Vinyl Crackle & Magnetic Tape Hiss
  public setTapeHiss(volume: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume <= 0) {
      if (this.tapeGain) {
        this.tapeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      if (this.tapeNodes?.timer) {
        window.clearInterval(this.tapeNodes.timer);
      }
      return;
    }

    if (!this.tapeGain) {
      this.tapeGain = this.ctx.createGain();
      this.tapeGain.connect(this.masterGain);
    }
    this.tapeGain.gain.setTargetAtTime(volume * 0.35, this.ctx.currentTime, 0.05);

    if (!this.tapeNodes) {
      const buffer = this.createNoiseBuffer("white");
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(3200, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(0.8, this.ctx.currentTime);

      const hissGain = this.ctx.createGain();
      hissGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(hissGain);
      hissGain.connect(this.tapeGain);
      noise.start();

      const crackleTimer = window.setInterval(() => {
        if (!this.ctx || !this.tapeGain || Math.random() > 0.6) return;
        const now = this.ctx.currentTime;
        const popOsc = this.ctx.createOscillator();
        popOsc.type = "triangle";
        popOsc.frequency.setValueAtTime(200 + Math.random() * 1200, now);

        const popGain = this.ctx.createGain();
        popGain.gain.setValueAtTime(0.12 * Math.random(), now);
        popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

        popOsc.connect(popGain);
        popGain.connect(this.tapeGain);

        popOsc.start(now);
        popOsc.stop(now + 0.02);
      }, 120);

      this.tapeNodes = { noise, timer: crackleTimer };
    }
  }

  // 4. Distant Night Train & Hyderabad Evening
  public setDistantTrain(volume: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume <= 0) {
      if (this.trainGain) {
        this.trainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      if (this.trainNodes?.timer) {
        window.clearInterval(this.trainNodes.timer);
        this.trainNodes = null;
      }
      return;
    }

    if (!this.trainGain) {
      this.trainGain = this.ctx.createGain();
      this.trainGain.connect(this.masterGain);
    }
    this.trainGain.gain.setTargetAtTime(volume * 0.3, this.ctx.currentTime, 0.05);

    if (!this.trainNodes) {
      const playChugPattern = () => {
        if (!this.ctx || !this.trainGain) return;
        const now = this.ctx.currentTime;

        for (let b = 0; b < 4; b++) {
          const t = now + b * 0.22;
          const noiseBuffer = this.createNoiseBuffer("brown");
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(220, t);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(b === 0 ? 0.25 : 0.15, t + 0.04);
          gain.gain.linearRampToValueAtTime(0.001, t + 0.16);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.trainGain);

          noise.start(t);
          noise.stop(t + 0.18);
        }
      };

      const playWhistle = () => {
        if (!this.ctx || !this.trainGain) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(490, now);
        osc2.frequency.setValueAtTime(740, now);

        const whistleGain = this.ctx.createGain();
        whistleGain.gain.setValueAtTime(0.001, now);
        whistleGain.gain.linearRampToValueAtTime(0.14, now + 0.8);
        whistleGain.gain.linearRampToValueAtTime(0.001, now + 2.6);

        osc1.connect(whistleGain);
        osc2.connect(whistleGain);
        whistleGain.connect(this.trainGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.8);
        osc2.stop(now + 2.8);
      };

      const timer = window.setInterval(() => {
        playChugPattern();
        if (Math.random() < 0.25) {
          window.setTimeout(playWhistle, 600);
        }
      }, 1600);

      this.trainNodes = { timer };
    }
  }

  // 5. Vintage FM Radio Frequency Tuning Burst Effect
  public playRadioTuningStatic() {
    if (!this.isRadioFxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.38;

      const noiseBuffer = this.createNoiseBuffer("white");
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.Q.setValueAtTime(2.5, now);
      bandpass.frequency.setValueAtTime(800, now);
      bandpass.frequency.exponentialRampToValueAtTime(3200, now + 0.18);
      bandpass.frequency.exponentialRampToValueAtTime(1100, now + duration);

      const staticGain = this.ctx.createGain();
      staticGain.gain.setValueAtTime(0.001, now);
      staticGain.gain.linearRampToValueAtTime(0.28, now + 0.05);
      staticGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      const toneOsc = this.ctx.createOscillator();
      toneOsc.type = "sine";
      toneOsc.frequency.setValueAtTime(1400, now);
      toneOsc.frequency.exponentialRampToValueAtTime(650, now + duration);

      const toneGain = this.ctx.createGain();
      toneGain.gain.setValueAtTime(0.001, now);
      toneGain.gain.linearRampToValueAtTime(0.08, now + 0.06);
      toneGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(bandpass);
      bandpass.connect(staticGain);
      staticGain.connect(this.masterGain);

      toneOsc.connect(toneGain);
      toneGain.connect(this.masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
      toneOsc.start(now);
      toneOsc.stop(now + duration);
    } catch {}
  }

  // 6. Mechanical Cassette Deck Button Press & Fast Rewind Whir
  public playCassetteClick() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;

      // Heavy KA-CLUNK mechanical impulse
      const thudOsc = this.ctx.createOscillator();
      thudOsc.type = "triangle";
      thudOsc.frequency.setValueAtTime(160, now);
      thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

      const thudGain = this.ctx.createGain();
      thudGain.gain.setValueAtTime(0.45, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      // Spring latch metallic click
      const clickOsc = this.ctx.createOscillator();
      clickOsc.type = "square";
      clickOsc.frequency.setValueAtTime(1850, now + 0.04);
      clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.1);

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.001, now);
      clickGain.gain.setValueAtTime(0.2, now + 0.04);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      // Motor fast rewind whir
      const motorBuffer = this.createNoiseBuffer("white");
      const motorSource = this.ctx.createBufferSource();
      motorSource.buffer = motorBuffer;

      const motorFilter = this.ctx.createBiquadFilter();
      motorFilter.type = "bandpass";
      motorFilter.frequency.setValueAtTime(400, now + 0.08);
      motorFilter.frequency.exponentialRampToValueAtTime(1600, now + 0.28);
      motorFilter.frequency.exponentialRampToValueAtTime(250, now + 0.42);

      const motorGain = this.ctx.createGain();
      motorGain.gain.setValueAtTime(0.001, now);
      motorGain.gain.setValueAtTime(0.18, now + 0.1);
      motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      thudOsc.connect(thudGain);
      thudGain.connect(this.masterGain);
      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);

      motorSource.connect(motorFilter);
      motorFilter.connect(motorGain);
      motorGain.connect(this.masterGain);

      thudOsc.start(now);
      thudOsc.stop(now + 0.14);
      clickOsc.start(now + 0.04);
      clickOsc.stop(now + 0.12);
      motorSource.start(now + 0.08);
      motorSource.stop(now + 0.48);
    } catch {}
  }

  // 7. All India Radio (AIR) Classic 3-Tone Time Signal Pips (pip.. pip.. PEEP)
  public playAirTimeChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const pips = [
        { time: now, freq: 950, dur: 0.12 },
        { time: now + 0.5, freq: 950, dur: 0.12 },
        { time: now + 1.0, freq: 1250, dur: 0.45 },
      ];

      pips.forEach((p) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(p.freq, p.time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, p.time);
        gain.gain.linearRampToValueAtTime(0.25, p.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, p.time + p.dur);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(p.time);
        osc.stop(p.time + p.dur + 0.05);
      });
    } catch {}
  }

  // 8. Vintage 90s Landline Telephone Ring
  public playPhoneRing() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const ringOsc1 = this.ctx.createOscillator();
      const ringOsc2 = this.ctx.createOscillator();
      ringOsc1.type = "sine";
      ringOsc2.type = "sine";
      ringOsc1.frequency.setValueAtTime(440, now);
      ringOsc2.frequency.setValueAtTime(480, now);

      const ringGain = this.ctx.createGain();
      ringGain.gain.setValueAtTime(0.001, now);
      ringGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      ringGain.gain.setValueAtTime(0.18, now + 0.75);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      ringOsc1.connect(ringGain);
      ringOsc2.connect(ringGain);
      ringGain.connect(this.masterGain);

      ringOsc1.start(now);
      ringOsc2.start(now);
      ringOsc1.stop(now + 0.9);
      ringOsc2.stop(now + 0.9);
    } catch {}
  }

  // 9. Telugu Radio RJ Station Drops & Voice Interstitials
  public playRjBumper(customIndex?: number) {
    if (!this.isRjModeEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    this.stopAllVoices();

    const index =
      customIndex !== undefined
        ? customIndex % this.rjDrops.length
        : Math.floor(Math.random() * this.rjDrops.length);
    const drop = this.rjDrops[index];

    // Sound effect prelude
    if (drop.type === "dedication") {
      this.playPhoneRing();
    } else if (drop.type === "cassette") {
      this.playCassetteClick();
    } else {
      this.playRadioTuningStatic();
    }

    window.setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(drop.text);
        utterance.lang = "te-IN"; // Telugu (India) fallback to English (India)
        utterance.pitch = 1.05;
        utterance.rate = 0.95;
        utterance.volume = 0.85;

        // Try selecting Indian or natural voice
        const voices = window.speechSynthesis.getVoices();
        const teluguVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().includes("te") ||
            v.lang.toLowerCase().includes("in") ||
            v.name.toLowerCase().includes("india")
        );
        if (teluguVoice) utterance.voice = teluguVoice;

        window.speechSynthesis.speak(utterance);
      } catch {}
    }, 450);
  }

  // Smart trigger for occasional RJ drop (e.g. every 3-4 songs)
  public triggerOccasionalBumper() {
    if (!this.isRjModeEnabled) return;
    this.trackPlayCount++;
    if (this.trackPlayCount % 3 === 0) {
      this.playRjBumper();
    }
  }

  public stopAllVoices() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  // 10. Vintage Transistor Radio Speaker EQ Mode
  public setTransistorMode(enabled: boolean) {
    this.isTransistorFilterEnabled = enabled;
    this.initContext();
    if (!this.transistorBandpass || !this.ctx) return;

    if (enabled) {
      this.transistorBandpass.type = "bandpass";
      this.transistorBandpass.frequency.setTargetAtTime(1600, this.ctx.currentTime, 0.05);
      this.transistorBandpass.Q.setTargetAtTime(1.4, this.ctx.currentTime, 0.05);
    } else {
      this.transistorBandpass.type = "allpass";
    }
  }

  public getTransistorMode() {
    return this.isTransistorFilterEnabled;
  }

  public setRadioFxEnabled(enabled: boolean) {
    this.isRadioFxEnabled = enabled;
  }

  public getRadioFxEnabled() {
    return this.isRadioFxEnabled;
  }

  public setRjModeEnabled(enabled: boolean) {
    this.isRjModeEnabled = enabled;
    if (!enabled) this.stopAllVoices();
  }

  public getRjModeEnabled() {
    return this.isRjModeEnabled;
  }

  public getRjDrops() {
    return this.rjDrops;
  }
}

export const ambientEngine = new AmbientEngine();
