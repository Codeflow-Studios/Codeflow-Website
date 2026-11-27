import { benches, grounds, lanterns, paths, sideStands, trees, venues } from './layout.js';
import { drawMarquee } from './stage-murals.js';
import { createFlatArtistSprites } from './characters.js';
import { makeFestivalSurfaceCanvas } from './terrain.js';

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
  const covers = venues.map(venue => drawMarquee(venue.id));
  const artists = createFlatArtistSprites();
  function surface(kind, metres) {
    const tile = makeFestivalSurfaceCanvas(kind);
    const pattern = ctx.createPattern(tile,'repeat');
    pattern.setTransform(new DOMMatrix().scale(metres/tile.width));
    return pattern;
  }
  const grass = surface('grass',9), gravel = surface('earth',7.5), deck = surface('deck',5);
  canvas.style.imageRendering = 'auto';

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    ratio = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(900_000 / (width * height)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.imageSmoothingEnabled = false;
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
    ctx.fillStyle = '#25253c';
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2 - centerX * scale, height / 2 - centerZ * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = grass;
    ctx.strokeStyle = '#73816b';
    ctx.lineWidth = .27;
    ctx.beginPath();
    ctx.roundRect(grounds.minX, grounds.minZ, grounds.maxX - grounds.minX, grounds.maxZ - grounds.minZ, 1);
    ctx.fill();
    ctx.stroke();
    for (const path of paths) {
      ctx.fillStyle = gravel;
      ctx.beginPath();
      ctx.roundRect(path.x-path.width/2,path.z-path.depth/2,path.width,path.depth,Math.min(1.3,path.width/4,path.depth/4));
      ctx.fill();
    }
    for (const [x, z, size] of trees) {
      disc(x + .4, z + .43, size * .38, '#223231');
      rectangle(x, z + .5, .65, size * .74, '#523f4a');
      for (let tier = 0; tier < 3; tier++) {
        const span = size * (.78 - tier * .17);
        const top = z - tier * .74;
        rectangle(x, top, span, 1.2, '#294b50');
        rectangle(x - .15, top - .48, span * .70, 1, '#477467');
        rectangle(x - .32, top - .85, span * .39, .65, '#699378');
      }
    }
    for (const [x, z] of benches) rectangle(x, z, 3.4, 1.5, '#9b7668');
    for (const [x, z] of lanterns) {
      disc(x, z, 2.0, '#b29b5f37');
      disc(x, z, .4, '#f9d69f');
    }
    for (const stand of sideStands) {
      rectangle(stand.x, stand.z, stand.width, stand.depth, '#3b3449');
      for (let i = 0; i < 7; i++) {
        rectangle(stand.x - stand.width / 2 + (i + .5) * stand.width / 7, stand.z - .45,
          stand.width / 7, stand.depth - .72, i % 2 ? '#efe1bd' : stand.color);
      }
    }

    for (const [i, zone] of venues.entries()) {
      rectangle(zone.x, zone.z, zone.width, zone.depth, zone.color);
      rectangle(zone.x, zone.z, zone.width - .55, zone.depth - .55, deck);
      const image = covers[i];
      ctx.drawImage(image, zone.x - zone.width * .41, zone.z - zone.depth * .36, zone.width * .82, zone.depth * .67);
      rectangle(zone.doorX, zone.doorZ, 4.2, .24, zone.color);
    }
    const gate = nearby || marked;
    if (gate) {
      disc(gate.doorX, gate.doorZ, 1.55, gate.color);
      disc(gate.doorX, gate.doorZ, 1.34, '#645a56');
    }

    ctx.save();
    ctx.translate(player.x, player.z);
    const sprite = artists[player.artist];
    if (sprite) {
      rectangle(0, .4, 2.35, .78, '#293c48');
      const size = 4.8;
      const width = size * sprite.width / sprite.height;
      ctx.drawImage(sprite, -width / 2, .68 - size, width, size);
    }
    ctx.restore();
  }

  resize();
  return { resize, frame, project };
}
