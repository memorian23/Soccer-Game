import type { Engine } from "../core/types";
import { TOP, axisX, circle, clamp, rect, rrect, text, dist } from "./util";

const GRASS = "#2f8f46";

const keeper: Engine = {
  id: "keeper",
  name: "골키퍼 선방",
  icon: "🧤",
  category: "스포츠",
  desc: "날아오는 슈팅을 막아내세요. 골을 먹으면 실패!",
  controls: "← → / 마우스",
  create(api) {
    const { p, W, H } = api;
    const goalW = 420;
    const gx = (W - goalW) / 2;
    const gy = H - 90;
    const kw = 70 * p.size;
    let kx = W / 2;
    let mouse = false;
    let lastX = api.pointer.x;
    let shots: { x: number; y: number; vx: number; vy: number; curve: number }[] = [];
    let spawn = 1;
    return {
      onLifeLost() {
        shots = [];
        spawn = 1;
      },
      update(dt) {
        const ax = axisX(api.keys);
        if (ax) mouse = false;
        if (api.pointer.x !== lastX) mouse = true;
        lastX = api.pointer.x;
        const target = mouse ? api.pointer.x : kx + ax * 600;
        kx += clamp(target - kx, -560 * dt, 560 * dt);
        kx = clamp(kx, gx + kw / 2, gx + goalW - kw / 2);
        spawn -= dt;
        const lvl = 1 + api.elapsed / 30;
        if (spawn <= 0) {
          spawn = (1.4 / p.speed) / lvl;
          const sx = 100 + api.rand() * (W - 200);
          const tx = gx + 20 + api.rand() * (goalW - 40);
          const T = (1.4 / p.speed) / Math.sqrt(lvl);
          shots.push({ x: sx, y: TOP + 30, vx: (tx - sx) / T, vy: (gy - TOP - 30) / T, curve: (api.rand() - 0.5) * 300 * p.speed });
        }
        for (const s of shots) {
          s.vx += s.curve * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          if (s.y > gy - 20 && s.y < gy + 10 && Math.abs(s.x - kx) < kw / 2 + 10) {
            s.y = H + 100;
            api.addScore(10);
            api.sfx("hit");
          } else if (s.y >= gy + 10 && s.y < H) {
            if (s.x > gx && s.x < gx + goalW) {
              api.fail();
              return;
            }
            s.y = H + 100; // 골대 밖으로 빗나감
          }
        }
        shots = shots.filter((s) => s.y < H);
      },
      draw(g) {
        rect(g, 0, TOP, W, H - TOP, GRASS);
        g.strokeStyle = "#fff";
        g.lineWidth = 4;
        g.strokeRect(gx, gy, goalW, 70);
        g.lineWidth = 1;
        for (let x = gx; x < gx + goalW; x += 20) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x, gy + 70); g.stroke(); }
        for (const s of shots) {
          const sc = 0.6 + ((s.y - TOP) / (gy - TOP)) * 0.6;
          circle(g, s.x, s.y, 12 * sc, "#fff");
          circle(g, s.x, s.y, 4 * sc, "#222");
        }
        rrect(g, kx - kw / 2, gy - 30, kw, 30, 10, p.theme.accent);
        circle(g, kx, gy - 42, 12, "#f1c27d");
      },
    };
  },
};

const juggle: Engine = {
  id: "juggle",
  name: "볼 리프팅",
  icon: "⚽",
  category: "스포츠",
  desc: "공을 클릭해서 땅에 떨어지지 않게 계속 차올리세요.",
  controls: "공 클릭",
  create(api) {
    const { p, W, H } = api;
    const r = 34 * p.size;
    let b = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    let spin = 0;
    const reset = () => (b = { x: W / 2, y: H / 3, vx: 0, vy: 0 });
    return {
      onLifeLost: reset,
      onPointerDown(x, y) {
        if (dist(x, y, b.x, b.y) < r * 1.4) {
          b.vy = -650 * Math.sqrt(p.speed);
          b.vx = (b.x - x) * 12 + (api.rand() - 0.5) * 120 * p.speed;
          spin = b.vx / 100;
          api.addScore(1);
          api.sfx("hit");
        }
      },
      update(dt) {
        b.vy += 1100 * p.speed * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < r || b.x > W - r) {
          b.vx *= -0.8;
          b.x = clamp(b.x, r, W - r);
        }
        if (b.y < TOP + r) {
          b.y = TOP + r;
          b.vy = Math.abs(b.vy) * 0.5;
        }
        if (b.y > H - 40 - r) api.fail();
      },
      draw(g) {
        rect(g, 0, H - 40, W, 40, GRASS);
        circle(g, b.x, b.y, r, "#fff");
        g.save();
        g.translate(b.x, b.y);
        g.rotate((api.elapsed * spin) % (Math.PI * 2));
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          circle(g, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.18, "#222");
        }
        circle(g, 0, 0, r * 0.25, "#222");
        g.restore();
        if (api.score === 0) text(g, "공을 클릭하세요!", W / 2, H / 2 + 120, p.theme.fg, 22);
      },
    };
  },
};

