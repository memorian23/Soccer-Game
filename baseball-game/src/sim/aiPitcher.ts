import { GameState } from "../state/gameState";
import { PITCH_TYPES, PitchType } from "../data/pitchTypes";
import { AimPoint } from "./pitchPhysics";

/** Picks a pitch type and target for the AI-controlled pitcher when the user is batting. */
export function chooseAiPitch(state: GameState): { pitchType: PitchType; aim: AimPoint } {
  const pitchType = PITCH_TYPES[Math.floor(Math.random() * PITCH_TYPES.length)];

  // Behind in the count: play it safe near the middle. Ahead: tempt a chase further out.
  let radius = 0.7;
  if (state.balls >= 3) radius = 0.4;
  else if (state.strikes >= 2) radius = 1.3;

  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * radius;
  return { pitchType, aim: { x: Math.cos(angle) * r, y: Math.sin(angle) * r } };
}
