const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const screens=[...document.querySelectorAll('.screen')];
let W,H,dpr,running=false,paused=false,last=0,roadOffset=0,spawn=0,coinSpawn=0,powerSpawn=0;
let lane=1,playerX=0,score=0,distance=0,runCoins=0,speed=240,traffic=[],coins=[],powers=[],mode='endless',timeLeft=60,soundOn=true;
let power={shield:0,magnet:0,nitro:0,slow:0};
const cars=[
 {name:'Crimson',color:'#e63946',price:0},{name:'Azure',color:'#2389ff',price:0},
 {name:'Gold Rush',color:'#f5a623',price:300},{name:'Neon Lime',color:'#2ed573',price:650},
 {name:'Violet GT',color:'#9b5cff',price:1100},{name:'Ice Racer',color:'#5be4f5',price:1800}
];
let totalCoins=+(localStorage.hrCoins||0),unlocked=JSON.parse(localStorage.hrUnlocked||'[0,1]'),selected=+(localStorage.hrSelected||0),best=+(localStorage.hrBest||0);

function resize(){
  dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
  canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize);resize();

function show(id){screens.forEach(s=>s.classList.remove('active'));if(id)$(id).classList.add('active')}
function updateMenu(){
  $('bestText').textContent='Best Score: '+best;
  $('previewCar').style.background=cars[selected].color;
  $('previewCar').style.boxShadow='0 16px 36px '+cars[selected].color+'66';
  $('garageCoins').textContent=totalCoins;
}
function save(){localStorage.hrCoins=totalCoins;localStorage.hrUnlocked=JSON.stringify(unlocked);localStorage.hrSelected=selected;localStorage.hrBest=best}
function beep(f=440,d=.08){if(!soundOn)return;try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.04;o.connect(g);g.connect(a.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.stop(a.currentTime+d)}catch(e){}}

function buildGarage(){
  updateMenu();$('carGrid').innerHTML='';
  cars.forEach((c,i)=>{
    const own=unlocked.includes(i),card=document.createElement('div');
    card.className='carCard '+(i===selected?'selected':'');
    card.innerHTML=`<div class="carVisual" style="background:${c.color};box-shadow:0 8px 22px ${c.color}44"></div><b>${c.name}</b><div style="margin-top:3px;color:#91a4b6;font-size:11px">${own?'Unlocked':'Premium ride'}</div>`;
    const b=document.createElement('button');b.textContent=own?(i===selected?'SELECTED':'SELECT'):`BUY ${c.price} 🪙`;
    b.onclick=()=>{
      if(!own){if(totalCoins<c.price){beep(100);return}totalCoins-=c.price;unlocked.push(i);beep(700)}
      selected=i;save();buildGarage();updateMenu();beep(580,.05)
    };
    card.appendChild(b);$('carGrid').appendChild(card)
  })
}

function startGame(){
  show();$('hud').classList.remove('hidden');$('leftBtn').classList.remove('hidden');$('rightBtn').classList.remove('hidden');
  running=true;paused=false;last=performance.now();lane=1;score=distance=runCoins=0;speed=240;roadOffset=spawn=coinSpawn=powerSpawn=0;
  traffic=[];coins=[];powers=[];timeLeft=60;power={shield:0,magnet:0,nitro:0,slow:0};playerX=laneX(lane);requestAnimationFrame(loop)
}
function stopControls(){$('hud').classList.add('hidden');$('leftBtn').classList.add('hidden');$('rightBtn').classList.add('hidden')}
function endGame(reason='CRASHED!'){
  if(!running)return;running=false;try{window.parent!==window&&window.parent.postMessage({type:'snake-arena-game-finished',game:'highway',score:score},window.location.origin)}catch(e){};stopControls();totalCoins+=runCoins;const isNew=score>best;if(isNew)best=score;save();
  $('overTitle').textContent=reason;$('finalScore').textContent=score;$('finalDistance').textContent=Math.floor(distance)+'m';$('finalCoins').textContent=runCoins;$('newBest').classList.toggle('hidden',!isNew);show('gameOverScreen');beep(120,.25)
}

