import Phaser from "phaser";
import MatchScene from "./scenes/MatchScene";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#0b3d1f",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MatchScene],
});
