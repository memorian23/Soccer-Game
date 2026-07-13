import Phaser from "phaser";
import { GAME_WIDTH } from "../config";
import { AWAY_TEAM, HOME_TEAM } from "../data/team";
import { GameState } from "../state/gameState";
import { simulateNextPitch } from "../sim/placeholderAtBat";

const COLOR_ON = 0xf5c518;
const COLOR_OFF = 0x3a4a5c;

export class GameScene extends Phaser.Scene {
  private state!: GameState;

  private scoreText!: Phaser.GameObjects.Text;
  private inningText!: Phaser.GameObjects.Text;
  private batterText!: Phaser.GameObjects.Text;
  private pitcherText!: Phaser.GameObjects.Text;
  private lastPlayText!: Phaser.GameObjects.Text;
  private pitchButton!: Phaser.GameObjects.Rectangle;

  private ballDots: Phaser.GameObjects.Arc[] = [];
  private strikeDots: Phaser.GameObjects.Arc[] = [];
  private outDots: Phaser.GameObjects.Arc[] = [];
  private baseShapes: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super("GameScene");
  }

  create() {
    this.state = new GameState(HOME_TEAM, AWAY_TEAM);

    this.ballDots = [];
    this.strikeDots = [];
    this.outDots = [];
    this.baseShapes = [];

    this.cameras.main.setBackgroundColor("#0c1420");
    this.buildScoreboard();
    this.buildCountIndicators();
    this.buildBaseDiamond();
    this.buildBatterInfo();
    this.buildPitchButton();

    this.refresh();
  }

  private buildScoreboard() {
    this.add.rectangle(GAME_WIDTH / 2, 60, GAME_WIDTH - 40, 90, 0x162334).setStrokeStyle(2, 0x3a4a5c);

    this.inningText = this.add
      .text(GAME_WIDTH / 2, 32, "", { fontSize: "20px", color: "#9fb3c8" })
      .setOrigin(0.5);

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 68, "", {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private buildCountIndicators() {
    const startY = 150;
    const labelStyle = { fontSize: "18px", color: "#9fb3c8" };

    this.add.text(60, startY - 4, "B", labelStyle);
    for (let i = 0; i < 4; i++) {
      const dot = this.add.circle(110 + i * 32, startY + 8, 10, COLOR_OFF).setStrokeStyle(2, 0x5a6c80);
      this.ballDots.push(dot);
    }

    this.add.text(60, startY + 36, "S", labelStyle);
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle(110 + i * 32, startY + 48, 10, COLOR_OFF).setStrokeStyle(2, 0x5a6c80);
      this.strikeDots.push(dot);
    }

    this.add.text(60, startY + 76, "O", labelStyle);
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle(110 + i * 32, startY + 88, 10, COLOR_OFF).setStrokeStyle(2, 0x5a6c80);
      this.outDots.push(dot);
    }
  }

  private buildBaseDiamond() {
    const cx = GAME_WIDTH - 160;
    const cy = 220;
    const size = 28;

    // order: 2nd (top), 3rd (left), 1st (right)
    const positions: [number, number][] = [
      [cx, cy - 45], // 2nd
      [cx - 45, cy], // 3rd
      [cx + 45, cy], // 1st
    ];

    for (const [x, y] of positions) {
      const base = this.add.rectangle(x, y, size, size, COLOR_OFF).setStrokeStyle(2, 0x5a6c80);
      base.setAngle(45);
      this.baseShapes.push(base);
    }

    this.add
      .text(cx, cy + 90, "베이스", { fontSize: "16px", color: "#9fb3c8" })
      .setOrigin(0.5);
  }

  private buildBatterInfo() {
    this.batterText = this.add.text(60, 260, "", {
      fontSize: "20px",
      color: "#ffffff",
    });
    this.pitcherText = this.add.text(60, 290, "", {
      fontSize: "18px",
      color: "#9fb3c8",
    });

    this.lastPlayText = this.add
      .text(GAME_WIDTH / 2, 420, "", {
        fontSize: "24px",
        color: "#f5c518",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: GAME_WIDTH - 120 },
      })
      .setOrigin(0.5);
  }

  private buildPitchButton() {
    this.pitchButton = this.add
      .rectangle(GAME_WIDTH / 2, 600, 220, 70, 0x2f6f9f)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, 600, "투구", {
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.pitchButton.on("pointerover", () => this.pitchButton.setFillStyle(0x3a83ba));
    this.pitchButton.on("pointerout", () => this.pitchButton.setFillStyle(0x2f6f9f));
    this.pitchButton.on("pointerdown", () => this.throwPitch());
  }

  private throwPitch() {
    if (this.state.gameOver) return;
    simulateNextPitch(this.state);
    this.refresh();

    if (this.state.gameOver) {
      this.pitchButton.disableInteractive();
      this.pitchButton.setFillStyle(0x555555);
      this.time.delayedCall(1400, () => {
        this.scene.start("ResultScene", { state: this.state });
      });
    }
  }

  private refresh() {
    const s = this.state;
    const halfLabel = s.half === "top" ? "초" : "말";
    this.inningText.setText(`${s.inning}회 ${halfLabel}`);
    this.scoreText.setText(`${AWAY_TEAM.name}  ${s.score.away}  :  ${s.score.home}  ${HOME_TEAM.name}`);

    this.ballDots.forEach((dot, i) => dot.setFillStyle(i < s.balls ? COLOR_ON : COLOR_OFF));
    this.strikeDots.forEach((dot, i) => dot.setFillStyle(i < s.strikes ? COLOR_ON : COLOR_OFF));
    this.outDots.forEach((dot, i) => dot.setFillStyle(i < s.outs ? 0xd9534f : COLOR_OFF));

    // baseShapes order: [2nd, 3rd, 1st] -> state.bases order: [1st, 2nd, 3rd]
    this.baseShapes[0].setFillStyle(s.bases[1] ? COLOR_ON : COLOR_OFF);
    this.baseShapes[1].setFillStyle(s.bases[2] ? COLOR_ON : COLOR_OFF);
    this.baseShapes[2].setFillStyle(s.bases[0] ? COLOR_ON : COLOR_OFF);

    const batter = s.currentBatter;
    const pitcher = s.currentPitcher;
    this.batterText.setText(`타자: ${batter.name} (#${batter.number}, ${batter.position})`);
    this.pitcherText.setText(`투수: ${pitcher.name} (#${pitcher.number})`);

    this.lastPlayText.setText(s.lastPlay);
  }
}
