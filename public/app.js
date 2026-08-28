const socket = io();


/* =========================================================
   WHEEL DATA
========================================================= */

const entries = [

  {
    name: 'Arya',
    number: 1,
    color: 'RED',
    image: 'Arya.jpeg'
  },

  {
    name: 'Avyukt',
    number: 2,
    color: 'BLACK',
    image: 'Avyukt.jpeg'
  },

  {
    name: 'Branson',
    number: 3,
    color: 'RED',
    image: 'Branson.jpeg'
  },

  {
    name: 'Lakshya',
    number: 4,
    color: 'BLACK',
    image: 'Lakshya.jpeg'
  },

  {
    name: 'Lavina',
    number: 5,
    color: 'RED',
    image: 'Lavina.jpeg'
  },

  {
    name: 'Mihir',
    number: 6,
    color: 'BLACK',
    image: 'Mihir.jpeg'
  },

  {
    name: 'Motabhai',
    number: 7,
    color: 'RED',
    image: 'Motabhai.jpeg'
  },

  {
    name: 'Priyanshu',
    number: 8,
    color: 'BLACK',
    image: 'Priyanshu.jpeg'
  },

  {
    name: 'SONchita',
    number: 9,
    color: 'RED',
    image: 'SONchita.jpeg'
  },

  {
    name: 'Tamanna',
    number: 10,
    color: 'BLACK',
    image: 'Tamanna.jpeg'
  },

  {
    name: 'WILD CARD',
    number: 0,
    color: 'GREEN',
    image: 'Wildcard.jpeg',
    wildcard: true
  }

];


const $ = id =>
  document.getElementById(id);


let me = null;
let room = null;
let selected = null;

let rotation = 0;


/*
  During the animation the balance shown on screen
  stays frozen.

  It only gets replaced once spinResult arrives.
*/
let spinLockedBalance = null;


/* =========================================================
   HELPERS
========================================================= */

function show(id) {

  document
    .querySelectorAll('.screen')
    .forEach(x =>
      x.classList.remove('active')
    );

  $(id).classList.add('active');
}


function err(text) {

  $('landingError').textContent =
    text || '';

}


function toast(text) {

  const box = $('toast');

  box.textContent = text;

  box.classList.add('show');

  setTimeout(() => {

    box.classList.remove('show');

  }, 2200);

}


function money(number) {

  return Number(number || 0)
    .toLocaleString();

}


function setRoom(code) {

  $('roomCode').textContent = code;

  $('roomBadge')
    .classList
    .remove('hidden');

  $('lobbyCode')
    .textContent = code;

}


function currentPlayer() {

  return room?.players
    .find(player =>
      player.id === me?.id
    );

}


function totalStaked(player) {

  return Object
    .values(player?.bets || {})
    .reduce(
      (total, amount) =>
        total + amount,
      0
    );

}


function escapeHTML(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      char => ({

        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'

      }[char])
    );

}


/* =========================================================
   PLAYERS
========================================================= */

function renderPlayers(target) {

  target.innerHTML = '';

  room.players.forEach(player => {

    const card =
      document.createElement('div');

    card.className =
      'player-card' +
      (
        player.id === me?.id
          ? ' me'
          : ''
      );

    card.innerHTML = `

      <div class="player-line">

        <span>
          ${escapeHTML(player.name)}
        </span>

        <span>
          ${player.host ? '👑' : ''}
        </span>

      </div>

      <div class="player-chip">
        🪙 ${money(player.balance)}
      </div>

    `;

    target.appendChild(card);

  });

}


function renderLobby() {

  renderPlayers(
    $('lobbyPlayers')
  );

}


/* =========================================================
   GAME RENDER
========================================================= */

