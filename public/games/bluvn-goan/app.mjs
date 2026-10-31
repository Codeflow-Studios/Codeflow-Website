import {parseDropTimes,dropTimeLabel} from './drop-timings.mjs';
import {createRun,step,pulse,challengeProgress,triggerMusicDrop} from './engine.mjs';
import {ArcadeSound} from './sound.mjs';
import {TRACKS} from './tracks.mjs';
import {venueAt} from './backdrops.mjs';
import {Renderer} from './renderer.mjs';
import {ARTISTS,artistById} from './characters.mjs';
import {SAVE,readProfile} from './profile.mjs';

const $=id=>document.getElementById(id),canvas=$('game'),renderer=new Renderer(canvas),sound=new ArcadeSound($('soundtrack'));
let profile=readProfile(null),storageOK=true;
try{profile=readProfile(JSON.parse(localStorage.getItem(SAVE)||'null'))}catch{storageOK=false}
let run=null,mode='home',keyHeld=false,pointerHeld=false,settled=true;
let activeArtist=profile.artist,last=performance.now(),accumulator=0,lastUi=0,toastUntil=0,returnFocus=null,crashStarted=0;

const quests=[
  {id:'first-flight',title:'FIRST CONTACT',text:'Fly 150 metres in one run.',symbol:'↗',goal:150,value:()=>Math.max(profile.best,run?.distance||0)},
  {id:'gates',title:'GATECRASHER',text:'Dodge 8 electric gates in one run.',symbol:'ϟ',goal:8,value:()=>Math.max(profile.gatesBest,run?.gatesDodged||0)},
  {id:'close-calls',title:'CUT IT CLOSE',text:'Make 3 near misses in one run.',symbol:'✳',goal:3,value:()=>Math.max(profile.nearBest,run?.nearMisses||0)},
  {id:'long-flight',title:'LONG WAY HOME',text:'Fly 500 metres in one run.',symbol:'⤴',goal:500,value:()=>Math.max(profile.best,run?.distance||0)},
  {id:'powerups',title:'FULLY CHARGED',text:'Collect 3 power-ups across flights.',symbol:'◇',goal:3,value:()=>profile.totalPowerups+(settled?0:run?.powerupsCollected||0)},
  {id:'airtime',title:'AIRPLAY',text:'Spend 30 seconds airborne in one run.',symbol:'≋',goal:30,value:()=>Math.max(profile.airBest,run?.airTime||0)},
];