function roadMetrics(){const roadW=Math.min(W*.82,560);const left=W/2-roadW/2;return {roadW,left,right:left+roadW}}
function laneX(i){const {left,roadW}=roadMetrics();return left+roadW*(i+.5)/3}
function move(dir){if(running&&!paused){lane=Math.max(0,Math.min(2,lane+dir));beep(520,.04)}}

function carHalfHeight(o){return o.type==='truck'?65:45}
function tooCloseToTraffic(l,y,minGap=90){return traffic.some(t=>t.lane===l&&Math.abs(t.y-y)<minGap)}
function chooseSafeLane(y=-90){
  const choices=[0,1,2].filter(l=>!tooCloseToTraffic(l,y,115));
  return choices.length?choices[Math.floor(Math.random()*choices.length)]:Math.floor(Math.random()*3)
}
function spawnCar(){
  const y=-140,l=chooseSafeLane(y);
  traffic.push({lane:l,y,type:Math.random()<.15?'truck':'car',color:['#e84118','#1e90ff','#fbc531','#8c7ae6','#2ed573','#00a8ff'][Math.floor(Math.random()*6)]})
}
function spawnCoin(){
  const y=-35;
  const choices=[0,1,2].filter(l=>!tooCloseToTraffic(l,y,140));
  const l=choices.length?choices[Math.floor(Math.random()*choices.length)]:Math.floor(Math.random()*3);
  coins.push({lane:l,y,spin:Math.random()*Math.PI*2,glow:Math.random()*Math.PI*2})
}
function spawnPower(){
  const y=-55,l=chooseSafeLane(y);
  powers.push({lane:l,y,type:['shield','magnet','nitro','slow'][Math.floor(Math.random()*4)],bob:Math.random()*Math.PI*2})
}
function rectHit(ax,ay,aw,ah,bx,by,bw,bh){return Math.abs(ax-bx)<(aw+bw)/2&&Math.abs(ay-by)<(ah+bh)/2}

function coinOverlapsTraffic(c){
  const cx=laneX(c.lane);
  return traffic.some(t=>{
    const th=carHalfHeight(t),tw=t.type==='truck'?56:50;
    return rectHit(cx,c.y,30,30,laneX(t.lane),t.y,tw,th*2)
  })
}
function resolveCoinTrafficOverlap(c){
  if(!coinOverlapsTraffic(c))return true;
  const alternatives=[0,1,2].filter(l=>l!==c.lane&&!tooCloseToTraffic(l,c.y,65));
  if(alternatives.length){c.lane=alternatives[Math.floor(Math.random()*alternatives.length)];return !coinOverlapsTraffic(c)}
  return false
}
function resolvePowerTrafficOverlap(p){
  if(!traffic.some(t=>rectHit(laneX(p.lane),p.y,35,35,laneX(t.lane),t.y,t.type==='truck'?56:50,carHalfHeight(t)*2)))return true;
  const alternatives=[0,1,2].filter(l=>l!==p.lane&&!tooCloseToTraffic(l,p.y,80));
  if(alternatives.length){p.lane=alternatives[Math.floor(Math.random()*alternatives.length)];return true}
  return false
}

