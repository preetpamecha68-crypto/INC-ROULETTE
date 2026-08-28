const socket = io();

/* =========================================================
   WHEEL DATA
========================================================= */

const presidents = [
  'Arya',
  'Avyukt',
  'Branson',
  'Lakshya',
  'Lavina',
  'Mihir',
  'Motabhai',
  'Priyanshu',
  'SONchita',
  'Tamanna'
];

const entries = [
  ...presidents,
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
  Every wheel slot gets a number.

  1-10 = presidents
  11    = WILD CARD

  Red / Black alternate.
*/

const wheelData = entries.map((name, index) => ({
  name,
  number: index + 1,
  color:
    name === 'WILD CARD'
      ? 'green'
      : index % 2 === 0
        ? 'red'
        : 'black'
}));


/* =========================================================
   STATE
========================================================= */

let me = null;
let room = null;

let selectedBet = null;
let selectedType = null;

let rotation = 0;
let spinning = false;


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

function show(id) {
  document
    .querySelectorAll('.screen')
    .forEach(x => x.classList.remove('active'));

  const target = $(id);

  if (target) {
    target.classList.add('active');
  }
}

function err(text) {
  if ($('landingError')) {
    $('landingError').textContent = text || '';
  }
}

function toast(text) {
  const x = $('toast');

  if (!x) return;

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

function getMe() {
  return room?.players?.find(p => p.id === me?.id);
}

function getTotalStaked(player) {
  if (!player?.bets) return 0;

  return Object.values(player.bets)
    .reduce((total, amount) => total + Number(amount || 0), 0);
}


/* =========================================================
   PLAYERS
========================================================= */

function renderPlayers(target) {

  if (!target || !room) return;

  target.innerHTML = '';

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
        🪙 ${Number(player.balance || 0).toLocaleString()}
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

  renderPlayers($('lobbyPlayers'));
}


/* =========================================================
   GAME
========================================================= */

function renderGame() {

  if (!room) return;

  const player = getMe();

  $('count').textContent =
    `${room.players.length}/5`;

  renderPlayers($('gamePlayers'));

  $('roundNo').textContent =
    room.round || 1;


  /*
    IMPORTANT:

    During a spin we DON'T show newly calculated
    points. The server only sends the final balance
    after spinResult.
  */

  if (player && !room.spinning) {

    $('balance').textContent =
      Number(player.balance || 0).toLocaleString();

    $('staked').textContent =
      getTotalStaked(player).toLocaleString();

  }


  if (room.spinning) {

    $('spin').disabled = true;

    $('spin').textContent = 'SPINNING…';

  } else {

    $('spin').disabled =
      !player?.host;

    $('spin').textContent =
      player?.host
        ? 'SPIN THE ROULETTE'
        : 'WAIT FOR HOST';
  }


  $('history').innerHTML =
    (room.history || [])
      .map(x =>
        `<span class="history-item">
          ${escapeHtml(x)}
        </span>`
      )
      .join('');


  /*
    Disable betting while spinning.
  */

  document
    .querySelectorAll('.bet-option, .table-bet')
    .forEach(button => {

      button.disabled =
        room.spinning ||
        room.betsOpen === false;
    });


  /*
    Recalculate displayed stake.
  */

  if (player && !room.spinning) {

    $('staked').textContent =
      getTotalStaked(player).toLocaleString();
  }
}


/* =========================================================
   WHEEL
========================================================= */

function buildWheel() {

  const wheel = $('wheel');

  if (!wheel) return;

  wheel.innerHTML = '';

  const total = wheelData.length;
  const step = 360 / total;

  wheelData.forEach((slot, index) => {

    const slice =
      document.createElement('div');

    slice.className = 'slice';

    slice.dataset.number =
      slot.number;

    slice.dataset.type =
      slot.color;


    /*
      Alternate colours.

      Wild card gets its own green class.
    */

    if (slot.color === 'red') {

      slice.style.background =
        '#c81e32';

    } else if (slot.color === 'black') {

      slice.style.background =
        '#08090d';

    } else {

      slice.style.background =
        '#20a85a';
    }


    slice.style.transform =
      `rotate(${index * step}deg) skewY(${90 - step}deg)`;


    const inner =
      document.createElement('div');

    inner.className =
      'slice-inner';

    inner.style.transform =
      `skewY(-${90 - step}deg) rotate(${step / 2}deg)`;


    const image =
      document.createElement('img');

    image.src =
      `/assets/${imgs[slot.name]}`;

    image.alt =
      slot.name;


    const number =
      document.createElement('div');

    number.className =
      'slice-number';

    number.textContent =
      slot.number;


    const name =
      document.createElement('b');

    name.textContent =
      slot.name;


    inner.appendChild(number);
    inner.appendChild(image);
    inner.appendChild(name);

    slice.appendChild(inner);

    wheel.appendChild(slice);
  });
}


/* =========================================================
   BETTING PANEL
========================================================= */

function buildBettingPanel() {

  const panel =
    document.querySelector('.bet-panel');

  const presidentContainer =
    $('betOptions');

  if (!panel || !presidentContainer) return;


  /*
    Create category betting buttons
    only once.
  */

  let tableContainer =
    document.querySelector('.table-bets');

  if (!tableContainer) {

    tableContainer =
      document.createElement('div');

    tableContainer.className =
      'table-bets';

    tableContainer.innerHTML = `

      <button
        type="button"
        class="table-bet red-bet"
        data-bet-type="RED"
      >
        <b>♦ RED</b>
        <small>2× PAYOUT</small>
      </button>

      <button
        type="button"
        class="table-bet black-bet"
        data-bet-type="BLACK"
      >
        <b>♠ BLACK</b>
        <small>2× PAYOUT</small>
      </button>

      <button
        type="button"
        class="table-bet odd-bet"
        data-bet-type="ODD"
      >
        <b>ODD</b>
        <small>3× PAYOUT</small>
      </button>

      <button
        type="button"
        class="table-bet even-bet"
        data-bet-type="EVEN"
      >
        <b>EVEN</b>
        <small>3× PAYOUT</small>
      </button>

    `;

    presidentContainer.parentNode.insertBefore(
      tableContainer,
      presidentContainer
    );
  }


  /*
    Change old heading.
  */

  const heading =
    panel.querySelector('h3');

  if (heading) {

    heading.textContent =
      'PLACE YOUR BET';
  }


  /*
    Category click handlers.
  */

  tableContainer
    .querySelectorAll('.table-bet')
    .forEach(button => {

      button.onclick = () => {

        if (room?.spinning) {

          toast('Wait for the spin to finish.');

          return;
        }

        selectBet(
          button.dataset.betType,
          button.dataset.betType
        );
      };
    });
}


/* =========================================================
   PRESIDENT BETS
========================================================= */

function buildPresidentBets() {

  const container =
    $('betOptions');

  if (!container) return;

  container.innerHTML = '';

  presidents.forEach((name, index) => {

    const button =
      document.createElement('button');

    button.type =
      'button';

    button.className =
      'bet-option';

    button.dataset.betType =
      'PRESIDENT';

    button.dataset.betValue =
      name;


    button.innerHTML = `

      <img
        src="/assets/${imgs[name]}"
        alt="${escapeHtml(name)}"
      >

      <span>

        <b>${escapeHtml(name)}</b>

        <small>
          10× PAYOUT
        </small>

      </span>

    `;


    button.onclick = () => {

      if (room?.spinning) {

        toast('Wait for the spin to finish.');

        return;
      }

      selectBet(
        'PRESIDENT',
        name
      );
    };


    container.appendChild(button);
  });


  /*
    Wild Card is a special bet.
  */

  const wildcard =
    document.createElement('button');

  wildcard.type =
    'button';

  wildcard.className =
    'bet-option';

  wildcard.dataset.betType =
    'WILDCARD';

  wildcard.dataset.betValue =
    'WILD CARD';


  wildcard.innerHTML = `

    <img
      src="/assets/${imgs['WILD CARD']}"
      alt="Wild Card"
    >

    <span>

      <b>WILD CARD</b>

      <small>
        15× PAYOUT
      </small>

    </span>

  `;


  wildcard.onclick = () => {

    if (room?.spinning) {

      toast('Wait for the spin to finish.');

      return;
    }

    selectBet(
      'WILDCARD',
      'WILD CARD'
    );
  };


  container.appendChild(wildcard);
}


/* =========================================================
   SELECT BET
========================================================= */

function selectBet(type, value) {

  selectedType = type;
  selectedBet = value;


  /*
    Clear every selection.
  */

  document
    .querySelectorAll(
      '.table-bet, .bet-option'
    )
    .forEach(x =>
      x.classList.remove('selected')
    );


  /*
    Select table category.
  */

  const tableButton =
    document.querySelector(
      `.table-bet[data-bet-type="${CSS.escape(value)}"]`
    );

  if (tableButton) {

    tableButton.classList.add('selected');
  }


  /*
    Select president / wildcard.
  */

  const presidentButton =
    document.querySelector(
      `.bet-option[data-bet-value="${CSS.escape(value)}"]`
    );

  if (presidentButton) {

    presidentButton.classList.add('selected');
  }


  /*
    User feedback.
  */

  let label =
    value;

  if (type === 'RED') {
    label = 'RED';
  }

  if (type === 'BLACK') {
    label = 'BLACK';
  }

  if (type === 'ODD') {
    label = 'ODD';
  }

  if (type === 'EVEN') {
    label = 'EVEN';
  }

  if (type === 'PRESIDENT') {
    label = `${value} — PRESIDENT`;
  }

  if (type === 'WILDCARD') {
    label = 'WILD CARD';
  }

  if ($('result')) {

    $('result').textContent =
      `Selected: ${label}`;
  }
}


/* =========================================================
   BET BUTTON
========================================================= */

$('betBtn').onclick = () => {

  if (room?.spinning) {

    toast('The wheel is spinning.');

    return;
  }


  if (!selectedType || !selectedBet) {

    toast('Choose a betting option first.');

    return;
  }


  const amount =
    Math.floor(
      Number($('betAmount').value)
    );


  if (!Number.isFinite(amount) || amount < 10) {

    toast('Minimum bet is 10 chips.');

    return;
  }


  /*
    Send BOTH the type and value.

    The updated server will understand:

    RED
    BLACK
    ODD
    EVEN
    PRESIDENT
    WILDCARD
  */

  socket.emit(
    'placeBet',
    {
      type: selectedType,
      entry: selectedBet,
      amount
    }
  );

  toast(
    `Bet placed: ${selectedBet} — ${amount} chips`
  );
};


/* =========================================================
   CLEAR BETS
========================================================= */

$('clearBtn').onclick = () => {

  if (room?.spinning) {

    toast('Cannot clear bets during a spin.');

    return;
  }

  socket.emit('clearBets');

  selectedBet = null;
  selectedType = null;

  document
    .querySelectorAll(
      '.table-bet, .bet-option'
    )
    .forEach(x =>
      x.classList.remove('selected')
    );

  if ($('result')) {

    $('result').textContent =
      'Choose your bets and spin.';
  }
};


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

        return err(response.error);
      }

      me = {
        id: socket.id,
        name
      };

      setRoom(response.code);

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
    $('joinCode').value.trim();

  err('');

  socket.emit(
    'joinRoom',
    {
      name,
      code
    },
    response => {

      if (!response.ok) {

        return err(response.error);
      }

      me = {
        id: socket.id,
        name
      };

      setRoom(response.code);

      show('lobby');
    }
  );
};


