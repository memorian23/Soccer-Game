import type { Engine, GameAPI } from "../core/types";
import { TOP, circle, rect, text } from "./util";

function boardLayout(api: GameAPI, n: number) {
  const cell = Math.floor((api.H - TOP - 40) / n);
  const ox = Math.floor((api.W - cell * n) / 2);
  const oy = TOP + 20;
  const at = (x: number, y: number) => {
    const c = Math.floor((x - ox) / cell);
    const r = Math.floor((y - oy) / cell);
    return c >= 0 && r >= 0 && c < n && r < n ? r * n + c : -1;
  };
  return { cell, ox, oy, at };
}

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winner3 = (b: number[]) => {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every((v) => v) ? 3 : 0;
};
function minimax(b: number[], turn: number): number {
  const w = winner3(b);
  if (w === 2) return 1;
  if (w === 1) return -1;
  if (w === 3) return 0;
  let best = turn === 2 ? -2 : 2;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = turn;
    const s = minimax(b, 3 - turn);
    b[i] = 0;
    best = turn === 2 ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}

const tictactoe: Engine = {
  id: "tictactoe",
  name: "삼목 대결",
  icon: "⭕",
  category: "보드",
  desc: "컴퓨터와 3×3 판에서 먼저 한 줄을 만드세요. 이기면 100점, 비기면 30점.",
  controls: "마우스 클릭",
  create(api) {
    const { p } = api;
    const L = boardLayout(api, 3);
    // 속도 배율이 높을수록 AI가 완벽하게 둠
    const smart = Math.min(0.95, 0.35 + (p.speed - 0.6) * 0.5);
    let b = Array(9).fill(0);
    let wait = 0;
    let msg = "";
    let starter = 1;
    const aiMove = () => {
      const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      let pick = free[api.randInt(0, free.length - 1)];
      if (api.rand() < smart) {
        let best = -3;
        for (const i of free) {
          b[i] = 2;
          const s = minimax(b, 1);
          b[i] = 0;
          if (s > best) {
            best = s;
            pick = i;
          }
        }
      }
      b[pick] = 2;
    };
    const reset = () => {
      b = Array(9).fill(0);
      msg = "";
      starter = 3 - starter;
      if (starter === 2) aiMove();
    };
    const check = () => {
      const w = winner3(b);
      if (!w) return false;
      wait = 1.2;
      if (w === 1) { msg = "승리!"; api.addScore(100); }
      else if (w === 3) { msg = "무승부"; api.addScore(30); }
      else { msg = "패배"; api.fail(); }
      return true;
    };
    reset();
    return {
      onPointerDown(x, y) {
        if (wait > 0) return;
        const i = L.at(x, y);
        if (i < 0 || b[i]) return;
        b[i] = 1;
        api.sfx("click");
        if (check()) return;
        aiMove();
        check();
      },
      update(dt) {
        if (wait > 0) {
          wait -= dt;
          if (wait <= 0) reset();
        }
      },
      draw(g) {
        for (let k = 1; k < 3; k++) {
          rect(g, L.ox + k * L.cell - 2, L.oy, 4, L.cell * 3, p.theme.fg);
          rect(g, L.ox, L.oy + k * L.cell - 2, L.cell * 3, 4, p.theme.fg);
        }
        b.forEach((v, i) => {
          const cx = L.ox + (i % 3) * L.cell + L.cell / 2;
          const cy = L.oy + Math.floor(i / 3) * L.cell + L.cell / 2;
          if (v === 1) {
            circle(g, cx, cy, L.cell * 0.32, p.theme.accent);
            circle(g, cx, cy, L.cell * 0.22, p.theme.bg);
          } else if (v === 2) text(g, "✕", cx, cy, p.theme.danger, L.cell * 0.7);
        });
        if (msg) text(g, msg, api.W / 2, api.H / 2, p.theme.accent2, 64);
      },
    };
  },
};

