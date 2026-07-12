import Phaser from "phaser";
import Player from "../entities/Player";
import Ball from "../entities/Ball";
import { sfx } from "../audio/sfx";
import { FORMATIONS } from "../data/formations";
import { CLUB_NAME } from "../data/squad";
import { teamState } from "../state/teamState";
import { leagueState } from "../state/leagueState";
import MatchRenderer3D from "../render3d/MatchRenderer3D";
import {
  AI_CHASE_SPEED,
  AI_HOLD_SPEED,
  AI_KICK_COOLDOWN,
  AWAY_CHASE_SPEED_MULT,
  AWAY_DRIBBLE_SPEED_MULT,
  AWAY_PRESS_STRENGTH,
  AWAY_SHOT_POWER_MULT,
  AWAY_SHOT_SPREAD,
  BALL_RADIUS,
  COVER_CHASE_SPEED_FACTOR,
  DANGER_ZONE_FRACTION,
  FormationSlot,
  GAME_HEIGHT,
  GAME_WIDTH,
  GK_LINE_OFFSET,
  GK_MAX_ADVANCE,
  GK_RUSH_DISTANCE,
  GOAL_BOTTOM,
  GOAL_DEPTH,
  GOAL_TOP,
  HUMAN_KICK_COOLDOWN,
  JOCKEY_RADIUS,
  JOCKEY_SLOW_FACTOR,
  MARK_DISTANCE,
  MATCH_MINUTES,
  PASS_POWER,
  PITCH,
  PITCH_CENTER_X,
  PITCH_CENTER_Y,
  PITCH_WIDTH,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  POSSESS_RADIUS,
  PRESS_BLEND_BASE,
  PRESS_BLEND_DF,
  PRESS_BLEND_FW,
  PRESS_BLEND_MF,
  Role,
  SECONDS_PER_GAME_MINUTE,
  SHOOT_POWER,
} from "../config";

const HOME_COLOR = 0x2456d6;
const HOME_GK_COLOR = 0x0e2f7a;
const AWAY_COLOR = 0xf2f2f2;
const AWAY_GK_COLOR = 0xe0a300;

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
}

function clampToPitch(p: { x: number; y: number }) {
  p.x = Phaser.Math.Clamp(p.x, PITCH.left + PLAYER_RADIUS, PITCH.right - PLAYER_RADIUS);
  p.y = Phaser.Math.Clamp(p.y, PITCH.top + PLAYER_RADIUS, PITCH.bottom - PLAYER_RADIUS);
}

export default class MatchScene extends Phaser.Scene {
  private home: Player[] = [];
  private away: Player[] = [];
  private homeSlots: FormationSlot[] = [];
  private awaySlots: FormationSlot[] = [];
  private ball!: Ball;
  private ballKickedAt = 0;
  private staleCheckPos = new Phaser.Math.Vector2();
  private staleSince = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private shootKey!: Phaser.Input.Keyboard.Key;
  private passKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private menuKey!: Phaser.Input.Keyboard.Key;

  private scoreHome = 0;
  private scoreAway = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private controlIndicator!: Phaser.GameObjects.Graphics;

  private elapsedRealSeconds = 0;
  private matchOver = false;
  private frozen = false;

  private isLeagueMatch = false;
  private opponentName = "AWAY";

  private renderer3D?: MatchRenderer3D;
  private controlledPlayerRef: Player | null = null;
  private hud?: { root: HTMLDivElement; score: HTMLDivElement; clock: HTMLDivElement; message: HTMLDivElement };

  constructor() {
    super("match");
  }

  init(data: { league?: boolean } = {}) {
    this.isLeagueMatch = !!data.league;
    if (this.isLeagueMatch) {
      const fixture = leagueState.getPlayerFixtureThisRound();
      this.opponentName = fixture ? leagueState.getOpponentName(fixture) : "AWAY";
    } else {
      this.opponentName = "AWAY";
    }
  }

  preload() {
    this.buildPlayerFrames("home", HOME_COLOR, 0xffffff);
    this.buildPlayerFrames("homeGK", HOME_GK_COLOR, 0xffff66);
    this.buildPlayerFrames("away", AWAY_COLOR, 0x333333);
    this.buildPlayerFrames("awayGK", AWAY_GK_COLOR, 0x333333);
    this.buildBallTexture();
  }

