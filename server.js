const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const entries = [
  'Arya','Avyukt','Branson','Lakshya','Lavina','Mihir','Motabhai','Priyanshu','SONchita','Tamanna','WILD CARD'
];
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

function makeRoom(code) {
  return { code, players: new Map(), betsOpen: true, spinning: false, round: 0, history: [] };
}
function publicRoom(room) {
  return {
    code: room.code,
    players: [...room.players.values()].map(p => ({ id:p.id, name:p.name, balance:p.balance, host:p.host, bets:p.bets })),
    betsOpen: room.betsOpen,
    spinning: room.spinning,
    round: room.round,
    history: room.history.slice(-8)
  };
}
function emitRoom(room) { io.to(room.code).emit('roomState', publicRoom(room)); }
function cleanName(name) {
  return String(name || '').trim().replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,18);
}
function code() {
  let c; do c = Math.random().toString(36).slice(2,7).toUpperCase(); while (rooms.has(c)); return c;
}

io.on('connection', socket => {
  socket.on('createRoom', ({name}, cb) => {
    const n = cleanName(name); if (!n) return cb({ok:false,error:'Enter your name.'});
    const c = code(); const room = makeRoom(c); rooms.set(c, room);
    room.players.set(socket.id, {id:socket.id,name:n,balance:1000,host:true,bets:{}});
    socket.join(c); socket.data.room=c; cb({ok:true,code:c}); emitRoom(room);
  });

  socket.on('joinRoom', ({name,code:c}, cb) => {
    const n=cleanName(name), rc=String(c||'').trim().toUpperCase(); const room=rooms.get(rc);
    if (!n) return cb({ok:false,error:'Enter your name.'});
    if (!room) return cb({ok:false,error:'Room not found.'});
    if (room.players.size>=5) return cb({ok:false,error:'Room is full (maximum 5 players).'});
    if (room.spinning) return cb({ok:false,error:'A spin is already in progress.'});
    room.players.set(socket.id,{id:socket.id,name:n,balance:1000,host:false,bets:{}});
    socket.join(rc); socket.data.room=rc; cb({ok:true,code:rc}); emitRoom(room);
  });

  socket.on('placeBet', ({entry,amount}) => {
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id); if(!room||!p||!room.betsOpen||room.spinning)return;
    const a=Math.floor(Number(amount)); if(!entries.includes(entry)||!Number.isFinite(a)||a<10||a>p.balance)return;
    const prev=Object.values(p.bets).reduce((x,y)=>x+y,0); if(prev+a>p.balance)return;
    p.bets[entry]=(p.bets[entry]||0)+a; p.balance-=a; emitRoom(room);
  });

  socket.on('clearBets', () => {
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id); if(!room||!p||!room.betsOpen||room.spinning)return;
    p.balance += Object.values(p.bets).reduce((x,y)=>x+y,0); p.bets={}; emitRoom(room);
  });

  socket.on('spin', () => {
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id); if(!room||!p||!p.host||room.spinning)return;
    room.spinning=true; room.betsOpen=false; room.round++;
    const winnerIndex=Math.floor(Math.random()*entries.length);
    const winner=entries[winnerIndex];
    io.to(room.code).emit('spinStart',{winnerIndex,round:room.round,duration:6200});
    setTimeout(() => {
      for (const player of room.players.values()) {
        const bet=player.bets[winner]||0;
        if (bet>0) player.balance += bet*entries.length;
        player.bets={};
      }
      room.history.push(winner);
      room.spinning=false; room.betsOpen=true;
      io.to(room.code).emit('spinResult',{winner,winnerIndex}); emitRoom(room);
    }, 6500);
  });

  socket.on('disconnect', () => {
    const rc=socket.data.room, room=rooms.get(rc); if(!room)return;
    const wasHost=room.players.get(socket.id)?.host; room.players.delete(socket.id);
    if(room.players.size===0){rooms.delete(rc);return;}
    if(wasHost){ const next=room.players.values().next().value; next.host=true; }
    emitRoom(room);
  });
});

server.listen(PORT,()=>console.log(`INC Roulette running on port ${PORT}`));
