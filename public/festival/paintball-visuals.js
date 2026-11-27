import { maxPaintCapsules, paintDots, paintFlashTime, paintTrailStart } from './paintball.js';
import { inBackstage } from './backstage-layout.js';

export function addPaintballEffects(THREE, scene, paintball, reduceMotion) {
  const geometry = new THREE.BoxGeometry();
  function batch(count, shape = geometry) {
    const mesh = new THREE.InstancedMesh(shape, new THREE.MeshBasicMaterial({ toneMapped: false }), count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
  const rounds = batch(8);
  const trails = batch(8);
  const flashes = batch(4, new THREE.OctahedronGeometry(1));
  const capsules = batch(maxPaintCapsules, new THREE.CylinderGeometry(.5, .5, 1, 9));
  const sparks = batch(8 * paintDots.length);
  const pose = new THREE.Object3D();
  const tint = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);
  const delta = new THREE.Vector3();
  const start = {};

  function place(mesh, i, color, brightness = 1) {
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
    mesh.setColorAt(i, tint.set(color).multiplyScalar(brightness));
  }

  function dot(mesh, i, color, x, y, z, radius) {
    pose.position.set(x, y, z);
    pose.scale.setScalar(radius);
    pose.quaternion.identity();
    place(mesh, i, color);
  }

  return function animate(showBackstage = false) {
    const visible = item => showBackstage || !inBackstage(item.x, item.z);
    let i = 0;
    for (const ball of paintball.balls) {
      if (!visible(ball)) continue;
      dot(rounds, i, ball.color, ball.x, ball.y, ball.z, .17);
      paintTrailStart(ball, start);
      delta.set(ball.x - start.x, ball.y - start.y, ball.z - start.z);
      pose.position.set((ball.x + start.x) * .5, (ball.y + start.y) * .5, (ball.z + start.z) * .5);
      const length = delta.length();
      const width = reduceMotion ? .032 : .055;
      pose.scale.set(width, length, width);
      if (length > 0) pose.quaternion.setFromUnitVectors(up, delta.multiplyScalar(1 / length));
      place(trails, i, '#fa2d82', 2.8);
      i++;
    }
    trails.count = rounds.count = i;
    i = 0;
    for (const flash of paintball.flashes) {
      if (!visible(flash)) continue;
      const envelope = 1 - flash.age / paintFlashTime;
      pose.position.set(flash.x, flash.y, flash.z);
      pose.scale.setScalar((reduceMotion ? .115 : .28) * envelope);
      pose.rotation.set(.25, .4, .38);
      place(flashes, i++, flash.color, 3.3);
    }
    flashes.count = i;
    i = 0;
    for (const capsule of paintball.capsules) {
      if (!visible(capsule)) continue;
      const fade = Math.min(1, (6 - capsule.age) * 2);
      pose.position.set(capsule.x, capsule.y, capsule.z);
      pose.scale.set(.15 * fade, .25 * fade, .15 * fade);
      pose.rotation.set(capsule.grounded ? Math.PI / 2 : capsule.rotation, capsule.rotation, .1, 'YXZ');
      place(capsules, i++, capsule.color);
    }
    capsules.count = i;
    let count = 0;
    for (const burst of paintball.bursts) {
      if (!visible(burst)) continue;
      const progress = burst.age / .38;
      const spread = burst.surface * (reduceMotion ? 1.7 : 1 + progress * 4);
      for (const [x, y, size] of paintDots) {
        dot(sparks, count++, burst.color, burst.x + x * spread,
          burst.y + y * spread, burst.z + (x - y) * spread * .55, size * (1 - progress * .85));
      }
    }
    sparks.count = count;
    for (const mesh of [rounds, trails, flashes, capsules, sparks]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };
}
