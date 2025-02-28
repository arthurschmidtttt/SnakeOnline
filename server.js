const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let players = {};
let collectibles = [];
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const GRID_SIZE = 20;
const NUM_COLLECTIBLES = 20;

function getRandomColor() {
  const cores = [
  '#e74c3c', '#f1c40f', '#1abc9c', '#9b59b6', '#3498db', '#2ecc71',
  '#e67e22', '#34495e', '#ff69b4', '#000080', '#00ff00', '#ffd700',
  '#800080', '#4169e1', '#228b22', '#ff4500', '#c0c0c0', '#ffc0cb',
  '#40e0d0', '#98ff98', '#ffef00', '#e6e6fa', '#008080', '#808000',
  '#ffb347', '#2f4f4f', '#ff00ff', '#89cff0', '#8a9a5b', '#ffdb58',
  '#6f2da8', '#0047ab', '#93c572', '#ff7f50', '#808080', '#fa8072',
  '#4b0082', '#00a86b', '#fff700', '#614051', '#00ffff', '#568203',
  '#ff7518', '#708090', '#ff00ff', '#0f52ba', '#50c878', '#ffff99',
  '#da70d6', '#87ceeb'
	];
  return cores[Math.floor(Math.random() * cores.length)];
}

function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * (WORLD_WIDTH / GRID_SIZE)) * GRID_SIZE,
    y: Math.floor(Math.random() * (WORLD_HEIGHT / GRID_SIZE)) * GRID_SIZE
  };
}

function generateCollectibles() {
  collectibles = [];
  for (let i = 0; i < NUM_COLLECTIBLES; i++) {
    collectibles.push(getRandomPosition());
  }
}
generateCollectibles();

function checkPlayerCollisions() {
  const playerIds = Object.keys(players);
  const currentPlayers = { ...players };

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const player1 = currentPlayers[playerIds[i]];
      const player2 = currentPlayers[playerIds[j]];

      if (!player1 || !player2) {
        continue;
      }

      if (player1.x === player2.x && player1.y === player2.y) {
        handlePlayerCollision(player1, player2);
      }
    }
  }
}

function handlePlayerCollision(player1, player2) {
  if (player1.score > player2.score) {
    eliminatePlayer(player2.id);
  } else if (player1.score < player2.score) {
    eliminatePlayer(player1.id);
  } else {
    eliminatePlayer(player1.id);
    eliminatePlayer(player2.id);
  }
}

function eliminatePlayer(playerId) {
  const player = players[playerId];
  if (player) {
    
    io.to(playerId).emit('playerEliminated');
    delete players[playerId];
    io.emit('playerDisconnected', playerId);
  }
}

setInterval(checkPlayerCollisions, 100);

setInterval(() => {
  for (const id in players) {
    let player = players[id];
    for (let i = 0; i < collectibles.length; i++) {
      let col = collectibles[i];
      if (player.x === col.x && player.y === col.y) {
        player.score += 10;
        collectibles.splice(i, 1);
        collectibles.push(getRandomPosition());
        io.emit('playerMoved', player);
        io.emit('collectiblesUpdate', collectibles);
        break;
      }
    }
  }
}, 100);

io.on('connection', (socket) => {

  socket.on('newPlayer', (data) => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "Player",
      color: getRandomColor(),
      x: data.x,
      y: data.y,
      score: 0
    };

    socket.emit('currentPlayers', players);
    socket.emit('collectiblesUpdate', collectibles);

    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

	socket.on('playerEliminated', () => {
		window.location.href = 'index.html';
	});

  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      io.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

http.listen(PORT, () => {
  console.log(`Server port: ${PORT}`);
});
