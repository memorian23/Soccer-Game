import { PitcherProfile } from "../data/team";
import { PitchType } from "../data/pitchTypes";

/** Normalized aim point: 0,0 is the center of the true strike zone; ±1 is the zone edge. */
export interface AimPoint {
  x: number;
  y: number;
}

export interface PitchLocation {
  actualX: number;
  actualY: number;
  inZone: boolean;
  edgePenalty: number;
}

export const ZONE_HALF = 1;
export const CHASE_MARGIN = 0.6;

/** Where a pitch actually lands, given the pitcher's control and the pitch type's movement/wildness. */
export function computePitchLocation(pitcher: PitcherProfile, pitchType: PitchType, aim: AimPoint): PitchLocation {
  const controlFactor = (pitcher.control / 99) * pitchType.controlMultiplier;
  const deviation = (1 - controlFactor) * 0.9;
  const actualX = aim.x + pitchType.breakX + (Math.random() * 2 - 1) * deviation;
  const actualY = aim.y + pitchType.breakY + (Math.random() * 2 - 1) * deviation;

  const dist = Math.max(Math.abs(actualX), Math.abs(actualY));
  const inZone = dist <= ZONE_HALF;
  const edgePenalty = dist > ZONE_HALF ? (dist - ZONE_HALF) * 40 : 0;

  return { actualX, actualY, inZone, edgePenalty };
}
