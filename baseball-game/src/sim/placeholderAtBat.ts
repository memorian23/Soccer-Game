import { GameState } from "../state/gameState";

export type PitchResult = "ball" | "strike" | "foul" | "out" | "single" | "double" | "triple" | "homerun";

/**
 * Stand-in for the real pitching mini-game: resolves one pitch immediately with
 * a weighted random outcome (biased by batter contact/power and pitcher control),
 * applies it to the GameState, and reports what happened so the scene can react.
 */
export function simulateNextPitch(state: GameState): PitchResult {
  const batter = state.currentBatter;
  const pitcher = state.currentPitcher;

  const roll = Math.random();
  if (roll < 0.32) {
    state.recordBall();
    return "ball";
  }
  if (roll < 0.6) {
    state.recordStrike(false);
    return "strike";
  }
  if (roll < 0.72) {
    state.recordStrike(true);
    return "foul";
  }

  // Ball put in play: contact vs. control decides out-or-hit, then power decides hit type.
  const contactRoll = Math.random() * 100 + (batter.contact - pitcher.control * 0.25);
  if (contactRoll < 55) {
    state.fieldOut();
    return "out";
  }

  const powerRoll = Math.random() * 100 + batter.power * 0.3;
  if (powerRoll > 118) {
    state.hit(4);
    return "homerun";
  }
  if (powerRoll > 100) {
    state.hit(3);
    return "triple";
  }
  if (powerRoll > 80) {
    state.hit(2);
    return "double";
  }
  state.hit(1);
  return "single";
}
