/** Procedurally synthesized sound effects (no audio files) via the Web Audio API. */
class SoundManager {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  private tone(freq: number, duration: number, type: OscillatorType, peakGain: number, freqEnd?: number) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(peakGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private noiseBurst(duration: number, peakGain: number, filterFreq: number) {
    const ctx = this.ensureCtx();
    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration);
  }

  buttonClick() {
    this.tone(700, 0.05, "square", 0.08);
  }

  pitchTypeSelect() {
    this.tone(500, 0.06, "triangle", 0.1);
  }

  ballCall() {
    this.tone(260, 0.15, "sine", 0.15, 200);
  }

  strikeCall() {
    this.tone(520, 0.12, "square", 0.15, 380);
  }

  foulCall() {
    this.noiseBurst(0.12, 0.15, 1500);
  }

  swingMiss() {
    this.tone(400, 0.18, "sawtooth", 0.1, 120);
  }

  batCrack() {
    this.noiseBurst(0.08, 0.35, 800);
    this.tone(180, 0.12, "triangle", 0.25, 90);
  }

  hitBall(bases: 1 | 2 | 3 | 4) {
    this.batCrack();
    const notes = [420, 500, 600, 760];
    notes.slice(0, bases).forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.18, "triangle", 0.18), i * 90);
    });
  }

  fieldOut() {
    this.tone(220, 0.25, "sawtooth", 0.15, 100);
  }

  pickoffSuccess() {
    this.tone(700, 0.08, "square", 0.2, 300);
    setTimeout(() => this.tone(180, 0.2, "sawtooth", 0.2, 80), 90);
  }

  pickoffFail() {
    this.tone(300, 0.15, "sine", 0.1, 260);
  }

  gameEnd() {
    [523, 659, 784].forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.3, "triangle", 0.2), i * 160);
    });
  }
}

export const sound = new SoundManager();
