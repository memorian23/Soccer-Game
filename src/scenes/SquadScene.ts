import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, Role } from "../config";
import { PlayerProfile } from "../data/squad";
import { teamState } from "../state/teamState";
import { makeButton } from "../ui/button";

const ROLE_LABEL: Record<Role, string> = { GK: "GK", DF: "DF", MF: "MF", FW: "FW" };
const DEFAULT_HINT = "선발 선수를 클릭한 뒤, 같은 포지션의 후보 선수를 클릭하면 교체됩니다.";

export default class SquadScene extends Phaser.Scene {
  private selectedStartingId: string | null = null;
  private listLayer!: Phaser.GameObjects.Container;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super("squad");
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b3d1f).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 30, "선수단 관리", { fontFamily: "Arial", fontSize: "22px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(GAME_WIDTH / 2, 58, DEFAULT_HINT, { fontFamily: "Arial", fontSize: "13px", color: "#9fd8b0" })
      .setOrigin(0.5);

    this.listLayer = this.add.container(0, 0);
    this.renderLists();

    makeButton(this, GAME_WIDTH - 90, 30, "메뉴로", () => this.scene.start("menu"), { width: 120, height: 36, fontSize: "14px" });
  }

  private renderLists() {
    this.listLayer.removeAll(true);

    const starting = teamState.getStartingXI();
    const bench = teamState.getBench();

    const colWidth = (GAME_WIDTH - 140) / 2;
    const col1X = 70;
    const col2X = col1X + colWidth + 20;

    this.addColumnTitle(col1X + colWidth / 2, 90, `선발 라인업 (${starting.length})`);
    starting.forEach((p, i) => this.addPlayerRow(col1X, 122 + i * 32, colWidth, p, true));

    this.addColumnTitle(col2X + colWidth / 2, 90, `후보 선수 (${bench.length})`);
    bench.forEach((p, i) => this.addPlayerRow(col2X, 122 + i * 32, colWidth, p, false));
  }

  private addColumnTitle(x: number, y: number, label: string) {
    const t = this.add.text(x, y, label, { fontFamily: "Arial", fontSize: "16px", color: "#ffe066", fontStyle: "bold" }).setOrigin(0.5);
    this.listLayer.add(t);
  }

  private addPlayerRow(x: number, y: number, width: number, player: PlayerProfile, isStarting: boolean) {
    const selected = isStarting && this.selectedStartingId === player.id;
    const bg = this.add
      .rectangle(x, y, width, 27, selected ? 0x2f8f52 : 0x123a22, 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.25);
    const text = this.add
      .text(x + 10, y, `${ROLE_LABEL[player.role]}  #${player.number}  ${player.name}  (${player.rating})`, {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.onPlayerClicked(player, isStarting));

    this.listLayer.add([bg, text]);
  }

  private onPlayerClicked(player: PlayerProfile, isStarting: boolean) {
    if (isStarting) {
      this.selectedStartingId = this.selectedStartingId === player.id ? null : player.id;
      this.hintText.setText(DEFAULT_HINT);
      this.renderLists();
      return;
    }

    if (!this.selectedStartingId) {
      this.hintText.setText("먼저 교체할 선발 선수를 클릭하세요.");
      return;
    }

    const starter = teamState.squad.find((p) => p.id === this.selectedStartingId);
    if (!starter || starter.role !== player.role) {
      this.hintText.setText("같은 포지션끼리만 교체할 수 있어요.");
      return;
    }

    teamState.swapIntoStarting(player.id, this.selectedStartingId);
    this.selectedStartingId = null;
    this.hintText.setText(DEFAULT_HINT);
    this.renderLists();
  }
}
