import Phaser from "phaser";
import Player from "../entities/Player";
import Ball from "../entities/Ball";
import {
  AI_CHASE_SPEED,
  AI_HOLD_SPEED,
  AI_KICK_COOLDOWN,
  BALL_RADIUS,
  FORMATION,
  GAME_HEIGHT,
  GAME_WIDTH,
  GOAL_BOTTOM,
  GOAL_DEPTH,
  GOAL_TOP,
  HUMAN_KICK_COOLDOWN,
  MATCH_MINUTES,
  PASS_POWER,
  PITCH,
  PITCH_CENTER_X,
  PITCH_CENTER_Y,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  POSSESS_RADIUS,
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
  private ball!: Ball;
  private ballKickedAt = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private shootKey!: Phaser.Input.Keyboard.Key;
  private passKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;

  private scoreHome = 0;
  private scoreAway = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private controlIndicator!: Phaser.GameObjects.Graphics;

  private elapsedRealSeconds = 0;
  private matchOver = false;
  private frozen = false;

  constructor() {
    super("match");
  }

  preload() {
    this.buildTexture("home", HOME_COLOR, 0xffffff);
    this.buildTexture("homeGK", HOME_GK_COLOR, 0xffff66);
    this.buildTexture("away", AWAY_COLOR, 0x333333);
    this.buildTexture("awayGK", AWAY_GK_COLOR, 0x333333);
    this.buildBallTexture();
  }

  private buildTexture(key: string, fill: number, stroke: number) {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.lineStyle(2, stroke, 1);
    g.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
    g.strokeCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
    g.generateTexture(key, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    g.destroy();
  }

  private buildBallTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    g.lineStyle(1.5, 0x222222, 1);
    g.strokeCircle(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    g.generateTexture("ball", BALL_RADIUS * 2, BALL_RADIUS * 2);
    g.destroy();
  }

  create() {
    this.drawPitch();
    this.createTeams();
    this.ball = new Ball(this, PITCH_CENTER_X, PITCH_CENTER_Y, "ball");
    this.ball.setDepth(5);

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

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 30, "HOME 0 : 0 AWAY", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

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
      .text(10, GAME_HEIGHT - 24, "이동: WASD/방향키   슛: Space   패스: Shift   재시작: R", {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#9fd8b0",
      })
      .setDepth(10);
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
    FORMATION.forEach((slot, i) => {
      const hx = PITCH.left + slot.fx * (PITCH.right - PITCH.left);
      const hy = PITCH.top + slot.fy * (PITCH.bottom - PITCH.top);
      const ax = PITCH.left + (1 - slot.fx) * (PITCH.right - PITCH.left);
      const ay = PITCH.top + slot.fy * (PITCH.bottom - PITCH.top);

      const homeTex = slot.role === "GK" ? "homeGK" : "home";
      const awayTex = slot.role === "GK" ? "awayGK" : "away";

      const h = new Player(this, hx, hy, homeTex, "home", slot.role, i, { fx: slot.fx, fy: slot.fy });
      const a = new Player(this, ax, ay, awayTex, "away", slot.role, i, { fx: 1 - slot.fx, fy: slot.fy });
      h.setDepth(4);
      a.setDepth(4);
      this.home.push(h);
      this.away.push(a);
    });
  }

  private kickoffReset() {
    FORMATION.forEach((slot, i) => {
      const h = this.home[i];
      const a = this.away[i];
      h.setPosition(PITCH.left + slot.fx * (PITCH.right - PITCH.left), PITCH.top + slot.fy * (PITCH.bottom - PITCH.top));
      a.setPosition(PITCH.left + (1 - slot.fx) * (PITCH.right - PITCH.left), PITCH.top + slot.fy * (PITCH.bottom - PITCH.top));
      (h.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      (a.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      h.facing.set(1, 0);
      a.facing.set(-1, 0);
    });
    this.ball.setPosition(PITCH_CENTER_X, PITCH_CENTER_Y);
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
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

  private holdFormationTarget(p: Player): { x: number; y: number } {
    const slotX = PITCH.left + p.homeSlot.fx * (PITCH.right - PITCH.left);
    const slotY = PITCH.top + p.homeSlot.fy * (PITCH.bottom - PITCH.top);
    const blend = 0.22;
    const x = Phaser.Math.Linear(slotX, this.ball.x, blend);
    const y = Phaser.Math.Linear(slotY, this.ball.y, blend);
    const target = { x, y };
    clampToPitch(target);
    return target;
  }

  private glueBallTo(p: Player) {
    const body = p.body as Phaser.Physics.Arcade.Body;
    const offset = PLAYER_RADIUS + BALL_RADIUS + 3;
    const targetX = p.x + p.facing.x * offset;
    const targetY = p.y + p.facing.y * offset;
    this.ball.x = Phaser.Math.Linear(this.ball.x, targetX, 0.45);
    this.ball.y = Phaser.Math.Linear(this.ball.y, targetY, 0.45);
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(body.velocity.x, body.velocity.y);
  }

  private kickBall(p: Player, dir: Phaser.Math.Vector2, power: number, now: number) {
    const n = dir.clone().normalize();
    (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(n.x * power, n.y * power);
    this.ballKickedAt = now;
    p.kickCooldownUntil = now + (p.team === "home" ? HUMAN_KICK_COOLDOWN : AI_KICK_COOLDOWN);
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
    this.messageText.setText(`GOAL! ${who}`);
    this.updateScoreText();
    this.time.delayedCall(1400, () => {
      this.messageText.setText("");
      this.kickoffReset();
      this.frozen = false;
    });
  }

  private updateScoreText() {
    this.scoreText.setText(`HOME ${this.scoreHome} : ${this.scoreAway} AWAY`);
  }

  private constrainBall() {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;

    if (this.ball.y < PITCH.top + BALL_RADIUS) {
      this.ball.y = PITCH.top + BALL_RADIUS;
      body.velocity.y *= -0.6;
    }
    if (this.ball.y > PITCH.bottom - BALL_RADIUS) {
      this.ball.y = PITCH.bottom - BALL_RADIUS;
      body.velocity.y *= -0.6;
    }

    const inGoalMouthY = this.ball.y > GOAL_TOP + BALL_RADIUS && this.ball.y < GOAL_BOTTOM - BALL_RADIUS;

    if (!inGoalMouthY) {
      if (this.ball.x < PITCH.left + BALL_RADIUS) {
        this.ball.x = PITCH.left + BALL_RADIUS;
        body.velocity.x *= -0.6;
      }
      if (this.ball.x > PITCH.right - BALL_RADIUS) {
        this.ball.x = PITCH.right - BALL_RADIUS;
        body.velocity.x *= -0.6;
      }
    } else {
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
      this.messageText.setText("FULL TIME");
      this.home.forEach((p) => (p.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0));
      this.away.forEach((p) => (p.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0));
      (this.ball.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }

    const homeNearest = this.nearest(this.home, this.ball);
    const awayNearest = this.nearest(this.away, this.ball);
    const controlledPlayer = homeNearest.player;

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

    const body = controlledPlayer.body as Phaser.Physics.Arcade.Body;
    if (ix !== 0 || iy !== 0) {
      const v = new Phaser.Math.Vector2(ix, iy).normalize().scale(PLAYER_SPEED);
      body.setVelocity(v.x, v.y);
      controlledPlayer.facing.set(ix, iy).normalize();
    } else {
      body.setVelocity(0, 0);
    }

    // ---- AI: away nearest player (chase or dribble) ----
    if (awayNearest.player !== carrier || !hasCarrier) {
      this.seek(awayNearest.player, this.ball, AI_CHASE_SPEED);
      awayNearest.player.setFacingFromVelocity();
    }

    // ---- Hold-formation support for everyone else ----
    for (const p of this.home) {
      if (p === controlledPlayer) continue;
      this.seek(p, this.holdFormationTarget(p), AI_HOLD_SPEED);
      p.setFacingFromVelocity();
    }
    for (const p of this.away) {
      if (p === awayNearest.player) continue;
      this.seek(p, this.holdFormationTarget(p), AI_HOLD_SPEED);
      p.setFacingFromVelocity();
    }

    // ---- Carrier behaviour ----
    if (hasCarrier && carrier === controlledPlayer) {
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
    } else if (hasCarrier && carrier === awayNearest.player) {
      const goal = { x: PITCH.left - 10, y: PITCH_CENTER_Y };
      const toGoal = new Phaser.Math.Vector2(goal.x - carrier.x, goal.y - carrier.y);
      const dribbleDir = toGoal.clone().normalize();
      const v = dribbleDir.scale(AI_CHASE_SPEED * 0.92);
      (carrier.body as Phaser.Physics.Arcade.Body).setVelocity(v.x, v.y);
      carrier.facing.set(dribbleDir.x, dribbleDir.y);
      this.glueBallTo(carrier);

      const distToGoal = dist(carrier, goal);
      if (carrier.canKick(now)) {
        if (distToGoal < 240) {
          const spread = Phaser.Math.FloatBetween(-0.22, 0.22);
          const aim = new Phaser.Math.Vector2(goal.x - carrier.x, goal.y - carrier.y + spread * 160);
          this.kickBall(carrier, aim, SHOOT_POWER * 0.95, now);
        } else if (Phaser.Math.Between(0, 1000) < 6) {
          const teammates = this.away.filter((p) => p !== carrier && p.x < carrier.x + 40);
          if (teammates.length > 0) {
            const target = this.nearest(teammates, goal).player;
            const dir = new Phaser.Math.Vector2(target.x - carrier.x, target.y - carrier.y);
            this.kickBall(carrier, dir, PASS_POWER, now);
          }
        }
      }
    }

    // ---- Physics / bounds ----
    this.constrainBall();
    this.handleGoalCheck();

    for (const p of [...this.home, ...this.away]) {
      clampToPitch(p);
    }

    // ---- Selection indicator ----
    this.controlIndicator.clear();
    this.controlIndicator.fillStyle(0xffe066, 1);
    const ix2 = controlledPlayer.x;
    const iy2 = controlledPlayer.y - PLAYER_RADIUS - 14;
    this.controlIndicator.fillTriangle(ix2 - 6, iy2 - 8, ix2 + 6, iy2 - 8, ix2, iy2);
  }
}
