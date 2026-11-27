import { canWalk, entrance, venues } from './layout.js';
import { createWorld } from './world.js';
import { createFlatWorld } from './flat-world.js';
import { createMap } from './map.js';
import { createPaintball, limitPaintElevation, paintballPickup } from './paintball.js';
import { inBackstage } from './backstage-layout.js';

const $ = id => document.getElementById(id);
const worldElement = $('world');
const mapToggle = $('map-toggle');
const mapContent = $('map-content');
const gameDialog = $('game-dialog');
const gameView = $('game-view');
const openSeparately = $('open-separately');
const joystick = $('joystick');
const joystickKnob = $('joystick-knob');
const jumpButton = $('jump');
const paintButton = $('paint');
const paintAim = $('paint-aim');
const paintCount = $('paint-count');
const pickupCard = $('paintball-pickup');
const pickupMessage = $('paintball-acquired');
const paintball = createPaintball(hits => { paintCount.textContent = `${hits} verftreffers`; });
const nearbyCard = $('nearby');
const artistDialog = $('artist-dialog');
const artistNames = { gauthier: 'Gauthier', matar: 'Matar' };
const artistKey = 'skumic.festival.artist';
let preferredArtist = null;
try { preferredArtist = localStorage.getItem(artistKey); } catch { /* Private storage can be unavailable. */ }
const player = { ...entrance, heading: Math.PI, speed: 0, strafe: 0, forward: 0,
  hasPaintball: false, markerKick: 0, paintElevation: 0, jumpAge: -1, jumpHeight: 0, liftPose: 0, crouch: 0,
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
let pickupMessageUntil = 0;
let rig;
let paintPointer = null;
let paintQueued = false;
let worldTouch = null;
const tapSlop = 10;
const tapDuration = 320;
const pitchKeys = ['r', 'v'];

function updateLookHint() {
  const hint=$('walk-hint');
  if (!player.hasPaintball) hint.textContent = 'De paintballgun zweeft bij de ingang';
  else if (!rig) hint.textContent = touchControls.matches ? 'Loop om te richten · Veeg voor hoogte · Tik om te schieten' : 'Loop om te richten · R/V voor hoogte';
  else if (rig.overview) hint.textContent = 'Kies een podium op de plattegrond';
  else if (document.pointerLockElement === worldElement) hint.textContent = 'Muis om te richten · Scroll om te zoomen · Esc voor cursor';
  else if (touchControls.matches) hint.textContent = 'Veeg om te richten · Tik om te schieten';
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
  clearWorldTouch();
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
  paintPointer = null;
  paintQueued = false;
  clearWorldTouch();
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
  $('visit-count').textContent = `${visited.size} van ${venues.length} stands bezocht`;
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

function canPickUpPaintball() {
  return player.artist && !player.hasPaintball && !gameDialog.open && !artistDialog.open &&
    Math.hypot(player.x - paintballPickup.x, player.z - paintballPickup.z) <= paintballPickup.radius;
}

function pickUpPaintball() {
  if (!canPickUpPaintball()) return false;
  player.hasPaintball = true;
  paintQueued = false;
  paintPointer = null;
  held.delete('f');
  pickupMessageUntil = performance.now() + 3600;
  pickupMessage.textContent = '+1 Paintballgun';
  pickupMessage.hidden = false;
  pickupCard.hidden = true;
  paintButton.hidden = false;
  $('paint-shortcut').hidden = false;
  updateLookHint();
  worldElement.focus({ preventScroll: true });
  return true;
}

$('pick-up-paintball').addEventListener('click', pickUpPaintball);

const jumpWindup = .07;
const jumpFlight = .66;
const jumpRecovery = .14;

function jump() {
  if (!player.artist || gameDialog.open || artistDialog.open || player.jumpAge >= 0) return;
  player.jumpAge = 0;
}

function advanceJump(dt) {
  if (player.jumpAge < 0) return;
  player.jumpAge += dt;
  const airTime = player.jumpAge - jumpWindup;
  const progress = Math.max(0,Math.min(1,airTime/jumpFlight));
  player.jumpHeight = 4 * .92 * progress * (1 - progress);
  player.liftPose = Math.sin(Math.PI * progress);
  const landing = (airTime - jumpFlight) / jumpRecovery;
  player.crouch = airTime < 0 ? .73 * Math.sin(Math.PI * player.jumpAge / jumpWindup) :
    landing >= 0 && landing < 1 ? Math.sin(Math.PI * landing) : 0;
  if (landing >= 1) {
    player.jumpAge = -1;
    player.jumpHeight = player.liftPose = player.crouch = 0;
  }
}

jumpButton.addEventListener('click',jump);
paintButton.addEventListener('pointerdown', event => {
  if (!player.hasPaintball || event.button !== 0) return;
  paintPointer = event.pointerId;
  paintQueued = true;
  paintButton.setPointerCapture(event.pointerId);
});
paintButton.addEventListener('lostpointercapture', releasePaintPointer);
paintButton.addEventListener('click', event => {
  if (player.hasPaintball && event.detail === 0) paintQueued = true;
});
worldElement.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    if (worldTouch || rig?.overview || artistDialog.open || gameDialog.open) return;
    const { clientX: x, clientY: y, timeStamp: started, pointerId: id } = event;
    worldTouch = { id, x, y, lastX: x, lastY: y, started, dragging: false };
    worldElement.setPointerCapture(event.pointerId);
    return;
  }
  if (player.hasPaintball && document.pointerLockElement === worldElement) {
    paintPointer = event.pointerId;
    paintQueued = true;
  }
});
worldElement.addEventListener('pointermove', event => {
  if (worldTouch?.id !== event.pointerId) return;
  if (!worldTouch.dragging && touchDistance(event) < tapSlop) return;
  worldTouch.dragging = true;
  const dx = event.clientX - worldTouch.lastX, dy = event.clientY - worldTouch.lastY;
  if (rig) rig.touchLook(dx, dy);
  else adjustPaintElevation(-dy * .006);
  worldTouch.lastX = event.clientX;
  worldTouch.lastY = event.clientY;
});
worldElement.addEventListener('pointerup', event => {
  if (worldTouch?.id !== event.pointerId) return;
  if (player.hasPaintball && !worldTouch.dragging && touchDistance(event) < tapSlop &&
      event.timeStamp - worldTouch.started <= tapDuration) {
    paintQueued = true;
  }
  clearWorldTouch();
});
function touchDistance(event) {
  return Math.hypot(event.clientX - worldTouch.x, event.clientY - worldTouch.y);
}
function clearWorldTouch() {
  const id = worldTouch?.id;
  worldTouch = null;
  rig?.endTouchLook();
  if (id !== undefined && worldElement.hasPointerCapture(id)) worldElement.releasePointerCapture(id);
}
worldElement.addEventListener('lostpointercapture', releasePaintPointer);
function adjustPaintElevation(amount) {
  if (rig && !rig.overview) rig.adjustPaintElevation(amount);
  else player.paintElevation = limitPaintElevation(player.paintElevation + amount);
}
function releasePaintPointer(event) {
  if (event.pointerId === paintPointer) paintPointer = null;
  if (event.pointerId === worldTouch?.id) clearWorldTouch();
}
window.addEventListener('pointerup', releasePaintPointer);
window.addEventListener('pointercancel', releasePaintPointer);
window.addEventListener('keydown', event => {
  if (gameDialog.open || artistDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (event.code === 'Space' || key === ' ') {
    if (event.target?.closest?.('button,a,input,textarea,select,[contenteditable=true]')) return;
    event.preventDefault();
    if (!event.repeat) jump();
    return;
  }
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
  if (key === 'f') {
    if (!player.hasPaintball) return;
    if (event.target?.closest?.('input,textarea,select,[contenteditable=true]')) return;
    event.preventDefault();
    if (!event.repeat) paintQueued = true;
    held.add(key);
    return;
  }
  if (movementKeys.includes(key) || pitchKeys.includes(key)) {
    event.preventDefault();
    held.add(key);
  }
  if (key === 'e' && !event.repeat) {
    if (pickUpPaintball()) {
      event.preventDefault();
    } else if (nearby) {
      event.preventDefault();
      enterGame();
    }
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

function walk(elapsed) {
  const pressed = keys => Number(keys.some(key => held.has(key)));
  const side = pressed(eastKeys) - pressed(westKeys) + stick.x;
  const forward = pressed(southKeys) - pressed(northKeys) + stick.z;
  const length = Math.hypot(side, forward);
  const privateOverview = rig?.overview && inBackstage(player.x, player.z);
  const moving = !privateOverview && length >= .075;
  const yaw = rig?.movementYaw(moving) ?? 0;
  player.speed = 0;
  player.strafe = 0;
  player.forward = 0;
  if (!moving || !elapsed) return;
  const x = side * Math.cos(yaw) + forward * Math.sin(yaw);
  const z = forward * Math.cos(yaw) - side * Math.sin(yaw);
  const speed = (held.has('shift') ? 13.1 : 7.9) / Math.max(length, 1);
  const previousX = player.x;
  const previousZ = player.z;
  const newX = player.x + x * speed * elapsed;
  const newZ = player.z + z * speed * elapsed;
  const allowBackstage = Boolean(rig && !rig.overview);
  if (canWalk(newX, player.z, allowBackstage)) player.x = newX;
  if (canWalk(player.x, newZ, allowBackstage)) player.z = newZ;
  const deltaX = player.x - previousX, deltaZ = player.z - previousZ;
  const travel = Math.hypot(deltaX, deltaZ);
  player.speed = travel / elapsed;
  if (!travel) return;
  player.heading = rig && !rig.overview ? yaw + Math.PI : Math.atan2(deltaX, deltaZ);
  // Project actual travel back onto the camera axes so wall slides animate correctly.
  player.strafe = (deltaX * Math.cos(yaw) - deltaZ * Math.sin(yaw)) / travel;
  player.forward = -(deltaX * Math.sin(yaw) + deltaZ * Math.cos(yaw)) / travel;
}

function updateNearby() {
  const next = venues.find(zone => Math.hypot(player.x - zone.doorX, player.z - zone.doorZ) < 4.8) || null;
  const pickup = Boolean(canPickUpPaintball());
  pickupCard.hidden = !pickup;
  nearbyCard.hidden = pickup || !next;
  $('walk-hint').hidden = pickup || Boolean(next);
  if (next === nearby) return;
  nearby = next;
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
    world = createWorld(worldElement, reduceMotion, paintball);
  } catch (error) {
    console.warn('3D-weergave starten', error);
    worldElement.replaceChildren();
    world = createFlatWorld(worldElement, paintball);
    $('notice').textContent = 'Bovenaanzicht actief';
    $('notice').hidden = false;
  }
  const drawMap = createMap($('minimap'));
  rig = world.rig;
  updateLookHint();
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
        for (let step = 0; step < steps; step++) {
          const dt = elapsed / steps;
          advanceJump(dt);
          walk(dt);
          adjustPaintElevation((Number(held.has('r')) - Number(held.has('v'))) * dt * 1.25);
          if (rig && !rig.overview) {
            player.heading = rig.paintHeading;
            player.paintElevation = rig.paintElevation;
          }
          const privateOverview = rig?.overview && inBackstage(player.x, player.z);
          const firing = player.hasPaintball && !privateOverview && (paintQueued || held.has('f') || paintPointer !== null);
          paintball.update(player, dt, firing, player.heading, player.paintElevation);
          paintQueued = false;
        }
      }
      updateNearby();
      world.frame(player, elapsed, now / 1000, marked, nearby);
      positionSigns(world);
      if (player.hasPaintball && !(rig?.overview && inBackstage(player.x, player.z))) {
        const point = paintball.preview(player, player.heading, player.paintElevation);
        const aim = (world.projectPaint || world.project)(point.x, point.y, point.z);
        paintAim.classList.toggle('on-target', Boolean(point.onTarget));
        paintAim.hidden = aim.inFront === false || aim.x < 10 || aim.y < 10 ||
          aim.x > worldElement.clientWidth - 10 || aim.y > worldElement.clientHeight - 10;
        if (!paintAim.hidden) paintAim.style.transform = `translate(${aim.x}px, ${aim.y}px)`;
      } else {
        paintAim.hidden = true;
      }
      paintCount.hidden = !player.hasPaintball;
      pickupMessage.hidden = now >= pickupMessageUntil;
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
