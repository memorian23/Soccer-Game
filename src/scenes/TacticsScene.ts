import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PITCH, PITCH_CENTER_X, PITCH_CENTER_Y } from "../config";
import { FORMATIONS, FormationId } from "../data/formations";
import { teamState } from "../state/teamState";
import { Button, makeButton } from "../ui/button";

const ROLE_COLOR: Record<string, number> = {
  GK: 0xe0a300,
  DF: 0x2456d6,
  MF: 0x3fae5c,
  FW: 0xd6432a,
};

export default class TacticsScene extends Phaser.Scene {
  private dotsLayer!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private presetButtons: { id: FormationId; button: Button }[] = [];

  constructor() {
    super("tactics");
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b3d1f).setOrigin(0);
    this.drawMiniPitch();

    this.titleText = this.add
      .text(GAME_WIDTH / 2, 30, "", { fontFamily: "Arial", fontSize: "22px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    this.dotsLayer = this.add.container(0, 0);

    const ids = Object.keys(FORMATIONS) as FormationId[];
    const startX = GAME_WIDTH / 2 - ((ids.length - 1) * 150) / 2;
    this.presetButtons = ids.map((id, i) => ({
      id,
      button: makeButton(
        this,
        startX + i * 150,
        GAME_HEIGHT - 60,
        FORMATIONS[id].label,
        () => {
          teamState.setFormation(id);
          this.renderLineup();
        },
        { width: 130, height: 40, fontSize: "15px" },
      ),
    }));

    makeButton(this, GAME_WIDTH - 90, 30, "메뉴로", () => this.scene.start("menu"), { width: 120, height: 36, fontSize: "14px" });

    this.renderLineup();
  }

  private drawMiniPitch() {
    const g = this.add.graphics();
    g.fillStyle(0x14522b, 1);
    g.fillRect(PITCH.left, PITCH.top, PITCH.right - PITCH.left, PITCH.bottom - PITCH.top);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeRect(PITCH.left, PITCH.top, PITCH.right - PITCH.left, PITCH.bottom - PITCH.top);
    g.beginPath();
    g.moveTo(PITCH_CENTER_X, PITCH.top);
    g.lineTo(PITCH_CENTER_X, PITCH.bottom);
    g.strokePath();
    g.strokeCircle(PITCH_CENTER_X, PITCH_CENTER_Y, 60);
  }

  private renderLineup() {
    this.dotsLayer.removeAll(true);
    const formationId = teamState.getFormationId();
    this.titleText.setText(`전술판 - 포메이션: ${FORMATIONS[formationId].label}`);
    this.presetButtons.forEach(({ id, button }) => button.setActive(id === formationId));

    const lineup = teamState.getLineup();
    lineup.forEach(({ slot, player }) => {
      const x = PITCH.left + slot.fx * (PITCH.right - PITCH.left);
      const y = PITCH.top + slot.fy * (PITCH.bottom - PITCH.top);
      const color = ROLE_COLOR[slot.role] ?? 0xffffff;
      const dot = this.add.circle(x, y, 14, color).setStrokeStyle(2, 0xffffff, 0.9);
      const label = this.add
        .text(x, y + 20, player ? `${player.name}` : slot.role, {
          fontFamily: "Arial",
          fontSize: "11px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.dotsLayer.add([dot, label]);
    });
  }
}
