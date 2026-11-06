import { ACTION } from "../engines/action";
import { ARCADE } from "../engines/arcade";
import { BOARD } from "../engines/board";
import { BRAIN } from "../engines/brain";
import { PUZZLE } from "../engines/puzzle";
import { RHYTHM } from "../engines/rhythm";
import { SPORTS } from "../engines/sports";
import type { Engine, GameEntry, Mode, Theme } from "./types";

export const ENGINES: Engine[] = [...ACTION, ...ARCADE, ...PUZZLE, ...BRAIN, ...BOARD, ...SPORTS, ...RHYTHM];

export const THEMES: Theme[] = [
  { name: "미드나잇", bg: "#14182b", fg: "#f2f4ff", accent: "#4f8cff", accent2: "#ffd166", danger: "#ff5c7a", muted: "#2c3354" },
  { name: "네온", bg: "#0a0014", fg: "#f0e6ff", accent: "#00f0ff", accent2: "#ff00e5", danger: "#ffea00", muted: "#2a1440" },
  { name: "정글", bg: "#0f2a17", fg: "#eaffe9", accent: "#7ed957", accent2: "#ffb703", danger: "#e63946", muted: "#1f4a2a" },
  { name: "심해", bg: "#021b2e", fg: "#e0f7ff", accent: "#2ec4b6", accent2: "#cbf3f0", danger: "#ff9f1c", muted: "#0b3a57" },
  { name: "노을", bg: "#2b0f1e", fg: "#fff1e6", accent: "#ff7b54", accent2: "#ffd56b", danger: "#9b5de5", muted: "#4d1d36" },
];

export const SPEEDS: { label: string; v: number }[] = [
  { label: "보통", v: 1 },
  { label: "느긋한", v: 0.7 },
  { label: "빠른", v: 1.3 },
  { label: "광속", v: 1.55 },
  { label: "지옥의", v: 1.8 },
];

export const SIZES: { label: string; v: number }[] = [
  { label: "", v: 1 },
  { label: "미니", v: 0.75 },
  { label: "메가", v: 1.3 },
];

export const MODES: { id: Mode; label: string }[] = [
  { id: "classic", label: "클래식" },
  { id: "time", label: "타임어택" },
  { id: "hardcore", label: "하드코어" },
  { id: "zen", label: "젠" },
];

export const VARIANTS_PER_ENGINE = THEMES.length * MODES.length * SPEEDS.length * SIZES.length; // 300
export const TOTAL = VARIANTS_PER_ENGINE * ENGINES.length; // 9000

function hash(n: number) {
  let h = n ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** 게임 번호(1..9000) → 게임 정의. 번호마다 고유한 (엔진, 테마, 모드, 속도, 크기) 조합이 대응된다. */
export function entry(no: number): GameEntry {
  const i = no - 1;
  const e = i % ENGINES.length;
  // 같은 페이지에 다양한 변형이 섞이도록 엔진별로 변형 순서를 뒤섞는다 (97은 300과 서로소 → 일대일 대응)
  let v = (Math.floor(i / ENGINES.length) * 97 + e * 37) % VARIANTS_PER_ENGINE;
  const theme = v % THEMES.length;
  v = Math.floor(v / THEMES.length);
  const mode = v % MODES.length;
  v = Math.floor(v / MODES.length);
  const speed = v % SPEEDS.length;
  v = Math.floor(v / SPEEDS.length);
  const size = v % SIZES.length;
  const engine = ENGINES[e];
  const parts = [THEMES[theme].name, SPEEDS[speed].label, SIZES[size].label, engine.name].filter(Boolean);
  return {
    no,
    id: `g${no}`,
    title: `${parts.join(" ")} · ${MODES[mode].label}`,
    engine,
    params: {
      seed: hash(no),
      speed: SPEEDS[speed].v,
      size: SIZES[size].v,
      mode: MODES[mode].id,
      theme: THEMES[theme],
    },
  };
}

let cache: GameEntry[] | null = null;
export function allEntries(): GameEntry[] {
  cache ??= Array.from({ length: TOTAL }, (_, k) => entry(k + 1));
  return cache;
}
