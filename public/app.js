const socket = io();

/* =========================================================
   WHEEL DATA
========================================================= */

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


/* =========================================================
   STATE
========================================================= */

let me = null;
let room = null;
let selected = null;
let rotation = 0;
let isAnimating = false;


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

function show(id) {
  document
    .querySelectorAll('.screen')
    .forEach(x => x.classList.remove('active'));

  $(id).classList.add('active');
}


function err(text) {
  $('landingError').textContent = text || '';
}


function toast(text) {
  const x = $('toast');

  x.textContent = text;
  x.classList.add('show');

  setTimeout(() => {
    x.classList.remove('show');
  }, 2200);
}


function setRoom(code) {
  $('roomCode').textContent = code;
  $('roomBadge').classList.remove('hidden');
  $('lobbyCode').textContent = code;
}


function formatNumber(n) {
  return Number(n || 0).toLocaleString();
}


/* =========================================================
   PLAYERS
========================================================= */

function renderPlayers(target) {

  target.innerHTML = '';

  if (!room) return;

  room.players.forEach(player => {

    const d = document.createElement('div');

    d.className =
      'player-card' +
      (player.id === me?.id ? ' me' : '');

    d.innerHTML = `
      <div class="player-line">
        <span>${escapeHtml(player.name)}</span>
        <span>${player.host ? '👑' : ''}</span>
      </div>

      <div class="player-chip">
        🪙 ${formatNumber(player.balance)}
      </div>
    `;

    target.appendChild(d);

  });
}


function escapeHtml(value) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

}


/* =========================================================
   LOBBY
========================================================= */

function renderLobby() {

  if (!room) return;

  renderPlayers(
    $('lobbyPlayers')
  );

}


/* =========================================================
   GAME
========================================================= */

function renderGame() {

  if (!room) return;

  $('count').textContent =
    `${room.players.length}/5`;

  renderPlayers(
    $('gamePlayers')
  );

  $('roundNo').textContent =
    room.round || 1;


  const player =
    room.players.find(
      x => x.id === me?.id
    );


  if (player) {

    $('balance').textContent =
      formatNumber(player.balance);


    const staked =
      Object
        .values(player.bets || {})
        .reduce(
          (sum, amount) =>
            sum + Number(amount || 0),
          0
        );


    $('staked').textContent =
      formatNumber(staked);

  }


  $('history').innerHTML =
    (room.history || [])
      .map(item =>
        `<span class="history-item">
          ${escapeHtml(item)}
        </span>`
      )
      .join('');


  const spinButton =
    $('spin');


  spinButton.disabled =
    room.spinning ||
    !player?.host;


  if (room.spinning) {

    spinButton.textContent =
      'SPINNING…';

  } else if (player?.host) {

    spinButton.textContent =
      'SPIN THE ROULETTE';

  } else {

    spinButton.textContent =
      'WAIT FOR HOST';

  }


  updateBetButton();

}


/* =========================================================
   BET SELECTION
========================================================= */

function updateBetButton() {

  const button =
    $('betBtn');

  if (!selected) {

    button.textContent =
      'PLACE BET';

    return;

  }


  if (
    selected.type === 'RED' ||
    selected.type === 'BLACK' ||
    selected.type === 'ODD' ||
    selected.type === 'EVEN'
  ) {

    button.textContent =
      `BET ${selected.type}`;

  } else {

    button.textContent =
      `BET ${selected.entry}`;

  }

}


/* =========================================================
   SELECT BET
========================================================= */

function selectBet(type, entry, button) {

  selected = {
    type,
    entry
  };


  document
    .querySelectorAll(
      '.bet-option'
    )
    .forEach(x =>
      x.classList.remove('selected')
    );


  button.classList.add(
    'selected'
  );


  updateBetButton();

}


/* =========================================================
   TABLE BETS
========================================================= */

