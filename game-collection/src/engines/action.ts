import type { Engine } from "../core/types";
import { TOP, axisX, circle, clamp, rect, text, dist } from "./util";

const snake: Engine = {
  id: "snake",
  name: "뱀 키우기",
  icon: "🐍",
  category: "액션",
  desc: "먹이를 먹고 몸을 늘리세요. 벽과 자기 몸에 부딪히면 안 됩니다.",
  controls: "방향키 / WASD",
  create(api) {
    const { p, W, H } = api;
    const cell = Math.round(20 * p.size);
    const cols = Math.floor(W / cell);
    const rows = Math.floor((H - TOP) / cell);
    let body: { x: number; y: number }[] = [];
    let dir = { x: 1, y: 0 };
    let next = dir;
    let food = { x: 0, y: 0 };
    let acc = 0;
    const step = 0.13 / p.speed;
    const placeFood = () => {
      do {
        food = { x: api.randInt(0, cols - 1), y: api.randInt(0, rows - 1) };
      } while (body.some((b) => b.x === food.x && b.y === food.y));
    };
    const reset = () => {
      const cx = Math.floor(cols / 2);
      const cy = Math.floor(rows / 2);
      body = [0, 1, 2].map((i) => ({ x: cx - i, y: cy }));
      dir = next = { x: 1, y: 0 };
      placeFood();
    };
    reset();
    return {
      onKeyDown(k) {
        const m: Record<string, { x: number; y: number }> = {
          ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
          ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
          ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
          ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
        };
        const n = m[k];
        if (n && (n.x !== -dir.x || n.y !== -dir.y)) next = n;
      },
      onPointerDown(x, y) {
        const h = body[0];
        const dx = x - (h.x + 0.5) * cell;
        const dy = y - TOP - (h.y + 0.5) * cell;
        const n = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
        if (n.x !== -dir.x || n.y !== -dir.y) next = n;
      },
      onLifeLost: reset,
      update(dt) {
        acc += dt;
        while (acc >= step) {
          acc -= step;
          dir = next;
          const h = { x: body[0].x + dir.x, y: body[0].y + dir.y };
          if (h.x < 0 || h.y < 0 || h.x >= cols || h.y >= rows || body.some((b) => b.x === h.x && b.y === h.y)) {
            api.fail();
            return;
          }
          body.unshift(h);
          if (h.x === food.x && h.y === food.y) {
            api.addScore(10);
            placeFood();
          } else body.pop();
        }
      },
      draw(g) {
        rect(g, food.x * cell + 2, TOP + food.y * cell + 2, cell - 4, cell - 4, p.theme.danger);
        body.forEach((b, i) =>
          rect(g, b.x * cell + 1, TOP + b.y * cell + 1, cell - 2, cell - 2, i === 0 ? p.theme.accent2 : p.theme.accent),
        );
      },
    };
  },
};

const dodge: Engine = {
  id: "dodge",
  name: "낙하물 피하기",
  icon: "☄️",
  category: "액션",
  desc: "하늘에서 떨어지는 운석을 피해 오래 살아남으세요.",
  controls: "← → / 마우스 이동",
  create(api) {
    const { p, W, H } = api;
    const pr = 16 * p.size;
    let px = W / 2;
    let rocks: { x: number; y: number; r: number; v: number }[] = [];
    let spawn = 0;
    let usePointer = false;
    let lastPointerX = api.pointer.x;
    return {
      onLifeLost() {
        rocks = [];
      },
      update(dt) {
        const ax = axisX(api.keys);
        if (ax) usePointer = false;
        if (api.pointer.x !== lastPointerX) usePointer = true;
        lastPointerX = api.pointer.x;
        if (usePointer) px += clamp(api.pointer.x - px, -600 * dt, 600 * dt);
        else px += ax * 420 * dt;
        px = clamp(px, pr, W - pr);
        const level = 1 + api.elapsed / 20;
        spawn -= dt;
        if (spawn <= 0) {
          spawn = (0.55 / p.speed) / level;
          rocks.push({ x: api.rand() * W, y: TOP - 20, r: (8 + api.rand() * 18) * p.size, v: (150 + api.rand() * 150) * p.speed * Math.sqrt(level) });
        }
        for (const r of rocks) {
          r.y += r.v * dt;
          if (dist(r.x, r.y, px, H - 40) < r.r + pr * 0.8) {
            api.fail();
            return;
          }
        }
        const before = rocks.length;
        rocks = rocks.filter((r) => r.y < H + 40);
        if (rocks.length < before) api.addScore(before - rocks.length, true);
      },
      draw(g) {
        for (const r of rocks) circle(g, r.x, r.y, r.r, p.theme.danger);
        circle(g, px, H - 40, pr, p.theme.accent);
        circle(g, px, H - 44, pr * 0.4, p.theme.fg);
      },
    };
  },
};