function save(){
  try{localStorage.setItem(SAVE,JSON.stringify(profile))}catch{storageOK=false}
  $('save-status').innerHTML=storageOK?'PROGRESS SAVED ON THIS DEVICE <i></i>':'PROGRESS AVAILABLE FOR THIS SESSION';
}
function tone(kind){sound.effect(kind)}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;toastUntil=performance.now()+2200}
function updateSound(){const b=$('sound');b.setAttribute('aria-label',profile.sound?'Turn sound off':'Turn sound on');b.querySelector('.mute-slash').hidden=profile.sound}
function artistMarkup(a){return `<button class="artist-card ${profile.artist===a.id?'selected':''}" data-artist="${a.id}" aria-label="Play as ${a.name}" aria-pressed="${profile.artist===a.id}" style="--artist-color:${a.color}"><canvas width="160" height="190" data-portrait="${a.id}" aria-hidden="true"></canvas><span class="artist-copy"><strong>${a.name}</strong><small>${a.subtitle}</small><em>${a.scene}</em></span><span class="artist-check" aria-hidden="true">${profile.artist===a.id?'✓':'↗'}</span></button>`}
function bindArtists(container){
  for(const b of container.querySelectorAll('[data-artist]'))b.onclick=()=>{
    profile.artist=b.dataset.artist;save();updateProfile();
    if($('modal').open&&$('modal-body').querySelector('.artist-modal'))renderArtistsModal();
    if(mode!=='home')toast(`${artistById(profile.artist).name} SELECTED FOR YOUR NEXT FLIGHT`);
  };
  for(const c of container.querySelectorAll('[data-portrait]'))renderer.paintPortrait(c,c.dataset.portrait);
}
function updateProfile(){
  $('home-best').textContent=String(Math.floor(profile.best)).padStart(4,'0');
  const artist=artistById(profile.artist);
  if(mode==='home')renderer.setArtist(artist.id);
  $('choose-artist').textContent=artist.name+' ▾';$('selected-name').textContent=artist.name;$('selected-scene').textContent=artist.scene;
  $('artist-picker').innerHTML=ARTISTS.map(artistMarkup).join('');bindArtists($('artist-picker'));
  updateMissions();updateSound();
}
function missionMarkup(q){
  const complete=profile.missions.includes(q.id),v=Math.min(q.goal,Math.floor(q.value()));
  return `<article class="mission-card ${complete?'completed':''}"><div class="mission-symbol">${complete?'✓':q.symbol}</div><div class="mission-copy"><h3>${q.title}</h3><p>${q.text}</p><div class="mission-progress" role="progressbar" aria-label="${q.title}" aria-valuenow="${complete?q.goal:v}" aria-valuemin="0" aria-valuemax="${q.goal}"><span style="width:${complete?100:v/q.goal*100}%"></span></div><div class="mission-numbers"><span>${complete?'COMPLETE':`${v} / ${q.goal}`}</span><strong>${complete?'BADGE EARNED':'FLIGHT CHALLENGE'}</strong></div></div></article>`;
}
function updateMissions(){
  const pending=quests.filter(q=>!profile.missions.includes(q.id));
  $('missions').innerHTML=(pending.length?pending.slice(0,3):quests.slice(0,3)).map(missionMarkup).join('');
  $('mission-count').textContent=`${profile.missions.length} / 6 COMPLETE`;
}
function setMode(next){
  mode=next;$('home').hidden=next!=='home';$('hud').hidden=next==='home';$('pause-panel').hidden=next!=='paused';$('results').hidden=next!=='over';
  $('power-status').hidden=next!=='running';$('run-hint').hidden=next!=='running';$('arcade-hud').hidden=next==='home';$('live-goal').hidden=next!=='running';$('pulse-action').hidden=next==='home'||next==='over';$('pulse-action').disabled=next!=='running';
  keyHeld=pointerHeld=false;accumulator=0;last=performance.now();
}
function start(){
  run=createRun(crypto.getRandomValues(new Uint32Array(1))[0]);activeArtist=profile.artist;renderer.setArtist(activeArtist);
  settled=false;renderer.fx=[];renderer.motion=null;renderer.hitUntil=0;renderer.floaters=[];renderer.ripples=[];crashStarted=0;sound.unlock();setMode('running');sound.update(true);$('start').blur();canvas.focus({preventScroll:true});tone('start');updateUI();
}
function finish(){
  if(settled||!run)return;
  settled=true;const previous=profile.best;
  profile.runs++;profile.bestScore=Math.max(profile.bestScore,Math.floor(run.score));profile.totalNotes+=run.notesCollected;profile.totalBreaks+=run.hazardsDestroyed;profile.totalDrops+=run.drops;profile.best=Math.max(profile.best,Math.floor(run.distance));profile.totalPowerups+=run.powerupsCollected;
  profile.totalDistance+=Math.floor(run.distance);profile.gatesBest=Math.max(profile.gatesBest,run.gatesDodged);
  profile.nearBest=Math.max(profile.nearBest,run.nearMisses);profile.airBest=Math.max(profile.airBest,run.airTime);
  profile.history.unshift({distance:Math.floor(run.distance),gates:run.gatesDodged,score:Math.floor(run.score),artist:activeArtist,date:new Date().toISOString().slice(0,10)});
  profile.history=profile.history.slice(0,8);
  let badges=0;for(const q of quests)if(!profile.missions.includes(q.id)&&q.value()>=q.goal){profile.missions.push(q.id);badges++}
  save();updateProfile();
  $('result-label').textContent=run.distance>previous?'NEW PERSONAL BEST!':'THAT WAS LOUD.';
  $('result-distance').textContent=Math.floor(run.distance);$('result-gates').textContent=run.gatesDodged;$('result-best').textContent=profile.best+' m';$('result-score').textContent=Math.floor(run.score).toLocaleString();$('result-breaks').textContent=run.hazardsDestroyed;
  $('result-note').textContent=badges?`${badges} NEW SIDE QUEST ${badges===1?'BADGE':'BADGES'} EARNED`:(run.drops?run.drops+' DROP'+(run.drops===1?'':'S')+' · '+run.challengesCompleted+' SETLIST GOALS':'Follow the notes. Build hype. Hit the drop.');
  setMode('over');$('retry').focus({preventScroll:true});
}
function pause(){if(mode==='running'){setMode('paused');$('resume').focus({preventScroll:true})}}
function resume(){if(mode==='paused'){setMode('running');canvas.focus({preventScroll:true})}}
function home(){if(run&&!settled)finish();setMode('home');run=null;updateProfile();$('start').focus({preventScroll:true})}
function updateUI(){
  if(!run)return;
  const artist=artistById(activeArtist);
  $('distance').textContent=String(Math.floor(run.distance)).padStart(4,'0');$('run-artist').textContent=artist.name;$('sector').textContent=run.act+' / '+venueAt(run.distance,activeArtist).name;$('run-score').textContent=Math.floor(run.score).toLocaleString();$('run-combo').textContent='×'+run.combo;$('run-combo').hidden=run.combo<2;
  $('hype-fill').style.width=(run.drop>0?run.drop/run.dropDuration*100:run.hype)+'%';$('hype-label').textContent=run.drop>0?'THE DROP · '+Math.ceil(run.drop)+'s':sound.untilDrop()<=4?'DROP IN '+Math.ceil(sound.untilDrop()):run.dropReady?'NEXT DROP · ×5':'HYPE · '+Math.floor(run.hype)+'%';$('arcade-hud').classList.toggle('dropping',run.drop>0);
  const goal=challengeProgress(run);$('live-goal').textContent='SETLIST / '+goal.name+' · '+goal.progress+'/'+goal.target;
  $('pulse-action').disabled=mode!=='running'||run.pulseCooldown>0;$('pulse-action').classList.toggle('ready',run.pulseCooldown===0);$('pulse-label').textContent=run.pulseCooldown>0?'PULSE · '+Math.ceil(run.pulseCooldown)+'s':'SONIC PULSE';
  $('power-status').innerHTML=['shield','board','mech','drop'].filter(k=>run[k]>0).map(k=>`<span class="power-pill">${k==='board'?'RAVEBOARD':k==='mech'?'BASS MECH · '+run.armor+' HP':k==='drop'?'INVINCIBLE':'SHIELD'} · ${Math.ceil(run[k])}s</span>`).join('');
  $('run-hint').hidden=mode!=='running'||run.t>9;
}
function receiveEvents(){
  for(const e of run.events){
    renderer.event(e);tone(e.kind);
    if(e.kind==='drop')toast(e.charged?'HYPE DROP! · ×5 · SMASH EVERYTHING':'MUSIC DROP! · SPEED UP · SMASH EVERYTHING');
    else if(e.kind==='hype-ready')toast('HYPE FULL · NEXT MUSIC DROP = ×5');
    else if(e.kind==='mech')toast('BASS MECH · AUTO FIRE · 2 ARMOR');
    else if(e.kind==='board')toast('RAVEBOARD · SPEED + ONE HIT');
    else if(e.kind==='shield')toast('SHIELD UP');
    else if(e.kind==='challenge')toast('SETLIST COMPLETE · +150');
    else if(e.kind==='near')toast('CLOSE CALL! · +HYPE');
    else if(e.kind==='act')toast(e.name+' / NEW SET');
  }
  run.events=[];
}
function usePulse(){if(mode==='running'&&pulse(run)){receiveEvents();updateUI();canvas.focus({preventScroll:true});}}
function frame(now){
  const dt=Math.min((now-last)/1000,.05);last=now;sound.update(mode==='running');
  if(mode==='running'){
    for(const event of sound.consumeDrops())triggerMusicDrop(run,event.duration);receiveEvents();renderer.musicBuild=Math.max(0,1-sound.untilDrop()/4);
    accumulator+=dt;
    while(accumulator>=1/120&&mode==='running'){
      step(run,1/120,keyHeld||pointerHeld);accumulator-=1/120;
      receiveEvents();
      if(run.phase==='over'){setMode('crashing');crashStarted=now;}
    }
  }
  if(mode==='crashing'&&now-crashStarted>=600)finish();
  renderer.beatTime=sound.visualBeat(run?.t||renderer.time);renderer.musicEnergy=sound.energy();renderer.draw(run,dt,mode==='home',keyHeld||pointerHeld,mode==='paused');
  if(now-lastUi>100){updateUI();const audioState=$('soundtrack').dataset.state;$('track-status').textContent=audioState==='playing'?'NOW PLAYING':audioState==='error'?'TRACK UNAVAILABLE':audioState==='blocked'?'TAP ♪ TO PLAY':!profile.sound?'MUTED · M TO PLAY':mode==='paused'?'PAUSED':'START A FLIGHT TO PLAY';lastUi=now}
  if(now>toastUntil)$('toast').hidden=true;requestAnimationFrame(frame);
}
function escapeText(value){return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
function renderArtistsModal(){
  $('modal-body').innerHTML=`<div class="artist-modal"><h2 class="modal-title">CHOOSE YOUR ARTIST.</h2><p class="modal-intro">Skumic, Gauthier or Matar. Everyone is ready to fly.<br>${mode==='home'?'Your artist sets the opening venue. Your venue stays the same for the complete flight.':'Choose an artist for your next flight.'}</p><div class="artist-modal-grid">${ARTISTS.map(artistMarkup).join('')}</div></div>`;
  bindArtists($('modal-body'));
}
function openModal(kind){
  if(mode==='running')pause();returnFocus=document.activeElement;
  $('modal-kicker').textContent=kind==='artists'?'THE SKUMIC LINEUP':kind==='log'?'EVERY FLIGHT COUNTS':'A QUICK BRIEFING';
  if(kind==='artists')renderArtistsModal();
  else if(kind==='log')$('modal-body').innerHTML=`<h2 class="modal-title">FLIGHT LOG.</h2><p class="modal-intro">Your best bad ideas, saved on this device.</p><div class="flight-row"><span>Flights taken</span><strong>${profile.runs}</strong></div><div class="flight-row"><span>Total distance</span><strong>${profile.totalDistance.toLocaleString()} m</strong></div><div class="flight-row"><span>Best arcade score</span><strong>${profile.bestScore.toLocaleString()}</strong></div><div class="flight-row"><span>Notes / hazards smashed / drops</span><strong>${profile.totalNotes} / ${profile.totalBreaks} / ${profile.totalDrops}</strong></div><div class="flight-row"><span>Personal best</span><strong>${profile.best} m</strong></div><h3 class="eyebrow" style="margin-top:28px">RECENT FLIGHTS</h3>${profile.history.length?profile.history.map(h=>`<div class="flight-row"><span>${escapeText(h.date)} · ${artistById(h.artist).name}</span><strong>${Math.floor(h.distance)} m <span style="color:#b7a4c9;font-size:10px;margin-left:18px">${Math.floor(h.score||0).toLocaleString()} pts</span></strong></div>`).join(''):'<p class="modal-intro">Your first flight is waiting. Let’s make some noise.</p>'}<h3 class="eyebrow" style="margin-top:28px">ALL SIDE QUESTS</h3><div class="all-missions">${quests.map(missionMarkup).join('')}</div>`;
  else $('modal-body').innerHTML=`<h2 class="modal-title">FLY. DODGE. REPEAT.</h2><p class="modal-intro">Choose your artist. Take the stage. You decide how high.</p><div class="help-grid"><div class="help-block"><h3>01 / TAKE CONTROL</h3><p>Hold <kbd>SPACE</kbd>, <kbd>↑</kbd>, your mouse or a finger on the game to rise. Release to fall. The floor and ceiling are safe.</p></div><div class="help-block"><h3>02 / STAY ALIVE</h3><p>Dodge straight and rotating zappers, laser lanes and missile volleys. A dashed laser line is safe until it fires. One unprotected hit ends the flight.</p></div><div class="help-block"><h3>03 / GET CHARGED</h3><p><b>◇ Shield:</b> one-hit protection.<br><b>≋ Raveboard:</b> speed and one hit.<br><b>▣ Bass Mech:</b> automatic fire and two armor hits.<br><b>ϟ THE DROP:</b> When the playing song reaches a marked drop, 10 seconds of speed, invincibility and extra score. The song keeps playing normally.</p></div><div class="help-block"><h3>04 / MAKE IT COUNT</h3><p>Collect music notes to build combos and HYPE. Fill it to supercharge the next drop in the song with a ×5 combo. Use <kbd>SHIFT</kbd>, <kbd>X</kbd> or the Pulse button to blast hazards away every 9 seconds. Complete live setlist goals for score and energy. <kbd>P</kbd> / <kbd>ESC</kbd> pauses, <kbd>M</kbd> toggles sound. Your illustrated studio or live-stage venue stays fixed throughout the run. Lights follow your flight and respond to the real Skumic soundtrack. Choose from four tracks below the game. Sonic Pulse lights up the scenery. Progress stays in this browser.</p></div></div>`;
  $('modal').showModal();
}
$('start').onclick=start;$('retry').onclick=start;$('pause').onclick=pause;$('resume').onclick=resume;$('quit').onclick=finish;$('home-button').onclick=home;
$('nav-play').onclick=()=>{if(mode==='home')$('start').focus();else if(mode==='paused')resume();else if(mode==='over')home();else canvas.focus()};
$('choose-artist').onclick=()=>openModal('artists');$('nav-artists').onclick=()=>openModal('artists');$('nav-log').onclick=()=>openModal('log');$('help').onclick=()=>openModal('help');
document.querySelector('.brand').onclick=e=>{e.preventDefault();if(mode==='running')pause();else if(mode==='over')home()};
$('track-select').innerHTML=TRACKS.map(t=>`<option value="${t.id}">${t.title}</option>`).join('');$('track-select').value=profile.track;sound.setTrack(profile.track);
$('music-volume').value=Math.round(profile.musicVolume*100);$('volume-value').textContent=Math.round(profile.musicVolume*100)+'%';sound.setVolume(profile.musicVolume);$('music-volume').oninput=()=>{profile.musicVolume=Number($('music-volume').value)/100;sound.setVolume(profile.musicVolume);$('volume-value').textContent=Math.round(profile.musicVolume*100)+'%';save();};
for(const [id,times] of Object.entries(profile.dropTimings))sound.setDropTimes(id,times);
function updateTiming(){ $('drop-times-input').value=sound.dropTimes().map(dropTimeLabel).join(', '); }
function saveTiming(){try{const times=parseDropTimes($('drop-times-input').value);profile.dropTimings[profile.track]=times;sound.setDropTimes(profile.track,times);save();updateTiming();$('timing-status').textContent='BEWAARD · '+sound.track.title;return true;}catch(error){$('timing-status').textContent=error.message;return false;}}
$('timing-toggle').onclick=()=>{$('timing-panel').hidden=!$('timing-panel').hidden;$('timing-toggle').setAttribute('aria-expanded',String(!$('timing-panel').hidden));updateTiming();};
$('save-drop-times').onclick=saveTiming;
$('mark-drop').onclick=()=>{const audio=$('soundtrack');if(audio.paused){$('timing-status').textContent='Start eerst een vlucht om mee te luisteren.';return;}const time=audio.currentTime;$('drop-times-input').value+=( $('drop-times-input').value?', ':'')+dropTimeLabel(Math.round(time*10)/10);if(saveTiming()&&mode==='running'){triggerMusicDrop(run);receiveEvents();updateUI();}};
$('track-select').onchange=()=>{profile.track=$('track-select').value;sound.setTrack(profile.track);if(run)run.dropDuration=sound.dropDuration();updateTiming();save();};
$('sound').onclick=()=>{profile.sound=!profile.sound;sound.setEnabled(profile.sound);updateSound();save();tone('start')};$('close-modal').onclick=()=>$('modal').close();
$('modal').addEventListener('close',()=>returnFocus?.focus({preventScroll:true}));
$('pulse-action').onclick=usePulse;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('game-shell').requestFullscreen)await $('game-shell').requestFullscreen();else toast('FULLSCREEN IS NOT AVAILABLE IN THIS BROWSER')}catch{toast('FULLSCREEN IS NOT AVAILABLE HERE')}};
canvas.addEventListener('pointerdown',e=>{if(mode!=='running')return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointerHeld=true;tone('thrust')});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>pointerHeld=false);
document.addEventListener('keydown',e=>{
  if($('modal').open||e.target.matches('select,option,input'))return;
  if(['ShiftLeft','ShiftRight','KeyX'].includes(e.code)&&!e.repeat){e.preventDefault();usePulse();return;}
  if(e.code==='KeyM'&&!e.repeat){$('sound').click();return}
  if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){if(mode==='running')pause();else if(mode==='paused')resume();e.preventDefault();return}
  if(['Space','ArrowUp','KeyW'].includes(e.code)){
    if(mode==='running'){e.preventDefault();keyHeld=true}
    else if(mode==='home'&&document.activeElement===canvas){e.preventDefault();start();keyHeld=true}
  }
});
document.addEventListener('keyup',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code))keyHeld=false});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
sound.enabled=profile.sound;save();updateProfile();await renderer.load();updateProfile();$('loading').hidden=true;requestAnimationFrame(frame);
