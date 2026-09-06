(() => {
const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let W,H,DPR=1, running=false, paused=false, selectedLevel=0, score=0, lives=3;
let highScore=+localStorage.getItem('brickBlastHighScore')||0;
let paddle, balls=[], bricks=[], particles=[], drops=[], keys={}, laserShots=[];
let last=0, lastShot=0, unlocked=+localStorage.getItem('brickBlastUnlocked')||1;
let power={name:'',time:0}, levelStartTime=0, scoreSubmitted=false;

const levels=[
 {rows:["1111111111","1111111111","0111111110","0011111100"],speed:1.00},
 {rows:["0011111100","0111111110","1112222111","0111111110","0011111100"],speed:1.08},
 {rows:["1110011111","1221111221","1122222211","1221111221","1110011111"],speed:1.16},
 {rows:["1111111111","2002220022","1221111221","2221111222","1111111111"],speed:1.24},
 {rows:["3001110033","1332223311","1123332111","1332223311","3001110033"],speed:1.32},
 {rows:["1113331111","1223333221","1232223221","1223333221","1113331111"],speed:1.40},
 {rows:["3003003003","0330330330","2222222222","0330330330","3003003003"],speed:1.48},
 {rows:["3332223333","3122222213","3223333223","3122222213","3332223333"],speed:1.56},
 {rows:["3232323232","2323232323","3232323232","2323232323","3232323232"],speed:1.64},
 {rows:["3333333333","3222222223","3211111123","3222222223","3333333333"],speed:1.75}
];

function resize(){
 DPR=Math.min(devicePixelRatio||1,2); W=canvas.clientWidth; H=canvas.clientHeight;
 canvas.width=W*DPR; canvas.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener('resize',resize); resize();

function resetPaddle(){paddle={x:W/2,y:H-72,w:Math.min(W*.27,150),h:14,baseW:Math.min(W*.27,150)}}
function ball(x,y,vx,vy){return{x,y,vx,vy,r:7,trail:[]}}
function resetBall(){
 balls=[ball(W/2,H-100, (Math.random()>.5?1:-1)*4.2*levels[selectedLevel].speed,-5.5*levels[selectedLevel].speed)];
}
function buildLevel(){
 bricks=[]; const L=levels[selectedLevel], gap=4, margin=12, bw=(W-margin*2-gap*9)/10, bh=Math.max(20,Math.min(28,H*.035));
 L.rows.forEach((row,r)=>[...row].forEach((c,col)=>{
   if(c!=='0') bricks.push({x:margin+col*(bw+gap),y:105+r*(bh+gap),w:bw,h:bh,hp:+c,maxHp:+c,color:+c===1?'#37d9ff':+c===2?'#b56cff':'#ff4e9a'});
 }));
}
function newGame(level=0){
 selectedLevel=level; score=0; lives=3; startLevel();
}
function startLevel(){scoreSubmitted=false;
 resetPaddle(); resetBall(); buildLevel(); particles=[]; drops=[]; laserShots=[]; power={name:'',time:0}; levelStartTime=performance.now();
 running=true; paused=false; hidePanels(); $('hud').classList.remove('hidden'); $('topControls').classList.remove('hidden'); $('hint').classList.remove('hidden'); updateHUD();
 setTimeout(()=>$('hint').classList.add('hidden'),2800);
}
function updateHUD(){
 $('score').textContent=score; $('level').textContent=selectedLevel+1; $('lives').textContent=lives; $('highScore').textContent=highScore;
}
function saveScore(){if(score>highScore){highScore=score;localStorage.setItem('brickBlastHighScore',highScore)} updateHUD()}
function hidePanels(){document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden')); $('overlay').style.pointerEvents='none'}
function show(id){$('overlay').style.pointerEvents='auto'; $(id).classList.remove('hidden')}
function menu(){
 running=false; paused=false; $('hud').classList.add('hidden'); $('topControls').classList.add('hidden'); $('powerBar').classList.add('hidden'); $('hint').classList.add('hidden');
 document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden')); $('overlay').style.pointerEvents='auto'; $('startScreen').classList.remove('hidden');
}
function levelSelect(){
 document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden')); $('levelScreen').classList.remove('hidden'); $('overlay').style.pointerEvents='auto';
 const grid=$('levelGrid'); grid.innerHTML='';
 for(let i=0;i<10;i++){const b=document.createElement('button');b.className='levelChoice '+(i>=unlocked?'locked':'')+(i===selectedLevel?' current':'');b.textContent=i+1;b.disabled=i>=unlocked;b.onclick=()=>newGame(i);grid.appendChild(b)}
}
function pause(){if(!running)return;paused=!paused;if(paused){show('pauseScreen')}else hidePanels()}
function restart(){startLevel()}

function spawnParticles(x,y,color,n=10){
 for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,s=1+Math.random()*4;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color,size:2+Math.random()*3})}
}
function powerDrop(b){
 if(Math.random()>.28)return;
 const types=['MULTI BALL','WIDE PADDLE','SMALL PADDLE','SLOW BALL','FAST BALL','LASER','EXTRA LIFE'];
 drops.push({x:b.x+b.w/2,y:b.y+b.h/2,vy:1.8,type:types[Math.floor(Math.random()*types.length)],r:11});
}
function activate(type){
 power={name:type,time:type==='EXTRA LIFE'?0:9000};
 if(type==='MULTI BALL'){balls.forEach(b=>{balls.push(ball(b.x,b.y,b.vx+2,b.vy));balls.push(ball(b.x,b.y,b.vx-2,b.vy))})}
 if(type==='WIDE PADDLE')paddle.w=Math.min(paddle.baseW*1.55,W*.55);
 if(type==='SMALL PADDLE')paddle.w=paddle.baseW*.62;
 if(type==='SLOW BALL')balls.forEach(b=>{b.vx*=.72;b.vy*=.72});
 if(type==='FAST BALL')balls.forEach(b=>{b.vx*=1.38;b.vy*=1.38});
 if(type==='EXTRA LIFE')lives=Math.min(9,lives+1);
 updateHUD(); showPower();
}
function endPower(){
 if(power.name==='WIDE PADDLE'||power.name==='SMALL PADDLE')paddle.w=paddle.baseW;
 if(power.name==='SLOW BALL'||power.name==='FAST BALL'){
   balls.forEach(b=>{let sp=Math.hypot(b.vx,b.vy), target=6*levels[selectedLevel].speed;b.vx=b.vx/sp*target;b.vy=b.vy/sp*target})
 }
 power={name:'',time:0};$('powerBar').classList.add('hidden');
}
function showPower(){if(!power.name||power.name==='EXTRA LIFE'){$('powerBar').classList.add('hidden');return}$('powerBar').textContent=power.name+(power.time?' • ACTIVE':'');$('powerBar').classList.remove('hidden')}

function brickHit(b){
 b.hp--; score+=10; saveScore(); spawnParticles(b.x+b.w/2,b.y+b.h/2,b.color,14);
 if(b.hp<=0){powerDrop(b);bricks.splice(bricks.indexOf(b),1);score+=40;saveScore()}
}
function circleRectCollision(b,r){
 const nx=Math.max(r.x,Math.min(b.x+b.w,r.x)),ny=Math.max(r.y,Math.min(b.y+b.h,r.y));
 return (r.x-nx)**2+(r.y-ny)**2<r.r*r.r;
}
function update(dt){
 if(!running||paused)return;
 const now=performance.now();
 if(power.time){power.time-=dt;if(power.time<=0)endPower();else showPower()}
 paddle.x=Math.max(paddle.w/2+4,Math.min(W-paddle.w/2-4,paddle.x));

 drops.forEach((d,i)=>{d.y+=d.vy*dt/16;if(d.y>H+30)drops.splice(i,1);else if(d.y+d.r>paddle.y-paddle.h/2&&d.y-d.r<paddle.y+paddle.h/2&&d.x>paddle.x-paddle.w/2&&d.x<paddle.x+paddle.w/2){activate(d.type);drops.splice(i,1)}});

 if(power.name==='LASER'&&now-lastShot>420){laserShots.push({x:paddle.x-paddle.w*.27,y:paddle.y-10},{x:paddle.x+paddle.w*.27,y:paddle.y-10});lastShot=now}
 laserShots.forEach((s,i)=>{s.y-=9*dt/16;if(s.y<80)laserShots.splice(i,1);else bricks.slice().forEach(b=>{if(s.x>b.x&&s.x<b.x+b.w&&s.y>b.y&&s.y<b.y+b.h){brickHit(b);laserShots.splice(i,1)}})});

 balls.forEach((b,bi)=>{
   const step=dt/16;
   b.trail.push({x:b.x,y:b.y});if(b.trail.length>7)b.trail.shift();
   b.x+=b.vx*step;b.y+=b.vy*step;
   if(b.x-b.r<0){b.x=b.r;b.vx=Math.abs(b.vx)}
   if(b.x+b.r>W){b.x=W-b.r;b.vx=-Math.abs(b.vx)}
   if(b.y-b.r<75){b.y=75+b.r;b.vy=Math.abs(b.vy)}
   if(b.vy>0&&b.y+b.r>=paddle.y-paddle.h/2&&b.y-b.r<=paddle.y+paddle.h/2&&b.x>paddle.x-paddle.w/2-b.r&&b.x<paddle.x+paddle.w/2+b.r){
      b.y=paddle.y-paddle.h/2-b.r;let rel=(b.x-paddle.x)/(paddle.w/2);let speed=Math.max(5.4,Math.hypot(b.vx,b.vy));b.vx=rel*speed*.9;b.vy=-Math.sqrt(Math.max(8,speed*speed-b.vx*b.vx));spawnParticles(b.x,b.y,'#78f7ff',5);
   }
   for(const br of bricks.slice()){
     if(circleRectCollision(br,b)){
       const cx=br.x+br.w/2,cy=br.y+br.h/2;
       const dx=(b.x-cx)/(br.w/2),dy=(b.y-cy)/(br.h/2);
       if(Math.abs(dx)>Math.abs(dy))b.vx*=-1;else b.vy*=-1;
       brickHit(br);break;
     }
   }
   if(b.y-b.r>H){balls.splice(bi,1)}
 });
 if(!balls.length){lives--;updateHUD();if(lives<=0){gameOver()}else{resetPaddle();resetBall()}}
 particles.forEach((p,i)=>{p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.vy+=.08*dt/16;p.life-=.025*dt/16;if(p.life<=0)particles.splice(i,1)});
 if(!bricks.length)completeLevel();
}
function notifyArenaScore(){if(scoreSubmitted)return;scoreSubmitted=true;try{window.parent!==window&&window.parent.postMessage({type:'snake-arena-game-finished',game:'brick',score:score},window.location.origin)}catch(e){}}
function gameOver(){notifyArenaScore();running=false;saveScore();$('finalScore').textContent=`Final Score: ${score}`;show('gameOverScreen')}
function completeLevel(){
 notifyArenaScore();running=false;saveScore();unlocked=Math.max(unlocked,Math.min(10,selectedLevel+2));localStorage.setItem('brickBlastUnlocked',unlocked);
 if(selectedLevel===9){$('winScore').textContent=`Final Score: ${score}`;show('winScreen')}else{$('completeScore').textContent=`Score: ${score}  •  Level ${selectedLevel+1} cleared`;show('completeScreen')}
}
function draw(){
 ctx.clearRect(0,0,W,H);
 // background stars/grid
 ctx.fillStyle='#06091a';ctx.fillRect(0,0,W,H);
 for(let i=0;i<35;i++){let x=(i*83)%W,y=(i*137)%H;ctx.fillStyle='rgba(80,150,255,.10)';ctx.fillRect(x,y,1,1)}
 ctx.strokeStyle='rgba(45,92,160,.08)';ctx.lineWidth=1;for(let y=95;y<H;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 bricks.forEach(b=>{
   const glow=b.hp===1?'#37d9ff':b.hp===2?'#b56cff':'#ff4e9a';
   ctx.shadowBlur=14;ctx.shadowColor=glow;ctx.fillStyle=b.color;roundRect(b.x,b.y,b.w,b.h,5);ctx.fill();
   ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.25)';roundRect(b.x+2,b.y+2,b.w-4,Math.max(3,b.h*.18),3);ctx.fill();
   if(b.maxHp>1){ctx.fillStyle='#fff';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.hp,b.x+b.w/2,b.y+b.h/2)}
 });
 drops.forEach(d=>{ctx.shadowBlur=16;ctx.shadowColor='#fff25b';ctx.fillStyle='#ffe94f';ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#151524';ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.type[0],d.x,d.y)});
 laserShots.forEach(s=>{ctx.strokeStyle='#ff5edc';ctx.shadowColor='#ff4fd0';ctx.shadowBlur=12;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x,s.y+12);ctx.stroke();ctx.shadowBlur=0});
 particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)});ctx.globalAlpha=1;
 // paddle
 ctx.shadowBlur=18;ctx.shadowColor=power.name==='LASER'?'#ff52d6':'#41e8ff';ctx.fillStyle=power.name==='LASER'?'#ff59d8':'#4ce9ff';roundRect(paddle.x-paddle.w/2,paddle.y-paddle.h/2,paddle.w,paddle.h,7);ctx.fill();ctx.shadowBlur=0;
 balls.forEach(b=>{b.trail.forEach((t,i)=>{ctx.globalAlpha=(i+1)/b.trail.length*.18;ctx.fillStyle='#7dfaff';ctx.beginPath();ctx.arc(t.x,t.y,b.r*(i+1)/b.trail.length,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;ctx.shadowBlur=22;ctx.shadowColor='#74f7ff';ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0});
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function loop(t){let dt=Math.min(32,t-last||16);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);

function setPaddle(clientX){const rect=canvas.getBoundingClientRect();paddle.x=(clientX-rect.left)/rect.width*W}
canvas.addEventListener('pointerdown',e=>{if(running&&!paused){canvas.setPointerCapture?.(e.pointerId);setPaddle(e.clientX);e.preventDefault()}});
canvas.addEventListener('pointermove',e=>{if(running&&!paused){setPaddle(e.clientX);e.preventDefault()}},{passive:false});
canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
addEventListener('keydown',e=>{if(!running)return;if(e.key==='ArrowLeft'){paddle.x-=42;e.preventDefault()}if(e.key==='ArrowRight'){paddle.x+=42;e.preventDefault()}if(e.key===' '){pause();e.preventDefault()}});
$('startBtn').onclick=()=>newGame(0);$('levelsBtn').onclick=levelSelect;
document.querySelectorAll('.backBtn').forEach(b=>b.onclick=menu);document.querySelectorAll('.menuBtn').forEach(b=>b.onclick=menu);
$('pauseBtn').onclick=pause;$('resumeBtn').onclick=pause;$('restartBtn').onclick=restart;$('playAgainBtn').onclick=()=>newGame(0);$('nextBtn').onclick=()=>{score=score;selectedLevel++;startLevel()};
$('fullBtn').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch(e){}};
$('soundBtn').onclick=()=>{$('soundBtn').textContent=$('soundBtn').textContent==='♪'?'×':'♪'};
menu();
})();
