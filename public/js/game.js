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
  scene: {
    preload,
    create,
    update
  }
}

const game = new Phaser.Game(config)

let water_tiles = [];
let bullet_array = [];
let getsize = false;
let name;
let nametext, scoretext, bosstext, numboardnametext;
let otherheight;
let gameover;

let player;
let isplayerdead = false;

function preload() {
  this.load.image('player', 'assets/spaceShips_001.png')
  this.load.image('otherPlayer', 'assets/enemyBlack5.png')
  this.load.image('monster', 'assets/monster.png')
  this.load.image('star', 'assets/star_gold.png')
  this.load.image('bullet', 'assets/star_gold.png')
  this.load.image('water', 'assets/water_tile.png')

  this.load.image('gameover', 'assets/gameover.png')
}

function create() {
  const width = 2000;
  const height = 2000;
  const devicewidth = document.body.clientWidth;
  const deviceheight = screen.height * 0.8;
  const x = devicewidth / 2;
  const y = deviceheight / 2;

  this.physics.world.setBounds(0, 0, width, height);

  for (var i = 0; i <= width / 64 + 1; i++) {
    for (var j = 0; j <= height / 64 + 1; j++) {
      var tile_sprite = this.add.sprite(i * 64, j * 64, 'water');
      tile_sprite.setOrigin(0.5, 0.5)
      water_tiles.push(tile_sprite);
    }
  }

  let self = this
  this.socket = io()
  player = this.physics.add.sprite(0, 0, 'player').setOrigin(0.5, 0.5).setDisplaySize(53, 40).setCollideWorldBounds(true);
  this.bullets = this.physics.add.group()
  this.otherPlayers = this.physics.add.group()
  this.otherNames = this.add.group()
  this.monsters = this.physics.add.group()
  this.stars = this.physics.add.group();
  this.cursors = this.input.keyboard.createCursorKeys()

  nametext = this.add.text(16, 15, '', { fontSize: '28px', fill: '#FFF' }).setScrollFactor(0);
  scoretext = this.add.text(16, 50, 'Total Score: 0', { fontSize: '18px', fill: '#FFF' }).setScrollFactor(0);
  bosstext = this.add.text(250, 50, 'BOSS: ?????', { fontSize: '18px', fill: '#FFF' }).setScrollFactor(0);
  let num = ["1.", "2.", "3.", "4.", "5."];
  numboardtext = this.add.text(devicewidth - 270, 15, num, { fontSize: '12px', fill: '#FFF', lineSpacing: 10 }).setScrollFactor(0);
  boardnametext = this.add.text(devicewidth - 240, 15, 'player', { fontSize: '12px', fill: '#FFF', lineSpacing: 10 }).setScrollFactor(0);
  boardscoretext = this.add.text(devicewidth - 80, 15, '0', { fontSize: '12px', fill: '#FFF', lineSpacing: 10 }).setScrollFactor(0);

  gameover = this.add.sprite(x, y, 'gameover').setScale(1, 1).setInteractive().setScrollFactor(0);
  gameover.setVisible(false);
  gameover.on('pointerdown', function (event) {
    gameover.setVisible(false);
    player.setVisible(true);
    player.x = Math.floor(Math.random() * 700) + 50;
    player.y = Math.floor(Math.random() * 700) + 50;
    isplayerdead = false
    scoretext.setText('Total Score: 0');

    self.socket.emit('updateDeadPlayer', {
      playerid: self.socket.id,
    })
  });

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        console.log('player ' + players[id].playerId + ' joined the game!')
        player.id = players[id].playerId
        player.x = players[id].x
        player.y = players[id].y
        player.setTint(0x0000ff)

        nametext.setText('Name: ' + players[id].playerId);
      } else {
        addOtherPlayers(self, players[id])
      }
    })
  })

  this.socket.on('currentMonster', function (mon) {
    Object.keys(mon).forEach(function (id) {
      addMonsters(self, mon[id])
    })
  })

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo)
  })

  this.socket.on('newEnemy', function (monInfo) {
    addMonsters(self, monInfo)
  })

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy()
      }
    })
    self.otherNames.getChildren().forEach(function (otherName) {
      if (playerId === otherName.playerId) {
        otherName.destroy()
      }
    })
  })

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.angle = playerInfo.angle;
        otherPlayer.setPosition(playerInfo.x, playerInfo.y)
      }
    })
    self.otherNames.getChildren().forEach(function (otherName) {
      if (playerInfo.playerId === otherName.playerId) {
        otherName.setPosition(playerInfo.x, playerInfo.y - otherheight)
      }
    })
  })

  this.physics.add.overlap(player, this.monsters, checkHit);

  this.socket.on('killUpdate', function (total) {
    console.log('total kill: ' + total)
  })

  this.socket.on('playerScoreUpdate', function (total) {
    if(total.playerid === self.socket.id){
      scoretext.setText('Total Score: ' + total.score);
    }
  })

  this.socket.on('bulletsUpdate', function (server_bullet_array) {
    // If there's not enough bullets on the client, create them
    for (let i = 0; i < server_bullet_array.length; i++) {
      if (bullet_array[i] == undefined) {
        bullet_array[i] = self.add.sprite(server_bullet_array[i].x, server_bullet_array[i].y, 'bullet').setOrigin(0.5, 0.5);
      } else {
        //Otherwise, just update it! 
        bullet_array[i].x = server_bullet_array[i].x;
        bullet_array[i].y = server_bullet_array[i].y;
      }
    }
    // Otherwise if there's too many, delete the extra 
    for (let i = server_bullet_array.length; i < bullet_array.length; i++) {
      bullet_array[i].destroy();
      bullet_array.splice(i, 1);
      i--;
    }
  })

  this.socket.on('monsterMoved', function (mon) {
    self.monsters.getChildren().forEach(function (monster) {
      if (monster.id == mon[monster.id].id) {
        monster.x = mon[monster.id].x
        monster.y = mon[monster.id].y
      }
    })
  })

  this.socket.on('bossUpdate', function (hp) {
    self.monsters.getChildren().forEach(function (monster) {
      if (monster.id == 101) {
        monster.health = hp
        bosstext.setText('BOSS: ALIVE (' + monster.health + '/300)');
      }
    })
  })

  this.socket.on('monsterGetKilled', function (id) {
    self.monsters.getChildren().forEach(function (monster) {
      if (monster.id == id) {
        self.stars.getChildren().forEach(function (star) {
          if (star.id == id) {
            self.physics.add.overlap(player, star, function dummyCollectStar() {
              self.socket.emit('starCollected', {
                playerid: player.id,
                starid: star.id
              })
            }, null, self)
            star.x = monster.x;
            star.y = monster.y;
            star.setVisible(true);
          }
        })
        if (monster.id == 101) {
          console.log('BOSS (' + monster.id + ') has been slain!')
          bosstext.setText('BOSS: DEATH');
          monster.destroy()
        } else {
          console.log(monster.id + ' has been slain!')
          monster.destroy()
        }
      }
    })
  })

  this.socket.on('starUpdate', function (id) {
    self.stars.getChildren().forEach(function (star) {
      if (star.id == id) {
        console.log('DESTROY STAR='+id)
        star.destroy()
      }
    })
  })

  this.socket.on('leaderboardNameUpdate', function (leaders) {
    console.log(leaders)
    boardnametext.setText(leaders)
  })

  this.socket.on('leaderboardScoreUpdate', function (leaders) {
    console.log(leaders)
    boardscoretext.setText(leaders)
  })

  this.cameras.main.startFollow(player, true, 1, 1);
}

