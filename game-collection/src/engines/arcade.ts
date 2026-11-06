import type { Engine } from "../core/types";
import { TOP, axisX, axisY, circle, clamp, rect, rrect, text, dist } from "./util";

/** 키보드 또는 마우스로 x좌표를 조종하는 공용 헬퍼 */
function horizontalControl(api: Parameters<Engine["create"]>[0], speed = 520) {
  let mouse = false;
  let last = api.pointer.x;
  return (x: number, dt: number) => {
    const ax = axisX(api.keys);
    if (ax) mouse = false;
    if (api.pointer.x !== last) mouse = true;
    last = api.pointer.x;
    return mouse ? api.pointer.x : x + ax * speed * dt;
  };
}

const bricks: Engine = {
  id: "bricks",
  name: "벽돌 부수기",
  icon: "🧱",
  category: "아케이드",
  desc: "공을 튕겨 모든 벽돌을 부수세요. 공을 놓치면 실패.",
  controls: "← → / 마우스, 스페이스·클릭으로 발사",
  create(api) {
    const { p, W, H } = api;
    const ctrl = horizontalControl(api, 600);
    const pw = 110 * p.size;
    const br = 8 * p.size;
    let px = W / 2;
    let ball = { x: 0, y: 0, vx: 0, vy: 0, stuck: true };
    let blocks: { x: number; y: number; w: number; h: number; hp: number }[] = [];
    let level = 0;
    const build = () => {
      level++;
      blocks = [];
      const cols = Math.round(10 / p.size);
      const rows = Math.min(8, 3 + level);
      const bw = (W - 40) / cols;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (api.rand() > 0.12) blocks.push({ x: 20 + c * bw, y: TOP + 40 + r * 24, w: bw - 4, h: 20, hp: api.rand() < 0.15 * level ? 2 : 1 });
    };
    const serve = () => (ball = { x: px, y: H - 60, vx: 0, vy: 0, stuck: true });
    const launch = () => {
      if (!ball.stuck) return;
      const s = 380 * p.speed * (1 + level * 0.05);
      ball.vx = (api.rand() - 0.5) * s;
      ball.vy = -s;
      ball.stuck = false;
    };
    build();
    serve();
    return {
      onKeyDown(k) {
        if (k === " ") launch();
      },
      onPointerDown: launch,
      onLifeLost: serve,
      update(dt) {
        px = clamp(ctrl(px, dt), pw / 2, W - pw / 2);
        if (ball.stuck) {
          ball.x = px;
          return;
        }
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x < br || ball.x > W - br) {
          ball.vx *= -1;
          ball.x = clamp(ball.x, br, W - br);
        }
        if (ball.y < TOP + br) {
          ball.vy = Math.abs(ball.vy);
        }
        if (ball.vy > 0 && ball.y + br > H - 50 && ball.y < H - 36 && Math.abs(ball.x - px) < pw / 2 + br) {
          const sp = Math.hypot(ball.vx, ball.vy) * 1.01;
          const a = ((ball.x - px) / (pw / 2)) * 1.1;
          ball.vx = Math.sin(a) * sp;
          ball.vy = -Math.cos(a) * sp;
          api.sfx("hit");
        }
        for (const b of blocks) {
          if (b.hp > 0 && ball.x + br > b.x && ball.x - br < b.x + b.w && ball.y + br > b.y && ball.y - br < b.y + b.h) {
            b.hp--;
            const ox = Math.min(ball.x + br - b.x, b.x + b.w - (ball.x - br));
            const oy = Math.min(ball.y + br - b.y, b.y + b.h - (ball.y - br));
            if (ox < oy) ball.vx *= -1;
            else ball.vy *= -1;
            if (b.hp === 0) api.addScore(10);
            else api.sfx("hit");
            break;
          }
        }
        blocks = blocks.filter((b) => b.hp > 0);
        if (!blocks.length) {
          api.addScore(100);
          build();
          serve();
        }
        if (ball.y > H + 20) api.fail();
      },
      draw(g) {
        for (const b of blocks) rrect(g, b.x, b.y, b.w, b.h, 4, b.hp > 1 ? p.theme.accent2 : p.theme.accent);
        rrect(g, px - pw / 2, H - 50, pw, 12, 6, p.theme.fg);
        circle(g, ball.x, ball.y, br, p.theme.danger);
        if (ball.stuck) text(g, "스페이스 / 클릭으로 발사", W / 2, H / 2 + 60, p.theme.fg, 18);
      },
    };
  },
};

