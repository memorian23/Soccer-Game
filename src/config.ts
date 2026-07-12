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

// Home team defends the LEFT goal, attacks the RIGHT goal. 4-4-2 formation.
export const FORMATION: FormationSlot[] = [
  { role: "GK", fx: 0.05, fy: 0.5 },
  { role: "DF", fx: 0.18, fy: 0.14 },
  { role: "DF", fx: 0.15, fy: 0.37 },
  { role: "DF", fx: 0.15, fy: 0.63 },
  { role: "DF", fx: 0.18, fy: 0.86 },
  { role: "MF", fx: 0.45, fy: 0.14 },
  { role: "MF", fx: 0.42, fy: 0.4 },
  { role: "MF", fx: 0.42, fy: 0.6 },
  { role: "MF", fx: 0.45, fy: 0.86 },
  { role: "FW", fx: 0.74, fy: 0.38 },
  { role: "FW", fx: 0.74, fy: 0.62 },
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

// ---- Defensive AI ----
// How far a defending team pulls its formation toward the ball when NOT under pressure.
export const PRESS_BLEND_BASE = 0.15;
// Blend used for shape-compression (non-covering) players once the opponent has the ball
// deep in this team's own zone. Defenders tuck in tightest, forwards barely track back.
export const PRESS_BLEND_DF = 0.42;
export const PRESS_BLEND_MF = 0.28;
export const PRESS_BLEND_FW = 0.12;
// Fraction of the pitch (measured from a team's own goal, 0..1) that counts as "danger" -
// i.e. worth stepping up to press rather than just holding shape.
export const DANGER_ZONE_FRACTION = 0.62;
// The single closest covering teammate (besides the primary marker) sprints straight at
// the ball instead of holding a blended slot when the opponent is in the danger zone.
export const COVER_CHASE_SPEED_FACTOR = 0.95;

// A tightly marked ball carrier (opponent within this radius) dribbles slower, giving
// defenders a realistic chance to close down and dispossess instead of being outrun.
export const JOCKEY_RADIUS = 30;
export const JOCKEY_SLOW_FACTOR = 0.55;
// The covering defender holds this far off the ball on the goal side rather than running
// straight onto it - close enough to jockey/tackle, far enough that a shot can still be
// struck instead of colliding with the marker's body at point-blank range every time.
export const MARK_DISTANCE = 24;

// Goalkeeper positioning.
export const GK_LINE_OFFSET = 16; // stands this far off the goal line by default
export const GK_MAX_ADVANCE = 90; // furthest the keeper will rush out to close down a shooter
export const GK_RUSH_DISTANCE = 150; // ball-to-goal distance at which the keeper starts rushing out
