import { benches, trees } from './layout.js';

const circle = Math.PI * 2;

// Scenery is batched separately for grounded props, the wheel and its suspended cars.
// The car transforms stay upright as the wheel turns.
export function addScenery(THREE, scene, reduceMotion) {
  const group = new THREE.Group();
  group.name = 'Festival midway';
  scene.add(group);
  const wheel = new THREE.Group();
  wheel.name = 'Observation wheel';
  wheel.position.set(-33, 0, -17.8);
  group.add(wheel);
  const rotor = new THREE.Group();
  const radius = 7.92;
  const hubHeight = 10.26;
  rotor.position.y = hubHeight;
  wheel.add(rotor);

  const box = new THREE.BoxGeometry(1, 1, 1);
  const rod = new THREE.CylinderGeometry(.5, .5, 1, 8);
  const lamp = new THREE.IcosahedronGeometry(.5, 1);
  const stone = new THREE.IcosahedronGeometry(.5, 0);
  const bough = new THREE.IcosahedronGeometry(.5, 1);
  const rim = new THREE.TorusGeometry(1, .0105, 6, 96);
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const pose = new THREE.Object3D();
  const banks = new Map();
  const matte = new THREE.MeshStandardMaterial({ roughness: .8, metalness: .09 });
  const metal = new THREE.MeshStandardMaterial({ roughness: .42, metalness: .36 });
  const lit = new THREE.MeshBasicMaterial({ toneMapped: false });
  const foliage = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  let seed = 5033207;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function stamp(parent, geo, mat, color) {
    if (!banks.has(parent)) banks.set(parent, new Map());
    const key = geo.uuid + mat.uuid;
    const bank = banks.get(parent);
    if (!bank.has(key)) bank.set(key, { geo, mat, instances: [] });
    pose.updateMatrix();
    bank.get(key).instances.push({ matrix: pose.matrix.clone(), color: new THREE.Color(color) });
  }

  function part(parent, geo, mat, color, x, y, z, sx, sy, sz, yaw = 0, tilt = 0, roll = 0) {
    pose.position.set(x, y, z);
    pose.rotation.set(tilt, yaw, roll);
    pose.scale.set(sx, sy, sz);
    stamp(parent, geo, mat, color);
  }

  function strut(parent, color, start, end, diameter, mat = metal) {
    direction.set(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
    const length = direction.length();
    pose.position.set((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2);
    pose.quaternion.setFromUnitVectors(up, direction.divideScalar(length));
    pose.scale.set(diameter, length, diameter);
    stamp(parent, rod, mat, color);
  }

  const steel = '#5d7986';
  const enamel = '#d5c2ac';
  const amber = '#ffcb85';
  const marine = '#85dbda';
  part(wheel, box, matte, '#48515b', 0, .26, 0, 17.6, .52, 6.4);
  for (let x = -8.3; x < 8.6; x += .46) {
    part(wheel, box, matte, '#93836c', x, .55, 0, .435, .08, 6.15);
  }
  for (const z of [-2.8, 2.8]) {
    strut(wheel, steel, [-8.45, 1.66, z], [8.45, 1.66, z], .083);
    strut(wheel, '#71878d', [-8.45, 1.18, z], [8.45, 1.18, z], .055);
    for (let x = -8.4; x < 8.5; x += 1.4) {
      part(wheel, rod, metal, steel, x, 1.13, z, .11, 1.12, .11);
    }
  }
  for (const side of [-1, 1]) {
    for (const depth of [-1, 1]) {
      const x = side * 4.4;
      const z = depth * 2.45;
      part(wheel, box, metal, '#8d999f', x, .64, z, 1.12, .16, .78);
      strut(wheel, '#afb5b0', [x, .66, z], [0, hubHeight, depth * 1.06], .41);
      strut(wheel, '#efbd83', [x, .70, z + .09], [0, hubHeight, depth * 1.06 + .09], .12, lit);
    }
    strut(wheel, steel, [side * 2.6, 4.5, -1.92], [side * 2.6, 4.5, 1.92], .18);
    strut(wheel, steel, [side * 4.2, .9, -2.4], [side * 2.6, 4.5, 1.92], .13);
  }
  for (const z of [-1.02, 1.02]) {
    strut(rotor, '#c4b8a4', [0, 0, 0], [0, 0, z * 1.56], .77);
    for (const r of [radius, radius - .5, 1.27]) {
      part(rotor, rim, metal, enamel, 0, 0, z * .8, r, r, r);
    }
  }
  function polar(angle, r, z) {
    return [Math.cos(angle) * r, Math.sin(angle) * r, z];
  }
  const cars = 12;
  for (let i = 0; i < cars * 2; i++) {
    const theta = i * circle / (cars * 2);
    const next = theta + circle / (cars * 2);
    for (const depth of [-.82, .82]) {
      strut(rotor, '#9ea8a2', polar(theta, .98, depth), polar(theta, radius - .48, depth), .09);
      strut(rotor, '#748c91', polar(theta, radius - .48, depth), polar(next, radius, depth), .065);
      if (i % 2 === 0) {
        strut(rotor, '#dee2d3', polar(theta, .9, depth), polar(theta + .09, radius - .55, depth), .056);
      }
    }
    const spokeLight = i % 4 === 0 ? amber : marine;
    for (let j = 0; j < 3; j++) {
      const a = theta + (next - theta) * j / 3;
      part(rotor, lamp, lit, spokeLight, ...polar(a, radius, .93), .17, .17, .13);
    }
    if (i % 2 === 0) {
      strut(rotor, '#6e8c94', polar(theta, radius, -.82), polar(theta, radius, .82), .13);
      strut(rotor, i % 4 === 0 ? '#fcad78' : '#90c9c7', polar(theta, 1.56, .9), polar(theta, radius - .68, .9), .04, lit);
    }
  }
  part(rotor, rod, metal, '#394e5a', 0, 0, 1.05, 2.4, .4, 2.4, 0, Math.PI / 2);
  part(rotor, rod, lit, '#ffdf9f', 0, 0, 1.28, 1.68, .12, 1.68, 0, Math.PI / 2);
  part(rotor, box, metal, '#54656c', 0, 0, 1.4, .82, .82, .14, 0, 0, Math.PI / 4);

  // Bake one two-tone gondola shell and instance it around the rim.
  const cabinParts = [];
  function cabinPiece(geometry, color, x, y, z, sx, sy, sz, roll = 0) {
    pose.position.set(x, y, z);
    pose.rotation.set(0, 0, roll);
    pose.scale.set(sx, sy, sz);
    pose.updateMatrix();
    cabinParts.push({ geometry, color: new THREE.Color(color), matrix: pose.matrix.clone() });
  }
  cabinPiece(box, '#faf3da', 0, -1.06, 0, 1.34, .51, 1.15);
  cabinPiece(box, '#566a74', 0, -.74, 0, 1.3, .18, 1.09);
  cabinPiece(box, '#84959b', 0, -.42, 0, 1.11, .55, .93);
  cabinPiece(box, '#d8f1ea', -.24, -.43, .48, .39, .36, .025);
  cabinPiece(box, '#7796a4', .22, -.43, .48, .39, .36, .025);
  cabinPiece(box, '#37515f', .57, -.42, .02, .035, .38, .69);
  cabinPiece(box, '#f4e1be', 0, -.09, 0, 1.45, .15, 1.23);
  for (const side of [-1, 1]) cabinPiece(rod, '#b8bfbd', side * .21, .20, 0, .07, .69, .07, -side * .54);
  const vertices = [], normals = [], colors = [];
  for (const { geometry, color, matrix } of cabinParts) {
    const transformed = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    transformed.applyMatrix4(matrix);
    vertices.push(...transformed.attributes.position.array);
    normals.push(...transformed.attributes.normal.array);
    for (let i = 0; i < transformed.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    transformed.dispose();
  }
  const cabin = new THREE.BufferGeometry();
  cabin.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  cabin.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  cabin.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const cabins = new THREE.InstancedMesh(cabin, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .51, metalness: .12 }), cars);
  cabins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cabins.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, hubHeight, 0), radius + 1.8);
  for (let i = 0; i < cars; i++) {
    cabins.setColorAt(i, new THREE.Color(['#ffb993', '#a7dcde', '#f6d49d', '#b2b7ea'][i % 4]));
  }
  wheel.add(cabins);

  // Brush and flowering grasses are concentrated around existing trunk collisions.
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([
    -.5, 0, 0, .5, 0, 0, .12, .56, .16,
    -.5, 0, 0, .12, .56, .16, -.33, .52, .18,
    -.33, .52, .18, .12, .56, .16, .13, 1, .47,
  ], 3));
  blade.computeVertexNormals();
  const leafColors = ['#385e55', '#476e56', '#638269', '#72815e', '#495d50'];
  for (const [cx, cz, height] of trees) {
    for (let shrub = 0; shrub < 11; shrub++) {
      const t = random() * circle;
      const r = (.20 + random() * .48) * height;
      const x = cx + Math.cos(t) * r;
      const z = cz + Math.sin(t) * r * .72;
      const size = .54 + random() * .8;
      for (let leaf = 0; leaf < 8; leaf++) {
        const angle = leaf * circle / 8 + random() * .42;
        part(group, blade, foliage, leafColors[(leaf + shrub) % leafColors.length], x, .06, z, size * .48, size * (.55 + random() * .32), size, angle, random() * .17);
      }
      if (shrub % 3 === 0) {
        for (let k = 0; k < 3; k++) {
          const xx = x + random() * .53 - .26;
          const zz = z + random() * .4 - .2;
          const y = .78 + random() * .54;
          strut(group, '#707e5d', [x, .12, z], [xx, y, zz], .042);
          part(group, lamp, matte, k % 2 ? '#b69b95' : '#d1b78c', xx, y, zz, .15, .32, .15, 0, .2);
        }
      }
    }
    for (let i = 0; i < 5; i++) {
      const a = random() * circle;
      const r = (.32 + random() * .28) * height;
      const s = .45 + random() * .58;
      part(group, stone, matte, i % 2 ? '#657376' : '#536466', cx + Math.cos(a) * r, s * .16, cz + Math.sin(a) * r, s * 1.8, s * .63, s, a);
    }
  }

  // A mixed deciduous perimeter softens the silhouette behind the entire site.
  for (let i = 0; i < 43; i++) {
    const edge = i % 3;
    const x = edge === 0 ? -58 - random() * 13 : edge === 1 ? 58 + random() * 10 : -55 + random() * 110;
    const z = edge === 2 ? -48 - random() * 9 : -46 + random() * 81;
    const size = 4.6 + random() * 4;
    part(group, rod, matte, '#4d504d', x, size * .30, z, size * .11, size * .6, size * .11);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const r = i === 0 ? 0 : .18 * size;
      const y = size * (i === 0 ? .88 : .69 + random() * .08);
      part(group, bough, matte, ['#33534f', '#456452', '#526e5a', '#456565'][i % 4],
        x + Math.sin(a) * r, y, z + Math.cos(a) * r, size * .57, size * .47, size * .55, a);
    }
  }

  // Slats, recessed bolts and ribbed road cases have useful scale up close.
  for (const [x, z] of benches) {
    for (let n = -2; n <= 2; n++) {
      part(group, box, matte, n % 2 ? '#a58065' : '#986e58', x, .86, z + n * .19, 3.32, .045, .17);
    }
    for (const xOffset of [-1.22, 1.22]) {
      part(group, box, metal, '#586775', x + xOffset, 1.08, z - .57, .13, .74, .11);
      for (const zOffset of [-.37, .37]) {
        part(group, rod, metal, '#a1a6a1', x + xOffset, .889, z + zOffset, .055, .012, .055);
      }
    }
  }
  function roadCase(x, z, width, height, depth) {
    part(group, box, matte, '#344453', x, .16 + height / 2, z, width, height, depth);
    for (const y of [.19, height - .11, height + .16]) {
      part(group, box, metal, '#85969d', x, y, z, width + .045, .055, depth + .05);
    }
    for (const side of [-1, 1]) {
      for (const longitudinal of [-1, 1]) {
        const xx = x + side * (width / 2 - .035);
        const zz = z + longitudinal * (depth / 2 - .035);
        part(group, box, metal, '#929c9d', xx, .16 + height / 2, zz, .07, height, .07);
        part(group, rod, matte, '#25323b', xx - side * .14, .095, zz - longitudinal * .12, .19, .17, .19, 0, Math.PI / 2);
      }
      part(group, box, metal, '#b5bcb9', x + side * (width * .26), height - .09, z + depth / 2 + .035, .12, .22, .05);
    }
  }
  roadCase(-30.8, 28.75, 1.05, .82, .86);
  roadCase(20.2, 30.15, 1.06, 1.15, 1.02);
  roadCase(27.45, 30.1, 1.35, .86, .83);

  // Vertical screen-printed cloth hangs from the existing promenade light masts.
  const flag = new THREE.BufferGeometry();
  const flagPosition = [];
  const flagUV = [];
  const flagIndices = [];
  const rowCount = 13;
  const columnCount = 7;
  for (let row = 0; row <= rowCount; row++) {
    for (let col = 0; col <= columnCount; col++) {
      const u = col / columnCount, v = row / rowCount;
      const fold = Math.sin(u * 10 + v * 3) * (.035 + v * .068);
      flagPosition.push(u - .5, .5 - v + (row === rowCount ? Math.abs(u - .5) * .22 : 0), fold);
      flagUV.push(u, 1 - v);
      if (col && row) {
        const e = row * (columnCount + 1) + col;
        flagIndices.push(e - columnCount - 2, e - 1, e, e - columnCount - 2, e, e - columnCount - 1);
      }
    }
  }
  flag.setAttribute('position', new THREE.Float32BufferAttribute(flagPosition, 3));
  flag.setAttribute('uv', new THREE.Float32BufferAttribute(flagUV, 2));
  flag.setIndex(flagIndices);
  flag.computeVertexNormals();
  const print = Object.assign(document.createElement('canvas'), { width: 256, height: 640 });
  const ctx = print.getContext('2d');
  ctx.fillStyle = '#e1dfd1';
  ctx.fillRect(0, 0, 256, 640);
  ctx.fillStyle = '#263039';
  ctx.fillRect(10, 16, 236, 54);
  ctx.fillStyle = '#fffbed';
  ctx.textAlign = 'center';
  ctx.font = '700 38px "Pixelify Sans", monospace';
  ctx.fillText('SKUMIC', 128, 57);
  ctx.strokeStyle = '#202a35';
  ctx.lineWidth = 14;
  for (let i = 0; i < 4; i++) {
    const offset = 108 + i * 42;
    ctx.beginPath();
    ctx.moveTo(-12, offset); ctx.lineTo(128, offset + 90); ctx.lineTo(268, offset);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(128, 465); ctx.rotate(-Math.PI / 2);
  ctx.font = '700 60px "Pixelify Sans", monospace';
  ctx.fillStyle = '#23303b'; ctx.fillText('FESTIVAL', 0, 22);
  ctx.restore();
  const printedCloth = new THREE.CanvasTexture(print);
  printedCloth.colorSpace = THREE.SRGBColorSpace;
  printedCloth.anisotropy = 4;
  const fabric = new THREE.MeshStandardMaterial({
    map: printedCloth, roughness: .96, side: THREE.DoubleSide,
    emissive: '#ffffff', emissiveMap: printedCloth, emissiveIntensity: .22,
  });
  for (const z of [23, 3, -12]) {
    for (const side of [-1, 1]) {
      const x = side * 8;
      strut(group, steel, [x, 4.7, z], [x + side * 1.35, 4.7, z], .081);
      const tint = z < 0 ? '#beebaa' : (side < 0 ? '#efb3a3' : '#bfb2ef');
      part(group, flag, fabric, tint, x + side * .73, 3.43, z + .02, 1.08, 2.54, 1, -.10 * side);
    }
  }

  for (const [parent, bank] of banks) {
    for (const { geo, mat, instances } of bank.values()) {
      const mesh = new THREE.InstancedMesh(geo, mat, instances.length);
      instances.forEach((instance, index) => {
        mesh.setMatrixAt(index, instance.matrix);
        mesh.setColorAt(index, instance.color);
      });
      mesh.castShadow = mat !== lit && instances.length < 350;
      mesh.receiveShadow = mat !== lit;
      parent.add(mesh);
    }
  }

  function update(time) {
    const phase = reduceMotion ? .10 : (time * .066 + .10) % circle;
    rotor.rotation.z = phase;
    for (let i = 0; i < cars; i++) {
      const angle = i * circle / cars + phase;
      pose.position.set(Math.cos(angle) * radius, hubHeight + Math.sin(angle) * radius - .47, 0);
      pose.rotation.set(0, 0, 0);
      pose.scale.set(1, 1, 1);
      pose.updateMatrix();
      cabins.setMatrixAt(i, pose.matrix);
    }
    cabins.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return reduceMotion ? () => {} : update;
}
