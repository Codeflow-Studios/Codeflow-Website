import { paintDots } from './paintball.js';
import { dollLimbs } from './ragdoll.js';

// Fans share geometry and draw calls, while their poses and clothes vary by person.
export function createCrowd(THREE, scene, actors, outfits, skinTones, reduceMotion) {
  const round = new THREE.SphereGeometry(1, 10, 7);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  const sleeve = new THREE.CylinderGeometry(.95, .76, 1, 9);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const shirt = new THREE.LatheGeometry([
    [.75, -.5], [.91, -.47], [.86, -.25], [1, .21], [.88, .37], [.52, .49], [.32, .5],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const fabric = new THREE.MeshLambertMaterial();
  const batches = new Map();
  const pose = [];
  function joint(parent, x, y, z) {
    const pivot = new THREE.Object3D();
    pivot.position.set(x, y, z);
    parent.add(pivot);
    return pivot;
  }
  function part(parent, geometry, tint, x, y, z, w, h, d) {
    const piece = joint(parent, x, y, z);
    piece.scale.set(w, h, d);
    if (!batches.has(geometry)) batches.set(geometry, { pieces: [], mesh: null });
    batches.get(geometry).pieces.push({ piece, tint });
    return piece;
  }

  for (const [index, actor] of actors.entries()) {
    const [coat, hem, trim, denim, hat, hair, skinID] = outfits[actor.outfit];
    const skin = skinTones[skinID][1], dark = '#33333f', sole = '#bbbab2';
    const root = new THREE.Object3D();
    root.position.set(actor.x, actor.y, actor.z);
    root.rotation.order = 'YXZ';
    root.rotation.y = actor.heading;
    root.scale.setScalar(actor.size);
    const body = joint(root, 0, .48, 0);
    const chest = joint(body, 0, .011, 0);
    part(chest, shirt, coat, 0, .142, 0, .15, .32, .099);
    part(chest, cylinder, hem, 0, .008, 0, .133, .024, .092);
    part(chest, cylinder, trim, 0, .283, 0, .072, .018, .060);
    if (index % 3 === 0) part(chest, box, trim, 0, .19, .095, .125, .035, .009);
    const head = joint(chest, 0, .305, .004);
    part(head, cylinder, skin, 0, .008, 0, .039, .07, .038);
    part(head, round, skin, 0, .085, 0, .081, .106, .075);
    part(head, round, skin, 0, .081, .070, .021, .026, .021);
    for (const side of [-1, 1]) part(head, box, dark, side * .032, .102, .067, .017, .014, .011);
    part(head, round, hair, 0, .144, -.006, .084, .060, .079);
    if (hat === 'long' || hat === 'guitar') {
      part(head, round, hair, 0, .066, -.046, .084, .108, .056);
    } else if (hat === 'curls') {
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        part(head, round, hair, .066 * Math.sin(a), .14, .056 * Math.cos(a), .037, .039, .038);
      }
    } else if (hat === 'beanie') {
      part(head, cylinder, hair, 0, .13, 0, .087, .032, .082);
      part(head, round, hair, 0, .196, -.018, .026, .023, .024);
    } else {
      part(head, cylinder, hair, 0, .138, hat === 'bucket' ? 0 : .053, .096, .013, .09);
    }
    const shoulders = [], elbows = [], hips = [], knees = [];
    const paint = [];
    if (actor.route) {
      for (const side of [-1, 1]) for (const [x, y, size] of paintDots) {
        const mark = part(chest, box, actor.color, x * .55, .15 + y * .6, side * .102,
          size * .45, size * .45, .014);
        mark.rotation.z = .35;
        batches.get(box).pieces.at(-1).paintActor = actor;
        paint.push({ mark, size });
      }
    }
    for (const side of [-1, 1]) {
      const hip = joint(body, side * .064, -.016, 0);
      hips.push(hip);
      part(hip, sleeve, denim, 0, -.103, 0, .069, .232, .071);
      const knee = joint(hip, 0, -.228, 0);
      knees.push(knee);
      part(knee, sleeve, denim, 0, -.066, 0, .060, .199, .060);
      part(knee, round, dark, 0, -.170, .024, .065, .049, .090);
      part(knee, cylinder, sole, 0, -.216, .021, .065, .017, .087);
      const shoulder = joint(chest, side * .128, .23, 0);
      const elbow = joint(shoulder, 0, -.14, 0);
      shoulders.push(shoulder);
      elbows.push(elbow);
      part(shoulder, round, coat, 0, -.012, 0, .063, .06, .06);
      part(shoulder, sleeve, coat, 0, -.072, 0, .061, .14, .056);
      part(elbow, sleeve, skin, 0, -.055, 0, .04, .145, .04);
      part(elbow, cylinder, actor.route ? '#b4ff95' : trim, 0, -.10, 0, .042, .025, .042);
      part(elbow, round, skin, 0, -.142, .004, .043, .052, .041);
      if (hat === 'mic' && side === 1) {
        const mic = joint(elbow, 0, -.14, .022);
        mic.rotation.x = 1.1;
        part(mic, cylinder, dark, 0, -.018, 0, .019, .10, .019);
        part(mic, round, '#c8d4d5', 0, -.078, 0, .029, .03, .029);
      }
    }
    if (hat === 'guitar') {
      const guitar = joint(chest, -.022, .08, .13);
      guitar.rotation.z = -.87;
      part(guitar, round, '#e78b45', 0, -.022, 0, .105, .15, .034);
      part(guitar, round, '#573722', 0, .012, .033, .036, .036, .005);
      part(guitar, box, '#977159', 0, .204, .010, .035, .29, .029);
      part(guitar, box, '#e1ae79', 0, .371, .009, .053, .055, .035);
    }
    const bones = [[hips[0], knees[0]], [hips[1], knees[1]],
      [shoulders[0], elbows[0]], [shoulders[1], elbows[1]]];
    pose.push({ root, body, chest, head, shoulders, elbows, hips, knees, bones, actor, hat, index, paint });
  }
  const color = new THREE.Color();
  for (const [geometry, batch] of batches) {
    const mesh = new THREE.InstancedMesh(geometry, fabric, batch.pieces.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    batch.pieces.forEach(({ tint }, i) => mesh.setColorAt(i, color.set(tint)));
    batch.mesh = mesh;
    scene.add(mesh);
  }
  let lastFrame = -1;
  const across = new THREE.Vector3(), spine = new THREE.Vector3(), forward = new THREE.Vector3();
  const limb = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0), up = new THREE.Vector3(0, 1, 0);
  const pivot = new THREE.Vector3(), offset = new THREE.Vector3();
  const torso = new THREE.Matrix4(), turn = new THREE.Quaternion(), parentRotation = new THREE.Quaternion();
  function boneDirection(from, to, result) {
    return result.set(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
  }
  function alignJoint(joint, from, to, axis, weight) {
    joint.parent.getWorldQuaternion(parentRotation).invert();
    boneDirection(from, to, limb).applyQuaternion(parentRotation);
    joint.quaternion.slerp(turn.setFromUnitVectors(axis, limb), weight);
  }
  function poseRagdoll({ root, body, chest, head, bones, actor }, weight) {
    const points = actor.doll.points;
    boneDirection(points.leftShoulder, points.rightShoulder, across);
    boneDirection(points.pelvis, points.neck, spine);
    forward.crossVectors(across, spine).normalize();
    across.crossVectors(spine, forward).normalize();
    turn.setFromRotationMatrix(torso.makeBasis(across, spine, forward));
    offset.set(0, body.position.y * actor.size, 0).applyQuaternion(turn);
    pivot.set(points.pelvis.x, points.pelvis.y, points.pelvis.z).sub(offset);
    root.position.lerp(pivot, weight);
    root.quaternion.slerp(turn, weight);
    chest.quaternion.slerp(turn.identity(), weight);
    alignJoint(head, points.neck, points.head, up, weight);
    dollLimbs.forEach(([start, joint, end], index) => {
      const [upper, lower] = bones[index];
      alignJoint(upper, points[start], points[joint], down, weight);
      alignJoint(lower, points[joint], points[end], down, weight);
    });
  }
  return function animate(time) {
    const frame = Math.floor(time * 24);
    if (frame === lastFrame) return;
    lastFrame = frame;
    for (const rig of pose) {
      const { root, body, chest, head, shoulders, elbows, hips, knees, actor, hat, index, paint } = rig;
      const beat = (reduceMotion ? 0 : frame / 24) * (3.5 + index % 4 * .17) + actor.phase;
      const sway = Math.sin(beat), step = Math.cos(beat * .5);
      body.position.y = .48 + .015 * (1 + sway);
      chest.rotation.set(.026 + .048 * sway, .12 * step, .043 * step);
      head.rotation.set(.11 * sway, .18 * Math.sin(beat * .4), -.04 * step);
      for (let k = 0; k < 2; k++) {
        const sign = k === 0 ? -1 : 1;
        const cheer = hat === 'mic' ? (k ? 1.3 : .6)
          : hat === 'guitar' ? .6 : (index + k) % 4 === 0 ? 2.6 : .32;
        shoulders[k].rotation.set(-.25 + .20 * sway * sign, 0, sign * (cheer + .18 * step));
        elbows[k].rotation.x = hat === 'mic' || hat === 'guitar' ? -1.22 : -.55 + .23 * step;
        hips[k].rotation.set(.035 * sway * sign, 0, sign * (.023 + .03 * step));
      }
      if (actor.route) {
        root.position.set(actor.x, actor.y, actor.z);
        root.rotation.set(0, actor.heading, 0);
        const gait = Math.sin(time * actor.pace * 5.2 + actor.phase) *
          (actor.walking && !reduceMotion ? .54 : 0);
        const reaction = actor.react / .42;
        chest.rotation.set(-reaction * .32, 0, reaction * .12);
        body.position.y = .48 + Math.abs(gait) * .034;
        for (let k = 0; k < 2; k++) {
          const sign = k === 0 ? -1 : 1;
          hips[k].rotation.set(sign * gait, 0, sign * .055);
          knees[k].rotation.set(0, 0, 0);
          shoulders[k].rotation.set(-sign * gait - reaction * .38, 0, sign * (.15 + reaction * 1.3));
          elbows[k].rotation.set(-.33 - reaction * .67, 0, 0);
        }
        const fall = actor.downed ? Math.min(1, actor.fall * 3) : actor.fall;
        const weight = reduceMotion ? Number(actor.downed) : THREE.MathUtils.smootherstep(fall, 0, 1);
        if (actor.doll && weight > 0) poseRagdoll(rig, weight);
        const fade = Math.min(1, actor.paintTime);
        for (const { mark, size } of paint) mark.scale.set(size * .45 * fade, size * .45 * fade, .014 * fade);
      }
      root.updateMatrixWorld(true);
    }
    for (const { pieces, mesh } of batches.values()) {
      pieces.forEach(({ piece, paintActor }, i) => {
        mesh.setMatrixAt(i, piece.matrixWorld);
        if (paintActor) mesh.setColorAt(i, color.set(paintActor.color).multiplyScalar(2.3));
      });
      if (mesh.geometry === box) mesh.instanceColor.needsUpdate = true;
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
}
