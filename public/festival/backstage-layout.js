export const rearGate = { left: 7.6, right: 11 };
export const backstageYard = { left: 12.4, right: 38.6, north: -67.2, south: -50 };
export const backstagePassages = [
  { left: 7.6, right: 11, north: -49.1, south: -40.8 },
  { left: 7.6, right: 18.6, north: -49.1, south: -45.7 },
  { left: 15.2, right: 18.6, north: -50.1, south: -45.7 },
];

// Follow the dogleg from the rear of the stage. The only gap is the public entrance.
const perimeter = [
  [rearGate.left, -40.8], [rearGate.left, -49.1], [15.2, -49.1], [15.2, -50],
  [12.4, -50], [12.4, -67.2], [38.6, -67.2], [38.6, -50],
  [18.6, -50], [18.6, -45.7], [rearGate.right, -45.7], [rearGate.right, -40.8],
];
export const backstageFences = perimeter.slice(1).map(([x2, z2], index) => {
  const [x1, z1] = perimeter[index];
  return { x1, z1, x2, z2, length: Math.hypot(x2 - x1, z2 - z1), height: 4.6 };
});

export const backstageBar = { x: 14.7, z: -58.5, width: 2.8, depth: 8.5 };
export const backstageTables = [{ x: 21.8, z: -57.0 }, { x: 27.2, z: -53.9 }];
export const backstageCabins = [17.1, 23.1, 29.1].map((x, index) => ({
  x, z: -64.4, width: 4.9, depth: 3.55, number: index + 1,
}));
export const managerCabin = { x: 35.45, z: -61.9, width: 2.6, depth: 2.85 };
export const managerSeat = { x: managerCabin.x, z: managerCabin.z - .28 };

function solid(x, z, width, depth, top) {
  return { left: x - width / 2, right: x + width / 2, back: z - depth / 2, front: z + depth / 2, top };
}
export const backstageSolids = [
  ...backstageFences.map(({ x1, z1, x2, z2, height }) =>
    solid((x1 + x2) / 2, (z1 + z2) / 2, Math.abs(x2 - x1) + .24, Math.abs(z2 - z1) + .24, height)),
  ...backstageCabins.map(({ x, z, width, depth }) => solid(x, z, width, depth, 3.45)),
  solid(backstageBar.x, backstageBar.z, backstageBar.width, backstageBar.depth, 3.6),
  ...backstageTables.map(({ x, z }) => solid(x, z, 3.55, 2.46, 1.08)),
  ...[-1, 1].map(side => solid(managerCabin.x + side * 1.25, managerCabin.z, .16, 2.85, 3.35)),
  solid(managerCabin.x, managerCabin.z - 1.365, 2.60, .16, 3.35),
  solid(managerSeat.x, managerSeat.z - .35, 1.35, 1.34, 1.22),
];
export function onBackstageGround(x, z) {
  return [backstageYard, ...backstagePassages].some(({ left, right, north, south }) =>
    x >= left && x <= right && z >= north && z <= south);
}

export function inBackstage(x, z) {
  return z < -42.38 && onBackstageGround(x, z);
}