const runner: Engine = {
  id: "runner",
  name: "점프 러너",
  icon: "🏃",
  category: "액션",
  desc: "끝없이 달리며 장애물을 뛰어넘으세요. 공중에서 한 번 더 점프 가능!",
  controls: "스페이스 / ↑ / 클릭",
  create(api) {
    const { p, W, H } = api;
    const ground = H - 80;
    const size = 30 * p.size;
    let y = ground - size;
    let vy = 0;
    let jumps = 0;
    let obs: { x: number; w: number; h: number; passed: boolean }[] = [];
    let spawn = 1;
    let scroll = 0;
    const jump = () => {
      if (jumps < 2) {
        vy = -620;
        jumps++;
        api.sfx("click");
      }
    };
    return {
      onKeyDown(k) {
        if (k === " " || k === "ArrowUp" || k === "w") jump();
      },
      onPointerDown: jump,
      onLifeLost() {
        obs = [];
        spawn = 1;
      },
      update(dt) {
        const speed = (300 + api.elapsed * 6) * p.speed;
        scroll += speed * dt;
        vy += 1800 * dt;
        y += vy * dt;
        if (y >= ground - size) {
          y = ground - size;
          vy = 0;
          jumps = 0;
        }
        spawn -= dt;
        if (spawn <= 0) {
          spawn = 0.8 + api.rand() * 1.1;
          obs.push({ x: W + 20, w: (20 + api.rand() * 30) * p.size, h: (25 + api.rand() * 45) * p.size, passed: false });
        }
        for (const o of obs) {
          o.x -= speed * dt;
          if (o.x < 80 + size && o.x + o.w > 80 && y + size > ground - o.h) {
            api.fail();
            return;
          }
          if (!o.passed && o.x + o.w < 80) {
            o.passed = true;
            api.addScore(10);
          }
        }
        obs = obs.filter((o) => o.x > -100);
      },
      draw(g) {
        rect(g, 0, ground, W, H - ground, p.theme.muted);
        for (let i = 0; i < 20; i++) rect(g, ((i * 80 - scroll) % (W + 80) + W + 80) % (W + 80) - 40, ground + 20, 30, 4, p.theme.fg);
        for (const o of obs) rect(g, o.x, ground - o.h, o.w, o.h, p.theme.danger);
        rect(g, 80, y, size, size, p.theme.accent);
        rect(g, 80 + size * 0.6, y + size * 0.2, size * 0.2, size * 0.2, p.theme.bg);
      },
    };
  },
};

const cave: Engine = {
  id: "cave",
  name: "동굴 비행",
  icon: "🚁",
  category: "액션",
  desc: "버튼을 누르고 있으면 상승, 떼면 하강. 좁아지는 동굴을 통과하세요.",
  controls: "스페이스 / 마우스 누르기",
  create(api) {
    const { p, W, H } = api;
    const seg = 20;
    const n = Math.ceil(W / seg) + 2;
    let y = H / 2;
    let vy = 0;
    let walls: { top: number; bot: number }[] = [];
    let center = H / 2;
    let offset = 0;
    let distAcc = 0;
    const r = 10 * p.size;
    const gap = () => Math.max(140, (320 - api.elapsed * 3) * p.size);
    const pushWall = () => {
      center = clamp(center + (api.rand() - 0.5) * 60 * p.speed, TOP + gap() / 2 + 10, H - gap() / 2 - 10);
      walls.push({ top: center - gap() / 2, bot: center + gap() / 2 });
    };
    const reset = () => {
      walls = [];
      center = H / 2;
      y = H / 2;
      vy = 0;
      for (let i = 0; i < n; i++) walls.push({ top: H / 2 - 180, bot: H / 2 + 180 });
    };
    reset();
    return {
      onLifeLost: reset,
      update(dt) {
        const hold = api.keys.has(" ") || api.keys.has("ArrowUp") || api.pointer.down;
        vy += (hold ? -1300 : 1100) * dt;
        vy = clamp(vy, -450, 450);
        y += vy * dt;
        const sp = 240 * p.speed;
        offset += sp * dt;
        distAcc += sp * dt;
        while (offset >= seg) {
          offset -= seg;
          walls.shift();
          pushWall();
        }
        if (distAcc > 100) {
          distAcc -= 100;
          api.addScore(1, true);
        }
        const w = walls[Math.floor((120 + offset) / seg)];
        if (y - r < w.top || y + r > w.bot || y < TOP || y > H) api.fail();
      },
      draw(g) {
        walls.forEach((w, i) => {
          const x = i * seg - offset;
          rect(g, x, TOP, seg + 1, w.top - TOP, p.theme.muted);
          rect(g, x, w.bot, seg + 1, H - w.bot, p.theme.muted);
        });
        circle(g, 120, y, r, p.theme.accent);
        rect(g, 120 - r * 1.6, y - r - 4, r * 3.2, 3, p.theme.fg);
      },
    };
  },
};