const duel: Engine = {
  id: "duel",
  name: "패들 결투",
  icon: "🏓",
  category: "아케이드",
  desc: "컴퓨터와 공을 주고받는 1:1 패들 대결. 상대가 놓치면 득점!",
  controls: "↑ ↓ / 마우스",
  create(api) {
    const { p, W, H } = api;
    const ph = 100 * p.size;
    const br = 9 * p.size;
    let py = H / 2;
    let ay = H / 2;
    let mouse = false;
    let lastY = api.pointer.y;
    let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    let wait = 1;
    const serve = () => {
      ball = { x: W / 2, y: (TOP + H) / 2, vx: 0, vy: 0 };
      wait = 1;
    };
    serve();
    return {
      onLifeLost: serve,
      update(dt) {
        const ay2 = axisY(api.keys);
        if (ay2) mouse = false;
        if (api.pointer.y !== lastY) mouse = true;
        lastY = api.pointer.y;
        py = mouse ? api.pointer.y : py + ay2 * 480 * dt;
        py = clamp(py, TOP + ph / 2, H - ph / 2);
        // AI: 속도가 빠를수록 반응도 좋아짐
        const aiSpeed = 220 + 140 * p.speed;
        ay += clamp(ball.y - ay, -aiSpeed * dt, aiSpeed * dt);
        ay = clamp(ay, TOP + ph / 2, H - ph / 2);
        if (wait > 0) {
          wait -= dt;
          if (wait <= 0) {
            const s = 340 * p.speed;
            ball.vx = (api.rand() < 0.5 ? -1 : 1) * s;
            ball.vy = (api.rand() - 0.5) * s;
          }
          return;
        }
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.y < TOP + br || ball.y > H - br) {
          ball.vy *= -1;
          ball.y = clamp(ball.y, TOP + br, H - br);
        }
        const hit = (padY: number, dirX: number) => {
          const sp = Math.min(1100, Math.hypot(ball.vx, ball.vy) * 1.06);
          const a = ((ball.y - padY) / (ph / 2)) * 0.9;
          ball.vx = dirX * Math.cos(a) * sp;
          ball.vy = Math.sin(a) * sp;
          api.sfx("hit");
        };
        if (ball.vx < 0 && ball.x - br < 40 && ball.x > 20 && Math.abs(ball.y - py) < ph / 2 + br) hit(py, 1);
        if (ball.vx > 0 && ball.x + br > W - 40 && ball.x < W - 20 && Math.abs(ball.y - ay) < ph / 2 + br) hit(ay, -1);
        if (ball.x < -20) api.fail();
        if (ball.x > W + 20) {
          api.addScore(10);
          serve();
        }
      },
      draw(g) {
        for (let y = TOP; y < H; y += 30) rect(g, W / 2 - 2, y, 4, 15, p.theme.muted);
        rrect(g, 25, py - ph / 2, 14, ph, 6, p.theme.accent);
        rrect(g, W - 39, ay - ph / 2, 14, ph, 6, p.theme.danger);
        circle(g, ball.x, ball.y, br, p.theme.fg);
      },
    };
  },
};

const catcher: Engine = {
  id: "catcher",
  name: "과일 받기",
  icon: "🧺",
  category: "아케이드",
  desc: "바구니로 과일을 받으세요. 폭탄을 받으면 실패!",
  controls: "← → / 마우스",
  create(api) {
    const { p, W, H } = api;
    const ctrl = horizontalControl(api);
    const bw = 90 * p.size;
    let x = W / 2;
    let items: { x: number; y: number; v: number; bomb: boolean; e: string }[] = [];
    let spawn = 0;
    const fruits = ["🍎", "🍊", "🍇", "🍓", "🍌", "🍉", "🍑"];
    return {
      onLifeLost() {
        items = [];
      },
      update(dt) {
        x = clamp(ctrl(x, dt), bw / 2, W - bw / 2);
        spawn -= dt;
        const lvl = 1 + api.elapsed / 30;
        if (spawn <= 0) {
          spawn = 0.7 / (p.speed * lvl);
          const bomb = api.rand() < 0.22;
          items.push({ x: 30 + api.rand() * (W - 60), y: TOP, v: (160 + api.rand() * 120) * p.speed * lvl, bomb, e: bomb ? "💣" : fruits[api.randInt(0, fruits.length - 1)] });
        }
        for (const it of items) {
          it.y += it.v * dt;
          if (it.y > H - 70 && it.y < H - 40 && Math.abs(it.x - x) < bw / 2) {
            it.y = H + 100;
            if (it.bomb) {
              api.fail();
              return;
            }
            api.addScore(10);
          }
        }
        items = items.filter((i) => i.y < H + 50);
      },
      draw(g) {
        g.font = `${Math.round(32 * p.size)}px system-ui`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        for (const it of items) g.fillText(it.e, it.x, it.y);
        rrect(g, x - bw / 2, H - 55, bw, 30, 8, p.theme.accent);
        rect(g, x - bw / 2 + 6, H - 50, bw - 12, 4, p.theme.bg);
      },
    };
  },
};

