import { RunModel, BEAT, MUSIC, LEVELS, selectLevel as setEngineLevel } from './engine.js';
import { BeatAudio } from './audio.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const model = new RunModel(), audio = new BeatAudio();
let mode = 'ready', width = 0, height = 0, lastFrame = 0, frameNow = 0;
let best = 0, mutedByChoice = false, feedbackUntil = 0, particles = [], popups = [], shake = 0;
let pointerStart = null, uiUpdated = 0, lastBeat = -1, lastCombo = 0;
let selectedCharacter = 1, selectedLevel = 0;
const levelBests = {};
const levelRanks = {};
try { Object.assign(levelBests, JSON.parse(localStorage.getItem('skumic-run-level-bests') || '{}')); } catch {}
try { Object.assign(levelRanks, JSON.parse(localStorage.getItem('skumic-run-level-ranks') || '{}')); } catch {}
best = Number(levelBests[LEVELS[0].id]) || 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const images = { backgrounds: [] };
for (const source of ['./assets/oostende.png']) {
  const image = new Image(); image.src = source; images.backgrounds.push(image);
}
for (const [name, source] of Object.entries({ runner: './assets/runner-atlas.png', objects: './assets/objects.png', deck: './assets/skumic-deck.png' })) {
  images[name] = new Image(); images[name].src = source;
}
const padScore = value => Math.floor(value).toString().padStart(5, '0');
$('best').textContent = padScore(best);
const rankValue = rank => ({ S: 4, A: 3, B: 2, C: 1, D: 0 }[rank] ?? -1);
function calculateRank(score) {
  if (!model.lives) return 'D';
  if (score >= MUSIC.ranks[0] && model.lives === 3) return 'S';
  if (score >= MUSIC.ranks[1]) return 'A';
  if (score >= MUSIC.ranks[2]) return 'B';
  return 'C';
}

function selectCharacter(choice) {
  if (mode === 'playing' || mode === 'starting') return;
  selectedCharacter = choice;
  images.runner.src = choice === 1 ? './assets/runner-atlas.png' : './assets/runner-atlas-2.png';
  $('character-portrait').src = choice === 1 ? './assets/character-portrait.png' : './assets/character-portrait-2.png';
  $('player-label').textContent = choice === 1 ? 'POINT BLANK' : 'GAUTHIER';
  for (const index of [1, 2]) {
    const button = $(`character-${index}`), selected = index === choice;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  }
}

