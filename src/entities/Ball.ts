import Phaser from "phaser";
import { BALL_RADIUS } from "../config";

export default class Ball extends Phaser.Physics.Arcade.Sprite {
  lastTouchedBy: { team: "home" | "away" } | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(BALL_RADIUS);
    body.setOffset(this.width / 2 - BALL_RADIUS, this.height / 2 - BALL_RADIUS);
    body.setCollideWorldBounds(false);
    body.setBounce(0.6, 0.6);
    body.setDrag(300, 300);
    body.setMaxSpeed(700);
  }
}
