const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// BOARD DEFINITION
// 11 pockets: a 2x5 grid of the 10 club members + 1 wildcard (house pocket).
// Grid layout (row, col):
//   Row 0 (Team Tamanna): Tamanna, Lavina, Mihir, Motabhai, Sonchita
//   Row 1 (Team Avyukt):  Avyukt,  Priyanshu, Arya, Branson, Lakshya
// ---------------------------------------------------------------------------
const BOARD = [
  { id: 0, name: 'Tamanna',  team: 'A', row: 0, col: 0, img: 'Tamanna.jpeg' },
  { id: 1, name: 'Lavina',   team: 'A', row: 0, col: 1, img: 'Lavina.jpeg' },
  { id: 2, name: 'Mihir',    team: 'A', row: 0, col: 2, img: 'Mihir.jpeg' },
  { id: 3, name: 'Motabhai', team: 'A', row: 0, col: 3, img: 'Motabhai.jpeg' },
  { id: 4, name: 'Sonchita', team: 'A', row: 0, col: 4, img: 'SONchita.jpeg' },
  { id: 5, name: 'Avyukt',   team: 'B', row: 1, col: 0, img: 'Avyukt.jpeg' },
  { id: 6, name: 'Priyanshu',team: 'B', row: 1, col: 1, img: 'Priyanshu.jpeg' },
  { id: 7, name: 'Arya',     team: 'B', row: 1, col: 2, img: 'Arya.jpeg' },
  { id: 8, name: 'Branson',  team: 'B', row: 1, col: 3, img: 'Branson.jpeg' },
  { id: 9, name: 'Lakshya',  team: 'B', row: 1, col: 4, img: 'Lakshya.jpeg' },
  { id: 10, name: 'Wildcard', team: 'W', row: -1, col: -1, img: 'Wildcard.jpeg' },
];

const PAYOUTS = {
  straight: 9,   // bet on exactly 1 pocket (any of the 11, incl. wildcard)
  split: 4,      // bet on 2 adjacent pockets (share an edge on the grid)
  corner: 2,     // bet on a 2x2 block of 4 pockets
  team: 1,       // bet on an entire row (Team Tamanna or Team Avyukt) - 5 pockets
};

const STARTING_BALANCE = 500;
const MAX_PLAYERS = 5;
const BETTING_SECONDS = 25;

function pocketById(id) {
  return BOARD.find(p => p.id === id);
}

function isValidBet(bet) {
  if (!bet || typeof bet.amount !== 'number' || bet.amount <= 0) return false;
  const ids = Array.isArray(bet.pockets) ? bet.pockets : [];
  if (!ids.every(id => BOARD.some(p => p.id === id))) return false;

  switch (bet.type) {
    case 'straight':
      return ids.length === 1;
    case 'split': {
      if (ids.length !== 2) return false;
      const [a, b] = ids.map(pocketById);
      if (a.team === 'W' || b.team === 'W') return false;
      const sameRow = a.row === b.row && Math.abs(a.col - b.col) === 1;
      const sameCol = a.col === b.col && Math.abs(a.row - b.row) === 1;
      return sameRow || sameCol;
    }
    case 'corner': {
      if (ids.length !== 4) return false;
      const pockets = ids.map(pocketById);
      if (pockets.some(p => p.team === 'W')) return false;
      const rows = new Set(pockets.map(p => p.row));
      const cols = new Set(pockets.map(p => p.col));
      if (rows.size !== 2 || cols.size !== 2) return false;
      const [c1, c2] = [...cols].sort((x, y) => x - y);
      return c2 - c1 === 1;
    }
    case 'team': {
      if (ids.length !== 5) return false;
      const pockets = ids.map(pocketById);
      const teams = new Set(pockets.map(p => p.team));
      return teams.size === 1 && (pockets[0].team === 'A' || pockets[0].team === 'B');
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// ROOM STATE (in-memory, resets on server restart - matches "points reset
// every session" requirement)
// ---------------------------------------------------------------------------
const rooms = new Map();

function createRoom(hostSocketId) {
  const code = nanoid();
  const room = {
    code,
    hostId: hostSocketId,
    players: new Map(), // socketId -> { id, name, balance, bets: [], lockedIn: bool }
    phase: 'lobby', // lobby | betting | spinning | result
    round: 0,
    bettingEndsAt: null,
    timer: null,
    lastResult: null,
  };
  rooms.set(code, room);
  return room;
}

function roomPublicState(room) {
  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    hostId: room.hostId,
    bettingEndsAt: room.bettingEndsAt,
    players: [...room.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      balance: p.balance,
      bets: p.bets,
      lockedIn: p.lockedIn,
    })),
    lastResult: room.lastResult,
  };
}

function broadcastState(room) {
  io.to(room.code).emit('room:state', roomPublicState(room));
}

function totalStaked(player) {
  return player.bets.reduce((sum, b) => sum + b.amount, 0);
}