const shooter: Engine = {
  id: "shooter",
  name: "은하 방어전",
  icon: "🚀",
  category: "액션",
  desc: "내려오는 적 비행체를 격추하세요. 적이 바닥에 닿거나 부딪히면 실패!",
  controls: "← → 이동, 스페이스 발사 (마우스: 이동+클릭 발사)",
  create(api) {
    const { p, W, H } = api;
    let px = W / 2;
    let bullets: { x: number; y: number }[] = [];
    let enemies: { x: number; y: number; r: number; v: number; hp: number; wob: number }[] = [];
    let cool = 0;
    let spawn = 0;
    let mouse = false;
    let lastPX = api.pointer.x;
    const fire = () => {
      if (cool <= 0) {
        bullets.push({ x: px, y: H - 60 });
        cool = 0.18;
        api.sfx("shoot");
      }
    };
    return {
      onPointerDown: fire,
      onLifeLost() {
        enemies = [];
        bullets = [];
      },
      update(dt) {
        cool -= dt;
        const ax = axisX(api.keys);
        if (ax) mouse = false;
        if (api.pointer.x !== lastPX) mouse = true;
        lastPX = api.pointer.x;
        if (mouse) px += clamp(api.pointer.x - px, -700 * dt, 700 * dt);
        else px += ax * 450 * dt;
        px = clamp(px, 20, W - 20);
        if (api.keys.has(" ") || (mouse && api.pointer.down)) fire();
        spawn -= dt;
        const lvl = 1 + api.elapsed / 25;
        if (spawn <= 0) {
          spawn = 1.1 / (p.speed * lvl);
          const r = (14 + api.rand() * 12) * p.size;
          enemies.push({ x: r + api.rand() * (W - 2 * r), y: TOP - r, r, v: (50 + api.rand() * 50) * p.speed * lvl, hp: r > 22 ? 2 : 1, wob: api.rand() * 6 });
        }
        for (const b of bullets) b.y -= 700 * dt;
        for (const e of enemies) {
          e.y += e.v * dt;
          e.wob += dt * 2;
          e.x += Math.sin(e.wob) * 40 * dt;
          for (const b of bullets) {
            if (b.y > -50 && dist(b.x, b.y, e.x, e.y) < e.r + 3) {
              b.y = -100;
              e.hp--;
              api.sfx("hit");
            }
          }
          if (e.y > H - 40 || dist(e.x, e.y, px, H - 40) < e.r + 14) {
            api.fail();
            return;
          }
        }
        const alive = enemies.filter((e) => e.hp > 0);
        if (alive.length < enemies.length) api.addScore(10 * (enemies.length - alive.length));
        enemies = alive;
        bullets = bullets.filter((b) => b.y > TOP);
      },
      draw(g) {
        for (const b of bullets) rect(g, b.x - 2, b.y - 8, 4, 12, p.theme.accent2);
        for (const e of enemies) {
          circle(g, e.x, e.y, e.r, p.theme.danger);
          circle(g, e.x, e.y, e.r * 0.4, e.hp > 1 ? p.theme.fg : p.theme.bg);
        }
        g.fillStyle = p.theme.accent;
        g.beginPath();
        g.moveTo(px, H - 60);
        g.lineTo(px - 18, H - 25);
        g.lineTo(px + 18, H - 25);
        g.fill();
        if (api.elapsed < 3) text(g, "적을 모두 격추하세요!", W / 2, H / 2, p.theme.fg, 24);
      },
    };
  },
};

export const ACTION = [snake, dodge, runner, cave, shooter];
