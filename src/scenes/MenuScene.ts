import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { FORMATIONS } from "../data/formations";
import { teamState } from "../state/teamState";
import { makeButton, Button } from "../ui/button";
import { sfx } from "../audio/sfx";

export default class MenuScene extends Phaser.Scene {
  private formationLabel!: Phaser.GameObjects.Text;
  private budgetLabel!: Phaser.GameObjects.Text;
  private muteButton!: Button;

  constructor() {
    super("menu");
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b3d1f).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 90, "SOCCER GAME", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.formationLabel = this.add
      .text(GAME_WIDTH / 2, 142, "", { fontFamily: "Arial", fontSize: "16px", color: "#9fd8b0" })
      .setOrigin(0.5);
    this.budgetLabel = this.add
      .text(GAME_WIDTH / 2, 166, "", { fontFamily: "Arial", fontSize: "16px", color: "#ffe066" })
      .setOrigin(0.5);

    makeButton(this, GAME_WIDTH / 2, 230, "경기 시작 (친선)", () => this.scene.start("match"), { width: 260, height: 50, fontSize: "19px" });
    makeButton(this, GAME_WIDTH / 2, 292, "리그", () => this.scene.start("league"), { width: 260 });
    makeButton(this, GAME_WIDTH / 2, 354, "이적시장", () => this.scene.start("transfer"), { width: 260 });
    makeButton(this, GAME_WIDTH / 2, 416, "전술판 (포메이션 변경)", () => this.scene.start("tactics"), { width: 260 });
    makeButton(this, GAME_WIDTH / 2, 478, "선수단 관리", () => this.scene.start("squad"), { width: 260 });

    this.muteButton = makeButton(this, GAME_WIDTH - 80, 30, "", () => {
      sfx.setMuted(!sfx.isMuted());
      this.refreshMuteLabel();
    }, { width: 120, height: 36, fontSize: "14px" });
    this.refreshMuteLabel();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, "경기 중 M 키를 누르면 언제든 메뉴로 돌아올 수 있어요", {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#6fa080",
      })
      .setOrigin(0.5);
  }

  private refreshMuteLabel() {
    this.muteButton.text.setText(sfx.isMuted() ? "🔇 소리 켜기" : "🔊 소리 끄기");
  }

  update() {
    this.formationLabel.setText(`현재 포메이션: ${FORMATIONS[teamState.getFormationId()].label}`);
    this.budgetLabel.setText(`보유 자금: ${teamState.getBudget()}`);
  }
}
