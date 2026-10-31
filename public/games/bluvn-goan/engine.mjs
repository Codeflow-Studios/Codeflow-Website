// Seeded, fixed-step simulation. Music cue events enter through triggerMusicDrop; rendering never mutates the simulation.
export const W=1280,H=640,FLOOR=568,CEILING=80,BODY_HALF_HEIGHT=72;
const PLAYER_RADIUS=18,clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const ACTS=['SOUNDCHECK','LIGHTSHOW','ENCORE'];
const CHALLENGES=[
  {key:'notesCollected',name:'CATCH 8 NOTES',target:8},
  {key:'hazardsDestroyed',name:'BREAK 3 HAZARDS',target:3},
  {key:'gatesDodged',name:'DODGE 5 GATES',target:5},
  {key:'nearMisses',name:'MAKE 2 CLOSE CALLS',target:2},
  {key:'distance',name:'FLY ANOTHER 350 m',target:350},
];
function seedNumber(seed){if(typeof seed==='number'&&Number.isFinite(seed))return(seed>>>0)||1;let n=2166136261;for(const c of String(seed??1))n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0)||1;}
function random(r){let n=r.rng;n^=n<<13;n^=n>>>17;n^=n<<5;r.rng=n>>>0;return r.rng/4294967296;}
export function distanceToSegment(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l===0?0:clamp(((px-x1)*dx+(py-y1)*dy)/l,0,1);return Math.hypot(px-x1-t*dx,py-y1-t*dy);}