/* =========================================================
   COPY ROOM
========================================================= */

$('copyCode').onclick = () => {

  navigator.clipboard
    ?.writeText(
      $('lobbyCode').textContent
    );

  toast('Room code copied!');
};


/* =========================================================
   ENTER GAME
========================================================= */

$('enterGame').onclick = () => {

  show('game');

  renderGame();
};


/* =========================================================
   SPIN
========================================================= */

$('spin').onclick = () => {

  if (room?.spinning) return;

  const player = getMe();

  if (!player?.host) {

    toast('Only the host can spin.');

    return;
  }

  socket.emit('spin');
};


/* =========================================================
   SOCKET CONNECT
========================================================= */

socket.on('connect', () => {

  if (me) {

    me.id =
      socket.id;
  }
});


/* =========================================================
   ROOM STATE
========================================================= */

socket.on(
  'roomState',
  newRoom => {

    room = newRoom;

    if (
      $('lobby').classList.contains('active')
    ) {

      renderLobby();
    }

    if (
      $('game').classList.contains('active')
    ) {

      renderGame();
    }
  }
);


/* =========================================================
   SPIN START
========================================================= */

socket.on(
  'spinStart',
  ({ winnerIndex, duration, round }) => {

    spinning = true;

    if (room) {

      room.spinning = true;
      room.betsOpen = false;
    }


    /*
      CRITICAL:

      Do NOT update balance here.

      The balance stays at the pre-spin
      amount until spinResult arrives.
    */

    if ($('result')) {

      $('result').textContent =
        '🎰 THE WHEEL IS DECIDING…';
    }

    $('spin').disabled = true;

    $('spin').textContent =
      'SPINNING…';


    /*
      Wheel geometry.

      Winner's CENTER is aligned to the pointer.
    */

    const total =
      wheelData.length;

    const step =
      360 / total;

    const winnerCenter =
      winnerIndex * step +
      step / 2;


    /*
      We want the winner center
      at 12 o'clock.

      Add multiple complete rotations
      for the dramatic spin.
    */

    const targetRotation =
      360 * 8 +
      (360 - winnerCenter);


    rotation +=
      targetRotation;


    $('wheel').style.transform =
      `rotate(${rotation}deg)`;
  }
);


