import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CELL_SIZE, WIDTH, HEIGHT, worldPosition } from './workshop.js';
import { createFigure } from './figures.js';

const material = (color, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness });

function box(parent, surface, width, height, depth, x, y, z, radius = 0.035) {
  const object = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, radius), surface);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function createRoom(scene, state) {
  const floor = material(0x69766d);
  const trim = material(0x273f43, 0.2);
  const metal = material(0x91a69b, 0.3);
  const wood = material(0xa87644);
  const edge = material(0xd6a56a);
  const dark = material(0x3a4e4c);
  const teal = material(0x4f8c86);
  const orange = material(0xdc9a4b);

  box(scene, trim, WIDTH * CELL_SIZE + 0.34, 0.3, HEIGHT * CELL_SIZE + 0.34, 0, -0.23, 0, 0.13);
  const tiles = new THREE.InstancedMesh(
    new RoundedBoxGeometry(CELL_SIZE - 0.035, 0.15, CELL_SIZE - 0.035, 1, 0.018),
    floor, WIDTH * HEIGHT,
  );
  const transform = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let z = 0; z < HEIGHT; z += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const [wx, wz] = worldPosition(x, z);
      const index = z * WIDTH + x;
      tiles.setMatrixAt(index, transform.makeTranslation(wx, -0.075, wz));
      tiles.setColorAt(index, color.setHex((x + z) % 2 ? 0x9da591 : 0xa6ad99));
    }
  }
  tiles.receiveShadow = true;
  scene.add(tiles);

  const backZ = -HEIGHT * CELL_SIZE / 2 - 0.12;
  const leftX = -WIDTH * CELL_SIZE / 2 - 0.12;
  box(scene, dark, WIDTH * CELL_SIZE + 0.34, 0.65, 0.18, 0, 0.16, backZ);
  box(scene, dark, 0.18, 0.65, HEIGHT * CELL_SIZE + 0.34, leftX, 0.16, 0);
  box(scene, metal, WIDTH * CELL_SIZE + 0.35, 0.06, 0.23, 0, 0.51, backZ);
  box(scene, metal, 0.23, 0.06, HEIGHT * CELL_SIZE + 0.35, leftX, 0.51, 0);

  // Workbenches occupy the same three cells reserved in the movement map.
  for (const centerX of [2, 8]) {
    const [x, z] = worldPosition(centerX, 1);
    box(scene, dark, CELL_SIZE * 3 - 0.14, 0.13, 0.92, x, 0.79, z);
    box(scene, wood, CELL_SIZE * 3 - 0.10, 0.14, 0.94, x, 0.92, z);
    for (const side of [-1, 1]) {
      box(scene, trim, 0.15, 0.77, 0.72, x + side * 1.43, 0.38, z);
    }
    box(scene, teal, 0.51, 0.44, 0.43, x - 0.65, 1.21, z);
    box(scene, dark, 0.38, 0.28, 0.025, x - 0.65, 1.24, z + 0.23);
    box(scene, metal, 0.65, 0.08, 0.40, x + 0.65, 1.04, z);
    for (let i = 0; i < 3; i += 1) {
      box(scene, orange, 0.10, 0.07, 0.28, x + 0.45 + i * 0.17, 1.10, z);
    }
  }

  for (const column of [1, 9]) {
    const [x, z] = worldPosition(column, 7);
    box(scene, trim, 0.86, 0.1, 0.86, x, 0.05, z);
    box(scene, teal, 0.72, 0.63, 0.72, x, 0.40, z, 0.10);
    box(scene, metal, 0.78, 0.08, 0.78, x, 0.73, z);
    box(scene, orange, 0.26, 0.10, 0.29, x, 0.82, z);
  }

  return state.crates.map((crate, index) => {
    const group = crate.figure ? createFigure(crate.figure) : new THREE.Group();
    const [x, z] = worldPosition(crate.x, crate.z);
    group.position.set(x, 0, z);
    if (crate.figure) {
      scene.add(group);
      return group;
    }
    box(group, wood, 0.82, 0.70, 0.82, 0, 0.37, 0);
    for (const side of [-1, 1]) {
      box(group, edge, 0.91, 0.105, 0.91, 0, 0.37 + side * 0.30, 0);
      box(group, edge, 0.10, 0.60, 0.90, side * 0.38, 0.37, 0);
      box(group, edge, 0.90, 0.60, 0.10, 0, 0.37, side * 0.38);
    }
    // Inset wood panels with diagonal bracing on both visible faces.
    box(group, wood, 0.64, 0.47, 0.025, 0, 0.37, 0.462);
    const brace = box(group, edge, 0.075, 0.69, 0.055, 0, 0.37, 0.485);
    brace.rotation.z = -Math.PI / 4;
    box(group, wood, 0.025, 0.47, 0.64, 0.462, 0.37, 0);
    const sideBrace = box(group, edge, 0.055, 0.69, 0.075, 0.485, 0.37, 0);
    sideBrace.rotation.x = Math.PI / 4;
    box(group, index % 2 ? teal : orange, 0.17, 0.025, 0.91, 0, 0.735, 0);
    scene.add(group);
    return group;
  });
}