  /** Procedurally draws a 4-frame top-down running cycle (legs swing, body + facing dot) for a team/role. */
  private buildPlayerFrames(key: string, fill: number, stroke: number) {
    // Re-entering this scene (menu -> match -> menu -> match) re-runs preload(); textures
    // and animations only need to be generated once.
    if (this.textures.exists(`${key}_f0`)) return;

    const fillColor = Phaser.Display.Color.IntegerToColor(fill);
    const legColor = fillColor.clone().darken(35).color;
    const luminance = 0.299 * fillColor.red + 0.587 * fillColor.green + 0.114 * fillColor.blue;
    const noseColor = luminance > 180 ? 0x1a1a1a : 0xffffff;
    const size = PLAYER_RADIUS * 2 + 10;
    const c = size / 2;
    const strideOffsets = [0, 4, 0, -4];

    strideOffsets.forEach((offset, i) => {
      const g = this.add.graphics();

      // legs (drawn behind the body)
      g.fillStyle(legColor, 1);
      g.fillEllipse(c - 3, c + offset, 5, 9);
      g.fillEllipse(c - 3, c - offset, 5, 9);

      // body
      g.fillStyle(fill, 1);
      g.lineStyle(2, stroke, 1);
      g.fillCircle(c, c, PLAYER_RADIUS);
      g.strokeCircle(c, c, PLAYER_RADIUS);

      // facing indicator (nose), points along local +x
      g.fillStyle(noseColor, 0.95);
      g.fillCircle(c + PLAYER_RADIUS * 0.55, c, 3.2);

      g.generateTexture(`${key}_f${i}`, size, size);
      g.destroy();
    });

    this.anims.create({
      key: `${key}_run`,
      frames: [0, 1, 2, 3].map((i) => ({ key: `${key}_f${i}` })),
      frameRate: 9,
      repeat: -1,
    });
  }

  private buildBallTexture() {
    if (this.textures.exists("ball")) return;

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    g.lineStyle(1.5, 0x222222, 1);
    g.strokeCircle(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    g.generateTexture("ball", BALL_RADIUS * 2, BALL_RADIUS * 2);
    g.destroy();
  }

  create() {
    // Re-entering this scene (menu -> match -> menu -> match) reuses the same Scene
    // instance, so plain JS fields from a previous match must be reset by hand.
    this.home = [];
    this.away = [];
    this.homeSlots = [];
    this.awaySlots = [];
    this.ballKickedAt = 0;
    this.staleCheckPos.set(0, 0);
    this.staleSince = 0;
    this.scoreHome = 0;
    this.scoreAway = 0;
    this.elapsedRealSeconds = 0;
    this.matchOver = false;
    this.frozen = false;

    this.drawPitch();
    this.createTeams();
    this.ball = new Ball(this, PITCH_CENTER_X, PITCH_CENTER_Y, "ball");
    this.ball.setDepth(5);
    // Lets a flying shot/pass bounce off any player's body (crucial for keeper saves / blocks).
    this.physics.add.collider(this.ball, [...this.home, ...this.away]);

    this.setup3D();

    this.controlIndicator = this.add.graphics();
    this.controlIndicator.setDepth(6);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.shootKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.passKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.menuKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 30, "", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.updateScoreText();

    this.clockText = this.add
      .text(GAME_WIDTH / 2, 60, "0'", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#cde9d6",
      })
      .setOrigin(0.5);

    this.messageText = this.add
      .text(GAME_WIDTH / 2, PITCH_CENTER_Y, "", {
        fontFamily: "Arial",
        fontSize: "36px",
        color: "#ffe066",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.add
      .text(10, GAME_HEIGHT - 24, "이동: WASD/방향키   슛: Space   패스: Shift   재시작: R   메뉴: M", {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#9fd8b0",
      })
      .setDepth(10);

    sfx.whistle();
  }

  /**
   * Builds the 3D broadcast-view overlay (a separate Three.js canvas layered above Phaser's,
   * which keeps running the 2D simulation invisibly underneath) and its DOM HUD, then wires up
   * per-frame sync and cleanup on scene shutdown.
   */
  private setup3D() {
    const host = document.getElementById("app");
    if (!host) return;

    this.renderer3D = new MatchRenderer3D(host, GAME_WIDTH, GAME_HEIGHT);
    this.renderer3D.createTeams(this.home, this.away);
    this.buildHud(host);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown3D());

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, () => {
      if (!this.renderer3D) return;
      this.renderer3D.sync(this.home, this.away, this.ball, this.controlledPlayerRef);
      this.renderer3D.render();
      this.syncHud();
    });
  }