function buildTableBets() {

  const existing =
    document.getElementById(
      'tableBets'
    );


  /*
    If the HTML already contains
    tableBets, use it.

    Otherwise insert it immediately
    before president bets.
  */

  let container = existing;


  if (!container) {

    container =
      document.createElement('div');

    container.id =
      'tableBets';

    container.className =
      'table-bets';


    const betOptions =
      $('betOptions');


    betOptions.parentNode.insertBefore(
      container,
      betOptions
    );

  }


  container.innerHTML = '';


  const bets = [

    {
      type: 'RED',
      label: '♦ RED',
      payout: '2× PAYOUT',
      className: 'red-bet'
    },

    {
      type: 'BLACK',
      label: '♣ BLACK',
      payout: '2× PAYOUT',
      className: 'black-bet'
    },

    {
      type: 'ODD',
      label: 'ODD',
      payout: '3× PAYOUT',
      className: 'odd-bet'
    },

    {
      type: 'EVEN',
      label: 'EVEN',
      payout: '3× PAYOUT',
      className: 'even-bet'
    }

  ];


  bets.forEach(bet => {

    const button =
      document.createElement('button');

    button.className =
      `bet-option table-bet ${bet.className}`;


    button.innerHTML = `
      <strong>${bet.label}</strong>
      <small>${bet.payout}</small>
    `;


    button.onclick = () =>
      selectBet(
        bet.type,
        bet.type,
        button
      );


    container.appendChild(
      button
    );

  });

}


/* =========================================================
   PRESIDENT BETS
========================================================= */

function buildPresidentBets() {

  const container =
    $('betOptions');

  container.innerHTML = '';


  entries.forEach(name => {

    const button =
      document.createElement('button');


    button.className =
      'bet-option president-bet';


    button.innerHTML = `
      <img
        src="/assets/${imgs[name]}"
        alt="${escapeHtml(name)}"
      >

      <span class="bet-president-info">

        <strong>
          ${escapeHtml(name)}
        </strong>

        <small>
          ${name === 'WILD CARD'
            ? '15× PAYOUT'
            : '10× PAYOUT'}
        </small>

      </span>
    `;


    button.onclick = () =>
      selectBet(
        name === 'WILD CARD'
          ? 'WILDCARD'
          : 'PRESIDENT',

        name,

        button
      );


    container.appendChild(
      button
    );

  });

}


/* =========================================================
   WHEEL
========================================================= */

function buildWheel() {

  const wheel =
    $('wheel');


  wheel.innerHTML = '';


  /*
    The actual wheel background.

    11 equal sections.
  */

  const step =
    360 / entries.length;


  const colors = entries
    .map((name, index) => {

      if (name === 'WILD CARD') {
        return '#18a957';
      }

      return index % 2 === 0
        ? '#c91d36'
        : '#111216';

    });


  const gradient =
    colors
      .map(
        (color, index) =>
          `${color} ${index * step}deg ${(index + 1) * step}deg`
      )
      .join(', ');


  wheel.style.background =
    `conic-gradient(from -${step / 2}deg, ${gradient})`;


  /*
    Create labels/images/numbers.
  */

  entries.forEach(
    (name, index) => {

      const centerAngle =
        index * step;


      const slot =
        document.createElement('div');

      slot.className =
        'wheel-slot';


      slot.style.setProperty(
        '--angle',
        `${centerAngle}deg`
      );


      slot.innerHTML = `

        <div class="wheel-number">
          ${index + 1}
        </div>

        <img
          class="wheel-photo"
          src="/assets/${imgs[name]}"
          alt="${escapeHtml(name)}"
        >

        <div class="wheel-name">
          ${escapeHtml(name)}
        </div>

      `;


      wheel.appendChild(
        slot
      );

    }
  );


  

}


/* =========================================================
   CREATE ROOM
========================================================= */

$('create').onclick = () => {

  const name =
    $('name').value.trim();


  err('');


  socket.emit(
    'createRoom',
    { name },

    response => {

      if (!response.ok) {

        return err(
          response.error
        );

      }


      me = {
        id: socket.id,
        name
      };


      setRoom(
        response.code
      );


      show('lobby');

    }
  );

};


/* =========================================================
   JOIN ROOM
========================================================= */

$('join').onclick = () => {

  const name =
    $('name').value.trim();


  const code =
    $('joinCode').value
      .trim()
      .toUpperCase();


  err('');


  socket.emit(
    'joinRoom',
    {
      name,
      code
    },

    response => {

      if (!response.ok) {

        return err(
          response.error
        );

      }


      me = {
        id: socket.id,
        name
      };


      setRoom(
        response.code
      );


      show('lobby');

    }
  );

};


