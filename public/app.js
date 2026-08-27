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
   STATE
========================= */

let me = null;
let room = null;
let selected = null;
let selectedType = null;

let rotation = 0;

let soundEnabled = false;
let audioContext = null;
let musicTimer = null;


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

  setTimeout(() => {
    x.classList.remove('show');
  },2200);

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

  room.players.forEach(p => {

    const d = document.createElement('div');

    d.className =
      'player-card' +
      (p.id === me?.id ? ' me' : '');

    d.innerHTML = `

      <div class="player-line">

        <span>${p.name}</span>

        <span>
          ${p.host ? '👑' : ''}
        </span>

      </div>

      <div class="player-chip">
        🪙 ${p.balance.toLocaleString()}
      </div>

    `;

    target.appendChild(d);

  });

}


function renderLobby(){

  renderPlayers($('lobbyPlayers'));

}


/* =========================
   GAME
========================= */

function renderGame(){

  $('count').textContent =
    `${room.players.length}/5`;

  renderPlayers($('gamePlayers'));

  $('roundNo').textContent =
    room.round || 1;


  const p =
    room.players.find(x => x.id === me?.id);


  if(p){

    $('balance').textContent =
      p.balance.toLocaleString();


    const st =
      Object.values(p.bets || {})
      .reduce((a,b) => a+b,0);


    $('staked').textContent =
      st.toLocaleString();

  }


  $('history').innerHTML =
    (room.history || [])
      .map(x =>
        `<span class="history-item">${x}</span>`
      )
      .join('');


  $('spin').disabled =
    room.spinning || !p?.host;


  $('spin').textContent =
    p?.host
      ? (room.spinning
          ? 'SPINNING…'
          : 'SPIN THE ROULETTE')
      : 'WAIT FOR HOST';

}


/* =========================
   BUILD WHEEL
========================= */

function buildWheel(){

  const wheel = $('wheel');

  wheel.innerHTML = '';

  const n = entries.length;

  const step = 360 / n;


  entries.forEach((name,i) => {

    const entry =
      document.createElement('div');


    entry.className =
      'wheel-entry';


    /*
      Put each face around
      the edge of the roulette.

      The face itself stays upright.
    */

    const angle =
      i * step + step / 2;


    const radius = 218;


    entry.style.transform =
      `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`;


    entry.innerHTML = `

      <img
        src="/assets/${imgs[name]}"
        alt="${name}"
        onerror="this.style.opacity='.25'"
      />

      <b>${name}</b>

    `;


    wheel.appendChild(entry);

  });

}


/* =========================
   BET BUTTONS
========================= */

function clearSelection(){

  selected = null;

  selectedType = null;

  document
    .querySelectorAll('.bet-option,.color-bet')
    .forEach(x =>
      x.classList.remove('selected')
    );

}


function selectPresident(name,button){

  selected = name;

  selectedType = 'PRESIDENT';


  document
    .querySelectorAll('.bet-option,.color-bet')
    .forEach(x =>
      x.classList.remove('selected')
    );


  button.classList.add('selected');

}


function selectColor(color,button){

  selected = color;

  selectedType = 'COLOR';


  document
    .querySelectorAll('.bet-option,.color-bet')
    .forEach(x =>
      x.classList.remove('selected')
    );


  button.classList.add('selected');

}


function buildBets(){

  const c = $('betOptions');

  c.innerHTML = '';


  entries.forEach(name => {

    const b =
      document.createElement('button');


    b.className =
      'bet-option';


    b.innerHTML = `

      <img src="/assets/${imgs[name]}">

      <span>

        ${name}

        <small>
          11× payout
        </small>

      </span>

    `;


    b.onclick = () =>
      selectPresident(name,b);


    c.appendChild(b);

  });


  /*
    RED / BLACK
  */

  document
    .querySelectorAll('.color-bet')
    .forEach(button => {

      button.onclick = () => {

        const color =
          button.dataset.color;

        selectColor(color,button);

      };

    });

}


/* =========================
   CREATE ROOM
========================= */

