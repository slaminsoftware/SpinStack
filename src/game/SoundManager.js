// src/game/SoundManager.js
// Centralized sound engine for SpinStack.
//
// Uses expo-audio on native (iOS/Android) and the Web Audio API on web.
// All sounds are synthesized procedurally — no asset files required.
//
// Usage:
//   import SoundManager from '../game/SoundManager';
//   await SoundManager.init();          // call once on game start
//   SoundManager.play('brickTap', '#FF0000');
//   SoundManager.startDangerPulse(0.8); // 0–1 urgency
//   SoundManager.stopDangerPulse();
//   SoundManager.dispose();             // call on game end/unmount

import { Platform } from 'react-native';

// ─── Color → pitch mapping ────────────────────────────────────────────────────
// Each of the 6 brick colors maps to a note in a pentatonic scale.
const COLOR_NOTES = {
  '#FF0000': 261.63, // C4  — red
  '#FF5F1F': 293.66, // D4  — orange
  '#FFFF33': 329.63, // E4  — yellow
  '#39FF14': 392.00, // G4  — green
  '#1F51FF': 440.00, // A4  — blue
  '#FF00FF': 523.25, // C5  — magenta
};

// ─── Music sequencer ──────────────────────────────────────────────────────────
// Two modes: CALM (sparse arpeggios, slow pad) and TENSE (faster, minor key).
// Each "bar" is scheduled ahead of time using Web Audio's clock so there are
// no gaps or drift. The sequencer reschedules itself every bar.

const CALM_NOTES  = [130.81, 164.81, 196.00, 246.94, 261.63, 196.00, 164.81, 130.81]; // C3 pentatonic
const TENSE_NOTES = [138.59, 174.61, 207.65, 246.94, 277.18, 246.94, 207.65, 138.59]; // C#3 minor-ish

