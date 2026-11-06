import type { Engine, GameAPI } from "../core/types";
import { TOP, circle, rect, rrect, shuffle, text } from "./util";

/** 보드형 게임 공용 레이아웃: cols×rows 칸을 화면 중앙에 배치 */
function grid(api: GameAPI, cols: number, rows: number, pad = 20) {
  const cell = Math.floor(Math.min((api.W - pad * 2) / cols, (api.H - TOP - pad * 2) / rows));
  const ox = Math.floor((api.W - cell * cols) / 2);
  const oy = Math.floor(TOP + (api.H - TOP - cell * rows) / 2);
  const at = (x: number, y: number) => {
    const c = Math.floor((x - ox) / cell);
    const r = Math.floor((y - oy) / cell);
    return c >= 0 && r >= 0 && c < cols && r < rows ? { c, r } : null;
  };
  return { cell, ox, oy, at };
}

const memory: Engine = {
  id: "memory",
  name: "카드 짝맞추기",
  icon: "🃏",
  category: "퍼즐",
  desc: "카드를 두 장씩 뒤집어 같은 그림을 찾으세요. 4번 틀릴 때마다 목숨 하나를 잃습니다.",
  controls: "마우스 클릭",
  create(api) {
    const { p } = api;
    const [cols, rows] = p.size < 0.9 ? [4, 3] : p.size > 1.1 ? [6, 4] : [4, 4];
    const L = grid(api, cols, rows);
    const pool = Array.from("🍎🐶🚗⚽🌙🎸🌵🍩🐙🎈🦊🍀");
    let cards: { e: string; open: boolean; done: boolean }[] = [];
    let sel: number[] = [];
    let hide = 0;
    let wrong = 0;
    const deal = () => {
      const picks = shuffle(pool.slice(), api.rand).slice(0, (cols * rows) / 2);
      cards = shuffle([...picks, ...picks], api.rand).map((e) => ({ e, open: false, done: false }));
      sel = [];
    };
    deal();
    return {
      onLifeLost() {
        wrong = 0;
      },
      onPointerDown(x, y) {
        if (hide > 0) return;
        const c = L.at(x, y);
        if (!c) return;
        const i = c.r * cols + c.c;
        const card = cards[i];
        if (card.open || card.done) return;
        card.open = true;
        api.sfx("click");
        sel.push(i);
        if (sel.length === 2) {
          const [a, b] = sel;
          if (cards[a].e === cards[b].e) {
            cards[a].done = cards[b].done = true;
            sel = [];
            api.addScore(20);
            if (cards.every((k) => k.done)) {
              api.addScore(100);
              setTimeout(deal, 400);
            }
          } else {
            hide = 0.8 / p.speed;
            wrong++;
            if (wrong >= 4) {
              wrong = 0;
              api.fail();
            }
          }
        }
      },
      update(dt) {
        if (hide > 0) {
          hide -= dt;
          if (hide <= 0) {
            sel.forEach((i) => (cards[i].open = false));
            sel = [];
          }
        }
      },
      draw(g) {
        cards.forEach((k, i) => {
          const x = L.ox + (i % cols) * L.cell + 6;
          const y = L.oy + Math.floor(i / cols) * L.cell + 6;
          const s = L.cell - 12;
          rrect(g, x, y, s, s, 10, k.done ? p.theme.muted : k.open ? p.theme.fg : p.theme.accent);
          if (k.open || k.done) text(g, k.e, x + s / 2, y + s / 2, "#000", s * 0.5);
        });
        text(g, `실수 ${wrong}/4`, api.W - 60, api.H - 12, p.theme.fg, 14);
      },
    };
  },
};

