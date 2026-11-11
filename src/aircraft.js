import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WIDTH, HEIGHT, CELL_SIZE, worldPosition } from './workshop.js';
import { bulkheads, fittings, isDeckCell } from './layout.js';

const mat = (color, metalness = 0.15) => new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.57 });
const palette = {
  hull: mat(0xe2eaf0, 0.4), trim: mat(0x2b4055, 0.5), teal: mat(0x4a9fa9),
  cream: mat(0xe5d9bc), gold: mat(0xe8b85f), navy: mat(0x465e81),
  white: mat(0xf1f4f3), dark: mat(0x112b3c), red: mat(0xd27659),
  glow: new THREE.MeshBasicMaterial({ color: 0x91eddd }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x8bd4e9, transparent: true, opacity: 0.29, roughness: 0.15, side: THREE.DoubleSide }),
};
function box(parent, surface, w, h, d, x = 0, y = h / 2, z = 0) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.055, w / 3, h / 3, d / 3)), surface);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, surface, radius, height, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), surface);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function strut(parent, surface, a, b, thickness = 0.10) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const mesh = box(parent, surface, thickness, thickness, start.distanceTo(end));
  mesh.position.copy(start.add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());
  return mesh;
}
function deckShape(parent, points, surface, depth, y) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => i ? shape.lineTo(x, z) : shape.moveTo(x, z));
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), surface);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function screen(parent, x, z, w = 0.8) {
  const { trim, dark, glow, gold } = palette;
  box(parent, trim, w + 0.12, 0.75, 0.55, x, 0.38, z);
  const display = box(parent, dark, w, 0.50, 0.07, x, 1.01, z - 0.12);
  display.rotation.x = -0.25;
  for (let i = 0; i < 3; i++) box(parent, i === 2 ? gold : glow, w * (0.70 - i * 0.12), 0.022, 0.025, x - 0.05, 0.88 + i * 0.11, z - 0.06);
}
function drone(parent) {
  const { trim, white, glow } = palette;
  const group = new THREE.Group();
  box(group, white, 0.6, 0.24, 0.8, 0, 0.08);
  box(group, glow, 0.25, 0.08, 0.08, 0, 0.12, -0.44);
  for (const x of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
    strut(group, trim, [0, 0, 0], [x, 0, z], 0.075);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 8, 20), trim);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.06, z);
    group.add(ring);
    box(group, white, 0.44, 0.025, 0.06, x, 0.06, z);
  }
  parent.add(group);
  return group;
}

