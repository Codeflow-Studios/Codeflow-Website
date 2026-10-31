import {cleanDropTimes} from './drop-timings.mjs';
import {TRACKS,trackById} from './tracks.mjs';
import {ARTISTS,artistById} from './characters.mjs';
export const SAVE='skumic-jetpack-v1';
const stat = value=>Number.isFinite(value)?Math.max(0,value):0;
const legacyQuests={0:'first-flight',2:'gates',3:'long-flight',4:'powerups'};
export function readProfile(value){
  const p=value&&[1,2,3].includes(value.version)?value:{};
  const history=Array.isArray(p.history)?p.history.filter(h=>h&&Number.isFinite(h.distance)).slice(0,8).map(h=>({distance:stat(h.distance),score:stat(h.score),gates:stat(h.gates),artist:artistById(h.artist).id,date:typeof h.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(h.date)?h.date:''})):[];
  const valid=['first-flight','gates','close-calls','long-flight','powerups','airtime'];
  const missions=[...new Set((Array.isArray(p.missions)?p.missions:[]).map(id=>p.version===1?legacyQuests[id]:id).filter(id=>valid.includes(id)))];
  const dropTimings={};for(const t of TRACKS)if(Array.isArray(p.dropTimings?.[t.id]))dropTimings[t.id]=cleanDropTimes(p.dropTimings[t.id]);
  return {version:3,dropTimings,bestScore:stat(p.bestScore),totalNotes:stat(p.totalNotes),totalBreaks:stat(p.totalBreaks),totalDrops:stat(p.totalDrops),best:stat(p.best),totalDistance:stat(p.totalDistance),totalPowerups:stat(p.totalPowerups),runs:stat(p.runs),gatesBest:stat(p.gatesBest),nearBest:stat(p.nearBest),airBest:stat(p.airBest),artist:ARTISTS.some(a=>a.id===p.artist)?p.artist:'puppet',missions,history,track:trackById(p.track).id,musicVolume:Number.isFinite(p.musicVolume)?Math.max(0,Math.min(1,p.musicVolume)):.04,sound:typeof p.sound==='boolean'?p.sound:true};
}
