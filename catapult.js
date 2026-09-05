const canvas=document.getElementById('cat_game'),ctx=canvas.getContext('2d');
const W=960,H=640,G=590,GRAV=640,MAX_LEVEL=40,ORIGIN={x:145,y:500};
const cat$=id=>document.getElementById('cat_'+id);
const ui={level:cat$('level'),score:cat$('score'),shots:cat$('shots'),best:cat$('best'),status:cat$('status'),targetInfo:cat$('targetInfo'),hint:cat$('hint'),toast:cat$('toast'),powerBar:cat$('powerBar'),pause:cat$('pauseBtn'),result:cat$('result'),resultTitle:cat$('resultTitle'),resultScore:cat$('resultScore'),resultShots:cat$('resultShots'),resultBonus:cat$('resultBonus'),trajectoryState:cat$('trajectoryState'),next:cat$('nextBtn')};
const ammoTypes={
 stone:{name:'Stone',icon:'🪨',damage:2,power:1,r:15,color:'#777b82',desc:'Balanced'},
 iron:{name:'Iron',icon:'⚙️',damage:5,power:1.13,r:17,color:'#576474',desc:'Heavy hit'},
 bomb:{name:'Bomb',icon:'💣',damage:3,power:.98,r:17,color:'#252a31',desc:'Area blast'},
 fire:{name:'Fire',icon:'🔥',damage:3,power:1.05,r:15,color:'#ef663e',desc:'Burn wood'},
 bounce:{name:'Bouncy',icon:'🟣',damage:2,power:1.07,r:14,color:'#a56ee0',desc:'Ricochet'}
};
const materials={
 wood:{hp:2,score:35,color:'#a86c48',stroke:'#613c2b',name:'Wood'},brick:{hp:4,score:55,color:'#9d5750',stroke:'#5f302e',name:'Brick'},
 stone:{hp:7,score:80,color:'#737b84',stroke:'#434950',name:'Stone'},metal:{hp:10,score:115,color:'#5e6d7a',stroke:'#273742',name:'Iron'},
 ice:{hp:3,score:60,color:'#83d9ed',stroke:'#4c8da6',name:'Ice'}
};
const targetKinds={
 guard:{icon:'🛡️',points:180,hp:2,label:'Guard',color:'#f6d35c'},archer:{icon:'🏹',points:220,hp:1,label:'Archer',color:'#8fe0ff'},
 barrel:{icon:'🛢️',points:280,hp:2,label:'Powder',color:'#b87845'},crystal:{icon:'💎',points:350,hp:1,label:'Crystal',color:'#92f0ff'},
 king:{icon:'👑',points:600,hp:3,label:'King',color:'#ffd761'}
};
let catGame={level:1,score:0,best:Number(window.CatapultIntegrationBest||localStorage.getItem('catapultKingBestV4')||localStorage.getItem('catapultKingBestV3')||0),shots:6,ammo:[],selectedIndex:0,paused:false,complete:false,drag:false,dragX:ORIGIN.x,dragY:ORIGIN.y,projectile:null,blocks:[],targets:[],particles:[],trajectory:true,raf:0,last:performance.now(),levelTimer:null,shotSerial:0,resolvedSerial:0,wind:0,combo:0,chest:null,screenShake:0,reported:false};

function ammoForLevel(){const l=catGame.level;if(l<8)return['stone','stone','stone','iron','bomb','fire'];if(l<18)return['stone','iron','bomb','fire','bounce','stone'];if(l<28)return['iron','bomb','fire','bounce','bomb','stone'];if(l<36)return['iron','bomb','fire','bounce','bomb','iron'];return['bomb','fire','bounce','bomb','iron','iron'];}
function materialFor(row,variant=0){const l=catGame.level;if(l<7)return row%3===0?'brick':'wood';if(l<14)return (row+variant)%4===0?'stone':row%2?'brick':'wood';if(l<24)return (row+variant)%5===0?'metal':row%3===0?'stone':row%2?'brick':'wood';if(l<32)return (row+variant)%6===0?'ice':row%4===0?'metal':row%2?'stone':'brick';return (row+variant)%7===0?'ice':row%4===0?'metal':row%2?'stone':'brick';}
function kindFor(i){const l=catGame.level;if(l%10===0&&i===0)return'king';if(l>=25&&i%3===0)return'crystal';if(l>=18&&i%3===1)return'barrel';if(l>=10&&i%2===0)return'archer';return'guard';}
function addBlock(x,y,w=68,h=40,mat='wood',opts={}){catGame.blocks.push({x,y,w,h,hp:materials[mat].hp,mat,alive:true,...opts});}
function addTarget(x,y,i,opts={}){const kind=opts.kind||kindFor(i),k=targetKinds[kind];catGame.targets.push({kind,...k,x,y,r:kind==='crystal'?15:19,alive:true,phase:i*.8,move:opts.move||0,baseX:x,baseY:y});}

