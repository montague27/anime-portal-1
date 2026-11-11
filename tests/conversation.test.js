import test from 'node:test';
import assert from 'node:assert/strict';
import { CONVERSATIONS } from '../src/conversation.js';
import { CHARACTERS } from '../src/characters.js';
import { createWorkshop, updateNpcs } from '../src/workshop.js';

test('both characters have complete dialogue branches with reachable exits', () => {
  for (const character of Object.keys(CHARACTERS)) {
    const nodes = CONVERSATIONS[character];
    assert(nodes.hello, character + ' needs an opening line');
    const visited = new Set(), queue = ['hello'];
    let exits = 0;
    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      const node = nodes[id];
      assert(node?.text && node.choices.length, 'Dialogue branch must contain a line and replies');
      for (const [label, next] of node.choices) {
        assert(label.length > 0);
        if (next === null) exits++;
        else { assert(nodes[next], 'Reply must point to a valid line'); queue.push(next); }
      }
    }
    assert(exits > 0, 'Conversation can end');
    assert.equal(visited.size, Object.keys(nodes).length, 'All dialogue lines are reachable');
  }
});

test('a conversation partner stays in place and resumes roaming when released', () => {
  const state = createWorkshop();
  const npc = state.npcs[0];
  Object.assign(npc, { talking: true, nextThink: 0, destination: { x: 5, z: 4 } });
  const before = [npc.x, npc.z];
  for (let now = 1; now < 10; now++) updateNpcs(state, now, () => 0.5);
  assert.deepEqual([npc.x, npc.z], before);
  assert.equal(npc.motion, undefined);
  npc.talking = false;
  updateNpcs(state, 10, () => 0.5);
  assert(npc.motion || npc.nextThink > 10, 'Crew resumes moving or turning after conversation');
});
