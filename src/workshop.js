import { CHARACTERS } from './characters.js';

import { WIDTH, HEIGHT, CELL_SIZE, bulkheads, furniture, isDeckCell } from './layout.js';
export { WIDTH, HEIGHT, CELL_SIZE, bulkheads, furniture } from './layout.js';
export const PLAYER_STEP_SECONDS = 0.10;

export const DIRECTIONS = {
  up: { x: 0, z: -1, angle: Math.PI },
  left: { x: -1, z: 0, angle: -Math.PI / 2 },
  down: { x: 0, z: 1, angle: 0 },
  right: { x: 1, z: 0, angle: Math.PI / 2 },
};

const startingCrates = [[1, 24], [2, 25], [8, 24], [9, 26]];
const equipment = [
  { x: 2, z: 15, kind: 'battery', name: 'Battery box' },
  { x: 8, z: 20, kind: 'battery', name: 'Battery box' },
  { x: 2, z: 18, kind: 'toolbox', name: 'Toolbox' },
  { x: 9, z: 17, kind: 'toolbox', name: 'Toolbox' },
];
const startingFigures = [
  { figure: 'miku', name: 'Miku', x: 5, z: 3 },
  { figure: 'makima', name: CHARACTERS.makima.name, x: 5, z: 20 },
];
// Bulkheads and furniture share one grid map with the rendered aircraft.
const fixtures = [...bulkheads, ...furniture];
const key = (x, z) => x + ',' + z;
const fixedCells = new Set(fixtures.map(([x, z]) => key(x, z)));

export function createWorkshop() {
  return {
    player: { x: 5, z: 15 },
    crates: [...startingCrates.map(([x, z]) => ({ x, z, kind: 'cargo', name: 'Cargo crate' })), ...equipment]
      .map((item, id) => ({ ...item, id })),
    npcs: startingFigures.map((npc, id) => ({
      ...npc, id, angle: 0, nextThink: 0.8 + id * 0.6,
      greetingUntil: 0, nextGreeting: 0, action: 'idle', destination: null,
    })),
  };
}

export function isBlocked(x, z) {
  return !isDeckCell(x, z) || fixedCells.has(key(x, z));
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
  const greetingAngle = Math.atan2(partner.x - npc.x, partner.z - npc.z);
  if (motionActive(npc, now)) npc.greetingAngle = greetingAngle;
  else npc.angle = greetingAngle;
  npc.destination = null;
  return npc;
}

export function nearbyCharacter(state, now) {
  // Two reachable tiles: do not show crew through bulkheads or furniture.
  const reached = new Map([[key(state.player.x, state.player.z), 0]]);
  const queue = [{ ...state.player, distance: 0 }];
  for (const cell of queue) {
    if (cell.distance === 2) continue;
    for (const direction of Object.values(DIRECTIONS)) {
      const x = cell.x + direction.x, z = cell.z + direction.z;
      if (isBlocked(x, z) || reached.has(key(x, z)) || state.crates.some((crate) => crate.x === x && crate.z === z)) continue;
      reached.set(key(x, z), cell.distance + 1);
      queue.push({ x, z, distance: cell.distance + 1 });
    }
  }
  return state.npcs.map((npc) => ({ npc, distance: Math.min(
    reached.get(key(npc.x, npc.z)) ?? Infinity,
    motionActive(npc, now) ? reached.get(key(npc.motion.fromX, npc.motion.fromZ)) ?? Infinity : Infinity,
  ) })).filter(({ distance }) => distance <= 2)
    .sort((a, b) => a.distance - b.distance || a.npc.id - b.npc.id)[0]?.npc;
}

export function interactNearby(state, now) {
  const nearby = nearbyCharacter(state, now);
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
    beginMove(crate, nextX, nextZ, now, PLAYER_STEP_SECONDS);
  } else if (occupied(state, x, z, now, state.player)) {
    return { moved: false };
  }
  beginMove(state.player, x, z, now, PLAYER_STEP_SECONDS);
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
    if (motionActive(npc, now)) continue;
    if (npc.greetingAngle !== undefined) { npc.angle = npc.greetingAngle; delete npc.greetingAngle; }
    if (npc.talking || now < npc.nextThink) continue;
    const timing = CHARACTERS[npc.figure];
    npc.action = 'idle';
    const partner = [state.player, ...state.npcs.filter((other) => other !== npc)]
      .find((actor) => !actor.talking && !motionActive(actor, now) &&
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
    const turn = Math.atan2(Math.sin(next.angle - npc.angle), Math.cos(next.angle - npc.angle));
    npc.angle = next.angle;
    if (Math.abs(turn) > 0.35) {
      npc.nextThink = now + Math.abs(turn) / 3.4;
      continue;
    }
    beginMove(npc, next.x, next.z, now, timing.speed);
    const arrived = npc.x === npc.destination.x && npc.z === npc.destination.z;
    npc.nextThink = now + timing.speed + (arrived ? timing.pause : 0);
    if (arrived) npc.destination = null;
  }
}

export function worldPosition(x, z) {
  return [(x - (WIDTH - 1) / 2) * CELL_SIZE, (z - (HEIGHT - 1) / 2) * CELL_SIZE];
}
