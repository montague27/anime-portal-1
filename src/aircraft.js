import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CELL_SIZE, WIDTH, HEIGHT, worldPosition, bulkheads } from './workshop.js';

const material = (color, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness });
function box(parent, surface, w, h, d, x, y, z, radius = 0.04) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), surface);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createAircraft(scene, state) {
  const hull = material(0xe1eaf0, 0.35), trim = material(0x30495f, 0.4);
  const teal = material(0x49a9b5), cream = material(0xf3e9d7), gold = material(0xeebc68);
  const navy = material(0x354e70), white = material(0xf5f7fa), dark = material(0x162f46);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x7ccfe9, transparent: true, opacity: 0.42, roughness: 0.15, side: THREE.DoubleSide });
  const glow = new THREE.MeshBasicMaterial({ color: 0x8af4ee });
  const ship = new THREE.Group();
  const propellers = [];
  scene.add(ship);
  const halfW = WIDTH * CELL_SIZE / 2, halfD = HEIGHT * CELL_SIZE / 2;

  // A broad winged fuselage underneath the roofless, playable cabin.
  box(ship, trim, halfW * 2 + 0.55, 0.65, halfD * 2 + 0.6, 0, -0.49, 0, 0.22);
  box(ship, hull, halfW * 2 + 0.7, 0.23, halfD * 2 + 0.75, 0, -0.17, 0, 0.09);
  const noseTip = -halfD - 7;
  const noseOutline = new THREE.Shape();
  noseOutline.moveTo(-halfW - 0.35, -halfD - 0.3);
  noseOutline.lineTo(0, noseTip);
  noseOutline.lineTo(halfW + 0.35, -halfD - 0.3);
  noseOutline.closePath();
  const nose = new THREE.Mesh(new THREE.ExtrudeGeometry(noseOutline, {
    depth: 0.65, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.08, bevelSegments: 2, steps: 1,
  }), hull);
  nose.rotation.x = Math.PI / 2;
  nose.position.y = -0.1;
  nose.castShadow = true;
  nose.receiveShadow = true;
  ship.add(nose);
  // Two sloping windshield edges make the forward silhouette unmistakably ^ shaped.
  for (const side of [-1, 1]) {
    const start = new THREE.Vector3(side * (halfW + 0.25), 0, -halfD - 0.08);
    const end = new THREE.Vector3(0, 0, noseTip);
    const distance = start.distanceTo(end);
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const yaw = Math.atan2(end.x - start.x, end.z - start.z);
    for (const [surface, y, thickness, height] of [[teal, 0.12, 0.24, 0.18], [glass, 0.85, 0.05, 1.25], [trim, 1.52, 0.10, 0.08]]) {
      const rail = box(ship, surface, thickness, height, distance, midpoint.x, y, midpoint.z);
      rail.rotation.y = yaw;
    }
    for (let i = 0; i <= 5; i++) {
      const post = start.clone().lerp(end, i / 5);
      box(ship, trim, 0.08, 1.45, 0.08, post.x, 0.78, post.z);
    }
    const stripe = box(ship, gold, 0.12, 0.02, distance * 0.80, midpoint.x * 0.82, -0.005, midpoint.z - 0.2);
    stripe.rotation.y = yaw;
  }
  // Forward avionics fairing sits beyond the main cabin's console bank.
  box(ship, trim, 2.0, 0.25, 3.8, 0, 0.05, -halfD - 2.2, 0.10);
  box(ship, teal, 1.5, 0.08, 2.7, 0, 0.21, -halfD - 2.2);
  for (let i = 0; i < 6; i++) box(ship, glow, 0.75, 0.025, 0.07, 0, 0.26, -halfD - 1.1 - i * 0.38);
  for (const side of [-1, 1]) {
    const wing = box(ship, hull, 5.7, 0.24, 4.5, side * (halfW + 2.2), -0.75, 1.3, 0.09);
    wing.rotation.y = side * -0.23;
    box(ship, teal, 0.28, 0.15, 3.1, side * (halfW + 4.7), -0.58, 1.7);
    box(ship, gold, 2.5, 0.04, 0.25, side * (halfW + 2.3), -0.59, 2.2);
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 3.7, 32), trim);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(side * (halfW + 2.1), -0.35, 0.8);
    ship.add(engine);
    for (const z of [-1.08, 2.68]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.11, 12, 32), hull);
      ring.position.set(engine.position.x, -0.35, z);
      ship.add(ring);
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), z < 0 ? dark : glow);
      core.position.copy(ring.position);
      if (z < 0) core.rotation.y = Math.PI;
      ship.add(core);
    }
    const rotor = new THREE.Group();
    rotor.position.set(engine.position.x, -0.35, -1.34);
    for (let bladeIndex = 0; bladeIndex < 3; bladeIndex++) {
      const blade = new THREE.Group();
      blade.rotation.z = bladeIndex * Math.PI * 2 / 3;
      box(blade, trim, 0.24, 2.05, 0.10, 0, 1.02, 0, 0.07);
      box(blade, gold, 0.25, 0.30, 0.11, 0, 1.89, 0, 0.04);
      rotor.add(blade);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 12), hull);
    hub.scale.z = 1.5;
    rotor.add(hub);
    ship.add(rotor);
    propellers.push(rotor);
    const tail = box(ship, hull, 4.2, 0.18, 1.7, side * 2.8, -0.2, halfD + 1.1);
    tail.rotation.y = side * -0.18;
  }
  box(ship, trim, 1.4, 0.6, 3.0, 0, -0.3, halfD + 0.8);
  const fin = box(ship, teal, 0.18, 2.2, 2.1, 0, 0.5, halfD + 1.3);
  fin.rotation.x = -0.3;

  const tiles = new THREE.InstancedMesh(new RoundedBoxGeometry(CELL_SIZE - 0.025, 0.10, CELL_SIZE - 0.025, 1, 0.01), white, WIDTH * HEIGHT);
  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  for (let z = 0; z < HEIGHT; z++) for (let x = 0; x < WIDTH; x++) {
    const [wx, wz] = worldPosition(x, z), i = z * WIDTH + x;
    tiles.setMatrixAt(i, matrix.makeTranslation(wx, -0.05, wz));
    const shades = z <= 2 ? [0x6e9fae, 0x76a6b4] : x < 4 ? [0xdacbb7, 0xe2d3bf] : [0xcbd6dd, 0xd4dee4];
    tiles.setColorAt(i, color.setHex(shades[(x + z) % 2]));
  }
  tiles.receiveShadow = true;
  ship.add(tiles);

  // Glazed back walls and low cutaway edges preserve the existing isometric view.
  for (const side of [-1, 1]) {
    box(ship, hull, 0.20, 0.55, halfD * 2, side * (halfW + 0.1), 0.24, 0);
    box(ship, teal, 0.23, 0.08, halfD * 2, side * (halfW + 0.1), 0.55, 0);
  }
  for (let z = 1; z < HEIGHT; z += 2) {
    const [, wz] = worldPosition(0, z);
    box(ship, glass, 0.04, 0.75, 1.7, -halfW - 0.1, 1.0, wz);
    box(ship, trim, 0.09, 1.25, 0.09, -halfW - 0.1, 0.8, wz - 0.9);
  }
  for (const [x, z] of bulkheads) {
    const [wx, wz] = worldPosition(x, z);
    const horizontal = z === 3;
    box(ship, hull, horizontal ? CELL_SIZE : 0.14, 0.75, horizontal ? 0.14 : CELL_SIZE, wx, 0.37, wz);
    box(ship, teal, horizontal ? CELL_SIZE : 0.17, 0.06, horizontal ? 0.17 : CELL_SIZE, wx, 0.77, wz);
  }
  for (const [x, z] of [[2, 3], [7, 3], [8, 3], [4, 6], [4, 7]]) {
    const [wx, wz] = worldPosition(x, z);
    box(ship, glow, z === 3 ? 1.0 : 0.13, 0.015, z === 3 ? 0.13 : 1.0, wx, 0.008, wz);
  }

  // Flight consoles, screens, and pilot seats.
  for (const x of [1, 2, 3, 5, 6, 8, 9, 11, 12, 13]) {
    const [wx, wz] = worldPosition(x, 0);
    box(ship, trim, 1.05, 0.68, 0.8, wx, 0.34, wz);
    const screen = box(ship, dark, 0.88, 0.48, 0.07, wx, 0.94, wz - 0.13);
    screen.rotation.x = -0.2;
    for (let i = 0; i < 3; i++) box(ship, i === 2 ? gold : glow, 0.45 - i * 0.09, 0.025, 0.025, wx - 0.1, 0.84 + i * 0.11, wz - 0.07);
    box(ship, teal, 0.94, 0.055, 0.30, wx, 0.70, wz + 0.28);
    for (let i = 0; i < 4; i++) box(ship, i % 2 ? gold : white, 0.07, 0.025, 0.07, wx - 0.3 + i * 0.18, 0.74, wz + 0.28);
  }
  for (const x of [5, 9]) {
    const [wx, wz] = worldPosition(x, 1);
    box(ship, trim, 0.12, 0.45, 0.12, wx, 0.23, wz);
    box(ship, navy, 0.64, 0.18, 0.66, wx, 0.53, wz);
    box(ship, navy, 0.65, 0.68, 0.16, wx, 0.86, wz + 0.30);
  }
  for (const row of [5, 8, 11]) {
    const [wx, wz] = worldPosition(1.5, row);
    box(ship, trim, 2.13, 0.33, 0.92, wx, 0.17, wz);
    box(ship, cream, 2.08, 0.21, 0.89, wx, 0.44, wz, 0.09);
    box(ship, row === 5 ? teal : navy, 1.38, 0.08, 0.91, wx + 0.30, 0.59, wz);
    box(ship, white, 0.42, 0.16, 0.68, wx - 0.71, 0.61, wz, 0.07);
    box(ship, gold, 0.08, 0.55, 0.78, wx - 1.08, 0.5, wz);
  }
  for (const row of [7, 9]) {
    const [wx, wz] = worldPosition(WIDTH - 2.5, row);
    box(ship, trim, 2.12, 0.24, 0.88, wx, 0.15, wz);
    box(ship, teal, 2.12, 0.23, 0.85, wx, 0.38, wz, 0.09);
    box(ship, navy, 2.14, 0.63, 0.18, wx, 0.64, wz + (row === 7 ? -0.37 : 0.37));
    for (const side of [-1, 1]) box(ship, navy, 0.14, 0.43, 0.85, wx + side * 1.02, 0.48, wz);
  }
  for (const column of [WIDTH - 3, WIDTH - 2]) {
    const [wx, wz] = worldPosition(column, 5);
    box(ship, cream, 1.10, 0.77, 0.90, wx, 0.38, wz);
    box(ship, trim, 1.13, 0.07, 0.94, wx, 0.80, wz);
    box(ship, teal, 0.52, 0.06, 0.42, wx, 0.85, wz);
    box(ship, gold, 0.16, 0.19, 0.16, wx + 0.3, 0.93, wz);
  }

  const crates = state.crates.map((crate, index) => {
    const group = new THREE.Group();
    const [x, z] = worldPosition(crate.x, crate.z);
    group.position.set(x, 0, z);
    if (crate.kind === 'battery') {
      box(group, trim, 0.86, 0.77, 0.83, 0, 0.40, 0, 0.07);
      box(group, gold, 0.88, 0.13, 0.85, 0, 0.79, 0);
      for (const side of [-1, 1]) {
        box(group, side < 0 ? teal : material(0xe66d5a), 0.19, 0.15, 0.19, side * 0.25, 0.93, 0);
        box(group, hull, 0.07, 0.62, 0.86, side * 0.31, 0.39, 0);
      }
      box(group, dark, 0.39, 0.21, 0.03, 0, 0.46, 0.43);
      for (let i = 0; i < 3; i++) box(group, glow, 0.075, 0.11, 0.035, -0.11 + i * 0.11, 0.46, 0.45);
    } else if (crate.kind === 'toolbox') {
      const red = material(0xd67250, 0.25);
      box(group, red, 0.93, 0.44, 0.68, 0, 0.26, 0, 0.07);
      box(group, trim, 0.96, 0.13, 0.71, 0, 0.54, 0);
      box(group, hull, 0.43, 0.07, 0.12, 0, 0.77, 0);
      for (const side of [-1, 1]) {
        box(group, hull, 0.07, 0.19, 0.12, side * 0.18, 0.68, 0);
        box(group, gold, 0.10, 0.19, 0.045, side * 0.28, 0.47, 0.36);
      }
    } else {
    box(group, cream, 0.83, 0.70, 0.83, 0, 0.37, 0, 0.07);
    for (const side of [-1, 1]) {
      box(group, trim, 0.89, 0.07, 0.89, 0, 0.37 + side * 0.28, 0);
      box(group, trim, 0.08, 0.62, 0.87, side * 0.36, 0.37, 0);
    }
    box(group, index % 2 ? teal : gold, 0.18, 0.025, 0.86, 0, 0.735, 0);
    box(group, trim, 0.32, 0.12, 0.03, 0, 0.43, 0.43);
    }
    scene.add(group);
    return group;
  });
  return {
    crates,
    update(delta) {
      propellers.forEach((rotor, index) => { rotor.rotation.z = (rotor.rotation.z + delta * (index ? -24 : 24)) % (Math.PI * 2); });
    },
  };
}

export function createSky(scene) {
  const clouds = [];
  const surface = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85 });
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 17; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const puff = new THREE.Mesh(geometry, surface);
      puff.position.set((j - 2) * 1.2, Math.sin(j * 2.3 + i) * 0.25, Math.cos(j + i) * 0.5);
      puff.scale.set(1.6, 0.5 + (j % 2) * 0.25, 0.95);
      cloud.add(puff);
    }
    cloud.position.set(((i * 13) % 49) - 24, -4.5 - (i % 4) * 1.6, ((i * 19) % 53) - 26);
    cloud.userData.speed = 0.35 + (i % 3) * 0.18;
    scene.add(cloud);
    clouds.push(cloud);
  }
  return (delta) => {
    for (const cloud of clouds) {
      cloud.position.z += delta * cloud.userData.speed;
      if (cloud.position.z > 29) cloud.position.z = -29;
    }
  };
}