function update() {
  if (isplayerdead == false) {
    if (this.cursors.left.isDown) {
      player.setVelocityX(-250);
      player.angle = 90;
    } else if (this.cursors.right.isDown) {
      player.setVelocityX(250);
      player.angle = -90;
    } else {
      player.setVelocityX(0);

    }

    if (this.cursors.up.isDown) {
      player.setVelocityY(-250);
      player.angle = 180;
    } else if (this.cursors.down.isDown) {
      player.setVelocityY(250);
      player.angle = 0;
    } else {
      player.setVelocityY(0);
    }

    if (this.cursors.space.isDown) {
      this.socket.emit('shoot-bullet', {
        x: player.x,
        y: player.y,
        angle: player.angle,
        basex: player.x,
        basey: player.y,
      });
    }
  }

  // emit player movement
  let x = player.x
  let y = player.y
  let r = player.angle
  if (player.oldPosition && (x !== player.oldPosition.x || y !== player.oldPosition.y || r !== player.oldPosition.angle)) {
    this.socket.emit('playerMovement', {
      x: player.x,
      y: player.y,
      angle: player.angle
    })
  }
  // save old position data
  player.oldPosition = {
    x: player.x,
    y: player.y,
    angle: player.angle
  }
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'player').setOrigin(0.5, 0.5).setDisplaySize(53, 40)
  otherPlayer.setTint(0x0000ff)
  otherPlayer.playerId = playerInfo.playerId
  self.otherPlayers.add(otherPlayer)

  otherheight = otherPlayer.height / 2
  const othername = self.add.text(playerInfo.x, playerInfo.y - otherheight, playerInfo.playerId, { fontSize: '14px', fill: '#FFF' }).setOrigin(0.5, 0.5)
  othername.playerId = playerInfo.playerId
  self.otherNames.add(othername)


}

function addMonsters(self, monInfo) {
  if (monInfo.id != undefined) {
    if (monInfo.id == 101) {
      const boss = self.physics.add.sprite(monInfo.x, monInfo.y, 'monster').setScale(2, 2).setCollideWorldBounds(true);
      boss.setTint(0xFF0080)
      boss.id = monInfo.id
      boss.health = monInfo.health
      console.log("add BOSS id=" + boss.id)
      self.monsters.add(boss)

      bosstext.setText('BOSS: ALIVE (' + boss.health + '/300)');
    } else {
      const monster = self.physics.add.sprite(monInfo.x, monInfo.y, 'monster').setScale(0.5, 0.5).setCollideWorldBounds(true);
      monster.setTint(0x00FF00)
      monster.id = monInfo.id
      monInfo.health = monInfo.health
      console.log("add MONSTER id=" + monster.id)
      self.monsters.add(monster)
    }
    const star = self.physics.add.sprite(monInfo.x, monInfo.y, 'star').setVisible(false)
    star.id = monInfo.id
    self.physics.add.overlap(player, star, function dummyCollectStar() {
      self.socket.emit('starCollected', {
        id: star.id
      })
    }, null, self)
    self.stars.add(star);
  }
}

function checkHit() {
  gameover.setVisible(true).setDepth(1);
  player.setVisible(false);
  player.setVelocityX(0);
  player.setVelocityY(0);
  isplayerdead = true;
}
