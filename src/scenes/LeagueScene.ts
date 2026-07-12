import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { PLAYER_CLUB_ID } from "../data/league";
import { leagueState } from "../state/leagueState";
import { makeButton } from "../ui/button";

const STANDINGS_HEADERS = ["순위", "팀", "경기", "승", "무", "패", "득실", "승점"];
const STANDINGS_COLS = [40, 90, 340, 400, 450, 500, 560, 640];

export default class LeagueScene extends Phaser.Scene {
  private contentLayer!: Phaser.GameObjects.Container;

  constructor() {
    super("league");
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b3d1f).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 30, "리그", { fontFamily: "Arial", fontSize: "24px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    makeButton(this, GAME_WIDTH - 90, 30, "메뉴로", () => this.scene.start("menu"), { width: 120, height: 36, fontSize: "14px" });

    this.contentLayer = this.add.container(0, 0);
    this.render();
  }

  private render() {
    this.contentLayer.removeAll(true);

    if (leagueState.isSeasonComplete()) {
      this.renderSeasonComplete();
      return;
    }

    const round = leagueState.getCurrentRound();
    this.addToLayer(
      this.add
        .text(GAME_WIDTH / 2, 62, `라운드 ${round} / ${leagueState.totalRounds}`, { fontFamily: "Arial", fontSize: "16px", color: "#9fd8b0" })
        .setOrigin(0.5),
    );

    this.renderStandings(90);
    this.renderFixtures(400);
  }

  private addToLayer(...objects: Phaser.GameObjects.GameObject[]) {
    this.contentLayer.add(objects);
  }

  private renderStandings(top: number) {
    STANDINGS_HEADERS.forEach((h, i) => {
      this.addToLayer(this.add.text(STANDINGS_COLS[i], top, h, { fontFamily: "Arial", fontSize: "13px", color: "#ffe066", fontStyle: "bold" }));
    });

    leagueState.getStandings().forEach((row, i) => {
      const y = top + 26 + i * 24;
      const color = row.isPlayer ? "#8fe0ff" : "#ffffff";
      const gd = row.goalsFor - row.goalsAgainst;
      const values = [`${i + 1}`, row.name, `${row.played}`, `${row.won}`, `${row.drawn}`, `${row.lost}`, `${gd >= 0 ? "+" : ""}${gd}`, `${row.points}`];
      values.forEach((v, j) => {
        this.addToLayer(this.add.text(STANDINGS_COLS[j], y, v, { fontFamily: "Arial", fontSize: "13px", color }));
      });
    });
  }

  private renderFixtures(top: number) {
    this.addToLayer(
      this.add
        .text(GAME_WIDTH / 2, top, "이번 라운드 경기", { fontFamily: "Arial", fontSize: "16px", color: "#ffe066", fontStyle: "bold" })
        .setOrigin(0.5),
    );

    leagueState.getCurrentRoundFixtures().forEach((f, i) => {
      const y = top + 40 + i * 40;
      const isPlayerFixture = f.homeId === PLAYER_CLUB_ID || f.awayId === PLAYER_CLUB_ID;
      const homeName = leagueState.getClubName(f.homeId);
      const awayName = leagueState.getClubName(f.awayId);
      const scoreStr = f.played ? `${f.homeScore} - ${f.awayScore}` : "vs";
      const label = `${homeName}  ${scoreStr}  ${awayName}`;

      this.addToLayer(
        this.add
          .text(GAME_WIDTH / 2 - (isPlayerFixture ? 60 : 0), y, label, {
            fontFamily: "Arial",
            fontSize: "15px",
            color: isPlayerFixture ? "#8fe0ff" : "#cccccc",
            fontStyle: isPlayerFixture ? "bold" : "normal",
          })
          .setOrigin(0.5),
      );

      if (isPlayerFixture && !f.played) {
        const btn = makeButton(this, GAME_WIDTH / 2 + 220, y, "경기 시작", () => this.scene.start("match", { league: true }), {
          width: 140,
          height: 34,
          fontSize: "14px",
        });
        this.addToLayer(btn.bg, btn.text);
      }
    });
  }

  private renderSeasonComplete() {
    const standings = leagueState.getStandings();
    const champion = standings[0];

    this.addToLayer(
      this.add.text(GAME_WIDTH / 2, 72, "시즌 종료!", { fontFamily: "Arial", fontSize: "26px", color: "#ffe066", fontStyle: "bold" }).setOrigin(0.5),
    );
    this.addToLayer(
      this.add.text(GAME_WIDTH / 2, 106, `우승: ${champion.name}`, { fontFamily: "Arial", fontSize: "18px", color: "#ffffff" }).setOrigin(0.5),
    );

    this.renderStandings(140);

    const btn = makeButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 55,
      "새 시즌 시작",
      () => {
        leagueState.resetSeason();
        this.render();
      },
      { width: 220 },
    );
    this.addToLayer(btn.bg, btn.text);
  }
}
