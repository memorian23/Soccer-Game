import { BatterProfile, PitcherProfile, Team } from "../data/team";
import { Half, MAX_BALLS, MAX_OUTS, MAX_STRIKES, TOTAL_INNINGS } from "../config";

export type PlayOutcome = "ball" | "strike" | "foul" | "walk" | "strikeout" | "out" | "single" | "double" | "triple" | "homerun";

/**
 * The full rule engine for a game: innings, half-inning/outs, the ball-strike count, base
 * runners (with correct force-advance logic), score, batting order rotation, and end-of-game
 * detection (including 9th-inning walk-offs and skipping the bottom half when the home team
 * is already ahead). Pure state + transitions - no rendering, no randomness of its own, so any
 * future pitching/batting mini-game just needs to call these methods with its outcome.
 */
export class GameState {
  inning = 1;
  half: Half = "top";
  outs = 0;
  balls = 0;
  strikes = 0;
  /** [1st, 2nd, 3rd] occupied. */
  bases: [boolean, boolean, boolean] = [false, false, false];
  score = { home: 0, away: 0 };
  gameOver = false;
  lastPlay = "경기 시작!";

  private batterIndex = { home: 0, away: 0 };

  constructor(
    private homeTeam: Team,
    private awayTeam: Team,
  ) {}

  get battingTeam(): Team {
    return this.half === "top" ? this.awayTeam : this.homeTeam;
  }

  get fieldingTeam(): Team {
    return this.half === "top" ? this.homeTeam : this.awayTeam;
  }

  get currentBatter(): BatterProfile {
    const team = this.battingTeam;
    return team.lineup[this.batterIndex[team.id as "home" | "away"]];
  }

  get currentPitcher(): PitcherProfile {
    return this.fieldingTeam.pitcher;
  }

  private addRuns(team: "home" | "away", runs: number) {
    if (runs <= 0) return;
    this.score[team] += runs;
    this.checkWalkOff();
  }

  private endAtBat() {
    const team = this.battingTeam;
    const key = team.id as "home" | "away";
    this.batterIndex[key] = (this.batterIndex[key] + 1) % team.lineup.length;
    this.balls = 0;
    this.strikes = 0;
  }

  recordBall() {
    if (this.gameOver) return;
    this.balls++;
    if (this.balls >= MAX_BALLS) {
      this.walk();
    } else {
      this.lastPlay = "볼";
    }
  }

  recordStrike(isFoul = false) {
    if (this.gameOver) return;
    if (isFoul && this.strikes >= MAX_STRIKES - 1) {
      this.lastPlay = "파울";
      return; // a foul never completes the 3rd strike
    }
    this.strikes++;
    this.lastPlay = isFoul ? "파울" : "스트라이크";
    if (this.strikes >= MAX_STRIKES) {
      this.strikeout();
    }
  }

  private walk() {
    const batter = this.currentBatter;
    const [hadFirst, hadSecond, hadThird] = this.bases;
    const runsForced = hadFirst && hadSecond && hadThird ? 1 : 0;
    const newThird = hadFirst && hadSecond ? true : hadThird;
    const newSecond = hadFirst ? true : hadSecond;
    this.bases = [true, newSecond, newThird];

    this.lastPlay = `${batter.name} 볼넷`;
    this.addRuns(this.battingTeam.id as "home" | "away", runsForced);
    this.endAtBat();
  }

  strikeout() {
    if (this.gameOver) return;
    this.lastPlay = `${this.currentBatter.name} 삼진 아웃`;
    this.registerOut();
  }

  /** A ball put in play that doesn't become a hit (ground/fly/line out). Runners hold. */
  fieldOut() {
    if (this.gameOver) return;
    this.lastPlay = `${this.currentBatter.name} 아웃`;
    this.registerOut();
  }

  private registerOut() {
    this.outs++;
    this.endAtBat();
    if (this.outs >= MAX_OUTS) {
      this.advanceHalfInning();
    }
  }

  /** A pickoff catches a runner off base. The batter's own count/at-bat is untouched. */
  pickoffOut(baseIdx: 0 | 1 | 2) {
    if (this.gameOver || !this.bases[baseIdx]) return;
    const newBases = [...this.bases] as [boolean, boolean, boolean];
    newBases[baseIdx] = false;
    this.bases = newBases;

    const label = ["1루", "2루", "3루"][baseIdx];
    this.lastPlay = `견제사! ${label} 주자 아웃`;

    this.outs++;
    if (this.outs >= MAX_OUTS) {
      this.advanceHalfInning();
    }
  }

  hit(basesAdvanced: 1 | 2 | 3 | 4) {
    if (this.gameOver) return;
    const batter = this.currentBatter;
    let runs = 0;
    const newBases: [boolean, boolean, boolean] = [false, false, false];

    this.bases.forEach((occupied, idx) => {
      if (!occupied) return;
      const newPos = idx + basesAdvanced;
      if (newPos >= 3) runs++;
      else newBases[newPos] = true;
    });

    if (basesAdvanced === 4) {
      runs++;
    } else {
      newBases[basesAdvanced - 1] = true;
    }
    this.bases = newBases;

    const labels = { 1: "1루타", 2: "2루타", 3: "3루타", 4: "홈런" } as const;
    this.lastPlay = `${batter.name} ${labels[basesAdvanced]}!${runs > 0 ? ` (${runs}점 득점)` : ""}`;

    this.addRuns(this.battingTeam.id as "home" | "away", runs);
    this.endAtBat();
  }

  private advanceHalfInning() {
    this.outs = 0;
    this.bases = [false, false, false];
    this.balls = 0;
    this.strikes = 0;

    if (this.half === "top") {
      if (this.inning >= TOTAL_INNINGS && this.score.home > this.score.away) {
        this.endGame();
        return;
      }
      this.half = "bottom";
    } else {
      // A tie after 9 goes to extra innings; otherwise the game is decided.
      if (this.inning >= TOTAL_INNINGS && this.score.home !== this.score.away) {
        this.endGame();
        return;
      }
      this.half = "top";
      this.inning++;
    }
  }

  private checkWalkOff() {
    if (this.gameOver) return;
    if (this.inning >= TOTAL_INNINGS && this.half === "bottom" && this.score.home > this.score.away) {
      this.endGame();
    }
  }

  private endGame() {
    this.gameOver = true;
    const winner = this.score.home === this.score.away ? "무승부" : this.score.home > this.score.away ? this.homeTeam.name : this.awayTeam.name;
    this.lastPlay = winner === "무승부" ? "경기 종료 - 무승부" : `경기 종료 - ${winner} 승리!`;
  }
}
