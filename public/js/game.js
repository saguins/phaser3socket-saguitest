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
let nametext;
let killtext;
let bosstext;
let otherheight;
let playergethit;
let timedEvent;

function preload() {
  this.load.image('player', 'assets/spaceShips_001.png')
  this.load.image('otherPlayer', 'assets/enemyBlack5.png')
  this.load.image('monster', 'assets/monster.png')
  this.load.image('star', 'assets/star_gold.png')
  this.load.image('bullet', 'assets/star_gold.png')
  this.load.image('water', 'assets/water_tile.png')
}

function create() {
  const width = document.body.clientWidth;
  const height = screen.height * 0.8;

  for (var i = 0; i <= width * 1.5 / 64 + 1; i++) {
    for (var j = 0; j <= height * 1.5 / 64 + 1; j++) {
      var tile_sprite = this.add.sprite(i * 64, j * 64, 'water');
      tile_sprite.setOrigin(0.5, 0.5)
      water_tiles.push(tile_sprite);
    }
  }

  let self = this
  this.socket = io()
  this.player = this.physics.add.sprite(0, 0, 'player').setOrigin(0.5, 0.5).setDisplaySize(53, 40).setCollideWorldBounds(true);
  this.bullets = this.physics.add.group()
  this.otherPlayers = this.physics.add.group()
  this.otherNames = this.add.group()
  this.monsters = this.physics.add.group()
  this.cursors = this.input.keyboard.createCursorKeys()

  nametext = this.add.text(16, 15, '', { fontSize: '28px', fill: '#000' });
  killtext = this.add.text(16, 60, 'Total kill: ', { fontSize: '28px', fill: '#000' });
  bosstext = this.add.text(16, 105, 'BOSS: ?????', { fontSize: '28px', fill: '#000' });

  this.socket.emit('sendResolution', {
    width: width,
    height: height
  });

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        console.log('player ' + players[id].playerId + ' joined the game!')
        self.player.x = players[id].x
        self.player.y = players[id].y
        self.player.setTint(0x0000ff)

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

  this.physics.add.overlap(this.player, this.monsters, checkHit);

  this.socket.on('killUpdate', function (total) {
    killtext.setText('Total kill: ' + total);
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
    console.log('GET ' + id)
    self.monsters.getChildren().forEach(function (monster) {
      if (monster.id == id) {
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
}

function update() {
  if (this.cursors.left.isDown) {
    this.player.setVelocityX(-160);
    this.player.angle = 90;
  } else if (this.cursors.right.isDown) {
    this.player.setVelocityX(160);
    this.player.angle = -90;
  } else {
    this.player.setVelocityX(0);

  }

  if (this.cursors.up.isDown) {
    this.player.setVelocityY(-160);
    this.player.angle = 180;
  } else if (this.cursors.down.isDown) {
    this.player.setVelocityY(160);
    this.player.angle = 0;
  } else {
    this.player.setVelocityY(0);
  }

  if (this.cursors.space.isDown) {
    this.socket.emit('shoot-bullet', {
      x: this.player.x,
      y: this.player.y,
      angle: this.player.angle,
      basex: this.player.x,
      basey: this.player.y,
    });
  }

  // emit player movement
  let x = this.player.x
  let y = this.player.y
  let r = this.player.angle
  if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y || r !== this.player.oldPosition.angle)) {
    this.socket.emit('playerMovement', {
      x: this.player.x,
      y: this.player.y,
      angle: this.player.angle
    })
  }
  // save old position data
  this.player.oldPosition = {
    x: this.player.x,
    y: this.player.y,
    angle: this.player.angle
  }
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'player').setOrigin(0.5, 0.5).setDisplaySize(53, 40)
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
      const boss = self.add.sprite(monInfo.x, monInfo.y, 'monster').setScale(2, 2);
      boss.setTint(0xFF0080)
      boss.id = monInfo.id
      boss.health = monInfo.health
      console.log("add BOSS id=" + boss.id)
      self.monsters.add(boss)

      bosstext.setText('BOSS: ALIVE (' + boss.health + '/300)');
    } else {
      const monster = self.add.sprite(monInfo.x, monInfo.y, 'monster').setScale(0.5, 0.5);
      monster.setTint(0x00FF00)
      monster.id = monInfo.id
      monInfo.health = monInfo.health
      console.log("add MONSTER id=" + monster.id)
      self.monsters.add(monster)
    }
  }
}

function checkHit(player) {
  if (player.body.touching.down) {
    player.y -= 50
  } else if (player.body.touching.up) {
    player.y += 50
  } else if (player.body.touching.left) {
    player.x += 50
  } else if (player.body.touching.right) {
    player.x -= 50
  }
}