const mole: Engine = {
  id: "mole",
  name: "두더지 잡기",
  icon: "🔨",
  category: "아케이드",
  desc: "구멍에서 튀어나온 두더지를 재빨리 클릭! 3마리 놓치면 목숨 하나를 잃습니다.",
  controls: "마우스 클릭 / 숫자키 1~9",
  create(api) {
    const { p, W, H } = api;
    const n = p.size > 1.1 ? 4 : 3;
    const cell = Math.min(W, H - TOP - 40) / n;
    const ox = (W - cell * n) / 2;
    const oy = TOP + 30;
    const holes = Array.from({ length: n * n }, () => ({ t: 0, up: false, gold: false }));
    let spawn = 0.5;
    let escaped = 0;
    const whack = (i: number) => {
      const h = holes[i];
      if (h?.up) {
        h.up = false;
        api.addScore(h.gold ? 30 : 10);
        api.sfx("hit");
      }
    };
    return {
      onPointerDown(x, y) {
        const c = Math.floor((x - ox) / cell);
        const r = Math.floor((y - oy) / cell);
        if (c >= 0 && r >= 0 && c < n && r < n) whack(r * n + c);
      },
      onKeyDown(k) {
        if (n === 3 && /^[1-9]$/.test(k)) {
          const i = Number(k) - 1;
          // 숫자패드 배치(7 8 9 위)
          whack((2 - Math.floor(i / 3)) * 3 + (i % 3));
        }
      },
      onLifeLost() {
        escaped = 0;
      },
      update(dt) {
        spawn -= dt;
        const lvl = 1 + api.elapsed / 30;
        if (spawn <= 0) {
          spawn = (0.9 / p.speed) / lvl;
          const free = holes.filter((h) => !h.up);
          if (free.length) {
            const h = free[api.randInt(0, free.length - 1)];
            h.up = true;
            h.gold = api.rand() < 0.1;
            h.t = (1.4 / p.speed) / Math.sqrt(lvl);
          }
        }
        for (const h of holes) {
          if (!h.up) continue;
          h.t -= dt;
          if (h.t <= 0) {
            h.up = false;
            escaped++;
            if (escaped >= 3) {
              escaped = 0;
              api.fail();
            }
          }
        }
      },
      draw(g) {
        holes.forEach((h, i) => {
          const cx = ox + (i % n) * cell + cell / 2;
          const cy = oy + Math.floor(i / n) * cell + cell / 2;
          g.fillStyle = p.theme.muted;
          g.beginPath();
          g.ellipse(cx, cy + cell * 0.2, cell * 0.38, cell * 0.14, 0, 0, Math.PI * 2);
          g.fill();
          if (h.up) {
            circle(g, cx, cy, cell * 0.28, h.gold ? "#f5c542" : p.theme.accent);
            circle(g, cx - cell * 0.09, cy - cell * 0.06, cell * 0.04, p.theme.bg);
            circle(g, cx + cell * 0.09, cy - cell * 0.06, cell * 0.04, p.theme.bg);
            circle(g, cx, cy + cell * 0.04, cell * 0.06, p.theme.danger);
          }
        });
        text(g, `놓침 ${escaped}/3`, W - 60, H - 15, p.theme.fg, 14);
      },
    };
  },
};

