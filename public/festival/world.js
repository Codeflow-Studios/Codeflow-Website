import * as THREE from './vendor/three.module.min.js';
import { benches, lanterns, sideStands, trees, venues } from './layout.js';

import { createCameraRig } from './camera.js';
import { addTerrain } from './terrain.js';
import { addStageArt } from './stage-art.js';
import { addScenery } from './scenery.js';
import { addCharacters } from './characters.js';
import { spruceCrown, festoonGlow } from './forest.js';
import { createPixelRenderer } from './pixel-renderer.js';
import { stageMural } from './stage-murals.js';

const up = new THREE.Vector3(0, 1, 0);
const tau = Math.PI * 2;
const halfPi = Math.PI / 2;
const ink = '#202634';
const shell = '#303847';

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeTexture(width, height, paint) {
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createWorld(container, reduceMotion) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#121c28');
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.append(renderer.domElement);
  const pixelRenderer = createPixelRenderer(THREE, renderer);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#947686', .0045);
  scene.add(new THREE.HemisphereLight('#a8bdf4', '#74596d', .96));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const sun = new THREE.DirectionalLight('#ffbf88', 1.5);
  sun.position.set(-48, 27, -38);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: .5, far: 162 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = .05;
  sun.shadow.bias = -.00025;
  scene.add(sun);
  for (const stage of venues) {
    const wash = new THREE.PointLight(stage.color, 185, 27, 2);
    wash.position.set(stage.x, 3.6, stage.z + 3.5);
    scene.add(wash);
  }

  const rig = createCameraRig(THREE, container);
  const camera = rig.camera;
  let width = 1, height = 1;
  const point = new THREE.Vector3();
  const transform = new THREE.Object3D();
  const random = seededRandom(204);

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const post = new THREE.CylinderGeometry(.5, .5, 1, 8);
  const tube = new THREE.CylinderGeometry(.5, .5, 1, 12);
  const round = new THREE.IcosahedronGeometry(.5, 1);
  const rock = new THREE.IcosahedronGeometry(.5, 0);
  const cone = new THREE.ConeGeometry(.5, 1, 8);
  const canopy = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
  const shaftShape = new THREE.CylinderGeometry(.012, .5, 1, 32, 1, true);
  const plate = new THREE.PlaneGeometry(1, 1);
  const fence = new THREE.CylinderGeometry(.5, .5, 1, 5);
  const staticLit = new THREE.MeshStandardMaterial({ roughness: .62, metalness: .18 });
  const staticGlow = new THREE.MeshBasicMaterial();
  const evergreen = spruceCrown(THREE);
  const needles = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, side: THREE.DoubleSide });
  const batches = new Map();
  const movingLights = [];
  const beamDirection = new THREE.Vector3();
  const shadowTexture = makeTexture(64, 64, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, w * .1, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, '#ffffffd9');
    gradient.addColorStop(.52, '#ffffff65');
    gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });

  function register(geometry, color, light = false) {
    const material = geometry === evergreen ? needles : light ? staticGlow : staticLit;
    if (!batches.has(geometry)) batches.set(geometry, new Map());
    const batch = batches.get(geometry);
    if (!batch.has(material)) batch.set(material, []);
    transform.updateMatrix();
    batch.get(material).push([transform.matrix.clone(), new THREE.Color(color)]);
  }

  function prop(geometry, color, x, y, z, sx, sy, sz, rotation = 0, pitch = 0, light = false) {
    transform.position.set(x, y, z);
    transform.rotation.set(pitch, rotation, 0);
    transform.scale.set(sx, sy, sz);
    register(geometry, color, light);
  }

  function box(color, x, y, z, w, h, d, light = false) {
    prop(cube, color, x, y, z, w, h, d, 0, 0, light);
  }

  function beam(color, x, y, z, endX, endY, endZ, diameter = .16, light = false) {
    const direction = new THREE.Vector3(endX - x, endY - y, endZ - z);
    transform.position.set((endX + x) / 2, (endY + y) / 2, (endZ + z) / 2);
    transform.scale.set(diameter, direction.length(), diameter);
    transform.quaternion.setFromUnitVectors(up, direction.normalize());
    register(fence, color, light);
  }

  function floorSpot(color, x, z, w, d, opacity, glow = false) {
    const mat = new THREE.MeshBasicMaterial({
      map: shadowTexture, color, opacity, transparent: true, depthWrite: false, polygonOffset: true,
      polygonOffsetFactor: -2, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const mesh = new THREE.Mesh(plate, mat);
    mesh.position.set(x, .048, z);
    mesh.rotation.x = -halfPi;
    mesh.scale.set(w, d, 1);
    scene.add(mesh);
    return mesh;
  }

  function spotlight(color, origin, aim, spread, phase) {
    const [x, y, z] = origin;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: shadowTexture, color, opacity: .66, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    glow.position.set(x, y, z);
    glow.scale.set(1.9, 1.9, 1);
    scene.add(glow);
    prop(tube, '#252c3c', x, y, z - .19, .6, .45, .58, 0, halfPi);
    prop(tube, color, x, y, z + .06, .37, .16, .37, 0, halfPi, true);

    const material = new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(color) } },
      vertexShader: `
        varying vec3 viewNormal;
        varying vec3 viewRay;
        varying float heightInCone;
        void main() {
          vec4 positionInView = modelViewMatrix * vec4(position, 1.0);
          viewNormal = normalize(normalMatrix * normal);
          viewRay = -positionInView.xyz;
          heightInCone = uv.y;
          gl_Position = projectionMatrix * positionInView;
        }
      `,
      fragmentShader: `
        uniform vec3 tint;
        varying vec3 viewNormal;
        varying vec3 viewRay;
        varying float heightInCone;
        void main() {
          float edge = abs(dot(normalize(viewNormal), normalize(viewRay)));
          float fade = smoothstep(0.03, 0.45, heightInCone);
          float alpha = 0.095 * fade * pow(edge, 1.2);
          gl_FragColor = vec4(tint, alpha);
          #include <colorspace_fragment>
        }
      `,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const shaft = new THREE.Mesh(shaftShape, material);
    const pool = floorSpot(color, aim[0], aim[1], spread * 1.72, spread * 1.45, .23, true);
    pool.position.y = .054;
    scene.add(shaft);
    movingLights.push({ origin: new THREE.Vector3(...origin), aim, spread, phase, shaft, pool });
  }

  function animateLights(time) {
    for (const { origin, aim, spread, phase, shaft, pool } of movingLights) {
      const endX = aim[0] + Math.sin(time * .67 + phase) * 2.8;
      const endZ = aim[1] + Math.cos(time * .48 + phase) * 1.65;
      beamDirection.set(origin.x - endX, origin.y, origin.z - endZ);
      shaft.position.set((origin.x + endX) / 2, origin.y / 2, (origin.z + endZ) / 2);
      shaft.scale.set(spread, beamDirection.length(), spread);
      shaft.quaternion.setFromUnitVectors(up, beamDirection.normalize());
      pool.position.x = endX;
      pool.position.z = endZ;
    }
  }

  function panel(texture, x, y, z, w, h, { ground = false, color = '#fff' } = {}) {
    const material = new THREE.MeshBasicMaterial({ map: texture, color, transparent: ground, alphaTest: .02 });
    const mesh = new THREE.Mesh(plate, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, 1);
    if (ground) mesh.rotation.x = -halfPi;
    scene.add(mesh);
    return mesh;
  }

  function sign(text, x, y, z, w, h, background, foreground = '#141a23', ground = false) {
    const texture = makeTexture(text.length * 8 + 12, 12, (ctx, width, height) => {
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = foreground;
        for (const side of [0, width - 5]) for (let row = 0; row < height; row++)
          ctx.fillRect(side + 3 - Math.floor(row / 4), row, 2, 1);
      }
      ctx.fillStyle = foreground;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '400 8px "Press Start 2P", monospace';
      ctx.fillText(text, width / 2, 10);
    });
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    panel(texture, x, y, z, w, h, { ground });
  }

  function cover(venue, x, y, z, w, h) {
    box('#171e2c', x, y, z - .12, w + .6, h + .6, .48);
    box(venue.color, x, y - h / 2 - .27, z + .1, w + .7, .09, .12, true);
    panel(stageMural(THREE, venue.id), x, y, z + .16, w, h);
  }

  addTerrain(THREE, scene);

  function strip(x, z, width, depth, color, light = true) {
    box(color, x, .056, z, width, .025, depth, light);
  }

  for (const x of [-4.95, 4.95]) {
    for (let z = -13; z < 38; z += 2.6) strip(x, z, .075, 1.1, '#b8baa5', false);
  }
  for (const side of [-1, 1]) {
    for (let x = 6; x < 27; x += 2.5) strip(x * side, 13.95, 1.15, .075, '#c7ada0', false);
  }
  function pine(x, z, size, variant) {
    prop(post, '#343b3b', x, size * .18, z, size * .14, size * .36, size * .14);
    prop(evergreen, variant < .5 ? '#798b78' : '#697e75', x, 0, z, size, size, size, variant * tau);
  }

  for (const [x, z, size] of trees) {
    floorSpot('#121d21', x, z, size * 1.4, size * 1.06, .68);
    pine(x, z, size, random());
    for (let i = 0; i < 6; i++) {
      const t = random() * tau;
      const radius = size * (.30 + random() * .24);
      prop(round, '#375c54', x + Math.cos(t) * radius, .32, z + Math.sin(t) * radius, .8 + random() * .66, .66, 1.2);
    }
  }

  for (let i = 0; i < 143; i++) {
    const x = -100 + random() * 200;
    const z = -73 + random() * 132;
    if (Math.abs(x) < 55 && z > -47 && z < 48) continue;
    if (Math.abs(x) < 9 && z > 40) continue;
    pine(x, z, 3.8 + random() * 9, random());
  }
  for (let i = 0; i < 42; i++) {
    const x = -65 + random() * 130;
    const z = -49 + random() * 105;
    if (Math.abs(x) <= 50 && z > -43 && z < 43) continue;
    prop(rock, '#3c4e52', x, .35, z, 1 + random() * 3, 1.2, 1.4, random() * tau);
  }

  function railing(startX, startZ, endX, endZ, color, segments) {
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = THREE.MathUtils.lerp(startX, endX, t);
      const z = THREE.MathUtils.lerp(startZ, endZ, t);
      prop(post, '#424b54', x, .89, z, .21, 1.78, .21);
      prop(post, color, x, 1.82, z, .27, .09, .27, 0, 0, true);
    }
    beam(color, startX, 1.45, startZ, endX, 1.45, endZ, .10);
    beam('#44565b', startX, .49, startZ, endX, .49, endZ, .09);
  }

  railing(-51, -43, 51, -43, '#65797b', 26);
  for (const x of [-51, 51]) railing(x, -43, x, 43, '#65797b', 22);
  railing(-51, 43, -5, 43, '#7b827e', 12);
  railing(5, 43, 51, 43, '#7b827e', 12);

  const bulbs = [];
  for (const [x, z] of lanterns) {
    bulbs.push(x, 5.38, z);
    prop(tube, '#414b53', x, .18, z, .65, .36, .65);
    prop(post, '#5d6570', x, 2.74, z, .17, 5.3, .17);
    prop(tube, '#ffe1a5', x, 5.36, z, .36, .43, .36, 0, 0, true);
    prop(cone, ink, x, 5.62, z, .65, .23, .65);
    floorSpot('#ffb65c', x, z, 7.9, 7.9, .105, true);
  }
  for (const z of [-12, 3, 23, 39]) {
    const sag = x => 4.50 + (x / 8) ** 2 * .92;
    for (let x = -8; x < 8; x += 1) {
      beam('#645a57', x, sag(x), z, x + 1, sag(x + 1), z, .027);
      prop(round, x % 3 === 0 ? '#ffcf93' : '#ffedc3', x + .5, sag(x + .5) - .07, z, .102, .144, .102, 0, 0, true);
      bulbs.push(x + .5, sag(x + .5) - .07, z);
    }
  }

  const resizeGlow = festoonGlow(THREE, scene, bulbs);
  const pennant = new THREE.BufferGeometry();
  pennant.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .52, -.89, 0, 1, 0, 0], 3));
  pennant.computeVertexNormals();
  const flagColors = ['#ebb592', '#cdeda1', '#9cbada', '#c496cb'];
  const flagMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const pennants = new THREE.InstancedMesh(pennant, flagMaterial, 36);
  let flag = 0;
  for (const x of [-26, 26]) {
    for (const z of [25, 34]) box('#6b6865', x - 9, 2.39, z, .14, 4.74, .14);
    for (const z of [25, 34]) {
      beam('#716d68', x - 9, 4.65, z, x, 4.23, z, .04);
      beam('#716d68', x, 4.23, z, x + 9, 4.65, z, .04);
      box('#6b6865', x + 9, 2.39, z, .14, 4.74, .14);
      for (let i = -4; i <= 4; i++) {
        transform.position.set(x + i * 1.87 - .42, 4.24 + Math.abs(i) * .091, z);
        transform.rotation.set(0, .15 * i, .028 * i);
        transform.scale.set(.88, .84, 1);
        transform.updateMatrix();
        pennants.setMatrixAt(flag, transform.matrix);
        pennants.setColorAt(flag, new THREE.Color(flagColors[flag % flagColors.length]));
        flag++;
      }
    }
  }
  scene.add(pennants);

  for (const [x, z] of benches) {
    floorSpot('#14212a', x, z, 4.5, 2.4, .55);
    box('#87675b', x, .75, z, 3.4, .20, 1.10);
    box('#79594e', x, 1.17, z - .45, 3.4, .64, .18);
    for (const d of [-1.2, 1.2]) box(ink, x + d, .34, z, .18, .63, .88);
  }

  function market({ x, z, width: w, depth: d, color, label }) {
    floorSpot('#15212c', x, z, w + 3, d + 2, .62);
    prop(canopy, color, x, 3.65, z, w + .5, 1.5, d + 1.25);
    box(ink, x, 2.92, z - d / 2, w, .26, .17);
    box(color, x, 2.87, z + d / 2 + .15, w, .22, .22);
    for (const lateral of [-1, 1]) {
      for (const longitudinal of [-1, 1]) box('#6d656a', x + lateral * (w / 2 - .18), 1.5, z + longitudinal * (d / 2 - .18), .19, 3, .19);
    }
    box('#42444f', x, .62, z + d / 2 - .44, w - .46, 1.24, .69);
    box('#aa8a71', x, 1.29, z + d / 2 - .44, w - .26, .12, .92);
    for (let i = -3; i <= 3; i++) {
      prop(post, i % 2 ? '#9b97a5' : '#67606b', x + i * .75, 1.53, z + 1.45, .27, .37, .27);
      box('#ffdeac', x + i * 1.05, 2.64, z + d / 2 + .05, .24, .14, .16, true);
    }
    sign(label, x, 3.29, z + d / 2 + .26, w * .61, .82, color);
  }
  sideStands.forEach(market);

  for (const x of [-6, 6]) {
    tower(x, 41.42, 4.88, '#ccea95');
    floorSpot('#c2e879', x, 39.3, 4.3, 4.9, .16, true);
  }
  box(ink, 0, 4.92, 41.42, 13, 1.24, .74);
  sign('SKUMIC FESTIVAL', 0, 4.92, 41.80, 11.2, 1.12, '#dafa91');
  sign('SKUMIC', 0, .063, 24.9, 8.9, 2, null, '#dbd4be', true);

  function deck(venue) {
    const { x, z, width: w, depth: d, color } = venue;
    floorSpot('#18212a', x, z, w + 10, d + 6, .95);
    floorSpot(color, x, z + d / 2 + 6, w * 1.14, 17, .32, true);
    box(ink, x, .36, z, w, .72, d);
    box('#51566a', x, .76, z, w - .12, .13, d - .16);
    box(color, x, .66, z + d / 2 + .018, w + .08, .13, .04, true);
    for (let i = 1; i < d - .65; i += .46) box('#606679', x, .828, z - d / 2 + i, w - .78, .012, .032);
    for (const contact of [-1, 1]) {
      box(color, x + contact * w / 2, .64, z, .075, .10, d, true);
      box('#303747', x + contact * (w / 2 - .68), .25, z + d / 2 + .61, 1.12, .5, 1.17);
    }
    for (let i = 0; i < 3; i++) box('#56596c', x, .30 - .10 * i, z + d / 2 + .3 + .32 * i, 6, .52 - .14 * i, .59);
    for (const dx of [-3.2, 3.2]) {
      strip(x + dx, venue.doorZ, .13, 3.9, color);
      strip(x + dx * .81, venue.doorZ + 1.99, .91, .13, color);
    }
  }

  function tower(x, z, height, color) {
    for (const side of [-1, 1]) {
      box(shell, x + side * .57, height / 2, z, .21, height, .24);
      box('#434b56', x + side * .57, height / 2, z - .86, .21, height, .21);
      box(color, x + side * .57, height * .59, z + .13, .09, height * .69, .08, true);
    }
    for (let y = .7; y < height; y += 1.3) {
      beam('#65707a', x - .53, y, z, x + .53, y + 1, z, .076);
      beam('#65707a', x + .53, y, z, x - .53, y + 1, z, .076);
      beam('#58606d', x - .57, y, z - .83, x + .57, y, z - .83, .11);
    }
  }

  function speaker(x, z, height, color) {
    box(ink, x, height / 2 + .78, z, 1.58, height, 1.31);
    for (let y = 1.39; y < height + .41; y += 1.18) {
      prop(tube, '#555965', x, y, z + .668, .96, .06, .96, 0, halfPi);
      prop(tube, '#222733', x, y, z + .704, .74, .07, .74, 0, halfPi);
      prop(tube, color, x, y, z + .749, .25, .06, .25, 0, halfPi);
    }
  }

  function mainStage(venue) {
    const { x, z, color } = venue;
    deck(venue);
    box('#282d3d', x, 3.7, z - 4.8, 20.5, 6, 1.13);
    for (const side of [-1, 1]) {
      tower(x + 10.8 * side, z + 4.11, 8.45, color);
      tower(x + 10.8 * side, z - 4.13, 8.45, '#8bbdad');
      speaker(x + 8.4 * side, z + 3.48, 4.95, color);
      box('#556f69', x + 8.1 * side, 4.75, z - 4.01, 3.4, 4.58, .14);
      for (let i = 0; i < 8; i++) box(color, x + side * (8.1 + (i % 2 ? .42 : -.42)), 2.98 + i * .49, z - 3.92, 1.74, .12, .035, true);
      for (let i = 0; i < 5; i++) {
        const sign = side * (11.1 + .24 * i);
        beam('#526a66', sign, 7.5 + .16 * i, z - 4, sign, 7.5 + .16 * i, z + 4.4, .14);
      }
    }
    box('#32394b', x, 8.01, z - 4.20, 22.6, .42, 2.14);
    beam('#778486', x - 10.8, 8.15, z + 4.11, x + 10.8, 8.15, z + 4.11, .18);
    box(color, x, 7.88, z + 5.25, 22.6, .13, .18, true);
    box(ink, x, 7.7, z + 5.28, 15.3, 1.55, .18);
    sign('CROWD SURFING', x, 7.77, z + 5.39, 14.7, 1.37, color);
    cover(venue, x, 3.96, z - 3.48, 11.7, 5.1);
    for (let i = -6; i <= 6; i++) box(i % 2 ? '#dafa9b' : '#a8f4df', x + i * 1.25, 1.05, z + 5.61, .52, .105, .16, true);
    spotlight('#bcfa86', [x - 9.4, 7.58, z + 5.56], [x + 2.8, z + 11.9], 4.8, 0);
    spotlight('#81f6e4', [x + 9.4, 7.58, z + 5.56], [x - 2.8, z + 11.2], 4.9, 2.6);
  }

  function fightingTent(venue) {
    const { x, z, color } = venue;
    deck(venue);
    for (const side of [-1, 1]) {
      const wallX = x + side * 8.22;
      box('#6a4d55', wallX, 2.2, z, 2.7, 2.94, 11.8);
      box('#8c5c61', wallX, 3.83, z, 2.75, .30, 11.95);
      for (let i = 0; i < 9; i++) {
        box('#4a424f', wallX + side * 1.39, 2.17, z - 5.25 + i * 1.29, .15, 2.50, .18);
      }
      tower(x + side * 9.05, z + 4.9, 6.87, color);
      speaker(x + side * 6.53, z + 4.10, 2.82, color);
    }
    box('#3e3646', x, 3.6, z - 5.58, 16.3, 5.68, .72);
    box('#4e4251', x, 6.61, z - 5.35, 19.6, .47, 1.36);
    for (const side of [-1, 1]) beam('#7a666e', x + side * 9.05, 6.82, z - 5.8, x + side * 9.05, 6.82, z + 5.5, .21);
    box('#563c49', x, 6.42, z + 5.47, 16.6, 1.36, .48);
    sign('STAGE FIGHTERS', x, 6.44, z + 5.74, 15.37, 1.22, color);
    cover(venue, x, 3.86, z - 4.98, 10.72, 4.32);
    const ringWidth = 9.2;
    const ringDepth = 4;
    box('#a77776', x, .92, z + 2.2, ringWidth, .27, ringDepth);
    for (const side of [-1, 1]) {
      box('#ffbaaa', x + ringWidth / 2 * side, .98, z + 2.2, .11, .15, ringDepth, true);
      for (const corner of [.2, 4.2]) box(ink, x + ringWidth / 2 * side, 1.43, z + corner, .26, 1.24, .26);
      for (let y = 1.22; y < 1.95; y += .32) beam(color, x + ringWidth / 2 * side, y, z + .2, x + ringWidth / 2 * side, y, z + 4.2, .062, true);
    }
    spotlight('#ffab85', [x - 7.9, 6.2, z + 5.87], [x + .9, z + 11.6], 3.75, 1.1);
    spotlight('#ffdca1', [x + 7.9, 6.2, z + 5.87], [x - 2.6, z + 9.4], 3.3, 3.7);
  }

  function raveClub(venue) {
    const { x, z, color } = venue;
    deck(venue);
    box('#373a59', x, 3.72, z - 4.95, 18.6, 5.9, 1.1);
    for (const side of [-1, 1]) {
      const w = x + side * 6.7;
      box('#474263', w, 2.44, z + .19, 2.48, 3.23, 10.4);
      speaker(x + side * 8.45, z + 3.65, 3.25, '#ab9fe8');
      for (let i = 0; i < 5; i++) {
        const postX = w + side * (i - 2) * .49;
        box(i % 2 ? '#ccbcff' : '#9d99f0', postX, 4.52 - i * .24, z + 4.93, .20, 3.7 - i * .51, .19, true);
      }
      beam('#9990e4', x, 7.36, z + 3.9, x + side * 9.25, 4.63, z + 3.9, .24, true);
      beam('#7674b7', x, 7.36, z - 4.7, x + side * 9.25, 4.63, z - 4.7, .22);
    }
    cover(venue, x, 4.17, z - 4.28, 11.7, 4.72);
    const tunnel = new THREE.TorusGeometry(3.27, .16, 8, 12, Math.PI);
    for (let i = 0; i < 4; i++) prop(tunnel, i % 2 ? '#e1b8fa' : color, x, 1.0, z + 4.1 - i, 1.23, 1, 1, 0, 0, true);
    box(ink, x, 6.77, z + 4.03, 13.28, 1.03, .48);
    sign('SKUMIC RAVE RUSH', x, 6.77, z + 4.29, 12.9, .93, color);
    for (let i = -4; i <= 4; i++) strip(x + i * .74, z + 4.75, .37, 1.52, i % 2 ? '#aaa5fd' : '#e1b8fa');
    spotlight('#c6a2ff', [x - 7.1, 6.05, z + 4.63], [x + 3.6, z + 12.7], 4.05, 4.1);
    spotlight('#8c9bff', [x + 7.1, 6.05, z + 4.63], [x - 3.7, z + 12], 4.3, 2.1);
  }

  mainStage(venues[0]);
  fightingTent(venues[1]);
  raveClub(venues[2]);

  for (const [geometry, materials] of batches) {
    for (const [material, instances] of materials) {
      const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
      instances.forEach(([matrix, color], index) => {
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, color);
      });
      mesh.castShadow = mesh.receiveShadow = material !== staticGlow;
      scene.add(mesh);
    }
  }

  const animateStage = addStageArt(THREE, scene, venues, reduceMotion);
  const animateScenery = addScenery(THREE, scene, reduceMotion);
  const animateCharacters = addCharacters(THREE, scene, reduceMotion);
  const gateRing = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.68, 36),
    new THREE.MeshBasicMaterial({ color: '#edffae', transparent: true, depthWrite: false }));
  gateRing.rotation.x = -halfPi;
  scene.add(gateRing);

  let lastShadow = -Infinity;

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    rig.resize(width / height);
    resizeGlow(pixelRenderer.resize(width, height));
  }

  function frame(player, elapsed, time, marked, nearby) {
    rig.update(player, elapsed);
    animateCharacters(player, elapsed, time, rig.overview, camera);
    animateScenery(time);
    animateStage(time);
    const gate = nearby || marked;
    gateRing.visible = Boolean(gate);
    if (gate) {
      gateRing.position.set(gate.doorX, .079, gate.doorZ);
      gateRing.material.color.set(gate.color);
      gateRing.material.opacity = reduceMotion ? .88 : .75 + Math.sin(time * 3.6) * .2;
    }
    animateLights(reduceMotion ? 0 : time);
    if (time - lastShadow >= 1 / 18) {
      renderer.shadowMap.needsUpdate = true;
      lastShadow = time;
    }
    pixelRenderer.draw(scene, camera);
  }

  function project(x, y, z) {
    point.set(x, y, z).project(camera);
    return { inFront: point.z >= -1 && point.z <= 1, x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 };
  }

  resize();
  return { resize, frame, project, rig };
}
