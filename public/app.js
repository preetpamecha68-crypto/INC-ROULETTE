const socket = io();


/* =========================
   PRESIDENTS
========================= */

const entries = [
  'Arya',
  'Avyukt',
  'Branson',
  'Lakshya',
  'Lavina',
  'Mihir',
  'Motabhai',
  'Priyanshu',
  'SONchita',
  'Tamanna',
  'WILD CARD'
];


const imgs = {
  Arya:'Arya.jpeg',
  Avyukt:'Avyukt.jpeg',
  Branson:'Branson.jpeg',
  Lakshya:'Lakshya.jpeg',
  Lavina:'Lavina.jpeg',
  Mihir:'Mihir.jpeg',
  Motabhai:'Motabhai.jpeg',
  Priyanshu:'Priyanshu.jpeg',
  SONchita:'SONchita.jpeg',
  Tamanna:'Tamanna.jpeg',
  'WILD CARD':'Wildcard.jpeg'
};


/* =========================
   GAME STATE
========================= */

let me = null;
let room = null;
let selected = null;
let rotation = 0;


/* =========================
   HELPERS
========================= */

const $ = id => document.getElementById(id);


function show(id){

  document
    .querySelectorAll('.screen')
    .forEach(x => x.classList.remove('active'));

  $(id).classList.add('active');

}


function err(t){

  $('landingError').textContent = t || '';

}


function toast(t){

  const x = $('toast');

  x.textContent = t;

  x.classList.add('show');

  setTimeout(
    () => x.classList.remove('show'),
    2200
  );

}


function setRoom(code){

  $('roomCode').textContent = code;

  $('roomBadge').classList.remove('hidden');

  $('lobbyCode').textContent = code;

}


/* =========================
   PLAYERS
========================= */

function renderPlayers(target){

  target.innerHTML = '';

  if(!room || !room.players) return;

  room.players.forEach(p => {

    const d = document.createElement('div');

    d.className =
      'player-card' +
      (p.id === me?.id ? ' me' : '');

    d.innerHTML = `
      <div class="player-line">
        <span>${p.name}</span>
        <span>${p.host ? '👑' : ''}</span>
      </div>

      <div class="player-chip">
        🪙 ${p.balance.toLocaleString()}
      </div>
    `;

    target.appendChild(d);

  });

}


function renderLobby(){

  renderPlayers(
    $('lobbyPlayers')
  );

}


/* =========================
   GAME RENDER
========================= */

function renderGame(){

  if(!room) return;

  $('count').textContent =
    `${room.players.length}/5`;

  renderPlayers(
    $('gamePlayers')
  );

  $('roundNo').textContent =
    room.round || 1;


  const p =
    room.players.find(
      x => x.id === me?.id
    );


  if(p){

    $('balance').textContent =
      p.balance.toLocaleString();

    const st =
      Object.values(p.bets || {})
      .reduce(
        (a,b) => a+b,
        0
      );

    $('staked').textContent =
      st.toLocaleString();

  }


  $('history').innerHTML =
    (room.history || [])
    .map(
      x =>
        `<span class="history-item">${x}</span>`
    )
    .join('');


  $('spin').disabled =
    room.spinning ||
    !p?.host;


  $('spin').textContent =
    p?.host
      ? (
        room.spinning
          ? 'SPINNING…'
          : '🎰 SPIN THE ROULETTE'
      )
      : 'WAIT FOR HOST';

}


/* =========================
   WHEEL
========================= */

function buildWheel(){

  const w = $('wheel');

  w.innerHTML = '';

  const n = entries.length;

  const step = 360 / n;


  entries.forEach(
    (name,i) => {

      const s =
        document.createElement('div');

      s.className = 'slice';


      s.style.transform =
        `rotate(${i*step}deg) skewY(${90-step}deg)`;


      const inner =
        document.createElement('div');

      inner.className =
        'slice-inner';


      inner.style.transform =
        `skewY(-${90-step}deg) rotate(${step/2}deg)`;


      inner.innerHTML = `
        <img
          src="/assets/${imgs[name]}"
          alt="${name}"
        />

        <b>${name}</b>
      `;


      s.appendChild(inner);

      w.appendChild(s);

    }
  );

}


/* =========================
   BET OPTIONS
========================= */

function clearSelection(){

  selected = null;

  document
    .querySelectorAll(
      '.bet-option,.colour-option'
    )
    .forEach(
      x =>
        x.classList.remove('selected')
    );

}


/* PRESIDENTS */

function buildBets(){

  const c =
    $('betOptions');

  c.innerHTML = '';


  entries.forEach(
    name => {

      const b =
        document.createElement('button');

      b.className =
        'bet-option';


      b.innerHTML = `
        <img
          src="/assets/${imgs[name]}"
          alt="${name}"
        >

        <span>
          ${name}

          <small>
            11× PAYOUT
          </small>
        </span>
      `;


      b.onclick = () => {

        clearSelection();

        selected = name;

        b.classList.add(
          'selected'
        );

      };


      c.appendChild(b);

    }
  );

}


/* =========================
   RED / BLACK
========================= */

$('redBet').onclick = () => {

  clearSelection();

  selected = 'RED';

  $('redBet')
    .classList.add('selected');

};


$('blackBet').onclick = () => {

  clearSelection();

  selected = 'BLACK';

  $('blackBet')
    .classList.add('selected');

};