const penalty: Engine = {
  id: "penalty",
  name: "승부차기",
  icon: "🥅",
  category: "스포츠",
  desc: "골대 안을 클릭해 슛! 좌우로 움직이는 골키퍼를 피해 골을 넣으세요. 막히면 실패.",
  controls: "골대 안쪽 클릭",
  create(api) {
    const { p, W, H } = api;
    const gw = 520;
    const gh = 200;
    const gx = (W - gw) / 2;
    const gy = TOP + 80;
    const kw = 90 / p.size + 20;
    let kx = W / 2;
    let kdir = 1;
    let ball: { x: number; y: number; tx: number; ty: number; t: number } | null = null;
    let msg = "";
    let msgT = 0;
    let goals = 0;
    return {
      onPointerDown(x, y) {
        if (ball || msgT > 0) return;
        if (x < gx || x > gx + gw || y < gy || y > gy + gh) return;
        ball = { x: W / 2, y: H - 80, tx: x, ty: y, t: 0 };
        api.sfx("shoot");
      },
      update(dt) {
        const ks = (160 + goals * 12) * p.speed;
        kx += kdir * ks * dt;
        if (api.rand() < 0.8 * dt * p.speed) kdir *= -1;
        if (kx < gx + kw / 2 || kx > gx + gw - kw / 2) {
          kdir *= -1;
          kx = clamp(kx, gx + kw / 2, gx + gw - kw / 2);
        }
        if (msgT > 0) msgT -= dt;
        if (ball) {
          ball.t += dt / 0.5;
          if (ball.t >= 1) {
            const saved = Math.abs(ball.tx - kx) < kw / 2 + 12 && ball.ty > gy + gh - 150;
            if (saved) {
              msg = "선방당함!";
              api.fail();
            } else {
              goals++;
              msg = "골!!";
              api.addScore(10 + goals);
            }
            msgT = 0.8;
            ball = null;
          }
        }
      },
      draw(g) {
        rect(g, 0, TOP, W, H - TOP, GRASS);
        g.strokeStyle = "#fff";
        g.lineWidth = 6;
        g.strokeRect(gx, gy, gw, gh);
        g.lineWidth = 1;
        for (let x = gx; x < gx + gw; x += 26) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x, gy + gh); g.stroke(); }
        // 키퍼 (손을 뻗은 높이 150px 커버)
        rrect(g, kx - kw / 2, gy + gh - 150, kw, 150, 16, p.theme.accent);
        circle(g, kx, gy + gh - 165, 16, "#f1c27d");
        if (ball) {
          const x = W / 2 + (ball.tx - W / 2) * ball.t;
          const y = H - 80 + (ball.ty - (H - 80)) * ball.t - Math.sin(ball.t * Math.PI) * 60;
          circle(g, x, y, 16 - ball.t * 6, "#fff");
        } else circle(g, W / 2, H - 80, 16, "#fff");
        if (msgT > 0) text(g, msg, W / 2, H / 2 + 80, p.theme.accent2, 48);
      },
    };
  },
};

const basket: Engine = {
  id: "basket",
  name: "자유투 타이밍",
  icon: "🏀",
  category: "스포츠",
  desc: "오르내리는 파워 게이지를 보고 적절한 순간에 클릭해 링에 넣으세요.",
  controls: "스페이스 / 클릭",
  create(api) {
    const { p, W, H } = api;
    const g0 = 900;
    const sx = 120;
    const sy = H - 120;
    let hoopX = 0;
    const hoopY = 220;
    const ring = 34 * p.size;
    let power = 0;
    let pdir = 1;
    let ball: { x: number; y: number; vx: number; vy: number; scored: boolean } | null = null;
    // 이 파워(0~1)일 때 정확히 들어감
    let ideal = 0.5;
    const place = () => {
      hoopX = 420 + api.rand() * 300;
      const ang = (55 * Math.PI) / 180;
      const dx = hoopX - sx;
      const dy = sy - hoopY;
      const v = Math.sqrt((g0 * dx * dx) / (2 * Math.cos(ang) ** 2 * (dx * Math.tan(ang) - dy)));
      ideal = (v - 450) / 600;
    };
    place();
    const shoot = () => {
      if (ball) return;
      const v = 450 + power * 600;
      const ang = (55 * Math.PI) / 180;
      ball = { x: sx, y: sy, vx: v * Math.cos(ang), vy: -v * Math.sin(ang), scored: false };
      api.sfx("shoot");
    };
    return {
      onKeyDown(k) {
        if (k === " ") shoot();
      },
      onPointerDown: shoot,
      update(dt) {
        power += pdir * dt * 0.9 * p.speed;
        if (power > 1 || power < 0) {
          pdir *= -1;
          power = clamp(power, 0, 1);
        }
        if (!ball) return;
        ball.vy += g0 * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (!ball.scored && ball.vy > 0 && Math.abs(ball.y - hoopY) < 12 && Math.abs(ball.x - hoopX) < ring) {
          ball.scored = true;
          api.addScore(Math.abs(ball.x - hoopX) < ring / 3 ? 30 : 20);
        }
        if (ball.y > H || ball.x > W + 40) {
          if (!ball.scored) api.fail();
          ball = null;
          place();
        }
      },
      draw(g) {
        rect(g, 0, H - 80, W, 80, "#b5651d");
        rect(g, hoopX + ring + 4, hoopY - 70, 8, 100, p.theme.fg);
        rect(g, hoopX - ring, hoopY - 3, ring * 2, 6, "#e74c3c");
        circle(g, sx - 20, sy + 10, 18, "#f1c27d");
        if (ball) circle(g, ball.x, ball.y, 14, "#e67e22");
        else circle(g, sx, sy, 14, "#e67e22");
        // 파워 게이지
        rrect(g, 30, TOP + 30, 24, 300, 8, p.theme.muted);
        rect(g, 30, TOP + 30 + 300 * (1 - clamp(ideal, 0, 1)) - 6, 24, 12, "rgba(46,204,113,0.6)");
        rect(g, 30, TOP + 30 + 300 * (1 - power), 24, 300 * power, p.theme.accent);
        text(g, "파워", 42, TOP + 345, p.theme.fg, 14);
      },
    };
  },
};

export const SPORTS = [keeper, juggle, penalty, basket];
