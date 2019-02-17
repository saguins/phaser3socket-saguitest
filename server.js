var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io').listen(server)

let width = 2000;
let height = 2000;

var players = {}
let mon = {}
let star = {}

const maxmonster = 10;
const monsterspeed = 2;
let monsizewidth = 50;
let monsizeheight = 50;
let bosssizewidth = 100;
let bosssizeheight = 100;

var bullet_array = [];
const bulletspeed = 50;

var totalkill = 0
let bossalive = false

let leaderArr = ["player", "player", "player", "player", "player"];
let leaderscoreArr = [-1, -1, -1, -1, -1];

app.use(express.static(__dirname + '/public'))

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`)
})

io.on('connection', function (socket) {
  console.log('a user connected: ', socket.id)
  // create a new player and add it to our players object
  players[socket.id] = {
    angle: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 700) + 50,
    playerId: socket.id,
    score: 0
  }

  socket.emit('currentPlayers', players)
  socket.emit('currentMonster', mon)

  socket.emit('killUpdate', totalkill)

  socket.broadcast.emit('newPlayer', players[socket.id])
  socket.broadcast.emit('newEnemy', mon)

  updateLeaderBoard()

  socket.emit('leaderboardNameUpdate', leaderArr)
  socket.emit('leaderboardScoreUpdate', leaderscoreArr)

  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x
    players[socket.id].y = movementData.y
    players[socket.id].angle = movementData.angle
    socket.broadcast.emit('playerMoved', players[socket.id])
  })

  socket.on('shoot-bullet', function (data) {
    if (players[socket.id] == undefined) return;
    var new_bullet = data;
    data.owner_id = socket.id;
    bullet_array.push(new_bullet);
  });

  socket.on('updateDeadPlayer', function (data) {
    if (players[socket.id].playerId == data.playerid) {
      console.log('player (' + players[socket.id].playerId + ') is dead! now respawn.')
      players[socket.id].score = 0;

      for (var i = 0; i < leaderArr.length; i++) {
        if (leaderArr[i] == players[socket.id].playerId) {
          leaderscoreArr[i] = players[socket.id].score;
        }
      }

      updateLeaderBoard();
    }
  });

  socket.on('disconnect', function () {
    console.log('user disconnected', socket.id)
    for (var i = 0; i < leaderArr.length; i++) {
      if (leaderArr[i] == players[socket.id].playerId) {
        leaderArr[i] = 'player';
        leaderscoreArr[i] = -1;
        break;
      }
    }
    delete players[socket.id]
    updateLeaderBoard();

    io.emit('disconnect', socket.id)
  })

  socket.on('starCollected', function (newstarid) {
    if (players[socket.id].playerId == newstarid.playerid) {
      players[socket.id].score += Math.floor(Math.random() * (100 - 10) + 10);
      console.log('player (' + players[socket.id].playerId + ') score: ' + players[socket.id].score)
      delete star[newstarid.starid];
      let total = { playerid: players[socket.id].playerId, score: players[socket.id].score }
      io.emit('playerScoreUpdate', total)
      io.emit('starUpdate', newstarid.starid)

      updateLeaderBoard()
    }
  })
})

function updateLeaderBoard() {
  for (var key in players) {
    //console.log('id: ' + players[key].playerId + ' have score: ' + players[key].score);
    for (let i = 0; i < leaderscoreArr.length; i++) {
      if (players[key].score > leaderscoreArr[i]) {
        if (players[key].playerId == leaderArr[i]) {
          leaderscoreArr[i] = players[key].score;
          break;
        } else {
          if (i < 4) {
            leaderArr[i + 1] = leaderArr[i];
            leaderscoreArr[i + 1] = leaderscoreArr[i]
          }
          leaderArr[i] = players[key].playerId;
          leaderscoreArr[i] = players[key].score;
          break;
        }
      } else if (players[key].score == leaderscoreArr[i]) {
        if (players[key].playerId == leaderArr[i]) {
          leaderscoreArr[i] = players[key].score;
          break;
        }
      }
    }
  }
  io.emit('leaderboardNameUpdate', leaderArr)
  io.emit('leaderboardScoreUpdate', leaderscoreArr)
}

function updateSpeedBullets() {
  for (var i = 0; i < bullet_array.length; i++) {
    var bullet = bullet_array[i];
    switch (bullet.angle) {
      case 90:
        bullet.x -= bulletspeed;
        bullet.y = bullet.basey;
        break;
      case -90:
        bullet.x += bulletspeed;
        bullet.y = bullet.basey;
        break;
      case -180:
        bullet.x = bullet.basex;
        bullet.y -= bulletspeed;
        break;
      case 0:
        bullet.x = bullet.basex;
        bullet.y += bulletspeed;
        break;
    }

    for (var key in mon) {
      if (mon[key].id != 101) {
        let xleft = mon[key].x - (monsizewidth / 2);
        let xright = mon[key].x + (monsizewidth / 2);
        let ytop = mon[key].y - (monsizeheight / 2);
        let ybottom = mon[key].y + (monsizeheight / 2);
        if (bullet.x > xleft && bullet.x < xright && bullet.y > ytop && bullet.y < ybottom) {
          mon[key].health--
        }
        if (mon[key].health <= 0) {
          console.log('SEND ' + key)
          console.log(key + " get killed!")
          io.emit('monsterGetKilled', key);
          star[mon[key].id] = {
            x: mon[key].x,
            y: mon[key].y,
            playerId: mon[key].id,
          }
          io.emit('starCreate', star[mon[key].id])
          delete mon[key]

          totalkill += 1
          console.log('Total kill: ' + totalkill)
          io.emit('killUpdate', totalkill)
        }
      } else {
        let xleft = mon[key].x - (bosssizewidth / 2);
        let xright = mon[key].x + (bosssizewidth / 2);
        let ytop = mon[key].y - (bosssizeheight / 2);
        let ybottom = mon[key].y + (bosssizeheight / 2);
        if (bullet.x > xleft && bullet.x < xright && bullet.y > ytop && bullet.y < ybottom) {
          mon[key].health--
          console.log('BOSS ' + mon[key].health + '/300')
          io.emit('bossUpdate', mon[key].health)
        }
        if (mon[key].health <= 0) {
          console.log('SEND ' + key)
          console.log("BOSS (" + key + ") get killed!")
          io.emit('monsterGetKilled', key);
          bossalive = false;
          delete mon[key]

          totalkill = 0;
          console.log('Total kill: RESET')
          io.emit('killUpdate', totalkill)
        }

      }
    }

    if (bullet.x < -10 || bullet.x > width + 10 || bullet.y < -10 || bullet.y > height + 10) {
      bullet_array.splice(i, 1);
      i--;
    }
  }
  io.emit("bulletsUpdate", bullet_array);
}

function addNewMonster() {
  if (Object.keys(mon).length <= maxmonster) {
    let monId = 0;
    if (totalkill >= 5 && bossalive == false) {
      bossalive = true
      monId = 101;
      mon[monId] = {
        id: monId,
        x: 700,
        y: 500,
        health: 300
      }
      console.log("ADD NEW BOSS id=" + monId)
      io.emit("newEnemy", mon[monId]);
    } else {
      var items = Array(-monsterspeed, 0, monsterspeed);
      monId = Math.floor(Math.random() * 100 + 1);
      mon[monId] = {
        id: monId,
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height),
        health: 1,
        movementx: items[Math.floor(Math.random() * items.length)],
        movementy: items[Math.floor(Math.random() * items.length)],
      }
      console.log("ADD NEW MONSTER id=" + monId)
      io.emit("newEnemy", mon[monId]);
      console.log(mon)
      console.log('Total: ' + Object.keys(mon).length)
    }
  }
}

function changeMovement() {
  for (var key in mon) {
    if (mon[key].id != 101) {
      var items = Array(-monsterspeed, 0, monsterspeed);
      mon[key].movementx = items[Math.floor(Math.random() * items.length)];
      mon[key].movementy = items[Math.floor(Math.random() * items.length)];
    }
  }
}

function monsterMovement() {
  for (var key in mon) {
    if (mon[key].x < 0 || mon[key].x > width || mon[key].y < 0 || mon[key].y > height) {
      mon[key].x = Math.floor(Math.random() * width);
      mon[key].y = Math.floor(Math.random() * height);
    } else {
      switch (mon[key].movementx) {
        case -monsterspeed:
          mon[key].x += -monsterspeed;
          break;
        case 0:
          mon[key].x += 0;
          break;
        case monsterspeed:
          mon[key].x += monsterspeed;
          break;
      }
      switch (mon[key].movementy) {
        case -monsterspeed:
          mon[key].y += -monsterspeed;
          break;
        case 0:
          mon[key].y += 0;
          break;
        case monsterspeed:
          mon[key].y += monsterspeed;
          break;
      }
    }
  }
  io.emit('monsterMoved', mon)
}

setInterval(updateSpeedBullets, 16);

setInterval(monsterMovement, 16);
setInterval(changeMovement, 60 * 90);

setInterval(addNewMonster, 60 * 120);
