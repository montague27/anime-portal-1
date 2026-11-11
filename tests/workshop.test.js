import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkshop, movePlayer, updateNpcs, interactNearby, isBlocked, motionActive,
} from '../src/workshop.js';

function seededRandom() {
  let seed = 941;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

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
  state.npcs[0].z = 5;
  const result = movePlayer(state, 'up', 1);
  assert.deepEqual(result, { moved: false, interacted: 0 });
  assert.deepEqual(state.player, { x: 5, z: 6 });
  assert.equal(state.npcs[0].z, 5);
  assert.equal(state.npcs[0].action, 'dance');
});

test('crate pushing respects an NPC’s reserved departure cell', () => {
  const state = createWorkshop();
  state.crates = [{ id: 0, x: 5, z: 5 }];
  state.npcs = [{
    ...state.npcs[0], x: 6, z: 4,
    motion: { fromX: 5, fromZ: 4, startedAt: 1, duration: 0.5 },
  }];
  assert.equal(movePlayer(state, 'up', 1.1).moved, false);
  assert.equal(state.crates[0].z, 5);
  assert.equal(movePlayer(state, 'up', 1.6).pushed, 0);
  assert.equal(state.crates[0].z, 4);
});

test('NPCs greet one another without moving through one another', () => {
  const state = createWorkshop();
  state.npcs = state.npcs.slice(0, 2);
  Object.assign(state.npcs[0], { x: 2, z: 3, nextThink: 0 });
  Object.assign(state.npcs[1], { x: 3, z: 3, nextThink: 0 });
  updateNpcs(state, 1, seededRandom());
  assert.equal(state.npcs[0].action, 'dance');
  assert.equal(state.npcs[1].action, 'cheer');
  assert(state.npcs.every((npc) => npc.greetingUntil > 1));
  assert(state.npcs.every((npc) => !npc.motion));
});

test('E interaction selects a nearby character and respects distance', () => {
  const state = createWorkshop();
  assert.equal(interactNearby(state, 1), undefined);
  state.npcs[3].x = 6;
  state.npcs[3].z = 6;
  assert.equal(interactNearby(state, 2).name, 'Vita');
  assert.equal(state.npcs[3].action, 'wave');
});

test('reset restores NPC positions, decisions, greetings and object positions', () => {
  const original = createWorkshop();
  const running = createWorkshop();
  updateNpcs(running, 5, seededRandom());
  interactNearby(running, 6);
  assert.deepEqual(createWorkshop(), original);
});
