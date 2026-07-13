export interface PitchType {
  id: string;
  name: string;
  /** Movement applied on top of the aim point, in strike-zone half-width units. */
  breakX: number;
  breakY: number;
  /** 0-1, how closely the actual landing spot follows the aim point (1 = pinpoint). */
  controlMultiplier: number;
  /** Subtracted from the batter's contact roll when this pitch is swung at. */
  difficulty: number;
}

export const PITCH_TYPES: PitchType[] = [
  { id: "fastball", name: "직구", breakX: 0, breakY: 0, controlMultiplier: 1.0, difficulty: 5 },
  { id: "curve", name: "커브", breakX: -0.35, breakY: 0.3, controlMultiplier: 0.75, difficulty: 18 },
  { id: "slider", name: "슬라이더", breakX: -0.45, breakY: 0.1, controlMultiplier: 0.8, difficulty: 15 },
  { id: "changeup", name: "체인지업", breakX: 0.15, breakY: 0.25, controlMultiplier: 0.85, difficulty: 12 },
];
