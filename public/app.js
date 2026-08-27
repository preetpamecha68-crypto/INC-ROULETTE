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

let me = null;
let room = null;
let selected = null;
let rotation = 0;

const $ = id => document.getElementById(id);


/* =========================
   SCREEN MANAGEMENT
========================= */

function show(id){

  document
    .querySelectorAll('.screen')
    .forEach(x => x.classList.remove('active'));

  $(id).classList.add('active');
}


/* =========================
   ERRORS
========================= */

function err(t){
  $('landingError').textContent = t || '';
}


/* =========================
   TOAST
========================= */

function toast(t){

  const x = $('toast');

  x.textContent = t;

  x.classList.add('show');

  setTimeout(
    () => x.classList.remove('show'),
    2200
  );
}


/* =========================
   ROOM
========================= */

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
   GAME
========================= */

function renderGame(){

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
      Object.values(p.bets)
      .reduce(
        (a,b) => a+b,
        0
      );

    $('staked').textContent =
      st.toLocaleString();
  }

  $('history').innerHTML =
    room.history
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
}


/* =========================
   BUILD ROULETTE
========================= */

function buildWheel(){

  const wheel = $('wheel');

  wheel.innerHTML = '';

  const number =
    entries.length;

  const step =
    360 / number;


  entries.forEach(
    (name,index) => {

      const slice =
        document.createElement('div');

      slice.className =
        'slice';


      /*
        Position each person around
        the roulette circle.
      */

      const angle =
        index * step;


      slice.style.transform =
        `rotate(${angle}deg)`;


      /*
        RED / BLACK alternating
        sectors are created behind
        the faces.
      */

      const inner =
        document.createElement('div');

      inner.className =
        'slice-inner';


      /*
        Keep the face upright.
      */

      inner.style.transform =
        `translateX(-50%) rotate(${-angle}deg)`;


      inner.innerHTML = `
        <img
          src="/assets/${imgs[name]}"
          alt="${name}"
          onerror="this.style.display='none'"
        >

        <b>
          ${name}
        </b>
      `;


      slice.appendChild(inner);

      wheel.appendChild(slice);

    }
  );

}


/* =========================
   BET OPTIONS
========================= */

function buildBets(){

  const container =
    $('betOptions');

  container.innerHTML = '';


  entries.forEach(name => {

    const button =
      document.createElement('button');

    button.className =
      'bet-option';


    button.innerHTML = `
      <img
        src="/assets/${imgs[name]}"
        alt="${name}"
      >

      <span>
        ${name}

        <small>
          11× payout
        </small>
      </span>
    `;


    button.onclick = () => {

      selected = name;

      document
        .querySelectorAll('.bet-option')
        .forEach(
          x =>
            x.classList.remove(
              'selected'
            )
        );

      button.classList.add(
        'selected'
      );

    };


    container.appendChild(button);

  });

}


/* =========================
   CREATE ROOM
========================= */

$('create').onclick = () => {

  const name =
    $('name').value.trim();

  err('');

  if(!name){

    err(
      'Please enter your name.'
    );

    return;
  }


  socket.emit(
    'createRoom',
    {name},

    r => {

      if(!r.ok){

        return err(
          r.error
        );

      }

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
    $('joinCode')
      .value
      .trim()
      .toUpperCase();

  err('');

  if(!name){

    err(
      'Please enter your name.'
    );

    return;
  }

  if(!code){

    err(
      'Please enter a room code.'
    );

    return;
  }


  socket.emit(
    'joinRoom',
    {name,code},

    r => {

      if(!r.ok){

        return err(
          r.error
        );

      }

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
   COPY ROOM CODE
========================= */

$('copyCode').onclick = () => {

  navigator.clipboard?.writeText(
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
      'Pick a president first.'
    );

  }


  const amount =
    Number(
      $('betAmount').value
    );


  if(
    !Number.isFinite(amount) ||
    amount < 10
  ){

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

  socket.emit(
    'clearBets'
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
   SOCKET CONNECTION
========================= */

socket.on(
  'connect',
  () => {

    if(me){

      me.id =
        socket.id;

    }

  }
);


/* =========================
   ROOM STATE
========================= */

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

  ({winnerIndex,duration,round}) => {

    room.spinning = true;

    $('result').textContent =
      'THE WHEEL IS DECIDING…';

    $('spin').disabled = true;


    const step =
      360 / entries.length;


    /*
      Calculate where the winning
      face needs to land under
      the pointer.
    */

    const target =
      360 -
      (
        winnerIndex * step +
        step / 2
      );


    const extra =
      360 * 8;


    let adjustment =
      (
        target -
        (rotation % 360) +
        360
      ) % 360;


    rotation +=
      extra +
      adjustment;


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
   START
========================= */

buildWheel();

buildBets();
