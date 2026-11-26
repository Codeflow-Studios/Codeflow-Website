// Three silkscreen prints share one cloth mesh and a mipmapped texture.
function pennantAtlas(THREE) {
  const canvas = Object.assign(document.createElement('canvas'), { width: 512, height: 512 });
  const ctx = canvas.getContext('2d');

  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fill();
  }

  const prints = [
    ['#17464a', '#83dfba', '#f1f4ba'],
    ['#572b3b', '#e87569', '#ffdeb1'],
    ['#343050', '#ad9cff', '#ffcbeb'],
  ];

  prints.forEach(([ground, ink, highlight], row) => {
    ctx.save();
    ctx.translate(0, row * 128);
    ctx.beginPath();
    ctx.rect(0, 0, 512, 128);
    ctx.clip();
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, 512, 128);
    if (row === 0) {
      for (let i = -1; i <= 3; i++) {
        const x = i * 154;
        ctx.fillStyle = i % 2 ? ink : highlight;
        ctx.beginPath();
        ctx.moveTo(x, 94);
        ctx.bezierCurveTo(x + 42, 92, x + 62, 14, x + 126, 30);
        ctx.bezierCurveTo(x + 92, 32, x + 84, 75, x + 135, 64);
        ctx.bezierCurveTo(x + 112, 99, x + 79, 96, x + 64, 77);
        ctx.bezierCurveTo(x + 48, 87, x + 30, 98, x, 94);
        ctx.fill();
      }
    } else if (row === 1) {
      for (const x of [30, 133, 236, 339, 442]) {
        polygon([[x, 25], [x + 37, 25], [x + 71, 64], [x + 37, 103], [x, 103], [x + 32, 64]], ink);
        polygon([[x + 39, 25], [x + 52, 25], [x + 86, 64], [x + 52, 103], [x + 39, 103], [x + 73, 64]], highlight);
      }
    } else {
      for (const x of [-44, 112, 268, 424]) {
        polygon([[x, 96], [x + 112, 28], [x + 178, 28], [x + 66, 96]], ink);
        polygon([[x + 67, 96], [x + 178, 29], [x + 180, 43], [x + 92, 96]], highlight);
      }
      ctx.fillStyle = ground;
      ctx.fillRect(0, 56, 512, 6);
    }
    // The contrasting bound edges remain visible even when the flag folds over.
    ctx.fillStyle = ink;
    ctx.fillRect(0, 4, 512, 6);
    ctx.fillRect(0, 118, 512, 6);
    ctx.fillStyle = highlight;
    ctx.fillRect(6, 12, 5, 104);
    ctx.restore();
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function createFestivalAtmosphere(THREE, scene, venues, reduceMotion) {
  const vertices = [], texCoords = [], shades = [], faces = [], anchors = [];
  const masts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(.05, .079, 2.95, 8),
    new THREE.MeshStandardMaterial({ color: '#aab0b5', metalness: .48, roughness: .45 }),
    venues.length * 2,
  );
  const mount = new THREE.Matrix4();
  const atlasRows = { crowd: 0, fighters: 1, rave: 2 };
  let mastCount = 0;
  for (const venue of venues) {
    const { x, z, id } = venue;
    const row = atlasRows[id] ?? 0;
    for (const side of [-1, 1]) {
      const mastX = x + side * (id === 'crowd' ? 10.7 : 8.82);
      const top = id === 'crowd' ? 10.95 : 8.65;
      const mastZ = z + 4;
      masts.setMatrixAt(mastCount++, mount.makeTranslation(mastX, top - 1.40, mastZ));
      const start = vertices.length / 3;
      for (let j = 0; j <= 3; j++) {
        const down = j / 3;
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          const baseY = top - down * (1.52 - .15 * u) - u * .13;
          vertices.push(mastX + side * (.06 + u * 3.73), baseY, mastZ);
          texCoords.push(.002 + .996 * u, 1 - (row * 128 + 2 + down * 124) / 512);
          shades.push(1, 1, 1);
          anchors.push({ u, down, baseY, mastZ, phase: row * 1.9 + side });
          if (i && j) {
            const end = start + j * 9 + i;
            faces.push(end - 10, end - 1, end, end - 10, end, end - 9);
          }
        }
      }
    }
  }
  const cloth = new THREE.BufferGeometry();
  const positions = new THREE.Float32BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage);
  const colors = new THREE.Float32BufferAttribute(shades, 3).setUsage(THREE.DynamicDrawUsage);
  cloth.setAttribute('position', positions);
  cloth.setAttribute('color', colors);
  cloth.setAttribute('uv', new THREE.Float32BufferAttribute(texCoords, 2));
  cloth.setIndex(faces);
  const flags = new THREE.Mesh(cloth, new THREE.MeshBasicMaterial({
    map: pennantAtlas(THREE), vertexColors: true, side: THREE.DoubleSide,
  }));
  flags.name = 'Festival podiumvlaggen';
  scene.add(masts, flags);

  function blow(time) {
    for (let i = 0; i < anchors.length; i++) {
      const { u, down, baseY, mastZ, phase } = anchors[i];
      const roll = u * 6.8 + down * .35 - time * 2.3 + phase;
      const ripple = Math.sin(roll);
      positions.setY(i, baseY + u * (.14 * ripple + .085 * Math.sin(u * 4.7 - time + phase)));
      positions.setZ(i, mastZ + u * (.60 * ripple + .14 * Math.sin(roll * 1.8)));
      const shade = .87 + .13 * Math.cos(roll) - down * .05;
      colors.setXYZ(i, shade, shade, shade);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }
  blow(.86);
  return reduceMotion ? () => {} : blow;
}
