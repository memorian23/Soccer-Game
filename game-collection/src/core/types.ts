export type Mode = "classic" | "time" | "hardcore" | "zen";

export interface Theme {
  name: string;
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
  danger: string;
  muted: string;
}

/** Parameters that turn one base mechanic into a distinct variant. */
export interface Params {
  seed: number;
  /** 0.6 (느긋) ~ 1.8 (지옥) — 게임 속도/난이도 배율 */
  speed: number;
  /** 0.75 / 1 / 1.3 — 오브젝트 크기·판 크기 배율 */
  size: number;
  mode: Mode;
  theme: Theme;
}

export interface Pointer {
  x: number;
  y: number;
  down: boolean;
}

export interface GameAPI {
  readonly W: number;
  readonly H: number;
  readonly p: Params;
  readonly keys: Set<string>;
  readonly pointer: Pointer;
  /** seeded random 0..1 */
  rand(): number;
  randInt(a: number, b: number): number;
  addScore(n: number, quiet?: boolean): void;
  /** 목숨 1개를 잃음. 0이 되면 게임 오버 */
  fail(): void;
  /** 즉시 게임 종료 (승패 상관없이) */
  end(): void;
  sfx(kind: SfxKind): void;
  readonly score: number;
  readonly elapsed: number;
}

export type SfxKind = "hit" | "score" | "fail" | "click" | "win" | "shoot";

export interface Instance {
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
  onKeyDown?(key: string): void;
  onPointerDown?(x: number, y: number, button: number): void;
  onPointerUp?(x: number, y: number): void;
  /** fail() 후 호출 — 다음 목숨을 위해 상태를 정리 */
  onLifeLost?(): void;
}

export type Category = "액션" | "아케이드" | "퍼즐" | "두뇌" | "보드" | "스포츠" | "리듬";

export interface Engine {
  id: string;
  name: string;
  icon: string;
  category: Category;
  desc: string;
  controls: string;
  create(api: GameAPI): Instance;
}

export interface GameEntry {
  /** 1..9000 */
  no: number;
  id: string;
  title: string;
  engine: Engine;
  params: Params;
}
