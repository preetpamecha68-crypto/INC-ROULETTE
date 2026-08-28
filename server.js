const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');


const app = express();

const server =
  http.createServer(app);

const io =
  new Server(server);

const PORT =
  process.env.PORT || 3000;


/* =========================================================
   WHEEL
========================================================= */

const entries = [

  {
    name: 'Arya',
    number: 1,
    color: 'RED',
    payout: 10
  },

  {
    name: 'Avyukt',
    number: 2,
    color: 'BLACK',
    payout: 10
  },

  {
    name: 'Branson',
    number: 3,
    color: 'RED',
    payout: 10
  },

  {
    name: 'Lakshya',
    number: 4,
    color: 'BLACK',
    payout: 10
  },

  {
    name: 'Lavina',
    number: 5,
    color: 'RED',
    payout: 10
  },

  {
    name: 'Mihir',
    number: 6,
    color: 'BLACK',
    payout: 10
  },

  {
    name: 'Motabhai',
    number: 7,
    color: 'RED',
    payout: 10
  },

  {
    name: 'Priyanshu',
    number: 8,
    color: 'BLACK',
    payout: 10
  },

  {
    name: 'SONchita',
    number: 9,
    color: 'RED',
    payout: 10
  },

  {
    name: 'Tamanna',
    number: 10,
    color: 'BLACK',
    payout: 10
  },

  {
    name: 'WILD CARD',
    number: 0,
    color: 'GREEN',
    payout: 15,
    wildcard: true
  }

];


const rooms =
  new Map();


const TABLE_BETS =
  new Set([
    'RED',
    'BLACK',
    'ODD',
    'EVEN'
  ]);


/* =========================================================
   EXPRESS
========================================================= */

app.use(
  express.static(
    path.join(
      __dirname,
      'public'
    )
  )
);


app.get(
  '*',
  (_, res) =>
    res.sendFile(
      path.join(
        __dirname,
        'public',
        'index.html'
      )
    )
);


/* =========================================================
   ROOM
========================================================= */

function makeRoom(code) {

  return {

    code,

    players:
      new Map(),

    betsOpen:
      true,

    spinning:
      false,

    round:
      0,

    history:
      []

  };

}


