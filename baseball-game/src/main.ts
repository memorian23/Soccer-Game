import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { ResultScene } from "./scenes/ResultScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#0c1420",
  scene: [MenuScene, GameScene, ResultScene],
});
