import type { Engine } from "../core/types";
import { TOP, rect, rrect, text } from "./util";

const lanes: Engine = {
  id: "lanes",
  name: "리듬 레인",
  icon: "🎵",
  category: "리듬",
  desc: "판정선에 노트가 닿는 순간 해당 키를 누르세요. 5번 놓칠 때마다 목숨 하나를 잃습니다.",
  controls: "D F J K / 레인 클릭",
  create(api) {
    const { p, W, H } = api;
    const n = p.size < 0.9 ? 3 : p.size > 1.1 ? 5 : 4;
    const keys = n === 3 ? ["f", "j", "k"] : n === 4 ? ["d", "f", "j", "k"] : ["d", "f", " ", "j", "k"];
    const labels = keys.map((k) => (k === " " ? "␣" : k.toUpperCase()));
    const lw = 100;
    const ox = (W - lw * n) / 2;
    const judgeY = H - 90;
    const fall = 320 * p.speed;
    let notes: { lane: number; y: number }[] = [];
    let beat = 0;
    const bpm = 100 + p.speed * 40;
    let miss = 0;
    let combo = 0;
    let flash: number[] = Array(n).fill(0);
    let judge = "";
    let judgeT = 0;
    const hit = (lane: number) => {
      flash[lane] = 0.12;
      let best = -1;
      let bd = 1e9;
      notes.forEach((nt, i) => {
        const d = Math.abs(nt.y - judgeY);
        if (nt.lane === lane && d < bd) { bd = d; best = i; }
      });
      if (best >= 0 && bd < 60) {
        notes.splice(best, 1);
        combo++;
        const perfect = bd < 20;
        judge = perfect ? "PERFECT" : "GOOD";
        judgeT = 0.4;
        api.addScore((perfect ? 10 : 5) + Math.floor(combo / 10), true);
        api.sfx("click");
      } else {
        combo = 0;
      }
    };
    const missOne = () => {
      combo = 0;
      miss++;
      judge = "MISS";
      judgeT = 0.4;
      if (miss >= 5) {
        miss = 0;
        api.fail();
      }
    };
    return {
      onLifeLost() {
        notes = [];
      },
      onKeyDown(k) {
        const i = keys.indexOf(k);
        if (i >= 0) hit(i);
      },
      onPointerDown(x) {
        const i = Math.floor((x - ox) / lw);
        if (i >= 0 && i < n) hit(i);
      },
      update(dt) {
        beat -= dt;
        if (beat <= 0) {
          beat = 60 / bpm / (api.rand() < 0.3 ? 2 : 1);
          notes.push({ lane: api.randInt(0, n - 1), y: TOP });
          if (api.rand() < 0.12 * p.speed) notes.push({ lane: api.randInt(0, n - 1), y: TOP });
        }
        for (const nt of notes) nt.y += fall * dt;
        const before = notes.length;
        notes = notes.filter((nt) => nt.y < judgeY + 70);
        for (let k = 0; k < before - notes.length; k++) missOne();
        flash = flash.map((f) => f - dt);
        judgeT -= dt;
      },
      draw(g) {
        for (let i = 0; i < n; i++) {
          rect(g, ox + i * lw, TOP, lw - 2, H - TOP, flash[i] > 0 ? p.theme.muted : "rgba(255,255,255,0.04)");
          text(g, labels[i], ox + i * lw + lw / 2, H - 40, p.theme.fg, 22);
        }
        rect(g, ox, judgeY - 3, lw * n, 6, p.theme.accent2);
        for (const nt of notes) rrect(g, ox + nt.lane * lw + 8, nt.y - 10, lw - 18, 20, 6, p.theme.accent);
        if (judgeT > 0) text(g, judge, W / 2, H / 2, judge === "MISS" ? p.theme.danger : p.theme.accent2, 40);
        text(g, `콤보 ${combo}`, W - 70, TOP + 30, p.theme.fg, 16);
        text(g, `놓침 ${miss}/5`, 70, TOP + 30, p.theme.fg, 16);
      },
    };
  },
};

const timing: Engine = {
  id: "timing",
  name: "타이밍 스톱",
  icon: "⏱️",
  category: "리듬",
  desc: "왔다 갔다 하는 바늘을 초록 구간에서 멈추세요. 성공할수록 구간이 좁아집니다.",
  controls: "스페이스 / 클릭",
  create(api) {
    const { p, W, H } = api;
    const bx = 80;
    const bw = W - 160;
    let pos = 0;
    let dir = 1;
    let zone = { x: 0.4, w: 0.2 };
    let hits = 0;
    let msgT = 0;
    let msg = "";
    const place = () => {
      const w = Math.max(0.04, (0.22 - hits * 0.01) * p.size);
      zone = { x: api.rand() * (1 - w), w };
    };
    place();
    const press = () => {
      if (pos >= zone.x && pos <= zone.x + zone.w) {
        hits++;
        const center = Math.abs(pos - (zone.x + zone.w / 2)) < zone.w / 6;
        api.addScore(center ? 25 : 10);
        msg = center ? "완벽!" : "성공";
        msgT = 0.5;
        place();
      } else {
        msg = "실패";
        msgT = 0.5;
        api.fail();
      }
    };
    return {
      onPointerDown: press,
      onKeyDown(k) {
        if (k === " ") press();
      },
      update(dt) {
        pos += dir * dt * (0.6 + hits * 0.04) * p.speed;
        if (pos > 1 || pos < 0) {
          dir *= -1;
          pos = Math.max(0, Math.min(1, pos));
        }
        msgT -= dt;
      },
      draw(g) {
        const y = H / 2;
        rrect(g, bx, y - 30, bw, 60, 12, p.theme.muted);
        rect(g, bx + zone.x * bw, y - 30, zone.w * bw, 60, "#2ecc71");
        rect(g, bx + (zone.x + zone.w / 2 - zone.w / 6) * bw, y - 30, (zone.w / 3) * bw, 60, "#27ae60");
        rect(g, bx + pos * bw - 3, y - 45, 6, 90, p.theme.fg);
        text(g, `성공 ${hits}`, W / 2, y - 90, p.theme.fg, 24);
        if (msgT > 0) text(g, msg, W / 2, y + 90, msg === "실패" ? p.theme.danger : p.theme.accent2, 40);
      },
    };
  },
};

export const RHYTHM = [lanes, timing];
