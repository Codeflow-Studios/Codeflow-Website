import { canWalk, entrance, venues } from './layout.js';
import { createWorld } from './world.js';
import { createFlatWorld } from './flat-world.js';
import { createMap } from './map.js';

const $ = id => document.getElementById(id);
const worldElement = $('world');
const mapToggle = $('map-toggle');
const mapContent = $('map-content');
const gameDialog = $('game-dialog');
const gameView = $('game-view');
const openSeparately = $('open-separately');
const joystick = $('joystick');
const joystickKnob = $('joystick-knob');
const nearbyCard = $('nearby');
const artistDialog = $('artist-dialog');
const artistNames = { gauthier: 'Gauthier', matar: 'Matar' };
const artistKey = 'skumic.festival.artist';
let preferredArtist = null;
try { preferredArtist = localStorage.getItem(artistKey); } catch { /* Private storage can be unavailable. */ }
const player = { ...entrance, heading: Math.PI, speed: 0,
  artist: Object.hasOwn(artistNames, preferredArtist) ? preferredArtist : null };
const visited = new Set();
const held = new Set();
const signs = new Map();
const legend = new Map();
const stick = { x: 0, z: 0, pointer: null };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchControls = matchMedia('(pointer: coarse)');
const northKeys = ['arrowup', 'z', 'w'];
const southKeys = ['arrowdown', 's'];
const westKeys = ['arrowleft', 'q', 'a'];
const eastKeys = ['arrowright', 'd'];
const movementKeys = [...northKeys, ...southKeys, ...westKeys, ...eastKeys, 'shift'];
let marked = null;
let nearby = null;
let lastFrame = 0;
let rig;

function updateLookHint() {
  const hint=$('walk-hint');
  if (!rig) return;
  if (rig.overview) hint.textContent = 'Kies een podium op de plattegrond';
  else if (document.pointerLockElement === worldElement) hint.textContent = 'Muis om rond te kijken · Scroll om te zoomen · Esc voor cursor';
  else if (touchControls.matches) hint.textContent = 'Loop met de joystick · Veeg om rond te kijken';
  else if (worldElement.requestPointerLock) hint.textContent = 'Klik op het terrein om rond te kijken · Scroll om te zoomen';
  else hint.textContent = 'Loop naar een podium · Scroll om te zoomen';
}
function toggleOverview() {
  if (!rig) return;
  clearInput();
  $('camera-toggle').textContent = rig.toggle() ? 'Terug naar speler' : 'Vogelperspectief';
  updateLookHint();
  worldElement.focus({preventScroll:true});
}

function setMap(open) {
  rig?.releaseLook();
  mapToggle.setAttribute('aria-expanded', String(open));
  mapContent.hidden = !open;
}

setMap(!matchMedia('(max-width: 700px), (pointer: coarse)').matches);
mapToggle.addEventListener('click', () => setMap(mapContent.hidden));

function clearStick() {
  stick.pointer = null;
  stick.x = 0;
  stick.z = 0;
  joystickKnob.style.transform = '';
}

function clearInput() {
  held.clear();
  clearStick();
}

function showArtistPicker() {
  rig?.releaseLook();
  clearInput();
  player.speed = 0;
  $('cancel-artist').hidden = !player.artist;
  artistDialog.showModal();
  artistDialog.querySelector(`[data-artist="${player.artist || 'gauthier'}"]`).focus({ preventScroll: true });
}

function showArtistName() {
  $('artist-name').textContent = artistNames[player.artist];
  const changeButton = $('change-artist');
  changeButton.hidden = false;
  changeButton.setAttribute('aria-label', artistNames[player.artist] + ' · Wissel van artiest');
  for (const button of artistDialog.querySelectorAll('[data-artist]')) {
    button.setAttribute('aria-pressed', String(button.dataset.artist === player.artist));
  }
}

for (const button of artistDialog.querySelectorAll('[data-artist]')) {
  button.addEventListener('click', () => {
    player.artist = button.dataset.artist;
    try { localStorage.setItem(artistKey, player.artist); } catch { /* The selection works for this visit. */ }
    showArtistName();
    artistDialog.close();
  });
}
$('change-artist').addEventListener('click', showArtistPicker);
$('cancel-artist').addEventListener('click', () => artistDialog.close());
artistDialog.addEventListener('cancel', event => { if (!player.artist) event.preventDefault(); });
artistDialog.addEventListener('close', () => worldElement.focus({ preventScroll: true }));
if (player.artist) showArtistName();
else showArtistPicker();

