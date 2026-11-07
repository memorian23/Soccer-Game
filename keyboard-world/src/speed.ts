// 속도 표시 단위: k < m < b < t 순서로 빨라진다.
export const UNITS = [
  { key: "k", mult: 1e3 },
  { key: "m", mult: 1e6 },
  { key: "b", mult: 1e9 },
  { key: "t", mult: 1e12 },
] as const;

export const MIN_SPEED = 1;
export const MAX_SPEED = 1e15; // 1000t
export const BASE_MOVE = 6; // 속도 1일 때 이동 속도 (유닛/초)

export function clampSpeed(v: number): number {
  if (!Number.isFinite(v)) return MIN_SPEED;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, v));
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
 * 모은 속도 -> 실제 이동 속도.
 * 키를 많이 누를수록 계속 빨라지지만, 엄청 큰 숫자에서도 맵을 뚫고 나가지 않게 로그 스케일로 늘린다.
 */
export function moveSpeedFor(v: number): number {
  return BASE_MOVE + 3 * Math.log10(clampSpeed(v));
}
