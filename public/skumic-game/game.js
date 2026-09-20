import { RunModel, BEAT, MUSIC, LEVELS, selectLevel as setEngineLevel } from './engine.js';
import { BeatAudio } from './audio.js';

const elements = new Map();
const $ = id => elements.get(id) || (elements.set(id, document.getElementById(id)), elements.get(id));
const canvas = $('game'), ctx = canvas.getContext('2d');
const model = new RunModel(), audio = new BeatAudio();
let mode = 'ready', width = 0, height = 0, lastFrame = 0;
let best = 0, mutedByChoice = false, feedbackUntil = 0, particles = [], popups = [];
let pointerStart = null, uiUpdated = 0, lastBeat = -1, lastCombo = 0;
let selectedCharacter = 1, selectedLevel = 0;
let countdownLeft = 0, pausedMode = 'playing', startToken = 0, tutorialSeen = false;
let landingAge = 1, dropAge = 1, hitAge = 1, tutorialUntil = 0, feedbackPriority = 0;
let fallbackEpoch = 0, savedScroll = 0, roadScanlines = [], backdropCache = null;
const camera = { x: 0, y: 0 };
const drawObjects = [];
const levelBests = {};
const levelRanks = {};
try { Object.assign(levelBests, JSON.parse(localStorage.getItem('skumic-run-level-bests') || '{}')); } catch {}
try { Object.assign(levelRanks, JSON.parse(localStorage.getItem('skumic-run-level-ranks') || '{}')); } catch {}
best = Number(levelBests[LEVELS[0].id]) || 0;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionPreference.matches;
const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch-device', touchDevice);
motionPreference.addEventListener('change', event => { reducedMotion = event.matches; particles.length = 0; });
try { tutorialSeen = localStorage.getItem('skumic-run-tutorial-v2') === 'seen'; mutedByChoice = localStorage.getItem('skumic-run-muted') === 'true'; } catch {}
const images = { backgrounds: [] };
for (const [name, source] of Object.entries({ runner: './assets/runner-atlas.png', objects: './assets/objects.png', deck: './assets/skumic-deck.png' })) {
  images[name] = new Image(); images[name].src = source;
}
function loadLevelArt(index) {
  if (!images.backgrounds[index]) {
    const image = new Image(); image.onload = () => { backdropCache = null; };
    image.src = LEVELS[index].background; images.backgrounds[index] = image;
  }
  if (!roadTextures[index]) roadTextures[index] = roadTexture(LEVELS[index].roadStyle, 9187 + index * 733);
}
function roadTexture(style, seed) {
  const texture = document.createElement('canvas'); texture.width = 256; texture.height = 512;
  const paint = texture.getContext('2d'); let state = seed >>> 0;
  const random = () => ((state = Math.imul(1664525, state) + 1013904223 >>> 0) / 4294967296);
  paint.fillStyle = `rgba(${style.dark},.2)`; paint.fillRect(0, 0, texture.width, texture.height);
  for (let i = 0; i < 780; i++) {
    const x = random() * texture.width, y = random() * texture.height;
    const size = .35 + random() * (random() > .93 ? 3.2 : 1.35);
    paint.fillStyle = random() > .7 ? `rgba(${style.light},${.04 + random() * .13})` : `rgba(${style.dark},${.13 + random() * .22})`;
    paint.beginPath(); paint.ellipse(x, y, size * (1.2 + random() * 1.8), size * .24, 0, 0, Math.PI * 2); paint.fill();
  }
  return texture;
}
const roadTextures = [];
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
  if (mode !== 'ready' && mode !== 'finished') return;
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
  if (mode !== 'ready' && mode !== 'finished') return;
  selectedLevel = Math.max(0, Math.min(LEVELS.length - 1, index));
  const level = setEngineLevel(selectedLevel);
  loadLevelArt(selectedLevel); backdropCache = null;
  best = Number(levelBests[level.id]) || 0;
  $('best').textContent = padScore(best);
  $('selected-best').textContent = best.toLocaleString('nl-BE');
  $('selected-title').textContent = `${level.number} · ${level.title}`;
  $('selected-duration').textContent = `${level.difficulty} · ${level.duration} SEC`;
  $('level-number').textContent = `${level.number} / OOSTENDE`;
  $('selected-track').textContent = `${level.title} · SKUMIC`;
  $('result-demo').textContent = `Soundtrack: ${level.title} — Skumic.`;
  $('start-caption').textContent = `${level.number} · ${level.difficulty} · ${level.duration} SECONDEN`;
  $('mission-title').textContent = level.subtitle;
  $('mission-copy').textContent = `Pak ${level.mission.speakers} speakers, limited decks en ${level.mission.beats} beats.`;
  document.documentElement.dataset.level = String(selectedLevel + 1);
  $('beat-meter').style.setProperty('--beat-window', `${Math.min(45, level.timing.perfect / BEAT * 100)}%`);
  for (let i = 0; i < LEVELS.length; i++) {
    const button = $(`level-${i + 1}`), selected = i === selectedLevel;
    button.setAttribute('aria-label', `Level ${LEVELS[i].number}: ${LEVELS[i].title}, ${LEVELS[i].difficulty}`);
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    $(`rank-${i + 1}`).textContent = levelRanks[LEVELS[i].id] ? `RANK ${levelRanks[LEVELS[i].id]}` : 'NIET GESPEELD';
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  backdropCache = null;
  roadScanlines = [];
  const horizon = height * .43, near = height * (width < 600 ? .79 : .97);
  for (let y = Math.floor(horizon + 2); y < height; y += 3) {
    const depth = Math.max(0, (y - horizon) / (near - horizon));
    const z = 135 * (1 - Math.sqrt(depth));
    const left = project(-.5, z), right = project(2.5, z);
    roadScanlines.push({y, z, x: left.x, width: right.x - left.x});
  }
}
new ResizeObserver(resize).observe(canvas);