const sliding: Engine = {
  id: "sliding",
  name: "숫자 슬라이드",
  icon: "🔢",
  category: "퍼즐",
  desc: "빈칸으로 타일을 밀어 1부터 순서대로 정렬하세요. 빨리 풀수록 고득점.",
  controls: "타일 클릭 / 방향키",
  create(api) {
    const { p } = api;
    const n = p.size < 0.9 ? 3 : p.size > 1.1 ? 4 : 3 + (p.speed > 1.2 ? 1 : 0);
    const L = grid(api, n, n, 60);
    let tiles: number[] = [];
    let t0 = 0;
    const solved = () => tiles.every((v, i) => v === (i + 1) % (n * n));
    const swap = (i: number, j: number) => ([tiles[i], tiles[j]] = [tiles[j], tiles[i]]);
    const deal = () => {
      tiles = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
      // 풀 수 있는 배치를 보장하기 위해 랜덤 이동으로 섞는다
      let e = n * n - 1;
      let prev = -1;
      for (let k = 0; k < 60 * n * p.speed; k++) {
        const opts = [e - n, e + n, e % n ? e - 1 : -1, e % n < n - 1 ? e + 1 : -1].filter((v) => v >= 0 && v < n * n && v !== prev);
        const t = opts[api.randInt(0, opts.length - 1)];
        swap(e, t);
        prev = e;
        e = t;
      }
      if (solved()) deal();
      t0 = api.elapsed;
    };
    deal();
    const tryMove = (i: number) => {
      const e = tiles.indexOf(0);
      const adj = (Math.abs(i - e) === 1 && Math.floor(i / n) === Math.floor(e / n)) || Math.abs(i - e) === n;
      if (!adj) return;
      swap(i, e);
      api.sfx("click");
      if (solved()) {
        api.addScore(Math.max(50, 300 - Math.floor(api.elapsed - t0) * 2));
        deal();
      }
    };
    return {
      onPointerDown(x, y) {
        const c = L.at(x, y);
        if (c) tryMove(c.r * n + c.c);
      },
      onKeyDown(k) {
        const e = tiles.indexOf(0);
        const m: Record<string, number> = { ArrowUp: e + n, ArrowDown: e - n, ArrowLeft: e % n < n - 1 ? e + 1 : -1, ArrowRight: e % n ? e - 1 : -1 };
        const t = m[k];
        if (t !== undefined && t >= 0 && t < n * n) tryMove(t);
      },
      update() {},
      draw(g) {
        tiles.forEach((v, i) => {
          if (!v) return;
          const x = L.ox + (i % n) * L.cell + 4;
          const y = L.oy + Math.floor(i / n) * L.cell + 4;
          const ok = v === i + 1;
          rrect(g, x, y, L.cell - 8, L.cell - 8, 12, ok ? p.theme.accent2 : p.theme.accent);
          text(g, String(v), x + (L.cell - 8) / 2, y + (L.cell - 8) / 2, p.theme.bg, L.cell * 0.4);
        });
      },
    };
  },
};

const mines: Engine = {
  id: "mines",
  name: "지뢰 탐색",
  icon: "💣",
  category: "퍼즐",
  desc: "숫자 힌트로 지뢰를 피해 모든 칸을 여세요. 우클릭(또는 F키 모드)으로 깃발.",
  controls: "좌클릭 열기, 우클릭 깃발, F 깃발 모드 전환",
  create(api) {
    const { p } = api;
    const cols = Math.round(12 * p.size);
    const rows = Math.round(8 * p.size);
    const L = grid(api, cols, rows);
    const count = Math.round(cols * rows * (0.1 + 0.05 * p.speed));
    type C = { mine: boolean; open: boolean; flag: boolean; n: number };
    let cells: C[] = [];
    let first = true;
    let flagMode = false;
    const nb = (i: number) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const out: number[] = [];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = c + dx;
          const y = r + dy;
          if ((dx || dy) && x >= 0 && y >= 0 && x < cols && y < rows) out.push(y * cols + x);
        }
      return out;
    };
    const deal = () => {
      cells = Array.from({ length: cols * rows }, () => ({ mine: false, open: false, flag: false, n: 0 }));
      first = true;
    };
    const plant = (safe: number) => {
      const forbidden = new Set([safe, ...nb(safe)]);
      let k = 0;
      while (k < count) {
        const i = api.randInt(0, cells.length - 1);
        if (!cells[i].mine && !forbidden.has(i)) {
          cells[i].mine = true;
          k++;
        }
      }
      cells.forEach((c, i) => (c.n = nb(i).filter((j) => cells[j].mine).length));
    };
    const open = (i: number) => {
      const stackArr = [i];
      while (stackArr.length) {
        const j = stackArr.pop()!;
        const c = cells[j];
        if (c.open || c.flag) continue;
        c.open = true;
        if (c.n === 0 && !c.mine) stackArr.push(...nb(j));
      }
    };
    deal();
    return {
      onLifeLost: deal,
      onKeyDown(k) {
        if (k === "f") flagMode = !flagMode;
      },
      onPointerDown(x, y, button) {
        const c = L.at(x, y);
        if (!c) return;
        const i = c.r * cols + c.c;
        const cell = cells[i];
        if (cell.open) return;
        if (button === 2 || flagMode) {
          cell.flag = !cell.flag;
          api.sfx("click");
          return;
        }
        if (cell.flag) return;
        if (first) {
          plant(i);
          first = false;
        }
        if (cell.mine) {
          cell.open = true;
          api.fail();
          return;
        }
        const before = cells.filter((k) => k.open).length;
        open(i);
        api.addScore(cells.filter((k) => k.open).length - before, true);
        api.sfx("click");
        if (cells.every((k) => k.open || k.mine)) {
          api.addScore(200);
          deal();
        }
      },
      update() {},
      draw(g) {
        const colors = ["", "#4aa3ff", "#3ecf6e", "#ff6b6b", "#b57bff", "#ff9f43", "#1dd1a1", "#ddd", "#999"];
        cells.forEach((c, i) => {
          const x = L.ox + (i % cols) * L.cell;
          const y = L.oy + Math.floor(i / cols) * L.cell;
          rect(g, x + 1, y + 1, L.cell - 2, L.cell - 2, c.open ? p.theme.muted : p.theme.accent);
          if (c.open && c.mine) text(g, "💥", x + L.cell / 2, y + L.cell / 2, "#000", L.cell * 0.6);
          else if (c.open && c.n) text(g, String(c.n), x + L.cell / 2, y + L.cell / 2, colors[c.n], L.cell * 0.55);
          else if (c.flag) text(g, "🚩", x + L.cell / 2, y + L.cell / 2, "#000", L.cell * 0.55);
        });
        text(g, flagMode ? "깃발 모드 (F)" : "열기 모드 (F로 전환)", api.W / 2, api.H - 10, p.theme.fg, 13);
      },
    };
  },
};

