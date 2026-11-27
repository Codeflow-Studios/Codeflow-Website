import { paintDots } from './paintball.js';

export function addPaintballEffects(THREE, scene, paintball, reduceMotion) {
  const geometry = new THREE.BoxGeometry();
  function batch(count) {
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ toneMapped: false }), count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
  const rounds = batch(8);
  const sparks = batch(8 * paintDots.length);
  const pose = new THREE.Object3D();
  const tint = new THREE.Color();

  function dot(mesh, i, color, x, y, z, radius) {
    pose.position.set(x, y, z);
    pose.scale.setScalar(radius);
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
    mesh.setColorAt(i, tint.set(color));
  }

  return function animate() {
    rounds.count = paintball.balls.length;
    paintball.balls.forEach((ball, i) =>
      dot(rounds, i, ball.color, ball.x, ball.y, ball.z, .16));
    let count = 0;
    for (const burst of paintball.bursts) {
      const progress = burst.age / .38;
      const spread = burst.surface * (reduceMotion ? 1.7 : 1 + progress * 4);
      for (const [x, y, size] of paintDots) {
        dot(sparks, count++, burst.color, burst.x + x * spread,
          burst.y + y * spread, burst.z + (x - y) * spread * .55, size * (1 - progress * .85));
      }
    }
    sparks.count = count;
    for (const mesh of [rounds, sparks]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };
}
