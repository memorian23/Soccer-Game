const KEY = "keyboard-world-save-v1";

export interface SaveData {
  trophies: bigint;
  owned: string[];
  equipped: string[];
  cleared: number[];
  speed: number;
}

function defaults(): SaveData {
  return { trophies: 0n, owned: [], equipped: [], cleared: [], speed: 1 };
}

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const o = JSON.parse(raw);
    return {
      trophies: BigInt(typeof o.trophies === "string" ? o.trophies : "0"),
      owned: strArr(o.owned),
      equipped: strArr(o.equipped),
      cleared: Array.isArray(o.cleared) ? o.cleared.filter((x: unknown) => typeof x === "number") : [],
      speed: typeof o.speed === "number" ? o.speed : 1,
    };
  } catch {
    return defaults();
  }
}

export function writeSave(s: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, trophies: s.trophies.toString() }));
  } catch {
    /* 저장 불가 환경(시크릿 모드 등)은 무시 */
  }
}

export function formatFull(n: bigint): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const SHORT = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
export function formatShort(n: bigint): string {
  const s = n.toString();
  const group = Math.floor((s.length - 1) / 3);
  if (group === 0) return s;
  if (group >= SHORT.length) return `${s[0]}.${s.slice(1, 3)}e${s.length - 1}`;
  const intLen = s.length - group * 3;
  const head = s.slice(0, intLen);
  const dec = s.slice(intLen, intLen + 1);
  return `${head}${dec !== "0" ? "." + dec : ""}${SHORT[group]}`;
}