function updateStick(event) {
  if (event.pointerId !== stick.pointer) return;
  const zone = joystick.getBoundingClientRect();
  const limit = zone.width * .34;
  const x = event.clientX - (zone.left + zone.width / 2);
  const z = event.clientY - (zone.top + zone.height / 2);
  const length = Math.hypot(x, z);
  const divisor = Math.max(limit, length);
  stick.x = x / divisor;
  stick.z = z / divisor;
  joystickKnob.style.transform = `translate(${stick.x * limit}px, ${stick.z * limit}px)`;
}

joystick.addEventListener('pointerdown', event => {
  if (stick.pointer !== null) return;
  stick.pointer = event.pointerId;
  joystick.setPointerCapture(stick.pointer);
  updateStick(event);
});
joystick.addEventListener('pointermove', updateStick);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  joystick.addEventListener(type, event => {
    if (event.pointerId === stick.pointer) clearStick();
  });
}

function refreshStops() {
  for (const venue of venues) {
    const active = String(marked === venue);
    signs.get(venue).setAttribute('aria-pressed', active);
    const { button, state } = legend.get(venue);
    button.setAttribute('aria-pressed', active);
    state.textContent = visited.has(venue.id) ? '✓' : '';
    button.title = visited.has(venue.id) ? 'Bezocht · Wijs de stand aan' : 'Wijs de stand aan';
  }
  $('visit-count').textContent = `${visited.size} van 3 stands bezocht`;
  [...$('visit-dots').children].forEach((dot, index) => {
    dot.classList.toggle('is-visited', index < visited.size);
  });
}

function makeStop(venue, kind) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = kind;
  button.style.setProperty('--accent', venue.color);
  const marker = document.createElement('span');
  marker.className = 'diamond';
  marker.setAttribute('aria-hidden', 'true');
  button.append(marker, venue.title);
  button.addEventListener('click', () => {
    marked = marked === venue ? null : venue;
    refreshStops();
  });
  return button;
}

for (const venue of venues) {
  const sign = makeStop(venue, 'world-sign');
  sign.hidden = true;
  $('world-signs').append(sign);
  signs.set(venue, sign);
  const button = makeStop(venue, 'map-stop');
  const state = document.createElement('span');
  state.className = 'map-state';
  state.setAttribute('aria-hidden', 'true');
  button.append(state);
  $('map-legend').append(button);
  legend.set(venue, { button, state });
}
refreshStops();

function enterGame() {
  if (!nearby || gameDialog.open || artistDialog.open) return;
  const game = nearby;
  rig?.releaseLook();
  $('game-title').textContent = game.title;
  $('game-input-note').hidden = !game.keyboard;
  const frame = document.createElement('iframe');
  frame.title = game.title;
  frame.allow = 'autoplay; fullscreen; gamepad';
  frame.allowFullscreen = true;
  frame.src = openSeparately.href = game.url;
  gameDialog.showModal();
  gameView.append(frame);
  visited.add(game.id);
  if (marked === game) marked = null;
  refreshStops();
  clearInput();
}

gameDialog.addEventListener('close', () => {
  gameView.replaceChildren();
  clearInput();
  worldElement.focus({ preventScroll: true });
});
$('back-to-festival').addEventListener('click', () => gameDialog.close());
$('enter-game').addEventListener('click', enterGame);

window.addEventListener('keydown', event => {
  if (gameDialog.open || artistDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if ((key === 'escape' || key === 'tab') && document.pointerLockElement === worldElement) {
    rig?.releaseLook();
    clearInput();
    return;
  }
  if (key === 'm' && rig && !event.repeat) {
    event.preventDefault();
    toggleOverview();
    return;
  }
  if (movementKeys.includes(key)) {
    event.preventDefault();
    held.add(key);
  }
  if (key === 'e' && !event.repeat && nearby) {
    event.preventDefault();
    enterGame();
  }
});
window.addEventListener('keyup', event => held.delete(event.key.toLowerCase()));
function leaveWorld() {
  clearInput();
  rig?.releaseLook();
}
window.addEventListener('blur', leaveWorld);
document.addEventListener('visibilitychange', () => { if (document.hidden) leaveWorld(); });
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) clearInput();
  updateLookHint();
});
worldElement.addEventListener('lookunavailable', () => {
  $('walk-hint').textContent = 'Vrij rondkijken niet actief · Klik opnieuw op het terrein';
});
touchControls.addEventListener('change', updateLookHint);

