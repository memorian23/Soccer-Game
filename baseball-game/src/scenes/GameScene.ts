import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { AWAY_TEAM, HOME_TEAM } from "../data/team";
import { PITCH_TYPES, PitchType } from "../data/pitchTypes";
import { GameState } from "../state/gameState";
import { AimPoint, throwPitch } from "../sim/pitchResolution";
import { resolvePickoff } from "../sim/pickoff";

const COLOR_ON = 0xf5c518;
const COLOR_OFF = 0x3a4a5c;

const ZONE_CX = 480;
const ZONE_CY = 380;
const ZONE_HALF_PX = 90; // pixels per 1.0 of normalized aim
const ZONE_CLICK_HALF_PX = 150; // clickable area extends past the true zone for waste pitches

const OUTCOME_LABEL: Record<string, string> = {
  ball: "볼",
  strike: "스트라이크",
  foul: "파울",
  out: "아웃",
  single: "1루타",
  double: "2루타",
  triple: "3루타",
  homerun: "홈런",
};

export class GameScene extends Phaser.Scene {
  private state!: GameState;

  private scoreText!: Phaser.GameObjects.Text;
  private inningText!: Phaser.GameObjects.Text;
  private batterText!: Phaser.GameObjects.Text;
  private pitcherText!: Phaser.GameObjects.Text;
  private lastPlayText!: Phaser.GameObjects.Text;
  private pitchButton!: Phaser.GameObjects.Rectangle;
  private pickoffButton!: Phaser.GameObjects.Rectangle;
  private pickoffButtonText!: Phaser.GameObjects.Text;
  private autoToggleButton!: Phaser.GameObjects.Rectangle;
  private autoToggleText!: Phaser.GameObjects.Text;

  private ballDots: Phaser.GameObjects.Arc[] = [];
  private strikeDots: Phaser.GameObjects.Arc[] = [];
  private outDots: Phaser.GameObjects.Arc[] = [];
  private baseShapes: Phaser.GameObjects.Rectangle[] = [];

  private aim: AimPoint = { x: 0, y: 0 };
  private aimMarker!: Phaser.GameObjects.Arc;
  private resultMarker!: Phaser.GameObjects.Arc;
  private pitchTypeButtons: { type: PitchType; rect: Phaser.GameObjects.Rectangle }[] = [];
  private selectedPitchType: PitchType = PITCH_TYPES[0];
  private autoMode = false;

  private pickoffOverlay?: Phaser.GameObjects.Container;
  private pickoffPhase = 0;

  constructor() {
    super("GameScene");
  }

  create() {
    this.state = new GameState(HOME_TEAM, AWAY_TEAM);

    this.ballDots = [];
    this.strikeDots = [];
    this.outDots = [];
    this.baseShapes = [];
    this.pitchTypeButtons = [];
    this.aim = { x: 0, y: 0 };
    this.selectedPitchType = PITCH_TYPES[0];
    this.autoMode = false;
    this.pickoffOverlay = undefined;

    this.cameras.main.setBackgroundColor("#0c1420");
    this.buildScoreboard();
    this.buildCountIndicators();
    this.buildBaseDiamond();
    this.buildBatterInfo();
    this.buildStrikeZone();
    this.buildPitchTypeSelector();
    this.buildAutoToggle();
    this.buildActionButtons();

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
    const startY = 130;
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
    const cx = GAME_WIDTH - 130;
    const cy = 190;
    const size = 26;

    // order: 2nd (top), 3rd (left), 1st (right)
    const positions: [number, number][] = [
      [cx, cy - 40], // 2nd
      [cx - 40, cy], // 3rd
      [cx + 40, cy], // 1st
    ];

    for (const [x, y] of positions) {
      const base = this.add.rectangle(x, y, size, size, COLOR_OFF).setStrokeStyle(2, 0x5a6c80);
      base.setAngle(45);
      this.baseShapes.push(base);
    }

    this.add
      .text(cx, cy + 75, "베이스", { fontSize: "16px", color: "#9fb3c8" })
      .setOrigin(0.5);
  }

