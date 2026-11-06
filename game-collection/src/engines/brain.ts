import type { Engine, GameAPI } from "../core/types";
import { TOP, inRect, rect, rrect, shuffle, text } from "./util";

/** 화면 아래쪽에 n개의 선택 버튼을 배치 */
function buttons(api: GameAPI, n: number, y = api.H - 130, h = 90) {
  const gap = 16;
  const w = (api.W - 40 - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: 20 + i * (w + gap), y, w, h }));
}

const reaction: Engine = {
  id: "reaction",
  name: "반응 속도",
  icon: "⚡",
  category: "두뇌",
  desc: "화면이 초록색으로 바뀌는 순간 클릭! 너무 일찍 누르면 실패.",
  controls: "클릭 / 스페이스",
  create(api) {
    const { p, W, H } = api;
    let state: "wait" | "go" | "show" = "wait";
    let t = 0;
    let delay = 0;
    let last = 0;
    const arm = () => {
      state = "wait";
      t = 0;
      delay = 1 + api.rand() * 3;
    };
    arm();
    const press = () => {
      if (state === "wait") api.fail();
      else if (state === "go") {
        last = t;
        // 빠를수록 고득점, 속도 배율이 높으면 허용 시간이 짧아짐
        api.addScore(Math.max(1, Math.round((600 - t * 1000) / 10)));
        state = "show";
        t = 0;
      } else arm();
    };
    return {
      onPointerDown: press,
      onKeyDown(k) {
        if (k === " ") press();
      },
      onLifeLost: arm,
      update(dt) {
        t += dt;
        if (state === "wait" && t >= delay) {
          state = "go";
          t = 0;
        } else if (state === "go" && t > 1.2 / p.speed) api.fail();
        else if (state === "show" && t > 1) arm();
      },
      draw(g) {
        rect(g, 0, TOP, W, H - TOP, state === "go" ? "#2ecc71" : state === "wait" ? "#c0392b" : p.theme.muted);
        text(g, state === "go" ? "지금!" : state === "wait" ? "기다리세요..." : `${Math.round(last * 1000)}ms`, W / 2, H / 2, "#fff", 56);
      },
    };
  },
};

const colorSeq: Engine = {
  id: "colorseq",
  name: "색 순서 기억",
  icon: "🔴",
  category: "두뇌",
  desc: "패드가 빛나는 순서를 기억했다가 그대로 따라 누르세요. 순서는 점점 길어집니다.",
  controls: "클릭 / 1 2 3 4 키",
  create(api) {
    const { p, W, H } = api;
    const n = p.size > 1.1 ? 6 : 4;
    const cols = n === 4 ? 2 : 3;
    const rows = 2;
    const colors = ["#e74c3c", "#2ecc71", "#3498db", "#f1c40f", "#9b59b6", "#e67e22"];
    const pw = Math.min(260, (W - 60) / cols);
    const ph = Math.min(220, (H - TOP - 60) / rows);
    const ox = (W - pw * cols) / 2;
    const oy = TOP + (H - TOP - ph * rows) / 2;
    let seq: number[] = [];
    let showIdx = 0;
    let t = 0;
    let phase: "show" | "input" = "show";
    let inputIdx = 0;
    let lit = -1;
    let litT = 0;
    const extend = () => {
      seq.push(api.randInt(0, n - 1));
      phase = "show";
      showIdx = 0;
      t = -0.6;
      inputIdx = 0;
    };
    const reset = () => {
      seq = [];
      extend();
    };
    reset();
    const press = (i: number) => {
      if (phase !== "input") return;
      lit = i;
      litT = 0.2;
      if (seq[inputIdx] === i) {
        api.sfx("click");
        inputIdx++;
        if (inputIdx === seq.length) {
          api.addScore(seq.length * 10);
          extend();
        }
      } else api.fail();
    };
    const step = 0.6 / p.speed;
    return {
      onLifeLost: reset,
      onPointerDown(x, y) {
        for (let i = 0; i < n; i++)
          if (inRect(x, y, ox + (i % cols) * pw, oy + Math.floor(i / cols) * ph, pw, ph)) press(i);
      },
      onKeyDown(k) {
        const i = Number(k) - 1;
        if (i >= 0 && i < n) press(i);
      },
      update(dt) {
        litT -= dt;
        if (phase === "show") {
          t += dt;
          if (t >= step) {
            t = 0;
            if (showIdx < seq.length) {
              lit = seq[showIdx++];
              litT = step * 0.7;
              api.sfx("click");
            } else phase = "input";
          }
        }
      },
      draw(g) {
        for (let i = 0; i < n; i++) {
          const on = lit === i && litT > 0;
          g.globalAlpha = on ? 1 : 0.3;
          rrect(g, ox + (i % cols) * pw + 8, oy + Math.floor(i / cols) * ph + 8, pw - 16, ph - 16, 20, colors[i]);
          g.globalAlpha = 1;
          text(g, String(i + 1), ox + (i % cols) * pw + pw / 2, oy + Math.floor(i / cols) * ph + ph / 2, "#fff", 28);
        }
        text(g, phase === "show" ? "기억하세요..." : `따라 누르세요 (${inputIdx}/${seq.length})`, W / 2, H - 16, p.theme.fg, 16);
      },
    };
  },
};

