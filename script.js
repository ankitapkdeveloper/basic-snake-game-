(() => {
const $=id=>document.getElementById(id);
const screens=['screen','modeScreen','pauseScreen','gameOverScreen','leaderboardScreen'];
const gameArea=$('gameArea'), hud=$('hud');
let state={running:false,paused:false,mode:'classic',score:0,hits:0,misses:0,combo:0,bestCombo:0,time:60,lives:3,spawnTimer:0,last:0,targets:new Map(),sound:true,raf:0};
let audioCtx=null, toastTimer=0, comboTimer=0;
function show(id){screens.forEach(x=>$(x).classList.remove('active'));$(id).classList.add('active')}
function hideScreens(){screens.forEach(x=>$(x).classList.remove('active'))}
function beep(freq=600,d=.06,type='sine'){if(!state.sound)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.065,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d)}catch(e){}}
function toast(msg){let t=$('toast');clearTimeout(toastTimer);t.textContent=msg;t.classList.add('show');toastTimer=setTimeout(()=>t.classList.remove('show'),1100)}
function comboFlash(){if(state.combo<5||state.combo%5)return;let el=$('comboFlash');clearTimeout(comboTimer);el.textContent=`${state.combo} HIT COMBO!`;el.classList.add('show');comboTimer=setTimeout(()=>el.classList.remove('show'),650)}
function multiplier(){return 1+Math.min(4,Math.floor(state.combo/5))}
function accuracy(){let n=state.hits+state.misses;return n?Math.round(state.hits/n*100):100}
function updateHUD(){ $('score').textContent=state.score;$('accuracy').textContent=accuracy()+'%';$('combo').textContent='x'+state.combo;$('time').textContent=state.mode==='survival'?'♥ '+state.lives:Math.max(0,Math.ceil(state.time));$('timeLabel').textContent=state.mode==='survival'?'Lives':'Time'}
function clearTargets(){state.targets.forEach(t=>t.el.remove());state.targets.clear()}
function targetSpec(){
 const elapsed=state.mode==='survival'?state.score/45:(state.mode==='time'?45:60)-state.time;
 const r=Math.random();let type='normal';if(r<.09)type='bomb';else if(r<.19)type='gold';else if(r<.30)type='moving';else if(r<.43)type='small';else if(r<.52)type='bonus';
 let size=type==='small'?42:type==='bomb'?64:74;if(elapsed>22&&Math.random()<.28)size=Math.max(36,size-10);
 return {type,size,life:Math.max(620,1750-elapsed*24),points:type==='gold'?150:type==='small'?120:type==='moving'?110:type==='bonus'?90:60};
}
function hudHeight(){return hud.classList.contains('hidden')?0:hud.getBoundingClientRect().height}
function overlapsExisting(x,y,size){
 for(const o of state.targets.values()){
  const min=(size+o.size)/2+14;const dx=(x+size/2)-(o.x+o.size/2);const dy=(y+size/2)-(o.y+o.size/2);
  if(dx*dx+dy*dy<min*min)return true;
 }return false;
}
function findSpawn(size){
 const w=gameArea.clientWidth,h=gameArea.clientHeight,top=hudHeight()+10,edge=10;
 if(w<size+edge*2||h-top<size+edge*2)return null;
 for(let i=0;i<45;i++){
  const x=edge+Math.random()*(w-size-edge*2);const y=top+Math.random()*Math.max(1,h-top-size-edge-8);
  if(!overlapsExisting(x,y,size))return {x,y};
 }
 return null;
}
function spawn(){
 if(!state.running||state.paused)return;
 const s=targetSpec(),pos=findSpawn(s.size);if(!pos)return;
 const el=document.createElement('div');el.className='target '+s.type;if(s.type==='moving')el.classList.add('moving');el.style.width=el.style.height=s.size+'px';el.innerHTML=s.type==='bomb'?'':'<span class="ring"></span>';el.style.left=pos.x+'px';el.style.top=pos.y+'px';gameArea.appendChild(el);
 const obj={el,type:s.type,points:s.points,born:performance.now(),life:s.life,x:pos.x,y:pos.y,size:s.size,dir:Math.random()>.5?1:-1,speed:65+Math.random()*80};state.targets.set(el,obj);
 const hit=e=>{e.preventDefault();e.stopPropagation();if(!state.targets.has(el)||!state.running||state.paused)return;hitTarget(obj)};el.addEventListener('pointerdown',hit,{passive:false});
}
function particles(x,y,color='#ffe66d',label=''){for(let i=0;i<13;i++){let p=document.createElement('i');p.className='particle';p.style.left=x+'px';p.style.top=y+'px';p.style.background=color;p.style.setProperty('--x',(Math.random()*110-55)+'px');p.style.setProperty('--y',(Math.random()*110-55)+'px');gameArea.appendChild(p);setTimeout(()=>p.remove(),700)}if(label){let p=document.createElement('b');p.className='particleText';p.style.left=(x-24)+'px';p.style.top=(y-12)+'px';p.style.color=color;p.textContent=label;gameArea.appendChild(p);setTimeout(()=>p.remove(),800)}}
function removeTarget(obj){if(state.targets.has(obj.el)){state.targets.delete(obj.el);obj.el.remove()}}
function hitTarget(o){
 const rect=o.el.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 if(o.type==='bomb'){beep(120,.18,'sawtooth');removeTarget(o);state.misses+=2;state.combo=0;particles(x,y,'#ff3f5f','BOMB!');if(state.mode==='survival'){state.lives--;if(state.lives<=0){endGame();return}}toast('Bomb hit! Combo lost');updateHUD();return}
 state.hits++;state.combo++;state.bestCombo=Math.max(state.bestCombo,state.combo);const gain=o.points*multiplier();state.score+=gain;if(o.type==='bonus'&&state.mode!=='survival'){state.time+=5;toast('+5 SECONDS')}
 comboFlash();beep(o.type==='gold'?920:o.type==='bonus'?820:650,.06,'triangle');particles(x,y,o.type==='gold'?'#ffd34f':o.type==='bonus'?'#3fffe8':'#74a4ff','+'+gain);removeTarget(o);updateHUD();
}
function miss(o){if(!state.targets.has(o.el))return;removeTarget(o);state.misses++;state.combo=0;if(state.mode==='survival'){state.lives--;if(state.lives<=0){endGame();return}}updateHUD()}
function start(mode){
 clearTargets();state={...state,running:true,paused:false,mode,score:0,hits:0,misses:0,combo:0,bestCombo:0,time:mode==='time'?45:60,lives:3,spawnTimer:0,last:performance.now(),targets:new Map()};hideScreens();hud.classList.remove('hidden');updateHUD();cancelAnimationFrame(state.raf);state.raf=requestAnimationFrame(loop);
}
function loop(now){
 if(!state.running)return;const dt=Math.min(.05,(now-state.last)/1000);state.last=now;
 if(!state.paused){
  if(state.mode!=='survival'){state.time-=dt;if(state.time<=0){state.time=0;updateHUD();endGame();return}}
  state.targets.forEach(o=>{if(!state.targets.has(o.el))return;if(now-o.born>o.life){miss(o);return}if(o.type==='moving'){o.x+=o.dir*o.speed*dt;const max=gameArea.clientWidth-o.size-8;if(o.x<8||o.x>max)o.dir*=-1;o.x=Math.max(8,Math.min(max,o.x));o.el.style.left=o.x+'px'}});
  const elapsed=state.mode==='survival'?state.score/45:((state.mode==='time'?45:60)-state.time);const difficulty=1+elapsed/16;const interval=Math.max(340,900/difficulty);state.spawnTimer+=dt*1000;
  if(state.spawnTimer>=interval){state.spawnTimer=0;spawn();if(state.targets.size<3&&Math.random()<Math.min(.22,difficulty*.035))spawn()}updateHUD();
 }
 state.raf=requestAnimationFrame(loop);
}
function endGame(){if(!state.running)return;state.running=false;try{window.parent!==window&&window.parent.postMessage({type:'snake-arena-game-finished',game:'target',score:state.score},window.location.origin)}catch(e){};cancelAnimationFrame(state.raf);clearTargets();hud.classList.add('hidden');let hs=JSON.parse(localStorage.getItem('targetRushScores')||'[]');hs.push({score:state.score,mode:state.mode,date:new Date().toLocaleDateString()});hs.sort((a,b)=>b.score-a.score);hs=hs.slice(0,10);localStorage.setItem('targetRushScores',JSON.stringify(hs));$('finalScore').textContent=state.score;$('finalStats').textContent=`${state.mode.toUpperCase()} • Accuracy ${accuracy()}% • Best Combo x${state.bestCombo} • Hits ${state.hits}`;show('gameOverScreen');beep(180,.2,'square')}
function togglePause(){if(!state.running)return;state.paused=!state.paused;if(state.paused)show('pauseScreen');else{hideScreens();state.last=performance.now()}}
function leaderboard(){let hs=JSON.parse(localStorage.getItem('targetRushScores')||'[]');$('highScoreList').innerHTML=hs.length?hs.map(s=>`<li><b>${s.score}</b><small>${s.mode.toUpperCase()} • ${s.date}</small></li>`).join(''):'<li style="display:block;text-align:center">No scores yet. Play your first round!</li>';show('leaderboardScreen')}
$('playBtn').onclick=()=>show('modeScreen');document.querySelectorAll('.modeCard').forEach(b=>b.onclick=()=>start(b.dataset.mode));document.querySelectorAll('.backBtn').forEach(b=>b.onclick=()=>show('screen'));$('leaderboardBtn').onclick=leaderboard;$('closeLeaderboardBtn').onclick=()=>show('screen');$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('quitBtn').onclick=()=>{state.running=false;cancelAnimationFrame(state.raf);clearTargets();hud.classList.add('hidden');show('screen')};$('restartBtn').onclick=()=>start(state.mode);$('menuBtn').onclick=()=>show('screen');$('soundBtn').onclick=()=>{state.sound=!state.sound;$('soundBtn').textContent=state.sound?'♪':'×'};
$('fullscreenBtn').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch(e){toast('Fullscreen unavailable')}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='p'||e.key==='P')togglePause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running&&!state.paused)togglePause()});document.addEventListener('touchmove',e=>{if(state.running)e.preventDefault()},{passive:false});window.addEventListener('resize',()=>{if(state.running)state.targets.forEach(o=>{o.x=Math.min(o.x,gameArea.clientWidth-o.size-8);o.y=Math.min(o.y,gameArea.clientHeight-o.size-8);o.el.style.left=o.x+'px';o.el.style.top=o.y+'px'})});show('screen');
})();
