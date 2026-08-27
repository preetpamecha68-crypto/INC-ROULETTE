const socket = io();

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
  Arya: 'Arya.jpeg',
  Avyukt: 'Avyukt.jpeg',
  Branson: 'Branson.jpeg',
  Lakshya: 'Lakshya.jpeg',
  Lavina: 'Lavina.jpeg',
  Mihir: 'Mihir.jpeg',
  Motabhai: 'Motabhai.jpeg',
  Priyanshu: 'Priyanshu.jpeg',
  SONchita: 'SONchita.jpeg',
  Tamanna: 'Tamanna.jpeg',
  'WILD CARD': 'Wildcard.jpeg'
};


/*
  FIRST 10 PRESIDENTS:

  RED
  BLACK
  RED
  BLACK
  RED
  BLACK
  RED
  BLACK
  RED
  BLACK

  WILD CARD = GREEN
*/

const slotColors = [
  'red',
  'black',
  'red',
  'black',
  'red',
  'black',
  'red',
  'black',
  'red',
  'black',
  'green'
];


let me = null;
let room = null;

let selected = null;

let rotation = 0;


/*
  LOCAL BET SELECTION

  Example:

  RED       = 50
  Tamanna   = 50
  BLACK     = 100

*/

let localBets = {};


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


/* ================================
   PLAYERS
================================ */

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

  renderPlayers($('lobbyPlayers'));

}


/* ================================
   GAME
================================ */

function renderGame(){

  if(!room) return;

  $('count').textContent =
    `${room.players.length}/5`;

  renderPlayers($('gamePlayers'));

  $('roundNo').textContent =
    room.round || 1;


  const p =
    room.players.find(
      x => x.id === me?.id
    );


  if(p){

    $('balance').textContent =
      p.balance.toLocaleString();

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
            : 'SPIN THE ROULETTE'
        )
      : 'WAIT FOR HOST';


  renderBetSlip();

}


/* ================================
   WHEEL
================================ */

function buildWheel(){

  const w = $('wheel');

  w.innerHTML = '';

  const n = entries.length;

  const step = 360 / n;


  /*
    RED / BLACK / GREEN BACKGROUND
  */

  let gradientParts = [];

  for(let i = 0; i < n; i++){

    const start = i * step;
    const end = (i + 1) * step;

    let color;

    if(slotColors[i] === 'red'){
      color = '#b51e2c';
    }

    else if(slotColors[i] === 'black'){
      color = '#08090c';
    }

    else{
      color = '#239b52';
    }

    gradientParts.push(
      `${color} ${start}deg ${end}deg`
    );

  }


  /*
    The wheel starts at the top.

    CSS conic-gradient begins at 12 o'clock
    with from -90deg.
  */

  w.style.background =
    `conic-gradient(from -90deg, ${gradientParts.join(',')})`;


  /*
    FACE POSITIONING

    Each face sits exactly at the radial
    midpoint of its section.
  */

  entries.forEach((name, i) => {

    const slot = document.createElement('div');

    slot.className =
      'wheel-slot' +
      (name === 'WILD CARD'
        ? ' wild-slot'
        : '');


    const content =
      document.createElement('div');

    content.className =
      'slot-content';


    /*
      The midpoint angle.

      -90 = top of wheel
    */

    const angle =
      i * step + step / 2 - 90;


    /*
      Radius.

      34% of wheel size puts the
      faces nicely inside each section.
    */

    const radius = 35;


    content.style.transform =
      `rotate(${angle}deg) translateY(-${radius}%) rotate(${-angle}deg)`;


    content.innerHTML = `
      <img
        src="/assets/${imgs[name]}"
        alt="${name}"
        onerror="this.style.display='none'"
      />

      <b>${name}</b>
    `;


    slot.appendChild(content);

    w.appendChild(slot);

  });

}


/* ================================
   BET OPTIONS
================================ */

function buildBets(){

  const c = $('betOptions');

  c.innerHTML = '';


  entries.forEach(name => {

    const b =
      document.createElement('button');

    b.className = 'bet-option';

    const payout =
      name === 'WILD CARD'
        ? '20× payout'
        : '10× payout';


    b.innerHTML = `
      <img
        src="/assets/${imgs[name]}"
        alt="${name}"
      >

      <span>
        ${name}

        <small>
          ${payout}
        </small>
      </span>
    `;


    b.onclick = () => {

      selected = name;


      document
        .querySelectorAll('.bet-option')
        .forEach(x =>
          x.classList.remove('selected')
        );


      document
        .querySelectorAll('.color-bet')
        .forEach(x =>
          x.classList.remove('selected')
        );


      b.classList.add('selected');

    };


    c.appendChild(b);

  });

}


/* ================================
   COLOR BET BUTTONS
================================ */

document
  .querySelectorAll('.color-bet')
  .forEach(button => {

    button.onclick = () => {

      selected =
        button.dataset.bet;


      document
        .querySelectorAll('.color-bet')
        .forEach(x =>
          x.classList.remove('selected')
        );


      document
        .querySelectorAll('.bet-option')
        .forEach(x =>
          x.classList.remove('selected')
        );


      button.classList.add('selected');

    };

  });


/* ================================
   ADD BET
================================ */

