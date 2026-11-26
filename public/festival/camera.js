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
  let yaw = 0, lift = 0, zoom = 1, overview = false, first = true;
  let pointer = null, lastX, lastY;
  container.addEventListener('pointerdown', e => {
    if (overview || pointer !== null || e.button !== 0) return;
    pointer = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    container.setPointerCapture(pointer);
  });
  container.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer) return;
    yaw -= (e.clientX - lastX) * .006;
    lift = THREE.MathUtils.clamp(lift + (e.clientY - lastY) * .018, -1.0, 5);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  container.addEventListener('lostpointercapture', () => { pointer = null; });
  container.addEventListener('wheel', e => {
    if (overview) return;
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(e.deltaY * .0011), .67, 1.9);
  }, { passive: false });

  return {
    camera,
    get yaw() { return overview ? 0 : yaw; },
    get overview() { return overview; },
    toggle() { overview = !overview; first = true; return overview; },
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
      const distance = boomLength(focus.x, focus.z, dx, dz, (camera.aspect < .9 ? 9.4 : 10.0) * zoom);
      const shoulder = Math.min(distance * .07, .68);
      camera.position.set(focus.x + dx * distance + dz * shoulder,
        1.68 + distance * (.225 + lift * .063), focus.z + dz * distance - dx * shoulder);
      aim.set(focus.x - dx * 9.5, 1.12, focus.z - dz * 9.5);
      camera.lookAt(aim);
    },
  };
}