function renderGame() {

  const player =
    currentPlayer();


  $('count').textContent =
    `${room.players.length}/5`;


  renderPlayers(
    $('gamePlayers')
  );


  $('roundNo').textContent =
    room.round || 1;


  /*
    IMPORTANT:

    During a spin:
    DO NOT show the newly settled balance.

    Keep the balance frozen.
  */

  if (room.spinning) {

    if (
      spinLockedBalance !== null
    ) {

      $('balance').textContent =
        money(spinLockedBalance);

    }

  }

  else if (player) {

    spinLockedBalance = null;

    $('balance').textContent =
      money(player.balance);

  }


  if (player) {

    $('staked').textContent =
      money(
        totalStaked(player)
      );

  }


  $('history').innerHTML =
    room.history
      .map(
        winner =>
          `<span class="history-item">
             ${escapeHTML(winner)}
           </span>`
      )
      .join('');


  $('spin').disabled =
    room.spinning ||
    !player?.host;


  $('spin').textContent =
    player?.host

      ? (
          room.spinning
            ? 'SPINNING…'
            : 'SPIN THE ROULETTE'
        )

      : 'WAIT FOR HOST';


  document
    .querySelectorAll('.table-bet')
    .forEach(button => {

      button.classList.toggle(
        'selected',
        selected === button.dataset.bet
      );

      button.disabled =
        room.spinning ||
        !room.betsOpen;

    });


  document
    .querySelectorAll('.bet-option')
    .forEach(button => {

      button.classList.toggle(
        'selected',
        selected === button.dataset.bet
      );

      button.disabled =
        room.spinning ||
        !room.betsOpen;

    });

}


/* =========================================================
   BUILD WHEEL
========================================================= */

function buildWheel() {

  const wheel =
    $('wheel');

  wheel.innerHTML = '';

  const count =
    entries.length;

  const step =
    360 / count;


  /*
    10 alternating sectors:

    1 RED
    2 BLACK
    3 RED
    4 BLACK
    ...

    0 GREEN
  */

  const gradientStops =
    entries
      .map((entry, index) => {

        const start =
          (index * step)
            .toFixed(4);

        const end =
          ((index + 1) * step)
            .toFixed(4);

        const color =
          entry.wildcard
            ? '#20a85a'
            : entry.color === 'RED'
              ? '#c81e32'
              : '#090a0f';

        return `${color} ${start}deg ${end}deg`;

      })
      .join(',');


  wheel.style.background =
    `conic-gradient(
      from ${-step / 2}deg,
      ${gradientStops}
    )`;


  /*
    Put every number/name exactly
    in the middle of its sector.
  */

  entries.forEach(
    (entry, index) => {

      const label =
        document.createElement('div');

      label.className =
        'wheel-label';


      const angle =
        index * step - 90;


      label.style.transform =
        `rotate(${angle}deg)
         translateY(-205px)`;


      label.innerHTML = `

        <div
          class="wheel-label-inner"
          style="transform:rotate(${-angle}deg)"
        >

          <span class="wheel-number">
            ${entry.number}
          </span>

          <img
            src="/assets/${entry.image}"
          />

          <b>
            ${escapeHTML(entry.name)}
          </b>

        </div>

      `;


      wheel.appendChild(label);

    }
  );

}


/* =========================================================
   BUILD PRESIDENT BETS
========================================================= */

function buildBets() {

  const container =
    $('betOptions');

  container.innerHTML = '';


  entries.forEach(entry => {

    const button =
      document.createElement('button');

    button.className =
      'bet-option';


    button.dataset.bet =
      entry.name;


    button.innerHTML = `

      <img
        src="/assets/${entry.image}"
      >

      <span>

        <b>
          ${entry.number}
          •
          ${escapeHTML(entry.name)}
        </b>

        <small>
          ${
            entry.wildcard
              ? '15× payout'
              : '10× payout'
          }
        </small>

      </span>

    `;


    button.onclick = () => {

      selected =
        entry.name;

      updateSelection();

    };


    container.appendChild(
      button
    );

  });

}


/* =========================================================
   BET SELECTION
========================================================= */

function updateSelection() {

  document
    .querySelectorAll(
      '.table-bet,.bet-option'
    )
    .forEach(button => {

      button.classList.toggle(
        'selected',
        selected ===
        button.dataset.bet
      );

    });

}


document
  .querySelectorAll('.table-bet')
  .forEach(button => {

    button.onclick = () => {

      selected =
        button.dataset.bet;

      updateSelection();

    };

  });


/* =========================================================
   CREATE ROOM
========================================================= */

