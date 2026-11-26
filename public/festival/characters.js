const W = 36, H = 52, GAP = 2, FRAMES = 5;
const TAU = Math.PI * 2;
const ink = '#202334';
const boots = ['#454651', '#bcbaab', '#f0e5c6'];
const skinTones = [
  ['#835555', '#bf8069', '#edaa84'],
  ['#70484b', '#a36955', '#ce8967'],
  ['#503943', '#7f5148', '#aa7060'],
  ['#a77066', '#d6987e', '#edc2a0'],
];
const outfits = [
  // Base, shade and lit fabric, trousers, headwear, hat colour and skin palette.
  ['#cae65e', '#75945b', '#edff99', '#374553', 'headset', '#d97050', 0],
  ['#cf7570', '#864e61', '#edaa8e', '#413b51', 'beanie', '#bb9ad2', 2],
  ['#5f9da4', '#48737e', '#9ccac1', '#37435e', 'cap', '#d18e57', 0],
  ['#947aad', '#685a84', '#cab3d3', '#384f60', 'long', '#493d4c', 3],
  ['#d19a59', '#886953', '#f2bf70', '#495851', 'curls', '#422e43', 2],
  ['#63a480', '#4a796a', '#afcca1', '#484458', 'bucket', '#a7bfc2', 1],
  ['#69749a', '#4c526d', '#a6a1c2', '#65574d', 'beanie', '#ce806d', 3],
  ['#bd705b', '#874e54', '#e5a57d', '#3c4a58', 'long', '#40303c', 1],
  ['#a3a56a', '#6d7b5c', '#d5d29b', '#3d4155', 'cap', '#656081', 0],
  ['#66c6bb', '#438b90', '#a5edde', '#34374c', 'mic', '#555076', 2],
  ['#dc8277', '#96596a', '#edbaa2', '#353d58', 'guitar', '#573e45', 3],
];

const palette = new Map();
const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
function rgba(hex) {
  if (!palette.has(hex)) {
    const value = Number.parseInt(hex.slice(1), 16);
    const r = value >>> 16, g = value >>> 8 & 255, b = value & 255;
    palette.set(hex, (littleEndian ? 0xff000000 | b << 16 | g << 8 | r : value << 8 | 255) >>> 0);
  }
  return palette.get(hex);
}

