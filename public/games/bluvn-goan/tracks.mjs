// Existing Skumic MP3s, copied byte-for-byte from the user's skumic-game/assets.
// Approximate BPM values from the original game. Drop cues are authored at strong bass/drum transitions; see evidence/music-cues-v4.json.
export const TRACKS=Object.freeze([
  {id:'ca-va-peter',title:'ÇA VA PÉTER',artist:'SKUMIC',src:'assets/ca-va-peter.mp3',bpm:174,drops:[33.2,87.5,109.5]},
  {id:'project-ravy-2',title:'PROJECT RAVY 2.0',artist:'SKUMIC / POINT.BLANK',src:'assets/project-ravy-2.mp3',bpm:175,drops:[95,216]},
  {id:'puber',title:'PUBER',artist:'SKUMIC',src:'assets/puber.mp3',bpm:175,drops:[54,98,142],timingSource:'Confirmed by the user: 0:54, 1:38, 2:22'},
  {id:'manosfeer',title:'MANOSFEER',artist:'SKUMIC',src:'assets/manosfeer.mp3',bpm:174,drops:[33.5,110.5]},
]);
export const trackById=id=>TRACKS.find(t=>t.id===id)||TRACKS[0];