$('create').onclick = () => {

  const name =
    $('name')
      .value
      .trim();

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
    $('name')
      .value
      .trim();

  const code =
    $('joinCode')
      .value
      .trim();


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
   COPY CODE
========================================================= */

$('copyCode').onclick = () => {

  navigator
    .clipboard
    ?.writeText(
      $('lobbyCode')
        .textContent
    );

  toast(
    'Room code copied!'
  );

};


/* =========================================================
   ENTER GAME
========================================================= */

$('enterGame').onclick =
  () => {

    show('game');

    renderGame();

  };


/* =========================================================
   PLACE BET
========================================================= */

$('betBtn').onclick = () => {

  if (!selected) {

    return toast(
      'Pick RED, BLACK, ODD, EVEN or a president first.'
    );

  }


  const amount =
    Number(
      $('betAmount').value
    );


  socket.emit(
    'placeBet',
    {
      entry: selected,
      amount
    },
    response => {

      if (
        response &&
        !response.ok
      ) {

        return toast(
          response.error ||
          'Bet could not be placed.'
        );

      }


      toast(
        `Bet placed on ${selected}`
      );

    }
  );

};


/* =========================================================
   CLEAR BETS
========================================================= */

$('clearBtn').onclick =
  () => {

    socket.emit(
      'clearBets'
    );

  };


/* =========================================================
   SPIN
========================================================= */

$('spin').onclick =
  () => {

    socket.emit(
      'spin'
    );

  };


/* =========================================================
   SOCKET CONNECTION
========================================================= */

socket.on(
  'connect',
  () => {

    if (me) {

      me.id =
        socket.id;

    }

  }
);


/* =========================================================
   ROOM STATE
========================================================= */

socket.on(
  'roomState',
  state => {

    const wasSpinning =
      room?.spinning;


    room = state;


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
        Lock balance when a spin begins.
      */

      if (
        state.spinning &&
        !wasSpinning
      ) {

        const player =
          currentPlayer();

        spinLockedBalance =
          player?.balance ??
          Number(
            $('balance')
              .textContent
              .replace(/,/g, '')
          );

      }


      renderGame();

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


    const player =
      currentPlayer();


    /*
      Freeze the displayed balance.
    */

    spinLockedBalance =
      player?.balance ??
      Number(
        $('balance')
          .textContent
          .replace(/,/g, '')
      );


    if (room) {

      room.spinning =
        true;

    }


    $('result')
      .textContent =
      'THE WHEEL IS DECIDING…';


    $('spin')
      .disabled =
      true;


    const step =
      360 / entries.length;


    /*
      Put the winning sector
      exactly beneath the pointer.

      Pointer is at 12 o'clock.
    */

    const desired =
      (
        -winnerIndex * step
      ) % 360;


    const current =
      (
        rotation % 360 + 360
      ) % 360;


    let delta =
      (
        desired -
        current +
        360
      ) % 360;


    if (
      delta <
      step * 0.2
    ) {

      delta += 360;

    }


    /*
      8 full rotations + exact landing.
    */

    rotation +=
      360 * 8 +
      delta;


    $('wheel')
      .style
      .transform =
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
    winnerIndex
  }) => {


    /*
      CSS animation is 6.2 seconds.

      Wait until it has physically
      stopped before showing anything.
    */

    setTimeout(
      () => {

        const entry =
          entries[winnerIndex] ||
          entries.find(
            x =>
              x.name === winner
          );


        if (entry) {

          let parity = '';

          if (
            entry.number > 0
          ) {

            parity =
              entry.number % 2 === 0
                ? ' — EVEN'
                : ' — ODD';

          }


          $('result')
            .textContent =
            `🎯 ${entry.number} — ${entry.name} — ${entry.color}${parity}`;

        }

        else {

          $('result')
            .textContent =
            `🎉 ${winner}`;

        }


        selected =
          null;


        document
          .querySelectorAll(
            '.table-bet,.bet-option'
          )
          .forEach(
            button =>
              button.classList
                .remove('selected')
          );


        /*
          NOW renderGame sees
          spinning=false and displays
          the newly settled balance.
        */

        renderGame();


      },
      650
    );

  }
);


/* =========================================================
   INITIAL BUILD
========================================================= */

buildWheel();
buildBets();
