import 'phaser';
import MainMenu from './MainMenu';
import Test from './Test';
import socket from './socket';

const WIDTH = document.body.clientWidth;
const HEIGHT = screen.height * 0.9;
let config = {
    type: Phaser.WEBGL,
    parent: 'content',
    width: 800,
    height: 600,
    scaleMode: 0, // Phaser.ScaleManager.EXACT_FIT,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: [
        MainMenu,
        Test
    ]
};
socket.on('news', (data) => 
{
    console.log(data);
});
let game = new Phaser.Game(config);
