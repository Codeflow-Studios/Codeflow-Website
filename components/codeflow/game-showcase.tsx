'use client';
import { ArrowUpRight, Gamepad2, Monitor, Music2 } from 'lucide-react';
import type { Language } from './shared';

export default function GameShowcase({lang}:{lang:Language}){
 const en=lang==='en';
 return <section className="game-section container" id="game">
  <div className="section-heading"><div><p className="eyebrow">04 / SELECTED WORK</p><h2>{en?<>Two worlds.<br/><span>One studio.</span></>:<>Twee werelden.<br/><span>Eén studio.</span></>}</h2></div><p className="section-intro">{en?'We turn concepts into playable systems, from a C# office RPG to a 32-bit browser fighter built around Skumic.':'We vertalen concepten naar speelbare systemen: van een C#-kantoor-RPG tot een 32-bit browserfighter rond Skumic.'}</p></div>
  <div className="games-grid">
   <article className="game-card tower-card"><div className="game-card-media"><img src="/games/codeflow-tower/studio.webp" alt={en?'Codeflow Tower studio floor':'Studiovloer uit Codeflow Tower'} width="3840" height="2160" loading="lazy"/><span className="game-badge">WINDOWS · GODOT C#</span></div><div className="game-card-copy"><div className="game-card-number">01</div><Gamepad2 size={24}/><h3>Codeflow Tower</h3><p>{en?'An office RPG across three floors, with creative assignments and turn-based manager reviews.':'Een kantoor-RPG over drie verdiepingen, met creatieve opdrachten en beurtgebaseerde managerreviews.'}</p><div className="game-card-tags"><span>{en?'Single player':'Singleplayer'}</span><span>Prototype 0.2</span></div><p className="game-status"><Monitor size={16}/>{en?'Windows prototype':'Windows-prototype'}</p></div></article>
   <article className="game-card skumic-card"><div className="game-card-media"><img src="/games/skumic-run/showcase.png" alt={en?'Skumic Fighters character selection':'Personageselectie van Skumic Fighters'} width="1344" height="634" loading="lazy"/><span className="game-badge">WEB · 32-BIT</span></div><div className="game-card-copy"><div className="game-card-number">02</div><Music2 size={24}/><h3>Skumic Fighters</h3><p>{en?'Choose Matar or Gauthier and face off in a 32-bit browser fighter set in the world of Skumic.':'Kies Matar of Gauthier en neem het tegen elkaar op in een 32-bit browserfighter in de wereld van Skumic.'}</p><div className="game-card-tags"><span>{en?'Browser game':'Browsergame'}</span><span>2 fighters</span></div><a className="button game-launch" href="/skumic">{en?'Start fight':'Start gevecht'}<ArrowUpRight size={18}/></a></div></article>
  </div>
  <div className="games-signature"><span>{en?'Original games':'Originele games'}</span><strong>Made by Codeflow Studios</strong></div>
 </section>;
}