function soundState() {
  $('sound').classList.toggle('active', audio.enabled);
  $('sound').setAttribute('aria-label', audio.enabled ? 'Geluid uitzetten' : 'Geluid aanzetten');
  $('sound').title = audio.enabled ? 'Geluid uitzetten (M)' : 'Geluid aanzetten (M)';
}
async function toggleSound() {
  const enable = !audio.enabled; mutedByChoice = !enable;
  try { localStorage.setItem('skumic-run-muted', String(mutedByChoice)); } catch {}
  try {
    if (enable && !(await audio.init())) { feedback('GELUID NIET BESCHIKBAAR', 2); return; }
    audio.setEnabled(enable);
    if (mode === 'playing' && !audio.active) audio.start(model.time);
  } catch { feedback('MUZIEK KON NIET LADEN', 2); }
  soundState();
  if (mode === 'playing') canvas.focus({ preventScroll: true });
}
function setMode(next) { mode = next; document.body.dataset.mode = next; }
function setTheater(active) {
  if (active && !document.body.classList.contains('theater')) savedScroll = window.scrollY;
  document.body.classList.toggle('theater', active);
  $('exit-theater').hidden = !active;
  if (!active) window.scrollTo(0, savedScroll);
}
function exitTheater() { if (['playing', 'countdown'].includes(mode)) pause(); setTheater(false); }
function beginRun() {
  setMode('playing'); $('level-intro').hidden = true;
  fallbackEpoch = performance.now() - model.time * 1000;
  audio.start(model.time); lastFrame = performance.now();
  if (!tutorialSeen) {
    $('tutorial').textContent = touchDevice ? 'VEEG ← → ONTWIJK · TIK OM OP DE BEAT TE SPRINGEN' : '← → ONTWIJK · SPATIE: SPRING OP DE BEAT';
    $('tutorial').hidden = false; tutorialUntil = model.time + 3;
  }
  canvas.focus({ preventScroll: true }); updateUI();
}
async function start(options = {}) {
  if (!['ready', 'finished'].includes(mode)) return;
  const quick = options.quick ?? (mode === 'finished'), token = ++startToken;
  setMode('starting'); $('start').disabled = true; $('restart').disabled = true;
  const startLabel = $('start').innerHTML, restartLabel = $('restart').innerHTML;
  $('start').textContent = 'TRACK LADEN…'; $('restart').textContent = 'TRACK LADEN…';
  // Audio creation happens only inside a deliberate user action.
  let audioReady = false;
  try { audioReady = await audio.init(); audio.setEnabled(audioReady && !mutedByChoice); } catch { audio.setEnabled(false); }
  if (token !== startToken) return;
  model.reset(); particles = []; popups = []; lastBeat = -1; lastCombo = 0; feedbackUntil = 0; feedbackPriority = 0;
  camera.x = 0; camera.y = 0;
  landingAge = 1; dropAge = 1; hitAge = 1; pointerStart = null; tutorialUntil = 0; $('tutorial').hidden = true;
  $('start-screen').hidden = true; $('result-screen').hidden = true; $('pause-screen').hidden = true;
  $('pause').hidden = false; $('share-status').textContent = ''; $('feedback').classList.remove('show');
  $('game-frame').classList.add('started'); setTheater(true);
  $('intro-kicker').textContent = `LEVEL ${MUSIC.number} · ${MUSIC.difficulty}`; $('intro-title').textContent = MUSIC.title; $('intro-go').textContent = 'VIND DE BEAT';
  countdownLeft = BEAT * 3; $('countdown').textContent = '3';
  $('level-intro').hidden = quick; $('level-intro').classList.remove('play');
  setMode('countdown');
  soundState(); lastFrame = performance.now(); $('start').disabled = false; $('restart').disabled = false;
  $('start').innerHTML = startLabel; $('restart').innerHTML = restartLabel;
  canvas.focus({ preventScroll: true }); updateUI();
  if (!audioReady) feedback('MUZIEK KON NIET LADEN · JE SPEELT ZONDER GELUID', 4, 3);
  if (document.hidden) { if (quick) countdownLeft = 0; pause(); }
  else if (quick) beginRun();
}
function pause() {
  if (!['playing', 'countdown'].includes(mode)) return;
  pausedMode = mode; setMode('paused'); audio.stop(); pointerStart = null;
  $('level-intro').hidden = true; $('tutorial').hidden = true;
  $('pause-screen').hidden = false; $('resume').focus({ preventScroll: true });
}
async function resume() {
  if (mode !== 'paused') return;
  const token = startToken;
  try { await audio.init(); } catch {}
  if (token !== startToken || mode !== 'paused' || document.hidden) return;
  setTheater(true); setMode(pausedMode); lastFrame = performance.now();
  if (pausedMode === 'playing') { audio.start(model.time); fallbackEpoch = performance.now() - model.time * 1000; }
  else $('level-intro').hidden = false;
  $('pause-screen').hidden = true; canvas.focus({ preventScroll: true });
}
function finish() {
  setMode('finished'); audio.stop(); $('pause').hidden = true; $('tutorial').hidden = true;
  $('game-frame').classList.remove('boosting', 'building', 'ravy'); $('ravy-status').hidden = true; $('feedback').classList.remove('show');
  const score = Math.floor(model.score), record = score > best, rank = calculateRank(score);
  if (record) { best = score; levelBests[MUSIC.id] = best; try { localStorage.setItem('skumic-run-level-bests', JSON.stringify(levelBests)); } catch {} }
  if (!levelRanks[MUSIC.id] || rankValue(rank) > rankValue(levelRanks[MUSIC.id])) { levelRanks[MUSIC.id] = rank; try { localStorage.setItem('skumic-run-level-ranks', JSON.stringify(levelRanks)); } catch {} }
  const missionComplete = model.speakers >= MUSIC.mission.speakers && model.beats >= MUSIC.mission.beats;
  $('result-eyebrow').textContent = record ? 'NIEUW PERSOONLIJK RECORD!' : model.lives ? `${MUSIC.duration} SECONDEN. ALLES GEGEVEN.` : 'NIEUWE RUN, NIEUWE KANS';
  $('result-title').innerHTML = model.lives ? 'DIJK VAN<br>EEN RUN.' : 'GAME OVER.';
  $('result-score').textContent = score.toLocaleString('nl-BE'); $('result-best').textContent = best.toLocaleString('nl-BE');
  $('result-speakers').textContent = model.speakers; $('result-decks').textContent = model.decks; $('result-beats').textContent = model.beats; $('result-flow').textContent = model.maxCombo;
  $('result-rank').textContent = rank; $('result-mission').textContent = missionComplete ? 'MISSIE VOLTOOID' : 'MISSIE NIET VOLTOOID';
  $('result-mission').classList.toggle('complete', missionComplete);
  $('next-level').innerHTML = selectedLevel < LEVELS.length - 1 ? 'VOLGEND LEVEL <span aria-hidden="true">↗</span>' : 'LEVELS KIEZEN <span aria-hidden="true">↗</span>';
  $('best').textContent = padScore(best); $('result-screen').hidden = false;
  $(`rank-${selectedLevel + 1}`).textContent = `RANK ${levelRanks[MUSIC.id]}`;
  $('restart').focus({ preventScroll: true });
}
function showLevelMenu() {
  if (mode === 'playing') pause();
  ++startToken; audio.stop(); setMode('ready'); setTheater(false);
  $('start').disabled = false; $('restart').disabled = false;
  $('level-intro').hidden = true; $('pause-screen').hidden = true; $('tutorial').hidden = true; $('pause').hidden = true;
  $('ravy-status').hidden = true; $('feedback').classList.remove('show');
  $('result-screen').hidden = true; $('start-screen').hidden = false;
  $('game-frame').classList.remove('boosting', 'building', 'ravy'); selectLevel(selectedLevel);
  $('game-frame').classList.remove('started'); $('start').focus({ preventScroll: true });
}
async function nextLevel() {
  if (selectedLevel < LEVELS.length - 1) { selectLevel(selectedLevel + 1); await start({quick: false}); }
  else showLevelMenu();
}
function feedback(text, duration = .65, priority = 1, judgement = '') {
  if (performance.now() < feedbackUntil && priority < feedbackPriority) return;
  feedbackPriority = priority; $('feedback').dataset.judgement = judgement;
  $('game-frame').dataset.judgement = judgement;
  $('feedback').textContent = text; $('feedback').classList.add('show'); feedbackUntil = performance.now() + duration * 1000;
}
function move(direction) { if (mode === 'playing') model.move(direction); }
function jump(event) {
  if (mode !== 'playing') return;
  const before = model.events.length;
  model.jump(audio.sampleTime(event?.timeStamp) ?? (performance.now() - fallbackEpoch) / 1000);
  for (const event of model.events.slice(before)) handleEvent(event);
}

