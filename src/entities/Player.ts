import Phaser from "phaser";
import { PLAYER_RADIUS, Role, TeamSide } from "../config";

const MOVE_ANIM_THRESHOLD = 20;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  team: TeamSide;
  role: Role;
  index: number;
  homeSlot: { fx: number; fy: number };
  facing: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0);
  kickCooldownUntil = 0;

  private baseKey: string;
  private runAnimKey: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    baseKey: string,
    team: TeamSide,
    role: Role,
    index: number,
    homeSlot: { fx: number; fy: number },
  ) {
    super(scene, x, y, `${baseKey}_f0`);
    this.team = team;
    this.role = role;
    this.index = index;
    this.homeSlot = homeSlot;
    this.baseKey = baseKey;
    this.runAnimKey = `${baseKey}_run`;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_RADIUS);
    body.setOffset(this.width / 2 - PLAYER_RADIUS, this.height / 2 - PLAYER_RADIUS);
    body.setCollideWorldBounds(false);
    body.setDrag(600, 600);
    body.setMaxSpeed(260);
  }

  /** Updates facing/rotation and plays the run cycle based on current velocity. Call once per frame. */
  refreshVisual() {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();

    if (speed > MOVE_ANIM_THRESHOLD) {
      this.facing.set(body.velocity.x, body.velocity.y).normalize();
      if (!this.anims.isPlaying || this.anims.currentAnim?.key !== this.runAnimKey) {
        this.play(this.runAnimKey, true);
      }
    } else if (this.anims.isPlaying) {
      this.anims.stop();
      this.setTexture(`${this.baseKey}_f0`);
    }

    this.setRotation(Math.atan2(this.facing.y, this.facing.x));
  }

  canKick(now: number): boolean {
    return now >= this.kickCooldownUntil;
  }
}