const math: Engine = {
  id: "math",
  name: "암산 챌린지",
  icon: "➗",
  category: "두뇌",
  desc: "제한 시간 안에 계산 결과를 고르세요. 연속 정답일수록 문제가 어려워집니다.",
  controls: "클릭 / 1 2 3 4 키",
  create(api) {
    const { p, W } = api;
    const btns = buttons(api, 4);
    let q = "";
    let choices: number[] = [];
    let ans = 0;
    let t = 0;
    let streak = 0;
    const limit = () => Math.max(2, 8 / p.speed - streak * 0.1);
    const make = () => {
      const lvl = Math.min(10, 1 + Math.floor(streak / 3) + Math.round(p.size * 2 - 2));
      const max = 5 + lvl * 6;
      const op = api.randInt(0, lvl > 3 ? 3 : lvl > 1 ? 2 : 1);
      let a = api.randInt(1, max);
      let b = api.randInt(1, max);
      if (op === 0) { ans = a + b; q = `${a} + ${b}`; }
      else if (op === 1) { if (b > a) [a, b] = [b, a]; ans = a - b; q = `${a} − ${b}`; }
      else if (op === 2) { a = api.randInt(2, 3 + lvl); b = api.randInt(2, 9); ans = a * b; q = `${a} × ${b}`; }
      else { b = api.randInt(2, 9); ans = api.randInt(2, 3 + lvl); a = ans * b; q = `${a} ÷ ${b}`; }
      const set = new Set([ans]);
      while (set.size < 4) set.add(Math.max(0, ans + api.randInt(-10, 10)));
      choices = shuffle([...set], api.rand);
      t = 0;
    };
    make();
    const pick = (i: number) => {
      if (choices[i] === ans) {
        streak++;
        api.addScore(10 + streak);
        make();
      } else api.fail();
    };
    return {
      onLifeLost() {
        streak = 0;
        make();
      },
      onPointerDown(x, y) {
        btns.forEach((b, i) => inRect(x, y, b.x, b.y, b.w, b.h) && pick(i));
      },
      onKeyDown(k) {
        const i = Number(k) - 1;
        if (i >= 0 && i < 4) pick(i);
      },
      update(dt) {
        t += dt;
        if (t > limit()) api.fail();
      },
      draw(g) {
        text(g, `${q} = ?`, W / 2, 200, p.theme.fg, 64);
        rect(g, 100, 280, (W - 200) * Math.max(0, 1 - t / limit()), 10, p.theme.accent2);
        btns.forEach((b, i) => {
          rrect(g, b.x, b.y, b.w, b.h, 14, p.theme.accent);
          text(g, String(choices[i]), b.x + b.w / 2, b.y + b.h / 2, p.theme.bg, 36);
          text(g, String(i + 1), b.x + 14, b.y + 14, p.theme.bg, 12);
        });
        text(g, `연속 ${streak}`, W / 2, 330, p.theme.fg, 16);
      },
    };
  },
};

