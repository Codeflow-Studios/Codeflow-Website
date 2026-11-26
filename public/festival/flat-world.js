import { benches, grounds, lanterns, paths, sideStands, trees, venues } from './layout.js';

export function createFlatWorld(container) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);
  let width = 1;
  let height = 1;
  let scale = 1;
  let centerX = 0;
  let centerZ = 0;
  let ratio = 1;
  const covers = venues.map(venue => Object.assign(new Image(), { src: venue.cover }));

  function resize() {
    width = container.clientWidth;
    height = container.clientHeight;
    ratio = Math.min(devicePixelRatio, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    scale = height / (width < height ? 77 : 108);
  }

  function project(x, _y, z) {
    return { x: width / 2 + (x - centerX) * scale, y: height / 2 + (z - centerZ) * scale };
  }

  function rectangle(x, z, w, d, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, z - d / 2, w, d);
  }

  function disc(x, z, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, z, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(player, _elapsed, _time, marked, nearby) {
    const compact = width < height;
    centerX = player.x * (compact ? .92 : .29);
    centerZ = compact ? player.z - 7 : player.z * .19 - 2;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#152329';
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2 - centerX * scale, height / 2 - centerZ * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#283c3c';
    ctx.strokeStyle = '#536660';
    ctx.lineWidth = .27;
    ctx.beginPath();
    ctx.roundRect(grounds.minX, grounds.minZ, grounds.maxX - grounds.minX, grounds.maxZ - grounds.minZ, 1);
    ctx.fill();
    ctx.stroke();
    for (const path of paths) rectangle(path.x, path.z, path.width, path.depth, '#635852');
    for (const [x, z, size] of trees) {
      disc(x + .4, z + .43, size * .38, '#223231');
      disc(x, z, size * .33, '#447164');
    }
    for (const [x, z] of benches) rectangle(x, z, 3.4, 1.5, '#9b7668');
    for (const [x, z] of lanterns) {
      disc(x, z, 2.0, '#b29b5f37');
      disc(x, z, .4, '#f9d69f');
    }
    for (const stand of sideStands) rectangle(stand.x, stand.z, stand.width, stand.depth, stand.color);

    for (const [i, zone] of venues.entries()) {
      rectangle(zone.x, zone.z, zone.width, zone.depth, zone.color);
      rectangle(zone.x, zone.z, zone.width - .55, zone.depth - .55, '#262936');
      const image = covers[i];
      if (image.complete && image.naturalWidth) ctx.drawImage(image, zone.x - 6.5, zone.z - 3.0, 13, 6);
      rectangle(zone.doorX, zone.doorZ, 4.2, .24, zone.color);
    }
    const gate = nearby || marked;
    if (gate) {
      disc(gate.doorX, gate.doorZ, 1.55, gate.color);
      disc(gate.doorX, gate.doorZ, 1.34, '#645a56');
    }

    ctx.save();
    ctx.translate(player.x, player.z);
    ctx.rotate(-player.heading);
    disc(0, 0, 1.43, '#182529');
    ctx.beginPath();
    ctx.moveTo(0, 1.02);
    ctx.lineTo(-.71, -.69);
    ctx.lineTo(.71, -.69);
    ctx.closePath();
    ctx.fillStyle = '#dcfa82';
    ctx.fill();
    ctx.restore();
  }

  resize();
  return { resize, frame, project };
}
