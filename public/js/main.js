import 'phaser';
import Game from './game';

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: document.body.clientWidth,
    height: screen.height * 0.8,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 0 }
      }
    },
    scene: [
        Game
    ]
  }

const game = new Phaser.Game(config);