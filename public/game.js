const socket = io();

let BOARD = [];
let PAYOUTS = {};
let myId = null;
let roomCode = null;
let roomState = null;

let selectedChip = 25;
let betMode = 'straight';
let selection = [];
let wheelRotation = 0;
let lastPhase = null;
let timerInterval = null;

// ---------------------------------------------------------------------------
// Screen switching
// ---------------------------------------------------------------------------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ---------------------------------------------------------------------------
// Boot data
// ---------------------------------------------------------------------------
socket.on('connect', () => { myId = socket.id; });
socket.on('board', (b) => { BOARD = b; buildBoard(); buildWheel(); });
socket.on('payouts', (p) => { PAYOUTS = p; });

// ---------------------------------------------------------------------------
// ENTRY SCREEN
// ---------------------------------------------------------------------------
const nameInput = document.getElementById('input-name');
const codeInput = document.getElementById('input-code');
const entryError = document.getElementById('entry-error');

document.getElementById('btn-create').addEventListener('click', () => {
  entryError.textContent = '';
  socket.emit('room:create', { name: nameInput.value }, (res) => {
    if (res.error) return (entryError.textContent = res.error);
    roomCode = res.code;
    showScreen('screen-lobby');
  });
});

document.getElementById('btn-join').addEventListener('click', () => {
  entryError.textContent = '';
  socket.emit('room:join', { name: nameInput.value, code: codeInput.value }, (res) => {
    if (res.error) return (entryError.textContent = res.error);
    roomCode = res.code;
    showScreen('screen-lobby');
  });
});

// ---------------------------------------------------------------------------
// LOBBY SCREEN
// ---------------------------------------------------------------------------
document.getElementById('btn-start').addEventListener('click', () => {
  socket.emit('room:start', { code: roomCode });
});

