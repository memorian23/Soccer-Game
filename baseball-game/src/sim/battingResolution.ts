import { GameState } from "../state/gameState";
import { PitchType } from "../data/pitchTypes";
import { AimPoint, computePitchLocation } from "./pitchPhysics";
import { ThrowResult } from "./pitchResolution";

/**
 * Resolves one pitch when the user is batting: the pitch is AI-thrown, and the user decides
 * whether to swing and how well-timed the swing is. timingError is 0 (perfect) to 1 (worst);
 * only meaningful when swung is true.
 */
export function resolveBattingPitch(
  state: GameState,
  pitchType: PitchType,
  aim: AimPoint,
  swung: boolean,
  timingError: number,
): ThrowResult {
  const batter = state.currentBatter;
  const pitcher = state.currentPitcher;
  const { actualX, actualY, inZone, edgePenalty } = computePitchLocation(pitcher, pitchType, aim);

  if (!swung) {
    if (inZone) {
      state.recordStrike(false);
      return { outcome: "strike", actualX, actualY, inZone, swung };
    }
    state.recordBall();
    return { outcome: "ball", actualX, actualY, inZone, swung };
  }

  const timingPenalty = timingError * 60;
  const contactRoll = Math.random() * 70 + batter.contact - pitchType.difficulty - edgePenalty - timingPenalty;

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

  const powerRoll = Math.random() * 100 + batter.power * 0.3 - edgePenalty * 0.5 - timingError * 20;
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
