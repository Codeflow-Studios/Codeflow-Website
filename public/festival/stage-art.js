// Touring structures and instruments are sized in the same metres as the walkable map.
export function addStageArt(THREE, scene, venues, reduceMotion) {
  const group = new THREE.Group();
  group.name = 'Festival stage production';
  scene.add(group);

  const box = new THREE.BoxGeometry();
  const tube = new THREE.CylinderGeometry(.5, .5, 1, 10);
  const drum = new THREE.CylinderGeometry(.5, .5, 1, 20);
  const rail = new THREE.CylinderGeometry(.5, .5, 1, 6);
  const sphere = new THREE.SphereGeometry(.5, 10, 8);
  const plate = new THREE.PlaneGeometry();
  const metal = new THREE.MeshStandardMaterial({ roughness: .52, metalness: .38 });
  const neon = new THREE.MeshBasicMaterial({ toneMapped: false });
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const axis = new THREE.Vector3();
  const batches = new Map();
  const skinVertices = [];
  const skinColors = [];
  const displayClock = { value: .87 };
  const movingParts = [];
  const dark = '#202632';
  const steel = '#8a9bad';
  const silver = '#bac7cf';

  function instance(shape, material, color) {
    if (!batches.has(shape)) batches.set(shape, new Map());
    const materials = batches.get(shape);
    if (!materials.has(material)) materials.set(material, []);
    transform.updateMatrix();
    materials.get(material).push({ matrix: transform.matrix.clone(), color: new THREE.Color(color) });
  }

  function shape(geometry, color, x, y, z, width, height, depth, pitch = 0, yaw = 0, roll = 0, lit = false) {
    transform.position.set(x, y, z);
    transform.rotation.set(pitch, yaw, roll);
    transform.scale.set(width, height, depth);
    instance(geometry, lit ? neon : metal, color);
  }

  function beam(start, end, diameter, color = steel, lit = false) {
    axis.set(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
    const length = axis.length();
    transform.position.set((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2);
    transform.quaternion.setFromUnitVectors(up, axis.normalize());
    transform.scale.set(diameter, length, diameter);
    instance(rail, lit ? neon : metal, color);
  }

  function panel(a, b, c, color) {
    skinVertices.push(...a, ...b, ...c);
    const tint = new THREE.Color(color);
    for (let i = 0; i < 3; i++) skinColors.push(tint.r, tint.g, tint.b);
  }

  // Each stage runs its own video loop. The LED mask fades out when individual diodes
  // become smaller than a screen pixel, so the overview stays legible as well.
  const videoLoops = {
    levels: `
      float column = floor(coord.x * max(8., size.x * 3.5));
      float wave = .52 + .21 * sin(column * .62 + t * 1.9 + phase)
                        + .14 * sin(column * .19 - t * 2.2 + phase);
      float height = floor(wave * 15.) / 15.;
      float fill = 1. - smoothstep(height - .015, height + .015, coord.y);
      float peak = 1. - smoothstep(.008, .037, abs(coord.y - height - .072));
      color += mix(primaryTint, accent, coord.y) * (fill * .77 + peak * .90);`,
    corner: `
      vec2 p = coord * 2. - 1.;
      float rise = p.y - .51 * abs(p.x);
      float band = abs(fract(rise * 1.75 - t * .30 + phase) - .5);
      float trim = max(.015, fwidth(rise) * 1.75);
      float arrows = 1. - smoothstep(.16 - trim, .16 + trim, band);
      float core = 1. - smoothstep(.025, .085 + trim, band);
      color += primaryTint * (.12 + .67 * arrows) + accent * .72 * core;`,
    highway: `
      float horizon = 1. - coord.y;
      float center = .50 + .12 * sin(.55 * t + phase + coord.y * 2.4);
      float lateral = abs(coord.x - center);
      float width = .06 + .48 * horizon * horizon;
      float aa = max(.012, fwidth(lateral) * .8);
      float shoulder = 1. - smoothstep(.009, .018 + aa, abs(lateral - width));
      float road = 1. - smoothstep(width, width + aa, lateral);
      float marker = 1. - smoothstep(.005, .010 + aa, lateral);
      float stripes = .5 + .5 * sin(12. / (.50 + horizon) + t * 3.2);
      color += primaryTint * (.14 * road + .80 * shoulder)
             + accent * marker * smoothstep(.22, .66, stripes);`,
  };

  function screen(x, y, z, width, height, tint, secondary, phase, angle = 0, loop = 'levels') {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        t: displayClock, phase: { value: phase }, primaryTint: { value: new THREE.Color(tint) },
        accent: { value: new THREE.Color(secondary) }, size: { value: new THREE.Vector2(width, height) },
      },
      vertexShader: `
        varying vec2 coord;
        void main() {
          coord = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float t, phase;
        uniform vec2 size;
        uniform vec3 primaryTint, accent;
        varying vec2 coord;
        void main() {
          vec3 color = primaryTint * .032;
          ${videoLoops[loop]}
          vec2 uvPx = coord * size * 6.;
          vec2 grid = abs(fract(uvPx) - .5);
          float pixel = 1. - smoothstep(.34, .50, max(grid.x, grid.y));
          float detail = 1. - smoothstep(.16, .72, max(fwidth(uvPx.x), fwidth(uvPx.y)));
          gl_FragColor = vec4(color * mix(1., .45 + .55 * pixel, detail), 1.);
          #include <colorspace_fragment>
        }
      `,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(plate, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, 1);
    mesh.rotation.y = angle;
    group.add(mesh);
    return mesh;
  }

  function flightCase(x, z, width, height, yaw = 0) {
    const y = .84 + height / 2;
    shape(box, '#313945', x, y, z, width, height, .86, 0, yaw);
    for (const side of [-1, 1]) {
      shape(box, silver, x, y + side * (height / 2 - .055), z, width + .045, .075, .89, 0, yaw);
      const end = side * (width / 2 - .055);
      shape(box, steel, x + Math.cos(yaw) * end, y, z - Math.sin(yaw) * end, .085, height, .88, 0, yaw);
    }
    shape(box, '#111923', x + Math.sin(yaw) * .445, y, z + Math.cos(yaw) * .445, .35, .11, .055, 0, yaw);
  }

  function bassCabinet(x, z, width) {
    shape(box, '#191d25', x, 1.53, z, width, 1.35, 1.1);
    for (const dx of [-.22, .22]) {
      shape(drum, '#444f5a', x + dx * width, 1.48, z + .555, .67, .07, .67, Math.PI / 2);
      shape(drum, '#242c36', x + dx * width, 1.48, z + .6, .49, .04, .49, Math.PI / 2);
    }
  }

  function drumKit(x, z) {
    function shell(dx, y, dz, diameter, depth, color, pitch = 0) {
      shape(drum, color, x + dx, y, z + dz, diameter, depth, diameter, pitch);
      for (const s of [-1, 1]) {
        const edge = s * depth * .5;
        shape(drum, silver, x + dx, y + Math.cos(pitch) * edge, z + dz + Math.sin(pitch) * edge, diameter + .07, .052, diameter + .07, pitch);
      }
    }
    shell(0, 1.53, 0, 1.27, .94, '#487e7b', Math.PI / 2);
    shape(drum, '#242834', x, 1.53, z + .51, 1.09, .045, 1.09, Math.PI / 2);
    shell(-.40, 2.23, -.11, .64, .49, '#397d82', .20);
    shell(.36, 2.20, -.14, .74, .51, '#397d82', .21);
    shell(.98, 1.55, -.38, .90, .67, '#41636d');
    shell(-.91, 1.69, -.4, .66, .24, '#626777');
    for (const [dx, dz, y, d, tilt] of [[-1.25, -.54, 2.86, .89, -.18], [.99, -.92, 2.91, 1.07, .14], [-1.24, .24, 2.24, .64, -.10]]) {
      beam([x + dx, .84, z + dz], [x + dx, y, z + dz], .052, silver);
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3;
        beam([x + dx, 1.16, z + dz], [x + dx + Math.sin(a) * .31, .85, z + dz + Math.cos(a) * .31], .035, silver);
      }
      shape(sphere, '#e7bb6d', x + dx, y, z + dz, d, .078, d, 0, 0, tilt);
      shape(sphere, '#b5914f', x + dx, y + .045, z + dz, d * .22, .10, d * .22);
    }
  }

  function mainStage(v) {
    const { x, z } = v;
    for (const s of [-1, 1]) {
      const toe = [x + s * 10.86, 8.04, z + 4.85];
      const ridge = [x + s * 8.08, 10.65, z - .82];
      const tip = [x + s * 12.32, 11.66, z - 4.83];
      const heel = [x + s * 6.05, 8.16, z - 5.16];
      const outside = [x + s * 12.50, 7.94, z + 2.92];
      panel(toe, ridge, tip, '#326c70');
      panel(toe, tip, outside, '#23454d');
      panel(toe, heel, ridge, '#274f58');
      panel(heel, tip, ridge, '#447875');
      beam(heel, tip, .15, '#91b2aa');
      beam(toe, ridge, .13, '#91ffcc', true);
      beam(ridge, tip, .13, '#c4ffb5', true);
      beam(tip, outside, .15, '#7ba8ac');
      beam(outside, toe, .15, steel);
      beam([x + s * 10.8, 8.05, z - 4.1], tip, .20, steel);
      // Curved arrays hang beneath each canopy wing.
      for (let i = 0; i < 5; i++) {
        const yy = 7.09 - i * .58;
        const zz = z + 1.83 + i * i * .034;
        shape(box, '#182330', x + s * 9.55, yy, zz, 1.29, .53, .73, -.05 * i);
        shape(box, '#57626a', x + s * 9.55, yy + .08, zz + .38, .98, .065, .04, -.05 * i);
      }
      beam([x + s * 9.55, 7.32, z + 1.84], ridge, .082, silver);
      flightCase(x + s * 6.78, z - 1.31, 1.05, .89, s * .20);
      // Shell-shaped acoustic reflectors fan out above the backline. A deep return
      // on each panel lets the lit face and the shadowed edge read from overhead.
      for (let i = 0; i < 3; i++) {
        const foot = [x + s * (1.06 + i * 1.39), 8.12, z - 3.88];
        const lip = [x + s * (2.09 + i * 1.65), 10.01 + i * .47, z - 4.91];
        const tip = [x + s * (3.01 + i * 1.66), 10.22 + i * .51, z - 5.19];
        const fold = [tip[0], tip[1] - .25, tip[2] - .32];
        panel(foot, lip, tip, ['#4a9895', '#61a69c', '#87ba9d'][i]);
        panel(foot, tip, fold, '#31535b');
        beam(foot, lip, .10, '#a6edc1', true);
        beam(lip, tip, .12, silver);
      }
      // The original cabinets form the bezel for these side fills.
      screen(x + s * 8.1, 4.75, z - 3.86, 3.02, 4.20, '#5ed7c9', '#e5ffad', 1.2 * s);
    }
    const consoleZ = z - .40;
    shape(box, '#202b35', x + 2, 1.52, consoleZ, 4.02, 1.32, 1.35);
    shape(box, '#a8c1bd', x + 2, 2.23, consoleZ, 4.18, .095, 1.46);
    screen(x + 2, 1.54, consoleZ + .685, 3.80, 1.07, '#61debe', '#e1ffa5', .1);
    for (const dx of [-1.11, 1.11]) {
      shape(drum, '#1a222b', x + 2 + dx, 2.32, consoleZ, .95, .08, .95);
      shape(drum, '#758f91', x + 2 + dx, 2.37, consoleZ, .33, .05, .33);
    }
    for (let i = 0; i < 4; i++) shape(box, '#d2ecad', x + 1.79 + i * .15, 2.32, consoleZ, .043, .06, .57, 0, 0, 0, true);
    drumKit(x - 3.2, z - 1.6);
    bassCabinet(x - 5.84, z - 1.64, 1.54);
    bassCabinet(x + 5.6, z - 2.1, 1.54);
  }

  function ringCanvas(x, z) {
    const canvas = Object.assign(document.createElement('canvas'), { width: 768, height: 400 });
    const ctx = canvas.getContext('2d');
    const wash = ctx.createLinearGradient(0, 0, 768, 400);
    wash.addColorStop(0, '#642d3d');
    wash.addColorStop(.55, '#b8585c');
    wash.addColorStop(1, '#482d43');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 768, 400);
    ctx.strokeStyle = '#f3bb97';
    ctx.lineWidth = 4;
    ctx.strokeRect(17, 17, 734, 366);
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, 718, 350);
    ctx.translate(384, 200);
    ctx.scale(1, 1.12);
    for (const size of [90, 112]) {
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) {
        const angle = j * Math.PI / 4 + Math.PI / 8;
        const px = Math.cos(angle) * size, py = Math.sin(angle) * size;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineWidth = size === 90 ? 5 : 2;
      ctx.stroke();
    }
    ctx.fillStyle = '#fce2bd';
    ctx.beginPath();
    ctx.moveTo(10, -63); ctx.lineTo(-45, 9); ctx.lineTo(-6, 7);
    ctx.lineTo(-19, 60); ctx.lineTo(47, -20); ctx.lineTo(7, -13);
    ctx.closePath(); ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const mesh = new THREE.Mesh(plate, new THREE.MeshStandardMaterial({ map: texture, roughness: .93 }));
    mesh.position.set(x, 1.067, z + 2.20);
    mesh.scale.set(9.12, 3.92, 1);
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);
  }

  function fightingArena(v) {
    const { x, z } = v;
    ringCanvas(x, z);
    for (const s of [-1, 1]) {
      const railX = x + s * 7.24;
      const apex = [x + s * 8.9, 8.85, z - 4.32];
      const rear = [x + s * 6.18, 6.61, z - 5.79];
      const front = [x + s * 6.67, 6.74, z + 4.17];
      const edge = [x + s * 9.27, 6.89, z + 4.92];
      panel(apex, front, edge, '#8b464b');
      panel(apex, rear, front, '#4f3440');
      beam(apex, front, .14, '#ffa48b', true);
      beam(apex, edge, .19, steel);
      beam(apex, rear, .20, silver);
      for (const zz of [.24, 4.18]) {
        shape(box, '#202936', x + s * 4.6, 1.65, z + zz, .37, 1.36, .4);
        for (let level = 0; level < 3; level++) shape(box, s < 0 ? '#ed7464' : '#f5bc96', x + s * 4.6, 1.28 + level * .33, z + zz, .49, .23, .47);
      }
      for (const depth of [.24, 4.18]) {
        for (let level = 0; level < 3; level++) {
          const yy = 1.28 + level * .33;
          beam([x + s * 4.5, yy, z + depth], [x, yy - .065, z + depth], .047, level === 1 ? '#f5e8d7' : '#dd7b72');
        }
      }
      for (let i = 0; i < 3; i++) {
        const yy = 4.09 + i * .39;
        shape(box, '#30323a', railX, yy, z - 1.35 - i * 1.05, 2.4, .27, 1.21);
        shape(box, '#d99373', railX, yy + .12, z - .71 - i * 1.05, 2.42, .09, .095);
      }
      screen(x + s * 6.91, 4.59, z - 3.85, 1.71, 2.71, '#e36a50', '#ffcd7c', .2, -s * .13, 'corner');
      // Each ringside lighting gantry carries three warm barn-door floodlights.
      const trussX = x + s * 7.7;
      beam([trussX, 6.93, z - 3.73], [trussX, 6.93, z + 2.85], .20, dark);
      for (const depth of [-2.65, -.47, 1.71]) {
        const lampZ = z + depth;
        shape(box, '#343440', trussX, 6.52, lampZ, .88, .67, .83, -.14, 0, -s * .24);
        shape(box, '#ffcb94', trussX - s * .10, 6.48, lampZ + .43, .64, .46, .06, -.14, 0, -s * .24, true);
        shape(box, '#423843', trussX, 6.84, lampZ + .48, 1.06, .10, .45, -.21, 0, -s * .24);
        shape(box, '#5e4a4a', trussX, 6.21, lampZ + .44, .99, .09, .32, .18, 0, -s * .24);
      }
    }
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI * (i + .5) / 4;
      const next = angle + Math.PI / 4;
      const a = [x + Math.cos(angle) * 5.0, 7.48, z - 1.53 + Math.sin(angle) * 2.72];
      const b = [x + Math.cos(next) * 5.0, 7.48, z - 1.53 + Math.sin(next) * 2.72];
      beam(a, b, .22, '#816369');
      beam([a[0], a[1] - .14, a[2]], [b[0], b[1] - .14, b[2]], .080, i % 2 ? '#ff977e' : '#ffe4b9', true);
      shape(tube, dark, a[0], 7.15, a[2], .46, .42, .46, .22);
      shape(tube, '#ffe2af', a[0], 6.96, a[2] + .05, .34, .07, .34, .22, 0, 0, true);
      if (i % 2 === 0) beam(a, [x + Math.sign(a[0] - x) * 8.85, 8.65, z - 4.32], .047, steel);
    }
  }

  function synthClub(v) {
    const { x, z } = v;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const foot = [x + s * (5.65 + .75 * i), 3.77, z + 2.9 - i * .41];
        const back = [x + s * (6.33 + .68 * i), 2.84, z - 4.89 + i * .24];
        const tip = [x + s * (7.05 + i * 1.24), 7.24 + i * .76, z - 3.59 + i * .24];
        const ridge = [x + s * (6.49 + i * .91), 5.91 + i * .50, z - 1.78];
        panel(foot, tip, ridge, i % 2 ? '#6d5995' : '#565082');
        panel(back, ridge, tip, i % 2 ? '#413b6f' : '#716299');
        beam(foot, tip, .11, i % 2 ? '#e9b6ff' : '#aaafff', true);
        beam(tip, back, .145, '#9285ac');
      }
      for (let i = 0; i < 5; i++) {
        const zz = z + 4.15 - i * 1.55;
        shape(box, '#d6a9ff', x + s * 4.92, .858, zz, .115, .025, .70, 0, 0, 0, true);
      }
      screen(x + s * 5.94, 4.36, z - 2.58, 1.22, 3.84, '#a79bff', '#ffc5ed', .16 * s, -s * .28, 'highway');
    }
    const runway = screen(x, .873, z + 1.29, 6.79, 5.44, '#856ee0', '#9ed9fa', 0, 0, 'highway');
    runway.rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) {
      shape(box, '#4b4e70', x + s * 3.48, .875, z + 1.29, .14, .08, 5.58);
    }
    const orbit = new THREE.Group();
    orbit.position.set(x, 8.35, z - 2.52);
    orbit.rotation.z = -.15;
    const ringMaterial = new THREE.MeshBasicMaterial({ color: '#b9a8ff', toneMapped: false });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.08, .082, 6, 64), ringMaterial);
    rim.rotation.x = Math.PI / 2;
    orbit.add(rim);
    const fin = new THREE.BoxGeometry(.15, .23, .56);
    const markers = new THREE.InstancedMesh(fin, neon, 28);
    for (let i = 0; i < markers.count; i++) {
      const a = i * Math.PI * 2 / markers.count;
      transform.position.set(Math.sin(a) * 3.08, .13, Math.cos(a) * 3.08);
      transform.rotation.set(0, a, 0);
      transform.scale.set(1, 1, i % 7 === 0 ? 1.7 : 1);
      transform.updateMatrix();
      markers.setMatrixAt(i, transform.matrix);
      markers.setColorAt(i, new THREE.Color(i % 7 === 0 ? '#fff3e7' : '#a584e0'));
    }
    orbit.add(markers);
    group.add(orbit);
    movingParts.push(orbit);
    for (const side of [-1, 1]) {
      beam([x + side * 2.75, 8.48, z - 2.52], [x + side * 9.55, 8.8, z - 3.1], .065, silver);
    }
  }

  for (const venue of venues) {
    if (venue.id === 'crowd') mainStage(venue);
    if (venue.id === 'fighters') fightingArena(venue);
    if (venue.id === 'rave') synthClub(venue);
  }
  if (skinVertices.length) {
    const skin = new THREE.BufferGeometry();
    skin.setAttribute('position', new THREE.Float32BufferAttribute(skinVertices, 3));
    skin.setAttribute('color', new THREE.Float32BufferAttribute(skinColors, 3));
    skin.computeVertexNormals();
    const mesh = new THREE.Mesh(skin, new THREE.MeshStandardMaterial({
      vertexColors: true, side: THREE.DoubleSide, metalness: .26, roughness: .62,
    }));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const [geometry, materials] of batches) {
    for (const [material, instances] of materials) {
      const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
      instances.forEach(({ matrix, color }, index) => {
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, color);
      });
      mesh.castShadow = mesh.receiveShadow = material === metal;
      group.add(mesh);
    }
  }
  return function animateStageArt(time) {
    if (reduceMotion) return;
    displayClock.value = time;
    for (const orbit of movingParts) orbit.rotation.y = time * .24;
  };
}
