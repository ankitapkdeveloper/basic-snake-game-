const $=id=>document.getElementById(id);
const screens={home:$("homeScreen"),game:$("gameScreen"),settings:$("settingsScreen")};
const canvas=$("gameCanvas"),ctx=canvas.getContext("2d");
const SIZE=20,CELLS=30;
let snake,food,specialFood,dir,nextDir,score,loop,paused,running,lastEatTime=0;

const data=JSON.parse(localStorage.getItem("snakePhase2")||"{}");
let settings={highScore:data.highScore||0,games:data.games||0,difficulty:data.difficulty||"normal",grid:data.grid!==false,sound:data.sound!==false};

function save(){localStorage.setItem("snakePhase2",JSON.stringify(settings))}
function show(name){Object.values(screens).forEach(x=>x.classList.remove("active"));screens[name].classList.add("active")}
function updateHome(){$("homeHighScore").textContent=settings.highScore;$("gamesPlayed").textContent=settings.games}
function updateGameStats(){$("score").textContent=score;$("highScore").textContent=settings.highScore}

function resetGame(){
 clearInterval(loop); score=0; paused=false; running=true; dir={x:1,y:0};nextDir={x:1,y:0};
 snake=[{x:14,y:15},{x:13,y:15},{x:12,y:15},{x:11,y:15}];
 food=randomCell(); specialFood=null; lastEatTime=Date.now();
 $("pauseBtn").textContent="Pause";$("gameMessage").textContent="Use swipe, buttons, or arrow keys.";
 updateGameStats(); draw();
 const speeds={easy:150,normal:105,hard:72};loop=setInterval(tick,speeds[settings.difficulty]);
}
function randomCell(){
 let p;do{p={x:Math.floor(Math.random()*CELLS),y:Math.floor(Math.random()*CELLS)}}while(snake&&snake.some(s=>s.x===p.x&&s.y===p.y));
 return p;
}
function tick(){
 if(!running||paused)return;
 dir=nextDir;const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
 if(head.x<0||head.y<0||head.x>=CELLS||head.y>=CELLS||snake.some(s=>s.x===head.x&&s.y===head.y)){gameOver();return}
 snake.unshift(head);
 let ate=false,points=0;
 if(head.x===food.x&&head.y===food.y){points=10;food=randomCell();ate=true}
 if(specialFood&&head.x===specialFood.x&&head.y===specialFood.y){points=30;specialFood=null;ate=true}
 if(ate){score+=points;if(score>settings.highScore){settings.highScore=score;save()}playSound(points===30?720:520);lastEatTime=Date.now();if(Math.random()<.22&&!specialFood)specialFood=randomCell();updateGameStats()}
 else snake.pop();
 draw();
}
function draw(){
 ctx.clearRect(0,0,600,600);ctx.fillStyle="#111318";ctx.fillRect(0,0,600,600);
 if(settings.grid){ctx.strokeStyle="rgba(100,130,140,.12)";ctx.lineWidth=1;for(let i=0;i<=600;i+=SIZE){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,600);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(600,i);ctx.stroke()}}
 drawCell(food,"#ff4c4c",true);if(specialFood)drawCell(specialFood,"#ffd34d",true);
 snake.forEach((s,i)=>drawCell(s,i===0?"#86f23b":"#4fbe75",false));
}
function drawCell(p,color,round){ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=round?14:4;ctx.fillRect(p.x*SIZE+2,p.y*SIZE+2,SIZE-4,SIZE-4);ctx.shadowBlur=0}
function changeDirection(d){
 if(!running||paused)return;
 const map={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}},n=map[d];
 if(n.x===-dir.x&&n.y===-dir.y)return;nextDir=n;
}
function gameOver(){clearInterval(loop);running=false;playSound(160);settings.games++;save();updateHome();$("finalScore").textContent=score;$("gameOverModal").classList.add("show")}
function playSound(freq){if(!settings.sound)return;try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.08,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.12);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.13)}catch(e){}}
function pause(){if(!running)return;paused=!paused;$("pauseBtn").textContent=paused?"Resume":"Pause";$("gameMessage").textContent=paused?"Game Paused":"Use swipe, buttons, or arrow keys."}

$("playBtn").onclick=()=>{show("game");resetGame()};
$("settingsBtn").onclick=()=>show("settings");
$("backBtn").onclick=()=>{clearInterval(loop);running=false;show("home");updateHome()};
$("settingsBackBtn").onclick=()=>{show("home");updateHome()};
$("pauseBtn").onclick=pause;$("restartBtn").onclick=resetGame;
$("playAgainBtn").onclick=()=>{$("gameOverModal").classList.remove("show");resetGame()};
$("homeBtn").onclick=()=>{$("gameOverModal").classList.remove("show");show("home");updateHome()};
document.querySelectorAll("[data-dir]").forEach(b=>b.onclick=()=>changeDirection(b.dataset.dir));
$("difficulty").value=settings.difficulty;$("gridToggle").checked=settings.grid;$("soundToggle").checked=settings.sound;
$("difficulty").onchange=e=>{settings.difficulty=e.target.value;save()};
$("gridToggle").onchange=e=>{settings.grid=e.target.checked;save()};
$("soundToggle").onchange=e=>{settings.sound=e.target.checked;save()};
$("resetBtn").onclick=()=>{if(confirm("Reset all game data?")){settings={highScore:0,games:0,difficulty:"normal",grid:true,sound:true};save();location.reload()}};
document.addEventListener("keydown",e=>{const k={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"}[e.key];if(k){e.preventDefault();changeDirection(k)}if(e.key===" "){e.preventDefault();pause()}});
let sx,sy;canvas.addEventListener("touchstart",e=>{const t=e.changedTouches[0];sx=t.clientX;sy=t.clientY},{passive:true});
canvas.addEventListener("touchend",e=>{const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;if(Math.abs(dx)>Math.abs(dy))changeDirection(dx>0?"right":"left");else changeDirection(dy>0?"down":"up")},{passive:true});
updateHome();