function nextChallenge(r){const c=CHALLENGES[r.challengeIndex%CHALLENGES.length];r.challenge={...c,start:r[c.key],target:Math.ceil(c.target*(1+Math.floor(r.challengeIndex/CHALLENGES.length)*.5))};}
export function challengeProgress(r){return {name:r.challenge.name,progress:Math.min(r.challenge.target,Math.floor(r[r.challenge.key]-r.challenge.start)),target:r.challenge.target};}
export function createRun(seed=1){
  const r={dropDuration:10,phase:'running',x:250,y:320,vy:0,t:0,distance:0,score:0,speed:330,
    obstacles:[],pickups:[],projectiles:[],events:[],shield:0,board:0,mech:0,armor:0,drop:0,invulnerable:0,
    hype:0,dropReady:false,dropCharged:false,chain:0,combo:1,comboTimer:0,pulseCooldown:0,pulseFlash:0,shotTimer:0,
    notesCollected:0,hazardsDestroyed:0,drops:0,pulsesUsed:0,nearMisses:0,powerupsCollected:0,airTime:0,gatesDodged:0,challengesCompleted:0,
    act:ACTS[0],actIndex:0,challengeIndex:0,rng:seedNumber(seed),nextId:1,patternCount:0,
    gateTimer:3.2,noteTimer:2.8,powerTimer:5,missileTimer:14};
  nextChallenge(r);
  for(let i=0;i<10;i++)r.pickups.push({id:r.nextId++,kind:'note',x:500+i*44,y:385+Math.sin(i/9*Math.PI)*80,r:14});
  // An early, easy-to-reach transformation introduces the vehicle loop.
  r.pickups.push({id:r.nextId++,kind:'board',x:1030,y:470,r:27});
  return r;
}
function event(r,kind,data={}){r.events.push({kind,x:r.x,y:r.y,...data});}
export function triggerMusicDrop(r){
  if(r.phase!=='running')return false;
  const charged=r.hype>=100;r.dropDuration=10;r.drop=10;r.dropCharged=charged;r.dropReady=false;r.hype=0;r.drops++;
  r.combo=Math.max(r.combo,charged?5:2);r.chain=Math.max(r.chain,(r.combo-1)*6);r.comboTimer=r.dropDuration;r.invulnerable=Math.max(r.invulnerable,.6);
  event(r,'drop',{charged});return true;
}
function hype(r,value){
  if(r.drop>0)return;r.hype=Math.min(100,r.hype+value);
  if(r.hype>=100&&!r.dropReady){r.dropReady=true;event(r,'hype-ready');}
}
function award(r,value,chain=true){
  if(chain){r.chain++;r.comboTimer=3;r.combo=Math.min(5,1+Math.floor(r.chain/6));}
  const points=value*r.combo*(r.drop>0?2:1);r.score+=points;return points;
}
function gate(r,cx,cy,angle,length=150,spin=0){
  const dx=Math.cos(angle)*length/2,dy=Math.sin(angle)*length/2;
  r.obstacles.push({id:r.nextId++,kind:'gate',cx,cy,angle,length,spin,rotating:spin!==0,x:cx-dx,y:cy-dy,x2:cx+dx,y2:cy+dy,radius:12,nearest:Infinity,counted:false});
}
function missile(r,y,warn=1.4){r.obstacles.push({id:r.nextId++,kind:'missile',x:W+65,y:clamp(y,160,490),width:64,height:24,warn,nearest:Infinity,counted:false});}
function laser(r,y){r.obstacles.push({id:r.nextId++,kind:'laser',x:0,y:clamp(y,180,465),warn:1.5,active:.75,nearest:Infinity,counted:false});event(r,'laser-warning',{y});}
function spawnPattern(r){
  const n=r.patternCount++%6,c=190+random(r)*260;
  if(n===0)gate(r,W+100,c,Math.PI/2,150+random(r)*25);
  else if(n===1){gate(r,W+100,220,Math.PI/2,130);gate(r,W+620,425,Math.PI/2,130);}
  else if(n===2)gate(r,W+100,320,random(r)*Math.PI,145,random(r)>.5?1.1:-1.1);
  else if(n===3){
    if(r.obstacles.some(o=>o.kind==='gate'&&Math.min(o.x,o.x2)>r.x-80&&Math.min(o.x,o.x2)<r.x+400))gate(r,W+100,c,Math.PI/3,145);
    else laser(r,r.y);
  }else if(n===4){gate(r,W+100,190,Math.PI/2,110);gate(r,W+100,450,Math.PI/2,100);}
  else{missile(r,r.y,1.5);missile(r,r.y>320?210:440,2.6);}
  event(r,'pattern',{pattern:n});
  r.gateTimer=Math.max(2.7,3.5-r.t/220)+(n===1?1.1:n===3?.6:0);
}
function spawnNotes(r){const cy=195+random(r)*245;for(let i=0;i<10;i++)r.pickups.push({id:r.nextId++,kind:'note',x:W+40+i*42,y:clamp(cy+Math.sin(i/9*Math.PI*2)*52,165,480),r:14});}
function spawnPower(r){const kinds=['mech','boost','shield','board'],kind=kinds[(r.powerupsSpawned||0)%kinds.length];r.powerupsSpawned=(r.powerupsSpawned||0)+1;r.pickups.push({id:r.nextId++,kind,x:W+60,y:r.powerupsSpawned===1?460:220+random(r)*250,r:27});}
function destroy(r,o,cause){
  if(o.destroyed||o.expired)return;
  o.destroyed=true;r.hazardsDestroyed++;
  const points=award(r,30);hype(r,5);
  const x=o.kind==='laser'?r.x+300:o.kind==='gate'?(o.x+o.x2)/2:o.x,y=o.kind==='gate'?(o.y+o.y2)/2:o.y;
  event(r,'destroy',{x,y,cause,points});
  if(cause==='pulse'||cause==='mech')for(let i=0;i<3;i++)r.pickups.push({id:r.nextId++,kind:'note',x:Math.max(r.x+40,x)+i*30,y:clamp(y+(i-1)*26,160,480),r:14});
}
export function pulse(r){
  if(r.phase!=='running'||r.pulseCooldown>0)return false;
  r.pulseCooldown=9;r.pulseFlash=.55;r.pulsesUsed++;r.invulnerable=Math.max(r.invulnerable,.7);
  event(r,'pulse');
  for(const o of r.obstacles){const x=o.kind==='gate'?(o.x+o.x2)/2:o.x;if(o.kind==='laser'||(x>r.x-100&&x<r.x+500))destroy(r,o,'pulse');}
  r.obstacles=r.obstacles.filter(o=>!o.destroyed);return true;
}
function damage(r,o){
  if(r.drop>0){destroy(r,o,'drop');return;}
  o.hit=true;if(r.invulnerable>0)return;
  let protection='';
  if(r.mech>0&&r.armor>0){protection='mech';r.armor--;if(r.armor===0)r.mech=0;}
  else if(r.board>0){protection='board';r.board=0;}
  else if(r.shield>0){protection='shield';r.shield=0;}
  event(r,'hit',{protected:!!protection,protection,reason:o.kind});
  if(protection){r.invulnerable=1.3;destroy(r,o,'armor');}
  else{r.phase='over';event(r,'over',{reason:o.kind});}
}
function missileDistance(r,o,radius){const dx=Math.max(Math.abs(r.x-o.x)-(o.width||64)/2,0),dy=Math.max(Math.abs(r.y-o.y)-(o.height||24)/2,0);return Math.hypot(dx,dy)-radius;}
function collect(r,p){
  p.collected=true;
  if(p.kind==='note'){
    r.notesCollected++;const points=award(r,10);hype(r,7);event(r,'note',{x:p.x,y:p.y,points});return;
  }
  r.powerupsCollected++;hype(r,8);
  if(p.kind==='shield')r.shield=12;
  if(p.kind==='board'){r.board=9;r.mech=0;r.armor=0;}
  if(p.kind==='mech'){r.mech=12;r.armor=2;r.board=0;r.shotTimer=0;}
  if(p.kind==='boost')hype(r,100);
  event(r,p.kind);
}