function renderLobby(state) {
  document.getElementById('lobby-code').textContent = state.code;
  const list = document.getElementById('lobby-players');
  list.innerHTML = '';
  state.players.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${escapeHtml(p.name)}</span>${p.id === state.hostId ? '<span class="host-tag">HOST</span>' : ''}`;
    list.appendChild(li);
  });
  const isHost = state.hostId === myId;
  const startBtn = document.getElementById('btn-start');
  startBtn.classList.toggle('hidden', !isHost);
  startBtn.disabled = state.players.length < 1;
  document.getElementById('lobby-hint').textContent = isHost
    ? 'You are the host — start whenever the table is ready.'
    : 'Waiting for the host to start…';
}

// ---------------------------------------------------------------------------
// BOARD (betting grid)
// ---------------------------------------------------------------------------
function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  const members = BOARD.filter(p => p.team !== 'W');
  members.forEach(p => {
    const div = document.createElement('div');
    div.className = `pocket team-${p.team.toLowerCase()}`;
    div.dataset.id = p.id;
    div.innerHTML = `<img src="${p.img}" alt="${p.name}" /><div class="p-label">${p.name}</div>`;
    div.addEventListener('click', () => handlePocketClick(p.id));
    board.appendChild(div);
  });
  const wc = BOARD.find(p => p.team === 'W');
  if (wc) {
    const div = document.createElement('div');
    div.className = 'wildcard-pocket';
    div.dataset.id = wc.id;
    div.innerHTML = `<img src="${wc.img}" alt="${wc.name}" /><span>${wc.name}</span>`;
    div.addEventListener('click', () => handlePocketClick(wc.id));
    board.appendChild(div);
  }
}

// ---------------------------------------------------------------------------
// WHEEL
// ---------------------------------------------------------------------------
function buildWheel() {
  const wheel = document.getElementById('wheel');
  wheel.innerHTML = '';
  const radius = 112;
  const center = 150;
  const step = 360 / BOARD.length;
  BOARD.forEach((p, i) => {
    const angle = i * step;
    const rad = (angle * Math.PI) / 180;
    const x = center + radius * Math.sin(rad) - 23;
    const y = center - radius * Math.cos(rad) - 23;
    const div = document.createElement('div');
    div.className = 'wheel-pocket' + (p.team === 'W' ? ' wildcard' : '');
    div.dataset.id = p.id;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.innerHTML = `<img src="${p.img}" alt="${p.name}" />`;
    wheel.appendChild(div);
  });
}

function spinWheelTo(winningId) {
  const step = 360 / BOARD.length;
  const angleWinning = winningId * step;
  const targetMod = ((-angleWinning) % 360 + 360) % 360;
  const currentMod = ((wheelRotation % 360) + 360) % 360;
  const diff = (targetMod - currentMod + 360) % 360;
  wheelRotation = wheelRotation + diff + 360 * 5;
  document.getElementById('wheel').style.transform = `rotate(${wheelRotation}deg)`;
}

// ---------------------------------------------------------------------------
// BETTING CONTROLS
// ---------------------------------------------------------------------------
document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    selectedChip = parseInt(btn.dataset.value, 10);
  });
});
document.querySelector('.chip[data-value="25"]').classList.add('active');

document.querySelectorAll('.bet-type').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bet-type').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    betMode = btn.dataset.mode;
    selection = [];
    renderSelection();
    const hints = {
      straight: 'Tap any single pocket (member or wildcard) for a straight-up bet.',
      split: 'Tap two pockets that sit next to each other on the board.',
      corner: 'Tap four pockets forming a 2×2 block on the board.',
      team: 'Tap any member \u2014 the whole team bets together.',
    };
    document.getElementById('bet-instruction').textContent = hints[betMode];
  });
});

function handlePocketClick(id) {
  if (!roomState || roomState.phase !== 'betting') return;
  const me = roomState.players.find(p => p.id === myId);
  if (!me || me.lockedIn) return;
  const pocket = BOARD.find(p => p.id === id);

  if (betMode === 'straight') {
    placeBet('straight', [id]);
  } else if (betMode === 'team') {
    if (pocket.team === 'W') return flashError('Wildcard has no team.');
    const teamIds = BOARD.filter(p => p.team === pocket.team).map(p => p.id);
    placeBet('team', teamIds);
  } else if (betMode === 'split' || betMode === 'corner') {
    if (pocket.team === 'W') return flashError('Wildcard can\'t join split/corner bets.');
    const needed = betMode === 'split' ? 2 : 4;
    if (selection.includes(id)) {
      selection = selection.filter(x => x !== id);
    } else {
      selection.push(id);
    }
    renderSelection();
    if (selection.length === needed) {
      placeBet(betMode, [...selection]);
      selection = [];
      renderSelection();
    }
  }
}

function renderSelection() {
  document.querySelectorAll('.pocket').forEach(el => {
    el.classList.toggle('selected', selection.includes(parseInt(el.dataset.id, 10)));
  });
}

function placeBet(type, pockets) {
  socket.emit('bet:place', { code: roomCode, bet: { type, pockets, amount: selectedChip } }, (res) => {
    if (res && res.error) flashError(res.error);
  });
}

function flashError(msg) {
  const el = document.getElementById('lockin-status');
  el.textContent = msg;
  el.style.color = 'var(--danger)';
  setTimeout(() => { el.textContent = ''; el.style.color = ''; }, 2200);
}

document.getElementById('btn-clear').addEventListener('click', () => {
  socket.emit('bet:clear', { code: roomCode });
});

document.getElementById('btn-lockin').addEventListener('click', () => {
  socket.emit('bet:lockin', { code: roomCode });
});

document.getElementById('btn-next-round').addEventListener('click', () => {
  socket.emit('room:nextRound', { code: roomCode });
});

// ---------------------------------------------------------------------------
// ROOM STATE RENDERING
// ---------------------------------------------------------------------------
socket.on('room:state', (state) => {
  const wasLobby = !roomState;
  roomState = state;

  if (state.phase === 'lobby') {
    showScreen('screen-lobby');
    renderLobby(state);
    return;
  }

  showScreen('screen-game');
  document.getElementById('round-number').textContent = Math.max(state.round, 1);

  renderPlayers(state);
  renderMyBets(state);
  renderPhase(state);

  if (state.phase !== lastPhase) {
    if (state.phase === 'betting') {
      onBettingStart(state);
    } else if (state.phase === 'spinning') {
      onSpinStart(state);
    } else if (state.phase === 'result') {
      onResult(state);
    }
  }
  lastPhase = state.phase;
});

function renderPhase(state) {
  const label = document.getElementById('phase-label');
  const map = { betting: 'Placing Bets', spinning: 'Spinning…', result: 'Results' };
  label.textContent = map[state.phase] || '';
}

function renderPlayers(state) {
  const rail = document.getElementById('player-rail');
  rail.innerHTML = '';
  const lastResults = state.lastResult ? state.lastResult.results : null;

  state.players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'player-card';
    if (p.lockedIn) div.classList.add('locked');

    let resultLine = '';
    if (state.phase === 'result' && lastResults) {
      const r = lastResults.find(x => x.id === p.id);
      if (r) {
        const net = r.winnings - r.staked;
        div.classList.add(net > 0 ? 'win' : net < 0 ? 'lose' : '');
        resultLine = `<div class="p-status">${net > 0 ? '+' : ''}${net} this round</div>`;
      }
    }

    div.innerHTML = `
      <div class="p-name">${escapeHtml(p.name)}${p.id === myId ? ' <span class="badge">YOU</span>' : ''}</div>
      <div class="p-balance">${p.balance} INC</div>
      <div class="p-status">${state.phase === 'betting' ? (p.lockedIn ? 'Locked in' : 'Betting…') : ''}</div>
      ${resultLine}
    `;
    rail.appendChild(div);
  });
}

function renderMyBets(state) {
  const me = state.players.find(p => p.id === myId);
  const list = document.getElementById('my-bets-list');
  list.innerHTML = '';
  if (!me || me.bets.length === 0) {
    list.innerHTML = '<li class="empty">No bets placed yet</li>';
  } else {
    me.bets.forEach(b => {
      const names = b.pockets.map(id => BOARD.find(p => p.id === id)?.name).join(', ');
      const li = document.createElement('li');
      li.innerHTML = `<span>${b.type.toUpperCase()} — ${names}</span><span>${b.amount} INC</span>`;
      list.appendChild(li);
    });
  }
  document.getElementById('my-staked').textContent = `${me ? me.bets.reduce((s, b) => s + b.amount, 0) : 0} staked`;
  document.getElementById('my-balance').textContent = me ? me.balance : 500;
}

function onBettingStart(state) {
  document.getElementById('result-banner').classList.add('hidden');
  document.getElementById('btn-next-round').classList.add('hidden');
  document.getElementById('lockin-status').textContent = '';
  document.querySelectorAll('.pocket, .wildcard-pocket').forEach(el => el.classList.remove('winning'));
  selection = [];
  renderSelection();
  startTimer(state.bettingEndsAt);
}

function startTimer(endsAt) {
  clearInterval(timerInterval);
  const total = 25000;
  timerInterval = setInterval(() => {
    const remaining = endsAt - Date.now();
    const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
    document.getElementById('timer-bar').style.width = pct + '%';
    if (remaining <= 0) clearInterval(timerInterval);
  }, 200);
}

function onSpinStart() {
  clearInterval(timerInterval);
  document.getElementById('timer-bar').style.width = '0%';
  document.getElementById('lockin-status').textContent = 'No more bets — spinning!';
}

function onResult(state) {
  const result = state.lastResult;
  if (!result) return;
  spinWheelTo(result.winningId);

  setTimeout(() => {
    const winPocketEl = document.querySelector(`.pocket[data-id="${result.winningId}"], .wildcard-pocket[data-id="${result.winningId}"]`);
    if (winPocketEl) winPocketEl.classList.add('winning');

    const banner = document.getElementById('result-banner');
    banner.classList.remove('hidden');
    banner.textContent = `${result.winningPocket.name.toUpperCase()} takes the round!`;

    const me = result.results.find(r => r.id === myId);
    if (me && me.winnings > me.staked) launchConfetti();

    const isHost = state.hostId === myId;
    document.getElementById('btn-next-round').classList.toggle('hidden', !isHost);
    document.getElementById('lockin-status').textContent = isHost
      ? 'Start the next round whenever you\'re ready.'
      : 'Waiting for the host to start the next round…';
  }, 4300);
}

// ---------------------------------------------------------------------------
// CONFETTI
// ---------------------------------------------------------------------------
function launchConfetti() {
  const colors = ['#d4af37', '#f4d675', '#7c93f5', '#f7f7fb'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = 2 + Math.random() * 1.5 + 's';
    piece.style.opacity = 0.7 + Math.random() * 0.3;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3600);
  }
}

// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