$('create').onclick = () => {

  const name =
    $('name').value.trim();


  if(!name){

    return err('Enter your name first.');

  }


  err('');


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
    $('name').value.trim();


  const code =
    $('joinCode').value.trim();


  err('');


  if(!name)
    return err('Enter your name first.');


  if(!code)
    return err('Enter the room code.');


  socket.emit(
    'joinRoom',
    {name,code},
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
   COPY
========================= */

$('copyCode').onclick = () => {

  navigator.clipboard?.writeText(
    $('lobbyCode').textContent
  );

  toast('Room code copied!');

};


/* =========================
   ENTER GAME
========================= */

$('enterGame').onclick = () => {

  show('game');

  renderGame();

  startCasinoSound();

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
    Number($('betAmount').value);


  if(!amount || amount < 10){

    return toast(
      'Minimum bet is 10 chips.'
    );

  }


  /*
    IMPORTANT:

    President:
    entry = president name

    Red:
    entry = RED

    Black:
    entry = BLACK

    Your server should recognize
    RED and BLACK for colour bets.
  */

  socket.emit(
    'placeBet',
    {
      entry:selected,
      amount:amount,
      type:selectedType
    }
  );


  toast(
    `Bet placed on ${selected}`
  );

};


/* =========================
   CLEAR BET
========================= */

$('clearBtn').onclick = () => {

  clearSelection();

  socket.emit('clearBets');

  toast('Bets cleared.');

};


/* =========================
   SPIN
========================= */

$('spin').onclick = () => {

  playSpinSound();

  socket.emit('spin');

};


/* =========================
   SOCKET
========================= */

socket.on('connect',() => {

  if(me)
    me.id = socket.id;

});


socket.on('roomState',r => {

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

});


/* =========================
   SPIN START
========================= */

socket.on(
  'spinStart',
  ({winnerIndex,duration,round}) => {

    room.spinning = true;


    $('result').textContent =
      'THE WHEEL IS DECIDING…';


    $('spin').disabled = true;


    const step =
      360 / entries.length;


    /*
      We want the winning
      face to land directly
      under the gold pointer.
    */

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
      ((target - rotation) % 360 + 360) % 360;


    $('wheel').style.transform =
      `rotate(${rotation}deg)`;


    playSpinSound();

  }
);


/* =========================
   RESULT
========================= */

socket.on(
  'spinResult',
  ({winner}) => {

    playWinSound();


    setTimeout(() => {

      $('result').textContent =
        `🎉 ${winner} WINS THE ROUND`;


      renderGame();

    },150);

  }
);


/* =========================
   CASINO SOUND ENGINE
========================= */

function initAudio(){

  if(!audioContext){

    audioContext =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

  }

}


function beep(
  frequency,
  duration,
  volume=0.04,
  type='sine'
){

  if(!soundEnabled)
    return;


  initAudio();


  const osc =
    audioContext.createOscillator();


  const gain =
    audioContext.createGain();


  osc.type = type;

  osc.frequency.value =
    frequency;


  gain.gain.setValueAtTime(
    volume,
    audioContext.currentTime
  );


  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration
  );


  osc.connect(gain);

  gain.connect(
    audioContext.destination
  );


  osc.start();

  osc.stop(
    audioContext.currentTime + duration
  );

}


/* =========================
   SPIN SOUND
========================= */

function playSpinSound(){

  if(!soundEnabled)
    return;


  initAudio();


  let i = 0;


  const ticks =
    setInterval(() => {

      beep(
        500 + Math.random()*300,
        .045,
        .025,
        'square'
      );


      i++;


      if(i > 25)
        clearInterval(ticks);

    },120);

}


/* =========================
   WIN SOUND
========================= */

function playWinSound(){

  if(!soundEnabled)
    return;


  beep(523,.18,.06);

  setTimeout(
    () => beep(659,.18,.06),
    130
  );

  setTimeout(
    () => beep(784,.3,.07),
    260
  );

}


/* =========================
   CASINO AMBIENCE
========================= */

function startCasinoSound(){

  if(!soundEnabled)
    return;


  if(musicTimer)
    return;


  initAudio();


  const notes =
    [196,247,294,247,220,262,330,262];


  let i = 0;


  musicTimer =
    setInterval(() => {

      beep(
        notes[i % notes.length],
        .22,
        .012,
        'triangle'
      );


      i++;

    },500);

}


/* =========================
   SOUND BUTTON
========================= */

$('soundBtn').onclick = () => {

  soundEnabled =
    !soundEnabled;


  if(soundEnabled){

    initAudio();

    $('soundBtn').textContent =
      '🔊 SOUND ON';

    startCasinoSound();

    toast('Casino sound enabled 🎰');

  }else{

    $('soundBtn').textContent =
      '🔇 SOUND OFF';


    clearInterval(musicTimer);

    musicTimer = null;


    toast('Sound muted.');

  }

};


/* =========================
   START
========================= */

buildWheel();

buildBets();