const aim: Engine = {
  id: "aim",
  name: "과녁 사격",
  icon: "🎯",
  category: "아케이드",
  desc: "줄어드는 과녁이 사라지기 전에 클릭하세요. 중앙에 가까울수록 고득점!",
  controls: "마우스 클릭",
  create(api) {
    const { p, W, H } = api;
    let targets: { x: number; y: number; r: number; life: number; max: number }[] = [];
    let spawn = 0;
    let pops: { x: number; y: number; t: number; s: string }[] = [];
    return {
      onPointerDown(x, y) {
        for (let i = targets.length - 1; i >= 0; i--) {
          const t = targets[i];
          const r = t.r * (t.life / t.max);
          const d = dist(x, y, t.x, t.y);
          if (d < r) {
            const pts = d < r / 3 ? 30 : d < (2 * r) / 3 ? 20 : 10;
            api.addScore(pts);
            pops.push({ x: t.x, y: t.y, t: 0.6, s: `+${pts}` });
            targets.splice(i, 1);
            return;
          }
        }
        api.sfx("click");
      },
      onLifeLost() {
        targets = [];
      },
      update(dt) {
        spawn -= dt;
        const lvl = 1 + api.elapsed / 25;
        if (spawn <= 0) {
          spawn = (0.9 / p.speed) / lvl;
          const r = (30 + api.rand() * 20) * p.size;
          const life = (2.2 / p.speed) / Math.sqrt(lvl);
          targets.push({ x: r + api.rand() * (W - 2 * r), y: TOP + r + api.rand() * (H - TOP - 2 * r), r, life, max: life });
        }
        for (const t of targets) t.life -= dt;
        if (targets.some((t) => t.life <= 0)) {
          targets = targets.filter((t) => t.life > 0);
          api.fail();
        }
        for (const q of pops) q.t -= dt;
        pops = pops.filter((q) => q.t > 0);
      },
      draw(g) {
        for (const t of targets) {
          const r = t.r * (t.life / t.max);
          circle(g, t.x, t.y, r, p.theme.danger);
          circle(g, t.x, t.y, (r * 2) / 3, p.theme.fg);
          circle(g, t.x, t.y, r / 3, p.theme.danger);
        }
        for (const q of pops) text(g, q.s, q.x, q.y - (0.6 - q.t) * 60, p.theme.accent2, 22);
      },
    };
  },
};

const stack: Engine = {
  id: "stack",
  name: "블록 쌓기",
  icon: "🏗️",
  category: "아케이드",
  desc: "좌우로 움직이는 블록을 타이밍 맞춰 떨어뜨려 높이 쌓으세요. 삐져나온 부분은 잘려나갑니다.",
  controls: "스페이스 / 클릭",
  create(api) {
    const { p, W, H } = api;
    const bh = 24;
    const baseW = 220 * p.size;
    let tower: { x: number; w: number }[] = [];
    let cur = { x: 0, w: baseW, dir: 1 };
    const reset = () => {
      tower = [{ x: (W - baseW) / 2, w: baseW }];
      cur = { x: 0, w: baseW, dir: 1 };
    };
    reset();
    const drop = () => {
      const top = tower[tower.length - 1];
      const l = Math.max(cur.x, top.x);
      const r = Math.min(cur.x + cur.w, top.x + top.w);
      if (r - l <= 2) {
        api.fail();
        return;
      }
      const perfect = Math.abs(cur.x - top.x) < 4;
      const nb = perfect ? { x: top.x, w: top.w } : { x: l, w: r - l };
      tower.push(nb);
      api.addScore(perfect ? 25 : 10);
      cur = { x: tower.length % 2 ? 0 : W - nb.w, w: nb.w, dir: tower.length % 2 ? 1 : -1 };
    };
    return {
      onKeyDown(k) {
        if (k === " ") drop();
      },
      onPointerDown: drop,
      onLifeLost: reset,
      update(dt) {
        const sp = (220 + tower.length * 8) * p.speed;
        cur.x += cur.dir * sp * dt;
        if (cur.x < 0) {
          cur.x = 0;
          cur.dir = 1;
        }
        if (cur.x + cur.w > W) {
          cur.x = W - cur.w;
          cur.dir = -1;
        }
      },
      draw(g) {
        const visible = Math.floor((H - TOP - 120) / bh);
        const shift = Math.max(0, tower.length - visible);
        const yOf = (i: number) => H - 30 - (i - shift + 1) * bh;
        tower.forEach((b, i) => {
          if (i >= shift) rect(g, b.x, yOf(i), b.w, bh - 2, i % 2 ? p.theme.accent : p.theme.accent2);
        });
        rect(g, cur.x, yOf(tower.length), cur.w, bh - 2, p.theme.fg);
        text(g, `${tower.length - 1}층`, W - 60, TOP + 30, p.theme.fg, 20);
      },
    };
  },
};

export const ARCADE = [bricks, duel, catcher, mole, aim, stack];
