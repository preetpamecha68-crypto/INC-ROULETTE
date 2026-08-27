const socket=io();
const entries=['Arya','Avyukt','Branson','Lakshya','Lavina','Mihir','Motabhai','Priyanshu','SONchita','Tamanna','WILD CARD'];
const imgs={Arya:'Arya.jpeg',Avyukt:'Avyukt.jpeg',Branson:'Branson.jpeg',Lakshya:'Lakshya.jpeg',Lavina:'Lavina.jpeg',Mihir:'Mihir.jpeg',Motabhai:'Motabhai.jpeg',Priyanshu:'Priyanshu.jpeg',SONchita:'SONchita.jpeg',Tamanna:'Tamanna.jpeg','WILD CARD':'Wildcard.jpeg'};
let me=null, room=null, selected=null, rotation=0;
const $=id=>document.getElementById(id);
function show(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');}
function err(t){$('landingError').textContent=t||''}
function toast(t){const x=$('toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2200)}
function setRoom(code){$('roomCode').textContent=code;$('roomBadge').classList.remove('hidden');$('lobbyCode').textContent=code}
function renderPlayers(target){target.innerHTML='';room.players.forEach(p=>{const d=document.createElement('div');d.className='player-card'+(p.id===me?.id?' me':'');d.innerHTML=`<div class="player-line"><span>${p.name}</span><span>${p.host?'👑':''}</span></div><div class="player-chip">🪙 ${p.balance.toLocaleString()}</div>`;target.appendChild(d)})}
function renderLobby(){renderPlayers($('lobbyPlayers'))}
function renderGame(){
 $('count').textContent=`${room.players.length}/5`;renderPlayers($('gamePlayers'));$('roundNo').textContent=room.round||1;
 const p=room.players.find(x=>x.id===me?.id); if(p){$('balance').textContent=p.balance.toLocaleString();const st=Object.values(p.bets).reduce((a,b)=>a+b,0);$('staked').textContent=st.toLocaleString()}
 $('history').innerHTML=room.history.map(x=>`<span class="history-item">${x}</span>`).join('');
 $('spin').disabled=room.spinning||!p?.host; $('spin').textContent=p?.host?(room.spinning?'SPINNING…':'SPIN THE ROULETTE'):'WAIT FOR HOST';
}
function buildWheel(){const w=$('wheel');w.innerHTML='';const n=entries.length;const step=360/n;entries.forEach((name,i)=>{const s=document.createElement('div');s.className='slice';s.style.transform=`rotate(${i*step}deg) skewY(${90-step}deg)`;const inner=document.createElement('div');inner.className='slice-inner';inner.style.transform=`skewY(-${90-step}deg) rotate(${step/2}deg)`;inner.innerHTML=`<img src="/assets/${imgs[name]}"/><b>${name}</b>`;s.appendChild(inner);w.appendChild(s)});}
function buildBets(){const c=$('betOptions');c.innerHTML='';entries.forEach(name=>{const b=document.createElement('button');b.className='bet-option';b.innerHTML=`<img src="/assets/${imgs[name]}"><span>${name}<small>11× payout</small></span>`;b.onclick=()=>{selected=name;document.querySelectorAll('.bet-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')};c.appendChild(b)})}
$('create').onclick=()=>{const name=$('name').value.trim();err('');socket.emit('createRoom',{name},r=>{if(!r.ok)return err(r.error);me={id:socket.id,name};setRoom(r.code);show('lobby')})};
$('join').onclick=()=>{const name=$('name').value.trim(),code=$('joinCode').value.trim();err('');socket.emit('joinRoom',{name,code},r=>{if(!r.ok)return err(r.error);me={id:socket.id,name};setRoom(r.code);show('lobby')})};
$('copyCode').onclick=()=>{navigator.clipboard?.writeText($('lobbyCode').textContent);toast('Room code copied!')};
$('enterGame').onclick=()=>{show('game');renderGame()};
$('betBtn').onclick=()=>{if(!selected)return toast('Pick a president first.');const amount=Number($('betAmount').value);socket.emit('placeBet',{entry:selected,amount});toast(`Bet placed on ${selected}`)};
$('clearBtn').onclick=()=>socket.emit('clearBets');
$('spin').onclick=()=>socket.emit('spin');
socket.on('connect',()=>{if(me)me.id=socket.id});
socket.on('roomState',r=>{room=r;if($('lobby').classList.contains('active'))renderLobby();if($('game').classList.contains('active'))renderGame()});
socket.on('spinStart',({winnerIndex,duration,round})=>{room.spinning=true;$('result').textContent='THE WHEEL IS DECIDING…';$('spin').disabled=true;const step=360/entries.length;const target=(360-(winnerIndex*step+step/2));const extra=360*8;rotation+=extra+((target-rotation)%360+360)%360;$('wheel').style.transform=`rotate(${rotation}deg)`});
socket.on('spinResult',({winner})=>{setTimeout(()=>{$('result').textContent=`🎉 ${winner} WINS THE ROUND`;renderGame()},150);});
buildWheel();buildBets();
