const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;


/* =========================================================
   WHEEL
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


/*
  Wheel numbers:

  1  Arya
  2  Avyukt
  3  Branson
  4  Lakshya
  5  Lavina
  6  Mihir
  7  Motabhai
  8  Priyanshu
  9  SONchita
  10 Tamanna
  11 WILD CARD

  Odd numbers = RED
  Even numbers = BLACK

  Wild Card is GREEN.
*/


/* =========================================================
   PAYOUTS
========================================================= */

const PAYOUTS = {

  RED: 2,

  BLACK: 2,

  ODD: 3,

  EVEN: 3,

  PRESIDENT: 10,

  WILDCARD: 15

};


/* =========================================================
   ROOMS
========================================================= */

const rooms = new Map();


function makeRoom(code) {

  return {

    code,

    players: new Map(),

    betsOpen: true,

    spinning: false,

    round: 0,

    history: []

  };

}


/* =========================================================
   PUBLIC ROOM STATE
========================================================= */

function publicRoom(room) {

  return {

    code: room.code,

    players: [
      ...room.players.values()
    ].map(player => ({

      id: player.id,

      name: player.name,

      balance: player.balance,

      host: player.host,

      bets: player.bets

    })),

    betsOpen: room.betsOpen,

    spinning: room.spinning,

    round: room.round,

    history: room.history.slice(-8)

  };

}


function emitRoom(room) {

  io
    .to(room.code)
    .emit(
      'roomState',
      publicRoom(room)
    );

}


/* =========================================================
   HELPERS
========================================================= */

function cleanName(name) {

  return String(name || '')
    .trim()
    .replace(
      /[^a-zA-Z0-9 _-]/g,
      ''
    )
    .slice(0, 18);

}


function makeCode() {

  let c;

  do {

    c =
      Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase();

  } while (rooms.has(c));

  return c;

}


function totalBets(player) {

  return Object
    .values(player.bets || {})
    .reduce(
      (total, amount) =>
        total + Number(amount || 0),
      0
    );

}


/*
  Convert the wheel result into its
  betting categories.
*/

function getResultInfo(winner, winnerIndex) {

  const number =
    winnerIndex + 1;


  /*
    Wild Card is its own category.
  */

  if (winner === 'WILD CARD') {

    return {

      number,

      color: 'GREEN',

      parity: null,

      winner,

      president: false,

      wildcard: true

    };

  }


  const color =
    number % 2 === 1
      ? 'RED'
      : 'BLACK';


  const parity =
    number % 2 === 1
      ? 'ODD'
      : 'EVEN';


  return {

    number,

    color,

    parity,

    winner,

    president: true,

    wildcard: false

  };

}


/* =========================================================
   BET VALIDATION
========================================================= */

function isValidBet(type, entry) {

  if (
    type === 'RED' ||
    type === 'BLACK' ||
    type === 'ODD' ||
    type === 'EVEN'
  ) {

    return entry === type;

  }


  if (type === 'PRESIDENT') {

    return presidents.includes(entry);

  }


  if (type === 'WILDCARD') {

    return entry === 'WILD CARD';

  }


  return false;

}


/* =========================================================
   CONNECTION
========================================================= */