/* =========================================================
   COPY ROOM
========================================================= */

$('copyCode').onclick = () => {

  const code =
    $('lobbyCode').textContent;


  navigator
    .clipboard
    ?.writeText(code);


  toast(
    'Room code copied!'
  );

};


/* =========================================================
   ENTER GAME
========================================================= */

$('enterGame').onclick = () => {

  show('game');

  renderGame();

};


/* =========================================================
   PLACE BET
========================================================= */

$('betBtn').onclick = () => {

  if (!selected) {

    return toast(
      'Choose a bet first.'
    );

  }


  const amount =
    Number(
      $('betAmount').value
    );


  if (
    !Number.isFinite(amount) ||
    amount < 10
  ) {

    return toast(
      'Minimum bet is 10 chips.'
    );

  }


  socket.emit(
    'placeBet',
    {

      type:
        selected.type,

      entry:
        selected.entry,

      amount

    }
  );


  toast(
    `Bet placed on ${
      selected.entry
    }`
  );

};


/* =========================================================
   CLEAR BETS
========================================================= */

$('clearBtn').onclick = () => {

  socket.emit(
    'clearBets'
  );

  selected = null;


  document
    .querySelectorAll(
      '.bet-option'
    )
    .forEach(x =>
      x.classList.remove('selected')
    );


  updateBetButton();

};


/* =========================================================
   SPIN
========================================================= */

$('spin').onclick = () => {

  if (isAnimating) return;

  socket.emit(
    'spin'
  );

};


/* =========================================================
   SOCKET EVENTS
========================================================= */

socket.on(
  'connect',
  () => {

    if (me) {
      me.id = socket.id;
    }

  }
);


socket.on(
  'roomState',
  updatedRoom => {

    room = updatedRoom;


    if (
      $('lobby')
        .classList
        .contains('active')
    ) {

      renderLobby();

    }


    if (
      $('game')
        .classList
        .contains('active')
    ) {

      /*
        During animation we don't
        want a premature balance redraw.
      */

      if (!isAnimating) {
        renderGame();
      }

    }

  }
);


/* =========================================================
   SPIN START
========================================================= */

socket.on(
  'spinStart',
  ({
    winnerIndex,
    duration,
    round
  }) => {

    isAnimating = true;


    if (room) {
      room.spinning = true;
      room.round = round;
    }


    $('result').textContent =
      'THE WHEEL IS DECIDING…';


    $('spin').disabled =
      true;


    /*
      The center of the winning
      segment must land exactly
      under the top arrow.
    */

    const step =
      360 / entries.length;


    const winnerCenter =
      winnerIndex * step;


    const desired =
      360 -
      winnerCenter;


    const current =
      ((rotation % 360) + 360) % 360;


    const delta =
      ((desired - current) + 360) % 360;


    /*
      8 full rotations + exact target.
    */

    rotation +=
      360 * 8 +
      delta;


    const wheel =
      $('wheel');


    wheel.style.transition =
      `transform ${
        duration / 1000
      }s cubic-bezier(.10,.72,.12,1)`;


    wheel.style.transform =
      `rotate(${rotation}deg)`;

  }
);


/* =========================================================
   SPIN RESULT
========================================================= */

socket.on(
  'spinResult',
  ({
    winner,
    number,
    color,
    parity
  }) => {

    /*
      Animation has finished.
    */

    isAnimating = false;


    /*
      Show the actual result first.
    */

    let category =
      color;


    if (color === 'GREEN') {

      category =
        'WILD CARD';

    }


    $('result').textContent =
      `🎉 ${winner} WINS — #${number} ${category}`;


    /*
      The next roomState event contains
      the updated balance.

      renderGame happens when it arrives.
    */

    setTimeout(
      () => {

        if (room) {
          room.spinning = false;
        }

        renderGame();

      },
      100
    );

  }
);


/* =========================================================
   INITIAL BUILD
========================================================= */

buildWheel();

buildTableBets();

buildPresidentBets();
