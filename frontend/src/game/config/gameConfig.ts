import Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 32;

export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
  parent: string,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#87CEEB',
    pixelArt: true, // 픽셀 아트 스타일 유지
    scene: scenes,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: process.env.NODE_ENV === 'development',
      },
    },
  };
}