function loop(t){
  if(!running)return;if(paused){requestAnimationFrame(loop);return}
  let dt=Math.min(.035,(t-last)/1000||.016);last=t;
  const mult=power.nitro>0?1.8:1,slow=power.slow>0?.55:1;
  speed=Math.min(600,speed+dt*2.2);const v=speed*mult*slow;distance+=v*dt*.045;score=Math.floor(distance*10+runCoins*25);roadOffset=(roadOffset+v*dt)%90;
  if(mode==='time'){timeLeft-=dt;if(timeLeft<=0){endGame('TIME UP!');return}}
  spawn+=dt;coinSpawn+=dt;powerSpawn+=dt;
  const spawnGap=Math.max(.5,1.12-v/920);
  if(spawn>spawnGap){spawn=0;spawnCar()}
  if(coinSpawn>.62){coinSpawn=0;spawnCoin()}
  if(powerSpawn>8+Math.random()*4){powerSpawn=0;spawnPower()}
  Object.keys(power).forEach(k=>power[k]=Math.max(0,power[k]-dt));

  const targetX=laneX(lane);playerX+=(targetX-playerX)*Math.min(1,dt*13);const py=H*.78;
  traffic.forEach(o=>o.y+=v*dt);coins.forEach(o=>{o.y+=v*dt;o.spin+=dt*7;o.glow+=dt*3});powers.forEach(o=>{o.y+=v*dt;o.bob+=dt*4});

  for(let i=coins.length-1;i>=0;i--){
    if(!resolveCoinTrafficOverlap(coins[i]))coins.splice(i,1);
  }
  for(let i=powers.length-1;i>=0;i--){
    if(!resolvePowerTrafficOverlap(powers[i]))powers.splice(i,1);
  }

  for(let i=traffic.length-1;i>=0;i--){
    const o=traffic[i];
    if(o.y>H+160){traffic.splice(i,1);continue}
    if(rectHit(playerX,py,48,94,laneX(o.lane),o.y,50,o.type==='truck'?130:90)){
      if(power.shield>0){power.shield=0;traffic.splice(i,1);beep(300);continue}
      endGame();return
    }
  }
  coins=coins.filter(o=>{
    const dx=Math.abs(playerX-laneX(o.lane));
    if(power.magnet>0&&dx<170){o.lane=lane+(o.lane===lane?0:(o.lane<lane?1:-1))}
    if(rectHit(playerX,py,48,94,laneX(o.lane),o.y,28,28)){runCoins++;beep(850,.04);return false}
    return o.y<H+45
  });
  powers=powers.filter(o=>{
    if(rectHit(playerX,py,48,94,laneX(o.lane),o.y,34,34)){power[o.type]=7;beep(650,.12);return false}
    return o.y<H+55
  });

  draw();hud();requestAnimationFrame(loop)
}

function draw(){
  ctx.clearRect(0,0,W,H);const night=Math.floor(distance/700)%2===1;
  let sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,night?'#071221':'#52b9ea');sky.addColorStop(.44,night?'#14253d':'#b8e5f4');sky.addColorStop(1,night?'#102a16':'#5d9842');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const {roadW,left,right}=roadMetrics();

  // ground + road
  ctx.fillStyle=night?'#0c391d':'#2e7c31';ctx.fillRect(0,H*.28,W,H*.72);
  ctx.fillStyle=night?'#252d35':'#29353e';ctx.fillRect(left,0,roadW,H);
  const edge=ctx.createLinearGradient(left-7,0,right+7,0);edge.addColorStop(0,'rgba(255,255,255,.4)');edge.addColorStop(.02,'rgba(175,184,188,.7)');edge.addColorStop(.98,'rgba(175,184,188,.7)');edge.addColorStop(1,'rgba(255,255,255,.4)');ctx.fillStyle=edge;ctx.fillRect(left-6,0,roadW+12,H);
  ctx.fillStyle=night?'#1f2931':'#29353e';ctx.fillRect(left,0,roadW,H);
  ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=5;ctx.setLineDash([42,48]);ctx.lineDashOffset=-roadOffset;
  for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(left+roadW*i/3,0);ctx.lineTo(left+roadW*i/3,H);ctx.stroke()}ctx.setLineDash([]);

  // roadside lights / motion markers
  for(let y=((roadOffset*1.4)%120)-120;y<H;y+=120){
    ctx.fillStyle=night?'#ffe28a':'#e8f5ff';ctx.fillRect(left-17,y,5,28);ctx.fillRect(right+12,y,5,28);
    if(night){ctx.fillStyle='rgba(255,210,90,.16)';ctx.beginPath();ctx.arc(left-14,y+2,24,0,Math.PI*2);ctx.arc(right+15,y+2,24,0,Math.PI*2);ctx.fill()}
  }

  traffic.forEach(o=>drawCar(laneX(o.lane),o.y,o.color,o.type==='truck'?1.3:1,false));
  coins.forEach(drawCoin);powers.forEach(drawPower);
  drawCar(playerX,H*.78,cars[selected].color,1.05,true);
  if(power.shield>0){ctx.save();ctx.strokeStyle='rgba(84,223,255,.8)';ctx.lineWidth=4;ctx.shadowBlur=18;ctx.shadowColor='#54dfff';ctx.beginPath();ctx.arc(playerX,H*.78,53+Math.sin(performance.now()/120)*2,0,Math.PI*2);ctx.stroke();ctx.restore()}
  if(night){ctx.fillStyle='rgba(0,0,15,.16)';ctx.fillRect(0,0,W,H)}
}

