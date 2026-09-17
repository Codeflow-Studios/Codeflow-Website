'use client';
import { ArrowUpRight, Gamepad2, Monitor, Music2 } from 'lucide-react';
import type { Language } from './shared';

export default function GameShowcase({lang}:{lang:Language}){
 const en=lang==='en';
 return <section className="game-section container" id="game">
  <div className="section-heading"><div><p className="eyebrow">04 / {en?'GAMES BY CODEFLOW':'GAMES DOOR CODEFLOW'}</p><h2>{en?<>Two worlds.<br/><span>One studio.</span></>:<>Twee werelden.<br/><span>Eén studio.</span></>}</h2></div><p className="section-intro">{en?'We turn concepts into playable systems, from a C# office RPG to a browser runner driven by Skumic tracks.':'We vertalen concepten naar speelbare systemen: van een C#-kantoor-RPG tot een browserrunner op tracks van Skumic.'}</p></div>
  <div className="games-grid">
   <article className="game-card tower-card"><div className="game-card-media"><img src="/games/codeflow-tower/studio.webp" alt={en?'Codeflow Tower studio floor':'Studiovloer uit Codeflow Tower'} width="3840" height="2160" loading="lazy"/><span className="game-badge">WINDOWS · GODOT C#</span></div><div className="game-card-copy"><div className="game-card-number">01</div><Gamepad2 size={24}/><h3>Codeflow Tower</h3><p>{en?'An office RPG across three floors, with creative assignments and turn-based manager reviews.':'Een kantoor-RPG over drie verdiepingen, met creatieve opdrachten en beurtgebaseerde managerreviews.'}</p><div className="game-card-tags"><span>{en?'Single player':'Singleplayer'}</span><span>Prototype 0.2</span></div><p className="game-status"><Monitor size={16}/>{en?'Windows prototype':'Windows-prototype'}</p></div></article>
   <article className="game-card skumic-card"><div className="game-card-media"><img src="/games/skumic-run/showcase.png" alt={en?'Skumic Run level and character selection':'Level- en personageselectie van Skumic Run'} width="1344" height="634" loading="lazy"/><span className="game-badge">WEB · 4 LEVELS</span></div><div className="game-card-copy"><div className="game-card-number">02</div><Music2 size={24}/><h3>Skumic Run</h3><p>{en?'Race across the Ostend seafront with Point Blank or Gauthier. Four levels, four Skumic tracks and one goal: stay on the beat.':'Race over de Oostendse zeedijk met Point Blank of Gauthier. Vier levels, vier Skumic-tracks en één doel: blijf op de beat.'}</p><div className="game-card-tags"><span>{en?'Browser game':'Browsergame'}</span><span>4 levels</span></div><a className="button game-launch" href="/skumic">{en?'Play full screen':'Speel volledig'}<ArrowUpRight size={18}/></a></div></article>
  </div>
  <div className="games-signature"><span>{en?'Original games':'Originele games'}</span><strong>Made by Codeflow Studios</strong></div>
 </section>;
}
