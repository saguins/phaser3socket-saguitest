let platforms;
let player;
let cursors;
let stars;
let score = 0;
let scoreText;
let bomb;
let bombs;
let gameover = false;

class Test extends Phaser.Scene
{
    constructor (test)
    {
        super({ key: 'Test' });
    }
    preload ()
    {
        this.load.image('sky', '../images/sky.png');
        this.load.image('ground', '../images/platform.png');
        this.load.image('star', '../images/star.png');
        this.load.image('bomb', '../images/bomb.png');
        this.load.spritesheet('dude',
            '../images/dude.png',
            { frameWidth: 32, frameHeight: 48 }
        );
    }
    create ()
    {
        const width = this.scene.scene.physics.world.bounds.width;
        const height = this.scene.scene.physics.world.bounds.height;
        const x = width * 0.5;
        const y = height * 0.5;

        this.add.image(400, 300, 'sky');

        platforms = this.physics.add.staticGroup();

        platforms.create(400, 568, 'ground').setScale(2).refreshBody();

        platforms.create(600, 400, 'ground');
        platforms.create(50, 250, 'ground');
        platforms.create(750, 220, 'ground');

        player = this.physics.add.sprite(100, 450, 'dude');

        player.setBounce(0.2);
        player.setCollideWorldBounds(true);

        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'turn',
            frames: [ { key: 'dude', frame: 4 } ],
            frameRate: 20
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        this.physics.add.collider(player, platforms);

        cursors = this.input.keyboard.createCursorKeys();

        stars = this.physics.add.group({
            key: 'star',
            repeat: 11,
            setXY: { x: 12, y: 0, stepX: 70 } // ตำแหน่ง x y ที่spawn, stepxคือระยะห่างxระหว่างตัว
        });

        // การใส่funcให้objแต่ละตัว โดยในที่นี้คือใส่แรนด้อมการเด้งให้ทุกตัว
        stars.children.iterate(function (child)
        {
            child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.6));
        });

        this.physics.add.collider(stars, platforms);
        this.physics.add.overlap(player, stars, collectStar, null, this);

        scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' });
    
        bombs = this.physics.add.group();
        this.physics.add.collider(bombs, platforms);
        this.physics.add.collider(player, bombs, hitBomb, null, this);
    }
    update ()
    {
        if (cursors.left.isDown)
        {
            player.setVelocityX(-160);
            player.anims.play('left', true);
        }
        else if (cursors.right.isDown)
        {
            player.setVelocityX(160);
            player.anims.play('right', true);
        }
        else
        {
            player.setVelocityX(0);
            player.anims.play('turn');
        }

        if (cursors.up.isDown && player.body.touching.down)
        {
            player.setVelocityY(-330);
        }
        
        if (gameover === true)
        {
            if (cursors.space.isDown)
            {
                bomb.disableBody(true, true);
                gameover = false;
                score = 0;
                scoreText.setText('Score: ' + score);

                this.physics.resume();
                this.scene.restart();
                this.scene.start('MainMenu');
            }
        }
    }
}

function collectStar (player, star)
{
    star.disableBody(true, true);
    score += 100;
    scoreText.setText('Score: ' + score);

    if (stars.countActive(true) === 0)
    {
        stars.children.iterate(function (child)
        {
            child.enableBody(true, child.x, 0, true, true);
        });

        let bombx = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);

        bomb = bombs.create(bombx, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.allowGravity = false;
    }
}

function hitBomb (player, bomb)
{
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');

    gameover = true;
}

export default Test;