function walk(elapsed, yaw) {
  const pressed = keys => Number(keys.some(key => held.has(key)));
  const side = pressed(eastKeys) - pressed(westKeys) + stick.x;
  const forward = pressed(southKeys) - pressed(northKeys) + stick.z;
  const x = side * Math.cos(yaw) + forward * Math.sin(yaw);
  const z = forward * Math.cos(yaw) - side * Math.sin(yaw);
  const length = Math.hypot(x, z);
  player.speed = 0;
  if (length < .075) return;
  const speed = (held.has('shift') ? 13.1 : 7.9) / Math.max(length, 1);
  const previousX = player.x;
  const previousZ = player.z;
  const newX = player.x + x * speed * elapsed;
  const newZ = player.z + z * speed * elapsed;
  if (canWalk(newX, player.z)) player.x = newX;
  if (canWalk(player.x, newZ)) player.z = newZ;
  if (elapsed) player.speed = Math.hypot(player.x - previousX, player.z - previousZ) / elapsed;
  player.heading = Math.atan2(x, z);
}

function updateNearby() {
  const next = venues.find(zone => Math.hypot(player.x - zone.doorX, player.z - zone.doorZ) < 4.8) || null;
  if (next === nearby) return;
  nearby = next;
  nearbyCard.hidden = !nearby;
  $('walk-hint').hidden = Boolean(nearby);
  if (nearby) {
    nearbyCard.style.setProperty('--accent', nearby.color);
    $('nearby-type').textContent = nearby.type;
    $('nearby-title').textContent = nearby.title;
    $('enter-game').setAttribute('aria-label', `Speel ${nearby.title}`);
  }
}

function positionSigns(world) {
  const width = worldElement.clientWidth;
  const height = worldElement.clientHeight;
  for (const [venue, sign] of signs) {
    const position = world.project(venue.x, venue.signHeight, venue.z + venue.depth / 2 - .6);
    const show = !world.rig || world.rig.overview || marked === venue;
    const visible = show && position.inFront !== false && position.x > 76 && position.x < width - 76 && position.y > 70 && position.y < height - 125;
    sign.hidden = !visible;
    if (visible) {
      sign.style.left = `${position.x.toFixed(1)}px`;
      sign.style.top = `${position.y.toFixed(1)}px`;
    }
  }
}

async function start() {
  await Promise.all([
    document.fonts.load('400 24px "Press Start 2P"'),
    document.fonts.load('700 24px "Pixelify Sans"'),
  ]);
  let world;
  try {
    world = createWorld(worldElement, reduceMotion);
  } catch (error) {
    console.warn('3D-weergave starten', error);
    worldElement.replaceChildren();
    world = createFlatWorld(worldElement);
    $('notice').textContent = 'Bovenaanzicht actief';
    $('notice').hidden = false;
  }
  const drawMap = createMap($('minimap'));
  rig = world.rig;
  if (rig) {
    const cameraButton = $('camera-toggle');
    cameraButton.hidden = false;
    $('map-shortcut').hidden = false;
    cameraButton.addEventListener('click', toggleOverview);
    updateLookHint();
  }
  new ResizeObserver(() => world.resize()).observe(worldElement);

  function animate(now) {
    const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, .25) : 0;
    lastFrame = now;
    if (!gameDialog.open) {
      const steps = Math.max(1, Math.ceil(elapsed / .045));
      if (!artistDialog.open) {
        for (let step = 0; step < steps; step++) walk(elapsed / steps, world.rig?.yaw || 0);
      }
      updateNearby();
      world.frame(player, elapsed, now / 1000, marked, nearby);
      positionSigns(world);
      if (!mapContent.hidden) drawMap(player, marked, visited);
      $('loading').hidden = true;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

start().catch(error => {
  console.error(error);
  $('loading').textContent = 'Het festivalterrein kon niet laden. Vernieuw de pagina.';
});
