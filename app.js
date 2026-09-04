document.addEventListener("DOMContentLoaded", () => {
  const CONFIG = window.SNAKE_CONFIG || {};
  const onlineReady = CONFIG.supabaseUrl && !CONFIG.supabaseUrl.includes("YOUR_") &&
    CONFIG.supabaseKey && !CONFIG.supabaseKey.includes("YOUR_");
  const sb = onlineReady && window.supabase ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey) : null;

  const $ = id => document.getElementById(id);
  const pages = ["home","game","birdy","shop","leaderboard","profile","settings"];
  const skins = [
    {id:"classic",name:"Classic Snake",icon:"🐍",price:0,bg:"#dff0e8",body:"#4bbf76",head:"#86f23b"},
    {id:"fire",name:"Fire Snake",icon:"🔥",price:150,bg:"#ffe9df",body:"#ef784e",head:"#ffb340"},
    {id:"ocean",name:"Ocean Snake",icon:"🌊",price:300,bg:"#e0eff9",body:"#3d96c8",head:"#6dd5fa"},
    {id:"royal",name:"Royal Snake",icon:"👑",price:500,bg:"#eee5fa",body:"#8c63c6",head:"#b796ff"},
    {id:"neon",name:"Neon Snake",icon:"⚡",price:750,bg:"#e5f6ef",body:"#16c985",head:"#b7ff5c"},
    {id:"rainbow",name:"Rainbow Snake",icon:"🌈",price:1000,bg:"#f6e9fa",body:"#db6cd0",head:"#ffdd6d"}
  ];

  let local = JSON.parse(localStorage.getItem("snakeArenaLocal") || "{}");
  local.highScore = Number(local.highScore || 0);
  local.games = Number(local.games || 0);
  local.coins = Number(local.coins ?? 100);
  local.owned = Array.isArray(local.owned) ? local.owned : ["classic"];
  local.skin = local.skin || "classic";
  local.settings = Object.assign({difficulty:"normal",grid:true,sound:true}, local.settings || {});
  local.birdyHighScore = Number(local.birdyHighScore || 0);
  local.birdyGames = Number(local.birdyGames || 0);
  let profile = null, user = null, activeRankGame="snake";
  let snake = [], food = null, bonus = null, dir={x:1,y:0}, next={x:1,y:0}, score=0, timer=null, paused=false, running=false, touchX=0, touchY=0;

  function saveLocal(){ localStorage.setItem("snakeArenaLocal", JSON.stringify(local)); }
  function updateUI(){
    $("homeBest").textContent=local.highScore; $("homeCoins").textContent=local.coins; $("homeGames").textContent=local.games;
    $("gameBest").textContent=local.highScore; $("gameCoins").textContent=local.coins; $("shopCoins").textContent=local.coins;
    $("profileBest").textContent=profile?.high_score ?? local.highScore;
    $("profileCoins").textContent=profile?.coins ?? local.coins;
    $("profileGames").textContent=profile?.games_played ?? local.games;
    $("birdyBest").textContent=local.birdyHighScore; $("birdyCoins").textContent=local.coins;
    const s=skins.find(x=>x.id===local.skin)||skins[0]; $("profileSkin").textContent=s.name; $("activeSkinName").textContent=s.name;
    $("profileLoggedOut").classList.toggle("hidden",!!user); $("profileLoggedIn").classList.toggle("hidden",!user);
    if(user){$("profileUsername").textContent=profile?.username || user.email?.split("@")[0] || "Player";$("profileEmail").textContent=user.email||"";$("profileAvatar").textContent=profile?.avatar_url || "🐍";}
  }
  function navigate(name){
    pages.forEach(p=>{const page=$(p+"Page"); if(page) page.classList.toggle("active",p===name)});
    document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.page===name));
    if(name==="home") updateUI(); if(name==="shop") renderShop(); if(name==="leaderboard") loadLeaderboard(); if(name==="profile") updateUI();
  }
  function showModal(id,show){$(id).classList.toggle("show",show)}

  async function loadSession(){
    if(!sb){updateUI();return;}
    const {data:{session}}=await sb.auth.getSession(); user=session?.user||null;
    if(user) await loadProfile();
    updateUI(); loadLeaderboard();
  }
  async function loadProfile(){
    if(!sb||!user)return;
    const {data,error}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
    if(!error && data){profile=data; local.coins=data.coins; local.highScore=Math.max(local.highScore,data.high_score||0); local.games=Math.max(local.games,data.games_played||0); saveLocal();}
    else if(!data){
      const username=user.user_metadata?.username || user.email?.split("@")[0] || "Player";
      const {data:created}=await sb.from("profiles").insert({id:user.id,username,coins:100,high_score:0,games_played:0,avatar_url:"🐍"}).select().single();
      if(created) profile=created;
    }
  }

  async function saveProfile(){
    const username=$("editUsername").value.trim() || "Player";
    const avatar=$("editAvatar").value.trim() || "🐍";
    if(!sb||!user){$("editStatus").textContent="Login is required for online profile saving.";return;}
    const {data,error}=await sb.from("profiles").update({username,avatar_url:avatar}).eq("id",user.id).select().single();
    if(error){$("editStatus").textContent=error.message;return;}
    profile=data; $("editStatus").textContent="Saved."; updateUI(); setTimeout(()=>showModal("editModal",false),500);
  }

  async function submitScoreOnline(finalScore, earned){
    if(!sb||!user)return;
    // For this prototype, the database function handles score + reward atomically.
    const {error}=await sb.rpc("submit_snake_score",{p_score:finalScore});
    if(error) console.warn(error.message);
    await loadProfile(); updateUI();
  }

  async function loadLeaderboard(){
    const list=$("leaderboardList"); if(!list)return;
    list.innerHTML='<div class="rank-row"><span>…</span><span>Loading…</span><strong>—</strong></div>';
    const tableName=activeRankGame==="birdy"?"birdy_leaderboard":"leaderboard";
    if(!sb){ $("rankNote").textContent="Offline mode: connect Supabase to use global rankings."; list.innerHTML='<div class="rank-row"><span>—</span><span>Connect Supabase for online ranks</span><strong>—</strong></div>'; return; }
    $("rankNote").textContent=user?`Your ${activeRankGame==="birdy"?"Birdy Bird":"Snake"} scores are submitted after each run.`:"Sign in to submit scores to the global leaderboard.";
    const {data,error}=await sb.from(tableName).select("score,username,avatar_url").order("score",{ascending:false}).limit(50);
    if(error){list.innerHTML=`<div class="rank-row"><span>!</span><span>${escapeHtml(error.message.includes("does not exist")?"Run the Birdy Bird SQL migration first.":error.message)}</span><strong>—</strong></div>`;return;}
    if(!data.length){list.innerHTML='<div class="rank-row"><span>—</span><span>No scores yet</span><strong>—</strong></div>';return;}
    list.innerHTML=data.map((r,i)=>`<div class="rank-row"><span>${i<3?["🥇","🥈","🥉"][i]:i+1}</span><span class="rank-player"><span class="rank-avatar">${escapeHtml(r.avatar_url||"🐍")}</span>${escapeHtml(r.username||"Player")}</span><strong class="rank-score">${r.score}</strong></div>`).join("");
  }

  function renderShop(){
    $("shopCoins").textContent=local.coins;
    $("shopGrid").innerHTML=skins.map(s=>{
      const owned=local.owned.includes(s.id), selected=local.skin===s.id;
      return `<div class="shop-item ${selected?"selected":""}"><div class="skin-preview" style="background:${s.bg}">${s.icon}</div><h3>${s.name}</h3><p>${s.price===0?"Free":`🪙 ${s.price} coins`}</p><button data-skin="${s.id}" class="${owned?"owned":"buy"}">${selected?"✓ Equipped":owned?"Equip":`Buy • 🪙 ${s.price}`}</button></div>`;
    }).join("");
    $("shopGrid").querySelectorAll("[data-skin]").forEach(btn=>btn.onclick=()=>handleSkin(btn.dataset.skin));
  }
  function handleSkin(id){
    const s=skins.find(x=>x.id===id); if(!s)return;
    if(local.owned.includes(id)){local.skin=id;saveLocal();renderShop();updateUI();return;}
    if(local.coins<s.price){alert("Not enough coins.");return;}
    local.coins-=s.price; local.owned.push(id); local.skin=id; saveLocal(); renderShop(); updateUI();
  }

  function randomCell(){
    let p; do{p={x:Math.floor(Math.random()*CELLS),y:Math.floor(Math.random()*CELLS)}}while(snake.some(s=>s.x===p.x&&s.y===p.y)||(bonus&&bonus.x===p.x&&bonus.y===p.y)); return p;
  }
  const CELLS=30,SIZE=20,canvas=$("gameCanvas"),ctx=canvas.getContext("2d");
  function draw(){
    ctx.clearRect(0,0,600,600);ctx.fillStyle="#11151b";ctx.fillRect(0,0,600,600);
    if(local.settings.grid){ctx.strokeStyle="rgba(105,130,140,.12)";for(let i=0;i<=600;i+=SIZE){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,600);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(600,i);ctx.stroke();}}
    const skin=skins.find(x=>x.id===local.skin)||skins[0];
    drawFood(food,"#ff4c4c",true); if(bonus) drawFood(bonus,"#ffd34d",true);
    snake.forEach((p,i)=>{ctx.fillStyle=i===0?skin.head:skin.body;ctx.shadowColor=i===0?skin.head:skin.body;ctx.shadowBlur=5;ctx.fillRect(p.x*SIZE+2,p.y*SIZE+2,SIZE-4,SIZE-4);ctx.shadowBlur=0;});
  }
  function drawFood(p,color,glow){ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=glow?14:0;ctx.beginPath();ctx.arc(p.x*SIZE+10,p.y*SIZE+10,6.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  function setDirection(name){
    if(!running||paused)return; const m={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[name]; if(!m)return; if(m.x===-dir.x&&m.y===-dir.y)return; next=m;
  }
  function startGame(){
    showModal("gameOverModal",false); navigate("game"); clearInterval(timer); running=true;paused=false;score=0;dir={x:1,y:0};next={x:1,y:0};snake=[{x:15,y:15},{x:14,y:15},{x:13,y:15},{x:12,y:15}];food=randomCell();bonus=null;$("score").textContent=0;$("pauseBtn").textContent="Pause";$("gameMessage").textContent="Swipe or use the buttons.";draw();
    const speed={easy:150,normal:105,hard:72}[local.settings.difficulty];timer=setInterval(tick,speed);
  }
  function tick(){
    if(!running||paused)return; dir=next; const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
    if(h.x<0||h.y<0||h.x>=CELLS||h.y>=CELLS||snake.some(s=>s.x===h.x&&s.y===h.y)){endGame();return}
    snake.unshift(h);let gained=0;
    if(h.x===food.x&&h.y===food.y){gained=10;food=randomCell();if(Math.random()<0.25)bonus=randomCell();showFloat("+10")}
    if(bonus&&h.x===bonus.x&&h.y===bonus.y){gained=30;bonus=null;showFloat("+30 BONUS")}
    if(gained){score+=gained;$("score").textContent=score;beep(gained===30?720:520)}
    else snake.pop(); draw();
  }
  function showFloat(text){$("comboText").textContent=text; setTimeout(()=>{$("comboText").textContent=""},500)}
  function endGame(){
    clearInterval(timer);running=false;local.games+=1;let earned=Math.floor(score/10);local.coins+=earned;if(score>local.highScore)local.highScore=score;saveLocal();updateUI();
    $("finalScore").textContent=score;$("resultEarned").textContent=`+${earned} 🪙`;
    submitScoreOnline(score,earned);
    showModal("gameOverModal",true);
  }
  function beep(freq){if(!local.settings.sound)return;try{const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.06,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.12);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.13)}catch(e){}}
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

  // Birdy Bird
  const birdyCanvas=$("birdyCanvas"), birdyCtx=birdyCanvas.getContext("2d");
  let birdy={x:155,y:380,vy:0,score:0,pipes:[],running:false,paused:false,started:false,raf:null,last:0,nextPipe:0};
  function resetBirdy(){
    cancelAnimationFrame(birdy.raf); birdy={x:155,y:380,vy:0,score:0,pipes:[],running:true,paused:false,started:false,raf:null,last:0,nextPipe:0};
    $("birdyScore").textContent=0; $("birdyPauseBtn").textContent="Pause"; $("birdyMessage").textContent="Tap the screen to fly."; $("birdyStartHint").style.display="grid"; drawBirdy();
  }
  function startBirdy(){showModal("birdyOverModal",false);navigate("birdy");resetBirdy();}
  function flap(){if(!birdy.running||birdy.paused)return; if(!birdy.started){birdy.started=true;birdy.last=performance.now();$("birdyStartHint").style.display="none";birdy.raf=requestAnimationFrame(birdyLoop);} birdy.vy=-520;beep(650);}
  function birdyLoop(now){if(!birdy.running)return;if(birdy.paused){birdy.raf=requestAnimationFrame(birdyLoop);return;}let dt=Math.min(.033,(now-birdy.last)/1000||0);birdy.last=now;birdy.vy+=1250*dt;birdy.y+=birdy.vy*dt;birdy.nextPipe-=dt;if(birdy.nextPipe<=0){let gap=190+Math.random()*35;let gapY=170+Math.random()*(420-gap);birdy.pipes.push({x:620,w:92,gapY,gap,scored:false});birdy.nextPipe=1.65;}birdy.pipes.forEach(p=>p.x-=190*dt);birdy.pipes=birdy.pipes.filter(p=>p.x+p.w>-10);for(const p of birdy.pipes){if(!p.scored&&p.x+p.w<birdy.x-20){p.scored=true;birdy.score++;$("birdyScore").textContent=birdy.score;showBirdyFloat();beep(760);}if(birdy.x+20>p.x&&birdy.x-20<p.x+p.w&&(birdy.y-18<p.gapY||birdy.y+18>p.gapY+p.gap)){endBirdy();return;}}if(birdy.y<18||birdy.y>742){endBirdy();return;}drawBirdy();birdy.raf=requestAnimationFrame(birdyLoop);}
  function drawBirdy(){let c=birdyCtx;c.clearRect(0,0,600,760);let g=c.createLinearGradient(0,0,0,760);g.addColorStop(0,"#65c4ff");g.addColorStop(1,"#d9f5ff");c.fillStyle=g;c.fillRect(0,0,600,760);c.fillStyle="rgba(255,255,255,.45)";for(let i=0;i<5;i++){c.beginPath();c.arc((i*150+80)%620,100+(i%3)*90,45,0,Math.PI*2);c.fill();}birdy.pipes.forEach(p=>{c.fillStyle="#4caf50";c.fillRect(p.x,0,p.w,p.gapY);c.fillRect(p.x,p.gapY+p.gap,p.w,760-(p.gapY+p.gap));c.fillStyle="#2f8b3c";c.fillRect(p.x-8,p.gapY-20,p.w+16,20);c.fillRect(p.x-8,p.gapY+p.gap,p.w+16,20);});c.fillStyle="#ffd54f";c.beginPath();c.arc(birdy.x,birdy.y,24,0,Math.PI*2);c.fill();c.fillStyle="#ff9f43";c.beginPath();c.moveTo(birdy.x+22,birdy.y);c.lineTo(birdy.x+45,birdy.y+7);c.lineTo(birdy.x+22,birdy.y+14);c.fill();c.fillStyle="#fff";c.beginPath();c.arc(birdy.x+8,birdy.y-7,7,0,Math.PI*2);c.fill();c.fillStyle="#253140";c.beginPath();c.arc(birdy.x+10,birdy.y-7,3,0,Math.PI*2);c.fill();c.fillStyle="#fff";c.font="900 52px system-ui";c.textAlign="center";c.fillText(birdy.score,300,78);}
  function showBirdyFloat(){ $("birdyMessage").textContent=`Great! ${birdy.score} pipe${birdy.score===1?"":"s"} cleared.`; }
  async function submitBirdyScore(score){if(!sb||!user)return;const {error}=await sb.rpc("submit_birdy_score",{p_score:score});if(error)console.warn(error.message);await loadProfile();updateUI();}
  function endBirdy(){if(!birdy.running)return;birdy.running=false;cancelAnimationFrame(birdy.raf);local.birdyGames++;let earned=Math.max(0,birdy.score*5);local.coins+=earned;if(birdy.score>local.birdyHighScore)local.birdyHighScore=birdy.score;saveLocal();updateUI();$("birdyFinalScore").textContent=birdy.score;$("birdyResultEarned").textContent=`+${earned} 🪙`;submitBirdyScore(birdy.score);showModal("birdyOverModal",true);}

  // Navigation
  document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>navigate(btn.dataset.page));
  $("playBtn").onclick=startGame; $("playBirdyBtn").onclick=startBirdy; $("backGameBtn").onclick=()=>{clearInterval(timer);running=false;navigate("home")}; $("backBirdyBtn").onclick=()=>{birdy.running=false;cancelAnimationFrame(birdy.raf);navigate("home")};
  $("pauseBtn").onclick=()=>{if(!running)return;paused=!paused;$("pauseBtn").textContent=paused?"Resume":"Pause";$("gameMessage").textContent=paused?"Game Paused":"Swipe or use the buttons."};
  $("restartBtn").onclick=startGame; $("birdyRestartBtn").onclick=startBirdy; $("birdyPlayAgainBtn").onclick=startBirdy; $("birdyResultHomeBtn").onclick=()=>{showModal("birdyOverModal",false);navigate("home")}; $("birdyPauseBtn").onclick=()=>{if(!birdy.running)return;birdy.paused=!birdy.paused;$("birdyPauseBtn").textContent=birdy.paused?"Resume":"Pause";$("birdyMessage").textContent=birdy.paused?"Flight Paused":"Tap to fly."};$("playAgainBtn").onclick=startGame;$("resultHomeBtn").onclick=()=>{showModal("gameOverModal",false);navigate("home")};
  $("homeSettingsBtn").onclick=()=>navigate("settings");$("refreshRanks").onclick=loadLeaderboard; document.querySelectorAll("[data-rank-game]").forEach(b=>b.onclick=()=>{activeRankGame=b.dataset.rankGame;document.querySelectorAll("[data-rank-game]").forEach(x=>x.classList.toggle("active",x===b));loadLeaderboard();});
  document.querySelectorAll("[data-dir]").forEach(b=>b.onclick=()=>setDirection(b.dataset.dir));
  document.addEventListener("keydown",e=>{const k={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"}[e.key];if(k){e.preventDefault();setDirection(k)}if(e.key===" "){e.preventDefault();$("pauseBtn").click()}});
  canvas.addEventListener("touchstart",e=>{const t=e.changedTouches[0];touchX=t.clientX;touchY=t.clientY},{passive:true});
  canvas.addEventListener("touchend",e=>{const t=e.changedTouches[0],dx=t.clientX-touchX,dy=t.clientY-touchY;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;if(Math.abs(dx)>Math.abs(dy))setDirection(dx>0?"right":"left");else setDirection(dy>0?"down":"up")},{passive:true});
  birdyCanvas.addEventListener("pointerdown",e=>{e.preventDefault();flap();});
  document.addEventListener("keydown",e=>{if(e.code==="Space"&&$("birdyPage").classList.contains("active")){e.preventDefault();flap();}});


  // Auth
  let signupMode=false;
  function setAuthMode(signup){signupMode=signup;$("authTitle").textContent=signup?"Create Account":"Login";$("authSubtitle").textContent=signup?"Start your Snake Arena profile.":"Welcome back to Snake Arena.";$("usernameInput").classList.toggle("hidden",!signup);$("authSubmit").textContent=signup?"Sign Up":"Login";$("switchAuth").textContent=signup?"I already have an account":"Create an account";$("authStatus").textContent=""}
  $("accountBtn").onclick=()=>{navigate("profile"); if(!user)showModal("authModal",true)};
  $("loginOpenBtn").onclick=()=>showModal("authModal",true);$("closeAuth").onclick=()=>showModal("authModal",false);
  $("switchAuth").onclick=()=>setAuthMode(!signupMode);
  $("authForm").onsubmit=async e=>{
    e.preventDefault();$("authStatus").textContent="";
    if(!sb){$("authStatus").textContent="Add your Supabase URL and publishable key in config.js first.";return}
    const email=$("emailInput").value.trim(),password=$("passwordInput").value; let res;
    if(signupMode){const username=$("usernameInput").value.trim()||email.split("@")[0];res=await sb.auth.signUp({email,password,options:{data:{username},emailRedirectTo:location.origin+location.pathname}}); if(!res.error&&res.data.user) $("authStatus").textContent=res.data.session?"Account created.":"Check your email to confirm your account."}
    else res=await sb.auth.signInWithPassword({email,password});
    if(res.error){$("authStatus").textContent=res.error.message;return}
    if(res.data?.session){user=res.data.user;await loadProfile();updateUI();showModal("authModal",false);navigate("profile");loadLeaderboard()}
  };
  $("logoutBtn").onclick=async()=>{if(sb)await sb.auth.signOut();user=null;profile=null;updateUI();navigate("home")};
  $("editProfileBtn").onclick=()=>{ $("editUsername").value=profile?.username||"";$("editAvatar").value=profile?.avatar_url||"🐍";showModal("editModal",true)};
  $("closeEdit").onclick=()=>showModal("editModal",false);$("saveProfileBtn").onclick=saveProfile;

  // Settings
  $("difficulty").value=local.settings.difficulty;$("gridToggle").checked=local.settings.grid;$("soundToggle").checked=local.settings.sound;
  $("difficulty").onchange=e=>{local.settings.difficulty=e.target.value;saveLocal()};$("gridToggle").onchange=e=>{local.settings.grid=e.target.checked;saveLocal();draw()};$("soundToggle").onchange=e=>{local.settings.sound=e.target.checked;saveLocal()};
  $("resetLocalBtn").onclick=()=>{if(confirm("Reset local high score, coins, skins and settings?")){localStorage.removeItem("snakeArenaLocal");location.reload()}};
  if(sb)sb.auth.onAuthStateChange((_event,session)=>{user=session?.user||null; if(user)loadProfile().then(updateUI); else {profile=null;updateUI();}});
  setAuthMode(false); updateUI(); loadSession();
});