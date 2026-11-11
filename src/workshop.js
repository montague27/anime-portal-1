import { CHARACTERS } from './characters.js';

export const WIDTH = 19;
export const HEIGHT = 15;
export const CELL_SIZE = 1.18;

export const DIRECTIONS = {
  up: { x: 0, z: -1, angle: Math.PI },
  left: { x: -1, z: 0, angle: -Math.PI / 2 },
  down: { x: 0, z: 1, angle: 0 },
  right: { x: 1, z: 0, angle: Math.PI / 2 },
};

const startingCrates = [[6, 5], [6, 4], [10, 5], [2, 7], [9, 6], [7, 6]];
const equipment = [
  { x: 7, z: 10, kind: 'battery', name: 'Battery box' },
  { x: 10, z: 11, kind: 'battery', name: 'Battery box' },
  { x: 15, z: 4, kind: 'battery', name: 'Battery box' },
  { x: 6, z: 12, kind: 'toolbox', name: 'Toolbox' },
  { x: 12, z: 10, kind: 'toolbox', name: 'Toolbox' },
  { x: 15, z: 12, kind: 'toolbox', name: 'Toolbox' },
];
const startingFigures = [
  { figure: 'miku', name: 'Miku', x: 2, z: 3 },
  { figure: 'shino', name: CHARACTERS.shino.name, x: 4, z: 2 },
  { figure: 'shibu', name: CHARACTERS.shibu.name, x: 7, z: 3 },
  { figure: 'vita', name: CHARACTERS.vita.name, x: 8, z: 5 },
];
// Bulkheads and furniture share one grid map with the rendered aircraft.
export const bulkheads = [
  ...Array.from({ length: WIDTH }, (_, x) => [x, 3]).filter(([x]) => ![2, 7, 8].includes(x)),
  ...Array.from({ length: HEIGHT - 4 }, (_, i) => i + 4).filter((z) => ![6, 7].includes(z)).map((z) => [4, z]),
];
export const furniture = [
  ...[1, 2, 3, 5, 6, 8, 9, 11, 12, 13].map((x) => [x, 0]),
  [5, 1], [9, 1],
  ...[5, 8, 11].flatMap((z) => [[1, z], [2, z]]),
  ...[5, 7, 9].flatMap((z) => [[WIDTH - 3, z], [WIDTH - 2, z]]),
];
const fixtures = [...bulkheads, ...furniture];
const key = (x, z) => x + ',' + z;
const fixedCells = new Set(fixtures.map(([x, z]) => key(x, z)));

export function createWorkshop() {
  return {
    player: { x: 5, z: 6 },
    crates: [...startingCrates.map(([x, z]) => ({ x, z, kind: 'cargo', name: 'Cargo crate' })), ...equipment]
      .map((item, id) => ({ ...item, id })),
    npcs: startingFigures.map((npc, id) => ({
      ...npc, id, angle: 0, nextThink: 0.8 + id * 0.6,
      greetingUntil: 0, nextGreeting: 0, action: 'idle', destination: null,
    })),
  };
}

export function isBlocked(x, z) {
  return x < 0 || z < 0 || x >= WIDTH || z >= HEIGHT || fixedCells.has(key(x, z));
}

export function motionActive(actor, now) {
  return Boolean(actor.motion && now < actor.motion.startedAt + actor.motion.duration);
}

export function occupied(state, x, z, now, ignore) {
  return [state.player, ...state.crates, ...state.npcs].some((actor) => actor !== ignore && (
    (actor.x === x && actor.z === z) ||
    (motionActive(actor, now) && actor.motion.fromX === x && actor.motion.fromZ === z)
  ));
}

function beginMove(actor, x, z, now, duration) {
  actor.motion = { fromX: actor.x, fromZ: actor.z, startedAt: now, duration };
  actor.x = x;
  actor.z = z;
}

export function greetNpc(state, npc, now, partner = state.player) {
  npc.action = CHARACTERS[npc.figure].gesture;
  npc.greetingUntil = now + 2.4;
  npc.nextGreeting = now + 8;
  npc.nextThink = now + 2.6;
  npc.angle = Math.atan2(partner.x - npc.x, partner.z - npc.z);
  npc.destination = null;
  return npc;
}