// ─── Web Audio synthesizer ────────────────────────────────────────────────────
class WebAudioEngine {
  constructor() {
    this._ctx = null;
    this._dangerInterval = null;

    // Music loop state
    this._musicGain = null;       // master gain for music
    this._padGain = null;         // gain for the sustained pad layer
    this._padOsc1 = null;
    this._padOsc2 = null;
    this._musicScheduled = false;
    this._nextBarTime = 0;
    this._barTimer = null;
    this._musicTense = false;
    this._musicPlaying = false;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _tone({ freq = 440, type = 'sine', gain = 0.3, attack = 0.01, decay = 0.1, sustain = 0, release = 0.15, duration = 0.3 }) {
    const ctx = this._getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + attack);
    env.gain.linearRampToValueAtTime(sustain * gain, now + attack + decay);
    env.gain.setValueAtTime(sustain * gain, now + attack + decay);
    env.gain.linearRampToValueAtTime(0, now + duration + release);

    osc.connect(env);
    env.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + release + 0.05);
  }

  // ── Individual sound effects ───────────────────────────────────────────────

  brickTap(color) {
    const freq = COLOR_NOTES[color] ?? 440;
    this._tone({ freq, type: 'triangle', gain: 0.25, attack: 0.005, decay: 0.08, sustain: 0, release: 0.12, duration: 0.05 });
  }

  rowClear(count = 1) {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    // Crystalline chime — richer for multi-row clears
    const freqs = count > 1
      ? [523.25, 659.25, 783.99, 1046.50]
      : [523.25, 783.99];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      env.gain.setValueAtTime(0, now + i * 0.06);
      env.gain.linearRampToValueAtTime(0.3, now + i * 0.06 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.5);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.55);
    });
  }

  newRow() {
    this._tone({ freq: 80, type: 'sawtooth', gain: 0.2, attack: 0.01, decay: 0.15, sustain: 0, release: 0.1, duration: 0.15 });
  }

  almostMatch() {
    // Rising two-note anticipation
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    [392, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      env.gain.setValueAtTime(0, now + i * 0.1);
      env.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }

  specialBomb() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    // Deep explosion — noise-like via detuned sawtooth + low sine
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const env = ctx.createGain();
    osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.exponentialRampToValueAtTime(20, now + 0.4);
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(40, now);
    env.gain.setValueAtTime(0.5, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    [osc1, osc2].forEach(o => { o.connect(env); o.start(now); o.stop(now + 0.55); });
    env.connect(ctx.destination);
  }

  specialLightning() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    env.gain.setValueAtTime(0.4, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(env); env.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.25);
  }

  specialRainbow() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    const freqs = [261.63, 329.63, 392, 523.25, 659.25];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      env.gain.setValueAtTime(0, now + i * 0.05);
      env.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 0.35);
    });
  }

  specialStar() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    // Bright ascending arpeggio
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      env.gain.setValueAtTime(0, now + i * 0.07);
      env.gain.linearRampToValueAtTime(0.25, now + i * 0.07 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(now + i * 0.07); osc.stop(now + i * 0.07 + 0.4);
    });
  }

  specialFreeze() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    // Icy descending shimmer
    [1046.50, 880, 698.46, 587.33, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      env.gain.setValueAtTime(0, now + i * 0.06);
      env.gain.linearRampToValueAtTime(0.2, now + i * 0.06 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(now + i * 0.06); osc.stop(now + i * 0.06 + 0.35);
    });
  }

  rotate() {
    this._tone({ freq: 350, type: 'sine', gain: 0.15, attack: 0.01, decay: 0.08, sustain: 0, release: 0.08, duration: 0.05 });
  }

  gameOver() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    [392, 349.23, 311.13, 261.63].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.18);
      env.gain.setValueAtTime(0, now + i * 0.18);
      env.gain.linearRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.5);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(now + i * 0.18); osc.stop(now + i * 0.18 + 0.55);
    });
  }

  win() {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      env.gain.setValueAtTime(0, now + i * 0.1);
      env.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.55);
    });
  }

  // ── Background music loop ─────────────────────────────────────────────────

  startMusic() {
    if (this._musicPlaying) return;
    this._musicPlaying = true;
    const ctx = this._getCtx();

    // Master music gain — keeps music quieter than SFX
    this._musicGain = ctx.createGain();
    this._musicGain.gain.setValueAtTime(0, ctx.currentTime);
    this._musicGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2.0);
    this._musicGain.connect(ctx.destination);

    // Sustained drone pad: two slightly detuned triangle oscillators
    this._padGain = ctx.createGain();
    this._padGain.gain.setValueAtTime(0.4, ctx.currentTime);
    this._padGain.connect(this._musicGain);

    this._padOsc1 = ctx.createOscillator();
    this._padOsc1.type = 'triangle';
    this._padOsc1.frequency.setValueAtTime(65.41, ctx.currentTime); // C2
    this._padOsc1.connect(this._padGain);
    this._padOsc1.start();

    this._padOsc2 = ctx.createOscillator();
    this._padOsc2.type = 'triangle';
    this._padOsc2.frequency.setValueAtTime(65.81, ctx.currentTime); // slightly detuned
    this._padOsc2.connect(this._padGain);
    this._padOsc2.start();

    // Kick off the bar sequencer — but only once the AudioContext is actually
    // running. Browsers suspend AudioContext until a user gesture, so if we
    // schedule here while suspended, ctx.currentTime is frozen and all notes
    // end up in the past and are silently dropped.
    const beginSequencer = () => {
      if (!this._musicPlaying || this._musicScheduled) return;
      this._musicScheduled = true;
      this._nextBarTime = ctx.currentTime + 0.1;
      this._scheduleBar();
    };

    if (ctx.state === 'running') {
      beginSequencer();
    } else {
      ctx.addEventListener('statechange', function onResume() {
        if (ctx.state === 'running') {
          ctx.removeEventListener('statechange', onResume);
          beginSequencer();
        }
      });
    }
  }

  _scheduleBar() {
    if (!this._musicPlaying) return;
    const ctx = this._getCtx();
    const notes = this._musicTense ? TENSE_NOTES : CALM_NOTES;
    const barDuration = this._musicTense ? 1.6 : 2.4; // tense = faster
    const stepDuration = barDuration / notes.length;
    const t0 = this._nextBarTime;

    notes.forEach((freq, i) => {
      const t = t0 + i * stepDuration;

      // Plucked arpeggio note
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = this._musicTense ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, t);

      // Tense mode: add a slight pitch drop for tension
      if (this._musicTense) {
        osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t + stepDuration * 0.8);
      }

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.55, t + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.85);

      osc.connect(env);
      env.connect(this._musicGain);
      osc.start(t);
      osc.stop(t + stepDuration);

      // Every 4 steps, add a higher harmonic accent
      if (i % 4 === 0) {
        const acc = ctx.createOscillator();
        const accEnv = ctx.createGain();
        acc.type = 'sine';
        acc.frequency.setValueAtTime(freq * 2, t);
        accEnv.gain.setValueAtTime(0, t);
        accEnv.gain.linearRampToValueAtTime(0.2, t + 0.015);
        accEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        acc.connect(accEnv);
        accEnv.connect(this._musicGain);
        acc.start(t);
        acc.stop(t + 0.3);
      }
    });

    // Pulse the pad root note in sync with each bar
    if (this._padOsc1) {
      const padRoot = this._musicTense ? 69.30 : 65.41;
      this._padOsc1.frequency.setValueAtTime(padRoot, t0);
      this._padOsc2.frequency.setValueAtTime(padRoot + 0.4, t0);
    }

    this._nextBarTime = t0 + barDuration;

    // Schedule next bar ~200ms before it starts
    const msUntilNextBar = (this._nextBarTime - ctx.currentTime - 0.2) * 1000;
    this._barTimer = setTimeout(() => this._scheduleBar(), Math.max(0, msUntilNextBar));
  }

  setMusicTense(tense) {
    if (this._musicTense === tense) return;
    this._musicTense = tense;
    const ctx = this._getCtx();

    // Cross-fade the master music gain for a smooth tension shift
    const targetGain = tense ? 0.28 : 0.18;
    this._musicGain?.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.8);

    // Shift the pad tone
    const padRoot = tense ? 69.30 : 65.41;
    this._padOsc1?.frequency.linearRampToValueAtTime(padRoot,       ctx.currentTime + 0.8);
    this._padOsc2?.frequency.linearRampToValueAtTime(padRoot + 0.4, ctx.currentTime + 0.8);
  }

  stopMusic() {
    if (!this._musicPlaying) return;
    this._musicPlaying = false;
    clearTimeout(this._barTimer);

    const ctx = this._getCtx();
    if (this._musicGain) {
      this._musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    }
    // Stop pads after fade
    setTimeout(() => {
      try { this._padOsc1?.stop(); } catch (_) {}
      try { this._padOsc2?.stop(); } catch (_) {}
      this._padOsc1 = null;
      this._padOsc2 = null;
    }, 900);
  }

  // ── Danger pulse (looping heartbeat) ──────────────────────────────────────
  startDangerPulse(urgency = 0.5) {
    this.stopDangerPulse();
    const bpm = 60 + urgency * 120; // 60bpm calm → 180bpm panic
    const interval = (60 / bpm) * 1000;

    const beat = () => {
      this._tone({ freq: 60 + urgency * 20, type: 'sine', gain: 0.08 + urgency * 0.12, attack: 0.01, decay: 0.06, sustain: 0, release: 0.08, duration: 0.05 });
    };

    beat();
    this._dangerInterval = setInterval(beat, interval);
  }

  stopDangerPulse() {
    if (this._dangerInterval) {
      clearInterval(this._dangerInterval);
      this._dangerInterval = null;
    }
  }

  dispose() {
    this.stopDangerPulse();
    this.stopMusic();
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
  }
}