$('start').addEventListener('click', start); $('restart').addEventListener('click', start); $('next-level').addEventListener('click', nextLevel); $('level-menu').addEventListener('click', showLevelMenu);
$('character-1').addEventListener('click', () => selectCharacter(1));
$('character-2').addEventListener('click', () => selectCharacter(2));
// Selection is built from the same configuration as audio, spawning and scoring.
const levelPicker = document.querySelector('.level-picker');
levelPicker.replaceChildren(...LEVELS.map((level, index) => {
  const button = document.createElement('button'); button.className = 'level-choice'; button.id = `level-${index + 1}`; button.type = 'button';
  button.disabled = level.available === false; button.setAttribute('aria-pressed', 'false');
  button.style.setProperty('--tile-accent', level.colors.accent);
  const number = document.createElement('b'); number.textContent = level.number;
  const title = document.createElement('span'); title.append(level.title);
  const detail = document.createElement('small'); detail.append(`${level.difficulty} · `);
  const rank = document.createElement('i'); rank.id = `rank-${index + 1}`; rank.textContent = '—'; detail.append(rank); title.append(detail);
  button.append(number, title); button.addEventListener('click', () => selectLevel(index)); return button;
}));
$('pause').addEventListener('click', pause); $('resume').addEventListener('click', resume); $('sound').addEventListener('click', toggleSound);
$('exit-theater').addEventListener('click', exitTheater); $('pause-levels').addEventListener('click', showLevelMenu);
for (const [id, action] of [['left', () => move(-1)], ['right', () => move(1)], ['jump', jump]]) {
  $(id).addEventListener('pointerdown', event => { event.preventDefault(); action(event); });
  $(id).addEventListener('click', event => { if (event.detail === 0) action(); });
}
document.addEventListener('keydown', event => {
  const isButton = event.target instanceof Element && event.target.closest('button, a');
  if (event.repeat) return;
  if (event.code === 'Tab') {
    const dialog = mode === 'paused' ? $('pause-screen') : mode === 'finished' ? $('result-screen') : null;
    if (dialog) {
      const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href]')].filter(element => element.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (event.target === first || !dialog.contains(event.target))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (event.target === last || !dialog.contains(event.target))) { event.preventDefault(); first?.focus(); }
    }
  }
  if (event.code === 'KeyM') { event.preventDefault(); toggleSound(); return; }
  if (event.code === 'Escape' && document.body.classList.contains('theater')) { event.preventDefault(); exitTheater(); return; }
  if (mode === 'countdown' && event.code === 'KeyP') { event.preventDefault(); pause(); return; }
  if (mode === 'playing') {
    if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'ArrowUp', 'KeyW', 'Space', 'KeyP', 'Escape'].includes(event.code)) event.preventDefault();
    if (['ArrowLeft', 'KeyA'].includes(event.code)) move(-1);
    if (['ArrowRight', 'KeyD'].includes(event.code)) move(1);
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code) && !isButton) jump(event);
    if (['KeyP', 'Escape'].includes(event.code)) pause();
  } else if (mode === 'paused' && ['Escape', 'KeyP'].includes(event.code)) { event.preventDefault(); resume(); }
  else if (['ready', 'finished'].includes(mode) && ['Enter', 'Space'].includes(event.code) && !isButton) { event.preventDefault(); start(); }
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
  else if (dy < -25 || (Math.abs(dx) < 18 && Math.abs(dy) < 18)) jump(event);
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
  const horizon = height * .43, near = height * (width < 600 ? .79 : .97);
  const halfRoad = width * (width < 600 ? .52 : .37);
  return { x: width / 2 + (lane - 1) * (8 + halfRoad * .67 * depth), y: horizon + depth * (near - horizon), scale: .14 + depth * .86, depth };
}
function polygon(points, color) {
  ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
}
function drawBackdrop(cameraX = 0, cameraY = 0) {
  const image = images.backgrounds[selectedLevel];
  // The artwork is rasterized once. A small overscan allows gentle background
  // parallax without ever exposing the canvas edge.
  if (!backdropCache && width > 0 && height > 0) {
    backdropCache = document.createElement('canvas'); backdropCache.width = canvas.width; backdropCache.height = canvas.height;
    const paint = backdropCache.getContext('2d'); paint.scale(canvas.width / width, canvas.height / height);
    if (image?.complete && image.naturalWidth) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * 1.025;
    const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
      paint.drawImage(image, (width - iw) / 2, (height - ih) * .5, iw, ih);
    } else {
      const gradient = paint.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, '#ef6960'); gradient.addColorStop(.4, '#eeab83'); gradient.addColorStop(1, '#273941'); paint.fillStyle = gradient; paint.fillRect(0, 0, width, height);
    }
    const horizon = height * .43;
    const roadShade = paint.createLinearGradient(0, horizon, 0, height); roadShade.addColorStop(0, 'rgba(15,20,24,0)'); roadShade.addColorStop(1, 'rgba(15,20,24,.22)');
    paint.fillStyle = roadShade; paint.fillRect(0, horizon, width, height - horizon);
    for (const lane of [.5, 1.5]) {
      const a = project(lane, -32), b = project(lane, 126);
      paint.strokeStyle = 'rgba(255,247,229,.12)'; paint.lineWidth = 1;
      paint.beginPath(); paint.moveTo(a.x, a.y); paint.lineTo(b.x, b.y); paint.stroke();
    }
  }
  if (backdropCache) {
    const overscan = 4;
    ctx.drawImage(backdropCache, cameraX - overscan, cameraY - overscan, width + overscan * 2, height + overscan * 2);
  }
}
function drawMovingRoadLayer() {
  if (mode === 'ready' || mode === 'starting') return;
  const texture = roadTextures[selectedLevel];
  ctx.save();
  ctx.globalAlpha = .46;
  for (const row of roadScanlines) {
    const textureY = (((reducedMotion ? 0 : model.distance) + row.z) * 5.2 % texture.height + texture.height) % texture.height;
    ctx.drawImage(texture, 0, Math.min(texture.height - 3, Math.floor(textureY)), texture.width, 3, row.x, row.y, row.width, 3);
  }
  ctx.restore();
  drawPassingScenery();
}
function drawPassingScenery() {
  const style = MUSIC.roadStyle, travel = reducedMotion ? 0 : model.distance;
  for (let i = 0; i < 9; i++) {
    const z = 7 + ((i * 19 + 122 - travel) % 115 + 115) % 115;
    const side = i % 2 ? -.82 : 2.82, pos = project(side, z), size = 1.2 + pos.depth * 18;
    ctx.fillStyle = `rgba(8,15,20,${.12 + pos.depth * .34})`;
    ctx.beginPath(); ctx.ellipse(pos.x, pos.y, size * 1.15, size * .28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = style.accent;
    ctx.globalAlpha = .3 + pos.depth * .62;
    ctx.beginPath(); ctx.ellipse(pos.x, pos.y - size * .08, size * .42, size * .13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawRavyLight() {
  if (!model.boost || ['ready', 'starting'].includes(mode)) return;
  // A warm edge wash keeps Oostende recognizable and leaves the obstacle lanes clear.
  const strength = reducedMotion ? .045 : .065 + Math.sin(model.beatPhase * Math.PI) * .012;
  const wash = ctx.createLinearGradient(0, 0, width, 0);
  wash.addColorStop(0, `rgba(255,173,24,${strength})`); wash.addColorStop(.25, 'rgba(255,173,24,0)');
  wash.addColorStop(.75, 'rgba(239,254,89,0)'); wash.addColorStop(1, `rgba(239,254,89,${strength})`);
  ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);
  if (!reducedMotion && dropAge < .5) {
    const p = project(model.x, 4), radius = 30 + dropAge * 180;
    ctx.strokeStyle = `rgba(239,254,89,${(.5 - dropAge) * .65})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, radius, radius * .25, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
function shadow(x, y, size, opacity = .32) { ctx.fillStyle = `rgba(6,16,22,${opacity})`; ctx.beginPath(); ctx.ellipse(x, y, size * .55, size * .16, 0, 0, Math.PI * 2); ctx.fill(); }
function drawObject(object, idle = false) {
  const pos = project(object.lane, object.z), size = (width < 600 ? 83 : 103) * pos.scale;
  const pickup = object.type === 'speaker' || object.type === 'deck';
  const pulse = reducedMotion || idle ? 0 : Math.pow(1 - model.beatPhase, 3);
  if (object.type !== 'gull') shadow(pos.x, pos.y + 2, size * .84);
  const atlas = images.objects;
  const bob = !reducedMotion && ['speaker', 'deck', 'gull'].includes(object.type) ? Math.sin(model.time * 5 + object.lane) * 3 * pos.scale : 0;
  if (pickup) {
    ctx.save(); ctx.globalAlpha = .15 + pulse * .10; ctx.fillStyle = '#effe59'; ctx.beginPath(); ctx.ellipse(pos.x, pos.y - size * .45 + bob, size * .5, size * .6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#effe59'; ctx.lineWidth = Math.max(1, 2 * pos.scale);
    ctx.beginPath(); ctx.ellipse(pos.x, pos.y + 2, size * .4, size * .10, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    polygon([[pos.x - size * .5, pos.y + 3], [pos.x, pos.y - size * .14], [pos.x + size * .5, pos.y + 3], [pos.x, pos.y + size * .13]], 'rgba(255,64,32,.32)');
    if (pos.scale > .23) {
      ctx.fillStyle = '#ff794d'; ctx.font = `900 ${Math.max(11, size * .25)}px Barlow, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('!', pos.x, pos.y - size * (object.type === 'gull' ? 1.95 : 1.32));
    }
  }
  if (object.type === 'deck' && images.deck.complete && images.deck.naturalWidth) {
    const deckW = size * 2.05, deckH = size * .72;
    ctx.save();
    ctx.translate(pos.x, pos.y - size * .68 + bob);
    ctx.rotate(-.10 + (reducedMotion ? 0 : Math.sin(model.time * 3) * .035));
    ctx.shadowColor = '#ffb000'; ctx.shadowBlur = 8 * pos.scale;
    ctx.drawImage(images.deck, 260, 1030, 4480, 1380, -deckW / 2, -deckH / 2, deckW, deckH);
    ctx.restore();
  } else if (atlas.complete && atlas.naturalWidth) {
    const cellW = atlas.naturalWidth / 2, cellH = atlas.naturalHeight / 2;
    const column = ['barrier', 'gull'].includes(object.type) ? 1 : 0, row = ['cone', 'gull'].includes(object.type) ? 1 : 0;
    const objectSize = object.type === 'gull' ? size * 1.65 : size * 1.36;
    const lift = object.type === 'gull' ? size * 1.7 : size * 1.12;
    ctx.save();
    ctx.shadowColor = pickup ? '#effe59' : '#ff632d'; ctx.shadowBlur = Math.max(1, pos.scale * 3);
    ctx.drawImage(atlas, column * cellW, row * cellH, cellW, cellH, pos.x - objectSize / 2, pos.y - lift + bob, objectSize, objectSize);
    ctx.restore();
  }
}
function drawRunner(idle = false) {
  const lane = idle ? 1.72 : model.x, pos = project(lane, 4);
  const size = idle ? (width < 600 ? 128 : 152) : Math.min(width < 600 ? 166 : 198, height * .44), jumping = idle ? 0 : model.height;
  const running = idle ? .1 : Math.sin(model.time * (model.boost ? 21 : 15));
  const y = pos.y - jumping * (height * .17) + (reducedMotion ? 0 : Math.abs(running) * 4);
  if (!idle && jumping < .08 && !reducedMotion) {
    const step = (model.distance * .72) % 1;
    for (let i = 0; i < 3; i++) {
      const drift = (step + i / 3) % 1;
      ctx.fillStyle = `rgba(225,211,184,${(1 - drift) * .11})`;
      ctx.beginPath(); ctx.ellipse(pos.x + (i - 1) * 9, pos.y + 5 - drift * 8, 3 + drift * 8, 1 + drift * 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  shadow(pos.x, pos.y + 7, size * (.5 - jumping * .14), .42 - jumping * .2);
  if (model.boost && !idle) {
    ctx.save(); ctx.globalAlpha = reducedMotion ? .09 : .14; ctx.fillStyle = '#effe59'; ctx.beginPath(); ctx.ellipse(pos.x, y - size * .36, size * .33, size * .51, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (!idle && !reducedMotion && (model.boost || model.combo >= 4)) {
    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = `rgba(239,254,89,${.1 / i})`;
      ctx.beginPath(); ctx.ellipse(pos.x, pos.y - size * .10 - i * 15, size * .18 / i, 10 / i, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  const sprite = images.runner;
  if (!sprite.complete || !sprite.naturalWidth) return;
  let frame = idle ? 1 : Math.floor(model.time * (model.boost ? 15 : 11)) % 4;
  if (!idle && model.jumpAge >= 0) frame = 4;
  else if (!idle && model.invincible > 1.02) frame = 5;
  ctx.save();
  if (model.invincible > 0) ctx.globalAlpha = .72;
  ctx.translate(pos.x, y + 8); ctx.rotate(reducedMotion ? 0 : (model.lane - model.x) * .13 + running * .012);
  const squash = !idle && !reducedMotion ? Math.max(0, 1 - landingAge / .16) * .09 : 0;
  ctx.scale(1 + squash, 1 - squash);
  const cellW = sprite.naturalWidth / 3, cellH = sprite.naturalHeight / 2;
  const column = frame % 3, row = Math.floor(frame / 3);
  const ratio = cellW / cellH;
  ctx.drawImage(sprite, column * cellW, row * cellH, cellW, cellH, -size * ratio / 2, -size, size * ratio, size);
  ctx.restore();
}
function burst(lane, color, count = 15) {
  if (reducedMotion) return;
  const p = project(lane, 5);
  for (let i = 0; i < count && particles.length < 100; i++) particles.push({ x: p.x, y: p.y - 12, vx: (Math.random() - .5) * 180, vy: -30 - Math.random() * 100, age: 0, duration: .3 + Math.random() * .25, color });
}
function handleEvent(event) {
  audio.effect(event.type);
  if (!reducedMotion && navigator.vibrate && ['hit', 'drop', 'beat'].includes(event.type)) navigator.vibrate(event.type === 'hit' ? 35 : event.type === 'drop' ? [20, 20, 30] : 8);
  if (event.type === 'speaker') { burst(event.lane, '#effe59', 6); popups.push({ lane: event.lane, text: `+${event.points}`, age: 0 }); }
  if (event.type === 'deck') { burst(event.lane, '#ffad18', 14); feedback(`LIMITED DECK +${event.points}`, .8, 2); }
  if (event.type === 'smash') { burst(event.lane, '#ff794d', 18); popups.push({ lane: event.lane, text: `SMASH +${event.points || 40}`, age: 0 }); }
  if (event.type === 'beat') {
    feedback(`${event.judgement.toUpperCase()} +${event.points}`, .5, 1, event.judgement);
    burst(model.x, '#fff7e5', Math.min(12, 3 + Math.floor(event.combo / 2)));
    $('game-frame').dataset.judgement = event.judgement;
  }
  if (event.type === 'timing') feedback('NORMAL · VIND DE BEAT', .4, 0, 'normal');
  if (event.type === 'landing') { landingAge = 0; burst(event.lane, '#ddd1b8', 4); }
  if (event.type === 'drop') { dropAge = 0; feedback('DROP! · RAVY MODE', .95, 3, 'drop'); burst(model.x, '#effe59', 26); }
  if (event.type === 'hit') { hitAge = 0; feedback(model.lives === 1 ? 'LAATSTE LEVEN!' : 'GERAAKT · BLIJF GAAN', .6, 3, 'hit'); burst(event.lane, '#ff633e', 12); }
  if (['hit', 'drop', 'ravy-end', 'beat', 'timing'].includes(event.type)) updateUI();
  if (popups.length > 8) popups.splice(0, popups.length - 8);
}
function updateUI() {
  const scoreText = padScore(model.score), timeText = `${Math.ceil(model.remaining)}s`;
  if ($('score').textContent !== scoreText) $('score').textContent = scoreText;
  if ($('time').textContent !== timeText) $('time').textContent = timeText;
  $('lives').textContent = `${'♥ '.repeat(model.lives)}${'♡ '.repeat(3 - model.lives)}`.trim(); $('lives').setAttribute('aria-label', `${model.lives} levens`);
  $('combo').textContent = model.combo; $('run-progress').style.width = `${Math.min(100, model.time / MUSIC.duration * 100)}%`;
  if (model.combo !== lastCombo) {
    if (!reducedMotion && model.combo > lastCombo) $('combo').animate([{opacity:.6,transform:'scale(1.12)'},{opacity:1,transform:'none'}], {duration:160});
    lastCombo = model.combo;
  }
  const beat = model.beatIndex, fraction = model.beatPhase;
  $('beat-cursor').style.left = `${fraction * 100}%`; $('beat-progress').style.width = `${fraction * 100}%`;
  const building = !model.boost && model.dropRemaining !== null && model.dropRemaining <= 4;
  $('boost-label').textContent = model.boost ? 'RAVY MODE' : model.dropRemaining === null ? 'NAAR DE FINISH' : `DROP IN ${Math.ceil(model.dropRemaining)}s`;
  const dropProgress = model.boost ? model.ravyProgress : model.dropProgress;
  $('drop-progress').style.width = `${dropProgress * 100}%`;
  $('drop-meter').setAttribute('aria-valuenow', String(Math.round(dropProgress * 100)));
  $('drop-meter').setAttribute('aria-label', model.boost ? 'Resterende Ravy Mode' : 'Opbouw naar de drop');
  $('ravy-status').hidden = !model.boost || mode !== 'playing';
  $('ravy-time').textContent = model.ravyRemaining.toFixed(1);
  $('ravy-progress').style.width = `${model.ravyProgress * 100}%`;
  $('beat-label').textContent = 'SPRING OP DE BEAT';
  $('beat-tip').textContent = model.boost ? 'ONKWETSBAAR · DUBBELE SCORE' : 'SPRING BIJ DE GELE RAND → BEATREEKS';
  $('multiplier').textContent = `SCORE ×${model.multiplier}`;
  $('mission-progress').textContent = `${Math.min(model.speakers, MUSIC.mission.speakers)}/${MUSIC.mission.speakers} SPEAKERS · ${model.decks} DECKS · ${Math.min(model.beats, MUSIC.mission.beats)}/${MUSIC.mission.beats} BEATS`;
  $('decks').textContent = model.decks;
  $('mission-hud').classList.toggle('complete', model.speakers >= MUSIC.mission.speakers && model.beats >= MUSIC.mission.beats);
  $('game-frame').classList.toggle('boosting', model.boost && mode === 'playing');
  $('game-frame').classList.toggle('ravy', model.boost && mode === 'playing');
  $('game-frame').classList.toggle('building', building && mode === 'playing');
  $('game-frame').classList.toggle('hit', hitAge < .25);
  $('game-frame').style.setProperty('--beat-pulse', String(reducedMotion ? 0 : Math.max(0, 1 - fraction * 3)));
  if (mode === 'playing' && tutorialUntil > 0) {
    $('tutorial').hidden = model.time >= tutorialUntil;
    if (model.time >= tutorialUntil) { tutorialSeen = true; tutorialUntil = 0; try { localStorage.setItem('skumic-run-tutorial-v2','seen'); } catch {} }
  }
  if (beat !== lastBeat) { lastBeat = beat; $('beat-meter').style.borderColor = '#effe59'; }
  else if (fraction > .22) $('beat-meter').style.borderColor = 'rgba(255,255,255,.18)';
}
function updateCamera(dt) {
  let targetX = 0, targetY = 0;
  if (!reducedMotion && mode === 'playing') {
    const phase = model.distance * 1.35;
    const grounded = model.jumpAge < 0 || model.height < .035;
    const scale = width < 600 ? .78 : 1;
    const stride = grounded ? Math.abs(Math.sin(phase)) - .5 : 0;
    const sway = grounded ? Math.sin(phase * .5) : 0;
    // The world moves opposite a lane change, as if a shoulder camera follows
    // the runner. Jump follow reduces the detached "sprite over wallpaper" feel.
    targetX = (sway * .9 - (model.lane - model.x) * 2.5) * scale;
    targetY = (stride * 2.2 + model.height * 3.6) * scale;
    if (landingAge < .18) targetY += Math.sin(landingAge / .18 * Math.PI) * 1.5 * scale;
  }
  const blend = dt > 0 ? 1 - Math.exp(-dt * 16) : 0;
  camera.x += (targetX - camera.x) * blend;
  camera.y += (targetY - camera.y) * blend;
  if (reducedMotion) { camera.x = 0; camera.y = 0; }
}
function render(dt) {
  ctx.save(); ctx.clearRect(0, 0, width, height);
  landingAge += dt; dropAge += dt; hitAge += dt;
  updateCamera(dt);
  drawBackdrop(camera.x * .16, camera.y * .16);
  ctx.save(); ctx.translate(camera.x, camera.y);
  drawMovingRoadLayer();
  if (mode === 'ready' || mode === 'starting') {
    for (const o of [{ type: 'speaker', lane: 1.72, z: 36 }, { type: 'speaker', lane: 1.72, z: 51 }, { type: 'barrier', lane: .8, z: 62 }, { type: 'cone', lane: .15, z: 21 }]) drawObject(o, true);
    drawRunner(true);
  } else {
    drawObjects.length = 0; for (const object of model.objects) drawObjects.push(object);
    drawObjects.sort((a, b) => b.z - a.z);
    for (const object of drawObjects) if (object.z >= 4) drawObject(object);
    drawRunner();
    for (const object of drawObjects) if (object.z < 4) drawObject(object);
  }
  if (mode === 'playing') {
    for (const particle of particles) { particle.age += dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 350 * dt; ctx.globalAlpha = Math.max(0, 1 - particle.age / particle.duration); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, 4, 4); }
    particles = particles.filter(p => p.age < p.duration); ctx.globalAlpha = 1;
    for (const popup of popups) {
      popup.age += dt; const p = project(popup.lane, 5); ctx.globalAlpha = Math.max(0, 1 - popup.age / .8);
      ctx.fillStyle = popup.white ? '#fff7e5' : '#effe59'; ctx.font = `900 ${width < 600 ? 18 : 22}px Barlow, Impact, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(popup.text, p.x, p.y - 155 - (reducedMotion ? 0 : popup.age * 45));
    }
    popups = popups.filter(p => p.age < .8); ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawRavyLight();
  ctx.restore();
}
function frame(now) {
  const rawDt = (now - (lastFrame || now)) / 1000, dt = Math.min(.05, rawDt); lastFrame = now;
  if (mode === 'countdown') {
    if (rawDt > .5) pause();
    else {
      countdownLeft -= rawDt;
      $('countdown').textContent = String(Math.max(1, Math.ceil(countdownLeft / BEAT)));
      if (countdownLeft <= 0) { beginRun(); feedback('GO!', .35, 1); }
    }
  }
  if (mode === 'playing') {
    // Small simulation steps keep collision detection dependable when frame rate varies.
    const transportTime = audio.time;
    let elapsed = Math.max(0, (transportTime ?? (now - fallbackEpoch) / 1000) - model.time);
    if (elapsed > .5 || rawDt > .5 || (audio.active && audio.ctx?.state !== 'running')) { pause(); elapsed = 0; }
    while (elapsed > .0001 && !model.done) { const step = Math.min(elapsed, 1 / 120); model.update(step); model.events.forEach(handleEvent); elapsed -= step; }
    if (now - uiUpdated > 30) { updateUI(); uiUpdated = now; }
    if (model.done) { updateUI(); finish(); }
  }
  if (now > feedbackUntil) $('feedback').classList.remove('show');
  render(mode === 'playing' ? dt : 0); requestAnimationFrame(frame);
}
setMode('ready'); selectLevel(0); resize(); soundState(); requestAnimationFrame(frame);

// Module-level integration hooks: tests exercise the same model and handlers as real inputs.
export { model, audio, start, pause, resume, selectLevel, selectCharacter, showLevelMenu, updateUI, handleEvent };
export function getGameState() { return { mode, selectedLevel, selectedCharacter, reducedMotion, countdownLeft }; }
export function getCameraState() { return { x: camera.x, y: camera.y }; }
