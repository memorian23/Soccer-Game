export type KeyType = "start" | "normal" | "checkpoint" | "goal";

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
}

export interface LevelDef {
  id: number;
  name: string;
  desc: string;
  color: string; // 키캡 색
  keys: KeyDef[];
}

/** 성공 보상 */
export const REWARD = 100000000000000n;

const start = (z = 0, y = 0, x = 0): KeyDef => ({ label: "Esc", x, z, y, w: 3.2, d: 3.2, type: "start" });
const goal = (z: number, y = 0, x = 0): KeyDef => ({ label: "Enter", x, z, y, w: 3.2, d: 3.2, type: "goal" });

function level1(): KeyDef[] {
  const keys: KeyDef[] = [start()];
  const letters = "QWERTYUIOP".split("");
  letters.forEach((l, i) =>
    keys.push({ label: l, x: 0, z: -3.6 - i * 2.5, type: l === "T" ? "checkpoint" : "normal" }),
  );
  keys.push(goal(-3.6 - (letters.length - 1) * 2.5 - 3.2));
  return keys;
}

function level2(): KeyDef[] {
  const keys: KeyDef[] = [start()];
  const letters = ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"];
  letters.forEach((l, i) =>
    keys.push({ label: l, x: i % 2 ? 1.3 : -1.3, z: -4 - i * 3.4, type: l === "G" ? "checkpoint" : "normal" }),
  );
  keys.push(goal(-4 - (letters.length - 1) * 3.4 - 4));
  return keys;
}

function level3(): KeyDef[] {
  const keys: KeyDef[] = [start()];
  const labels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];
  labels.forEach((l, i) =>
    keys.push({ label: l, x: 0, z: -4 - i * 3, y: (i + 1) * 0.7, type: l === "6" ? "checkpoint" : "normal" }),
  );
  keys.push(goal(-4 - (labels.length - 1) * 3 - 3.6, (labels.length + 1) * 0.7));
  return keys;
}

function level4(): KeyDef[] {
  const keys: KeyDef[] = [start()];
  const labels = ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"];
  labels.forEach((l, i) => {
    const k: KeyDef = { label: l, x: 0, z: -4.2 - i * 3.4 };
    if (l === "B") k.type = "checkpoint";
    else if (i % 2 === 0) k.move = { axis: "y", amp: 1, speed: 2, phase: i };
    else k.move = { axis: "x", amp: 2.2, speed: 1.4, phase: i };
    keys.push(k);
  });
  keys.push(goal(-4.2 - (labels.length - 1) * 3.4 - 3.8));
  return keys;
}

function level5(): KeyDef[] {
  const keys: KeyDef[] = [start()];
  const heights = [0, 0.8, 0.4, 1.2, 0.6, 1.2, 1.8, 1.2, 2, 1.4, 2.2, 1.6];
  for (let i = 0; i < 12; i++) {
    const label = `F${i + 1}`;
    const k: KeyDef = { label, x: 0, z: -4.5 - i * 3.5, y: heights[i], w: 1.5, d: 1.5 };
    if (label === "F6") {
      k.type = "checkpoint";
      k.w = k.d = 2.2;
    } else if (i === 2 || i === 7 || i === 10) k.move = { axis: "x", amp: 2.5, speed: 1.6, phase: i };
    else if (i === 8) k.move = { axis: "y", amp: 0.8, speed: 1.8 };
    keys.push(k);
  }
  const lastZ = -4.5 - 11 * 3.5;
  keys.push({ label: "Space", x: 0, z: lastZ - 4, y: 1.6, w: 9, d: 2.2, move: { axis: "x", amp: 3, speed: 1.1 } });
  keys.push(goal(lastZ - 8.2, 1.6));
  return keys;
}

function level6(): KeyDef[] {
  const keys: KeyDef[] = [start()];
  const labels = [
    "Home", "End", "PgUp", "PgDn", "Ins", "Del", "Tab", "Caps",
    "Shift", "Ctrl", "Alt", "Fn", "Win", "Menu", "PrtSc", "Pause",
  ];
  const radius = 5;
  labels.forEach((l, i) => {
    const a = -Math.PI / 2 - i * ((40 * Math.PI) / 180);
    const k: KeyDef = {
      label: l,
      x: Math.cos(a) * radius,
      z: Math.sin(a) * radius,
      y: (i + 1) * 0.8,
      w: 1.9,
      d: 1.9,
      type: l === "Shift" ? "checkpoint" : "normal",
    };
    if (i % 5 === 3) k.move = { axis: "y", amp: 0.6, speed: 2.2, phase: i };
    keys.push(k);
  });
  keys.push(goal(0, (labels.length + 1) * 0.8));
  return keys;
}

export const LEVELS: LevelDef[] = [
  { id: 1, name: "QWERTY 산책", desc: "한 줄로 놓인 키를 건너 Enter까지!", color: "#8ecbff", keys: level1() },
  { id: 2, name: "ASDF 지그재그", desc: "좌우로 엇갈린 키를 뛰어넘자", color: "#a5f0b5", keys: level2() },
  { id: 3, name: "숫자 계단", desc: "1부터 =까지 점점 높아지는 계단", color: "#ffd38a", keys: level3() },
  { id: 4, name: "움직이는 키", desc: "눌리고 미끄러지는 키보드", color: "#ff9fc8", keys: level4() },
  { id: 5, name: "F키 지옥", desc: "작은 F키와 움직이는 스페이스바", color: "#c7a6ff", keys: level5() },
  { id: 6, name: "특수키 나선탑", desc: "빙글빙글 올라가 꼭대기 Enter로", color: "#ff8f7a", keys: level6() },
];