/* =========================================================
   SPIN RESULT
========================================================= */

socket.on(
  'spinResult',
  ({ winner, winnerIndex }) => {

    /*
      Wait until the visual wheel has
      actually completed before showing
      the result / updated points.
    */

    setTimeout(() => {

      spinning = false;


      if ($('result')) {

        if (winner === 'WILD CARD') {

          $('result').textContent =
            '🟢 WILD CARD WINS — 15× PAYOUT';
        } else {

          const number =
            winnerIndex + 1;

          const color =
            number % 2 === 1
              ? 'RED'
              : 'BLACK';

          $('result').textContent =
            `🎉 ${winner} WINS — #${number} ${color}`;
        }
      }


      /*
        NOW the server's new balance
        is allowed to appear.

        This is deliberately after
        the spin animation.
      */

      if (room) {

        room.spinning = false;
        room.betsOpen = true;
      }


      renderGame();


      /*
        Reset selected bet after result.
      */

      selectedBet = null;
      selectedType = null;

      document
        .querySelectorAll(
          '.table-bet, .bet-option'
        )
        .forEach(x =>
          x.classList.remove('selected')
        );

    }, 250);
  }
);


/* =========================================================
   INITIALISE
========================================================= */

buildWheel();

buildBettingPanel();

buildPresidentBets();