const stroop: Engine = {
  id: "stroop",
  name: "색깔 함정",
  icon: "🎨",
  category: "두뇌",
  desc: "글자의 '뜻'이 아니라 글자의 '색깔'을 고르세요. 뇌가 헷갈립니다!",
  controls: "클릭 / 1 2 3 4 키",
  create(api) {
    const { p, W } = api;
    const names = ["빨강", "초록", "파랑", "노랑"];
    const cols = ["#e74c3c", "#2ecc71", "#3498db", "#f1c40f"];
    const btns = buttons(api, 4);
    let word = 0;
    let ink = 0;
    let t = 0;
    let order = [0, 1, 2, 3];
    const make = () => {
      word = api.randInt(0, 3);
      ink = api.rand() < 0.75 ? (word + api.randInt(1, 3)) % 4 : word;
      // 크기 배율이 크면 버튼 순서도 매번 섞임
      if (p.size > 1.1) order = shuffle([0, 1, 2, 3], api.rand);
      t = 0;
    };
    make();
    const limit = 3 / p.speed;
    const pick = (i: number) => {
      if (order[i] === ink) {
        api.addScore(10);
        make();
      } else api.fail();
    };
    return {
      onLifeLost: make,
      onPointerDown(x, y) {
        btns.forEach((b, i) => inRect(x, y, b.x, b.y, b.w, b.h) && pick(i));
      },
      onKeyDown(k) {
        const i = Number(k) - 1;
        if (i >= 0 && i < 4) pick(i);
      },
      update(dt) {
        t += dt;
        if (t > limit) api.fail();
      },
      draw(g) {
        text(g, "글자의 색깔은?", W / 2, 110, p.theme.fg, 20);
        text(g, names[word], W / 2, 220, cols[ink], 90);
        rect(g, 100, 300, (W - 200) * Math.max(0, 1 - t / limit), 10, p.theme.accent2);
        btns.forEach((b, i) => {
          rrect(g, b.x, b.y, b.w, b.h, 14, p.theme.muted);
          // 버튼 글씨는 색 이름을 '다른 색'으로 써서 더 헷갈리게
          text(g, names[order[i]], b.x + b.w / 2, b.y + b.h / 2, p.speed > 1.3 ? cols[(order[i] + 2) % 4] : "#fff", 30);
        });
      },
    };
  },
};

const WORDS = ("apple ocean tiger piano river cloud stone light dream green house money water happy music sun moon star fire wind " +
  "rocket planet pixel castle dragon forest silver golden winter summer bridge garden island jungle kitten robot " +
  "soccer goal ball team coach game level score power speed magic quest hero ninja pizza candy lemon mango").split(" ");

const typing: Engine = {
  id: "typing",
  name: "타자 방어",
  icon: "⌨️",
  category: "두뇌",
  desc: "떨어지는 영어 단어를 타이핑해서 없애세요. 바닥에 닿으면 실패! (한/영 키 확인)",
  controls: "키보드 타이핑, Backspace",
  create(api) {
    const { p, W, H } = api;
    let words: { w: string; x: number; y: number; v: number }[] = [];
    let buf = "";
    let spawn = 0;
    return {
      onLifeLost() {
        words = [];
        buf = "";
      },
      onKeyDown(k) {
        if (k === "Backspace") buf = buf.slice(0, -1);
        else if (k === "Enter") buf = "";
        else if (/^[a-z]$/.test(k)) {
          buf += k;
          const hit = words.find((w) => w.w === buf);
          if (hit) {
            words = words.filter((w) => w !== hit);
            api.addScore(hit.w.length * 2);
            buf = "";
          } else if (!words.some((w) => w.w.startsWith(buf))) {
            buf = "";
            api.sfx("click");
          }
        }
      },
      update(dt) {
        spawn -= dt;
        const lvl = 1 + api.elapsed / 30;
        if (spawn <= 0) {
          spawn = 2.2 / (p.speed * lvl);
          const pool = WORDS.filter((w) => (p.size < 0.9 ? w.length <= 5 : p.size > 1.1 ? w.length >= 5 : true));
          words.push({ w: pool[api.randInt(0, pool.length - 1)], x: 60 + api.rand() * (W - 160), y: TOP + 10, v: (30 + api.rand() * 25) * p.speed * lvl });
        }
        for (const w of words) {
          w.y += w.v * dt;
          if (w.y > H - 50) {
            api.fail();
            return;
          }
        }
      },
      draw(g) {
        rect(g, 0, H - 50, W, 2, p.theme.danger);
        for (const w of words) {
          const match = buf && w.w.startsWith(buf);
          g.font = "bold 24px monospace";
          g.textAlign = "left";
          g.textBaseline = "middle";
          g.fillStyle = p.theme.fg;
          g.fillText(w.w, w.x, w.y);
          if (match) {
            g.fillStyle = p.theme.accent2;
            g.fillText(buf, w.x, w.y);
          }
        }
        text(g, `> ${buf}_`, W / 2, H - 25, p.theme.accent, 22);
      },
    };
  },
};

export const BRAIN = [reaction, colorSeq, math, stroop, typing];
