import Phaser from 'phaser';

import { VillageScene } from './scenes/VillageScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scene: [VillageScene],
  parent: 'phaser-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  backgroundColor: '#87c05a',
  audio: { noAudio: true },
};
