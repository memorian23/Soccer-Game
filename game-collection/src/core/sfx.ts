import type { SfxKind } from "./types";

let ctx: AudioContext | null = null;
export let muted = false;
export function setMuted(m: boolean) {
  muted = m;
}

const TABLE: Record<SfxKind, [number, number, OscillatorType, number]> = {
  // freq, duration, wave, end freq multiplier
  hit: [440, 0.06, "square", 1.2],
  score: [660, 0.1, "triangle", 1.5],
  fail: [220, 0.35, "sawtooth", 0.4],
  click: [900, 0.03, "square", 1],
  win: [520, 0.4, "triangle", 2],
  shoot: [1200, 0.05, "square", 0.5],
};

export function playSfx(kind: SfxKind) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    const [f, d, w, m] = TABLE[kind];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = w;
    o.frequency.setValueAtTime(f, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(f * m, ctx.currentTime + d);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + d);
  } catch {
    /* 오디오 미지원 환경 무시 */
  }
}