function selectLevel(index) {
  if (mode === 'playing' || mode === 'starting') return;
  selectedLevel = Math.max(0, Math.min(LEVELS.length - 1, index));
  const level = setEngineLevel(selectedLevel);
  best = Number(levelBests[level.id]) || 0;
  $('best').textContent = padScore(best);
  $('level-number').textContent = `${level.number} / OOSTENDE`;
  $('selected-track').textContent = `${level.title} · SKUMIC`;
  $('result-demo').textContent = `Soundtrack: ${level.title} — Skumic.`;
  $('start-caption').textContent = `${level.number} · ${level.difficulty} · 45 SECONDEN`;
  $('mission-title').textContent = level.subtitle;
  $('mission-copy').textContent = `Pak ${level.mission.speakers} speakers, limited decks en ${level.mission.beats} beats.`;
  document.documentElement.dataset.level = String(selectedLevel + 1);
  for (let i = 0; i < LEVELS.length; i++) {
    const button = $(`level-${i + 1}`), selected = i === selectedLevel;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    $(`rank-${i + 1}`).textContent = levelRanks[LEVELS[i].id] ? `RANK ${levelRanks[LEVELS[i].id]}` : 'NIET GESPEELD';
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
new ResizeObserver(resize).observe(canvas);

function soundState() {
  $('sound').classList.toggle('active', audio.enabled);
  $('sound').setAttribute('aria-label', audio.enabled ? 'Geluid uitzetten' : 'Geluid aanzetten');
  $('sound').title = audio.enabled ? 'Geluid uitzetten (M)' : 'Geluid aanzetten (M)';
}
async function toggleSound() {
  const enable = !audio.enabled; mutedByChoice = !enable;
  try {
    if (enable && !(await audio.init())) { feedback('GELUID NIET BESCHIKBAAR', 2); return; }
    audio.setEnabled(enable);
    if (mode === 'playing' && !audio.active) audio.start(model.time);
  } catch { feedback('MUZIEK KON NIET LADEN', 2); }
  soundState();
  if (mode === 'playing') canvas.focus({ preventScroll: true });
}
async function start() {
  if (mode === 'starting' || mode === 'playing') return;
  mode = 'starting'; $('start').disabled = true; $('restart').disabled = true;
  const startLabel = $('start').innerHTML, restartLabel = $('restart').innerHTML;
  $('start').textContent = 'TRACK LADEN…'; $('restart').textContent = 'TRACK LADEN…';
  // Audio creation happens only inside a deliberate user action.
  let audioReady = false;
  try { audioReady = await audio.init(); audio.setEnabled(audioReady && !mutedByChoice); } catch { audio.setEnabled(false); }
  model.reset(); particles = []; popups = []; shake = 0; lastBeat = -1; lastCombo = 0; feedbackUntil = 0;
  $('start-screen').hidden = true; $('result-screen').hidden = true; $('pause-screen').hidden = true;
  $('pause').hidden = false; $('share-status').textContent = ''; $('feedback').classList.remove('show');
  $('game-frame').classList.add('started'); mode = 'playing'; audio.start(0);
  $('intro-kicker').textContent = `LEVEL ${MUSIC.number} · ${MUSIC.difficulty}`; $('intro-title').textContent = MUSIC.title; $('intro-go').textContent = MUSIC.subtitle;
  const intro = $('level-intro'); intro.hidden = false; intro.classList.remove('play'); void intro.offsetWidth; intro.classList.add('play'); setTimeout(() => { intro.hidden = true; }, 1900);
  soundState(); lastFrame = performance.now(); $('start').disabled = false; $('restart').disabled = false;
  $('start').innerHTML = startLabel; $('restart').innerHTML = restartLabel;
  canvas.focus({ preventScroll: true }); updateUI();
  feedback(audioReady ? 'PAK DE SPEAKERS!' : 'MUZIEK KON NIET LADEN.\nJE SPEELT ZONDER GELUID.', audioReady ? 1.8 : 4);
  if (document.hidden) pause();
}
function pause() {
  if (mode !== 'playing') return;
  mode = 'paused'; audio.stop(); $('pause-screen').hidden = false; $('resume').focus({ preventScroll: true });
}
async function resume() {
  if (mode !== 'paused') return;
  try { await audio.init(); } catch {}
  mode = 'playing'; audio.start(model.time); lastFrame = performance.now();
  $('pause-screen').hidden = true; canvas.focus({ preventScroll: true });
}
function finish() {
  mode = 'finished'; audio.stop(); $('pause').hidden = true;
  $('game-frame').classList.remove('boosting'); $('feedback').classList.remove('show');
  const score = Math.floor(model.score), record = score > best, rank = calculateRank(score);
  if (record) { best = score; levelBests[MUSIC.id] = best; try { localStorage.setItem('skumic-run-level-bests', JSON.stringify(levelBests)); } catch {} }
  if (!levelRanks[MUSIC.id] || rankValue(rank) > rankValue(levelRanks[MUSIC.id])) { levelRanks[MUSIC.id] = rank; try { localStorage.setItem('skumic-run-level-ranks', JSON.stringify(levelRanks)); } catch {} }
  const missionComplete = model.speakers >= MUSIC.mission.speakers && model.beats >= MUSIC.mission.beats;
  $('result-eyebrow').textContent = record ? 'NIEUWE PERSOONLIJKE BEST!' : model.lives ? '45 SECONDEN. ALLES GEGEVEN.' : 'DE DIJK HAD ANDERE PLANNEN';
  $('result-title').innerHTML = model.lives ? 'DIJK VAN<br>EEN RUN.' : 'NOG NIET<br>UITGERAASD?';
  $('result-score').textContent = score.toLocaleString('nl-BE'); $('result-best').textContent = best.toLocaleString('nl-BE');
  $('result-speakers').textContent = model.speakers; $('result-decks').textContent = model.decks; $('result-beats').textContent = model.beats; $('result-flow').textContent = model.maxCombo;
  $('result-rank').textContent = rank; $('result-mission').textContent = missionComplete ? 'MISSIE VOLTOOID' : 'MISSIE NIET VOLTOOID';
  $('result-mission').classList.toggle('complete', missionComplete);
  $('next-level').innerHTML = selectedLevel < LEVELS.length - 1 ? 'VOLGEND LEVEL <span aria-hidden="true">↗</span>' : 'LEVELS KIEZEN <span aria-hidden="true">↗</span>';
  $('best').textContent = padScore(best); $('result-screen').hidden = false;
  $(`rank-${selectedLevel + 1}`).textContent = `RANK ${levelRanks[MUSIC.id]}`;
  $('next-level').focus({ preventScroll: true });
}
function showLevelMenu() {
  if (mode === 'playing' || mode === 'starting') return;
  mode = 'ready'; $('result-screen').hidden = true; $('start-screen').hidden = false;
  $('game-frame').classList.remove('started'); $('start').focus({ preventScroll: true });
}
async function nextLevel() {
  if (selectedLevel < LEVELS.length - 1) { selectLevel(selectedLevel + 1); await start(); }
  else showLevelMenu();
}
function feedback(text, duration = .85) {
  $('feedback').textContent = text; $('feedback').classList.add('show'); feedbackUntil = performance.now() + duration * 1000;
}
function move(direction) { if (mode === 'playing') model.move(direction); }
function jump() {
  if (mode !== 'playing') return;
  const before = model.events.length;
  model.jump();
  for (const event of model.events.slice(before)) handleEvent(event);
}

$('start').addEventListener('click', start); $('restart').addEventListener('click', start); $('next-level').addEventListener('click', nextLevel); $('level-menu').addEventListener('click', showLevelMenu);
$('character-1').addEventListener('click', () => selectCharacter(1));
$('character-2').addEventListener('click', () => selectCharacter(2));
for (let i = 0; i < LEVELS.length; i++) $(`level-${i + 1}`).addEventListener('click', () => selectLevel(i));
$('pause').addEventListener('click', pause); $('resume').addEventListener('click', resume); $('sound').addEventListener('click', toggleSound);
for (const [id, action] of [['left', () => move(-1)], ['right', () => move(1)], ['jump', jump]]) {
  $(id).addEventListener('pointerdown', event => { event.preventDefault(); action(); });
  $(id).addEventListener('click', event => { if (event.detail === 0) action(); });
}
document.addEventListener('keydown', event => {
  const isButton = event.target instanceof Element && event.target.closest('button, a');
  if (event.repeat) return;
  if (event.code === 'KeyM') { event.preventDefault(); toggleSound(); return; }
  if (mode === 'playing') {
    if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'ArrowUp', 'KeyW', 'Space', 'KeyP', 'Escape'].includes(event.code)) event.preventDefault();
    if (['ArrowLeft', 'KeyA'].includes(event.code)) move(-1);
    if (['ArrowRight', 'KeyD'].includes(event.code)) move(1);
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code) && !isButton) jump();
    if (['KeyP', 'Escape'].includes(event.code)) pause();
  } else if (mode === 'paused' && ['Escape', 'KeyP'].includes(event.code)) { event.preventDefault(); resume(); }
  else if (['ready', 'finished'].includes(mode) && event.code === 'Enter' && !isButton) { event.preventDefault(); start(); }
});
canvas.addEventListener('pointerdown', event => {
  if (mode !== 'playing') return;
  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointerup', event => {
  if (!pointerStart || event.pointerId !== pointerStart.id) return;
  const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx));
  else if (dy < -25 || (Math.abs(dx) < 18 && Math.abs(dy) < 18)) jump();
  pointerStart = null;
});
canvas.addEventListener('pointercancel', () => { pointerStart = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);
let shareTouch = null, lastShareTap = -Infinity;
$('share').addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch') shareTouch = { x: event.clientX, y: event.clientY };
});
$('share').addEventListener('pointerup', event => {
  if (event.pointerType !== 'touch' || !shareTouch) return;
  const tapped = Math.hypot(event.clientX - shareTouch.x, event.clientY - shareTouch.y) < 16;
  shareTouch = null;
  if (tapped) { event.preventDefault(); lastShareTap = performance.now(); shareScore(); }
});
$('share').addEventListener('pointercancel', () => { shareTouch = null; });
$('share').addEventListener('click', event => {
  if (event.detail === 0 || performance.now() - lastShareTap > 600) shareScore();
});
async function shareScore() {
  const url = new URL(location.href); url.search = ''; url.hash = '';
  const text = `Ik scoorde ${Math.floor(model.score).toLocaleString('nl-BE')} punten en pakte ${model.decks} limited deck${model.decks === 1 ? '' : 's'} in level ${MUSIC.number} · ${MUSIC.title} van Skumic Run. Klop jij mijn score?`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Skumic Run', text, url: url.href }); $('share-status').textContent = 'Score gedeeld!'; }
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(`${text}\n${url.href}`); $('share-status').textContent = 'Score en link gekopieerd!'; }
    else $('share-status').textContent = `${text} ${url.href}`;
  } catch (error) { if (error.name !== 'AbortError') $('share-status').textContent = `${text} ${url.href}`; }
}