function drawCoin(o){
  const x=laneX(o.lane),pulse=1+Math.sin(o.glow)*.08;
  ctx.save();ctx.translate(x,o.y);ctx.rotate(o.spin);ctx.scale(pulse,pulse);
  ctx.shadowBlur=18;ctx.shadowColor='rgba(255,210,55,.48)';ctx.fillStyle='#ffd43b';ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#fff1a0';ctx.fillRect(-3,-9,6,18);ctx.restore()
}
function drawPower(o){
  const icons={shield:'🛡️',magnet:'🧲',nitro:'⚡',slow:'⏳'};const x=laneX(o.lane),y=o.y+Math.sin(o.bob)*3;
  ctx.save();ctx.translate(x,y);ctx.shadowBlur=18;ctx.shadowColor='rgba(110,226,255,.35)';ctx.fillStyle='rgba(255,255,255,.04)';ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.font='29px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icons[o.type],0,1);ctx.restore()
}
function drawCar(x,y,color,s=1,player=false){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,47,31,11,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-27,-48,54,96,14);ctx.fill();
  ctx.fillStyle='rgba(215,242,255,.86)';ctx.beginPath();ctx.roundRect(-18,-28,36,28,8);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.roundRect(-21,-45,42,10,8);ctx.fill();
  ctx.fillStyle=player?'#ffef9a':'#ff4c57';ctx.fillRect(-20,38,10,5);ctx.fillRect(10,38,10,5);
  ctx.fillStyle='#15191e';ctx.fillRect(-32,-26,7,22);ctx.fillRect(25,-26,7,22);ctx.fillRect(-32,20,7,22);ctx.fillRect(25,20,7,22);
  ctx.restore()
}
function hud(){
  const active=Object.entries(power).filter(x=>x[1]>0).map(x=>x[0].toUpperCase()+': '+x[1].toFixed(1)).join(' • ');
  $('powerStatus').style.display=active?'block':'none';$('powerStatus').textContent=active;
  $('score').textContent=score;$('distance').textContent=Math.floor(distance)+'m';
  $('speed').textContent=Math.floor(speed*(power.nitro>0?1.8:1));$('coins').textContent=runCoins+(mode==='time'?' • '+Math.ceil(timeLeft)+'s':'')
}

$('playBtn').onclick=startGame;$('restartBtn').onclick=startGame;
$('garageBtn').onclick=()=>{buildGarage();show('garageScreen')};
document.querySelector('.back').onclick=()=>{updateMenu();show('startScreen')};
$('resumeBtn').onclick=()=>{paused=false;show();$('hud').classList.remove('hidden')};
$('pauseBtn').onclick=()=>{if(!running)return;paused=true;show('pauseScreen')};
document.querySelectorAll('.quit').forEach(b=>b.onclick=()=>{running=false;stopControls();updateMenu();show('startScreen')});
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mode').forEach(x=>x.classList.remove('activeMode'));b.classList.add('activeMode');mode=b.dataset.mode});
$('soundBtn').onclick=()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇'};
$('fullBtn').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()};
$('leftBtn').onclick=()=>move(-1);$('rightBtn').onclick=()=>move(1);
addEventListener('keydown',e=>{if(['ArrowLeft','a','A'].includes(e.key))move(-1);if(['ArrowRight','d','D'].includes(e.key))move(1);if(e.key===' '&&running){paused=!paused;if(paused)show('pauseScreen');else show()}});
let sx=null;
canvas.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});
canvas.addEventListener('touchend',e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>25)move(dx>0?1:-1);sx=null},{passive:true});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')canvas.setPointerCapture?.(e.pointerId)});

updateMenu();show('startScreen');