function publicRoom(room) {

  return {

    code:
      room.code,

    players:
      [
        ...room.players.values()
      ].map(player => ({

        id:
          player.id,

        name:
          player.name,

        balance:
          player.balance,

        host:
          player.host,

        bets:
          player.bets

      })),

    betsOpen:
      room.betsOpen,

    spinning:
      room.spinning,

    round:
      room.round,

    history:
      room.history.slice(-8)

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
   UTILITIES
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

  let code;

  do {

    code =
      Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase();

  }

  while (
    rooms.has(code)
  );

  return code;

}


function totalBets(player) {

  return Object
    .values(
      player.bets || {}
    )
    .reduce(
      (total, amount) =>
        total + amount,
      0
    );

}


/* =========================================================
   PAYOUT LOGIC
========================================================= */

function winningBet(
  betType,
  winner
) {


  /*
    President bet
  */

  if (
    betType ===
    winner.name
  ) {

    return {

      win: true,

      payout:
        winner.wildcard
          ? 15
          : 10

    };

  }


  /*
    RED / BLACK
  */

  if (
    betType ===
    winner.color
  ) {

    return {

      win: true,

      payout: 2

    };

  }


  /*
    ODD

    Wild Card = 0,
    so it does NOT count
    as odd.
  */

  if (
    betType === 'ODD' &&
    winner.number > 0 &&
    winner.number % 2 === 1
  ) {

    return {

      win: true,

      payout: 3

    };

  }


  /*
    EVEN

    Wild Card = 0,
    so it does NOT count
    as even.
  */

  if (
    betType === 'EVEN' &&
    winner.number > 0 &&
    winner.number % 2 === 0
  ) {

    return {

      win: true,

      payout: 3

    };

  }


  return {

    win: false,

    payout: 0

  };

}


/* =========================================================
   SOCKET
========================================================= */

io.on(
  'connection',
  socket => {


    /* =====================================================
       CREATE ROOM
    ===================================================== */

    socket.on(
      'createRoom',
      ({ name }, callback) => {

        const clean =
          cleanName(name);


        if (!clean) {

          return callback({

            ok: false,

            error:
              'Enter your name.'

          });

        }


        const roomCode =
          makeCode();


        const room =
          makeRoom(
            roomCode
          );


        rooms.set(
          roomCode,
          room
        );


        room.players.set(
          socket.id,
          {

            id:
              socket.id,

            name:
              clean,

            balance:
              1000,

            host:
              true,

            bets:
              {}

          }
        );


        socket.join(
          roomCode
        );


        socket.data.room =
          roomCode;


        callback({

          ok: true,

          code:
            roomCode

        });


        emitRoom(room);

      }
    );


    /* =====================================================
       JOIN ROOM
    ===================================================== */

    socket.on(
      'joinRoom',
      ({ name, code }, callback) => {

        const clean =
          cleanName(name);


        const roomCode =
          String(code || '')
            .trim()
            .toUpperCase();


        const room =
          rooms.get(
            roomCode
          );


        if (!clean) {

          return callback({

            ok: false,

            error:
              'Enter your name.'

          });

        }


        if (!room) {

          return callback({

            ok: false,

            error:
              'Room not found.'

          });

        }


        if (
          room.players.size >= 5
        ) {

          return callback({

            ok: false,

            error:
              'Room is full (maximum 5 players).'

          });

        }


        if (
          room.spinning
        ) {

          return callback({

            ok: false,

            error:
              'A spin is already in progress.'

          });

        }


        room.players.set(
          socket.id,
          {

            id:
              socket.id,

            name:
              clean,

            balance:
              1000,

            host:
              false,

            bets:
              {}

          }
        );


        socket.join(
          roomCode
        );


        socket.data.room =
          roomCode;


        callback({

          ok: true,

          code:
            roomCode

        });


        emitRoom(room);

      }
    );


    /* =====================================================
       PLACE BET
    ===================================================== */

    socket.on(
      'placeBet',
      (
        {
          entry,
          amount
        },
        callback = () => {}
      ) => {


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

          return callback({

            ok: false,

            error:
              'Betting is closed.'

          });

        }


        const betAmount =
          Math.floor(
            Number(amount)
          );


        const validBet =
          entries.some(
            entryData =>
              entryData.name ===
              entry
          ) ||
          TABLE_BETS.has(entry);


        if (
          !validBet ||
          !Number.isFinite(
            betAmount
          ) ||
          betAmount < 10
        ) {

          return callback({

            ok: false,

            error:
              'Invalid bet.'

          });

        }


        /*
          IMPORTANT FIX:

          Balance has already been reduced
          by previous bets.

          Therefore we ONLY need to check
          whether this NEW bet fits the
          remaining balance.

          The old code incorrectly added
          previous bets again.
        */

        if (
          betAmount >
          player.balance
        ) {

          return callback({

            ok: false,

            error:
              'Not enough chips.'

          });

        }


        player.bets[entry] =
          (
            player.bets[entry] ||
            0
          ) +
          betAmount;


        player.balance -=
          betAmount;


        callback({

          ok: true

        });


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


        player.balance +=
          totalBets(player);


        player.bets =
          {};


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


        const host =
          room?.players.get(
            socket.id
          );


        if (
          !room ||
          !host ||
          !host.host ||
          room.spinning
        ) {

          return;

        }


        room.spinning =
          true;


        room.betsOpen =
          false;


        room.round++;


        /*
          Decide winner ONCE on server.
        */

        const winnerIndex =
          Math.floor(
            Math.random() *
            entries.length
          );


        const winner =
          entries[winnerIndex];


        /*
          Start animation.

          NO BALANCES ARE UPDATED HERE.
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


        emitRoom(room);


        /*
          Wait for animation to finish.
        */

        setTimeout(
          () => {


            for (
              const player
              of room.players.values()
            ) {


              let winnings =
                0;


              /*
                Every bet is evaluated
                independently.

                Example:

                ₹50 RED
                ₹50 ODD
                ₹50 Arya

                Multiple bets can all win.
              */

              for (
                const [
                  betType,
                  stake
                ]
                of Object.entries(
                  player.bets || {}
                )
              ) {


                const result =
                  winningBet(
                    betType,
                    winner
                  );


                if (
                  result.win
                ) {

                  winnings +=
                    stake *
                    result.payout;

                }

              }


              /*
                Stakes were already removed
                when bets were placed.

                Therefore this adds the FULL
                payout including the original
                stake.

                RED/BLACK:
                  50 → 100

                ODD/EVEN:
                  50 → 150

                PRESIDENT:
                  50 → 500

                WILD CARD:
                  50 → 750
              */

              player.balance +=
                winnings;


              player.bets =
                {};

            }


            room.history.push(
              winner.name
            );


            room.spinning =
              false;


            room.betsOpen =
              true;


            /*
              Result is only sent now.

              Balance is also only revealed
              through the new room state now.
            */

            io
              .to(room.code)
              .emit(
                'spinResult',
                {

                  winner:
                    winner.name,

                  winnerIndex

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

        const roomCode =
          socket.data.room;


        const room =
          rooms.get(
            roomCode
          );


        if (!room) {

          return;

        }


        const wasHost =
          room.players
            .get(socket.id)
            ?.host;


        room.players.delete(
          socket.id
        );


        if (
          room.players.size === 0
        ) {

          rooms.delete(
            roomCode
          );

          return;

        }


        /*
          Automatically promote
          another player if host leaves.
        */

        if (wasHost) {

          const next =
            room.players
              .values()
              .next()
              .value;


          if (next) {

            next.host =
              true;

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