io.on(
  'connection',
  socket => {


    /* =====================================================
       CREATE ROOM
    ===================================================== */

    socket.on(
      'createRoom',
      ({ name }, cb) => {

        const n =
          cleanName(name);


        if (!n) {

          return cb({

            ok: false,

            error: 'Enter your name.'

          });

        }


        const c =
          makeCode();


        const room =
          makeRoom(c);


        rooms.set(
          c,
          room
        );


        room.players.set(
          socket.id,
          {

            id: socket.id,

            name: n,

            balance: 1000,

            host: true,

            bets: {}

          }
        );


        socket.join(c);

        socket.data.room = c;


        cb({

          ok: true,

          code: c

        });


        emitRoom(room);

      }
    );


    /* =====================================================
       JOIN ROOM
    ===================================================== */

    socket.on(
      'joinRoom',
      ({ name, code: c }, cb) => {

        const n =
          cleanName(name);


        const rc =
          String(c || '')
            .trim()
            .toUpperCase();


        const room =
          rooms.get(rc);


        if (!n) {

          return cb({

            ok: false,

            error: 'Enter your name.'

          });

        }


        if (!room) {

          return cb({

            ok: false,

            error: 'Room not found.'

          });

        }


        if (room.players.size >= 5) {

          return cb({

            ok: false,

            error:
              'Room is full (maximum 5 players).'

          });

        }


        if (room.spinning) {

          return cb({

            ok: false,

            error:
              'A spin is already in progress.'

          });

        }


        room.players.set(
          socket.id,
          {

            id: socket.id,

            name: n,

            balance: 1000,

            host: false,

            bets: {}

          }
        );


        socket.join(rc);

        socket.data.room = rc;


        cb({

          ok: true,

          code: rc

        });


        emitRoom(room);

      }
    );


    /* =====================================================
       PLACE BET
    ===================================================== */

    socket.on(
      'placeBet',
      ({ type, entry, amount }) => {

        const room =
          rooms.get(
            socket.data.room
          );


        const player =
          room?.players.get(
            socket.id
          );


        if (
          !room ||
          !player ||
          !room.betsOpen ||
          room.spinning
        ) {

          return;

        }


        const a =
          Math.floor(
            Number(amount)
          );


        /*
          Basic amount validation.
        */

        if (
          !Number.isFinite(a) ||
          a < 10
        ) {

          return;

        }


        /*
          Make sure the requested
          bet actually exists.
        */

        if (
          !isValidBet(
            type,
            entry
          )
        ) {

          return;

        }


        /*
          Prevent betting more chips
          than the player owns.
        */

        if (a > player.balance) {

          return;

        }


        const currentTotal =
          totalBets(player);


        if (
          currentTotal + a >
          player.balance
        ) {

          return;

        }


        /*
          Store bets with a unique key.

          Examples:

          RED
          BLACK
          ODD
          EVEN
          PRESIDENT:Arya
          WILDCARD
        */

        let key;


        if (
          type === 'RED' ||
          type === 'BLACK' ||
          type === 'ODD' ||
          type === 'EVEN'
        ) {

          key = type;

        } else {

          key =
            `${type}:${entry}`;

        }


        player.bets[key] =
          (player.bets[key] || 0) + a;


        /*
          Remove chips immediately from
          available balance.

          They are returned through payout
          calculation after the spin.
        */

        player.balance -= a;


        emitRoom(room);

      }
    );


    /* =====================================================
       CLEAR BETS
    ===================================================== */

    socket.on(
      'clearBets',
      () => {

        const room =
          rooms.get(
            socket.data.room
          );


        const player =
          room?.players.get(
            socket.id
          );


        if (
          !room ||
          !player ||
          !room.betsOpen ||
          room.spinning
        ) {

          return;

        }


        /*
          Return every currently placed
          chip to the player's balance.
        */

        player.balance +=
          totalBets(player);


        player.bets = {};


        emitRoom(room);

      }
    );


    /* =====================================================
       SPIN
    ===================================================== */

    socket.on(
      'spin',
      () => {

        const room =
          rooms.get(
            socket.data.room
          );


        const player =
          room?.players.get(
            socket.id
          );


        /*
          Only host can spin.
        */

        if (
          !room ||
          !player ||
          !player.host ||
          room.spinning
        ) {

          return;

        }


        /*
          Start spin.
        */

        room.spinning = true;

        room.betsOpen = false;

        room.round++;


        /*
          Server decides the winner.

          Clients do NOT decide this.
        */

        const winnerIndex =
          Math.floor(
            Math.random() *
            entries.length
          );


        const winner =
          entries[winnerIndex];


        /*
          Tell every client the wheel
          is beginning its animation.

          NO BALANCE UPDATE HERE.
        */

        io
          .to(room.code)
          .emit(
            'spinStart',
            {

              winnerIndex,

              round:
                room.round,

              duration:
                6200

            }
          );


        /*
          Wait for the visual spin to
          finish before calculating and
          revealing payouts.
        */

        setTimeout(
          () => {

            const result =
              getResultInfo(
                winner,
                winnerIndex
              );


            /*
              PAY EVERY PLAYER
            */

            for (
              const currentPlayer
              of room.players.values()
            ) {


              const bets =
                currentPlayer.bets || {};


              /*
                RED
              */

              if (
                result.color === 'RED'
              ) {

                const bet =
                  Number(
                    bets.RED || 0
                  );


                if (bet > 0) {

                  /*
                    Since the stake was
                    removed when betting,
                    return 2x total.
                  */

                  currentPlayer.balance +=
                    bet *
                    PAYOUTS.RED;

                }

              }


              /*
                BLACK
              */

              if (
                result.color === 'BLACK'
              ) {

                const bet =
                  Number(
                    bets.BLACK || 0
                  );


                if (bet > 0) {

                  currentPlayer.balance +=
                    bet *
                    PAYOUTS.BLACK;

                }

              }


              /*
                ODD
              */

              if (
                result.parity === 'ODD'
              ) {

                const bet =
                  Number(
                    bets.ODD || 0
                  );


                if (bet > 0) {

                  currentPlayer.balance +=
                    bet *
                    PAYOUTS.ODD;

                }

              }


              /*
                EVEN
              */

              if (
                result.parity === 'EVEN'
              ) {

                const bet =
                  Number(
                    bets.EVEN || 0
                  );


                if (bet > 0) {

                  currentPlayer.balance +=
                    bet *
                    PAYOUTS.EVEN;

                }

              }


              /*
                PRESIDENT
              */

              if (
                result.president
              ) {

                const key =
                  `PRESIDENT:${winner}`;


                const bet =
                  Number(
                    bets[key] || 0
                  );


                if (bet > 0) {

                  currentPlayer.balance +=
                    bet *
                    PAYOUTS.PRESIDENT;

                }

              }


              /*
                WILD CARD
              */

              if (
                result.wildcard
              ) {

                const bet =
                  Number(
                    bets['WILDCARD:WILD CARD'] || 0
                  );


                if (bet > 0) {

                  currentPlayer.balance +=
                    bet *
                    PAYOUTS.WILDCARD;

                }

              }


              /*
                Clear bets AFTER payout
                calculation.
              */

              currentPlayer.bets = {};

            }


            /*
              Save result to history.
            */

            room.history.push(
              `${winner} #${result.number}`
            );


            /*
              Unlock betting again.
            */

            room.spinning = false;

            room.betsOpen = true;


            /*
              CRITICAL ORDER:

              1. spinResult
              2. emitRoom

              Client receives spinResult,
              waits for animation,
              THEN renderGame() reads the
              updated room balance.
            */

            io
              .to(room.code)
              .emit(
                'spinResult',
                {

                  winner,

                  winnerIndex,

                  number:
                    result.number,

                  color:
                    result.color,

                  parity:
                    result.parity

                }
              );


            emitRoom(room);

          },

          6500
        );

      }
    );


    /* =====================================================
       DISCONNECT
    ===================================================== */

    socket.on(
      'disconnect',
      () => {

        const rc =
          socket.data.room;


        const room =
          rooms.get(rc);


        if (!room) {

          return;

        }


        const leaving =
          room.players.get(
            socket.id
          );


        const wasHost =
          leaving?.host;


        room.players.delete(
          socket.id
        );


        /*
          Delete empty rooms.
        */

        if (
          room.players.size === 0
        ) {

          rooms.delete(rc);

          return;

        }


        /*
          Transfer host status.
        */

        if (wasHost) {

          const next =
            room.players
              .values()
              .next()
              .value;


          if (next) {

            next.host = true;

          }

        }


        emitRoom(room);

      }
    );

  }
);


/* =========================================================
   START SERVER
========================================================= */

server.listen(
  PORT,
  () => {

    console.log(
      `INC Roulette running on port ${PORT}`
    );

  }
);
