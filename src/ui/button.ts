import Phaser from "phaser";
import { sfx } from "../audio/sfx";

interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: string;
  bg?: number;
  bgHover?: number;
  textColor?: string;
}

export interface Button {
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  setActive: (active: boolean) => void;
}

/** A simple rectangle + label button, used across the menu/tactics/squad screens. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, options: ButtonOptions = {}): Button {
  const width = options.width ?? 220;
  const height = options.height ?? 44;
  const bgColor = options.bg ?? 0x1c5c33;
  const bgHover = options.bgHover ?? 0x27793f;
  const activeColor = 0x2f8f52;

  const bg = scene.add.rectangle(x, y, width, height, bgColor, 1).setStrokeStyle(2, 0xffffff, 0.4);
  const text = scene.add
    .text(x, y, label, { fontFamily: "Arial", fontSize: options.fontSize ?? "16px", color: options.textColor ?? "#ffffff" })
    .setOrigin(0.5);

  let isActive = false;

  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerover", () => bg.setFillStyle(isActive ? activeColor : bgHover));
  bg.on("pointerout", () => bg.setFillStyle(isActive ? activeColor : bgColor));
  bg.on("pointerdown", () => {
    sfx.click();
    onClick();
  });

  return {
    bg,
    text,
    setActive: (active: boolean) => {
      isActive = active;
      bg.setFillStyle(active ? activeColor : bgColor);
    },
  };
}
