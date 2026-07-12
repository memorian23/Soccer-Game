import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { makeButton } from "../ui/button";
import { createSpeechBubble } from "../ui/speechBubble";
import { sfx } from "../audio/sfx";

interface ResultData {
  home: number;
  away: number;
  league?: boolean;
  homeLabel?: string;
  awayLabel?: string;
}

type Outcome = "win" | "lose" | "draw";

const WIN_PHRASES = ["최고예요!", "우리가 이겼다!", "감독님 최고!", "짜릿했다!", "완벽한 경기!", "역시 우리팀!", "MVP감이야!", "이 맛에 축구 본다", "환상적이었어!", "다음 경기도 가자!"];

const LOSE_PHRASES = ["해명해!", "방출해!", "사퇴해!", "실망이야...", "정신 차려!", "이게 뭐야!", "돈 돌려줘!", "감독 나가!", "다시 생각해봐", "이럴 수가..."];

const DRAW_PHRASES = ["아쉽다...", "다음엔 이기자", "나쁘지 않았어", "좀 더 힘내자", "괜찮은 경기였어", "다음이 중요해", "무승부라니...", "분발하자"];

export default class ResultScene extends Phaser.Scene {
  private matchResult: ResultData = { home: 0, away: 0 };

  constructor() {
    super("result");
  }

  init(data: ResultData) {
    this.matchResult = data;
  }

  create() {
    const { home, away } = this.matchResult;
    const outcome: Outcome = home > away ? "win" : home < away ? "lose" : "draw";
    if (outcome === "win") sfx.cheer();
    else if (outcome === "lose") sfx.boo();

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b2016).setOrigin(0);
    this.drawStands();

    this.add
      .text(GAME_WIDTH / 2, 36, "경기 종료", { fontFamily: "Arial", fontSize: "22px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    const homeLabel = this.matchResult.homeLabel ?? "HOME";
    const awayLabel = this.matchResult.awayLabel ?? "AWAY";
    this.add
      .text(GAME_WIDTH / 2, 70, `${homeLabel} ${home} : ${away} ${awayLabel}`, { fontFamily: "Arial", fontSize: "26px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    const banner = outcome === "win" ? "승리!" : outcome === "lose" ? "패배..." : "무승부";
    const bannerColor = outcome === "win" ? "#3fae5c" : outcome === "lose" ? "#e2543a" : "#e0a300";
    this.add
      .text(GAME_WIDTH / 2, 108, banner, { fontFamily: "Arial", fontSize: "22px", color: bannerColor, fontStyle: "bold" })
      .setOrigin(0.5);

    const pool = outcome === "win" ? WIN_PHRASES : outcome === "lose" ? LOSE_PHRASES : DRAW_PHRASES;
    this.renderFanBubbles(pool);

    if (this.matchResult.league) {
      makeButton(this, GAME_WIDTH / 2 - 130, GAME_HEIGHT - 55, "리그로 돌아가기", () => this.scene.start("league"), { width: 220, fontSize: "15px" });
    } else {
      makeButton(this, GAME_WIDTH / 2 - 130, GAME_HEIGHT - 55, "다시 경기", () => this.scene.start("match"), { width: 220 });
    }
    makeButton(this, GAME_WIDTH / 2 + 130, GAME_HEIGHT - 55, "메뉴로", () => this.scene.start("menu"), { width: 220 });
  }

  /** Faint alternating rows suggesting stadium stands behind the fan bubbles. */
  private drawStands() {
    const g = this.add.graphics();
    const rowHeight = 46;
    for (let row = 0; row < Math.ceil(GAME_HEIGHT / rowHeight); row++) {
      g.fillStyle(row % 2 === 0 ? 0x15331f : 0x102819, 0.6);
      g.fillRect(0, row * rowHeight, GAME_WIDTH, rowHeight);
    }
  }

  private renderFanBubbles(pool: string[]) {
    const picks = Phaser.Utils.Array.Shuffle(pool.slice()).slice(0, Math.min(10, pool.length));
    const cols = 5;
    const rows = Math.ceil(picks.length / cols);
    const areaTop = 145;
    const areaBottom = GAME_HEIGHT - 90;
    const cellW = GAME_WIDTH / cols;
    const cellH = (areaBottom - areaTop) / rows;

    picks.forEach((phrase, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cellW * col + cellW / 2 + Phaser.Math.Between(-18, 18);
      const y = areaTop + cellH * row + cellH / 2 + Phaser.Math.Between(-12, 12);
      createSpeechBubble(this, x, y, phrase, { fontSize: "14px" });
    });
  }
}
