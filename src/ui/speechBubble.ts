import Phaser from "phaser";

interface SpeechBubbleOptions {
  fontSize?: string;
  fill?: number;
  textColor?: string;
  padding?: number;
}

/** A rounded speech bubble with a small downward tail, sized to fit the given text. */
export function createSpeechBubble(scene: Phaser.Scene, x: number, y: number, text: string, options: SpeechBubbleOptions = {}): Phaser.GameObjects.Container {
  const fontSize = options.fontSize ?? "14px";
  const fill = options.fill ?? 0xffffff;
  const textColor = options.textColor ?? "#1a1a1a";
  const padding = options.padding ?? 10;

  const label = scene.add.text(0, 0, text, { fontFamily: "Arial", fontSize, color: textColor, fontStyle: "bold" }).setOrigin(0.5);
  const w = label.width + padding * 2;
  const h = label.height + padding * 1.6;

  const g = scene.add.graphics();
  g.fillStyle(fill, 0.97);
  g.lineStyle(2, 0x222222, 0.2);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  g.fillTriangle(-7, h / 2 - 2, 7, h / 2 - 2, 0, h / 2 + 11);

  return scene.add.container(x, y, [g, label]);
}
