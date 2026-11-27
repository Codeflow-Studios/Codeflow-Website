import { canWalk, grounds, paths, sideStands, venues } from './layout.js';
import { inBackstage } from './backstage-layout.js';

const step = 2;
const gridX = Math.ceil((grounds.maxX - grounds.minX) / step);
const gridZ = Math.ceil((grounds.maxZ - grounds.minZ) / step);
const startX = grounds.minX + step / 2;
const startZ = grounds.minZ + step / 2;
const cells = Array.from({ length: gridX * gridZ }, (_, index) => ({
  x: startX + (index % gridX) * step,
  z: startZ + Math.floor(index / gridX) * step,
}));
const walkable = cells.map(({ x, z }) => canWalk(x, z));
const links = cells.map((cell, index) => {
  const column = index % gridX;
  return [
    column ? index - 1 : -1,
    column < gridX - 1 ? index + 1 : -1,
    index - gridX,
    index + gridX,
  ].filter(neighbor => {
    if (!walkable[neighbor]) return false;
    const next = cells[neighbor];
    return canWalk((cell.x + next.x) / 2, (cell.z + next.z) / 2);
  });
});

function closestCell(x, z) {
  const column = Math.round((x - startX) / step);
  const row = Math.round((z - startZ) / step);
  let result;
  let best = Infinity;
  for (let r = Math.max(0, row - 2); r <= Math.min(gridZ - 1, row + 2); r++) {
    for (let c = Math.max(0, column - 2); c <= Math.min(gridX - 1, column + 2); c++) {
      const index = r * gridX + c;
      if (!walkable[index]) continue;
      const position = cells[index];
      const distance = (position.x - x) ** 2 + (position.z - z) ** 2;
      if (distance < best) {
        best = distance;
        result = index;
      }
    }
  }
  return result;
}

function route(start, goal) {
  if (start === undefined || goal === undefined) return [];
  const previous = new Int32Array(cells.length).fill(-1);
  const queue = [start];
  previous[start] = start;
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (item === goal) {
      const traced = [cells[item]];
      for (let index = item; index !== start;) {
        index = previous[index];
        traced.push(cells[index]);
      }
      return traced.reverse();
    }
    for (const neighbor of links[item]) {
      if (previous[neighbor] !== -1) continue;
      previous[neighbor] = item;
      queue.push(neighbor);
    }
  }
  return [];
}

export function createMap(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const spanX = grounds.maxX - grounds.minX;
  const spanZ = grounds.maxZ - grounds.minZ;
  const scale = Math.min((width - 36) / spanX, (height - 27) / spanZ);
  const left = (width - spanX * scale) / 2;
  const top = (height - spanZ * scale) / 2;
  const xAt = x => left + (x - grounds.minX) * scale;
  const zAt = z => top + (z - grounds.minZ) * scale;
  const terrain = Object.assign(document.createElement('canvas'), { width, height });
  const ink = terrain.getContext('2d');
  ink.fillStyle = '#151e20';
  ink.fillRect(0, 0, width, height);
  ink.fillStyle = '#263433';
  ink.strokeStyle = '#55635c';
  ink.lineWidth = 2;
  ink.beginPath();
  ink.roundRect(left, top, spanX * scale, spanZ * scale, 8);
  ink.fill();
  ink.stroke();
  ink.fillStyle = '#5b5650';
  for (const path of paths) {
    ink.fillRect(xAt(path.x - path.width / 2), zAt(path.z - path.depth / 2), path.width * scale, path.depth * scale);
  }
  for (const stand of sideStands) {
    ink.fillStyle = '#8f8170';
    ink.fillRect(xAt(stand.x - stand.width / 2), zAt(stand.z - stand.depth / 2), stand.width * scale, stand.depth * scale);
  }
  for (const zone of venues) {
    const left = xAt(zone.x - zone.width / 2);
    const top = zAt(zone.z - zone.depth / 2);
    ink.strokeStyle = zone.color;
    ink.fillStyle = zone.color + '33';
    ink.beginPath();
    ink.roundRect(left, top, zone.width * scale, zone.depth * scale, 4);
    ink.fill();
    ink.stroke();
  }

  let from;
  let to;
  let way = [];
  return (player, marked, visited) => {
    ctx.drawImage(terrain, 0, 0);
    const hiddenPlayer = inBackstage(player.x, player.z);
    if (marked && !hiddenPlayer) {
      const start = closestCell(player.x, player.z);
      if (start !== from || marked !== to) {
        from = start;
        to = marked;
        way = route(start, closestCell(marked.doorX, marked.doorZ));
      }
      if (way.length) {
        ctx.beginPath();
        ctx.moveTo(xAt(player.x), zAt(player.z));
        for (const step of way) ctx.lineTo(xAt(step.x), zAt(step.z));
        ctx.lineTo(xAt(marked.doorX), zAt(marked.doorZ));
        ctx.strokeStyle = marked.color;
        ctx.lineWidth = 2.7;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const zone of venues) {
      ctx.save();
      ctx.translate(xAt(zone.x), zAt(zone.z));
      ctx.rotate(Math.PI / 4);
      const w = zone === marked ? 13 : 10;
      ctx.fillStyle = zone.color;
      ctx.fillRect(-w / 2, -w / 2, w, w);
      if (visited.has(zone.id)) {
        ctx.fillStyle = '#243032';
        ctx.fillRect(-2, -2, 4, 4);
      }
      ctx.restore();
    }

    if (hiddenPlayer) return;
    ctx.save();
    ctx.translate(xAt(player.x), zAt(player.z));
    ctx.rotate(-player.heading);
    ctx.beginPath();
    ctx.moveTo(0, 8.2);
    ctx.lineTo(-6.2, -5.0);
    ctx.lineTo(0, -3.2);
    ctx.lineTo(6.2, -5.0);
    ctx.closePath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0a161b';
    ctx.stroke();
    ctx.fillStyle = '#fffbe2';
    ctx.fill();
    ctx.restore();
  };
}
