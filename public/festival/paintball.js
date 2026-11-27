import { canWalk, solids } from './layout.js';

const routes = [
  [[-4, 16], [4, 16], [4, 21], [-4, 21]],
  [[3, 7], [-4, 7], [-4, 13], [3, 13]],
  [[-5, -18], [4, -18], [4, -8], [-5, -8]],
  [[-13, 12], [-21, 12], [-21, 19], [-13, 19]],
  [[22, 14], [34, 14], [34, 20], [22, 20]],
  [[-30, 16], [-40, 16], [-40, 22], [-30, 22]],
  [[10, 27], [16, 27], [16, 34], [10, 34]],
  [[-6, 35], [5, 35], [5, 29], [-6, 29]],
  [[16, -8], [10, -8], [10, 1], [16, 1]],
  [[-9, -1], [-17, -1], [-17, 5], [-9, 5]],
];

export const paintColors = ['#72ff92', '#ff80db', '#88edff', '#ffe06e'];
export const maxPaintDistance = 23;
export const paintDots = [[0, 0, .14], [-.13, .04, .07], [.12, .11, .065], [.06, -.14, .045], [-.16, -.14, .04]];
const speed = 32;
const flightTime = maxPaintDistance / speed;
const sampleTime = .23 / speed;
const drop = 1.15;
export const markerGrip = { x: -.45, y: 1.59, z: .46 };
export const markerTip = { y: .14, z: .72 };
export const limitPaintElevation = elevation => Math.max(-.68, Math.min(.64, elevation));

function launch(player, heading, elevation) {
  const dx = Math.sin(heading), dz = Math.cos(heading);
  const raised = Math.sin(elevation), forward = Math.cos(elevation);
  const length = markerGrip.z + markerTip.z * forward - markerTip.y * raised;
  const height = markerGrip.y + markerTip.y * forward + markerTip.z * raised;
  return {
    originX: player.x + markerGrip.x * dz + length * dx,
    originY: .024 + player.jumpHeight + height,
    originZ: player.z - markerGrip.x * dx + length * dz,
    vx: dx * forward * speed, vy: raised * speed, vz: dz * forward * speed,
  };
}

function placeBall(ball, time) {
  ball.x = ball.originX + ball.vx * time;
  ball.y = ball.originY + ball.vy * time - drop * time * time;
  ball.z = ball.originZ + ball.vz * time;
}

function hitsScenery({ x, y, z }) {
  return y < .08 || solids.some(({ left, right, back, front, top }) =>
    y < top && x > left && x < right && z > back && z < front);
}

function hitWalker({ x, y, z }, walkers) {
  return walkers.find(walker =>
    y < walker.size && (x - walker.x)**2 + (z - walker.z)**2 < .53**2);
}

export function createPaintball(onHit) {
  const walkers = routes.map((route, i) => ({
    x: route[0][0], z: route[0][1], y: .066, route, stop: 1, size: 2.25 + i % 4 * .09,
    outfit: 1 + i % 8, phase: i * 1.9, walking: true, pace: 1.35 + (i % 5) * .18,
    heading: Math.atan2(route[1][0] - route[0][0], route[1][1] - route[0][1]),
    paintTime: 0, react: 0, color: paintColors[0],
  }));
  const balls = [];
  const bursts = [];
  let cooldown = 0, fired = 0, hits = 0;

  function preview(player, heading, elevation) {
    const trace = launch(player, heading, elevation);
    const steps = Math.ceil(flightTime / sampleTime);
    for (let i = 0; i <= steps; i++) {
      placeBall(trace, i * flightTime / steps);
      if (hitsScenery(trace)) {
        trace.y = Math.max(.08, trace.y);
        return trace;
      }
      if (hitWalker(trace, walkers)) {
        trace.onTarget = true;
        return trace;
      }
    }
    return trace;
  }

  function fire(player, heading, elevation) {
    if (cooldown > 0) return;
    const ball = launch(player, heading, elevation);
    ball.age = 0;
    ball.color = paintColors[fired++ % paintColors.length];
    placeBall(ball, 0);
    balls.push(ball);
    player.markerKick = 1;
    player.heading = heading;
    cooldown = .19;
  }

  function update(player, dt, firing, heading, elevation = 0) {
    cooldown = Math.max(0, cooldown - dt);
    player.markerKick *= Math.exp(-dt * 19);
    if (firing) fire(player, heading, elevation);
    for (const walker of walkers) {
      walker.paintTime = Math.max(0, walker.paintTime - dt);
      walker.react = Math.max(0, walker.react - dt);
      walker.walking = walker.react === 0;
      if (!walker.walking) continue;
      const [destX, destZ] = walker.route[walker.stop];
      const dx = destX - walker.x, dz = destZ - walker.z;
      const distance = Math.hypot(dx, dz);
      const step = walker.pace * dt;
      const nextX = distance <= step ? destX : walker.x + dx * step / distance;
      const nextZ = distance <= step ? destZ : walker.z + dz * step / distance;
      if (canWalk(nextX, nextZ)) {
        const turn = Math.atan2(dx, dz) - walker.heading;
        walker.heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-dt * 9));
        walker.x = nextX;
        walker.z = nextZ;
      }
      if (distance <= step || walker.x !== nextX || walker.z !== nextZ) {
        walker.stop = (walker.stop + 1) % walker.route.length;
      }
    }

    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      const steps = Math.max(1, Math.ceil(dt / sampleTime));
      for (let step = 0; step <= steps; step++) {
        const time = Math.min(flightTime, ball.age + (step === 0 ? 0 : dt / steps));
        placeBall(ball, time);
        ball.age = time;
        const blocked = hitsScenery(ball);
        const target = blocked ? null : hitWalker(ball, walkers);
        if (blocked || target) {
          bursts.push({ x: ball.x, y: Math.max(.08, ball.y), z: ball.z,
            color: ball.color, age: 0, surface: blocked ? .5 : 1 });
          if (target) {
            target.color = ball.color;
            target.paintTime = 6;
            target.react = .42;
            onHit(++hits);
          }
        }
        if (blocked || target || ball.age >= flightTime) {
          balls.splice(i, 1);
          break;
        }
      }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      bursts[i].age += dt;
      if (bursts[i].age >= .38) bursts.splice(i, 1);
    }
  }

  return { walkers, balls, bursts, update, preview };
}