// An integer scanline painter keeps the silhouette, seams and highlights on the same pixel grid.
function drawCharacter(outfit, direction, frame, index) {
  const pixels = new Uint32Array(W * H);
  const [coat, shade, light, denim, hat, hatColor, skinIndex] = outfit;
  const [skinShade, skin, skinLight] = skinTones[skinIndex];
  const hero = index === 0;
  const side = direction === 1 || direction === 3;
  const back = direction === 2;
  const moving = frame !== 4;
  const stage = hat === 'mic' || hat === 'guitar';
  const stride = moving ? [1, 0, -1, 0][frame] : 0;
  const passing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const bounce = moving && frame % 2 === 1 ? -1 : 0;
  const cheers = !hero && !stage && index % 3 === 1;
  let oy = 0;
  function dot(x, y, color) {
    x = Math.round(x); y = Math.round(y) + oy;
    if (x >= 0 && x < W && y >= 0 && y < H) pixels[y * W + x] = rgba(color);
  }
  function rect(x, y, w, h, color) {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) dot(x + xx, y + yy, color);
  }
  function line(x0, y0, x1, y1, color, thick = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      rect(Math.round(x0 + (x1 - x0) * i / steps), Math.round(y0 + (y1 - y0) * i / steps), thick, thick, color);
    }
  }
  function poly(points, color) {
    const ys = points.map(p => p[1]);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      const cuts = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) cuts.push(ax + (y - ay) * (bx - ax) / (by - ay));
      }
      cuts.sort((a, b) => a - b);
      for (let i = 0; i < cuts.length; i += 2) {
        for (let x = Math.ceil(cuts[i]); x <= Math.floor(cuts[i + 1]); x++) dot(x, y, color);
      }
    }
  }
  function shoe(x, y, far) {
    const toe = side ? 5 : 3;
    poly([[x - 3,y - 2],[x + 2,y - 2],[x + 3,y],[x + toe,y],[x + toe,y + 3],[x - 3,y + 3]], far ? '#686977' : boots[1]);
    rect(x - 3, y + 2, toe + 4, 1, far ? '#85848a' : boots[2]);
    rect(x - 2, y - 1, 3, 2, far ? '#4c515f' : '#738a86');
    if (!far) dot(x + 1, y, '#f7eecd');
  }
  function leg(sign, far) {
    const hip = side ? 17 + sign : 18 + sign * 4;
    const lifted = passing === sign;
    const knee = hip + (side ? sign * stride * 3 + (lifted ? 2 : 0) : sign);
    const foot = knee + (side ? sign * stride * 3 - (lifted ? 4 : 0) : 0);
    const footY = 47 - (lifted ? 3 : side ? (sign * stride < 0 ? 2 : 0) : Math.max(0, sign * stride) * 3);
    poly([[hip - 3,29],[hip + 3,29],[knee + 3,36],[foot + 2,footY - 1],[foot - 2,footY - 1],[knee - 3,39]], far ? '#343949' : denim);
    line(hip - 1, 32, knee - 2, 38, far ? '#434857' : '#63717c');
    line(knee - 2, 40, foot - 2, footY - 3, '#535b68');
    rect(knee - 2, 37, 4, 1, '#3c4656');
    if (hero) { rect(knee - 3, 34, 4, 3, '#55636e'); rect(knee - 3, 34, 4, 1, '#849187'); }
    shoe(foot, footY, far);
  }
  leg(-1, side || stride > 0);
  leg(1, !side && stride < 0);
  oy = bounce;
  function arm(s, far) {
    const shoulderX = side ? 17 : 18 + s * 7;
    const cheer = cheers && (s > 0 || index === 4);
    const mic = hat === 'mic' && s > 0;
    const guitar = hat === 'guitar';
    const elbowX = shoulderX + (side ? -s * stride * 3 : s * (cheer ? 4 : 2));
    const handX = elbowX + (side ? -s * stride * 2 + (mic ? 5 : 1) : s * (cheer ? 2 : -1));
    const elbowY = cheer ? 17 : 24 + (side ? 0 : stride * s);
    const handY = cheer ? 11 + stride : mic ? 17 : guitar ? 27 : 29 + (side ? 0 : stride * s);
    line(shoulderX - 2, 17, elbowX - 2, elbowY, far ? shade : coat, 5);
    line(elbowX - 2, elbowY, handX - 1, handY, far ? shade : coat, 4);
    if (!far) line(shoulderX - 2, 17, elbowX - 2, elbowY - 1, light);
    if (hero) rect(elbowX - 2, elbowY, 4, 2, '#426068');
    rect(handX - 1, handY, 4, 2, hero ? '#4c6a68' : shade);
    rect(handX, handY + (cheer ? -2 : 2), 3, 3, skin);
    dot(handX, handY + (cheer ? -2 : 2), skinLight);
    if (mic) { line(handX + 1, handY + 3, handX - 1, handY - 1, ink, 2); rect(handX - 2, handY - 2, 3, 2, '#c1cac4'); }
  }
  if (side) arm(-1, true);
  const l = side ? 12 : 11, r = side ? 23 : 25;
  poly([[l + 1,17],[16,15],[22,15],[r,17],[r + 1,23],[r,30],[22,31],[l,31],[l - 1,25]], shade);
  poly([[l + 3,16],[21,15],[r - 1,17],[r,23],[r - 2,28],[l + 2,29],[l,23]], coat);
  line(l + 2, 18, l, 22, light, 2);
  line(l + 2, 16, 17, 15, light, 1);
  rect(l + 1, 29, r - l - 1, 2, shade);
  rect(l + 2, 30, r - l - 3, 1, '#384d55');
  rect(16, 14, side ? 5 : 6, 3, skinShade);
  if (back) {
    poly([[12,17],[17,16],[22,16],[25,18],[22,20],[15,20]], hero ? '#46645e' : shade);
    line(13, 17, 16, 19, hero ? '#a5b873' : coat);
    line(14, 25, 17, 27, shade);
    if (hero) {
      line(22, 17, 13, 28, '#32484e', 2);
      rect(15, 22, 8, 6, '#38525b'); rect(15, 22, 7, 2, '#54787a');
      rect(16, 24, 5, 1, '#efb865'); dot(21, 24, '#bce5bf');
    }
  } else {
    const zip = side ? 22 : 18;
    line(zip, 18, zip, 28, shade);
    line(zip + 1, 18, zip + 1, 26, hero ? '#ecf6a6' : light);
    if (hero) {
      line(side ? 15 : 12, 17, side ? 21 : 23, 26, '#324954', 2);
      rect(side ? 18 : 20, 23, 6, 5, '#334953');
      rect(side ? 18 : 20, 23, 6, 1, '#80978a');
      rect(side ? 19 : 21, 25, 4, 1, '#ffbf66');
    } else {
      rect(l + 2, 21, 3, 1, light);
      dot(l + 3, 22, shade);
    }
  }
  if (hat === 'guitar') {
    poly([[14,23],[18,23],[19,25],[21,27],[20,30],[15,31],[12,29],[12,26]], '#dc9158');
    rect(16, 25, 3, 2, '#6c4443');
    line(19, 25, 27, 20, '#79534a', 2); line(20, 25, 27, 20, '#ecc48c');
    rect(26, 19, 4, 2, '#c88763');
  }
  if (!side) arm(-1, false);
  arm(1, false);

  // Hair, cheeks, caps and headphones are separate colour clusters, readable from every heading.
  poly([[13,5],[16,3],[21,3],[24,6],[24,12],[21,15],[17,16],[13,13]], skinShade);
  if (!back) {
    poly([[15,6],[21,5],[23,7],[23,12],[20,14],[16,13],[15,11]], skin);
    line(16, 8, 17, 7, skinLight);
    if (side) { rect(23, 9, 2, 2, skin); rect(21, 8, 2, 1, ink); dot(22, 12, skinShade); }
    else { rect(15, 8, 2, 1, ink); rect(21, 8, 2, 1, ink); dot(19, 10, skinLight); rect(18, 12, 3, 1, skinShade); }
  }
  if (back) {
    poly([[13,5],[16,3],[22,4],[24,6],[24,12],[21,14],[17,14],[13,12]], '#433746');
    rect(15, 13, 5, 1, '#57404a');
  }
  if (hat === 'long' || hat === 'curls' || hat === 'guitar') {
    poly([[12,7],[14,4],[17,3],[21,3],[24,5],[25,8],[22,7],[19,6],[16,8],[14,11],[12,11]], hatColor);
    if (back || hat === 'long') {
      const x = side ? 12 : 13;
      poly([[x,6],[x + 5,6],[x + 3,12],[x + 4,17],[x,18],[x - 1,14]], hatColor);
      if (back) rect(x + 4, 9, 5, 6, hatColor);
    }
    rect(14, 5, 3, 1, '#75585e'); dot(19, 4, '#776261');
  } else {
    poly([[12,6],[13,4],[15,2],[20,2],[23,4],[24,7],[22,8],[13,8]], hatColor);
    rect(15, 3, 4, 1, hero ? '#ffb474' : light);
    rect(12, 7, 12, 2, hero ? '#824f4e' : shade);
    if (hat === 'beanie') rect(17, 1, 3, 2, hatColor);
    else if (hat === 'bucket') { rect(11, 7, 15, 2, hatColor); rect(11, 8, 5, 1, light); }
    else if (!back) { rect(side ? 19 : 15, 7, side ? 8 : 10, 1, hatColor); rect(side ? 20 : 16, 8, side ? 7 : 8, 1, '#4e414a'); }
    if (hat === 'headset' || hat === 'mic') {
      if (back) { line(12, 7, 16, 4, '#384955'); line(16, 4, 21, 4, '#64878a'); }
      const x = side ? 14 : 12;
      rect(x, 8, 3, 5, '#253643'); rect(x, 9, 2, 3, '#e4a858'); dot(x, 9, '#ffdb83');
      if (!side) { rect(23, 8, 2, 4, '#344e54'); dot(24, 9, '#efc563'); }
      if (!back && hero) { rect(side ? 20 : 15, 9, side ? 4 : 8, 2, '#28404e'); rect(side ? 21 : 19, 9, 3, 1, '#8ae4db'); }
    }
  }

  // A single dark outline separates adjacent fans, even when the stage lights are bright.
  const outlined = pixels.slice();
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!pixels[i] && (pixels[i - 1] || pixels[i + 1] || pixels[i - W] || pixels[i + W])) outlined[i] = rgba(ink);
  }
  return outlined;
}

