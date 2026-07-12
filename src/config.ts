export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 700;

export const PITCH = {
  left: 40,
  right: GAME_WIDTH - 40,
  top: 90,
  bottom: GAME_HEIGHT - 40,
};

export const PITCH_WIDTH = PITCH.right - PITCH.left;
export const PITCH_HEIGHT = PITCH.bottom - PITCH.top;
export const PITCH_CENTER_X = (PITCH.left + PITCH.right) / 2;
export const PITCH_CENTER_Y = (PITCH.top + PITCH.bottom) / 2;

export const GOAL_HEIGHT = 140;
export const GOAL_DEPTH = 22;
export const GOAL_TOP = PITCH_CENTER_Y - GOAL_HEIGHT / 2;
export const GOAL_BOTTOM = PITCH_CENTER_Y + GOAL_HEIGHT / 2;

export type TeamSide = "home" | "away";
export type Role = "GK" | "DF" | "MF" | "FW";

export interface FormationSlot {
  role: Role;
  fx: number; // 0 = own goal line, 1 = opponent goal line (home team orientation)
  fy: number; // 0 = top touchline, 1 = bottom touchline
}

// Home team defends the LEFT goal, attacks the RIGHT goal.
export const FORMATION: FormationSlot[] = [
  { role: "GK", fx: 0.05, fy: 0.5 },
  { role: "DF", fx: 0.22, fy: 0.28 },
  { role: "DF", fx: 0.22, fy: 0.72 },
  { role: "MF", fx: 0.52, fy: 0.32 },
  { role: "MF", fx: 0.52, fy: 0.68 },
  { role: "FW", fx: 0.78, fy: 0.5 },
];

export const PLAYER_RADIUS = 13;
export const BALL_RADIUS = 8;

export const PLAYER_SPEED = 205;
export const AI_CHASE_SPEED = 195;
export const AI_HOLD_SPEED = 150;

export const POSSESS_RADIUS = 20;
export const KICK_RADIUS = 24;
export const SHOOT_POWER = 620;
export const PASS_POWER = 420;
export const AI_KICK_COOLDOWN = 550;
export const HUMAN_KICK_COOLDOWN = 260;

export const MATCH_MINUTES = 90;
export const SECONDS_PER_GAME_MINUTE = 0.9; // real seconds per in-game minute