const lights: Engine = {
  id: "lights",
  name: "불 끄기 퍼즐",
  icon: "💡",
  category: "퍼즐",
  desc: "칸을 누르면 자신과 상하좌우가 함께 뒤집힙니다. 모든 불을 끄세요.",
  controls: "마우스 클릭",
  create(api) {
    const { p } = api;
    const n = p.size < 0.9 ? 4 : p.size > 1.1 ? 6 : 5;
    const L = grid(api, n, n, 50);
    let on: boolean[] = [];
    let moves = 0;
    const toggle = (i: number) => {
      const c = i % n;
      const r = Math.floor(i / n);
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = c + dx;
        const y = r + dy;
        if (x >= 0 && y >= 0 && x < n && y < n) on[y * n + x] = !on[y * n + x];
      }
    };
    const deal = () => {
      on = Array(n * n).fill(false);
      const k = Math.round(4 + p.speed * 4);
      for (let j = 0; j < k; j++) toggle(api.randInt(0, n * n - 1));
      if (on.every((v) => !v)) toggle(0);
      moves = 0;
    };
    deal();
    return {
      onPointerDown(x, y) {
        const c = L.at(x, y);
        if (!c) return;
        toggle(c.r * n + c.c);
        moves++;
        api.sfx("click");
        if (on.every((v) => !v)) {
          api.addScore(Math.max(30, 200 - moves * 5));
          deal();
        }
      },
      update() {},
      draw(g) {
        on.forEach((v, i) => {
          const x = L.ox + (i % n) * L.cell + 5;
          const y = L.oy + Math.floor(i / n) * L.cell + 5;
          rrect(g, x, y, L.cell - 10, L.cell - 10, 12, v ? "#ffd84d" : p.theme.muted);
        });
        text(g, `이동 ${moves}`, api.W / 2, api.H - 12, p.theme.fg, 14);
      },
    };
  },
};

