import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkshop, movePlayer, updateNpcs, interactNearby, nearbyCharacter, isBlocked, motionActive, WIDTH, HEIGHT,
} from '../src/workshop.js';

function seededRandom() {
  let seed = 941;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('crew consists only of Miku and Makima', () => {
  assert.deepEqual(createWorkshop().npcs.map(({ figure, name }) => [figure, name]), [
    ['miku', 'Miku'], ['makima', 'Makima'],
  ]);
});

test('NPCs roam independently while preserving occupied and reserved cells', () => {
  const state = createWorkshop();
  const random = seededRandom();
  const visited = state.npcs.map(() => new Set());
  const directions = ['up', 'left', 'down', 'right'];
  for (let tick = 0; tick < 6000; tick += 1) {
    const now = tick * 0.05;
    if (tick % 5 === 0 && !motionActive(state.player, now)) {
      movePlayer(state, directions[Math.floor(random() * directions.length)], now);
    }
    updateNpcs(state, now, random);
    const actors = [state.player, ...state.crates, ...state.npcs];
    assert.equal(new Set(actors.map((actor) => actor.x + ',' + actor.z)).size, actors.length);
    for (const actor of actors) assert.equal(isBlocked(actor.x, actor.z), false);
    for (const npc of state.npcs) {
      visited[npc.id].add(npc.x + ',' + npc.z);
      for (const other of actors.filter((actor) => actor !== npc)) {
        if (motionActive(npc, now)) {
          assert.notDeepEqual([npc.motion.fromX, npc.motion.fromZ], [other.x, other.z]);
        }
        if (motionActive(other, now)) {
          assert.notDeepEqual([npc.x, npc.z], [other.motion.fromX, other.motion.fromZ]);
        }
        if (motionActive(npc, now) && motionActive(other, now)) {
          assert.notDeepEqual([npc.motion.fromX, npc.motion.fromZ], [other.motion.fromX, other.motion.fromZ]);
        }
      }
    }
  }
  for (const cells of visited) assert(cells.size > 10, 'Each NPC must explore the workshop');
});

test('walking into an NPC greets them and keeps both grid positions', () => {
  const state = createWorkshop();
  state.npcs[0].x = 5;
  state.npcs[0].z = 14;
  const result = movePlayer(state, 'up', 1);
  assert.deepEqual(result, { moved: false, interacted: 0 });
  assert.deepEqual(state.player, { x: 5, z: 15 });
  assert.equal(state.npcs[0].z, 14);
  assert.equal(state.npcs[0].action, 'dance');
});

test('crate pushing respects an NPC’s reserved departure cell', () => {
  const state = createWorkshop();
  state.crates = [{ id: 0, x: 5, z: 14 }];
  state.npcs = [{
    ...state.npcs[0], x: 6, z: 13,
    motion: { fromX: 5, fromZ: 13, startedAt: 1, duration: 0.5 },
  }];
  assert.equal(movePlayer(state, 'up', 1.1).moved, false);
  assert.equal(state.crates[0].z, 14);
  assert.equal(movePlayer(state, 'up', 1.6).pushed, 0);
  assert.equal(state.crates[0].z, 13);
});

test('NPCs greet one another without moving through one another', () => {
  const state = createWorkshop();
  state.npcs = state.npcs.slice(0, 2);
  Object.assign(state.npcs[0], { x: 2, z: 8, nextThink: 0 });
  Object.assign(state.npcs[1], { x: 2, z: 9, nextThink: 0 });
  updateNpcs(state, 1, seededRandom());
  assert.equal(state.npcs[0].action, 'dance');
  assert.equal(state.npcs[1].action, 'nod');
  assert(state.npcs.every((npc) => npc.greetingUntil > 1));
  assert(state.npcs.every((npc) => !npc.motion));
});

test('nearby interaction selects a character and respects distance', () => {
  const state = createWorkshop();
  assert.equal(interactNearby(state, 1), undefined);
  state.npcs[1].x = 6;
  state.npcs[1].z = 15;
  assert.equal(interactNearby(state, 2).name, 'Makima');
  assert.equal(state.npcs[1].action, 'nod');
});

test('reset restores NPC positions, decisions, greetings and object positions', () => {
  const original = createWorkshop();
  const running = createWorkshop();
  updateNpcs(running, 5, seededRandom());
  interactNearby(running, 6);
  assert.deepEqual(createWorkshop(), original);
});

test('crew turn in place before walking into a new direction', () => {
  const state = createWorkshop();
  state.crates = [];
  state.npcs = [{ ...state.npcs[0], x: 5, z: 10, angle: 0, nextThink: 0, destination: { x: 6, z: 10 } }];
  updateNpcs(state, 1);
  assert.equal(state.npcs[0].angle, Math.PI / 2);
  assert.equal(state.npcs[0].motion, undefined, 'Turn before translating sideways');
  updateNpcs(state, 1.6);
  assert.equal(state.npcs[0].x, 6);
  assert(motionActive(state.npcs[0], 1.6));
});

test('encounter selects the nearest reachable crew member and ignores bulkheads', () => {
  const state = createWorkshop();
  state.crates = [];
  state.player = { x: 4, z: 7 };
  state.npcs = [
    { ...state.npcs[0], x: 2, z: 7 }, // Two tiles away, through the cabin wall.
    { ...state.npcs[1], x: 5, z: 8 },
    { ...state.npcs[1], id: 2, x: 5, z: 7 },
  ];
  assert.equal(nearbyCharacter(state, 1).id, 2);
  state.npcs.pop();
  assert.equal(nearbyCharacter(state, 1).id, 1);
  state.npcs.pop();
  assert.equal(nearbyCharacter(state, 1), undefined, 'No portrait through a wall');
  state.player = { x: 4, z: 8 };
  state.npcs[0].z = 8;
  assert.equal(nearbyCharacter(state, 1).id, 0, 'Portrait appears through an open doorway');
  state.player = { x: 5, z: 15 };
  assert.equal(nearbyCharacter(state, 1), undefined, 'Portrait disappears after leaving');
});

test('aircraft rooms connect through doorways and walls block walking and cargo', () => {
  const state = createWorkshop();
  const queue = [{ ...state.player }];
  const reached = new Set([state.player.x + ',' + state.player.z]);
  for (const cell of queue) {
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const x = cell.x + dx, z = cell.z + dz, key = x + ',' + z;
      if (isBlocked(x, z) || reached.has(key)) continue;
      reached.add(key);
      queue.push({ x, z });
    }
  }
  for (let z = 0; z < HEIGHT; z++) for (let x = 0; x < WIDTH; x++) {
    if (!isBlocked(x, z)) assert(reached.has(x + ',' + z), 'Disconnected cabin cell: ' + x + ',' + z);
  }
  assert(reached.has('5,1'), 'Cockpit is accessible');
  assert(reached.has('2,9'), 'Rest cabin is accessible');
  assert(reached.has('8,8'), 'Galley is accessible');
  assert(reached.has('9,11'), 'Washroom is accessible');
  assert(reached.has('2,17'), 'Engineering is accessible');
  assert(reached.has('8,17'), 'Drone bay is accessible');
  assert(reached.has('2,24'), 'Payload bay is accessible');
  assert(reached.has('8,26'), 'Logistics is accessible');
  state.player = { x: 2, z: 6 };
  assert.equal(movePlayer(state, 'up').moved, false, 'Cannot walk through cockpit bulkhead');
  state.player = { x: 2, z: 7 };
  state.crates = [{ id: 0, x: 2, z: 6 }];
  assert.equal(movePlayer(state, 'up').moved, false, 'Cannot push cargo through a bulkhead');
});
