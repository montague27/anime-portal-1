export const WIDTH = 11;
export const HEIGHT = 29;
export const CELL_SIZE = 1.18;

export function isDeckCell(x, z) {
  if (x < 0 || z < 0 || x >= WIDTH || z >= HEIGHT) return false;
  const inset = Math.max(0, 4 - z);
  return x >= inset && x < WIDTH - inset;
}

export const bulkheads = [
  ...[5, 13, 21].flatMap((z) => Array.from({ length: WIDTH }, (_, x) => [x, z]).filter(([x]) => x < 4 || x > 6)),
  ...[3, 7].flatMap((x) => Array.from({ length: 23 }, (_, i) => i + 6)
    .filter((z) => ![8, 9, 13, 16, 17, 21, 24, 25, 28].includes(z)).map((z) => [x, z])),
  [8, 10], [10, 10],
];

// Cell footprints drive both mesh placement and collision, including wide furniture.
export const fittings = [
  { kind: 'console', x: 4, z: 0, w: 3, d: 1 },
  { kind: 'console', x: 2, z: 2, w: 1, d: 2 },
  { kind: 'console', x: 8, z: 2, w: 1, d: 2 },
  { kind: 'chair', x: 4, z: 2 }, { kind: 'chair', x: 6, z: 2 },
  { kind: 'bed', x: 1, z: 7, d: 2 }, { kind: 'bed', x: 1, z: 10, d: 2 },
  { kind: 'locker', x: 0, z: 6 }, { kind: 'locker', x: 1, z: 6 }, { kind: 'locker', x: 2, z: 6 },
  { kind: 'galley', x: 8, z: 6, w: 3 },
  { kind: 'table', x: 9, z: 8 }, { kind: 'chair', x: 10, z: 8 },
  { kind: 'shower', x: 10, z: 11 }, { kind: 'toilet', x: 8, z: 12 },
  { kind: 'recharge', x: 0, z: 14, w: 2, d: 2, station: 'recharge' },
  { kind: 'medical', x: 0, z: 16, w: 2 },
  { kind: 'workbench', x: 0, z: 18, w: 2 },
  { kind: 'lifeSupport', x: 0, z: 20, w: 2 },
  { kind: 'drone', x: 8, z: 14, w: 3, d: 2, station: 'drone' },
  { kind: 'radar', x: 9, z: 18, w: 2, station: 'radar' },
  { kind: 'payloadRack', x: 0, z: 22, w: 2, d: 2 },
  { kind: 'payload', x: 0, z: 26, w: 3, d: 2, station: 'payload' },
  { kind: 'cargoRack', x: 9, z: 22, w: 2, d: 3 },
  { kind: 'logistics', x: 8, z: 27, w: 3, station: 'logistics' },
];

export const furniture = fittings.flatMap(({ x, z, w = 1, d = 1 }) =>
  Array.from({ length: w * d }, (_, i) => [x + i % w, z + Math.floor(i / w)]));
