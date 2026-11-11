export const WIDTH = 11;
export const HEIGHT = 9;
export const CELL_SIZE = 1.18;

export const DIRECTIONS = {
  up: { x: 0, z: -1, angle: Math.PI },
  left: { x: -1, z: 0, angle: -Math.PI / 2 },
  down: { x: 0, z: 1, angle: 0 },
  right: { x: 1, z: 0, angle: Math.PI / 2 },
};

const startingCrates = [[4, 4], [6, 4], [5, 2], [2, 5], [8, 3], [7, 6]];
const startingFigures = [
  { figure: 'miku', name: 'Miku', x: 2, z: 3 },
  { figure: 'emu', name: 'Emu Otori', x: 4, z: 2 },
  { figure: 'aki', name: 'Aki', x: 7, z: 3 },
  { figure: 'reze', name: 'Reze', x: 8, z: 5 },
];
const fixtures = [[1, 1], [2, 1], [3, 1], [7, 1], [8, 1], [9, 1], [1, 7], [9, 7]];
const key = (x, z) => x + ',' + z;
const fixedCells = new Set(fixtures.map(([x, z]) => key(x, z)));

export function createWorkshop() {
  return {
    player: { x: 5, z: 6 },
    crates: [
      ...startingCrates.map(([x, z]) => ({ x, z })),
      ...startingFigures,
    ].map((object, id) => ({ ...object, id })),
  };
}

export function isBlocked(x, z) {
  return x < 0 || z < 0 || x >= WIDTH || z >= HEIGHT || fixedCells.has(key(x, z));
}

export function movePlayer(state, direction) {
  const offset = DIRECTIONS[direction];
  if (!offset) return { moved: false };
  const x = state.player.x + offset.x;
  const z = state.player.z + offset.z;
  if (isBlocked(x, z)) return { moved: false };
  const crate = state.crates.find((item) => item.x === x && item.z === z);
  if (crate) {
    const nextX = x + offset.x;
    const nextZ = z + offset.z;
    if (isBlocked(nextX, nextZ) || state.crates.some((item) => item.x === nextX && item.z === nextZ)) {
      return { moved: false };
    }
    crate.x = nextX;
    crate.z = nextZ;
  }
  state.player.x = x;
  state.player.z = z;
  return { moved: true, pushed: crate?.id };
}

export function worldPosition(x, z) {
  return [(x - (WIDTH - 1) / 2) * CELL_SIZE, (z - (HEIGHT - 1) / 2) * CELL_SIZE];
}
