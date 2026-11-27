import { grounds, solids } from './layout.js';

// Bone anchors and collision radii are proportions of the walker's height.
export const dollLimbs = [
  ['leftHip', 'leftKnee', 'leftFoot', 'denim'],
  ['rightHip', 'rightKnee', 'rightFoot', 'denim'],
  ['leftShoulder', 'leftElbow', 'leftHand', 'coat'],
  ['rightShoulder', 'rightElbow', 'rightHand', 'coat'],
];
const anchors = {
  pelvis: [0, .48, 0, .125], neck: [0, .721, 0, .098], head: [0, .881, .004, .091],
  leftHip: [-.064, .464, 0, .064], leftKnee: [-.077, .238, .012, .059], leftFoot: [-.088, .061, .025, .053],
  rightHip: [.064, .464, 0, .064], rightKnee: [.077, .238, .012, .059], rightFoot: [.088, .061, .025, .053],
  leftShoulder: [-.128, .721, 0, .066], leftElbow: [-.155, .584, .021, .046], leftHand: [-.183, .448, .054, .043],
  rightShoulder: [.128, .721, 0, .066], rightElbow: [.155, .584, .021, .046], rightHand: [.183, .448, .054, .043],
};
const step = 1 / 90;

export function dropWalker(walker, ball) {
  const points = {};
  const { x, y, z, size, heading } = walker;
  const sin = Math.sin(heading), cos = Math.cos(heading);
  const hitSide = (ball.x - x) * cos - (ball.z - z) * sin;
  for (const [key, [side, high, forward, radius]] of Object.entries(anchors)) {
    const px = x + size * (cos * side + sin * forward);
    const py = y + size * high;
    const pz = z + size * (cos * forward - sin * side);
    // Upper joints receive a stronger push, with a twist when hit off-centre.
    const force = .012 + high * .107 + side * hitSide * .115;
    const flare = Math.sin(walker.phase + side * 19 + high * 5) * (key.endsWith('Hand') ? .75 : .19);
    points[key] = {
      x: px, y: py, z: pz, radius: size * radius,
      prevX: px - step * (ball.vx * force + cos * flare),
      prevY: py - step * (.12 + high * ball.vy * .035 + flare),
      prevZ: pz - step * (ball.vz * force - sin * flare),
    };
  }
  const bones = [];
  function connect(from, to, minimum = 1, maximum = 1) {
    const a = points[from], b = points[to];
    const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    bones.push({ a, b, min: length * minimum, max: length * maximum });
  }
  connect('pelvis', 'neck');
  connect('neck', 'head');
  connect('leftHip', 'rightHip');
  connect('leftShoulder', 'rightShoulder');
  for (const side of ['left', 'right']) {
    const other = side === 'left' ? 'right' : 'left';
    connect('pelvis', side + 'Hip');
    connect('neck', side + 'Shoulder');
    connect(side + 'Shoulder', side + 'Hip');
    connect(side + 'Shoulder', other + 'Hip');
    connect('head', side + 'Shoulder', .87, 1.09);
  }
  for (const [start, joint, end] of dollLimbs) {
    connect(start, joint);
    connect(joint, end);
    // Limit how far the knee/elbow can fold while leaving it free to bend.
    connect(start, end, end.endsWith('Foot') ? .49 : .27, 1);
  }
  const nearby = solids.filter(box => x + 7 > box.left && x - 7 < box.right &&
    z + 7 > box.back && z - 7 < box.front);
  return { points, nodes: Object.values(points), bones, nearby, remainder: 0 };
}

function collide(point, obstacles) {
  const r = point.radius;
  let floor = r + .025;
  for (const { left, right, back, front, top } of obstacles) {
    if (point.x <= left - r || point.x >= right + r || point.z <= back - r || point.z >= front + r) continue;
    if (point.prevY >= top + r - .025) floor = Math.max(floor, top + r);
    if (point.y >= top + r || floor > r + .025) continue;
    const west = point.x - left + r, east = right + r - point.x;
    const north = point.z - back + r, south = front + r - point.z;
    const nearest = Math.min(west, east, north, south);
    if (nearest === west) point.x = point.prevX = left - r;
    else if (nearest === east) point.x = point.prevX = right + r;
    else if (nearest === north) point.z = point.prevZ = back - r;
    else point.z = point.prevZ = front + r;
  }
  point.x = Math.max(grounds.minX + r, Math.min(grounds.maxX - r, point.x));
  point.z = Math.max(grounds.minZ + r, Math.min(grounds.maxZ - r, point.z));
  if (point.y < floor) point.y = floor;
  return point.y <= floor + .005;
}

export function stepRagdoll(doll, dt) {
  doll.remainder += dt;
  while (doll.remainder >= step) {
    doll.remainder -= step;
    for (const p of doll.nodes) {
      const dx = p.x - p.prevX, dy = p.y - p.prevY, dz = p.z - p.prevZ;
      p.prevX = p.x; p.prevY = p.y; p.prevZ = p.z;
      p.x += dx * .992;
      p.y += dy * .992 - 10.5 * step * step;
      p.z += dz * .992;
    }
    for (let pass = 0; pass < 7; pass++) {
      for (const { a, b, min, max } of doll.bones) {
        const x = b.x - a.x, y = b.y - a.y, z = b.z - a.z;
        const length = Math.hypot(x, y, z);
        if (length < 1e-7 || (length >= min && length <= max)) continue;
        const force = .5 * (length - (length > max ? max : min)) / length;
        a.x += x * force; a.y += y * force; a.z += z * force;
        b.x -= x * force; b.y -= y * force; b.z -= z * force;
      }
      for (const p of doll.nodes) {
        if (!collide(p, doll.nearby) || pass < 6) continue;
        p.prevX = p.x + (p.prevX - p.x) * .68;
        p.prevZ = p.z + (p.prevZ - p.z) * .68;
        p.prevY = p.y + Math.min(0, (p.y - p.prevY) * .16);
      }
    }
  }
}
