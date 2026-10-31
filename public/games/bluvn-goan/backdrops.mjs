import {BRAND as B,DNB_BPM} from './theme.mjs';
export const VENUES=Object.freeze([{id:'stage',name:'LIVE STAGE'},{id:'studio',name:'RECORDING STUDIO'}]);
// An artist's venue is fixed for the complete run, regardless of distance or act.
export function venueAt(_distance,artist='puppet'){return VENUES[artist==='gauthier'?1:0];}
export class MusicalBackdrops {
  constructor(){this.surface=document.createElement('canvas');this.surface.width=640;this.surface.height=320;this.c=this.surface.getContext('2d');this.pulseAt=-100;this.images={};}
  setImages(images){this.images=images;}
  rect(x,y,w,h,color){this.c.fillStyle=color;this.c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  line(x,y,x2,y2,color,width=1){const c=this.c;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(x2),Math.round(y2));c.stroke();}
  speaker(x,y,beat){
    const c=this.c;this.rect(x-2,y-2,29,76,'#37233d');this.rect(x,y,25,72,'#0b0912');this.rect(x+2,y+2,21,2,'#605063');
    for(const yy of [y+20,y+51]){c.strokeStyle='#514357';c.lineWidth=2;c.beginPath();c.arc(x+12,yy,9+beat*.8,0,Math.PI*2);c.stroke();c.strokeStyle='#211b2c';c.beginPath();c.arc(x+12,yy,5,0,Math.PI*2);c.stroke();this.rect(x+10,yy-2,4,4,beat>.75?B.pink:'#7f4c76');}
    this.rect(x+3,y+65,6,2,B.purple);this.rect(x+17,y+65,3,2,B.pink);
  }
  draw(target,{distance=0,time=0,playerY=320,held=false,drop=false,artist='puppet',reduced=false,beatTime=time*DNB_BPM/60,energy=null,build=0}={}){
    const c=this.c,v=venueAt(distance,artist),img=this.images[v.id],travel=reduced?0:distance*7.5,t=reduced?0:time;
    const beat=reduced?.2:Number.isFinite(energy)?energy:Math.pow(Math.max(0,1-beatTime%1),3)*.25;
    const pulse=reduced?0:Math.max(0,1-(time-this.pulseAt)/.9),tilt=reduced?0:(320-playerY)*.009;
    c.clearRect(0,0,640,320);this.rect(0,0,640,320,B.ink);c.imageSmoothingEnabled=false;
    // Illustrated rear wall, slow travel and mirrored joins: one continuous venue.
    if(img){
      const h=350,w=Math.ceil(h*img.width/img.height),offset=(travel*.065)%(2*w);
      const start=Math.floor((travel*.065)/w);
      for(let j=-1;j<3;j++){
        const absolute=start+j,x=absolute*w-travel*.065;
        c.save();c.translate(Math.round(x+(absolute%2?w:0)),Math.round(-18+tilt));if(absolute%2)c.scale(-1,1);c.drawImage(img,0,0,w,h);c.restore();
      }
    }
    const shade=c.createLinearGradient(0,0,0,320);shade.addColorStop(0,'#02010540');shade.addColorStop(.4,'#02010536');shade.addColorStop(.85,'#02010570');shade.addColorStop(1,'#020105a8');c.fillStyle=shade;c.fillRect(0,0,640,320);
    c.fillStyle='#41038018';c.fillRect(0,35,640,250);
    // Separate light layer. Keep animation gentle and behind all gameplay objects.
    c.save();c.globalCompositeOperation='screen';
    for(let j=-1;j<5;j++){
      const x=j*185+45-(travel*.13%185),sway=reduced?0:Math.sin(t*.3+j)*21+(320-playerY)*.045;
      const gradient=c.createLinearGradient(x,40,x+sway,277);gradient.addColorStop(0,(j%2?B.pink:B.yellow)+'22');gradient.addColorStop(1,(j%2?B.pink:B.yellow)+'00');
      c.globalAlpha=.4+beat*.25+pulse*.15+build*.12;c.fillStyle=gradient;c.beginPath();c.moveTo(x-3,37);c.lineTo(x+3,37);c.lineTo(x+sway+53,277);c.lineTo(x+sway-53,277);c.closePath();c.fill();
    }
    c.restore();
    // Rig layer moves faster than the artwork, without crossing the flight lane.
    this.rect(0,0,640,34,'#08060fe8');this.rect(0,34,640,1,'#70425e');
    for(let j=-1;j<10;j++){
      const x=j*90-(travel*.3%90);this.line(x,9,x+90,9,'#57435e',2);this.line(x,24,x+90,24,'#57435e',2);this.line(x,9,x+45,24,'#392b45');this.line(x+45,24,x+90,9,'#392b45');
      this.rect(x+34,26,15,7,'#19121f');this.rect(x+37,32,9,2,beat>.8?B.yellow:B.pink);
    }
    // Tiny dust and audience glow add life without flashing the entire screen.
    if(!reduced){for(let i=0;i<22;i++){const x=(i*79-travel*.09+12800)%640,y=52+(i*47)%212+Math.sin(t*.5+i)*3;c.globalAlpha=.09+beat*.08;this.rect(x,y,1,i%3?1:2,'#ffe2f7');}c.globalAlpha=1;}
    // Near edge scrolls at runway speed and stays below the player's feet.
    this.rect(0,284,640,36,'#0c0913');this.rect(0,284,640,2,B.pink);this.rect(0,287,640,2,'#55213f');
    for(let j=-1;j<12;j++){
      const x=j*72-(travel%72);this.rect(x,295,66,18,'#19111f');this.line(x+2,296,x+64,296,'#4a304a');this.line(x+2,311,x+64,311,'#291b32');
      for(let k=0;k<7;k++)this.rect(x+6+k*8,300,2,6,'#33213c');
      this.rect(x+6,289,17,1,held?B.yellow:'#9a335c');
    }
    // Passing speaker cabinets sit safely behind the player near the stage edge.
    for(let j=-1;j<4;j++){const x=j*310-(travel*.21%310);c.save();c.globalAlpha=.65;this.speaker(x+278,211,beat);c.restore();}
    if(drop){this.rect(0,284,640,2,B.yellow);this.rect(0,35,640,1,B.yellow);}
    target.save();target.imageSmoothingEnabled=false;target.drawImage(this.surface,0,0,1280,640);target.restore();return v;
  }
}
