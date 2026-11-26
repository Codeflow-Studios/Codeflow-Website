import { venues, sideStands, bounds } from './layout.js';

// Shorten the boom where a stage, kiosk, or wheel would hide the player.
const buildings = [...venues, ...sideStands].map(s => bounds(s.x, s.z, s.width + .6, s.depth + .6));
buildings.push(bounds(-33, -17.8, 17.6, 6.4));

function boomLength(x, z, dx, dz, length) {
  for (const b of buildings) {
    const t1 = (b.left - x) / (dx || 1e-8);
    const t2 = (b.right - x) / (dx || 1e-8);
    const t3 = (b.back - z) / (dz || 1e-8);
    const t4 = (b.front - z) / (dz || 1e-8);
    const near = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const far = Math.min(Math.max(t1, t2), Math.max(t3, t4));
    if (far >= near && near > 0) length = Math.min(length, Math.max(.75, near - .45));
  }
  return length;
}

export function createCameraRig(THREE, container) {
  const camera = new THREE.PerspectiveCamera(55, 1, .08, 270);
  const focus = new THREE.Vector3();
  const aim = new THREE.Vector3();
  let yaw = 0, pitch = .225, zoom = 1, overview = false, first = true;
  let touch = null, lastX, lastY, wantsLock = false;
  const locked = () => document.pointerLockElement === container;
  function look(dx, dy, sensitivity) {
    yaw = THREE.MathUtils.euclideanModulo(yaw - dx * sensitivity, Math.PI * 2);
    pitch = THREE.MathUtils.clamp(pitch + dy * sensitivity, -.12, 1.16);
  }
  function releaseLook() {
    wantsLock = false;
    if (locked()) document.exitPointerLock();
    if (touch !== null && container.hasPointerCapture(touch)) container.releasePointerCapture(touch);
    touch = null;
  }
  function lockFailed() {
    if (!wantsLock || locked()) return;
    wantsLock = false;
    container.dispatchEvent(new Event('lookunavailable'));
  }
  container.addEventListener('pointerdown', e => {
    if (overview || e.button !== 0) return;
    if (e.pointerType === 'mouse') {
      if (locked() || wantsLock) return;
      wantsLock = true;
      container.focus({preventScroll:true});
      if (!container.requestPointerLock) { lockFailed(); return; }
      try { container.requestPointerLock()?.catch(lockFailed); }
      catch { lockFailed(); }
      return;
    }
    if (touch !== null) return;
    touch = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    container.setPointerCapture(touch);
  });
  document.addEventListener('pointerlockchange', () => {
    if (locked() && !wantsLock) document.exitPointerLock();
    if (!locked()) wantsLock = false;
  });
  document.addEventListener('pointerlockerror', lockFailed);
  document.addEventListener('mousemove', e => {
    if (wantsLock && locked()) look(e.movementX,e.movementY,.0035);
  });
  container.addEventListener('pointermove', e => {
    if (e.pointerId !== touch) return;
    look(e.clientX-lastX,e.clientY-lastY,.006);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  container.addEventListener('lostpointercapture', e => { if (touch===e.pointerId) touch=null; });
  container.addEventListener('wheel', e => {
    if (overview || e.ctrlKey) return;
    e.preventDefault();
    const unit=e.deltaMode===1 ? 16 : e.deltaMode===2 ? container.clientHeight : 1;
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(e.deltaY * unit * .0011), .52, 1.95);
  }, { passive: false });

  return {
    camera,
    get yaw() { return overview ? 0 : yaw; },
    get overview() { return overview; },
    releaseLook,
    toggle() { releaseLook(); overview = !overview; first = true; return overview; },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < .9 ? 67 : 55;
      camera.updateProjectionMatrix();
    },
    update(player, dt) {
      const blend = first ? 1 : 1 - Math.exp(-dt * 13);
      focus.x += (player.x - focus.x) * blend;
      focus.z += (player.z - focus.z) * blend;
      first = false;
      if (overview) {
        const altitude = camera.aspect < .9 ? 125 : 82;
        camera.position.set(0, altitude, 49);
        camera.lookAt(0, 0, -4);
        return;
      }
      const dx = Math.sin(yaw), dz = Math.cos(yaw);
      const distance = boomLength(focus.x, focus.z, dx, dz, (camera.aspect < .9 ? 9.4 : 10.0) * zoom * Math.cos(pitch));
      const shoulder = Math.min(distance * .07, .68);
      const slope = Math.tan(pitch);
      camera.position.set(focus.x + dx * distance + dz * shoulder,
        Math.max(.55,1.68 + distance * slope), focus.z + dz * distance - dx * shoulder);
      aim.set(focus.x - dx * 9.5, 1.12 - 9.5 * (slope-Math.tan(.225)), focus.z - dz * 9.5);
      camera.lookAt(aim);
    },
  };
}