$('betBtn').onclick = () => {

  if(!selected){

    toast('Pick RED, BLACK or a president.');

    return;

  }


  const amount =
    Number($('betAmount').value);


  if(!amount || amount < 10){

    toast('Minimum bet is 10 chips.');

    return;

  }


  /*
    ADD TO EXISTING BET

    Example:

    Tamanna 50
    Tamanna 50

    becomes:

    Tamanna 100
  */

  localBets[selected] =
    (localBets[selected] || 0) + amount;


  /*
    Send individual bet to server.

    Your server must support multiple
    placeBet calls before the spin.
  */

  socket.emit(
    'placeBet',
    {
      entry: selected,
      amount: amount
    }
  );


  toast(
    `${amount} chips added to ${selected}`
  );


  renderBetSlip();

};


/* ================================
   BET SLIP
================================ */

function renderBetSlip(){

  const slip =
    $('betSlip');

  slip.innerHTML = '';


  let total = 0;


  Object.entries(localBets)
    .forEach(([name, amount]) => {

      total += amount;


      const item =
        document.createElement('div');

      let cls = '';


      if(name === 'RED'){
        cls = 'slip-red';
      }

      else if(name === 'BLACK'){
        cls = 'slip-black';
      }

      else if(name === 'WILD CARD'){
        cls = 'slip-green';
      }


      item.className =
        `slip-item ${cls}`;


      item.innerHTML = `
        <span class="slip-name">
          ${name === 'RED'
            ? '♦ RED'
            : name === 'BLACK'
              ? '♠ BLACK'
              : name}
        </span>

        <span class="slip-amount">
          🪙 ${amount}
        </span>
      `;


      slip.appendChild(item);

    });


  $('staked').textContent =
    total.toLocaleString();

}


/* ================================
   CLEAR BETS
================================ */

$('clearBtn').onclick = () => {

  localBets = {};

  selected = null;


  document
    .querySelectorAll('.bet-option')
    .forEach(x =>
      x.classList.remove('selected')
    );


  document
    .querySelectorAll('.color-bet')
    .forEach(x =>
      x.classList.remove('selected')
    );


  socket.emit('clearBets');

  renderBetSlip();

  toast('All bets cleared.');

};


/* ================================
   CREATE ROOM
================================ */

$('create').onclick = () => {

  const name =
    $('name').value.trim();

  err('');


  if(!name){

    return err('Enter your name.');

  }


  socket.emit(
    'createRoom',
    {name},
    r => {

      if(!r.ok)
        return err(r.error);


      me = {
        id: socket.id,
        name
      };


      setRoom(r.code);

      show('lobby');

    }
  );

};


/* ================================
   JOIN ROOM
================================ */

$('join').onclick = () => {

  const name =
    $('name').value.trim();

  const code =
    $('joinCode').value.trim();


  err('');


  if(!name){

    return err('Enter your name.');

  }


  if(!code){

    return err('Enter the room code.');

  }


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
        id: socket.id,
        name
      };


      setRoom(r.code);

      show('lobby');

    }
  );

};


/* ================================
   COPY
================================ */

$('copyCode').onclick = () => {

  navigator.clipboard
    ?.writeText(
      $('lobbyCode').textContent
    );

  toast('Room code copied!');

};


/* ================================
   ENTER GAME
================================ */

$('enterGame').onclick = () => {

  show('game');

  renderGame();

};


/* ================================
   SPIN
================================ */

$('spin').onclick = () => {

  if(Object.keys(localBets).length === 0){

    toast('Place at least one bet first.');

    return;

  }


  socket.emit('spin');

};


/* ================================
   SOCKET
================================ */

socket.on('connect', () => {

  if(me)
    me.id = socket.id;

});


socket.on('roomState', r => {

  room = r;


  if($('lobby').classList.contains('active')){

    renderLobby();

  }


  if($('game').classList.contains('active')){

    renderGame();

  }

});


/* ================================
   SPIN START
================================ */

socket.on(
  'spinStart',
  ({winnerIndex, duration, round}) => {

    room.spinning = true;


    $('result').textContent =
      'THE WHEEL IS DECIDING…';


    $('spin').disabled = true;


    const step =
      360 / entries.length;


    /*
      Put the winning section exactly
      underneath the top pointer.
    */

    const target =
      -(winnerIndex * step + step / 2);


    const current =
      rotation % 360;


    let delta =
      target - current;


    if(delta < 0)
      delta += 360;


    const extra =
      360 * 8;


    rotation +=
      extra + delta;


    $('wheel').style.transform =
      `rotate(${rotation}deg)`;

  }
);


/* ================================
   SPIN RESULT
================================ */

socket.on(
  'spinResult',
  ({winner}) => {

    setTimeout(() => {

      $('result').textContent =
        `🎉 ${winner} WINS THE ROUND`;


      /*
        Clear local bets after round.
      */

      localBets = {};

      selected = null;

      renderBetSlip();


      document
        .querySelectorAll('.bet-option')
        .forEach(x =>
          x.classList.remove('selected')
        );


      document
        .querySelectorAll('.color-bet')
        .forEach(x =>
          x.classList.remove('selected')
        );


      renderGame();

    }, 150);

  }
);


/* ================================
   BUILD
================================ */

buildWheel();

buildBets();

renderBetSlip();
