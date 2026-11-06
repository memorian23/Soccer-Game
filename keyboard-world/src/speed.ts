// 속도 단위: k < m < b < t 순서로 빨라진다.
export interface SpeedUnit {
  key: "k" | "m" | "b" | "t";
  mult: number;
  name: string;
}

export const UNITS: SpeedUnit[] = [
  { key: "k", mult: 1e3, name: "천" },
  { key: "m", mult: 1e6, name: "백만" },
  { key: "b", mult: 1e9, name: "십억" },
  { key: "t", mult: 1e12, name: "조" },
];

export const MIN_SPEED = 1;
export const MAX_SPEED = 999e12; // 999t
export const BASE_MOVE = 6; // 속도 1일 때 이동 속도 (유닛/초)

export function clampSpeed(v: number): number {
  if (!Number.isFinite(v)) return MIN_SPEED;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, v));
}

/** "5", "2.5k", "10 m", "3T" 같은 입력을 숫자로 바꾼다. */
export function parseSpeedText(text: string): number | null {
  const m = text
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .match(/^(\d+(?:\.\d+)?)\s*([kmbt])?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!(n > 0)) return null;
  const unit = UNITS.find((u) => u.key === m[2]);
  return clampSpeed(n * (unit ? unit.mult : 1));
}

function trim(n: number): string {
  return n >= 100 ? n.toFixed(0) : n >= 10 ? +n.toFixed(1) + "" : +n.toFixed(2) + "";
}

export function formatSpeed(v: number): string {
  for (let i = UNITS.length - 1; i >= 0; i--) {
    if (v >= UNITS[i].mult) return trim(v / UNITS[i].mult) + UNITS[i].key;
  }
  return trim(v);
}

/**
 * 입력한 속도 값 -> 실제 이동 속도.
 * 입력값이 클수록 항상 더 빨라지고(k < m < b < t),
 * 1조 같은 값에서도 맵을 뚫고 지나가지 않도록 로그 스케일로 늘린다.
 */
export function moveSpeedFor(v: number): number {
  return BASE_MOVE + 3 * Math.log10(clampSpeed(v));
}
