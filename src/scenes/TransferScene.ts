import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, Role } from "../config";
import { MARKET_POOL, MarketPlayer } from "../data/market";
import { PlayerProfile } from "../data/squad";
import { teamState } from "../state/teamState";
import { makeButton } from "../ui/button";

const ROLE_LABEL: Record<Role, string> = { GK: "GK", DF: "DF", MF: "MF", FW: "FW" };
const DEFAULT_HINT = "영입은 예산이 충분할 때, 방출은 해당 포지션에 여유가 있을 때 가능합니다.";

export default class TransferScene extends Phaser.Scene {
  private listLayer!: Phaser.GameObjects.Container;
  private budgetText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super("transfer");
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b3d1f).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 28, "이적시장", { fontFamily: "Arial", fontSize: "22px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    this.budgetText = this.add.text(GAME_WIDTH / 2, 54, "", { fontFamily: "Arial", fontSize: "15px", color: "#ffe066" }).setOrigin(0.5);
    this.hintText = this.add.text(GAME_WIDTH / 2, 74, DEFAULT_HINT, { fontFamily: "Arial", fontSize: "12px", color: "#9fd8b0" }).setOrigin(0.5);

    makeButton(this, GAME_WIDTH - 90, 28, "메뉴로", () => this.scene.start("menu"), { width: 120, height: 36, fontSize: "14px" });

    this.listLayer = this.add.container(0, 0);
    this.render();
  }

  private render() {
    this.listLayer.removeAll(true);
    this.budgetText.setText(`보유 자금: ${teamState.getBudget()}`);

    const colWidth = (GAME_WIDTH - 140) / 2;
    const col1X = 70;
    const col2X = col1X + colWidth + 20;
    const top = 100;

    const available = MARKET_POOL.filter((p) => !teamState.isSigned(p.id));
    this.addTitle(col1X + colWidth / 2, top, `영입 가능 선수 (${available.length})`);
    available.forEach((p, i) => this.addMarketRow(col1X, top + 30 + i * 32, colWidth, p));

    this.addTitle(col2X + colWidth / 2, top, `현재 스쿼드 (${teamState.squad.length})`);
    teamState.squad.forEach((p, i) => this.addSquadRow(col2X, top + 30 + i * 25, colWidth, p));
  }

  private addTitle(x: number, y: number, label: string) {
    this.listLayer.add(this.add.text(x, y, label, { fontFamily: "Arial", fontSize: "15px", color: "#ffe066", fontStyle: "bold" }).setOrigin(0.5));
  }

  private addMarketRow(x: number, y: number, width: number, player: MarketPlayer) {
    const bg = this.add.rectangle(x, y, width, 28, 0x123a22, 1).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.25);
    const label = `${ROLE_LABEL[player.role]}  #${player.number}  ${player.name} (${player.rating})`;
    const text = this.add.text(x + 8, y, label, { fontFamily: "Arial", fontSize: "12px", color: "#ffffff" }).setOrigin(0, 0.5);
    const priceText = this.add.text(x + width - 120, y, `${player.price}`, { fontFamily: "Arial", fontSize: "12px", color: "#ffe066" }).setOrigin(0, 0.5);
    this.listLayer.add([bg, text, priceText]);

    const btn = makeButton(this, x + width - 44, y, "영입", () => this.onSign(player), { width: 68, height: 24, fontSize: "12px" });
    this.listLayer.add([btn.bg, btn.text]);
  }

  private addSquadRow(x: number, y: number, width: number, player: PlayerProfile) {
    const bg = this.add.rectangle(x, y, width, 23, 0x123a22, 1).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.2);
    const label = `${ROLE_LABEL[player.role]}  #${player.number}  ${player.name} (${player.rating})`;
    const text = this.add.text(x + 8, y, label, { fontFamily: "Arial", fontSize: "11px", color: "#ffffff" }).setOrigin(0, 0.5);
    this.listLayer.add([bg, text]);

    const btn = makeButton(this, x + width - 38, y, "방출", () => this.onRelease(player.id), {
      width: 60,
      height: 20,
      fontSize: "11px",
      bg: 0x6b1f1f,
      bgHover: 0x8a2a2a,
    });
    this.listLayer.add([btn.bg, btn.text]);
  }

  private onSign(player: MarketPlayer) {
    const ok = teamState.signPlayer(player);
    this.hintText.setText(ok ? `${player.name} 영입 완료!` : "예산이 부족합니다.");
    this.render();
  }

  private onRelease(id: string) {
    const player = teamState.squad.find((p) => p.id === id);
    const ok = teamState.releasePlayer(id);
    this.hintText.setText(ok ? `${player?.name ?? ""} 방출 완료.` : "해당 포지션 최소 인원 때문에 방출할 수 없어요.");
    this.render();
  }
}
