import Phaser from "phaser";
import { GAME_WIDTH } from "../config";
import { GameState } from "../state/gameState";
import { sound } from "../audio/sound";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: { state: GameState }) {
    const s = data.state;
    this.cameras.main.setBackgroundColor("#0c1420");

    this.add
      .text(GAME_WIDTH / 2, 220, "경기 종료", {
        fontSize: "44px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 290, s.lastPlay, {
        fontSize: "26px",
        color: "#f5c518",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 350, `최종 스코어  ${s.score.away} : ${s.score.home}`, {
        fontSize: "28px",
        color: "#9fb3c8",
      })
      .setOrigin(0.5);

    const button = this.add
      .rectangle(GAME_WIDTH / 2, 460, 240, 70, 0x2f8f4e)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, 460, "다시 시작", {
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    button.on("pointerover", () => button.setFillStyle(0x38ab5d));
    button.on("pointerout", () => button.setFillStyle(0x2f8f4e));
    button.on("pointerdown", () => {
      sound.buttonClick();
      this.scene.start("MenuScene");
    });
  }
}
