export const grounds = { minX: -51, maxX: 51, minZ: -43, maxZ: 43 };
export const entrance = { x: -1.2, z: 26 };

export const venues = [
  {
    id: 'crowd', title: 'Crowd Surfing', type: 'Crowdsurf arcade',
    color: '#c9fa79', cover: '/skumic/assets/crowd-surfing.webp',
    x: 0, z: -31, width: 24, depth: 12, signHeight: 10.6,
    doorX: 0, doorZ: -20, url: '/skumic/games/crowd-surfing/index.html',
  },
  {
    id: 'fighters', title: 'Stage Fighters', type: 'Meppn, detsn & dokkn',
    color: '#ff9b88', cover: '/skumic/assets/meppn.webp', keyboard: true,
    x: -33, z: 0, width: 20, depth: 13, signHeight: 8.6,
    doorX: -33, doorZ: 11, url: 'https://skumic-meppn-production.up.railway.app/',
  },
  {
    id: 'rave', title: 'Rave Rush', type: 'Bluvn goan met Skumic',
    color: '#c4b0ff', cover: '/skumic/assets/bluvn.webp',
    x: 33, z: 0, width: 20, depth: 13, signHeight: 8.8,
    doorX: 33, doorZ: 11, url: 'https://codeflow-studios-production.up.railway.app/games/bluvn-goan/',
  },
  {
    id: 'dixie', title: 'Dixie Dash', type: 'Drum-’n-bass arcade',
    color: '#ffa6d3', cover: '/skumic/assets/dixie-dash.webp',
    x: -15, z: 32, width: 13, depth: 7, signHeight: 6.2,
    doorX: -15, doorZ: 38.5, url: '/skumic/games/dixie-dash/index.html?v=dixie-hard-start-1',
  },
];

export const paths = [
  { x: 0, z: 8, width: 11, depth: 67 },
  { x: 0, z: 11, width: 77, depth: 7 },
  { x: 0, z: -20, width: 32, depth: 14 },
  { x: -33, z: 10, width: 26, depth: 13 },
  { x: 33, z: 10, width: 26, depth: 13 },
  { x: -24, z: 28, width: 16, depth: 10 },
  { x: 23, z: 28, width: 17, depth: 10 },
  { x: -10, z: 27, width: 18, depth: 3.1 },
  { x: 9, z: 28, width: 18, depth: 3.1 },
  { x: -8, z: 38.5, width: 16, depth: 4 },
];

export const sideStands = [
  { x: -27, z: 29, width: 9, depth: 4, color: '#e9ac6e', label: 'FOOD' },
  { x: 24, z: 30, width: 9, depth: 4, color: '#8ed6cc', label: 'MERCH' },
];

export const benches = [
  [-17, -13], [-21, -17], [17, -13], [21, -17],
  [-13, 22], [13, 22],
];

export const lanterns = [
  [-8, 39], [8, 39], [-8, 23], [8, 23], [-8, 3], [8, 3], [-8, -12], [8, -12],
  [-20, 7], [-44, 17], [20, 7], [44, 17], [-44, -12], [44, -12], [-16, -29], [16, -29],
];

export const trees = [
  [-39, -30, 6.3], [-42, -24, 7.5], [-35, -22, 5.7], [-29, -34, 6.6], [-27, -22, 4.8],
  [35, -28, 7.1], [41, -25, 5.6], [30, -35, 5.4], [23, -29, 6.1],
  [-45, 27, 5.8], [-39, 36, 6.8], [41, 27, 7.6], [44, 35, 5.9], [34, 36, 5.0],
];

export const bounds = (x, z, width, depth) => ({
  left: x - width / 2, right: x + width / 2, back: z - depth / 2, front: z + depth / 2,
});

export const solids = [
  bounds(-33, -17.8, 17.6, 6.4),
  ...venues.map(({ x, z, width, depth }) => bounds(x, z, width, depth)),
  ...sideStands.map(({ x, z, width, depth }) => bounds(x, z, width, depth)),
  ...benches.map(([x, z]) => bounds(x, z, 3.4, 1.5)),
  ...lanterns.map(([x, z]) => bounds(x, z, 0.65, 0.65)),
  ...trees.map(([x, z, size]) => bounds(x, z, size * .21, size * .21)),
  bounds(-6, 41, 1.25, 1.25), bounds(6, 41, 1.25, 1.25),
];

export function canWalk(x, z) {
  const radius = 0.62;
  return x > grounds.minX + radius && x < grounds.maxX - radius &&
    z > grounds.minZ + radius && z < grounds.maxZ - radius &&
    !solids.some(({ left, right, back, front }) =>
      x + radius > left && x - radius < right && z + radius > back && z - radius < front);
}
