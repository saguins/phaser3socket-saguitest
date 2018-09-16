let playtext;

class MainMenu extends Phaser.Scene
{
    constructor (test)
    {
        super({ key: 'MainMenu' });
    }
    create ()
    {
        const width = this.scene.scene.physics.world.bounds.width;
        const height = this.scene.scene.physics.world.bounds.height;
        const x = width * 0.5;
        const y = height * 0.5;

        let style = { font: '65px Arial', fill: '#ff00ff', align: 'center' };
        playtext = this.add.text(x, y, 'Click to Play!', style).setOrigin(0.5, 0.5);
        playtext.setInteractive();
        playtext.on('pointerup', () =>
        {
            this.scene.start('Test');
        });
    }
    update ()
    {

    }
}
export default MainMenu;
