import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { AWAY_TEAM, HOME_TEAM } from "../data/team";
import { PITCH_TYPES, PitchType } from "../data/pitchTypes";
import { GameState } from "../state/gameState";
import { AimPoint } from "../sim/pitchPhysics";
import { ThrowResult, throwPitch } from "../sim/pitchResolution";
import { resolveBattingPitch } from "../sim/battingResolution";
import { chooseAiPitch } from "../sim/aiPitcher";
import { resolvePickoff } from "../sim/pickoff";
import { sound } from "../audio/sound";

const COLOR_ON = 0xf5c518;
const COLOR_OFF = 0x3a4a5c;
const COLOR_HOME = 0x2f6f9f;
const COLOR_AWAY = 0xd9534f;

const ZONE_CX = 480;
const ZONE_CY = 350;
const ZONE_HALF_PX = 90; // pixels per 1.0 of normalized aim
const ZONE_CLICK_HALF_PX = 120; // clickable area extends past the true zone for waste pitches

const SWING_DURATION_MS = 900;
const SWING_IDEAL_MS = 750;
const SWING_WINDOW_MS = 280;

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

  private ballDots: Phaser.GameObjects.Arc[] = [];
  private strikeDots: Phaser.GameObjects.Arc[] = [];
  private outDots: Phaser.GameObjects.Arc[] = [];
  private baseShapes: Phaser.GameObjects.Rectangle[] = [];
  private pitcherMarker!: Phaser.GameObjects.Arc;
  private batterMarker!: Phaser.GameObjects.Arc;

  // Strike zone + shared result feedback.
  private zoneClickArea!: Phaser.GameObjects.Rectangle;
  private zoneHintText!: Phaser.GameObjects.Text;
  private aimMarker!: Phaser.GameObjects.Arc;
  private resultMarker!: Phaser.GameObjects.Arc;
  private aim: AimPoint = { x: 0, y: 0 };

  // Pitching-mode UI (visible when the user's team is fielding).
  private pitchTypeButtons: { type: PitchType; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private selectedPitchType: PitchType = PITCH_TYPES[0];
  private autoMode = false;
  private autoToggleButton!: Phaser.GameObjects.Rectangle;
  private autoToggleText!: Phaser.GameObjects.Text;
  private pitchButton!: Phaser.GameObjects.Rectangle;
  private pitchButtonText!: Phaser.GameObjects.Text;
  private pickoffButton!: Phaser.GameObjects.Rectangle;
  private pickoffButtonText!: Phaser.GameObjects.Text;
  private pickoffOverlay?: Phaser.GameObjects.Container;
  private pickoffPhase = 0;

  // Batting-mode UI (visible when the user's team is at bat).
  private startPitchButton!: Phaser.GameObjects.Rectangle;
  private startPitchButtonText!: Phaser.GameObjects.Text;
  private swingButton!: Phaser.GameObjects.Rectangle;
  private swingButtonText!: Phaser.GameObjects.Text;
  private battingMeterBg!: Phaser.GameObjects.Rectangle;
  private battingMeterFill!: Phaser.GameObjects.Rectangle;
  private battingMeterSweetSpot!: Phaser.GameObjects.Rectangle;
  private battingPhase: "idle" | "pitching" = "idle";
  private battingStartTime = 0;
  private battingPitchType: PitchType = PITCH_TYPES[0];
  private battingAim: AimPoint = { x: 0, y: 0 };
  private battingTimerEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super("GameScene");
  }

  create() {
    this.time.removeAllEvents();
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
    this.battingPhase = "idle";
    this.battingTimerEvent = undefined;

    this.cameras.main.setBackgroundColor("#0c1420");
    this.buildScoreboard();
    this.buildCountIndicators();
    this.buildFieldDiagram();
    this.buildBatterInfo();
    this.buildStrikeZone();
    this.buildPitchTypeSelector();
    this.buildAutoToggle();
    this.buildPitchingActionButtons();
    this.buildBattingPanel();

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

  private buildFieldDiagram() {
    const cx = GAME_WIDTH - 130;
    const cy = 190;

    this.add.rectangle(cx, cy, 200, 200, 0x18301f).setStrokeStyle(1, 0x274d30);
    this.add.rectangle(cx, cy, 130, 130, 0x6b4a2b).setStrokeStyle(1, 0x543a22).setAngle(45);

    // Home plate (bottom vertex) and pitcher's mound (center).
    this.add.rectangle(cx, cy + 40, 20, 20, 0xffffff).setStrokeStyle(2, 0xaaaaaa);
    this.add.circle(cx, cy + 58, 6, 0x8a8a8a); // catcher
    this.add.circle(cx, cy, 15, 0x8a6a4a).setStrokeStyle(1, 0x543a22); // mound

    this.pitcherMarker = this.add.circle(cx, cy - 4, 8, COLOR_HOME).setStrokeStyle(2, 0xffffff);
    this.batterMarker = this.add.circle(cx + 20, cy + 40, 8, COLOR_AWAY).setStrokeStyle(2, 0xffffff);

    // order: 2nd (top), 3rd (left), 1st (right)
    const positions: [number, number][] = [
      [cx, cy - 40],
      [cx - 40, cy],
      [cx + 40, cy],
    ];
    for (const [x, y] of positions) {
      const base = this.add.rectangle(x, y, 26, 26, COLOR_OFF).setStrokeStyle(2, 0x5a6c80);
      base.setAngle(45);
      this.baseShapes.push(base);
    }

    this.add.text(cx, cy + 80, "필드", { fontSize: "16px", color: "#9fb3c8" }).setOrigin(0.5);
  }

  private buildBatterInfo() {
    this.batterText = this.add.text(60, 260, "", { fontSize: "18px", color: "#ffffff" });
    this.pitcherText = this.add.text(60, 286, "", { fontSize: "16px", color: "#9fb3c8" });

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
    this.zoneClickArea = this.add
      .rectangle(ZONE_CX, ZONE_CY, ZONE_CLICK_HALF_PX * 2, ZONE_CLICK_HALF_PX * 2, 0x162334, 0.5)
      .setStrokeStyle(2, 0x3a4a5c)
      .setInteractive({ useHandCursor: true });

    this.add
      .rectangle(ZONE_CX, ZONE_CY, ZONE_HALF_PX * 2, ZONE_HALF_PX * 2, 0x000000, 0)
      .setStrokeStyle(3, 0x5a8ac8);

    this.zoneHintText = this.add
      .text(ZONE_CX, ZONE_CY - ZONE_CLICK_HALF_PX - 20, "", { fontSize: "15px", color: "#9fb3c8" })
      .setOrigin(0.5);

    this.zoneClickArea.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
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
        .rectangle(x, y, width, 46, i === 0 ? COLOR_HOME : 0x1c2c3d)
        .setStrokeStyle(2, 0x5a6c80)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y, type.name, { fontSize: "18px", color: "#ffffff" }).setOrigin(0.5);

      rect.on("pointerdown", () => {
        this.selectedPitchType = type;
        this.pitchTypeButtons.forEach((b) => b.rect.setFillStyle(b.type.id === type.id ? COLOR_HOME : 0x1c2c3d));
        sound.pitchTypeSelect();
      });

      this.pitchTypeButtons.push({ type, rect, label });
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
      sound.buttonClick();
    });
  }

  private buildPitchingActionButtons() {
    this.pitchButton = this.add
      .rectangle(400, 650, 220, 64, COLOR_HOME)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.pitchButtonText = this.add
      .text(400, 650, "투구", { fontSize: "24px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    this.pitchButton.on("pointerover", () => this.pitchButton.setFillStyle(0x3a83ba));
    this.pitchButton.on("pointerout", () => this.pitchButton.setFillStyle(COLOR_HOME));
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

  private buildBattingPanel() {
    const barWidth = 500;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const y = 520;

    this.battingMeterBg = this.add.rectangle(GAME_WIDTH / 2, y, barWidth, 30, 0x1c2c3d).setStrokeStyle(2, 0x5a6c80);
    const sweetSpotFrac = SWING_IDEAL_MS / SWING_DURATION_MS;
    this.battingMeterSweetSpot = this.add.rectangle(barX + barWidth * sweetSpotFrac, y, 46, 30, COLOR_HOME, 0.5);
    this.battingMeterFill = this.add.rectangle(barX, y, 0, 26, 0x2f8f4e).setOrigin(0, 0.5);

    this.startPitchButton = this.add
      .rectangle(400, 650, 220, 64, COLOR_HOME)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.startPitchButtonText = this.add
      .text(400, 650, "다음 투구", { fontSize: "22px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    this.startPitchButton.on("pointerover", () => this.startPitchButton.setFillStyle(0x3a83ba));
    this.startPitchButton.on("pointerout", () => this.startPitchButton.setFillStyle(COLOR_HOME));
    this.startPitchButton.on("pointerdown", () => this.beginAiPitch());

    this.swingButton = this.add
      .rectangle(660, 650, 220, 64, 0x9f5a2f)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.swingButtonText = this.add
      .text(660, 650, "스윙!", { fontSize: "24px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    this.swingButton.on("pointerover", () => this.swingButton.setFillStyle(0xba833a));
    this.swingButton.on("pointerout", () => this.swingButton.setFillStyle(0x9f5a2f));
    this.swingButton.on("pointerdown", () => this.attemptSwing());
  }

  private beginAiPitch() {
    if (this.state.gameOver || this.battingPhase !== "idle") return;

    const { pitchType, aim } = chooseAiPitch(this.state);
    this.battingPitchType = pitchType;
    this.battingAim = aim;
    this.battingPhase = "pitching";
    this.battingStartTime = this.time.now;
    this.battingMeterFill.width = 0;
    this.lastPlayText.setText(`상대 투수의 ${pitchType.name}!`);
    sound.buttonClick();
    this.syncMode();

    this.battingTimerEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const elapsed = this.time.now - this.battingStartTime;
        const progress = Phaser.Math.Clamp(elapsed / SWING_DURATION_MS, 0, 1);
        this.battingMeterFill.width = 500 * progress;
        if (progress >= 1) {
          this.resolveBattingOutcome(false, 1);
        }
      },
    });
  }

  private attemptSwing() {
    if (this.battingPhase !== "pitching") return;
    const elapsed = this.time.now - this.battingStartTime;
    const timingError = Phaser.Math.Clamp(Math.abs(elapsed - SWING_IDEAL_MS) / SWING_WINDOW_MS, 0, 1);
    this.resolveBattingOutcome(true, timingError);
  }

  private resolveBattingOutcome(swung: boolean, timingError: number) {
    this.battingTimerEvent?.remove();
    this.battingTimerEvent = undefined;
    this.battingPhase = "idle";

    const result = resolveBattingPitch(this.state, this.battingPitchType, this.battingAim, swung, timingError);
    this.showResultMarker(result);
    this.playOutcomeSound(result);
    this.refresh();
    this.lastPlayText.setText(`[${this.battingPitchType.name}] ${OUTCOME_LABEL[result.outcome]} - ${this.state.lastPlay}`);

    if (this.state.gameOver) this.endMatch();
  }

  private handleThrow() {
    if (this.state.gameOver) return;

    let pitchType = this.selectedPitchType;
    let aim = this.aim;
    if (this.autoMode) {
      pitchType = PITCH_TYPES[Math.floor(Math.random() * PITCH_TYPES.length)];
      aim = { x: (Math.random() * 2 - 1) * 1.1, y: (Math.random() * 2 - 1) * 1.1 };
    }

    const result = throwPitch(this.state, pitchType, aim);
    this.showResultMarker(result);
    this.playOutcomeSound(result);
    this.refresh();
    this.lastPlayText.setText(`[${pitchType.name}] ${OUTCOME_LABEL[result.outcome]} - ${this.state.lastPlay}`);

    if (this.state.gameOver) this.endMatch();
  }

  private showResultMarker(result: ThrowResult) {
    this.resultMarker.setPosition(ZONE_CX + result.actualX * ZONE_HALF_PX, ZONE_CY + result.actualY * ZONE_HALF_PX);
    this.resultMarker.setFillStyle(result.inZone ? 0x2f8f4e : COLOR_AWAY, 1);
    this.resultMarker.setVisible(true);
    this.time.delayedCall(500, () => this.resultMarker.setVisible(false));
  }

  private playOutcomeSound(result: ThrowResult) {
    switch (result.outcome) {
      case "ball":
        sound.ballCall();
        break;
      case "strike":
        result.swung ? sound.swingMiss() : sound.strikeCall();
        break;
      case "foul":
        sound.foulCall();
        break;
      case "out":
        sound.batCrack();
        this.time.delayedCall(150, () => sound.fieldOut());
        break;
      case "single":
        sound.hitBall(1);
        break;
      case "double":
        sound.hitBall(2);
        break;
      case "triple":
        sound.hitBall(3);
        break;
      case "homerun":
        sound.hitBall(4);
        break;
    }
  }

  private openPickoffOverlay() {
    if (this.state.gameOver || this.pickoffOverlay || !this.state.bases.some(Boolean)) return;
    sound.buttonClick();

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
        const t = (Math.sin(this.pickoffPhase) + 1) / 2;
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
        sound.pickoffSuccess();
        this.refresh();
        this.lastPlayText.setText(this.state.lastPlay);
      } else {
        sound.pickoffFail();
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
    this.pickoffButton.disableInteractive();
    this.startPitchButton.disableInteractive();
    this.swingButton.disableInteractive();
    sound.gameEnd();
    this.time.delayedCall(1400, () => {
      this.scene.start("ResultScene", { state: this.state });
    });
  }

  private syncMode() {
    const pitchingMode = this.state.fieldingTeam.id === "home";

    this.zoneHintText.setText(pitchingMode ? "스트라이크존을 탭해서 조준" : "투구를 기다리는 중...");
    this.aimMarker.setVisible(pitchingMode);
    if (pitchingMode) {
      if (!this.zoneClickArea.input) this.zoneClickArea.setInteractive({ useHandCursor: true });
    } else {
      this.zoneClickArea.disableInteractive();
    }

    this.pitchTypeButtons.forEach((b) => {
      b.rect.setVisible(pitchingMode);
      b.label.setVisible(pitchingMode);
    });
    this.autoToggleButton.setVisible(pitchingMode);
    this.autoToggleText.setVisible(pitchingMode);

    this.pitchButton.setVisible(pitchingMode);
    this.pitchButtonText.setVisible(pitchingMode);
    const hasRunner = this.state.bases.some(Boolean);
    this.pickoffButton.setVisible(pitchingMode && hasRunner);
    this.pickoffButtonText.setVisible(pitchingMode && hasRunner);

    const showStart = !pitchingMode && this.battingPhase === "idle";
    const showSwing = !pitchingMode && this.battingPhase === "pitching";
    this.battingMeterBg.setVisible(!pitchingMode);
    this.battingMeterSweetSpot.setVisible(!pitchingMode);
    this.battingMeterFill.setVisible(!pitchingMode);
    this.startPitchButton.setVisible(showStart);
    this.startPitchButtonText.setVisible(showStart);
    this.swingButton.setVisible(showSwing);
    this.swingButtonText.setVisible(showSwing);
  }

  private refresh() {
    const s = this.state;
    const halfLabel = s.half === "top" ? "초" : "말";
    this.inningText.setText(`${s.inning}회 ${halfLabel}`);
    this.scoreText.setText(`${AWAY_TEAM.name}  ${s.score.away}  :  ${s.score.home}  ${HOME_TEAM.name}`);

    this.ballDots.forEach((dot, i) => dot.setFillStyle(i < s.balls ? COLOR_ON : COLOR_OFF));
    this.strikeDots.forEach((dot, i) => dot.setFillStyle(i < s.strikes ? COLOR_ON : COLOR_OFF));
    this.outDots.forEach((dot, i) => dot.setFillStyle(i < s.outs ? COLOR_AWAY : COLOR_OFF));

    // baseShapes order: [2nd, 3rd, 1st] -> state.bases order: [1st, 2nd, 3rd]
    this.baseShapes[0].setFillStyle(s.bases[1] ? COLOR_ON : COLOR_OFF);
    this.baseShapes[1].setFillStyle(s.bases[2] ? COLOR_ON : COLOR_OFF);
    this.baseShapes[2].setFillStyle(s.bases[0] ? COLOR_ON : COLOR_OFF);

    const fieldingIsHome = s.fieldingTeam.id === "home";
    this.pitcherMarker.setFillStyle(fieldingIsHome ? COLOR_HOME : COLOR_AWAY);
    this.batterMarker.setFillStyle(fieldingIsHome ? COLOR_AWAY : COLOR_HOME);

    const batter = s.currentBatter;
    const pitcher = s.currentPitcher;
    this.batterText.setText(`타자: ${batter.name} (#${batter.number}, ${batter.position})`);
    this.pitcherText.setText(`투수: ${pitcher.name} (#${pitcher.number})`);

    this.lastPlayText.setText(s.lastPlay);

    this.syncMode();
  }
}