// ─── Native (expo-audio) engine ───────────────────────────────────────────────
class NativeAudioEngine {
  constructor() {
    this._dangerInterval = null;
    this._musicInterval = null;
    this._musicStep = 0;
    this._musicTense = false;
    this._musicPlaying = false;
    this._ready = false;
    this._expoAudio = null;
    this._init();
  }

  async _init() {
    try {
      const expoAudio = await import('expo-audio');
      await expoAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this._expoAudio = expoAudio;
      this._ready = true;
    } catch (e) {
      console.warn('SoundManager: expo-audio unavailable', e);
    }
  }

  // Generate a sine wave as a base64 WAV data URI
  _makeSineWav(freq, duration, gainVal = 0.3, sampleRate = 22050) {
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeStr = (o, s) => {
      for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    const attackSamples  = Math.floor(sampleRate * 0.01);
    const releaseSamples = Math.floor(sampleRate * 0.05);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let envelope = 1;
      if (i < attackSamples) envelope = i / attackSamples;
      else if (i > numSamples - releaseSamples) envelope = (numSamples - i) / releaseSamples;
      const sample = Math.sin(2 * Math.PI * freq * t) * gainVal * envelope * 32767;
      view.setInt16(44 + i * 2, Math.round(Math.max(-32767, Math.min(32767, sample))), true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  async _play(freq, duration, gain = 0.3) {
    if (!this._ready || !this._expoAudio) return;
    try {
      const uri = this._makeSineWav(freq, duration, gain);
      const player = this._expoAudio.createAudioPlayer({ uri });
      player.volume = 1.0;
      player.play();
      // Release the player once playback finishes
      setTimeout(() => {
        try { player.remove(); } catch (_) {}
      }, (duration + 0.3) * 1000);
    } catch (_) {}
  }

  brickTap(color) {
    this._play(COLOR_NOTES[color] ?? 440, 0.15, 0.25);
  }

  rowClear(count = 1) {
    const freqs = count > 1 ? [523, 659, 784, 1047] : [523, 784];
    freqs.forEach((freq, i) => setTimeout(() => this._play(freq, 0.35, 0.28), i * 60));
  }

  newRow() { this._play(80, 0.2, 0.2); }

  almostMatch() {
    [392, 523].forEach((f, i) => setTimeout(() => this._play(f, 0.2, 0.18), i * 100));
  }

  specialBomb() { this._play(50, 0.45, 0.45); }

  specialLightning() { this._play(700, 0.15, 0.35); }

  specialRainbow() {
    [262, 330, 392, 523].forEach((f, i) => setTimeout(() => this._play(f, 0.25, 0.2), i * 50));
  }

  specialStar() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this._play(f, 0.3, 0.22), i * 70));
  }