function createAtlas(THREE) {
  const cols = 20;
  const tw = W + GAP * 2, th = H + GAP * 2;
  const width = cols * tw, height = outfits.length * th;
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  const ctx = canvas.getContext('2d');
  const sheet = ctx.createImageData(width, height);
  const dst = new Uint32Array(sheet.data.buffer);
  outfits.forEach((outfit, index) => {
    for (let direction = 0; direction < 4; direction++) for (let frame = 0; frame < FRAMES; frame++) {
      const tile = drawCharacter(outfit, direction, frame, index);
      const ox = (direction * FRAMES + frame) * tw + GAP, oy = index * th + GAP;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        dst[(oy + y) * width + ox + x] = tile[y * W + (direction === 3 ? W - x - 1 : x)];
      }
    }
  });
  ctx.putImageData(sheet, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return { tex, width, height, tw, th };
}

function createAudience() {
  const actors = [{ x: 0, z: 26, y: .067, heading: Math.PI, size: 2.95, outfit: 0, phase: 0 }];
  let seed = 12176;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  function fans(x, z, rows, cols, offset) {
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      actors.push({
        x: x + (col - (cols - 1) / 2) * 1.35 + (random() - .5) * .56,
        z: z + row * 1.44 + (random() - .5) * .63, y: .066,
        size: 2.18 + random() * .345, heading: Math.PI + (random() - .5) * 1.02,
        outfit: 1 + ((actors.length * 5 + offset) % 8), phase: random() * 4,
      });
    }
  }
  fans(-8.7, -21.7, 3, 5, 2); fans(8.2, -22.1, 3, 5, 0);
  fans(-25.2, 8.2, 2, 3, 1); fans(-40.3, 8.6, 2, 3, 3);
  fans(25.3, 8.2, 2, 3, 5); fans(40.2, 9, 2, 3, 6);
  fans(-24.5, 24.4, 1, 3, 3); fans(23.2, 25.3, 1, 3, 2);
  for (const [x, z, outfit] of [[-4.6, -28.1, 9], [4.4, -29, 10], [33, -1.3, 9]]) {
    actors.push({ x, z, y: .855, heading: -.1, size: 2.65, outfit, phase: random() * 4 });
  }
  return actors;
}