  private buildHud(host: HTMLElement) {
    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: `${GAME_WIDTH}px`,
      height: `${GAME_HEIGHT}px`,
      zIndex: "10",
      pointerEvents: "none",
      fontFamily: "Arial, sans-serif",
      color: "#ffffff",
      textShadow: "0 1px 3px rgba(0,0,0,0.85)",
    });

    const score = document.createElement("div");
    Object.assign(score.style, { position: "absolute", top: "14px", left: "0", width: "100%", textAlign: "center", fontSize: "28px", fontWeight: "bold" });
    root.appendChild(score);

    const clock = document.createElement("div");
    Object.assign(clock.style, { position: "absolute", top: "50px", left: "0", width: "100%", textAlign: "center", fontSize: "15px", color: "#cde9d6" });
    root.appendChild(clock);

    const message = document.createElement("div");
    Object.assign(message.style, {
      position: "absolute",
      top: "45%",
      left: "0",
      width: "100%",
      textAlign: "center",
      fontSize: "34px",
      fontWeight: "bold",
      color: "#ffe066",
    });
    root.appendChild(message);

    const hint = document.createElement("div");
    Object.assign(hint.style, { position: "absolute", bottom: "8px", left: "10px", fontSize: "13px", color: "#9fd8b0" });
    hint.textContent = "이동: WASD/방향키   슛: Space   패스: Shift   재시작: R   메뉴: M";
    root.appendChild(hint);

    host.appendChild(root);
    this.hud = { root, score, clock, message };
  }

  /** Mirrors the (now hidden) Phaser HUD text objects into the visible DOM overlay each frame. */
  private syncHud() {
    if (!this.hud) return;
    this.hud.score.textContent = this.scoreText.text;
    this.hud.clock.textContent = this.clockText.text;
    this.hud.message.textContent = this.messageText.text;
  }

  private teardown3D() {
    this.renderer3D?.dispose();
    this.renderer3D = undefined;
    this.hud?.root.remove();
    this.hud = undefined;
  }

  private drawPitch() {
    const g = this.add.graphics();
    g.fillStyle(0x0b3d1f, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // stripes
    const stripeCount = 10;
    const stripeW = (PITCH.right - PITCH.left) / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      g.fillStyle(i % 2 === 0 ? 0x14522b : 0x113f22, 1);
      g.fillRect(PITCH.left + i * stripeW, PITCH.top, stripeW, PITCH.bottom - PITCH.top);
    }

    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeRect(PITCH.left, PITCH.top, PITCH.right - PITCH.left, PITCH.bottom - PITCH.top);

    // halfway line
    g.beginPath();
    g.moveTo(PITCH_CENTER_X, PITCH.top);
    g.lineTo(PITCH_CENTER_X, PITCH.bottom);
    g.strokePath();

    // center circle
    g.strokeCircle(PITCH_CENTER_X, PITCH_CENTER_Y, 70);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(PITCH_CENTER_X, PITCH_CENTER_Y, 3);

    // penalty boxes
    const boxW = 120;
    const boxH = 260;
    g.strokeRect(PITCH.left, PITCH_CENTER_Y - boxH / 2, boxW, boxH);
    g.strokeRect(PITCH.right - boxW, PITCH_CENTER_Y - boxH / 2, boxW, boxH);

    const smallW = 50;
    const smallH = 140;
    g.strokeRect(PITCH.left, PITCH_CENTER_Y - smallH / 2, smallW, smallH);
    g.strokeRect(PITCH.right - smallW, PITCH_CENTER_Y - smallH / 2, smallW, smallH);

    // goals
    g.lineStyle(4, 0xffffff, 1);
    g.strokeRect(PITCH.left - GOAL_DEPTH, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
    g.strokeRect(PITCH.right, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
  }

  private createTeams() {
    // Home uses whatever formation/lineup was chosen on the tactics & squad screens; away
    // always fields the default 2-2-1 opponent.
    const lineup = teamState.getLineup();
    this.homeSlots = lineup.map((entry) => entry.slot);
    lineup.forEach(({ slot, player }, i) => {
      const hx = PITCH.left + slot.fx * (PITCH.right - PITCH.left);
      const hy = PITCH.top + slot.fy * (PITCH.bottom - PITCH.top);
      const homeKey = slot.role === "GK" ? "homeGK" : "home";
      const h = new Player(this, hx, hy, homeKey, "home", slot.role, i, { fx: slot.fx, fy: slot.fy }, player?.name);
      h.setDepth(4);
      this.home.push(h);
    });

    this.awaySlots = FORMATIONS["221"].slots;
    this.awaySlots.forEach((slot, i) => {
      const ax = PITCH.left + (1 - slot.fx) * (PITCH.right - PITCH.left);
      const ay = PITCH.top + slot.fy * (PITCH.bottom - PITCH.top);
      const awayKey = slot.role === "GK" ? "awayGK" : "away";
      const a = new Player(this, ax, ay, awayKey, "away", slot.role, i, { fx: 1 - slot.fx, fy: slot.fy });
      a.setDepth(4);
      this.away.push(a);
    });
  }

  private kickoffReset() {
    this.homeSlots.forEach((slot, i) => {
      const h = this.home[i];
      h.setPosition(PITCH.left + slot.fx * (PITCH.right - PITCH.left), PITCH.top + slot.fy * (PITCH.bottom - PITCH.top));
      (h.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      h.facing.set(1, 0);
    });
    this.awaySlots.forEach((slot, i) => {
      const a = this.away[i];
      a.setPosition(PITCH.left + (1 - slot.fx) * (PITCH.right - PITCH.left), PITCH.top + slot.fy * (PITCH.bottom - PITCH.top));
      (a.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      a.facing.set(-1, 0);
    });
    this.ball.setPosition(PITCH_CENTER_X, PITCH_CENTER_Y);
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.staleCheckPos.set(PITCH_CENTER_X, PITCH_CENTER_Y);
    this.staleSince = this.time.now;
  }

  /**
   * Anti-deadlock safeguard: a marked ball carrier squeezed against a boundary (most often a
   * corner) can get stuck in a tug-of-war with a defender, with possession flip-flopping every
   * frame and the ball barely moving. If it hasn't travelled meaningfully in a few seconds,
   * nudge it back toward open space with no velocity so play can restart cleanly.
   */
  private breakStalemateIfStuck(now: number) {
    const moved = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, this.staleCheckPos.x, this.staleCheckPos.y);
    if (moved > 45) {
      this.staleCheckPos.set(this.ball.x, this.ball.y);
      this.staleSince = now;
      return;
    }
    if (now - this.staleSince <= 3500) return;

    const dx = PITCH_CENTER_X - this.ball.x;
    const dy = PITCH_CENTER_Y - this.ball.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = Phaser.Math.Clamp(this.ball.x + (dx / len) * 130, PITCH.left + 40, PITCH.right - 40);
    const ny = Phaser.Math.Clamp(this.ball.y + (dy / len) * 130, PITCH.top + 40, PITCH.bottom - 40);
    this.ball.setPosition(nx, ny);
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.staleCheckPos.set(nx, ny);
    this.staleSince = now;
  }

  private nearest(players: Player[], point: { x: number; y: number }): { player: Player; d: number } {
    let best = players[0];
    let bestD = dist(players[0], point);
    for (let i = 1; i < players.length; i++) {
      const d = dist(players[i], point);
      if (d < bestD) {
        bestD = d;
        best = players[i];
      }
    }
    return { player: best, d: bestD };
  }

  private seek(p: Player, target: { x: number; y: number }, speed: number) {
    const body = p.body as Phaser.Physics.Arcade.Body;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) {
      body.setVelocity(0, 0);
      return;
    }
    body.setVelocity((dx / d) * speed, (dy / d) * speed);
  }

  private holdFormationTarget(p: Player, blend: number = PRESS_BLEND_BASE): { x: number; y: number } {
    const slotX = PITCH.left + p.homeSlot.fx * (PITCH.right - PITCH.left);
    const slotY = PITCH.top + p.homeSlot.fy * (PITCH.bottom - PITCH.top);
    const x = Phaser.Math.Linear(slotX, this.ball.x, blend);
    const y = Phaser.Math.Linear(slotY, this.ball.y, blend);
    const target = { x, y };
    clampToPitch(target);
    return target;
  }

  private pressBlendForRole(role: Role): number {
    if (role === "DF") return PRESS_BLEND_DF;
    if (role === "MF") return PRESS_BLEND_MF;
    return PRESS_BLEND_FW;
  }

  /** Positions a covering defender goal-side of the ball, at marking distance rather than on top of it. */
  private markingTarget(p: Player): { x: number; y: number } {
    const ownGoalX = p.team === "home" ? PITCH.left : PITCH.right;
    const dx = ownGoalX - this.ball.x;
    const dy = PITCH_CENTER_Y - this.ball.y;
    const len = Math.hypot(dx, dy) || 1;
    const target = {
      x: this.ball.x + (dx / len) * MARK_DISTANCE,
      y: this.ball.y + (dy / len) * MARK_DISTANCE,
    };
    clampToPitch(target);
    return target;
  }

  /** Keeper hugs the goal line, tracks the ball vertically, and only rushes out when a shot/loose ball is close. */
  private goalkeeperTarget(p: Player): { x: number; y: number } {
    const ownGoalX = p.team === "home" ? PITCH.left : PITCH.right;
    const forward = p.team === "home" ? 1 : -1;
    const lineX = ownGoalX + forward * GK_LINE_OFFSET;
    const maxAdvanceX = ownGoalX + forward * GK_MAX_ADVANCE;

    const distToGoalMouth = dist(this.ball, { x: ownGoalX, y: PITCH_CENTER_Y });
    const rushT = Phaser.Math.Clamp(1 - distToGoalMouth / GK_RUSH_DISTANCE, 0, 1);
    const targetX = Phaser.Math.Linear(lineX, maxAdvanceX, rushT * 0.7);
    const targetY = Phaser.Math.Clamp(this.ball.y, GOAL_TOP + 8, GOAL_BOTTOM - 8);

    const target = { x: targetX, y: targetY };
    clampToPitch(target);
    return target;
  }

  /**
   * Moves every non-primary teammate: the closest one presses the ball directly when the
   * opponent controls it in this team's danger zone, others compress their formation shape
   * toward the ball (more so for defenders), and the goalkeeper always uses its own logic.
   */
  private updateSupportPlayers(team: Player[], primary: Player, opponentHasBall: boolean, dangerZone: boolean, pressStrength: number = 1) {
    const others = team.filter((p) => p !== primary);
    others.sort((a, b) => dist(a, this.ball) - dist(b, this.ball));

    others.forEach((p, idx) => {
      if (p.role === "GK") {
        // Floor it so a weak opponent's keeper is sluggish, not frozen in place.
        this.seek(p, this.goalkeeperTarget(p), AI_HOLD_SPEED * Math.max(pressStrength, 0.55));
        return;
      }
      if (opponentHasBall && dangerZone && idx === 0) {
        this.seek(p, this.markingTarget(p), AI_CHASE_SPEED * COVER_CHASE_SPEED_FACTOR * pressStrength);
        return;
      }
      const blend = opponentHasBall && dangerZone ? this.pressBlendForRole(p.role) * pressStrength : PRESS_BLEND_BASE;
      this.seek(p, this.holdFormationTarget(p, blend), AI_HOLD_SPEED);
    });
  }

  private glueBallTo(p: Player) {
    const body = p.body as Phaser.Physics.Arcade.Body;
    const offset = PLAYER_RADIUS + BALL_RADIUS + 3;
    // Clamp the dribble target to stay inside the pitch. Without this, a carrier hugging a
    // touchline/corner would glue the ball just past the boundary, constrainBall() would snap
    // it back in, and the two would fight every frame - looking like the ball teleporting
    // back and forth while drifting into the corner.
    const targetX = Phaser.Math.Clamp(p.x + p.facing.x * offset, PITCH.left + BALL_RADIUS, PITCH.right - BALL_RADIUS);
    const targetY = Phaser.Math.Clamp(p.y + p.facing.y * offset, PITCH.top + BALL_RADIUS, PITCH.bottom - BALL_RADIUS);
    this.ball.x = Phaser.Math.Linear(this.ball.x, targetX, 0.45);
    this.ball.y = Phaser.Math.Linear(this.ball.y, targetY, 0.45);
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(body.velocity.x, body.velocity.y);
  }

  private kickBall(p: Player, dir: Phaser.Math.Vector2, power: number, now: number) {
    const n = dir.clone().normalize();
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(n.x * power, n.y * power);
    this.ballKickedAt = now;
    p.kickCooldownUntil = now + (p.team === "home" ? HUMAN_KICK_COOLDOWN : AI_KICK_COOLDOWN);
    sfx.kick();
  }

  /**
   * Baseline AI for whichever player currently has the ball and isn't under direct human
   * control: dribble toward the opponent's goal (slowed if tightly marked), shoot once close
   * enough, or occasionally lay it off to a more advanced teammate. Used for the away team
   * at all times, and for the home team whenever the human isn't actively pressing a key -
   * without this, an idle human carrier would simply stand still holding the ball forever.
   */
  private aiDribbleAndShoot(carrier: Player, now: number, opponents: Player[]) {
    const attackingRight = carrier.team === "home";
    const goal = { x: attackingRight ? PITCH.right + 10 : PITCH.left - 10, y: PITCH_CENTER_Y };
    const dribbleDir = new Phaser.Math.Vector2(goal.x - carrier.x, goal.y - carrier.y).normalize();
    const marker = this.nearest(opponents, carrier).d;
    const jockeyScale = marker < JOCKEY_RADIUS ? JOCKEY_SLOW_FACTOR : 1;
    // Vector2#scale mutates in place, so capture facing (a unit vector) before scaling the
    // same object down into a velocity - otherwise facing ends up with the velocity's
    // magnitude instead of length 1, and glueBallTo's offset (facing * ~24px) explodes into
    // hundreds of pixels, flinging the ball across the pitch.
    carrier.facing.set(dribbleDir.x, dribbleDir.y);
    const dribbleSpeedMult = carrier.team === "away" ? AWAY_DRIBBLE_SPEED_MULT : 1;
    const v = dribbleDir.scale(AI_CHASE_SPEED * 0.92 * jockeyScale * dribbleSpeedMult);
    (carrier.body as Phaser.Physics.Arcade.Body).setVelocity(v.x, v.y);
    this.glueBallTo(carrier);

    if (!carrier.canKick(now)) return;

    const distToGoal = dist(carrier, goal);
    if (distToGoal < 240) {
      // The away opponent aims and strikes the ball noticeably worse than home's own AI, so a
      // human defending against it has a real chance the shot goes wide or lacks power.
      const spreadRange = carrier.team === "away" ? AWAY_SHOT_SPREAD : 0.22;
      const powerMult = carrier.team === "away" ? AWAY_SHOT_POWER_MULT : 0.95;
      const spread = Phaser.Math.FloatBetween(-spreadRange, spreadRange);
      const aim = new Phaser.Math.Vector2(goal.x - carrier.x, goal.y - carrier.y + spread * 160);
      this.kickBall(carrier, aim, SHOOT_POWER * powerMult, now);
      return;
    }

    if (Phaser.Math.Between(0, 1000) < 30) {
      const own = carrier.team === "home" ? this.home : this.away;
      const teammates = own.filter((p) => p !== carrier && (attackingRight ? p.x > carrier.x - 40 : p.x < carrier.x + 40));
      if (teammates.length > 0) {
        const target = this.nearest(teammates, goal).player;
        const dir = new Phaser.Math.Vector2(target.x - carrier.x, target.y - carrier.y);
        this.kickBall(carrier, dir, PASS_POWER, now);
      }
    }
  }

  private handleGoalCheck() {
    const inGoalY = this.ball.y > GOAL_TOP + BALL_RADIUS && this.ball.y < GOAL_BOTTOM - BALL_RADIUS;
    if (!inGoalY) return;

    if (this.ball.x <= PITCH.left - GOAL_DEPTH / 2) {
      this.scoreAway++;
      this.onGoal("AWAY");
    } else if (this.ball.x >= PITCH.right + GOAL_DEPTH / 2) {
      this.scoreHome++;
      this.onGoal("HOME");
    }
  }

  private onGoal(who: string) {
    this.frozen = true;
    sfx.goal();
    this.messageText.setText(`GOAL! ${who}`);
    this.updateScoreText();
    this.time.delayedCall(1400, () => {
      this.messageText.setText("");
      this.kickoffReset();
      this.frozen = false;
    });
  }

  private updateScoreText() {
    const homeLabel = this.isLeagueMatch ? CLUB_NAME : "HOME";
    const awayLabel = this.isLeagueMatch ? this.opponentName : "AWAY";
    this.scoreText.setText(`${homeLabel} ${this.scoreHome} : ${this.scoreAway} ${awayLabel}`);
  }

  /**
   * Keeps the ball on the pitch. Anything that leaves through a touchline, or through the
   * end line outside the goal mouth, is treated like a throw-in/goal-kick: it's placed back
   * in open space with no velocity instead of bouncing, which used to let it get trapped
   * oscillating in a corner pocket between the two boundary checks with players jammed
   * around it. Inside the goal mouth it's still allowed to travel on into the net.
   */
  private constrainBall() {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;

    const inGoalMouthY = this.ball.y > GOAL_TOP + BALL_RADIUS && this.ball.y < GOAL_BOTTOM - BALL_RADIUS;
    const crossedTouchline = this.ball.y < PITCH.top + BALL_RADIUS || this.ball.y > PITCH.bottom - BALL_RADIUS;
    const crossedEndlineOutsideGoal = !inGoalMouthY && (this.ball.x < PITCH.left + BALL_RADIUS || this.ball.x > PITCH.right - BALL_RADIUS);

    if (crossedTouchline || crossedEndlineOutsideGoal) {
      const margin = 26;
      const x = Phaser.Math.Clamp(this.ball.x, PITCH.left + margin, PITCH.right - margin);
      const y = Phaser.Math.Clamp(this.ball.y, PITCH.top + margin, PITCH.bottom - margin);
      this.ball.setPosition(x, y);
      body.setVelocity(0, 0);
      return;
    }

    if (inGoalMouthY) {
      if (this.ball.x < PITCH.left - GOAL_DEPTH + BALL_RADIUS) {
        this.ball.x = PITCH.left - GOAL_DEPTH + BALL_RADIUS;
        body.velocity.x *= -0.4;
      }
      if (this.ball.x > PITCH.right + GOAL_DEPTH - BALL_RADIUS) {
        this.ball.x = PITCH.right + GOAL_DEPTH - BALL_RADIUS;
        body.velocity.x *= -0.4;
      }
    }
  }

  update(_time: number, delta: number) {
    if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
      this.scene.start("menu");
      return;
    }

    if (this.matchOver) return;

    const now = this.time.now;

    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scoreHome = 0;
      this.scoreAway = 0;
      this.elapsedRealSeconds = 0;
      this.matchOver = false;
      this.updateScoreText();
      this.messageText.setText("");
      this.kickoffReset();
    }

    if (this.frozen) {
      this.controlIndicator.clear();
      return;
    }

    this.elapsedRealSeconds += delta / 1000;
    const gameMinute = Math.min(MATCH_MINUTES, Math.floor(this.elapsedRealSeconds / SECONDS_PER_GAME_MINUTE));
    this.clockText.setText(`${gameMinute}'`);
    if (gameMinute >= MATCH_MINUTES && !this.matchOver) {
      this.matchOver = true;
      sfx.whistle();
      this.messageText.setText("FULL TIME");
      for (const p of [...this.home, ...this.away]) {
        (p.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        p.refreshVisual();
      }
      (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      if (this.isLeagueMatch) {
        leagueState.recordPlayerResult(this.scoreHome, this.scoreAway);
      }
      this.time.delayedCall(1800, () => {
        this.scene.start("result", {
          home: this.scoreHome,
          away: this.scoreAway,
          league: this.isLeagueMatch,
          homeLabel: this.isLeagueMatch ? CLUB_NAME : "HOME",
          awayLabel: this.isLeagueMatch ? this.opponentName : "AWAY",
        });
      });
      return;
    }

    const homeNearest = this.nearest(this.home, this.ball);
    const awayNearest = this.nearest(this.away, this.ball);
    const controlledPlayer = homeNearest.player;
    this.controlledPlayerRef = controlledPlayer;

    const globalCarrierIsHome = homeNearest.d <= awayNearest.d;
    const carrierDist = globalCarrierIsHome ? homeNearest.d : awayNearest.d;
    const hasCarrier = carrierDist < POSSESS_RADIUS && now - this.ballKickedAt > 150;
    const carrier = globalCarrierIsHome ? homeNearest.player : awayNearest.player;

    // ---- Human controlled player movement ----
    let ix = 0;
    let iy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) ix -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) ix += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) iy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) iy += 1;

    let controlledSpeedScale = 1;
    if (hasCarrier && carrier === controlledPlayer) {
      const marker = this.nearest(this.away, controlledPlayer).d;
      if (marker < JOCKEY_RADIUS) controlledSpeedScale = JOCKEY_SLOW_FACTOR;
    }

    const body = controlledPlayer.body as Phaser.Physics.Arcade.Body;
    if (ix !== 0 || iy !== 0) {
      const v = new Phaser.Math.Vector2(ix, iy).normalize().scale(PLAYER_SPEED * controlledSpeedScale);
      body.setVelocity(v.x, v.y);
      controlledPlayer.facing.set(ix, iy).normalize();
    } else if (!hasCarrier || carrier !== controlledPlayer) {
      // No manual input right now: auto-press the ball so the nearest defender never
      // stands idle while the human reacts. Any key press instantly takes back control.
      this.seek(controlledPlayer, this.ball, AI_CHASE_SPEED * controlledSpeedScale);
    } else {
      body.setVelocity(0, 0);
    }

    // ---- AI: away nearest player (chase or dribble) ----
    if (awayNearest.player !== carrier || !hasCarrier) {
      this.seek(awayNearest.player, this.ball, AI_CHASE_SPEED * AWAY_CHASE_SPEED_MULT);
    }

    // ---- Support players: press when defending the danger zone, else hold shape ----
    const ballFxHome = (this.ball.x - PITCH.left) / PITCH_WIDTH;
    const homeDangerZone = ballFxHome < DANGER_ZONE_FRACTION;
    const awayDangerZone = ballFxHome > 1 - DANGER_ZONE_FRACTION;
    const awayHasBall = hasCarrier && carrier.team === "away";
    const homeHasBall = hasCarrier && carrier.team === "home";

    // Home's AI teammates keep full strength; the away opponent is deliberately softened
    // (see AWAY_PRESS_STRENGTH) so a human player has room to dribble/attack past them.
    this.updateSupportPlayers(this.home, controlledPlayer, awayHasBall, homeDangerZone);
    this.updateSupportPlayers(this.away, awayNearest.player, homeHasBall, awayDangerZone, AWAY_PRESS_STRENGTH);

    // ---- Carrier behaviour ----
    const humanActingOnBall = (ix !== 0 || iy !== 0) || Phaser.Input.Keyboard.JustDown(this.shootKey) || Phaser.Input.Keyboard.JustDown(this.passKey);

    if (hasCarrier && carrier === controlledPlayer && humanActingOnBall) {
      this.glueBallTo(carrier);
      if (Phaser.Input.Keyboard.JustDown(this.shootKey) && carrier.canKick(now)) {
        const dir = new Phaser.Math.Vector2(PITCH.right + 10 - carrier.x, PITCH_CENTER_Y - carrier.y);
        this.kickBall(carrier, dir, SHOOT_POWER, now);
      } else if (Phaser.Input.Keyboard.JustDown(this.passKey) && carrier.canKick(now)) {
        const teammates = this.home.filter((p) => p !== carrier);
        const target = this.nearest(teammates, { x: carrier.x + carrier.facing.x * 160, y: carrier.y + carrier.facing.y * 160 }).player;
        const dir = new Phaser.Math.Vector2(target.x - carrier.x, target.y - carrier.y);
        this.kickBall(carrier, dir, PASS_POWER, now);
      }
    } else if (hasCarrier && carrier === controlledPlayer) {
      // Human isn't actively directing this possession right now - let a baseline AI
      // attack instead of freezing in place. Any key press resumes manual control at once.
      this.aiDribbleAndShoot(carrier, now, this.away);
    } else if (hasCarrier && carrier === awayNearest.player) {
      this.aiDribbleAndShoot(carrier, now, this.home);
    }

    // ---- Physics / bounds ----
    this.constrainBall();
    this.handleGoalCheck();
    this.breakStalemateIfStuck(now);

    const ballSpeed = (this.ball.body as Phaser.Physics.Arcade.Body).velocity.length();
    this.ball.rotation += (ballSpeed / PLAYER_RADIUS) * (delta / 1000);

    for (const p of [...this.home, ...this.away]) {
      clampToPitch(p);
      p.refreshVisual();
    }

    // ---- Selection indicator ----
    this.controlIndicator.clear();
    this.controlIndicator.fillStyle(0xffe066, 1);
    const ix2 = controlledPlayer.x;
    const iy2 = controlledPlayer.y - PLAYER_RADIUS - 14;
    this.controlIndicator.fillTriangle(ix2 - 6, iy2 - 8, ix2 + 6, iy2 - 8, ix2, iy2);
  }
}