export function step(r,dtSeconds,held){
  if(r.phase!=='running')return r;
  const dt=clamp(Number(dtSeconds)||0,0,.05);r.events=[];if(!dt)return r;
  r.t+=dt;
  const priorDrop=r.drop;
  for(const key of ['shield','board','mech','drop','invulnerable','pulseCooldown','pulseFlash','comboTimer'])r[key]=Math.max(0,r[key]-dt);
  if(priorDrop>0&&r.drop===0){r.invulnerable=Math.max(r.invulnerable,1.2);event(r,'drop-end');}
  if(r.mech===0)r.armor=0;
  if(r.comboTimer===0){r.chain=0;r.combo=1;}
  const base=Math.min(600,330+r.t*2),extra=r.drop>0?145:r.board>0?70:r.mech>0?35:0;
  r.speed=Math.min(760,base+extra);const travel=r.speed*dt/15;r.distance+=travel;r.score+=travel;
  r.vy=clamp(r.vy+(held?-1260:1000)*dt,-410,430);r.y+=r.vy*dt;
  if(r.y<CEILING+BODY_HALF_HEIGHT){r.y=CEILING+BODY_HALF_HEIGHT;r.vy=Math.max(0,r.vy);}
  if(r.y>FLOOR-BODY_HALF_HEIGHT){r.y=FLOOR-BODY_HALF_HEIGHT;r.vy=Math.min(0,r.vy);}
  if(r.y<FLOOR-BODY_HALF_HEIGHT-1)r.airTime+=dt;
  const radius=r.mech>0?27:r.board>0?24:PLAYER_RADIUS;
  const actIndex=Math.floor(r.t/24)%ACTS.length;
  if(actIndex!==r.actIndex){r.actIndex=actIndex;r.act=ACTS[actIndex];event(r,'act',{name:r.act});hype(r,12);}

  r.gateTimer-=dt;r.noteTimer-=dt;r.powerTimer-=dt;r.missileTimer-=dt;
  if(r.gateTimer<=0)spawnPattern(r);
  if(r.noteTimer<=0){spawnNotes(r);r.noteTimer+=3+random(r)*.8;}
  if(r.powerTimer<=0){spawnPower(r);r.powerTimer+=9+random(r)*2;}
  const closeGate=r.obstacles.some(o=>o.kind==='gate'&&Math.min(o.x,o.x2)>r.x-80&&Math.min(o.x,o.x2)<r.x+430);
  if(r.missileTimer<=0&&!closeGate&&!r.obstacles.some(o=>o.kind==='laser'&&!o.expired)){missile(r,r.y);r.missileTimer=Math.max(5.5,10-r.t/100)+random(r)*1.5;}

  for(const p of r.pickups){p.x-=r.speed*dt;if(Math.hypot(r.x-p.x,r.y-p.y)<=radius+p.r)collect(r,p);}
  r.pickups=r.pickups.filter(p=>!p.collected&&p.x>-60);
  if(r.mech>0){r.shotTimer-=dt;if(r.shotTimer<=0){r.projectiles.push({id:r.nextId++,x:r.x+52,y:r.y-4,life:1.6});r.shotTimer=.48;event(r,'shot');}}

  for(const o of r.obstacles){
    if(o.kind==='gate'){
      if(o.rotating){o.cx-=r.speed*dt;o.angle+=o.spin*dt;const dx=Math.cos(o.angle)*o.length/2,dy=Math.sin(o.angle)*o.length/2;o.x=o.cx-dx;o.x2=o.cx+dx;o.y=o.cy-dy;o.y2=o.cy+dy;}
      else{o.x-=r.speed*dt;o.x2-=r.speed*dt;}
    }else{
      const warning=Math.max(0,o.warn||0);o.warn=Math.max(0,warning-dt);const activeDt=warning>0?Math.max(0,dt-warning):dt;
      if(o.kind==='missile')o.x-=(r.speed+430)*activeDt;
      else if(o.warn===0){o.active-=activeDt;if(o.active<=0)o.expired=true;}
    }
  }
  for(const shot of r.projectiles){
    shot.x+=860*dt;shot.life-=dt;
    for(const o of r.obstacles){
      if(o.destroyed||o.expired||o.kind==='laser'||(o.kind==='missile'&&o.warn>0))continue;
      const hit=o.kind==='gate'?distanceToSegment(shot.x,shot.y,o.x,o.y,o.x2,o.y2)<24:Math.abs(shot.x-o.x)<45&&Math.abs(shot.y-o.y)<24;
      if(hit){destroy(r,o,'mech');shot.life=0;break;}
    }
  }
  r.projectiles=r.projectiles.filter(s=>s.life>0&&s.x<W+100);
  for(const o of r.obstacles){
    if(o.destroyed)continue;
    let clearance,passed;
    if(o.kind==='gate'){clearance=distanceToSegment(r.x,r.y,o.x,o.y,o.x2,o.y2)-radius-(o.radius||12);passed=Math.max(o.x,o.x2)<r.x-radius-18;}
    else if(o.kind==='laser'){
      if(o.warn>0)continue;
      clearance=o.expired?Infinity:Math.abs(r.y-o.y)-radius-9;passed=o.expired;
    }else{if(o.warn>0)continue;clearance=missileDistance(r,o,radius);passed=o.x+(o.width||64)/2<r.x-radius-18;}
    o.nearest=Math.min(o.nearest??Infinity,clearance);
    if(clearance<=0&&!o.hit&&!o.expired)damage(r,o);
    if(passed&&!o.counted){
      o.counted=true;
      if(!o.hit&&!o.destroyed){
        if(o.kind==='gate')r.gatesDodged++;
        award(r,20);hype(r,4);
        if(o.nearest>0&&o.nearest<28){r.nearMisses++;hype(r,15);const points=award(r,40);event(r,'near',{points});}
      }
    }
    if(r.phase==='over')break;
  }
  r.obstacles=r.obstacles.filter(o=>!o.destroyed&&!o.expired&&(o.kind==='gate'?Math.max(o.x,o.x2)>-140:o.kind==='laser'||o.x>-140));
  if(r[r.challenge.key]-r.challenge.start>=r.challenge.target){
    r.challengesCompleted++;r.score+=150;event(r,'challenge',{name:r.challenge.name,points:150});hype(r,25);r.challengeIndex++;nextChallenge(r);
  }
  return r;
}