function project(lane, z) {
  const p = Math.max(0, 1 - z / 135), depth = p * p;
  const horizon = height * .43, near = height * (width < 600 ? .88 : .97);
  const halfRoad = width * (width < 600 ? .52 : .37);
  return { x: width / 2 + (lane - 1) * (8 + halfRoad * .67 * depth), y: horizon + depth * (near - horizon), scale: .08 + depth * .92, depth };
}
function polygon(points, color) {
  ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
}
function drawBackdrop() {
  const image = images.backgrounds[0];
  if (image.complete && image.naturalWidth) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight), iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
    ctx.drawImage(image, (width - iw) / 2, (height - ih) * .5, iw, ih);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, '#ef6960'); gradient.addColorStop(.4, '#eeab83'); gradient.addColorStop(.401, '#456b6a'); gradient.addColorStop(1, '#273941'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  }
  const horizon = height * .43, roadLeft = project(-.5, -55), roadRight = project(2.5, -55), bottom = Math.max(roadLeft.y, height);
  const roadShade = ctx.createLinearGradient(0, horizon, 0, bottom); roadShade.addColorStop(0, 'rgba(15,20,24,0)'); roadShade.addColorStop(.65, 'rgba(15,20,24,.16)'); roadShade.addColorStop(1, 'rgba(15,20,24,.30)');
  polygon([[width / 2 - 13, horizon], [width / 2 + 13, horizon], [roadRight.x, bottom], [roadLeft.x, bottom]], roadShade);
  for (const lane of [.5, 1.5]) {
    const a = project(lane, -32), b = project(lane, 126);
    ctx.strokeStyle = 'rgba(255,247,229,.16)'; ctx.lineWidth = width < 600 ? 1 : 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const edge of [-.5, 2.5]) {
    const a = project(edge, -32), b = project(edge, 126);
    ctx.strokeStyle = 'rgba(255,247,229,.12)'; ctx.lineWidth = width < 600 ? 1 : 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
}
function shadow(x, y, size, opacity = .32) { ctx.fillStyle = `rgba(6,16,22,${opacity})`; ctx.beginPath(); ctx.ellipse(x, y, size * .55, size * .16, 0, 0, Math.PI * 2); ctx.fill(); }
function drawObject(object, idle = false) {
  const pos = project(object.lane, object.z), size = (width < 600 ? 69 : 82) * pos.scale;
  if (object.type !== 'gull') shadow(pos.x, pos.y + 2, size * .84);
  const atlas = images.objects;
  const bob = ['speaker', 'gull'].includes(object.type) ? Math.sin(frameNow / 220 + object.lane) * 4 * pos.scale : 0;
  if (object.type === 'speaker' || object.type === 'deck') {
    ctx.save(); ctx.globalAlpha = .20 + (model.boost ? .13 : 0); ctx.fillStyle = '#effe59'; ctx.beginPath(); ctx.ellipse(pos.x, pos.y - size * .45 + bob, size * .5, size * .6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (object.type === 'deck' && images.deck.complete && images.deck.naturalWidth) {
    const deckW = size * 2.05, deckH = size * .72;
    ctx.save();
    ctx.translate(pos.x, pos.y - size * .68 + bob);
    ctx.rotate(-.10 + Math.sin(frameNow / 310) * .035);
    ctx.shadowColor = '#ffb000'; ctx.shadowBlur = 18 * pos.scale;
    ctx.drawImage(images.deck, 260, 1030, 4480, 1380, -deckW / 2, -deckH / 2, deckW, deckH);
    ctx.restore();
  } else if (atlas.complete && atlas.naturalWidth) {
    const cellW = atlas.naturalWidth / 2, cellH = atlas.naturalHeight / 2;
    const column = ['barrier', 'gull'].includes(object.type) ? 1 : 0, row = ['cone', 'gull'].includes(object.type) ? 1 : 0;
    const objectSize = object.type === 'gull' ? size * 1.65 : size * 1.36;
    const lift = object.type === 'gull' ? size * 1.7 : size * 1.12;
    ctx.drawImage(atlas, column * cellW, row * cellH, cellW, cellH, pos.x - objectSize / 2, pos.y - lift + bob, objectSize, objectSize);
  }
}
function drawRunner(idle = false) {
  const lane = idle ? 1.72 : model.x, pos = project(lane, 4);
  const size = (width < 600 ? 128 : 152), jumping = idle ? 0 : model.height;
  const running = idle ? .1 : Math.sin(frameNow / (model.boost ? 47 : 66));
  const y = pos.y - jumping * (height * .17) + (reducedMotion ? 0 : Math.abs(running) * 4);
  shadow(pos.x, pos.y + 7, size * (.46 - jumping * .12), .35 - jumping * .15);
  if (model.boost && !idle) {
    ctx.save(); ctx.globalAlpha = .25; ctx.fillStyle = '#effe59'; ctx.beginPath(); ctx.ellipse(pos.x, y - size * .36, size * .36, size * .55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  const sprite = images.runner;
  if (!sprite.complete || !sprite.naturalWidth) return;
  let frame = idle ? 1 : Math.floor(model.time * (model.boost ? 15 : 11)) % 4;
  if (!idle && model.jumpAge >= 0) frame = 4;
  else if (!idle && model.invincible > 1.02) frame = 5;
  ctx.save();
  if (model.invincible > 0 && Math.floor(frameNow / 95) % 2) ctx.globalAlpha = .35;
  ctx.translate(pos.x, y + 8); ctx.rotate((model.lane - model.x) * .13 + (reducedMotion ? 0 : running * .018));
  const cellW = sprite.naturalWidth / 3, cellH = sprite.naturalHeight / 2;
  const column = frame % 3, row = Math.floor(frame / 3);
  const ratio = cellW / cellH;
  ctx.drawImage(sprite, column * cellW, row * cellH, cellW, cellH, -size * ratio / 2, -size, size * ratio, size);
  ctx.restore();
}
function burst(lane, color, count = 15) {
  const p = project(lane, 5);
  for (let i = 0; i < count; i++) particles.push({ x: p.x, y: p.y - 35, vx: (Math.random() - .5) * 250, vy: -40 - Math.random() * 190, age: 0, duration: .4 + Math.random() * .35, color });
}
function handleEvent(event) {
  audio.effect(event.type);
  if (navigator.vibrate) navigator.vibrate(event.type === 'hit' ? [55, 35, 70] : event.type === 'drop' ? [25, 25, 45] : event.type === 'beat' ? 12 : event.type === 'speaker' ? 8 : 0);
  if (event.type === 'speaker') { burst(event.lane, '#effe59', 10); popups.push({ lane: event.lane, text: `+${event.points}`, age: 0 }); }
  if (event.type === 'deck') { burst(event.lane, '#ffad18', 24); feedback(`LIMITED DECK! +${event.points}`, 1.35); popups.push({ lane: event.lane, text: `DECK +${event.points}`, age: 0 }); }
  if (event.type === 'smash') burst(event.lane, '#f9aa89', 20);
  if (event.type === 'beat') {
    const levelUp = event.combo === 3 ? 'FLOW ×2!' : event.combo === 6 ? 'FLOW ×3!' : null;
    feedback(levelUp || `${event.perfect ? 'PERFECT OP DE BEAT' : 'OP DE BEAT'} +${event.points}`);
    burst(model.x, '#fff7e5', 6); popups.push({ lane: model.x, text: `FLOW ${event.combo}`, age: 0, white: true });
  }
  if (event.type === 'drop') { feedback('DROP!\nBOOST + DUBBELE PUNTEN', 2); burst(model.x, '#effe59', 28); }
  if (event.type === 'hit') { feedback(event.lostCombo >= 3 ? 'FLOW KWIJT!\nBLIJF GAAN.' : model.lives === 1 ? 'LAATSTE LEVEN!' : 'AUW! BLIJF GAAN.', 1); shake = reducedMotion ? 0 : .23; burst(event.lane, '#ee4245', 20); }
}
function updateUI() {
  $('score').textContent = padScore(model.score); $('time').innerHTML = `${Math.ceil(model.remaining)}<span>s</span>`;
  $('lives').textContent = `${'♥ '.repeat(model.lives)}${'♡ '.repeat(3 - model.lives)}`.trim(); $('lives').setAttribute('aria-label', `${model.lives} levens`);
  $('combo').textContent = model.combo; $('run-progress').style.width = `${Math.min(100, model.time / 45 * 100)}%`;
  if (model.combo !== lastCombo) { const stat = $('combo').parentElement; stat.classList.remove('hot'); void stat.offsetWidth; stat.classList.add('hot'); lastCombo = model.combo; }
  const beat = Math.floor(model.time / BEAT), fraction = (model.time / BEAT) % 1;
  $('beat-cursor').style.left = `${fraction * 100}%`; $('beat-progress').style.width = `${fraction * 100}%`;
  const nextDrop = MUSIC.boostWindows.find(([start]) => start > model.time)?.[0];
  $('boost-label').textContent = model.boost ? 'ONKWETSBAAR' : nextDrop === undefined ? 'NAAR DE FINISH' : `DROP IN ${Math.ceil(nextDrop - model.time)}s`;
  $('beat-label').textContent = model.boost ? 'BEATBOOST ACTIEF' : 'VIND JE RITME';
  $('beat-tip').textContent = model.boost ? 'PAK ALLES. JE BREEKT ERDOORHEEN.' : 'SPRING ALS DE BALK VOL IS';
  $('multiplier').textContent = `×${model.multiplier}`;
  $('mission-progress').textContent = `${Math.min(model.speakers, MUSIC.mission.speakers)}/${MUSIC.mission.speakers} SPEAKERS · ${model.decks} DECKS · ${Math.min(model.beats, MUSIC.mission.beats)}/${MUSIC.mission.beats} BEATS`;
  $('decks').textContent = model.decks;
  $('mission-hud').classList.toggle('complete', model.speakers >= MUSIC.mission.speakers && model.beats >= MUSIC.mission.beats);
  $('game-frame').classList.toggle('boosting', model.boost && mode === 'playing');
  if (beat !== lastBeat) { lastBeat = beat; $('beat-meter').style.borderColor = '#effe59'; }
  else if (fraction > .22) $('beat-meter').style.borderColor = 'rgba(255,255,255,.18)';
}
function render(dt) {
  ctx.save(); ctx.clearRect(0, 0, width, height);
  if (shake > 0) { shake -= dt; ctx.translate((Math.random() - .5) * 8, (Math.random() - .5) * 6); }
  drawBackdrop();
  if (mode === 'ready' || mode === 'starting') {
    for (const o of [{ type: 'speaker', lane: 1.72, z: 36 }, { type: 'speaker', lane: 1.72, z: 51 }, { type: 'barrier', lane: .8, z: 62 }, { type: 'cone', lane: .15, z: 21 }]) drawObject(o, true);
    drawRunner(true);
  } else {
    const objects = model.objects.slice().sort((a, b) => b.z - a.z);
    for (const object of objects.filter(o => o.z >= 4)) drawObject(object);
    drawRunner();
    for (const object of objects.filter(o => o.z < 4)) drawObject(object);
  }
  if (mode === 'playing') {
    for (const particle of particles) { particle.age += dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 350 * dt; ctx.globalAlpha = Math.max(0, 1 - particle.age / particle.duration); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, 4, 4); }
    particles = particles.filter(p => p.age < p.duration); ctx.globalAlpha = 1;
    for (const popup of popups) {
      popup.age += dt; const p = project(popup.lane, 5); ctx.globalAlpha = Math.max(0, 1 - popup.age / .8);
      ctx.fillStyle = popup.white ? '#fff7e5' : '#effe59'; ctx.font = `900 ${width < 600 ? 18 : 22}px Barlow, Impact, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(popup.text, p.x, p.y - 105 - popup.age * 55);
    }
    popups = popups.filter(p => p.age < .8); ctx.globalAlpha = 1;
    if (model.boost && !reducedMotion) {
      ctx.strokeStyle = '#effe5960'; ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const side = i % 2 ? 1 : -1, p = ((frameNow / 900 + i / 12) % 1), x = width / 2 + side * (width * .25 + p * width * .27), y = height * (.22 + p * .7);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * p * 28, y + p * 45); ctx.stroke();
      }
    }
  }
  ctx.restore();
}
function frame(now) {
  frameNow = now;
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (mode === 'playing') {
    // Small simulation steps keep collision detection dependable when frame rate varies.
    const transportTime = audio.time;
    let elapsed = transportTime !== null ? Math.max(0, transportTime - model.time) : dt;
    if (elapsed > .5) { pause(); elapsed = 0; }
    while (elapsed > .0001 && !model.done) { const step = Math.min(elapsed, 1 / 60); model.update(step); model.events.forEach(handleEvent); elapsed -= step; }
    if (now - uiUpdated > 30) { updateUI(); uiUpdated = now; }
    if (model.done) { updateUI(); finish(); }
  }
  if (now > feedbackUntil) $('feedback').classList.remove('show');
  render(mode === 'playing' ? dt : 0); requestAnimationFrame(frame);
}
selectLevel(0); resize(); soundState(); requestAnimationFrame(frame);