export function addCharacters(THREE, scene, reduceMotion) {
  const atlas = createAtlas(THREE);
  const actors = createAudience();
  const plane = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.setAttribute('position', plane.attributes.position);
  geometry.setAttribute('uv', plane.attributes.uv);
  function attribute(name, dimensions, dynamic = false) {
    const buffer = new THREE.InstancedBufferAttribute(new Float32Array(actors.length * dimensions), dimensions);
    if (dynamic) buffer.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(name, buffer);
    return buffer;
  }
  const centers = attribute('anchor', 3, true), sizes = attribute('actorSize', 1);
  const offsets = attribute('tileOrigin', 2, true);
  actors.forEach((a, i) => { centers.setXYZ(i, a.x, a.y, a.z); sizes.setX(i, a.size); });
  geometry.instanceCount = actors.length;
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      sheet: { value: null }, tileSize: { value: new THREE.Vector2(W / atlas.width, H / atlas.height) },
    }]),
    fog: true,
    vertexShader: `
      attribute vec3 anchor;
      attribute float actorSize;
      attribute vec2 tileOrigin;
      uniform vec2 tileSize;
      varying vec2 tileUv;
      #include <fog_pars_vertex>
      void main() {
        tileUv = tileOrigin + uv * tileSize;
        vec4 mvPosition = modelViewMatrix * vec4(anchor, 1.0);
        mvPosition.xy += vec2(position.x * 0.6923077, position.y + 0.5) * actorSize;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform sampler2D sheet;
      varying vec2 tileUv;
      #include <fog_pars_fragment>
      void main() {
        vec4 color = texture2D(sheet, tileUv);
        if (color.a < 0.5) discard;
        gl_FragColor = vec4(color.rgb, 1.0);
        #include <fog_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.uniforms.sheet.value = atlas.tex;
  const sprites = new THREE.Mesh(geometry, material);
  sprites.frustumCulled = false;
  scene.add(sprites);

  const shadowTex = new Uint8Array(20 * 14 * 4);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) {
    const radius = ((x - 9.5) / 9.5) ** 2 + ((y - 6.5) / 6.5) ** 2;
    if (radius < 1) shadowTex.set([20, 25, 38, radius < .38 ? 118 : radius < .72 ? 78 : 38], (y * 20 + x) * 4);
  }
  const shadowMap = new THREE.DataTexture(shadowTex, 20, 14);
  shadowMap.needsUpdate = true;
  const shadows = new THREE.InstancedMesh(plane, new THREE.MeshBasicMaterial({
    map: shadowMap, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1,
  }), actors.length);
  const stamp = new THREE.Object3D();
  function placeShadow(i) {
    const a = actors[i];
    stamp.position.set(a.x + .11, a.y + .011, a.z - .05);
    stamp.rotation.set(-Math.PI / 2, 0, -.2);
    stamp.scale.set(a.size * .54, a.size * .30, 1);
    stamp.updateMatrix();
    shadows.setMatrixAt(i, stamp.matrix);
  }
  actors.forEach((a, i) => placeShadow(i));
  shadows.frustumCulled = false;
  scene.add(shadows);
  const halo = new THREE.Mesh(new THREE.RingGeometry(.82, .89, 12), new THREE.MeshBasicMaterial({
    color: '#d6fa8d', transparent: true, opacity: .87, toneMapped: false, depthWrite: false,
  }));
  halo.rotation.x = -Math.PI / 2;
  scene.add(halo);
  let stride = 0;
  const prior = new Int16Array(actors.length).fill(-1);

  return function tick(player, dt, time, overview, camera) {
    const main = actors[0];
    main.x = player.x; main.z = player.z; main.heading = player.heading;
    stride += dt * player.speed * .90;
    centers.setXYZ(0, main.x, main.y, main.z);
    centers.addUpdateRange(0, 3); centers.needsUpdate = true;
    placeShadow(0);
    shadows.instanceMatrix.addUpdateRange(0, 16); shadows.instanceMatrix.needsUpdate = true;
    halo.position.set(main.x, main.y + .023, main.z);
    halo.visible = overview;
    let changed = false;
    actors.forEach((a, i) => {
      const yaw = camera ? Math.atan2(camera.position.x - a.x, camera.position.z - a.z) : 0;
      const direction = (Math.round((a.heading - yaw) / (TAU / 4)) % 4 + 4) % 4;
      let frame = 4;
      if (!reduceMotion) {
        if (i === 0 && player.speed > .12) frame = Math.floor(stride) % 4;
        else if (i !== 0) frame = Math.floor(time * (a.outfit % 2 ? 3.24 : 4.0) + a.phase) % 4;
      }
      const col = direction * FRAMES + frame;
      if (prior[i] === col) return;
      offsets.setXY(i, (col * atlas.tw + GAP) / atlas.width, 1 - (a.outfit * atlas.th + GAP + H) / atlas.height);
      prior[i] = col;
      changed = true;
    });
    if (changed) offsets.needsUpdate = true;
  };
}
