import { GameState } from "../state/gameState";
import { PitchType } from "../data/pitchTypes";

/** Normalized aim point: 0,0 is the center of the true strike zone; ±1 is the zone edge. */
export interface AimPoint {
  x: number;
  y: number;
}

export type ThrowOutcome = "ball" | "strike" | "foul" | "out" | "single" | "double" | "triple" | "homerun";

export interface ThrowResult {
  outcome: ThrowOutcome;
  actualX: number;
  actualY: number;
  inZone: boolean;
  swung: boolean;
}

const ZONE_HALF = 1;
const CHASE_MARGIN = 0.6;

/** Resolves one pitch against the current batter and applies the result to GameState. */
export function throwPitch(state: GameState, pitchType: PitchType, aim: AimPoint): ThrowResult {
  const batter = state.currentBatter;
  const pitcher = state.currentPitcher;

  const controlFactor = (pitcher.control / 99) * pitchType.controlMultiplier;
  const deviation = (1 - controlFactor) * 0.9;
  const actualX = aim.x + pitchType.breakX + (Math.random() * 2 - 1) * deviation;
  const actualY = aim.y + pitchType.breakY + (Math.random() * 2 - 1) * deviation;

  const dist = Math.max(Math.abs(actualX), Math.abs(actualY));
  const inZone = dist <= ZONE_HALF;

  let swingChance: number;
  if (inZone) {
    swingChance = 0.55 + (batter.contact / 99) * 0.25;
  } else if (dist <= ZONE_HALF + CHASE_MARGIN) {
    const closeness = 1 - (dist - ZONE_HALF) / CHASE_MARGIN;
    swingChance = closeness * 0.35;
  } else {
    swingChance = 0.03;
  }
  const swung = Math.random() < swingChance;

  if (!swung) {
    if (inZone) {
      state.recordStrike(false);
      return { outcome: "strike", actualX, actualY, inZone, swung };
    }
    state.recordBall();
    return { outcome: "ball", actualX, actualY, inZone, swung };
  }

  const edgePenalty = dist > ZONE_HALF ? (dist - ZONE_HALF) * 40 : 0;
  const contactRoll = Math.random() * 100 + batter.contact - pitchType.difficulty - edgePenalty;

  if (contactRoll < 35) {
    state.recordStrike(false);
    return { outcome: "strike", actualX, actualY, inZone, swung };
  }
  if (contactRoll < 60) {
    state.recordStrike(true);
    return { outcome: "foul", actualX, actualY, inZone, swung };
  }

  const outRoll = Math.random() * 100 + batter.contact * 0.3 - pitcher.control * 0.2;
  if (outRoll < 55) {
    state.fieldOut();
    return { outcome: "out", actualX, actualY, inZone, swung };
  }

  const powerRoll = Math.random() * 100 + batter.power * 0.3 - edgePenalty * 0.5;
  if (powerRoll > 118) {
    state.hit(4);
    return { outcome: "homerun", actualX, actualY, inZone, swung };
  }
  if (powerRoll > 100) {
    state.hit(3);
    return { outcome: "triple", actualX, actualY, inZone, swung };
  }
  if (powerRoll > 80) {
    state.hit(2);
    return { outcome: "double", actualX, actualY, inZone, swung };
  }
  state.hit(1);
  return { outcome: "single", actualX, actualY, inZone, swung };
}
