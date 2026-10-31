import {W,H,FLOOR,BODY_HALF_HEIGHT} from './engine.mjs';
import {ARTISTS,artistById} from './characters.mjs';
import {animationState,animationPose} from './animation.mjs';
import {BRAND} from './theme.mjs';
import {MusicalBackdrops} from './backdrops.mjs';
const PINK=BRAND.pink,LIME=BRAND.yellow,CYAN=BRAND.yellow;
export class Renderer {
  constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.time=0;this.fx=[];this.floaters=[];this.ripples=[];this.activeRun=null;this.shake=0;this.artist='puppet';this.skin=PINK;this.images={};this.frames={};this.previews=new Map();this.motion=null;this.motionAt=0;this.hitUntil=0;this.backgrounds={};this.scenery=new MusicalBackdrops();this.beatTime=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;}
  async load(){
    const load=src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src});
    const [logo,puppet,gauthier,matar,stage,studio]=await Promise.all(['logo','puppet','gauthier','matar','stage','studio'].map(name=>load(`assets/${name}.png`)));
    if(!gauthier||!matar||!logo||!puppet||!stage||!studio)throw new Error('A required Skumic artist or stage image failed to load.');
    this.scenery.setImages({stage,studio});this.logo=this.trim(logo);this.puppet=this.trim(puppet);
    this.images={puppet:this.puppet,gauthier:this.trim(gauthier),matar:this.trim(matar)};
    for(const id of ['gauthier','matar']){
      this.frames[id]={stand:this.images[id]};
      await Promise.all(['walk1','walk2','rise','guard'].map(async key=>{
        const img=await load('assets/'+id+'-'+key+'.png');if(!img)throw new Error('Missing animation pose: '+id+'/'+key);
        this.frames[id][key]=this.trim(img);
      }));
    }
    document.querySelectorAll('.brand-logo').forEach(c=>{const x=c.getContext('2d');if(this.logo)x.drawImage(this.logo,0,(c.height-c.width*this.logo.height/this.logo.width)/2,c.width,c.width*this.logo.height/this.logo.width);else{x.fillStyle=PINK;x.font='bold italic 55px sans-serif';x.fillText('SKUMIC',3,75)}});
  }
  setArtist(id){this.artist=artistById(id).id;this.skin=artistById(id).color;}
  paintPortrait(canvas,id){
    this.previews.set(canvas,{id,lastFrame:null});this.drawPortrait(canvas,id);
  }
  drawPortrait(canvas,id){
    const c=canvas.getContext('2d'),a=artistById(id),pose=animationPose('idle',this.time+(id==='matar'?.3:0),this.reduced);
    c.clearRect(0,0,canvas.width,canvas.height);if(!this.images[id])return;
    c.save();c.translate(canvas.width/2,canvas.height/2);
    if(id==='puppet'){
      const img=this.puppet,h=126,w=h*img.width/img.height;c.rotate(pose.tilt);c.shadowColor=a.color;c.shadowBlur=5;c.drawImage(img,-w/2,-h/2+pose.bob,w,h);
    }else{
      c.scale(-1,1);this.drawFighter(c,id,pose.frame,152,64,pose.bob,true);
    }
    c.restore();
  }
  drawFighter(c,id,key,height,footY,bob=0,portrait=false){
    const frame=this.frames[id]?.[key]||this.images[id],stand=this.images[id];if(!frame||!stand)return;
    const unit=height/stand.height,w=frame.width*unit,h=frame.height*unit;
    const roots=id==='matar'?{stand:480,walk1:460,walk2:480,rise:500,guard:480}:{stand:480,walk1:480,walk2:480,rise:510,guard:480};
    const root=(roots[key]||480)*(frame.crop.sourceWidth/880);
    const x=(frame.crop.x-root)*unit,y=footY-h+bob;
    c.imageSmoothingEnabled=false;
    c.globalAlpha=.68;
    const edge=portrait?.8:1.2;
    for(const [dx,dy] of [[edge,0],[-edge,0],[0,edge],[0,-edge]])c.drawImage(frame.rim,x+dx,y+dy,w,h);
    c.globalAlpha=1;c.filter='brightness(1.12)';c.drawImage(frame,x,y,w,h);c.filter='none';
  }
  // Crop transparent source margins only while rendering. Source PNGs are intact.
  trim(img){if(!img)return null;const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=0,b=0;for(let y=0;y<c.height;y++)for(let px=0;px<c.width;px++){if(d[(y*c.width+px)*4+3]>20){l=Math.min(l,px);r=Math.max(r,px);t=Math.min(t,y);b=Math.max(b,y)}}if(r<l)return null;const out=document.createElement('canvas');out.width=r-l+1;out.height=b-t+1;out.getContext('2d').drawImage(c,l,t,out.width,out.height,0,0,out.width,out.height);
    out.crop={x:l,y:t,sourceWidth:img.width,sourceHeight:img.height};
    const rim=document.createElement('canvas');rim.width=out.width;rim.height=out.height;const rc=rim.getContext('2d');rc.drawImage(out,0,0);rc.globalCompositeOperation='source-in';rc.fillStyle='#f4e8ff';rc.fillRect(0,0,rim.width,rim.height);out.rim=rim;return out;}
  line(x,y,x2,y2,color,width=1){const c=this.c;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()}
  polygon(points,fill,stroke){const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
  circle(x,y,r,color,stroke){const c=this.c;c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(color){c.fillStyle=color;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
  background(offset,home,held=false){
    const c=this.c,t=this.time,a=artistById(this.artist);
    const venue=this.scenery.draw(c,{distance:offset/15,time:t,playerY:this.activeRun?.y||320,held,drop:this.activeRun?.drop>0,artist:this.artist,reduced:this.reduced,beatTime:this.beatTime,energy:this.musicEnergy,build:this.musicBuild});
    this.canvas.dataset.venue=venue.id;
    this.canvas.dataset.scenery='parallax-flight-reactive';
    if(home){
      const heroX=matchMedia('(max-width:700px)').matches?690:910;
      c.save();c.lineWidth=2;c.setLineDash([12,12]);this.circle(heroX,330,200,null,a.color+'38');c.setLineDash([]);c.restore();
      this.player(heroX,350,0,true,2.6,false,false,false,'idle',this.time);
      c.fillStyle=a.color;c.font='26px MotionControl';c.fillText('✦',heroX-170,245);c.fillText('✦',heroX+166,430);
    }
  }
  gate(o,t){const c=this.c;c.save();c.lineCap='round';this.line(o.x,o.y,o.x2,o.y2,'#6c206c',18);c.shadowColor=PINK;c.shadowBlur=20;this.line(o.x,o.y,o.x2,o.y2,PINK,7);c.shadowBlur=0;const dx=o.x2-o.x,dy=o.y2-o.y,len=Math.hypot(dx,dy);c.beginPath();c.moveTo(o.x,o.y);for(let i=1;i<10;i++){const p=i/10,j=Math.sin(t*24+i*8)*9;c.lineTo(o.x+dx*p-dy/len*j,o.y+dy*p+dx/len*j)}c.lineTo(o.x2,o.y2);c.lineWidth=2;c.strokeStyle='#ffe9f6';c.stroke();for(const [x,y] of [[o.x,o.y],[o.x2,o.y2]]){this.circle(x,y,15,'#281a35','#97648a');this.circle(x,y,9,'#8d4472',PINK);this.circle(x,y,4,'#ffdeee')}c.restore()}
  pickup(p,t){
    const c=this.c;if(p.kind==='note'){
      c.save();c.translate(p.x,p.y);c.rotate(Math.sin(t*3+p.id)*.12);c.shadowBlur=13;c.shadowColor=CYAN;
      c.fillStyle='#f5ffb8';c.font='bold 30px MotionControl';c.textAlign='center';c.fillText(p.id%2?'♪':'♫',0,10);c.restore();return;
    }
    const color=p.kind==='shield'?CYAN:p.kind==='mech'?'#dcf105':p.kind==='boost'?LIME:'#aa6ed5';
    c.save();c.translate(p.x,p.y);c.shadowBlur=20;c.shadowColor=color+'88';
    this.polygon([[0,-32],[32,0],[0,32],[-32,0]],'#211831',color);c.shadowBlur=0;
    c.fillStyle=color;c.font='bold 29px MotionControl';c.textAlign='center';c.fillText(p.kind==='shield'?'◇':p.kind==='mech'?'▣':p.kind==='boost'?'ϟ':'≋',0,9);
    c.font='10px MotionControl';c.fillText(p.kind==='mech'?'BASS MECH':p.kind==='boost'?'HYPE BOOST':p.kind==='board'?'RAVEBOARD':'SHIELD',0,52);c.restore();
  }
  laser(o,t){
    const c=this.c;c.save();
    if(o.warn>0){
      c.setLineDash([12,12]);this.line(0,o.y,W,o.y,'#ffb166aa',2);c.setLineDash([]);
      c.fillStyle='#ffbc76';c.font='15px MotionControl';c.textAlign='center';c.fillText('LASER / MOVE!',W*.57,o.y-17);
      this.polygon([[38,o.y-18],[62,o.y],[38,o.y+18]],'#fc7f3f');
    }else{
      c.shadowColor='#ff4098';c.shadowBlur=25;this.line(0,o.y,W,o.y,'#fa2d824d',32);this.line(0,o.y,W,o.y,'#fa2d82',17);c.shadowBlur=0;this.line(0,o.y,W,o.y,'#fff2ee',5);
    }
    c.restore();
  }
  projectile(s){const c=this.c;c.save();c.shadowBlur=15;c.shadowColor=CYAN;this.line(s.x-28,s.y,s.x+14,s.y,CYAN,9);this.line(s.x-15,s.y,s.x+12,s.y,'#eafff8',3);c.restore();}
  mech(x,y,held,armor){
    const c=this.c,t=this.time,a=artistById(this.artist),walk=this.reduced?0:Math.sin(t*8)*7;
    c.save();c.translate(x,y);c.rotate(held?-.025:.02);
    // A speaker-powered walker with an artist in its glass cockpit.
    for(const [px,leg] of [[-32,walk],[27,-walk]]){this.polygon([[px-11,25],[px+10,25],[px+14,59+leg],[px-14,59+leg]],'#584466',a.color);c.fillStyle='#c2aed1';c.fillRect(px-19,58+leg,39,9);}
    this.polygon([[-57,-24],[46,-24],[58,36],[-48,43]],'#362c48',a.color);
    this.circle(-37,5,22,'#171826','#ba8cff');this.circle(-37,5,13,'#392d55',CYAN);this.circle(-37,5,5,CYAN);
    c.fillStyle='#3b344d';c.fillRect(40,-18,48,25);c.fillStyle=CYAN;c.fillRect(79,-14,13,17);
    c.save();c.beginPath();c.rect(-33,-65,68,72);c.clip();c.fillStyle='#192436';c.fillRect(-33,-65,68,72);
    if(this.artist==='puppet'){const h=53,w=h*this.puppet.width/this.puppet.height;c.drawImage(this.puppet,-w/2,-61,w,h);}else{c.scale(-1,1);this.drawFighter(c,this.artist,'guard',94,27,0);}
    c.restore();
    this.polygon([[-36,-66],[30,-66],[39,5],[-35,5]],'#dcf10509','#f5ffb8');this.line(-36,8,40,8,a.color,5);
    for(let i=0;i<2;i++){c.fillStyle=i<armor?'#ffbb6b':'#402b3f';c.fillRect(-19+i*23,-77,17,6);}
    if(held){this.flame(-30,38,t);this.flame(24,38,t+.2);}
    c.restore();
  }
  arcadeEffects(r,dt,paused){
    const c=this.c,t=this.time;
    if(r.drop>0){
      c.save();c.globalCompositeOperation='screen';c.fillStyle='#8652c518';c.fillRect(0,75,W,FLOOR-75);
      for(let i=0;i<22;i++){const x=W-((t*670+i*139)%(W+180)),y=98+(i*79)%430;c.globalAlpha=.12+(i%3)*.03;this.line(x,y,x+70+(i%4)*25,y,i%2?CYAN:LIME,2);}
      c.globalAlpha=.14;c.strokeStyle=CYAN;c.lineWidth=18;c.strokeRect(10,83,W-20,FLOOR-94);c.restore();
    }
    if(!paused){for(const p of this.ripples)p.life-=dt;this.ripples=this.ripples.filter(p=>p.life>0);for(const f of this.floaters){f.life-=dt;f.y-=30*dt;}this.floaters=this.floaters.filter(f=>f.life>0);}
    for(const p of this.ripples){c.save();c.globalAlpha=p.life/.55;const radius=40+(1-p.life/.55)*540;c.lineWidth=7;this.circle(p.x,p.y,radius,null,CYAN);c.lineWidth=2;this.circle(p.x,p.y,radius*.83,null,'#e6fff4');c.restore();}
    for(const f of this.floaters){c.save();c.globalAlpha=Math.min(1,f.life*2);c.font='18px MotionControl';c.fillStyle=f.color;c.textAlign='center';c.fillText(f.text,f.x,f.y);c.restore();}
  }
  missile(o,t){const c=this.c;if(o.warn>0){const x=matchMedia('(max-width:700px)').matches?760:1226,y=o.y; c.save();c.globalAlpha=.6+Math.sin(t*20)*.4;this.polygon([[x-16,y-20],[x+20,y],[x-16,y+20]],'#3e1731',PINK);c.fillStyle='#ffd0dd';c.font='bold 20px MotionControl';c.fillText('!',x-8,y+7);c.restore();this.line(0,y,W,y,'#fa2d8216',1);return}c.save();c.translate(o.x,o.y);const flame=24+Math.sin(t*40)*10;this.polygon([[28,-6],[28+flame,0],[28,6]],LIME);this.polygon([[-34,0],[-18,-10],[28,-10],[28,10],[-18,10]],'#aa6c9d','#ffb4d8');this.polygon([[0,-10],[15,-21],[19,-10]],'#fa2d82');this.polygon([[0,10],[15,21],[19,10]],'#fa2d82');this.line(-5,-7,-5,7,'#36203a',3);c.restore()}
  player(x,y,vy,held,scale=1,shield=false,board=false,blink=false,state='fall',age=0){
    const c=this.c,t=this.time,a=artistById(this.artist),pose=animationPose(state,age,this.reduced),h=a.height;
    if(scale===1&&this.activeRun?.mech>0){this.mech(x,y,held,this.activeRun.armor);return;}
    // Darken only the immediate backdrop and give the silhouette a light rim.
    if(scale===1){const halo=c.createRadialGradient(x,y,15,x,y,100);halo.addColorStop(0,'#0805138c');halo.addColorStop(1,'#08051300');c.fillStyle=halo;c.fillRect(x-100,y-100,200,200);}
    c.save();c.translate(x,y);c.scale(scale,scale);c.rotate(pose.tilt);c.scale(1/pose.squash,pose.squash);
    if(blink&&Math.floor(t*12)%2===0)c.globalAlpha=.65;
    const deathDrop=state==='over'&&!this.reduced?Math.min(12,age*25):0;c.translate(0,deathDrop);
    if(this.artist!=='puppet'){
      const packX=-23,packY=-12;
      this.polygon([[packX-10,packY-14],[packX+8,packY-17],[packX+13,packY+21],[packX-8,packY+24]],'#332940',this.skin);
      this.line(packX-6,packY-7,packX+6,packY-7,LIME,3);
      if(held&&state!=='over')this.flame(packX,packY+22,t);
      c.save();c.scale(-1,1);this.drawFighter(c,a.id,pose.frame,h,h/2,pose.bob);c.restore();
    }else{
      // Articulated suit: independent legs, arms, head sway and jet exhaust.
      c.scale(1.4,1.4);
      this.polygon([[-30,-12],[-18,-17],[-11,17],[-28,22]],'#5d3e82',this.skin);
      if(held&&state!=='over')this.flame(-24,20,t);
      c.save();c.translate(-5,23);c.rotate(pose.leg);this.polygon([[-7,0],[3,0],[4,14],[-8,14]],'#68537b');this.line(-9,15,5,15,LIME,3);c.restore();
      c.save();c.translate(7,22);c.rotate(-pose.leg-.16);this.polygon([[-4,0],[5,0],[12,12],[5,16]],'#68537b');this.line(5,16,15,12,this.skin,3);c.restore();
      this.polygon([[-11,3],[9,3],[16,23],[1,29],[-12,23]],'#251d37',this.skin);
      c.save();c.translate(10,8);c.rotate((state==='thrust'?-.55:0)+pose.leg*.4);this.line(0,0,9,10,'#e88aba',5);c.restore();
      if(this.puppet){const headH=60,w=headH*this.puppet.width/this.puppet.height;c.save();c.translate(0,pose.bob*.4);c.rotate(pose.leg*.06);c.shadowColor='#f8daee';c.shadowBlur=1.5;c.drawImage(this.puppet,-w/2,-47,w,headH);c.restore();}
      c.scale(1/1.4,1/1.4);
    }
    if(board){const y=h/2+5;c.shadowBlur=10;c.shadowColor='#410380';this.polygon([[-42,y],[37,y-4],[45,y+2],[-32,y+9]],'#8450c4','#d5b5ff');this.line(-27,y+9,33,y+5,CYAN,2);c.shadowBlur=0;for(let i=0;i<3;i++){const px=-27+i*27;this.line(px,y+10,px-7,y+23+Math.sin(t*30+i)*4,'#c3a1ff',3);}}
    if(shield){c.lineWidth=2;c.strokeStyle=CYAN;c.shadowColor=CYAN;c.shadowBlur=8;c.beginPath();c.ellipse(0,0,h*.48,h*.57,0,0,Math.PI*2);c.stroke();c.shadowBlur=0;}
    c.restore();
  }
  flame(x,y,t){
    const c=this.c,f=23+Math.sin(t*42)*7;c.save();c.shadowBlur=12;c.shadowColor=this.skin;
    this.polygon([[x-8,y],[x-4,y+f],[x+7,y]],this.skin);this.polygon([[x-5,y+2],[x-3,y+f*.7],[x+3,y+2]],LIME);c.restore();
  }
  burst(x,y,color,count=14){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=60+Math.random()*160;this.fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.6,max:.6,color})}}
  event(e){
    if(e.kind==='hit'){this.hitUntil=this.time+.32;this.burst(e.x,e.y,e.protected?CYAN:PINK,30);if(!this.reduced)this.shake=e.protected?5:10;}
    else if(e.kind==='note'){this.burst(e.x,e.y,CYAN,4);this.floaters.push({x:e.x,y:e.y-20,text:'+'+e.points,color:CYAN,life:.65});}
    else if(e.kind==='destroy'){this.burst(e.x,e.y,e.cause==='mech'?'#dcf105':CYAN,26);this.floaters.push({x:e.x,y:e.y,text:'+'+e.points,color:LIME,life:.8});}
    else if(e.kind==='pulse'){this.ripples.push({x:e.x,y:e.y,life:.55});this.scenery.pulseAt=this.time;}
    else if(e.kind==='drop'){this.scenery.pulseAt=this.time;this.burst(e.x,e.y,LIME,65);if(!this.reduced)this.shake=4;}
    else if(['shield','board','mech','boost'].includes(e.kind))this.burst(e.x,e.y,CYAN,28);
    this.fx=this.fx.slice(-400);this.floaters=this.floaters.slice(-30);
  }
  draw(run,dt,home=false,held=false,paused=false){
    if(!paused)this.time+=dt;const t=this.time,c=this.c;this.skin=this.skin||PINK;this.activeRun=home?null:run;
    c.save();if(this.shake>0){c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);this.shake=Math.max(0,this.shake-dt*35)}
    const offset=home?(this.reduced?0:t*35):run.distance*15;this.background(offset,home,held);
    if(!home){
      for(const p of run.pickups)this.pickup(p,t);for(const o of run.obstacles)o.kind==='gate'?this.gate(o,t):o.kind==='laser'?this.laser(o,t):this.missile(o,t);for(const shot of run.projectiles)this.projectile(shot);
      if(!paused)this.lastHeld=held;
      const state=paused&&this.motion?this.motion:animationState({over:run.phase==='over',hit:this.time<this.hitUntil,board:run.board>0||run.mech>0,held,grounded:run.y>=FLOOR-BODY_HALF_HEIGHT-1});
      if(state!==this.motion){this.motion=state;this.motionAt=this.time;}
      this.player(run.x,run.y,run.vy,(paused?this.lastHeld:held)&&run.phase==='running',1,run.shield>0,run.board>0,run.invulnerable>0,state,this.time-this.motionAt);
      this.arcadeEffects(run,dt,paused);this.canvas.dataset.mode=run.mech>0?'mech':run.drop>0?'drop':run.board>0?'board':'jetpack';this.canvas.dataset.animation=state;this.canvas.dataset.pose=animationPose(state,this.time-this.motionAt,this.reduced).frame;
    }else{this.canvas.dataset.animation='idle';this.canvas.dataset.pose=animationPose('idle',this.time,this.reduced).frame;}
    if(!paused){for(const [canvas,entry] of this.previews){if(!canvas.isConnected){this.previews.delete(canvas);continue;}const key=animationPose('idle',this.time+(entry.id==='matar'?.3:0),this.reduced).frame;if(key!==entry.lastFrame){this.drawPortrait(canvas,entry.id);entry.lastFrame=key;}}}
    if(!paused){for(const p of this.fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt}this.fx=this.fx.filter(p=>p.life>0)}
    for(const p of this.fx){c.globalAlpha=p.life/p.max;c.fillStyle=p.color;c.fillRect(p.x,p.y,3,3)}c.globalAlpha=1;c.restore();
  }
}