  private buildBatterInfo() {
    this.batterText = this.add.text(60, 260, "", {
      fontSize: "18px",
      color: "#ffffff",
    });
    this.pitcherText = this.add.text(60, 286, "", {
      fontSize: "16px",
      color: "#9fb3c8",
    });

    this.lastPlayText = this.add
      .text(GAME_WIDTH / 2, 590, "", {
        fontSize: "22px",
        color: "#f5c518",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: GAME_WIDTH - 120 },
      })
      .setOrigin(0.5);
  }

  private buildStrikeZone() {
    // Outer clickable area (waste-pitch margin included).
    const clickArea = this.add
      .rectangle(ZONE_CX, ZONE_CY, ZONE_CLICK_HALF_PX * 2, ZONE_CLICK_HALF_PX * 2, 0x162334, 0.5)
      .setStrokeStyle(2, 0x3a4a5c)
      .setInteractive({ useHandCursor: true });

    // True strike zone.
    this.add
      .rectangle(ZONE_CX, ZONE_CY, ZONE_HALF_PX * 2, ZONE_HALF_PX * 2, 0x000000, 0)
      .setStrokeStyle(3, 0x5a8ac8);

    this.add
      .text(ZONE_CX, ZONE_CY - ZONE_CLICK_HALF_PX - 20, "스트라이크존을 탭해서 조준", {
        fontSize: "15px",
        color: "#9fb3c8",
      })
      .setOrigin(0.5);

    clickArea.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const localX = Phaser.Math.Clamp(pointer.x - ZONE_CX, -ZONE_CLICK_HALF_PX, ZONE_CLICK_HALF_PX);
      const localY = Phaser.Math.Clamp(pointer.y - ZONE_CY, -ZONE_CLICK_HALF_PX, ZONE_CLICK_HALF_PX);
      this.aim = { x: localX / ZONE_HALF_PX, y: localY / ZONE_HALF_PX };
      this.aimMarker.setPosition(ZONE_CX + localX, ZONE_CY + localY);
    });

    this.aimMarker = this.add.circle(ZONE_CX, ZONE_CY, 8, 0x5a8ac8).setStrokeStyle(2, 0xffffff);
    this.resultMarker = this.add.circle(ZONE_CX, ZONE_CY, 10, 0xffffff, 0).setVisible(false);
  }

  private buildPitchTypeSelector() {
    const y = 520;
    const width = 170;
    const gap = 16;
    const totalWidth = PITCH_TYPES.length * width + (PITCH_TYPES.length - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2 + width / 2;

    PITCH_TYPES.forEach((type, i) => {
      const x = startX + i * (width + gap);
      const rect = this.add
        .rectangle(x, y, width, 46, i === 0 ? 0x2f6f9f : 0x1c2c3d)
        .setStrokeStyle(2, 0x5a6c80)
        .setInteractive({ useHandCursor: true });

      this.add.text(x, y, type.name, { fontSize: "18px", color: "#ffffff" }).setOrigin(0.5);

      rect.on("pointerdown", () => {
        this.selectedPitchType = type;
        this.pitchTypeButtons.forEach((b) => b.rect.setFillStyle(b.type.id === type.id ? 0x2f6f9f : 0x1c2c3d));
      });

      this.pitchTypeButtons.push({ type, rect });
    });
  }

  private buildAutoToggle() {
    this.autoToggleButton = this.add
      .rectangle(GAME_WIDTH - 110, 120, 160, 48, 0x1c2c3d)
      .setStrokeStyle(2, 0x5a6c80)
      .setInteractive({ useHandCursor: true });

    this.autoToggleText = this.add
      .text(GAME_WIDTH - 110, 120, "자동투구: OFF", { fontSize: "15px", color: "#ffffff" })
      .setOrigin(0.5);

    this.autoToggleButton.on("pointerdown", () => {
      this.autoMode = !this.autoMode;
      this.autoToggleButton.setFillStyle(this.autoMode ? 0x2f8f4e : 0x1c2c3d);
      this.autoToggleText.setText(this.autoMode ? "자동투구: ON" : "자동투구: OFF");
    });
  }

  private buildActionButtons() {
    this.pitchButton = this.add
      .rectangle(400, 650, 220, 64, 0x2f6f9f)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(400, 650, "투구", { fontSize: "24px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    this.pitchButton.on("pointerover", () => this.pitchButton.setFillStyle(0x3a83ba));
    this.pitchButton.on("pointerout", () => this.pitchButton.setFillStyle(0x2f6f9f));
    this.pitchButton.on("pointerdown", () => this.handleThrow());

    this.pickoffButton = this.add
      .rectangle(660, 650, 220, 64, 0x9f5a2f)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.pickoffButtonText = this.add
      .text(660, 650, "견제구", { fontSize: "24px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    this.pickoffButton.on("pointerover", () => this.pickoffButton.setFillStyle(0xba833a));
    this.pickoffButton.on("pointerout", () => this.pickoffButton.setFillStyle(0x9f5a2f));
    this.pickoffButton.on("pointerdown", () => this.openPickoffOverlay());
  }

  private handleThrow() {
    if (this.state.gameOver) return;

    let pitchType = this.selectedPitchType;
    let aim = this.aim;
    if (this.autoMode) {
      pitchType = Phaser.Utils.Array.GetRandom(PITCH_TYPES);
      aim = { x: (Math.random() * 2 - 1) * 1.1, y: (Math.random() * 2 - 1) * 1.1 };
    }

    const result = throwPitch(this.state, pitchType, aim);

    this.resultMarker.setPosition(ZONE_CX + result.actualX * ZONE_HALF_PX, ZONE_CY + result.actualY * ZONE_HALF_PX);
    this.resultMarker.setFillStyle(result.inZone ? 0x2f8f4e : 0xd9534f, 1);
    this.resultMarker.setVisible(true);
    this.time.delayedCall(500, () => this.resultMarker.setVisible(false));

    this.refresh();
    this.lastPlayText.setText(`[${pitchType.name}] ${OUTCOME_LABEL[result.outcome]} - ${this.state.lastPlay}`);

    if (this.state.gameOver) {
      this.endMatch();
    }
  }

  private openPickoffOverlay() {
    if (this.state.gameOver || this.pickoffOverlay || !this.state.bases.some(Boolean)) return;

    const barX = GAME_WIDTH / 2 - 200;
    const barY = GAME_HEIGHT / 2;
    const barWidth = 400;

    const targetWidth = 40 + (this.state.currentPitcher.control / 99) * 40;
    const targetStart = barWidth / 2 - targetWidth / 2;

    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setInteractive();
    const bar = this.add.rectangle(barX + barWidth / 2, barY, barWidth, 26, 0x1c2c3d).setStrokeStyle(2, 0x5a6c80);
    const target = this.add.rectangle(barX + targetStart + targetWidth / 2, barY, targetWidth, 26, 0x2f8f4e, 0.7);
    const marker = this.add.rectangle(barX, barY, 8, 34, 0xf5c518);
    const label = this.add
      .text(GAME_WIDTH / 2, barY - 60, "타이밍에 맞춰 정지 버튼을 눌러 견제하세요!", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const stopButton = this.add
      .rectangle(GAME_WIDTH / 2, barY + 70, 180, 56, 0x9f5a2f)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const stopButtonText = this.add
      .text(GAME_WIDTH / 2, barY + 70, "정지!", { fontSize: "22px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    this.pickoffPhase = 0;
    const updateEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.pickoffPhase += 0.045;
        const t = (Math.sin(this.pickoffPhase) + 1) / 2; // 0..1 ping-pong
        marker.x = barX + t * barWidth;
      },
    });

    this.pickoffOverlay = this.add.container(0, 0, [backdrop, bar, target, marker, label, stopButton, stopButtonText]);

    stopButton.on("pointerdown", () => {
      updateEvent.remove();
      const markerFrac = (marker.x - barX) / barWidth;
      const targetCenterFrac = (targetStart + targetWidth / 2) / barWidth;
      const timingError = Math.abs(markerFrac - targetCenterFrac) / 0.5;

      const success = resolvePickoff(timingError, this.state.currentPitcher.control);
      if (success) {
        const baseIdx = this.state.bases[2] ? 2 : this.state.bases[1] ? 1 : 0;
        this.state.pickoffOut(baseIdx as 0 | 1 | 2);
        this.refresh();
        this.lastPlayText.setText(this.state.lastPlay);
      } else {
        this.lastPlayText.setText("견제 실패 - 주자 그대로");
      }

      this.pickoffOverlay?.destroy(true);
      this.pickoffOverlay = undefined;

      if (this.state.gameOver) {
        this.endMatch();
      }
    });
  }

  private endMatch() {
    this.pitchButton.disableInteractive();
    this.pitchButton.setFillStyle(0x555555);
    this.pickoffButton.disableInteractive();
    this.pickoffButton.setFillStyle(0x555555);
    this.time.delayedCall(1400, () => {
      this.scene.start("ResultScene", { state: this.state });
    });
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

    const hasRunner = s.bases.some(Boolean);
    this.pickoffButton.setVisible(hasRunner);
    this.pickoffButtonText.setVisible(hasRunner);
  }
}
