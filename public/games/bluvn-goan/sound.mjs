import {trackById} from './tracks.mjs';
// Real Skumic recordings for music; original short synthesised arcade effects.
export class ArcadeSound {
  constructor(audio){
    this.customDrops={};this.pendingDrops=[];this.lastMusicTime=0;this.dropIndex=0;this.volume=.04;this.audio=audio;this.enabled=false;this.context=null;this.voices=new Set();this.beat=0;this.playing=false;this.lastNote=0;this.pendingPlay=false;this.blocked=false;
    audio.loop=true;audio.volume=this.volume*.2;audio.muted=true;
    audio.addEventListener('playing',()=>{audio.dataset.state='playing';});
    audio.addEventListener('pause',()=>{audio.dataset.state=this.enabled?'paused':'muted';});
    audio.addEventListener('error',()=>{audio.dataset.state='error';this.blocked=true;});
    this.setTrack('ca-va-peter');
  }
  setTrack(id){
    const track=trackById(id);if(this.track?.id===track.id)return;
    this.audio.pause();this.track=track;this.pendingDrops=[];this.lastMusicTime=0;this.dropIndex=0;this.blocked=false;this.audio.dataset.track=track.id;this.audio.dataset.state='loading';this.audio.src=track.src;this.audio.load();
    if(this.playing)this.playMusic();
  }
  playMusic(){
    if(this.pendingPlay||this.blocked)return;
    this.pendingPlay=true;
    this.audio.play().then(()=>{this.pendingPlay=false;},error=>{this.pendingPlay=false;if(error.name!=='AbortError'){this.blocked=true;this.audio.dataset.state=error.name==='NotAllowedError'?'blocked':'error';}});
  }
  unlock(){
    this.audio.muted=!this.enabled;this.blocked=false;if(!this.enabled)return;
    try{
      if(!this.context){
        const Audio=window.AudioContext||window.webkitAudioContext;this.context=new Audio();
        this.master=this.context.createGain();this.master.gain.value=.02;this.master.connect(this.context.destination);
        const buffer=this.context.createBuffer(1,this.context.sampleRate*.3,this.context.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;this.noise=buffer;
      }
      if(!this.mediaSource){this.mediaSource=this.context.createMediaElementSource(this.audio);this.analyser=this.context.createAnalyser();this.analyser.fftSize=256;this.analyser.smoothingTimeConstant=.7;this.spectrum=new Uint8Array(this.analyser.frequencyBinCount);this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-14;this.limiter.knee.value=12;this.limiter.ratio.value=4;this.musicGain=this.context.createGain();this.musicGain.gain.value=this.volume*.2;this.mediaSource.connect(this.analyser).connect(this.limiter).connect(this.musicGain).connect(this.context.destination);this.audio.volume=1;}
      if(this.context.state==='suspended')this.context.resume();
    }catch{}
  }
  stop(){for(const node of this.voices){try{node.stop()}catch{}}this.voices.clear();this.audio.pause();}
  setEnabled(value){
    this.enabled=value;this.audio.muted=!value;
    if(value){this.unlock();if(this.playing)this.playMusic();}
    else{for(const node of this.voices){try{node.stop()}catch{}}this.voices.clear();}
    this.audio.dataset.state=value?(this.audio.paused?'paused':'playing'):'muted';
  }
  voice(node,gain,time,duration){
    const c=this.context,g=c.createGain();g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),time+.005);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    node.connect(g).connect(this.master);node.onended=()=>{this.voices.delete(node);node.disconnect();g.disconnect()};this.voices.add(node);node.start(time);node.stop(time+duration+.015);
  }
  oscillator(freq,time,duration,gain,type='triangle',end=freq){const o=this.context.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,time);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);this.voice(o,gain,time,duration);}
  hiss(time,duration,gain,high=4500){
    const n=this.context.createBufferSource(),f=this.context.createBiquadFilter();n.buffer=this.noise;f.type='highpass';f.frequency.value=high;n.connect(f);
    const g=this.context.createGain();g.gain.setValueAtTime(gain,time);g.gain.exponentialRampToValueAtTime(.0001,time+duration);f.connect(g).connect(this.master);
    n.onended=()=>{this.voices.delete(n);n.disconnect();f.disconnect();g.disconnect()};this.voices.add(n);n.start(time);n.stop(time+duration);
  }
  visualBeat(fallback=0){return !this.audio.paused?this.audio.currentTime*this.track.bpm/60:fallback*this.track.bpm/60;}
  energy(){
    if(!this.enabled||this.audio.paused||!this.analyser)return null;
    this.analyser.getByteFrequencyData(this.spectrum);let energy=0;
    for(let i=1;i<12;i++)energy+=this.spectrum[i];return Math.min(1,energy/11/220);
  }
  effect(kind){
    if(kind==='drop')return; // Gameplay follows the song; never seek or change its gain.
    if(!this.enabled||!this.context||this.context.state!=='running')return;
    const t=this.context.currentTime;
    if(kind==='note'){if(t-this.lastNote<.07)return;this.lastNote=t;this.oscillator(660+(this.beat%5)*110,t,.08,.08);}
    else if(kind==='shot')this.oscillator(240,t,.08,.055,'square',95);
    else if(kind==='pulse'){this.oscillator(200,t,.4,.2,'sawtooth',32);this.hiss(t,.2,.07,800);}
    else if(kind==='hit'){this.oscillator(95,t,.2,.14,'sawtooth',32);this.hiss(t,.12,.08,700);}
    else if(kind==='destroy')this.oscillator(150,t,.11,.055,'square',40);
    else if(['shield','board','mech','boost','challenge','start'].includes(kind))this.oscillator(420,t,.16,.1,'triangle',840);
    else if(kind==='near')this.oscillator(720,t,.1,.07,'sine',1000);
  }
  setVolume(value){
    this.volume=Math.max(0,Math.min(1,Number(value)||0));
    if(this.musicGain)this.musicGain.gain.setTargetAtTime(this.volume*.2,this.context.currentTime,.04);
    else this.audio.volume=this.volume*.2;
  }
  dropDuration(){return 10;}
  update(playing){
    const wasPlaying=this.playing;this.playing=playing;
    this.beat=Math.floor(this.visualBeat());
    if(!playing){if(!this.audio.paused||wasPlaying)this.stop();return;}
    if(this.audio.paused)this.playMusic();
    const time=this.audio.currentTime;
    if(time<this.lastMusicTime-1)this.dropIndex=0; // Natural song loop.
    while(this.dropIndex<this.dropTimes().length&&time>=this.track.drops[this.dropIndex]){
      const at=this.track.drops[this.dropIndex++];
      if(at>this.lastMusicTime||time<this.lastMusicTime)this.pendingDrops.push({at,duration:this.dropDuration()});
    }
    this.lastMusicTime=time;
  }
  dropTimes(){return this.customDrops[this.track.id]||this.track.drops;}
  setDropTimes(id,times){this.customDrops[id]=times;if(this.track.id===id){this.dropIndex=times.filter(t=>t<=this.audio.currentTime).length;this.lastMusicTime=this.audio.currentTime;this.pendingDrops=[];}}
  consumeDrops(){const events=this.pendingDrops;this.pendingDrops=[];return events;}
  untilDrop(){const next=this.track.drops[this.dropIndex];return next===undefined?Infinity:Math.max(0,next-this.audio.currentTime);}
}
