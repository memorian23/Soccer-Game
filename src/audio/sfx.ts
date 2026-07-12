interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  sweepTo?: number;
}

/**
 * All sound effects are synthesized on the fly with the Web Audio API - there are no audio
 * files to ship or license. The AudioContext is created lazily on first use so it's always
 * constructed from inside a user-gesture handler (a button click), satisfying browser
 * autoplay policies.
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted() {
    return this.muted;
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, opts: ToneOptions = {}) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const t0 = ctx.currentTime + (opts.delay ?? 0);

    const osc = ctx.createOscillator();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.sweepTo !== undefined) {
      osc.frequency.linearRampToValueAtTime(opts.sweepTo, t0 + duration);
    }

    const gain = ctx.createGain();
    const peak = opts.gain ?? 0.2;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Soft UI blip for menu/button interactions. */
  click() {
    this.tone(700, 0.06, { type: "square", gain: 0.07 });
  }

  /** Short filtered noise burst - a ball-striking "thud". */
  kick() {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const t0 = ctx.currentTime;
    const duration = 0.07;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);
    noise.stop(t0 + duration + 0.01);
  }

  /** Referee whistle: two short sine bursts. */
  whistle() {
    this.tone(1900, 0.28, { type: "sine", gain: 0.15 });
    this.tone(1900, 0.28, { type: "sine", gain: 0.15, delay: 0.36 });
  }

  /** Goal alert: a quick rising three-note flourish. */
  goal() {
    [0, 261.63, 392].forEach((_, i) => {
      const notes = [523.25, 659.25, 783.99];
      this.tone(notes[i], 0.22, { type: "triangle", gain: 0.18, delay: i * 0.11 });
    });
  }

  /** Crowd cheer for a match won: a bright major arpeggio. */
  cheer() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((note, i) => this.tone(note, 0.3, { type: "triangle", gain: 0.15, delay: i * 0.1 }));
  }

  /** Crowd groan for a match lost: a low descending sawtooth. */
  boo() {
    this.tone(200, 0.6, { type: "sawtooth", gain: 0.1, sweepTo: 110 });
  }
}

export const sfx = new Sfx();
