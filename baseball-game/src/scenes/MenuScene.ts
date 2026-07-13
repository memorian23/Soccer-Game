import Phaser from "phaser";
import { GAME_WIDTH } from "../config";
import { AWAY_TEAM, HOME_TEAM } from "../data/team";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0c1420");

    this.add
      .text(GAME_WIDTH / 2, 160, "BASEBALL GAME", {
        fontSize: "48px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 230, `${AWAY_TEAM.name}  vs  ${HOME_TEAM.name}`, {
        fontSize: "24px",
        color: "#9fb3c8",
      })
      .setOrigin(0.5);

    const button = this.add
      .rectangle(GAME_WIDTH / 2, 380, 240, 70, 0x2f8f4e)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, 380, "경기 시작", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    button.on("pointerover", () => button.setFillStyle(0x38ab5d));
    button.on("pointerout", () => button.setFillStyle(0x2f8f4e));
    button.on("pointerdown", () => this.scene.start("GameScene"));
  }
}