/* =========================
   CREATE ROOM
========================= */

$('create').onclick = () => {

  const name =
    $('name')
      .value
      .trim();

  err('');


  if(!name){

    return err(
      'Please enter your name.'
    );

  }


  socket.emit(
    'createRoom',
    {name},
    r => {

      if(!r.ok)
        return err(r.error);


      me = {
        id:socket.id,
        name
      };


      setRoom(r.code);

      show('lobby');

    }
  );

};


/* =========================
   JOIN ROOM
========================= */

$('join').onclick = () => {

  const name =
    $('name')
      .value
      .trim();

  const code =
    $('joinCode')
      .value
      .trim()
      .toUpperCase();

  err('');


  if(!name)
    return err(
      'Please enter your name.'
    );


  if(!code)
    return err(
      'Please enter a room code.'
    );


  socket.emit(
    'joinRoom',
    {
      name,
      code
    },
    r => {

      if(!r.ok)
        return err(r.error);


      me = {
        id:socket.id,
        name
      };


      setRoom(r.code);

      show('lobby');

    }
  );

};


/* =========================
   COPY ROOM
========================= */

$('copyCode').onclick = () => {

  navigator
    .clipboard
    ?.writeText(
      $('lobbyCode').textContent
    );

  toast(
    'Room code copied!'
  );

};


/* =========================
   ENTER GAME
========================= */

$('enterGame').onclick = () => {

  show('game');

  renderGame();

};


/* =========================
   PLACE BET
========================= */

$('betBtn').onclick = () => {

  if(!selected){

    return toast(
      'Pick RED, BLACK or a president first.'
    );

  }


  const amount =
    Number(
      $('betAmount').value
    );


  if(!amount || amount < 10){

    return toast(
      'Minimum bet is 10 chips.'
    );

  }


  socket.emit(
    'placeBet',
    {
      entry:selected,
      amount
    }
  );


  toast(
    `Bet placed on ${selected}`
  );

};


/* =========================
   CLEAR BETS
========================= */

$('clearBtn').onclick = () => {

  clearSelection();

  socket.emit(
    'clearBets'
  );

  toast(
    'Bets cleared.'
  );

};


/* =========================
   SPIN
========================= */

$('spin').onclick = () => {

  socket.emit(
    'spin'
  );

};


/* =========================
   SOCKET
========================= */

socket.on(
  'connect',
  () => {

    if(me)
      me.id = socket.id;

  }
);


socket.on(
  'roomState',
  r => {

    room = r;


    if(
      $('lobby')
        .classList
        .contains('active')
    ){

      renderLobby();

    }


    if(
      $('game')
        .classList
        .contains('active')
    ){

      renderGame();

    }

  }
);


/* =========================
   SPIN START
========================= */

socket.on(
  'spinStart',
  ({
    winnerIndex,
    duration,
    round
  }) => {

    room.spinning = true;

    $('result').textContent =
      '🎰 THE WHEEL IS DECIDING…';


    $('spin').disabled = true;


    const step =
      360 / entries.length;


    const target =
      360 -
      (
        winnerIndex * step +
        step / 2
      );


    const extra =
      360 * 8;


    rotation +=
      extra +
      (
        (target - rotation) % 360 +
        360
      ) % 360;


    $('wheel').style.transform =
      `rotate(${rotation}deg)`;

  }
);


/* =========================
   SPIN RESULT
========================= */

socket.on(
  'spinResult',
  ({winner}) => {

    setTimeout(
      () => {

        $('result').textContent =
          `🎉 ${winner} WINS THE ROUND`;

        renderGame();

      },
      150
    );

  }
);


/* =========================
   CASINO SOUND
========================= */

let audioCtx = null;
let soundOn = false;
let ambienceTimer = null;


function startCasinoSound(){

  if(soundOn) return;


  audioCtx =
    new (
      window.AudioContext ||
      window.webkitAudioContext
    )();


  soundOn = true;


  $('soundBtn').textContent =
    '🔊 SOUND ON';


  function casinoTick(){

    if(!soundOn) return;


    const osc =
      audioCtx.createOscillator();

    const gain =
      audioCtx.createGain();


    osc.type = 'sine';

    osc.frequency.value =
      600 + Math.random()*300;


    gain.gain.setValueAtTime(
      0.0001,
      audioCtx.currentTime
    );


    gain.gain.exponentialRampToValueAtTime(
      0.018,
      audioCtx.currentTime + .03
    );


    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + .35
    );


    osc.connect(gain);

    gain.connect(
      audioCtx.destination
    );


    osc.start();

    osc.stop(
      audioCtx.currentTime + .4
    );


    ambienceTimer =
      setTimeout(
        casinoTick,
        1200 + Math.random()*1800
      );

  }


  casinoTick();

}


function stopCasinoSound(){

  soundOn = false;


  $('soundBtn').textContent =
    '🔇 SOUND OFF';


  if(ambienceTimer){

    clearTimeout(
      ambienceTimer
    );

    ambienceTimer = null;

  }


  if(audioCtx){

    audioCtx.close();

    audioCtx = null;

  }

}


$('soundBtn').onclick = () => {

  if(soundOn)
    stopCasinoSound();
  else
    startCasinoSound();

};


/* =========================
   INITIALISE
========================= */

buildWheel();

buildBets();
