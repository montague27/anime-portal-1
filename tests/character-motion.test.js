import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFigureMotion, updateFigureMotion } from '../src/character-motion.js';

function rig() {
  return { humanoid: { setNormalizedPose() {} }, expressionManager: { setValue() {} } };
}
const difference = (a, b) => new THREE.Quaternion(...a).angleTo(new THREE.Quaternion(...b));

test('greeting entry and exit blend joints and facial expressions without snapping', () => {
  const state = createFigureMotion(), vrm = rig();
  updateFigureMotion(vrm, state, { time: 0, delta: 0, snap: true });
  const idle = state.rotations.get('rightUpperArm').toArray();
  updateFigureMotion(vrm, state, { time: 0.016, delta: 0.016, action: 'wave' });
  assert(difference(idle, state.rotations.get('rightUpperArm').toArray()) < 0.15);
  for (let i = 0; i < 60; i++) updateFigureMotion(vrm, state, { time: i / 60, delta: 1 / 60, action: 'wave' });
  const waving = state.rotations.get('rightUpperArm').toArray(), expression = state.expression;
  updateFigureMotion(vrm, state, { time: 1.1, delta: 1 / 60 });
  assert(difference(waving, state.rotations.get('rightUpperArm').toArray()) < 0.15);
  assert(state.expression > 0 && state.expression < expression, 'Smile fades instead of disappearing');
});

test('walking cadence follows traveled distance across different frame rates', () => {
  const fast = createFigureMotion(), slow = createFigureMotion(), vrm = rig();
  for (let i = 0; i < 60; i++) updateFigureMotion(vrm, fast, { time: i / 60, delta: 1 / 60, distance: 1.15 / 60, moving: true });
  for (let i = 0; i < 30; i++) updateFigureMotion(vrm, slow, { time: i / 30, delta: 1 / 30, distance: 1.15 / 30, moving: true });
  assert(Math.abs(Math.sin(fast.phase) - Math.sin(slow.phase)) < 1e-9);
  const phase = fast.phase;
  updateFigureMotion(vrm, fast, { time: 1.1, delta: 1 / 60 });
  assert.equal(fast.phase, phase, 'No stepping while standing still');
  assert(fast.walk < slow.walk, 'Walking fades out when stopping');
});
