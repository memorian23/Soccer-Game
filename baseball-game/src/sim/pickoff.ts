/** timingError: 0 = perfect stop on the target, 1 = worst possible miss. */
export function resolvePickoff(timingError: number, pitcherControl: number): boolean {
  const threshold = 0.12 + (pitcherControl / 99) * 0.18;
  return timingError <= threshold;
}