export function interactNearby(state, now) {
  const nearby = state.npcs
    .filter((npc) => Math.abs(npc.x - state.player.x) + Math.abs(npc.z - state.player.z) <= 2)
    .sort((a, b) => Math.hypot(a.x - state.player.x, a.z - state.player.z) -
      Math.hypot(b.x - state.player.x, b.z - state.player.z))[0];
  if (nearby) greetNpc(state, nearby, now);
  return nearby;
}

export function movePlayer(state, direction, now = 0) {
  const offset = DIRECTIONS[direction];
  if (!offset) return { moved: false };
  const x = state.player.x + offset.x;
  const z = state.player.z + offset.z;
  if (isBlocked(x, z)) return { moved: false };
  const npc = state.npcs.find((actor) => actor.x === x && actor.z === z);
  if (npc) {
    greetNpc(state, npc, now);
    return { moved: false, interacted: npc.id };
  }
  const crate = state.crates.find((item) => item.x === x && item.z === z);
  if (crate) {
    const nextX = x + offset.x;
    const nextZ = z + offset.z;
    if (isBlocked(nextX, nextZ) || occupied(state, nextX, nextZ, now, crate)) {
      return { moved: false };
    }
    beginMove(crate, nextX, nextZ, now, 0.20);
  } else if (occupied(state, x, z, now, state.player)) {
    return { moved: false };
  }
  beginMove(state.player, x, z, now, 0.20);
  return { moved: true, pushed: crate?.id };
}

function findNextStep(state, npc, destination, now) {
  const queue = [{ x: npc.x, z: npc.z, first: null }];
  const visited = new Set([key(npc.x, npc.z)]);
  for (let index = 0; index < queue.length; index += 1) {
    const cell = queue[index];
    if (cell.x === destination.x && cell.z === destination.z) return cell.first;
    for (const direction of Object.values(DIRECTIONS)) {
      const x = cell.x + direction.x;
      const z = cell.z + direction.z;
      if (visited.has(key(x, z)) || isBlocked(x, z) || occupied(state, x, z, now, npc)) continue;
      visited.add(key(x, z));
      queue.push({ x, z, first: cell.first || { x, z, angle: direction.angle } });
    }
  }
  return null;
}

export function updateNpcs(state, now, random = Math.random) {
  for (const npc of state.npcs) {
    if (motionActive(npc, now) || now < npc.nextThink) continue;
    const timing = CHARACTERS[npc.figure];
    npc.action = 'idle';
    const partner = [state.player, ...state.npcs.filter((other) => other !== npc)]
      .find((actor) => !motionActive(actor, now) &&
        Math.abs(actor.x - npc.x) + Math.abs(actor.z - npc.z) === 1);
    if (partner && now >= npc.nextGreeting) {
      greetNpc(state, npc, now, partner);
      if (partner.figure) greetNpc(state, partner, now, npc);
      continue;
    }
    if (!npc.destination) {
      const candidates = [];
      for (let z = 0; z < HEIGHT; z += 1) {
        for (let x = 0; x < WIDTH; x += 1) {
          if (!isBlocked(x, z) && !occupied(state, x, z, now, npc) &&
              Math.abs(x - npc.x) + Math.abs(z - npc.z) > 1) candidates.push({ x, z });
        }
      }
      npc.destination = candidates[Math.floor(random() * candidates.length)];
    }
    const next = npc.destination && findNextStep(state, npc, npc.destination, now);
    if (!next) {
      npc.destination = null;
      npc.nextThink = now + timing.pause;
      continue;
    }
    npc.angle = next.angle;
    beginMove(npc, next.x, next.z, now, timing.speed);
    const arrived = npc.x === npc.destination.x && npc.z === npc.destination.z;
    npc.nextThink = now + timing.speed + (arrived ? timing.pause : 0.06);
    if (arrived) npc.destination = null;
  }
}

export function worldPosition(x, z) {
  return [(x - (WIDTH - 1) / 2) * CELL_SIZE, (z - (HEIGHT - 1) / 2) * CELL_SIZE];
}
