import { venues, sideStands } from './layout.js';
import { limitPaintElevation } from './paintball.js';

function cameraObstacles(THREE) {
  const obstacles = [];
  function add(x, z, width, depth, top, bottom = 0) {
    // Leave room for the camera's near plane at corners.
    const halfWidth = width / 2 + .19, halfDepth = depth / 2 + .19;
    obstacles.push(new THREE.Box3(
      new THREE.Vector3(x - halfWidth, bottom - .16, z - halfDepth),
      new THREE.Vector3(x + halfWidth, top + .16, z + halfDepth),
    ));
  }
  for (const stage of venues) add(stage.x, stage.z, stage.width, stage.depth, stage.signHeight);
  for (const { x, z, width, depth } of sideStands) {
    add(x, z, width + .5, depth + 1.25, 4.4, 2.78);
    add(x, z + depth / 2 - .44, width - .26, .92, 1.35);
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      add(x + side * (width / 2 - .18), z + end * (depth / 2 - .18), .19, .19, 3);
    }
  }
  add(-33, -17.8, 17.6, 6.4, 14);
  add(0, 41.42, 13, .74, 5.54, 4.30);
  for (const x of [-6, 6]) add(x, 41, 1.55, 1.28, 4.88);
  return obstacles;
}

export function createCameraRig(THREE, container, reduceMotion) {
  const camera = new THREE.PerspectiveCamera(55, 1, .08, 270);
  const focus = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const ray = new THREE.Ray();
  const desiredPosition = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const obstacles = cameraObstacles(THREE);
  let yaw = 0, elevation = 0, zoom = 1, overview = false, first = true;
  let yawVelocity = 0, boomDistance = 0, lift = 0, baseFov = 55;
  let viewYaw = yaw, viewElevation = elevation, viewZoom = zoom;
  let touchLooking = false, wantsLock = false;
  let steering = false, steeringYaw = yaw, followYaw = null, manualLookTime = 0;
  const locked = () => document.pointerLockElement === container;
  function look(dx, dy, sensitivity) {
    if (!dx && !dy) return;
    yaw = THREE.MathUtils.euclideanModulo(yaw - dx * sensitivity, Math.PI * 2);
    elevation = limitPaintElevation(elevation - dy * sensitivity);
    steeringYaw = yaw;
    followYaw = null;
    manualLookTime = .4;
    yawVelocity = 0;
  }
  function releaseLook() {
    wantsLock = false;
    if (locked()) document.exitPointerLock();
  }
  function lockFailed() {
    if (!wantsLock || locked()) return;
    wantsLock = false;
    container.dispatchEvent(new Event('lookunavailable'));
  }
  container.addEventListener('pointerdown', e => {
    if (overview || e.pointerType !== 'mouse' || e.button !== 0 || locked() || wantsLock) return;
    wantsLock = true;
    container.focus({preventScroll:true});
    if (!container.requestPointerLock) { lockFailed(); return; }
    try { container.requestPointerLock()?.catch(lockFailed); }
    catch { lockFailed(); }
  });
  document.addEventListener('pointerlockchange', () => {
    if (locked() && !wantsLock) document.exitPointerLock();
    if (!locked()) wantsLock = false;
  });
  document.addEventListener('pointerlockerror', lockFailed);
  document.addEventListener('mousemove', e => {
    if (wantsLock && locked()) look(e.movementX,e.movementY,.0035);
  });
  container.addEventListener('wheel', e => {
    if (overview || e.ctrlKey) return;
    e.preventDefault();
    const unit=e.deltaMode===1 ? 16 : e.deltaMode===2 ? container.clientHeight : 1;
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(e.deltaY * unit * .0011), .52, 1.95);
  }, { passive: false });

  function aimBehindPlayer(dt) {
    const delta = followYaw - yaw;
    const turn = Math.atan2(Math.sin(delta), Math.cos(delta));
    // A critically damped turn eases in and settles at the target without an overshoot.
    const decay = reduceMotion ? 0 : Math.exp(-11 * dt);
    const step = (yawVelocity - 11 * turn) * dt;
    yawVelocity = (yawVelocity - 11 * step) * decay;
    yaw = THREE.MathUtils.euclideanModulo(yaw + turn + (step - turn) * decay, Math.PI * 2);
  }

  function cameraClearance() {
    let clearance = ray.direction.y < 0 ? (ray.origin.y - .55) / -ray.direction.y : Infinity;
    for (const obstacle of obstacles) {
      if (ray.intersectBox(obstacle, hit)) {
        clearance = Math.min(clearance, Math.max(.09, ray.origin.distanceTo(hit) - .05));
      }
    }
    return clearance;
  }

  function placeCamera(player, dt, snap) {
    if (snap) {
      viewYaw = yaw;
      viewElevation = elevation;
      viewZoom = zoom;
    } else {
      const turn = Math.atan2(Math.sin(yaw - viewYaw), Math.cos(yaw - viewYaw));
      viewYaw += turn * (1 - Math.exp(-24 * dt));
      viewElevation = THREE.MathUtils.damp(viewElevation, elevation, 22, dt);
      viewZoom = THREE.MathUtils.damp(viewZoom, zoom, 13, dt);
    }
    const dx = Math.sin(viewYaw), dz = Math.cos(viewYaw);
    const distance = (camera.aspect < .9 ? 5.7 : 5.35) * viewZoom;
    const shoulder = Math.min(distance * .25, 1.30);
    const slope = Math.tan(viewElevation);
    const pivotHeight = 1.74 + player.jumpHeight * .65;
    desiredPosition.set(focus.x + dx * distance + dz * shoulder,
      pivotHeight + .78 - Math.sin(viewElevation) * .53, focus.z + dz * distance - dx * shoulder);
    // Test camera clearance from the player before it swings past scenery.
    ray.origin.set(player.x, pivotHeight, player.z);
    ray.direction.subVectors(desiredPosition, ray.origin);
    let desiredDistance = ray.direction.length();
    ray.direction.normalize();
    let clearance = cameraClearance();
    const room = Math.min(desiredDistance, clearance);
    const goalLift = 1.85 * (1 - THREE.MathUtils.smoothstep(room, 1.2, 3.7));
    lift = snap ? goalLift : THREE.MathUtils.damp(lift, goalLift, 10, dt);
    if (lift > .015) {
      // Raise the view beside the obstacle, with a second check for canopies and overhangs.
      ray.at(room, desiredPosition);
      desiredPosition.y += lift;
      ray.direction.subVectors(desiredPosition, ray.origin);
      desiredDistance = ray.direction.length();
      ray.direction.normalize();
      clearance = cameraClearance();
    }
    const goal = Math.min(desiredDistance, clearance);
    boomDistance = snap ? goal : Math.min(clearance, THREE.MathUtils.damp(boomDistance, goal, 8, dt));
    ray.at(boomDistance, camera.position);

    const confined = 1 - THREE.MathUtils.smoothstep(Math.min(room, boomDistance), 1.3, 4.8);
    const goalFov = baseFov + 12 * confined;
    const fov = snap ? goalFov : THREE.MathUtils.damp(camera.fov, goalFov, 12, dt);
    if (Math.abs(camera.fov - fov) > .01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const lookAhead = THREE.MathUtils.lerp(7.8, 3.4, confined);
    const aimHeight = 1.56 + player.jumpHeight + lookAhead * slope;
    const aimOffset = .36 * (1 - confined);
    aim.set(focus.x - dx * lookAhead + dz * aimOffset, aimHeight,
      focus.z - dz * lookAhead - dx * aimOffset);
    camera.lookAt(aim);
  }

  return {
    camera,
    touchLook(dx, dy) {
      touchLooking = true;
      look(dx, dy, .006);
    },
    endTouchLook() { touchLooking = false; },
    get overview() { return overview; },
    get paintHeading() { return yaw + Math.PI; },
    get paintElevation() { return elevation; },
    adjustPaintElevation(amount) { elevation = limitPaintElevation(elevation + amount); },
    movementYaw(moving) {
      if (overview) return 0;
      // Keep the start bearing while a direction is held so camera follow can't curve the walk.
      if (moving && !steering) steeringYaw = followYaw ?? yaw;
      steering = moving;
      return steeringYaw;
    },
    releaseLook,
    toggle() {
      releaseLook();
      steering = false;
      followYaw = null;
      yawVelocity = 0;
      overview = !overview;
      first = true;
      return overview;
    },
    resize(aspect) {
      camera.aspect = aspect;
      baseFov = aspect < .9 ? 67 : 55;
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    },
    update(player, dt) {
      const blend = first ? 1 : 1 - Math.exp(-dt * 13);
      const snap = first || reduceMotion;
      focus.x += (player.x - focus.x) * blend;
      focus.z += (player.z - focus.z) * blend;
      if (first && !overview) yaw = THREE.MathUtils.euclideanModulo(player.heading + Math.PI, Math.PI * 2);
      first = false;
      if (overview) {
        if (camera.fov !== baseFov) {
          camera.fov = baseFov;
          camera.updateProjectionMatrix();
        }
        const altitude = camera.aspect < .9 ? 125 : 82;
        camera.position.set(0, altitude, 49);
        camera.lookAt(0, 0, -4);
        return;
      }
      manualLookTime = Math.max(0, manualLookTime - dt);
      if (steering && !touchLooking && manualLookTime === 0) followYaw = player.heading + Math.PI;
      if (followYaw !== null) aimBehindPlayer(dt);
      placeCamera(player, dt, snap);
    },
  };
}
