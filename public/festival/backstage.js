import { backstageBar, backstageCabins, backstageFences, backstagePassages, backstageTables, backstageYard,
  inBackstage, managerCabin, managerSeat, onBackstageGround } from './backstage-layout.js';
import { managerReactionTime } from './paintball.js';

export function addBackstage(THREE, scene, spruce) {
  const yard = new THREE.Group();
  yard.name = 'Backstage interiors';
  yard.visible = false;
  const fringe = new THREE.Group();
  fringe.name = 'Backstage perimeter woodland';
  const grove = new THREE.Group();
  grove.name = 'Overhead woodland';
  scene.add(yard, fringe, grove);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 8);
  const bush = new THREE.IcosahedronGeometry(.5, 1);
  const plane = new THREE.PlaneGeometry(1, 1);
  const lit = new THREE.MeshStandardMaterial({ roughness: .87 });
  const glow = new THREE.MeshBasicMaterial();
  const leaves = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, side: THREE.DoubleSide });
  const undergrowth = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide });
  const fern = new THREE.BufferGeometry();
  const fronds = [];
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI / 3.5;
    const dx = Math.sin(a), dz = Math.cos(a), height = .22 + (i % 3) * .12;
    fronds.push(0, 0, 0, dx * .36 + dz * .095, height, dz * .36 - dx * .095, dx * .67, height * .77, dz * .67,
      0, 0, 0, dx * .67, height * .77, dz * .67, dx * .36 - dz * .095, height, dz * .36 + dx * .095);
  }
  fern.setAttribute('position', new THREE.Float32BufferAttribute(fronds, 3));
  fern.computeVertexNormals();
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const batches = new Map();
  let seed = 37167;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function queue(group, geometry, material, color) {
    if (!batches.has(group)) batches.set(group, new Map());
    const target = batches.get(group);
    if (!target.has(geometry)) target.set(geometry, new Map());
    const materials = target.get(geometry);
    if (!materials.has(material)) materials.set(material, []);
    transform.updateMatrix();
    materials.get(material).push([transform.matrix.clone(), new THREE.Color(color)]);
  }
  function prop(group, geometry, color, x, y, z, w, h, d, yaw = 0, material = lit) {
    transform.position.set(x, y, z);
    transform.rotation.set(0, yaw, 0);
    transform.scale.set(w, h, d);
    queue(group, geometry, material, color);
  }
  function box(color, x, y, z, w, h, d, yaw = 0, material = lit) {
    prop(yard, cube, color, x, y, z, w, h, d, yaw, material);
  }
  function rod(color, x, y, z, x2, y2, z2, thickness) {
    direction.set(x2 - x, y2 - y, z2 - z);
    transform.position.set((x + x2) / 2, (y + y2) / 2, (z + z2) / 2);
    transform.scale.set(thickness, direction.length(), thickness);
    transform.quaternion.setFromUnitVectors(up, direction.normalize());
    queue(yard, cylinder, lit, color);
  }

  const boardColors = ['#374840', '#46534a', '#31443e', '#4a5247'];
  for (const { x1, z1, x2, z2, length, height } of backstageFences) {
    const dx = x2 - x1, dz = z2 - z1;
    const angle = Math.atan2(-dz, dx);
    const boards = Math.ceil(length / .49);
    for (let i = 0; i < boards; i++) {
      const t = (i + .5) / boards;
      const y = height - .16 + .26 * random();
      box(boardColors[Math.floor(random() * boardColors.length)], x1 + dx * t, y / 2, z1 + dz * t,
        length / boards + .015, y, .15, angle);
    }
    for (const y of [.42, 2.2, 4.2]) {
      box('#2d333a', (x1 + x2) / 2, y, (z1 + z2) / 2, length, .13, .27, angle);
    }
    const posts = Math.ceil(length / 2.85);
    for (let i = 0; i <= posts; i++) {
      box('#232f30', x1 + dx * i / posts, 2.34, z1 + dz * i / posts, .26, 4.68, .26);
    }
  }

  function shrub(group, x, z, size) {
    const green = ['#304f46', '#28423d', '#3b594b', '#253c40'];
    for (let i = 0; i < 3; i++) {
      const spread = random() * Math.PI * 2;
      const s = size * (.7 + random() * .6);
      prop(group, bush, green[Math.floor(random() * green.length)], x + Math.cos(spread) * size * .28,
        s * .33, z + Math.sin(spread) * size * .28, s * 1.16, s * .96, s, spread);
    }
    prop(group, fern, '#647953', x + size * .36, .028, z + size * .46, size * .66, size * .68, size * .66,
      random() * 6.283, undergrowth);
  }
  function tree(group, x, z, height) {
    prop(group, cylinder, '#36393a', x, height * .16, z, height * .11, height * .32, height * .11);
    prop(group, spruce, random() > .45 ? '#77958b' : '#5c7e75', x, 0, z, height, height, height,
      random() * 6.283, leaves);
  }

  // Irregular planting around the service path and over the yard in overview.
  // Keep the real entrance clear and avoid giving the grove a rectangular outline.
  function nearRoute(x, z, pad) {
    const inside = area => x > area.left - pad && x < area.right + pad && z > area.north - pad && z < area.south + pad;
    return [backstageYard, ...backstagePassages].some(inside);
  }
  for (let i = 0; i < 255; i++) {
    const x = 1 + random() * 46, z = -38.4 - random() * 38;
    if (i < 195 && nearRoute(x, z, 2.7)) continue;
    if (i >= 195 && (z > -51.5 || !nearRoute(x, z, 1.4))) continue;
    const group = i < 195 ? fringe : grove;
    if (z > -43 && (x > 4.7 && x < 13.5 || x < 12)) continue;
    const size = 1.25 + random() * 1.75;
    shrub(group, x, z, size);
    if (random() > .29) tree(group, x, z, 4.8 + random() * 5.2);
  }
  for (const [x, z] of [[4.6, -41.9], [14.0, -41.3], [4.5,-45.2], [13.8,-42.8], [4.8,-48.2], [6.2,-52.3],
    [10.1,-52.6],[14.1,-52.8],[21.8,-46.8],[25.5,-46.2],[29.3,-47.0],[32.7,-46.9],[36.7,-47.3],[41.2,-50.8]]) {
    const group = nearRoute(x, z, .65) ? grove : fringe;
    tree(group, x, z, 6.8 + random() * 3.4);
    shrub(group, x, z, 2.25);
  }

  function sign(text, x, y, z, width, height, background, letter) {
    const canvas = Object.assign(document.createElement('canvas'), { width: 384, height: 92 });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#171924';
    ctx.fillRect(0, 0, 384, 92);
    ctx.fillStyle = background;
    ctx.fillRect(7, 7, 370, 78);
    ctx.fillStyle = letter;
    ctx.font = '700 49px "Pixelify Sans", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 192, 48, 353);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const panel = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map }));
    panel.position.set(x, y, z);
    panel.scale.set(width, height, 1);
    yard.add(panel);
  }

  const plot = backstageYard;
  box('#394a45', (plot.left + plot.right) / 2, .026, (plot.north + plot.south) / 2,
    plot.right - plot.left - .12, .052, plot.south - plot.north - .14);
  for (const { left, right, north, south } of backstagePassages) {
    box('#555b4a', (left + right) / 2, .018, (north + south) / 2, right - left, .036, south - north);
  }
  for (let i = 0; i < 260; i++) {
    const x = 12.8 + random() * 25.3, z = -66.6 + random() * 16;
    const color = random() > .54 ? '#4f5b4b' : '#35483e';
    box(color, x, .057, z, .14 + random() * .45, .016, .10 + random() * .33, random() * 6.28);
  }

  const warm = '#ffd595';
  const mint = '#b5e2bc';
  for (const cabin of backstageCabins) {
    const { x, z, width, depth, number } = cabin;
    const front = z + depth / 2;
    const accent = ['#83cabb', '#dca279', '#aa9ad1'][number - 1];
    box('#303c47', x, 1.4, z, width, 2.78, depth);
    box('#4b5859', x, .17, z + .12, width + .26, .34, depth + .3);
    box('#27313a', x, 2.99, z, width + .34, .45, depth + .24);
    for (let i = 1; i <= 5; i++) box('#495864', x, .43 + i * .35, front + .015, width - .2, .035, .032);
    box(accent, x, 2.63, front + .033, width - .4, .12, .053);
    box('#212735', x - .69, 1.22, front + .054, 1.12, 2.1, .13);
    box('#8d8973', x - .31, 1.2, front + .15, .07, .14, .07);
    box('#ad924e', x + .93, 1.42, front + .06, 1.31, .74, .067);
    box('#6e675b', x + .93, 1.42, front + .105, 1.20, .64, .04);
    for (const offset of [-.39,0,.39]) box('#242a35', x + .93 + offset, 1.42, front + .124, .025, .63, .02);
    box(warm, x - .70, 2.41, front + .10, .31, .09, .11, 0, glow);
    sign('LOGE ' + number, x + .41, 2.65, front + .123, 2.1, .44, accent, '#222b38');
  }

  const bar = backstageBar;
  box('#4b373d', bar.x, .66, bar.z, bar.width, 1.32, bar.depth);
  box('#af805f', bar.x + .10, 1.38, bar.z, bar.width + .27, .14, bar.depth + .39);
  box('#263135', bar.x - 1.06, 2.15, bar.z, .40, 1.24, bar.depth - .3);
  for (let i = -8; i <= 8; i++) box('#8a5e4c', bar.x + bar.width / 2 + .017, .68, bar.z + i * .47, .06, 1.16, .30);
  for (const end of [-1, 1]) box('#866f5a', bar.x + 1.12, 2.55, bar.z + end * 4.05, .14, 2.44, .14);
  box('#715e54', bar.x, 3.55, bar.z, bar.width + .39, .20, bar.depth + .40);
  for (let i = 0; i < 17; i++) {
    const y = i % 2 ? 2.0 : 1.46;
    prop(yard, cylinder, ['#c88b73', '#73b69f', '#e3c687'][i % 3], bar.x - .72 + random() * .36,
      y + .18, bar.z - 3.62 + i * .43, .13, .36, .13);
  }
  box(warm, bar.x + 1.48, 3.42, bar.z, .06, .07, bar.depth - .38, 0, glow);
  box('#222b33', bar.x + .05, 3.48, bar.z + bar.depth / 2 + .22, 1.48, .64, .10);
  sign('BAR', bar.x + .05, 3.48, bar.z + bar.depth / 2 + .28, 1.45, .56, '#c88871', '#211f2a');

  for (const { x, z } of backstageTables) {
    for (const end of [-1, 1]) {
      box('#354248', x + end * 1.25, .22, z, .14, .11, 2.35);
      for (const side of [-1, 1]) {
        rod('#38474c', x + end * 1.26, .11, z + side * .94, x + end * 1.11, 1.06, z + side * .37, .11);
      }
    }
    for (let i = -2; i <= 2; i++) box(i % 2 ? '#b28159' : '#97734e', x, 1.09, z + .21 * i, 3.51, .12, .197);
    for (const side of [-1, 1]) for (const row of [0, .19]) {
      box('#946b4d', x, .55, z + side * (.97 + row), 3.51, .13, .181);
    }
    box('#8b714e', x + .59, 1.196, z - .15, .46, .04, .29);
    prop(yard, cylinder, '#bf895f', x + .69, 1.29, z - .14, .14, .19, .14);
  }

  const { x, z, width, depth } = managerCabin;
  const front = z + depth / 2;
  const blue = '#438e82';
  box('#34454c', x, .10, z, width + .14, .20, depth + .18);
  box('#4b5e62', x, .03, front + .17, 1.49, .08, .42);
  box(blue, x, 1.69, z - depth / 2 + .055, width, 3.36, .16);
  for (const side of [-1, 1]) {
    box(blue, x + side * (width / 2 - .05), 1.69, z, .16, 3.36, depth);
    for (let i = -4; i <= 4; i++) {
      box('#397468', x + side * (width / 2 + .045), 1.6, z + i * .263, .035, 2.89, .071);
    }
    box('#507f77', x + side * (width / 2 - .09), 1.68, front, .23, 3.30, .23);
  }
  box('#d1cfaa', x, 3.25, front, width, .21, .24);
  box('#bcc4a7', x, 3.41, z, width + .22, .22, depth + .28);
  box(warm, x, 3.17, z + .2, .52, .063, .29, 0, glow);
  box('#283c40', x, 3.76, front - .19, 2.90, .7, .19);
  sign('MANAGER', x, 3.76, front - .085, 2.84, .65, '#e5ce7c', '#243036');

  const door = new THREE.Group();
  door.name = 'Open toilet door';
  door.position.set(x - width / 2, 0, front - .01);
  door.rotation.y = -2.01;
  yard.add(door);
  function fixture(parent, shape, color, x, y, z, w, h, d, pitch = 0) {
    const mesh = new THREE.Mesh(shape, new THREE.MeshStandardMaterial({ color, roughness: .84 }));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.rotation.x = pitch;
    parent.add(mesh);
    return mesh;
  }
  fixture(door, cube, '#488f83', 1.02, 1.61, 0, 2.04, 3.06, .115);
  for (const y of [.24, 2.67]) fixture(door, cube, '#589f8f', 1.02, y, .061, 1.91, .22, .041);
  fixture(door, cube, '#344952', 1.69, 1.49, .091, .24, .12, .105);
  const porcelaine = '#dfddd0';
  box(porcelaine, managerSeat.x, .77, managerSeat.z - .53, .81, .77, .28);
  prop(yard, bush, porcelaine, managerSeat.x, .60, managerSeat.z + .02, .74, .72, .91);
  prop(yard, cylinder, '#e7dfc7', managerSeat.x, .91, managerSeat.z + .07, .79, .10, .92);
  box('#bbc3a8', x + .79, 1.27, z + .15, .12, .18, .24);
  prop(yard, cylinder, '#ece4cf', x + .68, 1.26, z + .15, .22, .20, .22);

  const seated = new THREE.Group();
  seated.name = 'Seated manager';
  seated.position.set(managerSeat.x, .94, managerSeat.z);
  yard.add(seated);
  const jacket = '#974c5c', denim = '#334251', skin = '#d39b78', boots = '#242737';
  const coat = new THREE.Group();
  seated.add(coat);
  fixture(coat, bush, jacket, 0, .48, 0, .79, .89, .56);
  fixture(coat, cube, '#482f3c', 0, .49, .288, .06, .65, .024);
  const badge = fixture(coat, cube, '#d7cc87', -.225, .64, .274, .17, .098, .046);
  badge.rotation.z = -.1;
  fixture(coat, cylinder, skin, 0, .94, .04, .27, .22, .26);
  const head = new THREE.Group();
  head.position.set(0, 1.14, .08);
  coat.add(head);
  fixture(head, bush, skin, 0, .04, 0, .50, .53, .48);
  fixture(head, bush, '#51443d', 0, .214, -.045, .52, .26, .49);
  fixture(head, bush, skin, 0, .014, .232, .115, .14, .107);
  const mouth = fixture(head, bush, '#462c34', 0, -.104, .213, .153, .060, .039);
  for (const side of [-1, 1]) {
    fixture(head, bush, '#c58b70', side * .247, .034, -.006, .099, .15, .089);
    fixture(head, cube, '#584e54', side * .105, .083, .218, .17, .082, .045);
    fixture(head, cube, '#d7d8c5', side * .105, .080, .247, .126, .046, .027);
    fixture(head, cube, '#2a2834', side * .105, .079, .262, .044, .047, .012);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    fixture(seated, bush, denim, side * .23, -.015, .33, .34, .33, .80);
    fixture(seated, cylinder, denim, side * .242, -.393, .66, .28, .69, .27, -.06);
    fixture(seated, bush, boots, side * .242, -.81, .79, .37, .21, .51);
    const arm = new THREE.Group();
    arm.position.set(side * .347, .74, 0);
    coat.add(arm);
    arm.rotation.x = -.34;
    arm.rotation.z = side * .12;
    fixture(arm, bush, jacket, 0, -.211, 0, .278, .502, .267);
    fixture(arm, bush, jacket, 0, -.454, .16, .254, .28, .48, -.51);
    fixture(arm, bush, skin, 0, -.542, .37, .206, .17, .205);
    arms.push(arm);
  }
  const paint = fixture(coat, bush, '#ffffff', .1, .37, .275, .24, .17, .035);
  paint.visible = false;

  // Wall sconces and low bollards keep the service area readable without a roof.
  for (const [lx, lz] of [[16.35, -50.1], [24.0, -65.95], [37.42, -59.9], [14.15, -54.4], [37.0, -52.14]]) {
    box('#3f4b4a', lx, 1.35, lz, .19, 2.7, .19);
    box(warm, lx, 2.73, lz, .24, .18, .24, .15, glow);
    box('#263436', lx, 2.88, lz, .34, .12, .34);
  }
  for (const [lx, lz] of [[8.25, -43.55], [10.40, -47.7], [16.8, -46.78]]) {
    box(mint, lx, .24, lz, .17, .1, .17, 0, glow);
  }
  const areaLight = new THREE.PointLight('#eeb889', 115, 17, 2);
  areaLight.position.set(24.4, 5.36, -57.18);
  const toiletLight = new THREE.PointLight('#fcd6a8', 26, 8, 2);
  toiletLight.position.set(x - .34, 2.88, z + .83);
  yard.add(areaLight, toiletLight);

  for (const [group, geometryMap] of batches) for (const [geometry, materialMap] of geometryMap) {
    for (const [material, instances] of materialMap) {
      const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
      instances.forEach(([matrix, color], index) => {
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, color);
      });
      mesh.receiveShadow = material !== glow;
      mesh.castShadow = group === yard && material !== glow;
      group.add(mesh);
    }
  }

  return function update(player, overview, manager, reduceMotion) {
    const visible = !overview && inBackstage(player.x, player.z);
    const changed = yard.visible !== visible;
    yard.visible = visible;
    grove.visible = !yard.visible;
    if (!yard.visible) return changed;
    const energy = manager.react / managerReactionTime;
    const age = managerReactionTime - manager.react;
    const shake = energy * Math.sin(age * 85);
    const jolt = reduceMotion ? 0 : shake;
    coat.rotation.set(-Math.abs(jolt) * .19, jolt * .26, jolt * .24);
    head.rotation.set(jolt * .19, jolt * .37, -jolt * .17);
    arms.forEach((arm, index) => {
      const side = index === 0 ? -1 : 1;
      arm.rotation.set(-.34 - Math.abs(jolt) * .64, jolt * side * .35, side * (.12 + Math.abs(jolt) * .51));
    });
    mouth.scale.y = .060 + .062 * energy;
    paint.visible = manager.paintTime > 0;
    if (paint.visible) paint.material.color.set(manager.color);
    return changed;
  };
}
