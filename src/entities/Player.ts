import Phaser from "phaser";
import { PLAYER_RADIUS, Role, TeamSide } from "../config";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  team: TeamSide;
  role: Role;
  index: number;
  homeSlot: { fx: number; fy: number };
  facing: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0);
  kickCooldownUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    team: TeamSide,
    role: Role,
    index: number,
    homeSlot: { fx: number; fy: number },
  ) {
    super(scene, x, y, textureKey);
    this.team = team;
    this.role = role;
    this.index = index;
    this.homeSlot = homeSlot;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_RADIUS);
    body.setOffset(this.width / 2 - PLAYER_RADIUS, this.height / 2 - PLAYER_RADIUS);
    body.setCollideWorldBounds(false);
    body.setDrag(600, 600);
    body.setMaxSpeed(260);
  }

  setFacingFromVelocity() {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.lengthSq() > 25) {
      this.facing.set(body.velocity.x, body.velocity.y).normalize();
    }
  }

  canKick(now: number): boolean {
    return now >= this.kickCooldownUntil;
  }
}
