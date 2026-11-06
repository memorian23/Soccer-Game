export const TOP = 28; // HUD 높이

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export function circle(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  g.fill();
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

export function text(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color: string,
  size = 20,
  align: CanvasTextAlign = "center",
) {
  g.fillStyle = color;
  g.font = `bold ${size}px system-ui, sans-serif`;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}

export function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

/** 좌(-1)/우(+1) 입력 축 */
export function axisX(keys: Set<string>) {
  return (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
}
export function axisY(keys: Set<string>) {
  return (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
}

export function inRect(px: number, py: number, x: number, y: number, w: number, h: number) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
