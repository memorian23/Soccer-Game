import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { FORMATIONS } from "../data/formations";
import { teamState } from "../state/teamState";
import { makeButton } from "../ui/button";

export default class MenuScene extends Phaser.Scene {
  private formationLabel!: Phaser.GameObjects.Text;

  constructor() {
    super("menu");
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b3d1f).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 140, "SOCCER GAME", {
        fontFamily: "Arial",
        fontSize: "48px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.formationLabel = this.add
      .text(GAME_WIDTH / 2, 200, "", { fontFamily: "Arial", fontSize: "18px", color: "#9fd8b0" })
      .setOrigin(0.5);

    makeButton(this, GAME_WIDTH / 2, 320, "경기 시작", () => this.scene.start("match"), { width: 260, height: 52, fontSize: "20px" });
    makeButton(this, GAME_WIDTH / 2, 390, "전술판 (포메이션 변경)", () => this.scene.start("tactics"), { width: 260 });
    makeButton(this, GAME_WIDTH / 2, 450, "선수단 관리", () => this.scene.start("squad"), { width: 260 });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, "경기 중 M 키를 누르면 언제든 메뉴로 돌아올 수 있어요", {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#6fa080",
      })
      .setOrigin(0.5);
  }

  update() {
    this.formationLabel.setText(`현재 포메이션: ${FORMATIONS[teamState.getFormationId()].label}`);
  }
}
