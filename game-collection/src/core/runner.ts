import { makeRng } from "./rng";
import { playSfx } from "./sfx";
import type { GameAPI, GameEntry, Instance, Pointer } from "./types";

export const W = 800;
export const H = 600;

export const MODE_RULES = {
  classic: { lives: 3, limit: 0, mult: 1, label: "클래식 · 목숨 3개" },
  time: { lives: Infinity, limit: 60, mult: 1, label: "타임어택 · 60초" },
  hardcore: { lives: 1, limit: 0, mult: 2, label: "하드코어 · 목숨 1개, 점수 2배" },
  zen: { lives: Infinity, limit: 120, mult: 1, label: "젠 · 120초, 실패 없음" },
} as const;

/**
 * 하나의 게임 플레이 세션. 캔버스에 루프를 돌리고 모드 규칙(목숨/시간)을 적용한다.
 */
export class Runner {
  private inst!: Instance;
  private api!: GameAPI;
  private raf = 0;
  private last = 0;
  private score = 0;
  private lives = 0;
  private elapsed = 0;
  private over = false;
  private paused = false;
  private flash = 0;
  private keys = new Set<string>();
  private pointer: Pointer = { x: 0, y: 0, down: false };
  private g: CanvasRenderingContext2D;
  private cleanup: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private entry: GameEntry,
    private onFinish: (score: number) => void,
  ) {
    canvas.width = W;
    canvas.height = H;
    this.g = canvas.getContext("2d")!;
    this.bind();
    this.start();
  }

  private bind() {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (this.over) {
        if (k === "r" || k === "Enter" || k === " ") this.start();
        return;
      }
      if (k === "p") {
        this.paused = !this.paused;
        return;
      }
      if (!this.keys.has(k)) {
        this.keys.add(k);
        if (!this.paused) this.inst.onKeyDown?.(k);
      }
    };
    const ku = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    };
    const pos = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * W;
      this.pointer.y = ((e.clientY - r.top) / r.height) * H;
    };
    const pm = (e: PointerEvent) => pos(e);
    const pd = (e: PointerEvent) => {
      pos(e);
      this.pointer.down = true;
      if (this.over) {
        this.start();
        return;
      }
      if (!this.paused) this.inst.onPointerDown?.(this.pointer.x, this.pointer.y, e.button);
    };
    const pu = (e: PointerEvent) => {
      pos(e);
      this.pointer.down = false;
      if (!this.over && !this.paused) this.inst.onPointerUp?.(this.pointer.x, this.pointer.y);
    };
    const cm = (e: Event) => e.preventDefault();
    this.canvas.addEventListener("contextmenu", cm);
    this.cleanup.push(() => this.canvas.removeEventListener("contextmenu", cm));
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    this.canvas.addEventListener("pointermove", pm);
    this.canvas.addEventListener("pointerdown", pd);
    window.addEventListener("pointerup", pu);
    this.cleanup.push(
      () => window.removeEventListener("keydown", kd),
      () => window.removeEventListener("keyup", ku),
      () => this.canvas.removeEventListener("pointermove", pm),
      () => this.canvas.removeEventListener("pointerdown", pd),
      () => window.removeEventListener("pointerup", pu),
    );
  }

  start() {
    const { params, engine } = this.entry;
    const rules = MODE_RULES[params.mode];
    const rand = makeRng(params.seed);
    this.score = 0;
    this.lives = rules.lives;
    this.elapsed = 0;
    this.over = false;
    this.paused = false;
    this.keys.clear();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.api = {
      W,
      H,
      p: params,
      keys: this.keys,
      pointer: this.pointer,
      rand,
      randInt: (a, b) => a + Math.floor(rand() * (b - a + 1)),
      addScore(n, quiet) {
        if (self.over) return;
        self.score += Math.round(n * rules.mult);
        if (n > 0 && !quiet) playSfx("score");
      },
      fail() {
        if (self.over) return;
        self.flash = 0.4;
        playSfx("fail");
        self.lives -= 1;
        if (self.lives <= 0) self.finish();
        else self.inst.onLifeLost?.();
      },
      end() {
        self.finish();
      },
      sfx: playSfx,
      get score() {
        return self.score;
      },
      get elapsed() {
        return self.elapsed;
      },
    };
    this.inst = engine.create(this.api);
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private finish() {
    if (this.over) return;
    this.over = true;
    playSfx("win");
    this.onFinish(this.score);
  }

  private loop = (t: number) => {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const rules = MODE_RULES[this.entry.params.mode];
    if (!this.over && !this.paused) {
      this.elapsed += dt;
      this.inst.update(dt);
      if (rules.limit && this.elapsed >= rules.limit) this.finish();
    }
    this.flash = Math.max(0, this.flash - dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private render() {
    const g = this.g;
    const th = this.entry.params.theme;
    g.save();
    g.fillStyle = th.bg;
    g.fillRect(0, 0, W, H);
    this.inst.draw(g);
    g.restore();

    if (this.flash > 0) {
      g.fillStyle = `rgba(255,40,40,${this.flash * 0.6})`;
      g.fillRect(0, 0, W, H);
    }

    // HUD
    const rules = MODE_RULES[this.entry.params.mode];
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(0, 0, W, 28);
    g.font = "bold 16px system-ui, sans-serif";
    g.textBaseline = "middle";
    g.fillStyle = "#fff";
    g.textAlign = "left";
    g.fillText(`점수 ${this.score}`, 10, 14);
    g.textAlign = "center";
    const lifeTxt = Number.isFinite(this.lives) ? "♥".repeat(Math.max(0, this.lives)) : "∞";
    g.fillText(lifeTxt, W / 2, 14);
    g.textAlign = "right";
    const tTxt = rules.limit
      ? `${Math.max(0, Math.ceil(rules.limit - this.elapsed))}초`
      : `${Math.floor(this.elapsed)}초`;
    g.fillText(tTxt, W - 10, 14);

    if (this.paused && !this.over) this.overlay("일시정지", "P 키로 계속");
    if (this.over) this.overlay(`게임 종료 — ${this.score}점`, "R / Enter / 클릭으로 다시 하기");
  }

  private overlay(title: string, sub: string) {
    const g = this.g;
    g.fillStyle = "rgba(0,0,0,0.65)";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 42px system-ui, sans-serif";
    g.fillText(title, W / 2, H / 2 - 20);
    g.font = "18px system-ui, sans-serif";
    g.fillText(sub, W / 2, H / 2 + 30);
  }

  /** 진행 중인 점수 (중간에 나갈 때 기록용) */
  get currentScore() {
    return this.score;
  }
  get isOver() {
    return this.over;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.cleanup.forEach((f) => f());
  }
}