const gomoku: Engine = {
  id: "gomoku",
  name: "오목",
  icon: "⚫",
  category: "보드",
  desc: "컴퓨터보다 먼저 가로·세로·대각선으로 돌 5개를 이으세요. 당신은 흑돌(선공).",
  controls: "마우스 클릭",
  create(api) {
    const { p } = api;
    const n = p.size < 0.9 ? 9 : p.size > 1.1 ? 15 : 13;
    const L = boardLayout(api, n);
    let b: number[] = [];
    let wait = 0;
    let msg = "";
    let lastAi = -1;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    const lineLen = (i: number, who: number, dx: number, dy: number) => {
      const c = i % n;
      const r = Math.floor(i / n);
      let len = 1;
      let open = 0;
      for (const s of [1, -1]) {
        let k = 1;
        while (true) {
          const x = c + dx * k * s;
          const y = r + dy * k * s;
          if (x < 0 || y < 0 || x >= n || y >= n) break;
          const v = b[y * n + x];
          if (v === who) { len++; k++; continue; }
          if (v === 0) open++;
          break;
        }
      }
      return { len, open };
    };
    const wins = (i: number, who: number) => dirs.some(([dx, dy]) => lineLen(i, who, dx, dy).len >= 5);
    const evalCell = (i: number, who: number) => {
      let s = 0;
      for (const [dx, dy] of dirs) {
        const { len, open } = lineLen(i, who, dx, dy);
        if (len >= 5) s += 100000;
        else s += Math.pow(10, len) * (open + 0.5);
      }
      return s;
    };
    const aiMove = () => {
      let best = -1;
      let bestS = -1;
      const aggression = 0.8 + p.speed * 0.3; // 공격 vs 수비 가중치
      for (let i = 0; i < n * n; i++) {
        if (b[i]) continue;
        b[i] = 2;
        const atk = evalCell(i, 2);
        b[i] = 1;
        const def = evalCell(i, 1);
        b[i] = 0;
        const c = i % n - n / 2;
        const r = Math.floor(i / n) - n / 2;
        const s = atk * aggression + def + api.rand() * (12 / p.speed) - Math.hypot(c, r) * 0.1;
        if (s > bestS) {
          bestS = s;
          best = i;
        }
      }
      if (best >= 0) {
        b[best] = 2;
        lastAi = best;
        if (wins(best, 2)) {
          msg = "패배";
          wait = 2;
          api.fail();
        }
      }
    };
    const reset = () => {
      b = Array(n * n).fill(0);
      msg = "";
      lastAi = -1;
    };
    reset();
    return {
      onPointerDown(x, y) {
        if (wait > 0) return;
        const i = L.at(x, y);
        if (i < 0 || b[i]) return;
        b[i] = 1;
        api.sfx("click");
        if (wins(i, 1)) {
          msg = "승리!";
          wait = 2;
          api.addScore(300);
          return;
        }
        if (b.every((v) => v)) {
          msg = "무승부";
          wait = 2;
          api.addScore(50);
          return;
        }
        aiMove();
      },
      update(dt) {
        if (wait > 0) {
          wait -= dt;
          if (wait <= 0) reset();
        }
      },
      draw(g) {
        rect(g, L.ox, L.oy, L.cell * n, L.cell * n, "#d9a75f");
        g.strokeStyle = "#5a3d14";
        g.lineWidth = 1;
        g.beginPath();
        for (let k = 0; k < n; k++) {
          const o = L.cell / 2 + k * L.cell;
          g.moveTo(L.ox + L.cell / 2, L.oy + o);
          g.lineTo(L.ox + L.cell * n - L.cell / 2, L.oy + o);
          g.moveTo(L.ox + o, L.oy + L.cell / 2);
          g.lineTo(L.ox + o, L.oy + L.cell * n - L.cell / 2);
        }
        g.stroke();
        b.forEach((v, i) => {
          if (!v) return;
          const cx = L.ox + (i % n) * L.cell + L.cell / 2;
          const cy = L.oy + Math.floor(i / n) * L.cell + L.cell / 2;
          circle(g, cx, cy, L.cell * 0.42, v === 1 ? "#111" : "#f4f4f4");
          if (i === lastAi) circle(g, cx, cy, L.cell * 0.1, "#e74c3c");
        });
        if (msg) text(g, msg, api.W / 2, api.H / 2, p.theme.accent2, 64);
      },
    };
  },
};

export const BOARD = [tictactoe, gomoku];
