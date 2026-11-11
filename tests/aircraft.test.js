import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAircraft } from '../src/aircraft.js';
import { createWorkshop } from '../src/workshop.js';
import { fittings, bulkheads, isDeckCell } from '../src/layout.js';

test('every fitted object has a valid, nonoverlapping footprint clear of bulkheads', () => {
  const occupied = new Set(bulkheads.map(([x, z]) => x + ',' + z));
  for (const { kind, x, z, w = 1, d = 1 } of fittings) {
    for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < d; dz++) {
      const key = (x + dx) + ',' + (z + dz);
      assert(isDeckCell(x + dx, z + dz), kind + ' must fit on deck');
      assert(!occupied.has(key), kind + ' overlaps another object or wall at ' + key);
      occupied.add(key);
    }
  }
});

test('carrier mission stations animate, prevent duplicate launches, and reset', () => {
  const scene = new THREE.Scene();
  const aircraft = createAircraft(scene, createWorkshop());
  assert.deepEqual(aircraft.stations.map((station) => station.userData.station).sort(),
    ['drone', 'logistics', 'payload', 'radar', 'recharge']);
  const drone = scene.getObjectByName('recon-drone');
  const cargo = scene.getObjectByName('conveyor-cargo');
  const payload = scene.getObjectByName('released-payload');
  const home = drone.position.clone();
  assert(aircraft.interact('drone'));
  assert(!aircraft.interact('drone'), 'Cannot dispatch the same drone twice');
  assert(aircraft.interact('logistics'));
  assert(aircraft.interact('payload'));
  aircraft.update(1);
  assert(drone.position.y > home.y + 0.5, 'Drone climbs off its pad');
  assert(cargo.position.x > -0.8, 'Conveyor moves its cargo');
  assert(payload.visible && payload.position.y < -1.5, 'Payload drops below the aircraft');
  aircraft.reset();
  aircraft.update(0);
  assert(drone.position.equals(home), 'Drone returns to its dock on reset');
  assert.equal(payload.visible, false);
  assert.equal(cargo.position.x, -0.8);
  assert(aircraft.interact('drone'), 'A reset restores launch availability');
  aircraft.update(10);
  assert(drone.position.equals(home), 'Drone completes its flight and returns to the bay');
});
