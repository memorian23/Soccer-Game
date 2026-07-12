import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import TacticsScene from "./scenes/TacticsScene";
import SquadScene from "./scenes/SquadScene";
import MatchScene from "./scenes/MatchScene";
import ResultScene from "./scenes/ResultScene";
import LeagueScene from "./scenes/LeagueScene";
import TransferScene from "./scenes/TransferScene";
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
  scene: [MenuScene, TacticsScene, SquadScene, MatchScene, ResultScene, LeagueScene, TransferScene],
});