// 10 layout families. Each level rotates and scales them instead of generating a box grid.
function buildFortress(){
 const l=catGame.level,variant=(l-1)%10,layoutSpan=[360,398,500,430,430,510,430,440,430,480][variant];
 // Keep every fortress and target safely inside the 960px catGame arena.
 const safeLeft=430,safeRight=W-26;
 const maxBase=Math.max(safeLeft,safeRight-layoutSpan);
 const base=Math.min(maxBase,safeLeft+((l*17)%Math.max(1,Math.floor(maxBase-safeLeft+1))),safeRight-layoutSpan);
 const matRow=r=>materialFor(r,variant);
 const block=(x,y,w,h,r=0)=>addBlock(x,y,w,h,matRow(r));
 const target=(x,y,i,opts)=>addTarget(x,y,i,opts);
 if(variant===0){ // pyramid
   for(let r=0;r<4+(l>16?1:0);r++){const n=5-r,ww=72;for(let c=0;c<n;c++)block(base+(5-n)*ww/2+c*ww,G-42-r*43,ww-5,40,r)}
   target(base+145,G-245,0);target(base+38,G-76,1,{move:l>8?14:0});
 }else if(variant===1){ // twin towers
   for(let r=0;r<4;r++){block(base,G-42-r*43,72,40,r);block(base+74,G-42-r*43,72,40,r);block(base+250,G-42-r*43,72,40,r+1);block(base+324,G-42-r*43,72,40,r+1)}
   block(base+148,G-42,174,40,1);target(base+74,G-230,0,{move:l>10?16:0});target(base+324,G-230,1,{move:l>14?20:0});
 }else if(variant===2){ // staircase
   for(let c=0;c<6;c++)for(let r=0;r<=c%4+1;r++)block(base+c*72,G-42-r*43,68,40,r+c);
   target(base+360,G-250,0);target(base+76,G-110,1,{move:18});
 }else if(variant===3){ // bridge with raised target
   for(let c=0;c<6;c++)block(base+c*72,G-215,68,40,c);
   for(let r=0;r<4;r++){block(base,G-42-r*43,68,40,r);block(base+360,G-42-r*43,68,40,r+1)}
   target(base+215,G-260,0,{move:l>8?24:0});target(base+394,G-230,1);
 }else if(variant===4){ // castle
   for(let c=0;c<5;c++)block(base+72+c*72,G-42,68,40,c);for(let r=1;r<5;r++){block(base+72,G-42-r*43,68,40,r);block(base+360,G-42-r*43,68,40,r+1)}
   for(let c=0;c<3;c++)block(base+144+c*72,G-128,68,40,c+2);
   target(base+106,G-230,0);target(base+394,G-230,1);target(base+250,G-190,2,{move:20});
 }else if(variant===5){ // scattered outposts
   for(let r=0;r<3;r++)block(base,G-42-r*43,80,40,r);for(let r=0;r<5;r++)block(base+270,G-42-r*43,80,40,r+1);for(let r=0;r<2;r++)block(base+430,G-42-r*43,80,40,r+2);
   target(base+40,G-185,0,{move:15});target(base+310,G-270,1);target(base+470,G-140,2,{move:24});
 }else if(variant===6){ // arch
   for(let r=0;r<4;r++){block(base,G-42-r*43,70,40,r);block(base+360,G-42-r*43,70,40,r+1)}
   for(let c=0;c<6;c++)block(base+c*72,G-215,68,40,c+2);
   target(base+215,G-255,0,{move:22});target(base+35,G-225,1);target(base+395,G-225,2);
 }else if(variant===7){ // zigzag
   for(let r=0;r<6;r++){const x=base+(r%2?80:0);for(let c=0;c<4;c++)block(x+c*72,G-42-r*43,68,40,r+c)}
   target(base+105,G-150,0,{move:18});target(base+300,G-300,1);target(base+35,G-340,2);
 }else if(variant===8){ // boss wall
   for(let r=0;r<5;r++){const n=r===4?4:6;for(let c=0;c<n;c++)block(base+(6-n)*36+c*72,G-42-r*43,68,40,r+c)}
   target(base+215,G-260,0,{kind:l%10===9?'king':undefined});target(base+75,G-120,1);target(base+355,G-120,2,{move:22});
 }else{ // fortress courtyard
   for(let r=0;r<3;r++){for(let c=0;c<7;c++)block(base+c*68,G-42-r*43,64,40,r+c)}
   for(let r=3;r<6;r++){block(base,G-42-r*43,64,40,r);block(base+408,G-42-r*43,64,40,r+1)}
   target(base+35,G-300,0);target(base+445,G-300,1);target(base+235,G-150,2,{move:28});
 }
 const desired=2+Math.min(3,Math.floor((l-1)/7));
 while(catGame.targets.length<desired){const x=base+70+(catGame.targets.length*113)%420,y=G-95-(catGame.targets.length%4)*68;target(x,y,catGame.targets.length,{move:catGame.level>12?18:0});}
 // Bonus treasure on most later levels.
 catGame.chest=l>=4&&l%3!==0?{x:Math.max(38,Math.min(W-38,base+Math.min(430,layoutSpan-42))),y:G-28,alive:true,phase:l*.4}:null;
}
function buildLevel(){
 clearTimeout(catGame.levelTimer);catGame.shots=6;catGame.ammo=ammoForLevel();catGame.selectedIndex=0;catGame.complete=false;catGame.drag=false;catGame.resolvedSerial=0;catGame.combo=0;catGame.wind=catGame.level<5?0:(Math.random()-.5)*(28+Math.min(40,catGame.level*1.6));catGame.blocks=[];catGame.targets=[];catGame.particles=[];catGame.screenShake=0;
 buildFortress();
 catGame.projectile={...ORIGIN,r:ammoTypes[catGame.ammo[0]].r,vx:0,vy:0,active:false,type:catGame.ammo[0],life:0,bounces:0,serial:++catGame.shotSerial};
 ui.level.textContent=`${catGame.level} / ${MAX_LEVEL}`;ui.shots.textContent=catGame.shots;ui.score.textContent=catGame.score;ui.best.textContent=catGame.best;ui.status.textContent=catGame.wind?`Wind ${catGame.wind>0?'→':'←'} ${Math.round(Math.abs(catGame.wind))}`:'Select ammo, pull back and release.';ui.targetInfo.textContent=`🎯 ${catGame.targets.length} targets`;ui.next.classList.remove('ready');renderAmmo();updatePower(0);ui.hint.classList.remove('hidden');
}
function renderAmmo(){const used=6-catGame.shots;document.getElementById('cat_ammoRow').innerHTML=catGame.ammo.map((id,i)=>{const a=ammoTypes[id];return`<button class="cat-ammo ${i===catGame.selectedIndex?'active':''} ${i<used?'used':''}" data-i="${i}" ${i<used||catGame.projectile.active||catGame.paused?'disabled':''}><b>${a.icon} ${a.name}</b><span>${a.desc}</span><small>${i<used?'Used':`Shot ${i+1}`}</small></button>`}).join('');document.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{catGame.selectedIndex=Number(b.dataset.i);catGame.projectile.type=catGame.ammo[catGame.selectedIndex];catGame.projectile.r=ammoTypes[catGame.projectile.type].r;renderAmmo();updatePower(0)});}
function startCatapultGame(){cancelAnimationFrame(catGame.raf);catGame.level=1;catGame.score=0;catGame.best=Number(window.CatapultIntegrationBest||localStorage.getItem('catapultKingBestV4')||localStorage.getItem('catapultKingBestV3')||0);catGame.paused=false;catGame.reported=false;ui.pause.textContent='Pause';ui.result.classList.remove('show');buildLevel();catGame.last=performance.now();catGame.raf=requestAnimationFrame(loop)}
function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function pullPower(x,y){return Math.min(1.22,Math.hypot(ORIGIN.x-x,ORIGIN.y-y)/120)}
function updatePower(v){ui.powerBar.style.width=Math.min(100,(v/1.22)*100)+'%'}
function setDrag(p){catGame.dragX=Math.max(18,Math.min(188,p.x));catGame.dragY=Math.max(330,Math.min(585,p.y));updatePower(pullPower(catGame.dragX,catGame.dragY))}
canvas.addEventListener('pointerdown',e=>{if(catGame.paused||catGame.complete||catGame.projectile.active||catGame.shots<=0)return;const p=pos(e);if(Math.hypot(p.x-ORIGIN.x,p.y-ORIGIN.y)<82){catGame.drag=true;ui.hint.classList.add('hidden');canvas.setPointerCapture?.(e.pointerId);setDrag(p)}});
canvas.addEventListener('pointermove',e=>{if(catGame.drag)setDrag(pos(e))});
canvas.addEventListener('pointerup',e=>{if(!catGame.drag)return;setDrag(pos(e));catGame.drag=false;launch()});canvas.addEventListener('pointercancel',()=>catGame.drag=false);
function launch(){if(catGame.projectile.active||catGame.shots<=0)return;const type=catGame.ammo[catGame.selectedIndex]||'stone',a=ammoTypes[type],dx=ORIGIN.x-catGame.dragX,dy=ORIGIN.y-catGame.dragY,p=pullPower(catGame.dragX,catGame.dragY);if(p<.08){ui.status.textContent='Pull farther back.';return}catGame.projectile={...ORIGIN,r:a.r,vx:dx*8.7*a.power,vy:dy*8.7*a.power,active:true,type,life:0,bounces:0,serial:++catGame.shotSerial};catGame.shots--;catGame.combo=0;ui.shots.textContent=catGame.shots;updatePower(0);renderAmmo();ui.status.textContent=`${a.name} launched!`;beep(type==='bomb'?150:240)}
function update(dt){
 if(catGame.paused||catGame.complete)return;
 for(const q of catGame.particles){q.vy+=700*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt}catGame.particles=catGame.particles.filter(q=>q.life>0);catGame.screenShake=Math.max(0,catGame.screenShake-dt*25);
 for(const t of catGame.targets)if(t.alive&&t.move){
  // Moving targets are clamped so they can never leave the visible arena.
  t.x=Math.max(t.r+10,Math.min(W-t.r-10,t.baseX+Math.sin(performance.now()/520+t.phase)*t.move));
  t.y=Math.max(t.r+12,Math.min(G-t.r-12,t.baseY+Math.sin(performance.now()/700+t.phase)*4));
 }
 const p=catGame.projectile;if(!p.active)return;p.life+=dt;p.vx+=catGame.wind*dt*.42;p.vy+=GRAV*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
 const collided=hitBlocks(p)||hitTargets(p)||hitChest(p);
 if(p.type==='fire'&&p.active)burnWood(p);
 if(p.type==='bounce'&&p.active&&(p.y<25||p.y>G-10)){if(p.bounces<3){p.vy*=-.82;p.vx*=.94;p.bounces++;burst(p.x,p.y,'#c68aff',10)}else endProjectile(p)}
 if(p.type!=='bounce'&&p.y>G-5)endProjectile(p);
 if(p.x>W+90||p.x<-120||p.y<-120||p.life>6.2)endProjectile(p);
 if(collided&&p.type!=='bounce')p.vx*=.8;
}
function endProjectile(p){if(!p.active)return;p.active=false;resolveShot(p.serial)}
function resolveShot(serial){if(catGame.resolvedSerial===serial)return;catGame.resolvedSerial=serial;setTimeout(()=>{if(catGame.complete)return;afterShot()},260)}
function addScore(points,label=''){catGame.combo++;const mult=Math.min(2.5,1+(catGame.combo-1)*.15),earned=Math.round(points*mult);catGame.score+=earned;ui.score.textContent=catGame.score;if(label)showToast(`${label} +${earned}${mult>1?' COMBO':''}`);}
function hitBlocks(p){for(const b of catGame.blocks){if(!b.alive)continue;const cx=Math.max(b.x,Math.min(p.x,b.x+b.w)),cy=Math.max(b.y,Math.min(p.y,b.y+b.h));if((p.x-cx)**2+(p.y-cy)**2<p.r*p.r){const a=ammoTypes[p.type];let dmg=a.damage*(p.type==='iron'&&(b.mat==='stone'||b.mat==='metal')?1.45:1);if(p.type==='fire'&&b.mat==='wood')dmg*=2;b.hp-=Math.ceil(dmg);p.vx*=.66;p.vy*=-.22;catGame.screenShake=7;if(p.type==='bomb'){explode(p.x,p.y,108);endProjectile(p)}if(b.hp<=0){b.alive=false;addScore(materials[b.mat].score,materials[b.mat].name);burst(b.x+b.w/2,b.y+b.h/2,materials[b.mat].color,18);beep(420)}else{catGame.score+=8;ui.score.textContent=catGame.score}return true}}return false}
function burnWood(p){for(const b of catGame.blocks){if(b.alive&&b.mat==='wood'&&Math.hypot(p.x-(b.x+b.w/2),p.y-(b.y+b.h/2))<75&&Math.random()<.10){b.hp--;if(b.hp<=0){b.alive=false;addScore(materials.wood.score,'Burn');burst(b.x+b.w/2,b.y+b.h/2,'#ff8b4b',18)}}}}
function explode(x,y,r){burst(x,y,'#f38a42',52);catGame.screenShake=13;for(const b of catGame.blocks){if(!b.alive)continue;const d=Math.hypot(x-(b.x+b.w/2),y-(b.y+b.h/2));if(d<r){b.hp-=Math.max(1,Math.ceil((r-d)/18));if(b.hp<=0){b.alive=false;addScore(materials[b.mat].score,materials[b.mat].name);burst(b.x+b.w/2,b.y+b.h/2,materials[b.mat].color,12)}}}for(const t of catGame.targets){if(t.alive&&Math.hypot(x-t.x,y-t.y)<r){t.hp-=3;if(t.hp<=0)destroyTarget(t)}}ui.score.textContent=catGame.score}
function hitTargets(p){for(const t of catGame.targets){if(!t.alive)continue;if(Math.hypot(p.x-t.x,p.y-t.y)<p.r+t.r){let dmg=ammoTypes[p.type].damage;if(t.kind==='crystal'&&p.type==='iron')dmg++;t.hp-=dmg;p.vx*=.55;p.vy*=-.12;catGame.screenShake=8;if(p.type==='bomb'){explode(t.x,t.y,100);endProjectile(p)}if(t.hp<=0)destroyTarget(t);else showToast(`${t.label} hit!`);return true}}return false}
function hitChest(p){const c=catGame.chest;if(!c||!c.alive)return false;if(Math.hypot(p.x-c.x,p.y-c.y)<p.r+28){c.alive=false;addScore(250,'💰 Treasure');burst(c.x,c.y,'#ffd761',28);return true}return false}
function destroyTarget(t){if(!t.alive)return;t.alive=false;addScore(t.points,t.icon);burst(t.x,t.y,'#ffd761',32);beep(760);ui.score.textContent=catGame.score}
function afterShot(){if(catGame.complete)return;const left=catGame.targets.filter(t=>t.alive).length;if(left===0){levelClear();return}if(catGame.shots<=0){finish(false);return}const used=6-catGame.shots;catGame.projectile={...ORIGIN,r:ammoTypes[catGame.ammo[used]].r,vx:0,vy:0,active:false,type:catGame.ammo[used],life:0,bounces:0,serial:++catGame.shotSerial};catGame.selectedIndex=used;renderAmmo();ui.status.textContent=`${left} target${left===1?'':'s'} remain. Wind ${catGame.wind>0?'→':'←'} ${Math.round(Math.abs(catGame.wind))}`;ui.hint.classList.add('hidden')}
function levelClear(){catGame.complete=true;const bonus=catGame.shots*55+Math.max(0,catGame.blocks.filter(b=>b.alive).length<5?80:0);catGame.score+=bonus;ui.score.textContent=catGame.score;if(catGame.score>catGame.best){catGame.best=catGame.score;localStorage.setItem('catapultKingBestV4',catGame.best);ui.best.textContent=catGame.best}ui.status.textContent=`Fortress cleared! +${bonus} bonus.`;beep(930);if(catGame.level<MAX_LEVEL){ui.next.classList.add('ready');catGame.levelTimer=setTimeout(()=>{if(catGame.complete){catGame.level++;catGame.complete=false;buildLevel()}},950)}else finish(true)}
function finish(win){catGame.complete=true;ui.resultTitle.textContent=win?'Kingdom Conquered!':'Battle Over';cat$('resultIcon').textContent=win?'👑':'🏆';ui.resultScore.textContent=catGame.score;ui.resultShots.textContent=`${catGame.shots} shots left`;ui.resultBonus.textContent=`+${catGame.shots*55} bonus`;ui.result.classList.add('show');if(!catGame.reported){catGame.reported=true;window.dispatchEvent(new CustomEvent('catapult-game-finished',{detail:{score:catGame.score,win}}));}beep(win?980:130)}
function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=60+Math.random()*260;catGame.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-50,life:.35+Math.random()*.55,color})}}
function showToast(t){ui.toast.textContent=t;ui.toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>ui.toast.classList.remove('show'),650)}
function beep(freq){try{const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;g.gain.value=.045;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.11)}catch(e){}}
function drawBlock(b){const m=materials[b.mat];ctx.fillStyle=m.color;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle=m.stroke;ctx.lineWidth=3;ctx.strokeRect(b.x,b.y,b.w,b.h);if(b.mat==='wood'){ctx.strokeStyle='rgba(70,35,20,.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x+8,b.y+12);ctx.lineTo(b.x+b.w-8,b.y+12);ctx.moveTo(b.x+12,b.y+29);ctx.lineTo(b.x+b.w-14,b.y+29);ctx.stroke()}if(b.mat==='ice'){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.moveTo(b.x+8,b.y+9);ctx.lineTo(b.x+b.w-10,b.y+b.h-9);ctx.stroke()}}
function draw(){
 ctx.clearRect(0,0,W,H);ctx.save();if(catGame.screenShake){ctx.translate((Math.random()-.5)*catGame.screenShake,(Math.random()-.5)*catGame.screenShake)}
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#69c9ec');sky.addColorStop(.64,'#d6f2ea');sky.addColorStop(.65,'#80c760');sky.addColorStop(1,'#4c9849');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='rgba(255,255,255,.42)';for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(55+i*165,74+(i%2)*32,28,0,Math.PI*2);ctx.arc(87+i*165,68+(i%2)*32,38,0,Math.PI*2);ctx.arc(120+i*165,78+(i%2)*32,24,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#6ab65a';ctx.beginPath();ctx.moveTo(0,470);for(let x=0;x<=W;x+=90)ctx.lineTo(x,430+Math.sin(x*.012)*35);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
 const alive=catGame.blocks.filter(b=>b.alive),xs=alive.map(b=>b.x),xe=alive.map(b=>b.x+b.w);if(alive.length){ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse((Math.min(...xs)+Math.max(...xe))/2,G+4,(Math.max(...xe)-Math.min(...xs))*.55,17,0,0,Math.PI*2);ctx.fill()}alive.forEach(drawBlock);
 if(catGame.chest?.alive){const c=catGame.chest;ctx.fillStyle='#7b4a25';ctx.fillRect(c.x-24,c.y-22,48,27);ctx.fillStyle='#d39b35';ctx.fillRect(c.x-24,c.y-22,48,7);ctx.fillStyle='#f6d35c';ctx.fillRect(c.x-4,c.y-9,8,10)}
 catGame.targets.forEach(t=>{if(!t.alive)return;const y=t.y+Math.sin(performance.now()/430+t.phase)*3;ctx.shadowColor=t.color;ctx.shadowBlur=9;ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(t.x,y,t.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#69472b';ctx.lineWidth=3;ctx.stroke();ctx.font=t.kind==='king'?'22px system-ui':'18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#222';ctx.fillText(t.icon,t.x,y+1)});
 // wind indicator inside arena
 if(catGame.wind){ctx.fillStyle='rgba(20,35,48,.5)';ctx.roundRect(720,22,190,38,18);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText(`${catGame.wind>0?'→':'←'} WIND ${Math.round(Math.abs(catGame.wind))}`,815,47)}
 // catapult
 ctx.strokeStyle='#5b3726';ctx.lineWidth=18;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(65,560);ctx.lineTo(185,560);ctx.moveTo(138,560);ctx.lineTo(166,455);ctx.stroke();ctx.fillStyle='#75472e';ctx.fillRect(52,550,150,12);
 const p=catGame.projectile;if(catGame.trajectory&&!catGame.complete&&!p.active){const a=ammoTypes[catGame.ammo[catGame.selectedIndex]||'stone'],dx=ORIGIN.x-catGame.dragX,dy=ORIGIN.y-catGame.dragY,vx=dx*8.7*a.power,vy=dy*8.7*a.power;ctx.fillStyle='rgba(255,255,255,.65)';for(let i=1;i<28;i++){const t=i*.075,x=ORIGIN.x+vx*t+.5*catGame.wind*.42*t*t,y=ORIGIN.y+vy*t+.5*GRAV*t*t;if(y>G)break;ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill()}}
 if(p){const a=ammoTypes[p.type],x=p.active?p.x:catGame.drag?catGame.dragX:ORIGIN.x,y=p.active?p.y:catGame.drag?catGame.dragY:ORIGIN.y;ctx.fillStyle=a.color;ctx.shadowColor=a.color;ctx.shadowBlur=p.type==='bomb'?12:5;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.stroke();if(catGame.drag){ctx.strokeStyle='#5a3525';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(166,474);ctx.lineTo(x,y);ctx.stroke()}}
 catGame.particles.forEach(q=>{ctx.globalAlpha=Math.max(0,Math.min(1,q.life*1.6));ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x,q.y,3.6,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;ctx.restore();
}
function loop(now){const dt=Math.min(.032,Math.max(.001,(now-catGame.last)/1000));catGame.last=now;update(dt);draw();catGame.raf=requestAnimationFrame(loop)}
ui.pause.onclick=()=>{if(catGame.complete)return;catGame.paused=!catGame.paused;ui.pause.textContent=catGame.paused?'Resume':'Pause'};
cat$('restartBtn').onclick=startCatapultGame;cat$('againBtn').onclick=startCatapultGame;cat$('trajectoryBtn').onclick=()=>{catGame.trajectory=!catGame.trajectory;ui.trajectoryState.textContent=catGame.trajectory?'ON':'OFF'};
ui.next.onclick=()=>{if(catGame.level<MAX_LEVEL&&catGame.complete){clearTimeout(catGame.levelTimer);catGame.level++;catGame.complete=false;buildLevel()}else if(!catGame.complete)showToast('Clear the fortress first.')};

function stopCatapultGame(){clearTimeout(catGame.levelTimer);cancelAnimationFrame(catGame.raf);catGame.paused=true;}
window.startCatapultGame=startCatapultGame;window.stopCatapultGame=stopCatapultGame;
cat$('resultHomeBtn').onclick=()=>{cat$('result').classList.remove('show');stopCatapultGame();window.dispatchEvent(new Event('catapult-go-home'));};


function toggleCatapultFullscreen(){
  const el=document.getElementById('catapultPage')?.querySelector('.catapult-card');
  const btn=document.getElementById('cat_fullscreenBtn');
  if(!el)return;
  if(!document.fullscreenElement){
    const p=el.requestFullscreen?.();
    if(p&&p.catch)p.catch(()=>showToast('Fullscreen is not available in this browser.'));
  }else{
    document.exitFullscreen?.();
  }
}
document.getElementById('cat_fullscreenBtn')?.addEventListener('click',toggleCatapultFullscreen);
document.addEventListener('fullscreenchange',()=>{
  const btn=document.getElementById('cat_fullscreenBtn');
  if(btn)btn.textContent=document.fullscreenElement?'⤢':'⛶';
});