  specialFreeze() {
    [1047, 880, 698, 587, 440].forEach((f, i) => setTimeout(() => this._play(f, 0.25, 0.18), i * 60));
  }

  rotate() { this._play(350, 0.1, 0.15); }

  gameOver() {
    [392, 349, 311, 262].forEach((f, i) => setTimeout(() => this._play(f, 0.4, 0.3), i * 180));
  }

  win() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => this._play(f, 0.4, 0.28), i * 100));
  }

  startMusic() {
    if (this._musicPlaying) return;
    this._musicPlaying = true;
    this._musicStep = 0;
    const tick = () => {
      if (!this._musicPlaying) return;
      const notes = this._musicTense ? TENSE_NOTES : CALM_NOTES;
      const stepMs = this._musicTense ? 200 : 300;
      this._play(notes[this._musicStep % notes.length], (stepMs / 1000) * 0.75, 0.08);
      this._musicStep++;
      this._musicInterval = setTimeout(tick, stepMs);
    };
    tick();
  }

  setMusicTense(tense) { this._musicTense = tense; }

  stopMusic() {
    this._musicPlaying = false;
    clearTimeout(this._musicInterval);
    this._musicInterval = null;
  }

  startDangerPulse(urgency = 0.5) {
    this.stopDangerPulse();
    const interval = (60 / (60 + urgency * 120)) * 1000;
    const beat = () => this._play(60 + urgency * 20, 0.1, 0.08 + urgency * 0.1);
    beat();
    this._dangerInterval = setInterval(beat, interval);
  }

  stopDangerPulse() {
    if (this._dangerInterval) {
      clearInterval(this._dangerInterval);
      this._dangerInterval = null;
    }
  }

  dispose() {
    this.stopDangerPulse();
    this.stopMusic();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
const engine = Platform.OS === 'web' ? new WebAudioEngine() : new NativeAudioEngine();

const SoundManager = {
  init() {
    return Promise.resolve();
  },

  play(sound, ...args) {
    try {
      if (typeof engine[sound] === 'function') engine[sound](...args);
    } catch (_) {}
  },

  startMusic() {
    try { engine.startMusic(); } catch (_) {}
  },

  stopMusic() {
    try { engine.stopMusic(); } catch (_) {}
  },

  setMusicTense(tense) {
    try { engine.setMusicTense(tense); } catch (_) {}
  },

  startDangerPulse(urgency) {
    try { engine.startDangerPulse(urgency); } catch (_) {}
  },

  stopDangerPulse() {
    try { engine.stopDangerPulse(); } catch (_) {}
  },

  dispose() {
    try { engine.dispose(); } catch (_) {}
  },
};

export default SoundManager;