function allLockedIn(room) {
  const players = [...room.players.values()];
  return players.length > 0 && players.every(p => p.lockedIn);
}

function startBettingPhase(room) {
  room.phase = 'betting';
  room.bettingEndsAt = Date.now() + BETTING_SECONDS * 1000;
  for (const p of room.players.values()) {
    p.bets = [];
    p.lockedIn = false;
  }
  clearTimeout(room.timer);
  room.timer = setTimeout(() => resolveSpin(room), BETTING_SECONDS * 1000);
  broadcastState(room);
}

function maybeAutoSpin(room) {
  if (room.phase === 'betting' && allLockedIn(room)) {
    clearTimeout(room.timer);
    resolveSpin(room);
  }
}

function resolveSpin(room) {
  if (room.phase !== 'betting') return;
  room.phase = 'spinning';
  broadcastState(room);

  const winningId = BOARD[Math.floor(Math.random() * BOARD.length)].id;

  // Give the client time to run the wheel animation before we reveal payouts.
  setTimeout(() => {
    const winningPocket = pocketById(winningId);
    const results = [];

    for (const p of room.players.values()) {
      let winnings = 0;
      for (const bet of p.bets) {
        if (bet.pockets.includes(winningId)) {
          winnings += bet.amount * (PAYOUTS[bet.type] + 1);
        }
      }
      const staked = totalStaked(p);
      // Stakes were already deducted from balance when the bet was placed,
      // so winning payouts (which already include the returned stake) just add back.
      p.balance += winnings;
      results.push({ id: p.id, name: p.name, staked, winnings, balance: p.balance });
    }

    room.round += 1;
    room.phase = 'result';
    room.lastResult = { winningId, winningPocket, results, round: room.round };
    broadcastState(room);
  }, 4200); // matches the wheel spin animation duration on the client
}

// ---------------------------------------------------------------------------
// SOCKET HANDLERS
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  socket.emit('board', BOARD.map(p => ({ ...p, img: `/assets/images/${p.img}` })));
  socket.emit('payouts', PAYOUTS);

  socket.on('room:create', ({ name }, cb) => {
    if (!name || !name.trim()) return cb({ error: 'Enter a name first.' });
    const room = createRoom(socket.id);
    room.players.set(socket.id, {
      id: socket.id,
      name: name.trim().slice(0, 20),
      balance: STARTING_BALANCE,
      bets: [],
      lockedIn: false,
    });
    socket.join(room.code);
    cb({ code: room.code });
    broadcastState(room);
  });

  socket.on('room:join', ({ name, code }, cb) => {
    const room = rooms.get((code || '').toUpperCase());
    if (!room) return cb({ error: 'Room not found.' });
    if (room.players.size >= MAX_PLAYERS) return cb({ error: 'Room is full (max 5).' });
    if (room.phase !== 'lobby') return cb({ error: 'Round already in progress.' });
    if (!name || !name.trim()) return cb({ error: 'Enter a name first.' });

    room.players.set(socket.id, {
      id: socket.id,
      name: name.trim().slice(0, 20),
      balance: STARTING_BALANCE,
      bets: [],
      lockedIn: false,
    });
    socket.join(room.code);
    cb({ code: room.code });
    broadcastState(room);
  });

  socket.on('room:start', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.size < 1) return;
    startBettingPhase(room);
  });

  socket.on('bet:place', ({ code, bet }, cb) => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'betting') return cb?.({ error: 'Betting is closed.' });
    const player = room.players.get(socket.id);
    if (!player || player.lockedIn) return cb?.({ error: 'You already locked in.' });
    if (!isValidBet(bet)) return cb?.({ error: 'Invalid bet.' });

    // player.balance already has every prior bet's stake deducted, so the
    // remaining balance alone is the limit for this new bet.
    if (bet.amount > player.balance) {
      return cb?.({ error: 'Not enough INC points.' });
    }

    player.bets.push({
      type: bet.type,
      pockets: bet.pockets,
      amount: Math.floor(bet.amount),
    });
    player.balance -= Math.floor(bet.amount);
    cb?.({ ok: true });
    broadcastState(room);
  });

  socket.on('bet:clear', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'betting') return;
    const player = room.players.get(socket.id);
    if (!player || player.lockedIn) return;
    player.balance += totalStaked(player);
    player.bets = [];
    broadcastState(room);
  });

  socket.on('bet:lockin', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'betting') return;
    const player = room.players.get(socket.id);
    if (!player) return;
    player.lockedIn = true;
    broadcastState(room);
    maybeAutoSpin(room);
  });

  socket.on('room:nextRound', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    if (room.phase !== 'result') return;
    startBettingPhase(room);
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (room.players.size === 0) {
          clearTimeout(room.timer);
          rooms.delete(room.code);
        } else {
          if (room.hostId === socket.id) {
            room.hostId = [...room.players.keys()][0];
          }
          broadcastState(room);
          maybeAutoSpin(room);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`INC Roulette running on port ${PORT}`);
});
