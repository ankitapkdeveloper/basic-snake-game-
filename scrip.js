const c=document.getElementById("gameCanvas"),x=c.getContext("2d"),G=20,T=c.width/G;
const $=id=>document.getElementById(id),screens={home:$("homeScreen"),game:$("gameScreen"),settings:$("settingsScreen")};
let snake,food,dir,next,score,loop=null,paused=false,over=false,started=false;
let high=Number(localStorage.snakeHighScore)||0,games=Number(localStorage.snakeGamesPlayed)||0,speed=Number(localStorage.snakeGameSpeed)||120,grid=localStorage.snakeShowGrid!=="false";
$("speedSelect").value=speed;$("gridToggle").checked=grid;
function stats(){$("highScore").textContent=high;$("homeHighScore").textContent=high;$("gamesPlayed").textContent=games}
function show(n){Object.values(screens).forEach(s=>s.classList.remove("active"));screens[n].classList.add("active")}
function rand(){return{x:Math.floor(Math.random()*G),y:Math.floor(Math.random()*G)}}
function makeFood(){let f;do{f=rand()}while(snake.some(p=>p.x===f.x&&p.y===f.y));return f}
function start(){clearInterval(loop);snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];dir={x:1,y:0};next={x:1,y:0};score=0;paused=false;over=false;started=true;food=makeFood();$("score").textContent=0;$("pauseBtn").textContent="Pause";$("gameMessage").textContent="Use swipe, buttons, or arrow keys.";draw();loop=setInterval(update,speed)}
function update(){if(paused||over)return;dir=next;let h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(h.x<0||h.x>=G||h.y<0||h.y>=G||snake.some(p=>p.x===h.x&&p.y===h.y)){end();return}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score+=10;$("score").textContent=score;food=makeFood()}else snake.pop();draw()}
function end(){over=true;clearInterval(loop);games++;localStorage.snakeGamesPlayed=games;let isNew=score>high;if(isNew){high=score;localStorage.snakeHighScore=high}stats();$("finalScore").textContent=score;$("newHighScoreText").classList.toggle("hidden",!isNew);$("gameMessage").textContent="Game Over! Score: "+score;setTimeout(()=>$("gameOverModal").classList.remove("hidden"),250)}
function draw(){x.clearRect(0,0,c.width,c.height);if(grid){x.strokeStyle="#1d2125";for(let i=0;i<=G;i++){let p=i*T;x.beginPath();x.moveTo(p,0);x.lineTo(p,c.height);x.stroke();x.beginPath();x.moveTo(0,p);x.lineTo(c.width,p);x.stroke()}}x.fillStyle="#ef4444";x.beginPath();x.arc(food.x*T+T/2,food.y*T+T/2,T*.34,0,Math.PI*2);x.fill();snake.forEach((p,i)=>{x.fillStyle=i?"#43c463":"#8cff2f";x.fillRect(p.x*T+2,p.y*T+2,T-4,T-4)})}
function move(d){if(!started||over||paused)return;let m={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[d];if(!m||(m.x===-dir.x&&m.y===-dir.y))return;next=m}
function home(){clearInterval(loop);started=false;$("gameOverModal").classList.add("hidden");stats();show("home")}
$("playBtn").onclick=()=>{$("gameOverModal").classList.add("hidden");show("game");start()};$("settingsBtn").onclick=()=>show("settings");$("settingsBackBtn").onclick=()=>show("home");$("backBtn").onclick=home;$("homeBtn").onclick=home;$("restartBtn").onclick=start;$("playAgainBtn").onclick=()=>{$("gameOverModal").classList.add("hidden");start()};
$("pauseBtn").onclick=()=>{if(!started||over)return;paused=!paused;$("pauseBtn").textContent=paused?"Resume":"Pause";$("gameMessage").textContent=paused?"Game Paused":"Game Resumed"};
$("speedSelect").onchange=e=>{speed=Number(e.target.value);localStorage.snakeGameSpeed=speed;if(started&&!over){clearInterval(loop);loop=setInterval(update,speed)}};
$("gridToggle").onchange=e=>{grid=e.target.checked;localStorage.snakeShowGrid=grid;if(started)draw()};
$("resetDataBtn").onclick=()=>{if(confirm("Delete your high score and games played?")){high=0;games=0;delete localStorage.snakeHighScore;delete localStorage.snakeGamesPlayed;stats();alert("Game data reset.")}};
document.addEventListener("keydown",e=>{let k={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"}[e.key];if(k){e.preventDefault();move(k)}if(e.key===" "&&started&&!over){e.preventDefault();$("pauseBtn").click()}});
document.querySelectorAll(".control").forEach(b=>b.onclick=()=>move(b.dataset.direction));
let sx=0,sy=0;c.addEventListener("touchstart",e=>{let t=e.changedTouches[0];sx=t.clientX;sy=t.clientY},{passive:true});c.addEventListener("touchend",e=>{let t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)<20&&Math.abs(dy)<20)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?"right":"left");else move(dy>0?"down":"up")},{passive:true});
stats();show("home");