export function createAircraft(scene, state) {
  const { hull, trim, teal, cream, gold, navy, white, dark, red, glow, glass } = palette;
  const ship = new THREE.Group();
  scene.add(ship);
  const halfW = WIDTH * CELL_SIZE / 2, halfD = HEIGHT * CELL_SIZE / 2;
  const noseZ = -halfD - 1.7;
  const outline = [[-1.4, noseZ], [1.4, noseZ], [halfW + 0.3, -halfD + 4.1],
    [halfW + 0.3, halfD - 1], [3.1, halfD + 3.6], [-3.1, halfD + 3.6],
    [-halfW - 0.3, halfD - 1], [-halfW - 0.3, -halfD + 4.1]];
  deckShape(ship, outline, trim, 1.15, -0.12);
  deckShape(ship, outline.map(([x, z]) => [x * 1.015, z]), hull, 0.22, -0.015);
  // A deep fuselage keel and swept wings establish a long aircraft silhouette.
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), hull);
  belly.scale.set(halfW * 0.94, 1.25, halfD + 1.5);
  belly.position.y = -2.0;
  ship.add(belly);
  const rotors = [];
  for (const side of [-1, 1]) {
    deckShape(ship, [[side * halfW, -3.2], [side * (halfW + 9.5), 2.3],
      [side * (halfW + 9.0), 5.6], [side * halfW, 2.7]], hull, 0.25, -0.65);
    strut(ship, teal, [side * (halfW + 8.7), -0.4, 2.4], [side * (halfW + 8.4), -0.4, 5.4], 0.22);
    strut(ship, gold, [side * (halfW + 2), -0.38, 0], [side * (halfW + 7.7), -0.38, 3.1], 0.12);
    for (const offset of [3.1, 6.8]) {
      const engineX = side * (halfW + offset), engineZ = offset * 0.43;
      const nacelle = cylinder(ship, trim, 0.63, 3.4, engineX, -0.65, engineZ);
      nacelle.rotation.x = Math.PI / 2;
      const rotor = new THREE.Group();
      rotor.position.set(engineX, -0.65, engineZ - 1.85);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Group();
        blade.rotation.z = i * Math.PI / 2;
        box(blade, trim, 0.20, 1.65, 0.09, 0, 0.94);
        box(blade, gold, 0.21, 0.23, 0.10, 0, 1.65);
        rotor.add(blade);
      }
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), hull);
      rotor.add(hub);
      ship.add(rotor);
      rotors.push(rotor);
    }
    deckShape(ship, [[side * 1.8, halfD - 1], [side * 8.5, halfD + 2.3],
      [side * 8, halfD + 4], [side * 2, halfD + 2.2]], hull, 0.2, 0.05);
    const fin = box(ship, teal, 0.18, 2.5, 2.5, side * 3.0, 1.0, halfD + 1.8);
    fin.rotation.x = -0.25;
    box(ship, gold, 0.20, 0.12, 1.6, side * 3.0, 2.0, halfD + 1.8);
  }

  const floorGeometry = new RoundedBoxGeometry(CELL_SIZE - 0.025, 0.1, CELL_SIZE - 0.025, 1, 0.01);
  const count = Array.from({ length: WIDTH * HEIGHT }, (_, i) => isDeckCell(i % WIDTH, Math.floor(i / WIDTH))).filter(Boolean).length;
  const tiles = new THREE.InstancedMesh(floorGeometry, white, count);
  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  let tileIndex = 0;
  for (let z = 0; z < HEIGHT; z++) for (let x = 0; x < WIDTH; x++) {
    if (!isDeckCell(x, z)) continue;
    const [wx, wz] = worldPosition(x, z);
    tiles.setMatrixAt(tileIndex, matrix.makeTranslation(wx, -0.05, wz));
    const shade = z < 5 ? 0x8faebd : x >= 4 && x <= 6 ? 0xcbd8df : z < 13 ? 0xe3d7c4 : z < 21 ? 0xa6bdba : 0xb4bac4;
    tiles.setColorAt(tileIndex++, color.setHex(shade).multiplyScalar((x + z) % 2 ? 0.98 : 1.02));
  }
  tiles.receiveShadow = true;
  ship.add(tiles);
  // Segmented, roofless cabins: low walls expose furniture from the fixed camera.
  for (const [x, z] of bulkheads) {
    const [wx, wz] = worldPosition(x, z);
    const horizontal = [5, 13, 21].includes(z) || z === 10 && x > 7;
    box(ship, hull, horizontal ? CELL_SIZE : 0.15, 0.95, horizontal ? 0.15 : CELL_SIZE, wx, 0.47, wz);
    box(ship, teal, horizontal ? CELL_SIZE : 0.18, 0.06, horizontal ? 0.18 : CELL_SIZE, wx, 0.97, wz);
  }
  for (const side of [-1, 1]) {
    box(ship, hull, 0.18, 0.55, HEIGHT * CELL_SIZE - 5.1, side * (halfW + 0.12), 0.25, 2.1);
    box(ship, teal, 0.21, 0.07, HEIGHT * CELL_SIZE - 5.1, side * (halfW + 0.12), 0.56, 2.1);
    for (let z = 5; z < HEIGHT - 1; z += 3) {
      const [, wz] = worldPosition(0, z);
      box(ship, glass, 0.05, 0.75, 1.9, side * (halfW + 0.12), 1.02, wz);
    }
    const start = [side * (halfW + 0.2), 0.9, -halfD + 4.1], end = [side * 1.4, 0.9, noseZ];
    const length = new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end));
    const windshield = box(ship, glass, 0.06, 1.5, length);
    windshield.position.copy(new THREE.Vector3(...start).add(new THREE.Vector3(...end)).multiplyScalar(0.5));
    windshield.rotation.y = Math.atan2(end[0] - start[0], end[2] - start[2]);
    strut(ship, trim, [start[0], 1.7, start[2]], [end[0], 1.7, end[2]], 0.09);
    for (let i = 0; i <= 4; i++) {
      const point = new THREE.Vector3(...start).lerp(new THREE.Vector3(...end), i / 4);
      box(ship, trim, 0.07, 1.65, 0.07, point.x, 0.85, point.z);
    }
  }
  box(ship, glass, 2.8, 1.5, 0.06, 0, 0.9, noseZ);
  // Corridor guide lights and doorway thresholds.
  for (let z = 5; z < HEIGHT; z++) {
    const [, wz] = worldPosition(5, z);
    for (const x of [-1.65, 1.65]) box(ship, glow, 0.035, 0.012, 0.7, x, 0.012, wz);
  }
  const stations = [], animated = {};
  for (const fitting of fittings) {
    const { kind, x, z, w = 1, d = 1, station } = fitting;
    const group = new THREE.Group();
    group.name = kind;
    const [wx, wz] = worldPosition(x + (w - 1) / 2, z + (d - 1) / 2);
    group.position.set(wx, 0, wz);
    ship.add(group);
    const fw = w * CELL_SIZE - 0.18, fd = d * CELL_SIZE - 0.18;
    if (station) { group.userData.station = station; stations.push(group); animated[station] = { root: group, active: 0 }; }
    if (kind === 'console') {
      if (w > 1) for (let i = 0; i < w; i++) screen(group, (i - (w - 1) / 2) * CELL_SIZE, 0);
      else for (let i = 0; i < d; i++) screen(group, 0, (i - (d - 1) / 2) * CELL_SIZE);
    } else if (kind === 'chair') {
      cylinder(group, trim, 0.25, 0.42, 0, 0.21, 0);
      box(group, navy, 0.65, 0.20, 0.65, 0, 0.53);
      box(group, navy, 0.66, 0.65, 0.14, 0, 0.85, 0.29);
    } else if (kind === 'bed' || kind === 'medical') {
      box(group, trim, fw, 0.35, fd, 0, 0.18);
      box(group, white, fw - 0.08, 0.2, fd - 0.06, 0, 0.45);
      box(group, kind === 'medical' ? teal : navy, fw * 0.85, 0.08, fd * 0.65, 0, 0.59, fd * 0.12);
      box(group, cream, fw * 0.80, 0.16, fd * 0.23, 0, 0.62, -fd * 0.32);
      if (kind === 'medical') { box(group, red, 0.32, 0.04, 0.10, 0, 0.66); box(group, red, 0.10, 0.04, 0.32, 0, 0.66); }
    } else if (kind === 'locker' || kind === 'lifeSupport') {
      box(group, trim, fw, 1.6, fd, 0, 0.8);
      box(group, kind === 'locker' ? cream : teal, fw - 0.12, 1.4, 0.05, 0, 0.8, fd / 2);
      for (let i = 0; i < 4; i++) box(group, dark, fw * 0.5, 0.035, 0.03, 0, 1.1 + i * 0.09, fd / 2 + 0.03);
      box(group, gold, 0.06, 0.20, 0.04, fw * 0.3, 0.7, fd / 2 + 0.03);
    } else if (kind === 'galley' || kind === 'workbench') {
      box(group, cream, fw, 0.8, fd, 0, 0.4);
      box(group, trim, fw + 0.04, 0.08, fd, 0, 0.84);
      if (kind === 'galley') {
        box(group, dark, 0.65, 0.04, 0.56, -fw * 0.30, 0.9);
        for (const dx of [-0.15, 0.15]) cylinder(group, gold, 0.10, 0.025, -fw * 0.30 + dx, 0.94, 0);
        box(group, teal, 0.7, 0.03, 0.5, fw * 0.15, 0.91);
        strut(group, hull, [fw * 0.15, 0.9, -0.2], [fw * 0.15, 1.25, -0.2], 0.06);
        box(group, hull, 0.6, 0.48, 0.45, fw * 0.36, 1.13);
        box(group, dark, 0.4, 0.26, 0.03, fw * 0.36, 1.16, 0.24);
      } else {
        box(group, navy, fw * 0.75, 0.75, 0.10, 0, 1.28, -fd * 0.4);
        for (let i = 0; i < 5; i++) box(group, gold, 0.06, 0.35, 0.06, -0.65 + i * 0.30, 1.32, -fd * 0.33);
        box(group, red, 0.52, 0.23, 0.36, 0.4, 1.0);
      }
    } else if (kind === 'table') {
      cylinder(group, trim, 0.16, 0.8, 0, 0.4, 0);
      box(group, cream, fw, 0.10, fd, 0, 0.85);
      cylinder(group, gold, 0.09, 0.14, 0.25, 0.97, 0.16);
      box(group, teal, 0.35, 0.03, 0.4, -0.2, 0.92);
    } else if (kind === 'shower') {
      box(group, white, fw, 0.13, fd);
      box(group, glass, 0.05, 1.8, fd, fw / 2, 0.9);
      box(group, glass, fw, 1.8, 0.05, 0, 0.9, -fd / 2);
      strut(group, hull, [0.2, 0.4, -0.4], [0.2, 1.65, -0.4], 0.055);
      cylinder(group, trim, 0.17, 0.06, 0.2, 1.65, -0.2);
    } else if (kind === 'toilet') {
      cylinder(group, white, 0.30, 0.48, 0, 0.24, 0.1);
      cylinder(group, trim, 0.23, 0.035, 0, 0.50, 0.1);
      box(group, white, 0.6, 0.75, 0.25, 0, 0.4, -0.30);
    } else if (kind === 'recharge') {
      box(group, trim, fw, 0.14, fd);
      for (const dx of [-0.55, 0.55]) {
        box(group, teal, 0.66, 1.0, 0.75, dx, 0.63);
        box(group, gold, 0.69, 0.10, 0.78, dx, 1.19);
        for (let i = 0; i < 4; i++) box(group, glow, 0.32, 0.07, 0.035, dx, 0.4 + i * 0.19, 0.4);
      }
      animated.recharge.lamp = box(group, glow, fw * 0.8, 0.04, 0.12, 0, 0.17, fd * 0.46);
    } else if (kind === 'drone') {
      box(group, trim, fw, 0.16, fd);
      box(group, teal, fw - 0.2, 0.03, fd - 0.2, 0, 0.18);
      for (const dz of [-0.80, 0.80]) box(group, gold, fw - 0.15, 0.02, 0.08, 0, 0.21, dz);
      const vehicle = drone(group);
      vehicle.name = 'recon-drone';
      vehicle.position.y = 0.42;
      animated.drone.vehicle = vehicle;
      for (const dx of [-1.2, 1.2]) box(group, glow, 0.08, 0.03, fd * 0.7, dx, 0.22);
    } else if (kind === 'radar') {
      screen(group, -0.35, 0, 0.85);
      const dish = new THREE.Group();
      dish.position.set(0.65, 1.05, 0);
      cylinder(group, hull, 0.20, 1.0, 0.65, 0.5, 0);
      const reflector = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), teal);
      reflector.rotation.x = 0.75;
      reflector.scale.y = 0.35;
      dish.add(reflector);
      strut(dish, gold, [0, 0, 0], [0, 0.5, 0.2], 0.05);
      group.add(dish);
      animated.radar.dish = dish;
    } else if (kind === 'payloadRack') {
      for (const dx of [-fw / 2, fw / 2]) box(group, trim, 0.10, 1.4, fd, dx, 0.7);
      for (const height of [0.12, 0.85]) {
        box(group, hull, fw, 0.10, fd, 0, height);
        for (const dx of [-0.55, 0.55]) {
          const capsule = cylinder(group, navy, 0.23, 1.2, dx, height + 0.29, 0);
          capsule.rotation.x = Math.PI / 2;
          box(group, gold, 0.48, 0.06, 0.18, dx, height + 0.30, -0.48);
        }
      }
    } else if (kind === 'payload') {
      box(group, dark, fw, 0.12, fd);
      for (const dx of [-fw * 0.27, fw * 0.27]) box(group, navy, fw * 0.45, 0.06, fd - 0.15, dx, 0.11);
      for (let i = 0; i < 7; i++) {
        const stripe = box(group, gold, 0.11, 0.025, 0.32, -fw / 2 + 0.3 + i * 0.43, 0.16, fd / 2 - 0.15);
        stripe.rotation.y = -0.5;
      }
      const capsule = cylinder(scene, navy, 0.30, 1.25, group.position.x, -1, group.position.z);
      capsule.name = 'released-payload';
      capsule.visible = false;
      animated.payload.capsule = capsule;
    } else if (kind === 'cargoRack') {
      for (const dx of [-fw / 2, fw / 2]) box(group, trim, 0.09, 1.8, fd, dx, 0.9);
      for (const height of [0.08, 0.9]) {
        box(group, hull, fw, 0.08, fd, 0, height);
        for (const dz of [-1.0, 0, 1.0]) box(group, cream, fw * 0.80, 0.65, 0.88, 0, height + 0.37, dz);
      }
    } else if (kind === 'logistics') {
      box(group, trim, fw, 0.3, fd);
      for (let i = 0; i < 10; i++) {
        const roller = cylinder(group, hull, 0.07, fd * 0.9, -fw / 2 + 0.2 + i * (fw - 0.4) / 9, 0.34, 0);
        roller.rotation.x = Math.PI / 2;
      }
      const cargo = box(group, cream, 0.65, 0.65, 0.65, -0.8, 0.72);
      cargo.name = 'conveyor-cargo';
      box(cargo, teal, 0.12, 0.025, 0.66, 0, 0.34);
      animated.logistics.cargo = cargo;
    }
  }
  const crates = state.crates.map((crate) => {
    const group = new THREE.Group();
    const [x, z] = worldPosition(crate.x, crate.z);
    group.position.set(x, 0, z);
    scene.add(group);
    const battery = crate.kind === 'battery', toolbox = crate.kind === 'toolbox';
    box(group, battery ? trim : toolbox ? red : cream, 0.78, toolbox ? 0.42 : 0.70, 0.78);
    box(group, battery ? gold : trim, 0.83, 0.10, 0.83, 0, toolbox ? 0.46 : 0.73);
    if (battery) for (const dx of [-0.22, 0.22]) box(group, dx < 0 ? teal : red, 0.16, 0.12, 0.16, dx, 0.86);
    else if (toolbox) {
      for (const dx of [-0.17, 0.17]) box(group, hull, 0.06, 0.18, 0.12, dx, 0.60);
      box(group, hull, 0.4, 0.06, 0.12, 0, 0.71);
    } else box(group, teal, 0.15, 0.025, 0.83, 0, 0.80);
    return group;
  });
  return {
    crates, stations,
    interact(id) {
      const station = animated[id];
      if (!station || station.active > 0) return false;
      station.active = id === 'drone' ? 10 : 4;
      return true;
    },
    reset() { Object.values(animated).forEach((station) => { station.active = 0; }); },
    update(delta) {
      rotors.forEach((rotor, i) => { rotor.rotation.z = (rotor.rotation.z + delta * (i % 2 ? -25 : 25)) % (Math.PI * 2); });
      for (const station of Object.values(animated)) station.active = Math.max(0, station.active - delta);
      const flight = animated.drone;
      const t = 10 - flight.active;
      flight.vehicle.position.set(flight.active ? Math.sin(t * Math.PI / 10) * 9 : 0,
        0.42 + (flight.active ? Math.sin(t * Math.PI / 10) * 4 : 0), flight.active ? -Math.sin(t * Math.PI / 10) * 6 : 0);
      flight.vehicle.rotation.y += delta * (flight.active ? 1.4 : 0.12);
      animated.radar.dish.rotation.y += delta * (animated.radar.active ? 3 : 0.7);
      animated.recharge.lamp.scale.x = animated.recharge.active ? 0.6 + Math.abs(Math.sin(animated.recharge.active * 6)) * 0.4 : 1;
      animated.logistics.cargo.position.x = animated.logistics.active ? -0.8 + Math.sin((4 - animated.logistics.active) * Math.PI / 4) * 1.6 : -0.8;
      const drop = animated.payload;
      drop.capsule.visible = drop.active > 0;
      drop.capsule.position.y = -1.5 - (4 - drop.active) * (4 - drop.active) * 1.6;
      drop.capsule.rotation.z += delta * 0.4;
    },
  };
}

export function createSky(scene) {
  const clouds = [], surface = mat(0xffffff, 0), geometry = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 22; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const puff = new THREE.Mesh(geometry, surface);
      puff.position.set((j - 2) * 1.2, Math.sin(j * 2.3 + i) * 0.25, Math.cos(j + i) * 0.5);
      puff.scale.set(1.6, 0.5 + (j % 2) * 0.25, 0.95);
      cloud.add(puff);
    }
    cloud.position.set(((i * 13) % 57) - 28, -5.5 - (i % 4) * 1.6, ((i * 19) % 75) - 37);
    scene.add(cloud);
    clouds.push(cloud);
  }
  return (delta) => clouds.forEach((cloud) => { cloud.position.z += delta * 0.65; if (cloud.position.z > 39) cloud.position.z = -39; });
}
