export function cleanDropTimes(values){return [...new Set((Array.isArray(values)?values:[]).filter(n=>Number.isFinite(n)&&n>=0&&n<=3600).map(n=>Math.round(n*10)/10))].sort((a,b)=>a-b);}
export function parseDropTimes(value){
 if(!value.trim())return [];
 return cleanDropTimes(value.split(',').map(raw=>{const text=raw.trim();if(!/^\d+(?::[0-5]\d(?:\.\d)?)?$/.test(text))throw new Error('Gebruik 0:54, 1:38, 2:22.');const parts=text.split(':');const n=parts.length===2?Number(parts[0])*60+Number(parts[1]):Number(parts[0]);if(n>3600)throw new Error('Een tijdstip moet binnen het nummer vallen.');return n;}));
}
export function dropTimeLabel(seconds){return Math.floor(seconds/60)+':'+(seconds%60).toFixed(seconds%1?1:0).padStart(seconds%1?4:2,'0');}
