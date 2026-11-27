import { benches, grounds, lanterns, paths, sideStands, trees, venues } from './layout.js';
import { drawMarquee } from './stage-murals.js';
import { markerGrip, markerTip, paintDots, paintFlashTime, paintTrailStart } from './paintball.js';
import { createFlatArtistSprites, createFlatWalkerSprites } from './characters.js';
import { makeFestivalSurfaceCanvas } from './terrain.js';
import { festivalLights, puddles } from './ground-light.js';

const { dark, purple, pink, yellow } = festivalLights;

export function createFlatWorld(container, paintball) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
  const walkers = createFlatWalkerSprites(paintball.walkers);
  function surface(kind, metres, shade) {
    const tile = makeFestivalSurfaceCanvas(kind);
    const tileContext = tile.getContext('2d');
    tileContext.fillStyle = shade;
    tileContext.fillRect(0, 0, tile.width, tile.height);
    const pattern = ctx.createPattern(tile,'repeat');
    pattern.setTransform(new DOMMatrix().scale(metres/tile.width));
    return pattern;
  }
  const grass = surface('grass', 9, `${dark}99`);
  const gravel = surface('earth', 7.5, `${purple}73`);
  const deck = surface('deck', 5, `${dark}80`);
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

  function projectPaint(x, y, z) {
    return project(x, 0, z - y * 1.3);
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

  function lightPool(x,z,r,color,strength) {
    const glow = ctx.createRadialGradient(x,z,0,x,z,r);
    glow.addColorStop(0,color);
    glow.addColorStop(1,'#0000');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = strength;
    disc(x,z,r,glow);
    ctx.restore();
  }

  function frame(player, _elapsed, time, marked, nearby) {
    const compact = width < height;
    centerX = player.x * (compact ? .92 : .29);
    centerZ = compact ? player.z - 7 : player.z * .19 - 2;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2 - centerX * scale, height / 2 - centerZ * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = grass;
    ctx.strokeStyle = purple;
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
    for (const pool of puddles) {
      ctx.save();
      ctx.translate(pool.x,pool.z);
      ctx.rotate(-pool.angle);
      ctx.scale(pool.width*.5,pool.depth*.5);
      const sheen = ctx.createLinearGradient(-1,0,1,0);
      sheen.addColorStop(0,purple);
      sheen.addColorStop(.48,pool.tint);
      sheen.addColorStop(1,dark);
      ctx.globalAlpha = .40;
      disc(0,0,1,sheen);
      ctx.restore();
    }
    for (const zone of venues) lightPool(zone.doorX,zone.doorZ,9,pink,.32);
    for (const [x,z] of lanterns) lightPool(x,z,6,yellow,.28);
    for (const [x, z, size] of trees) {
      disc(x + .4, z + .43, size * .38, '#223231');
      rectangle(x, z + .5, .65, size * .74, '#523f4a');
      for (let tier = 0; tier < 3; tier++) {
        const span = size * (.78 - tier * .17);
        const top = z - tier * .74;
        rectangle(x, top, span, 1.2, '#233244');
        rectangle(x - .15, top - .48, span * .70, 1, '#30475a');
        rectangle(x - .32, top - .85, span * .39, .65, '#486377');
      }
    }
    for (const [x, z] of benches) rectangle(x, z, 3.4, 1.5, '#9b7668');
    for (const [x, z] of lanterns) {
      disc(x, z, 2.0, `${yellow}29`);
      disc(x, z, .4, yellow);
    }
    for (const stand of sideStands) {
      rectangle(stand.x, stand.z, stand.width, stand.depth, '#3b3449');
      for (let i = 0; i < 7; i++) {
        rectangle(stand.x - stand.width / 2 + (i + .5) * stand.width / 7, stand.z - .45,
          stand.width / 7, stand.depth - .72, i % 2 ? '#efe1bd' : stand.color);
      }
    }

    for (const [i, zone] of venues.entries()) {
      rectangle(zone.x+.5,zone.z+.7,zone.width+.4,zone.depth+.55,'#17162ca8');
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

    for (const capsule of paintball.capsules) {
      const fade = Math.min(1, (6 - capsule.age) * 2);
      ctx.save();
      ctx.translate(capsule.x, capsule.z - capsule.y * 1.3);
      ctx.rotate(capsule.rotation);
      rectangle(-.15 * fade, -.07 * fade, .30 * fade, .14 * fade, capsule.color);
      ctx.restore();
    }
    const actors = [...paintball.walkers, player].sort((a, b) => a.z - b.z);
    for (const actor of actors) {
      if (actor === player) drawPlayer(player, time);
      else drawWalker(actor, time);
    }
    const trail = {};
    for (const ball of paintball.balls) {
      paintTrailStart(ball, trail);
      ctx.strokeStyle = '#fa2d82';
      ctx.lineWidth = reduceMotion.matches ? .095 : .17;
      ctx.beginPath();
      ctx.moveTo(trail.x, trail.z - trail.y * 1.3);
      ctx.lineTo(ball.x, ball.z - ball.y * 1.3);
      ctx.stroke();
      disc(ball.x, ball.z - ball.y * 1.3, .19, ball.color);
    }
    for (const flash of paintball.flashes) {
      const radius = (1 - flash.age / paintFlashTime) * (reduceMotion.matches ? .16 : .34);
      disc(flash.x, flash.z - flash.y * 1.3, radius, flash.color);
    }
    for (const burst of paintball.bursts) {
      const progress = burst.age / .38;
      const spread = burst.surface * (reduceMotion.matches ? 2 : 1 + progress * 4);
      for (const [x, y, size] of paintDots) {
        disc(burst.x + x * spread, burst.z - burst.y * 1.3 + y * spread,
          size * (1 - progress * .85), burst.color);
      }
    }
  }

  function drawWalker(walker, time) {
    const { sprites, width: w, height: h } = walkers;
    const direction = (Math.round(walker.heading / (Math.PI / 2)) + 4) & 3;
    const walking = !reduceMotion.matches && walker.walking;
    const pose = walking ? Math.floor(time * walker.pace * 4 + walker.phase) % 4 : 4;
    const size = walker.size * 1.7;
    const width = size * w / h;
    rectangle(walker.x, walker.z + .18, .98, .40, '#22283b');
    ctx.drawImage(sprites.get(walker.outfit), pose * w, direction * h, w, h,
      walker.x - width / 2, walker.z + .30 - size, width, size);
    rectangle(walker.x + .48, walker.z - size * .47, .22, .12, '#b4ff95');
    if (walker.paintTime > 0) {
      const fade = Math.min(1, walker.paintTime);
      for (const [x, y, radius] of paintDots) {
        disc(walker.x + x * 1.7, walker.z - size * .51 + y * 1.7, radius * 1.6 * fade, walker.color);
      }
    }
  }

  function drawPlayer(player, time) {
    ctx.save();
    ctx.translate(player.x, player.z);
    const sprite = artists[player.artist];
    if (sprite) {
      const height = player.jumpHeight || 0;
      const shadow = 1 - height * .15;
      rectangle(0, .4, 2.35*shadow, .78*shadow, '#293c48');
      const size = 4.8;
      const width = size * sprite.width / sprite.height;
      const side = (player.strafe || 0) * Math.min(1,player.speed/6);
      const sway = reduceMotion.matches ? 0 : side*Math.sin(time*12)*.12;
      ctx.translate(sway,0);
      ctx.drawImage(sprite, -width / 2, .68 - size - height*1.45, width, size);
      ctx.save();
      const dx = Math.sin(player.heading), dz = Math.cos(player.heading);
      const elevation = player.paintElevation || 0;
      const kick = reduceMotion.matches ? 0 : player.markerKick * .19;
      const gripZ = markerGrip.z - kick;
      const barrelZ = markerTip.z * Math.cos(elevation) - markerTip.y * Math.sin(elevation);
      const barrelY = markerTip.y * Math.cos(elevation) + markerTip.z * Math.sin(elevation);
      ctx.translate(markerGrip.x * dz + gripZ * dx,
        -markerGrip.x * dx + gripZ * dz - (markerGrip.y + height) * 1.3);
      const endX = dx * barrelZ, endY = dz * barrelZ - barrelY * 1.3;
      const length = Math.max(.12, Math.hypot(endX,endY));
      ctx.rotate(Math.atan2(endY,endX));
      rectangle(-.29, -.17, .68, .34, '#fa2d82');
      rectangle(-.12, -.26, .40, .41, '#9b5f99');
      rectangle(.27, -.072, Math.max(.08,length-.24), .144, '#b082a6');
      rectangle(length-.09, -.094, .18, .188, '#dcf105');
      ctx.restore();
    }
    ctx.restore();
  }

  resize();
  return { resize, frame, project, projectPaint };
}