const maze: Engine = {
  id: "maze",
  name: "미로 탈출",
  icon: "🌀",
  category: "퍼즐",
  desc: "제한 시간 안에 미로의 출구(★)에 도착하세요. 탈출할수록 미로가 커집니다.",
  controls: "방향키 / WASD",
  create(api) {
    const { p } = api;
    let level = 0;
    let cols = 0;
    let rows = 0;
    let walls: number[] = []; // 비트: 1=위 2=오른쪽 4=아래 8=왼쪽
    let pos = 0;
    let limit = 0;
    let t = 0;
    let L = grid(api, 1, 1);
    const build = () => {
      cols = Math.round((8 + level * 2) * p.size);
      rows = Math.round(cols * 0.65);
      L = grid(api, cols, rows);
      walls = Array(cols * rows).fill(15);
      const seen = new Set([0]);
      const st = [0];
      while (st.length) {
        const cur = st[st.length - 1];
        const c = cur % cols;
        const r = Math.floor(cur / cols);
        const opts: [number, number, number][] = [];
        if (r > 0) opts.push([cur - cols, 1, 4]);
        if (c < cols - 1) opts.push([cur + 1, 2, 8]);
        if (r < rows - 1) opts.push([cur + cols, 4, 1]);
        if (c > 0) opts.push([cur - 1, 8, 2]);
        const free = opts.filter((o) => !seen.has(o[0]));
        if (!free.length) {
          st.pop();
          continue;
        }
        const [nx, a, b] = free[api.randInt(0, free.length - 1)];
        walls[cur] &= ~a;
        walls[nx] &= ~b;
        seen.add(nx);
        st.push(nx);
      }
      pos = 0;
      t = 0;
      limit = (cols * rows * 0.25) / p.speed + 8;
    };
    build();
    return {
      onLifeLost() {
        t = 0;
        pos = 0;
      },
      onKeyDown(k) {
        const m: Record<string, [number, number]> = {
          ArrowUp: [1, -cols], w: [1, -cols], ArrowRight: [2, 1], d: [2, 1],
          ArrowDown: [4, cols], s: [4, cols], ArrowLeft: [8, -1], a: [8, -1],
        };
        const mv = m[k];
        if (mv && !(walls[pos] & mv[0])) {
          pos += mv[1];
          if (pos === cols * rows - 1) {
            api.addScore(50 + level * 25 + Math.floor(limit - t));
            level++;
            build();
          }
        }
      },
      update(dt) {
        t += dt;
        if (t > limit) api.fail();
      },
      draw(g) {
        g.strokeStyle = p.theme.fg;
        g.lineWidth = 2;
        g.beginPath();
        walls.forEach((w, i) => {
          const x = L.ox + (i % cols) * L.cell;
          const y = L.oy + Math.floor(i / cols) * L.cell;
          const s = L.cell;
          if (w & 1) { g.moveTo(x, y); g.lineTo(x + s, y); }
          if (w & 2) { g.moveTo(x + s, y); g.lineTo(x + s, y + s); }
          if (w & 4) { g.moveTo(x, y + s); g.lineTo(x + s, y + s); }
          if (w & 8) { g.moveTo(x, y); g.lineTo(x, y + s); }
        });
        g.stroke();
        const ex = L.ox + (cols - 1) * L.cell + L.cell / 2;
        const ey = L.oy + (rows - 1) * L.cell + L.cell / 2;
        text(g, "★", ex, ey, p.theme.accent2, L.cell * 0.8);
        circle(g, L.ox + (pos % cols) * L.cell + L.cell / 2, L.oy + Math.floor(pos / cols) * L.cell + L.cell / 2, L.cell * 0.3, p.theme.accent);
        text(g, `남은 시간 ${Math.max(0, Math.ceil(limit - t))}초 · 미로 ${level + 1}`, api.W / 2, api.H - 8, p.theme.fg, 13);
      },
    };
  },
};

const order: Engine = {
  id: "order",
  name: "숫자 순서 터치",
  icon: "🔟",
  category: "퍼즐",
  desc: "흩어진 숫자를 1부터 순서대로 빠르게 누르세요. 틀리면 실패!",
  controls: "마우스 클릭",
  create(api) {
    const { p, W, H } = api;
    let round = 0;
    let nums: { x: number; y: number; v: number }[] = [];
    let nextV = 1;
    const r = 26 * p.size;
    const deal = () => {
      round++;
      const n = Math.min(25, 5 + round * 2);
      nums = [];
      for (let v = 1; v <= n; v++) {
        let x = 0;
        let y = 0;
        let tries = 0;
        do {
          x = r + api.rand() * (W - 2 * r);
          y = TOP + r + api.rand() * (H - TOP - 2 * r);
          tries++;
        } while (tries < 100 && nums.some((q) => Math.hypot(q.x - x, q.y - y) < r * 2.2));
        nums.push({ x, y, v });
      }
      nextV = 1;
    };
    deal();
    return {
      onLifeLost() {
        round--;
        deal();
      },
      onPointerDown(x, y) {
        const hit = nums.find((q) => Math.hypot(q.x - x, q.y - y) < r);
        if (!hit) return;
        if (hit.v === nextV) {
          nums = nums.filter((q) => q !== hit);
          nextV++;
          api.addScore(5, true);
          api.sfx("click");
          if (!nums.length) {
            api.addScore(20 * round);
            deal();
          }
        } else api.fail();
      },
      update(dt) {
        // 숫자들이 천천히 떠다님 (속도 배율이 높을수록 빠름)
        if (p.speed > 1) for (const q of nums) {
          q.x += Math.sin(api.elapsed + q.v) * 20 * (p.speed - 1) * dt;
          q.y += Math.cos(api.elapsed * 1.3 + q.v) * 20 * (p.speed - 1) * dt;
        }
      },
      draw(g) {
        for (const q of nums) {
          circle(g, q.x, q.y, r, p.theme.accent);
          text(g, String(q.v), q.x, q.y, p.theme.bg, r * 0.9);
        }
      },
    };
  },
};

export const PUZZLE = [memory, sliding, mines, lights, maze, order];
