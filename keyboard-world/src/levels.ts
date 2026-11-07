export type KeyType = "start" | "normal" | "checkpoint" | "goal" | "obstacle" | "treadmill";

export interface KeyMove {
  axis: "x" | "y" | "z";
  amp: number;
  speed: number;
  phase?: number;
}

export interface KeyDef {
  label: string;
  x: number;
  z: number;
  /** 윗면 높이 */
  y?: number;
  w?: number;
  d?: number;
  type?: KeyType;
  move?: KeyMove;
  /** 런닝기구 배수 */
  mult?: number;
}

export interface LevelDef {
  id: number;
  name: string;
  desc: string;
  color: string; // 길 키캡 색
  keys: KeyDef[];
}

/** 성공 보상 */
export const REWARD = 100000000000000n;
/** 런닝기구 배수 */
export const TREADMILL_MULT = 100;

const TRACK_W = 7;
const SEG = 10;
const HUB_D = 10;
const LETTERS = "QWERTYUIOPASDFGHJKLZXCVBNM";
const OB_LABELS = ["Del", "Ins", "Tab", "Caps", "Alt", "Ctrl", "Shift", "Back"];

interface Obstacle {
  /** 출발선에서부터의 거리 */
  at: number;
  x?: number;
  w?: number;
  /** 장애물 높이 (점프로 넘을 수 있는 높이) */
  h?: number;
  move?: KeyMove;
}

/**
 * 출발 광장(100× 런닝기구 포함) + 일자 달리기 길 + 장애물 + Enter 골.
 * 길은 틈 없이 이어져 있어서 점프는 장애물을 넘을 때만 쓴다.
 */
function course(length: number, obstacles: Obstacle[], checkpoints: number[] = []): KeyDef[] {
  const keys: KeyDef[] = [
    { label: "Esc", x: 0, z: 0, w: 14, d: HUB_D, type: "start" },
    { label: `${TREADMILL_MULT}× 런닝기구`, x: -4.5, z: 0.5, y: 0.25, w: 3, d: 6, type: "treadmill", mult: TREADMILL_MULT },
  ];
  const startZ = -HUB_D / 2;
  const segs = Math.ceil(length / SEG);
  for (let i = 0; i < segs; i++) {
    keys.push({
      label: LETTERS[i % LETTERS.length],
      x: 0,
      z: startZ - SEG / 2 - i * SEG,
      w: TRACK_W,
      d: SEG,
      type: checkpoints.includes(i) ? "checkpoint" : "normal",
    });
  }
  obstacles.forEach((o, i) =>
    keys.push({
      label: OB_LABELS[i % OB_LABELS.length],
      x: o.x ?? 0,
      z: startZ - o.at,
      y: o.h ?? 1.1,
      w: o.w ?? TRACK_W,
      d: 0.9,
      type: "obstacle",
      move: o.move,
    }),
  );
  keys.push({ label: "Enter", x: 0, z: startZ - segs * SEG - 2, w: TRACK_W, d: 4, type: "goal" });
  return keys;
}

const every = (from: number, to: number, step: number) => {
  const r: number[] = [];
  for (let v = from; v <= to; v += step) r.push(v);
  return r;
};

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "첫 달리기",
    desc: "낮은 벽 3개를 점프로 넘어 Enter까지",
    color: "#8ecbff",
    keys: course(60, [{ at: 15 }, { at: 30 }, { at: 45 }]),
  },
  {
    id: 2,
    name: "장애물 달리기",
    desc: "벽이 많아졌어요. 옆으로 피해도 돼요",
    color: "#a5f0b5",
    keys: course(
      100,
      [
        { at: 12 }, { at: 24 }, { at: 36, w: 3.5, x: -1.75 }, { at: 48 },
        { at: 60, w: 3.5, x: 1.75 }, { at: 72 }, { at: 84, h: 1.4 },
      ],
      [5],
    ),
  },
  {
    id: 3,
    name: "미끄러지는 벽",
    desc: "좌우로 움직이는 벽을 피하거나 넘어가요",
    color: "#ffd38a",
    keys: course(
      120,
      every(12, 108, 12).map((at, i) =>
        i % 3 === 2 ? { at } : { at, w: 2.5, move: { axis: "x", amp: 2.2, speed: 1.6, phase: i } },
      ),
      [6],
    ),
  },
  {
    id: 4,
    name: "오르내리는 벽",
    desc: "벽이 낮아질 때 점프해서 넘어가요",
    color: "#ff9fc8",
    keys: course(
      120,
      every(12, 108, 12).map((at, i) => ({ at, h: 1.2, move: { axis: "y", amp: 1, speed: 2, phase: i * 0.8 } })),
      [6],
    ),
  },
  {
    id: 5,
    name: "최종 질주",
    desc: "모든 장애물이 한꺼번에! 가장 긴 코스",
    color: "#c7a6ff",
    keys: course(
      200,
      every(10, 190, 10).map((at, i) => {
        if (i % 4 === 0) return { at };
        if (i % 4 === 1) return { at, w: 2.5, move: { axis: "x", amp: 2.2, speed: 2, phase: i } };
        if (i % 4 === 2) return { at, h: 1.2, move: { axis: "y", amp: 1, speed: 2.2, phase: i } };
        return { at, w: 3.5, x: i % 8 === 3 ? -1.75 : 1.75, h: 1.4 };
      }),
      [6, 13],
    ),
  },
];
