import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const surface = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
const skin = surface(0xffdec6);
const white = surface(0xfffaf0);
const black = surface(0x202332);
const pink = surface(0xec5b93);
const teal = surface(0x39c5c5);
const gold = surface(0xf8c65d);
const silver = surface(0xa7bdc5);
const navy = surface(0x283348);
const violet = surface(0x655080);
const blush = surface(0xf3a2a1);
const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
const characters = {
  miku: { name: 'Miku', hair: teal, eyes: teal, outfit: silver, base: 0x39c5c5 },
  emu: { name: 'Emu Otori', hair: pink, eyes: pink, outfit: white, base: 0xf178ad },
  aki: { name: 'Aki', hair: navy, eyes: surface(0x658faf), outfit: navy, base: 0x7f9bba },
  reze: { name: 'Reze', hair: violet, eyes: surface(0x6d9c6d), outfit: white, base: 0xb394cf },
};

function add(parent, geometry, material, x, y, z) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = true;
  part.receiveShadow = true;
  parent.add(part);
  return part;
}

function oval(parent, material, x, y, z, width, height, depth) {
  const part = add(parent, new THREE.SphereGeometry(1, 20, 14), material, x, y, z);
  part.scale.set(width, height, depth);
  return part;
}

function box(parent, material, x, y, z, width, height, depth, radius = 0.015) {
  return add(parent, new RoundedBoxGeometry(width, height, depth, 2, radius), material, x, y, z);
}

function strand(parent, material, points, radius, tip = 0.004) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const geometry = new THREE.TubeGeometry(curve, 12, radius, 8, false);
  const position = geometry.attributes.position;
  for (let ring = 0; ring <= 12; ring += 1) {
    const center = curve.getPointAt(ring / 12);
    const taper = THREE.MathUtils.lerp(1, tip / radius, Math.pow(ring / 12, 2));
    for (let side = 0; side <= 8; side += 1) {
      const index = ring * 9 + side;
      const point = new THREE.Vector3().fromBufferAttribute(position, index).sub(center).multiplyScalar(taper).add(center);
      position.setXYZ(index, point.x, point.y, point.z);
    }
  }
  geometry.computeVertexNormals();
  return add(parent, geometry, material, 0, 0, 0);
}

function ribbon(parent, material, x, y, z, size) {
  const left = oval(parent, material, x - size * 0.55, y, z, size * 0.65, size * 0.42, size * 0.20);
  left.rotation.z = -0.3;
  const right = oval(parent, material, x + size * 0.55, y, z, size * 0.65, size * 0.42, size * 0.20);
  right.rotation.z = 0.3;
  oval(parent, material, x, y, z + 0.012, size * 0.24, size * 0.30, size * 0.23);
}

function face(parent, character, kind) {
  oval(parent, skin, 0, 1.04, 0, 0.305, 0.29, 0.255);
  for (const side of [-1, 1]) {
    oval(parent, skin, side * 0.295, 1.02, 0, 0.038, 0.058, 0.043);
    oval(parent, black, side * 0.112, 1.045, 0.234, 0.060, 0.084, 0.016);
    oval(parent, character.eyes, side * 0.112, 1.034, 0.248, 0.043, 0.063, 0.010);
    oval(parent, black, side * 0.112, 1.048, 0.257, 0.018, 0.042, 0.006);
    oval(parent, eyeWhite, side * 0.112 - 0.013, 1.075, 0.262, 0.016, 0.021, 0.005);
    oval(parent, eyeWhite, side * 0.112 + 0.013, 1.011, 0.260, 0.007, 0.009, 0.004);
    oval(parent, blush, side * 0.195, 0.970, 0.210, 0.045, 0.020, 0.008);
    const brow = box(parent, character.hair, side * 0.115, 1.153, 0.220, 0.080, 0.015, 0.012, 0.006);
    brow.rotation.z = kind === 'aki' ? side * 0.18 : -side * 0.12;
  }
  if (kind === 'emu') {
    oval(parent, surface(0x8c354e), 0, 0.938, 0.240, 0.045, 0.043, 0.009);
    oval(parent, blush, 0, 0.921, 0.248, 0.025, 0.013, 0.005);
  } else {
    strand(parent, surface(0x965b62), [
      [-0.035, 0.943, 0.244], [0, kind === 'aki' ? 0.940 : 0.928, 0.250], [0.035, 0.943, 0.244],
    ], 0.007, 0.004);
  }
}

function hair(parent, character, kind) {
  // The cap covers the crown while leaving a clear face below the fringe.
  const cap = add(parent, new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.57),
    character.hair, 0, 1.075, -0.018);
  cap.scale.set(0.327, 0.292, 0.277);
  oval(parent, character.hair, 0, 1.07, -0.10, 0.307, 0.265, 0.20);

  for (const side of [-1, 1]) {
    strand(parent, character.hair, [
      [side * 0.255, 1.24, 0.05], [side * 0.300, 1.08, 0.09], [side * 0.275, 0.89, 0.08],
    ], 0.076, 0.022);
  }
  for (let i = 0; i < 5; i += 1) {
    const x = (i - 2) * 0.102;
    const tipY = kind === 'aki' ? 1.11 + Math.abs(i - 2) * 0.014 : 1.10 - (i % 2) * 0.043;
    strand(parent, character.hair, [
      [x * 0.70, 1.29, 0.15], [x, 1.21, 0.232], [x + 0.035, tipY, 0.251],
    ], 0.075, 0.006);
  }

  if (kind === 'miku') {
    for (const side of [-1, 1]) {
      strand(parent, teal, [
        [side * 0.29, 1.20, -0.045], [side * 0.42, 0.99, -0.08],
        [side * 0.43, 0.61, -0.10], [side * 0.38, 0.27, 0.04],
      ], 0.105, 0.021);
      const clip = box(parent, black, side * 0.300, 1.22, 0.009, 0.10, 0.19, 0.13);
      clip.rotation.z = -side * 0.16;
      box(parent, pink, side * 0.305, 1.22, 0.082, 0.058, 0.12, 0.015);
    }
  }
  if (kind === 'emu') {
    for (const side of [-1, 1]) {
      oval(parent, pink, side * 0.235, 0.96, -0.048, 0.10, 0.18, 0.19);
    }
    ribbon(parent, gold, 0.285, 1.20, 0.10, 0.095);
  }
  if (kind === 'aki') {
    strand(parent, navy, [[0.03, 1.32, -0.13], [0.10, 1.50, -0.17], [0.17, 1.47, -0.20]], 0.060, 0.026);
    box(parent, black, 0.055, 1.34, -0.13, 0.09, 0.035, 0.09);
  }
  if (kind === 'reze') {
    oval(parent, violet, -0.12, 0.86, -0.18, 0.18, 0.15, 0.13);
    strand(parent, violet, [[0.23, 1.25, 0.16], [0.11, 1.17, 0.255], [-0.09, 1.04, 0.259]], 0.083, 0.008);
    ribbon(parent, black, -0.16, 0.80, -0.21, 0.062);
  }
}

export function createFigure(kind) {
  const character = characters[kind];
  if (!character) throw new Error('Unknown figure: ' + kind);
  const root = new THREE.Group();
  root.name = character.name;
  root.userData.figure = kind;
  add(root, new THREE.CylinderGeometry(0.44, 0.46, 0.065, 40),
    surface(character.base), 0, 0.033, 0);
  add(root, new THREE.CylinderGeometry(0.405, 0.405, 0.012, 40),
    surface(0xffefd4), 0, 0.071, 0);

  const body = new THREE.Group();
  body.rotation.y = 0.20;
  root.add(body);
  const suit = kind === 'aki';
  const legs = kind === 'miku' || suit ? black : skin;
  for (const side of [-1, 1]) {
    oval(body, legs, side * 0.105, 0.28, 0, 0.067, 0.19, 0.068);
    box(body, kind === 'emu' ? white : black, side * 0.105, 0.125, 0.04, 0.145, 0.10, 0.20, 0.035);
    if (kind === 'emu') box(body, pink, side * 0.105, 0.13, 0.142, 0.082, 0.03, 0.015);
  }
  add(body, new THREE.CylinderGeometry(0.145, 0.185, 0.35, 16), character.outfit, 0, 0.63, 0);
  oval(body, skin, 0, 0.825, 0, 0.068, 0.08, 0.065);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.155, 0.75, 0);
    arm.rotation.z = side * (kind === 'emu' ? 0.93 : 0.21);
    if (kind === 'emu' && side === -1) arm.rotation.z = -2.15;
    body.add(arm);
    oval(arm, suit ? navy : skin, side * 0.035, -0.11, 0, 0.055, 0.15, 0.058);
    if (kind === 'miku') oval(arm, black, side * 0.045, -0.17, 0, 0.062, 0.11, 0.063);
    if (kind === 'emu') oval(arm, white, side * 0.02, -0.035, 0, 0.090, 0.08, 0.075);
    oval(arm, skin, side * 0.055, -0.26, 0.008, 0.062, 0.064, 0.057);
  }

  if (kind === 'miku' || kind === 'emu') {
    const skirt = add(body, new THREE.CylinderGeometry(0.16, 0.255, 0.21, 16),
      kind === 'miku' ? black : pink, 0, 0.45, 0);
    skirt.rotation.y = Math.PI / 16;
    add(body, new THREE.CylinderGeometry(0.249, 0.26, 0.035, 16),
      kind === 'miku' ? teal : white, 0, 0.36, 0);
    for (let i = 0; i < 12; i += 1) {
      const angle = i * Math.PI / 6;
      strand(body, kind === 'miku' ? navy : surface(0xfa95bc), [
        [Math.sin(angle) * 0.17, 0.53, Math.cos(angle) * 0.17],
        [Math.sin(angle) * 0.25, 0.36, Math.cos(angle) * 0.25],
      ], 0.008, 0.006);
    }
  }
  if (kind === 'miku') {
    strand(body, teal, [[0, 0.79, 0.15], [-0.015, 0.68, 0.174], [0, 0.53, 0.19]], 0.030, 0.018);
    box(body, gold, -0.10, 0.72, 0.141, 0.040, 0.018, 0.012);
  }
  if (kind === 'emu') {
    box(body, pink, 0, 0.64, 0.162, 0.16, 0.25, 0.04, 0.025);
    ribbon(body, gold, 0, 0.77, 0.188, 0.075);
    for (const y of [0.60, 0.68]) oval(body, gold, 0, y, 0.190, 0.017, 0.017, 0.008);
  }
  if (kind === 'aki') {
    box(body, white, 0, 0.70, 0.144, 0.12, 0.21, 0.035);
    strand(body, black, [[0, 0.79, 0.17], [0, 0.68, 0.18], [0, 0.55, 0.19]], 0.024, 0.014);
    for (const side of [-1, 1]) {
      const lapel = box(body, navy, side * 0.075, 0.69, 0.174, 0.050, 0.21, 0.020);
      lapel.rotation.z = side * -0.24;
      oval(body, silver, side * 0.294, 0.98, 0.039, 0.012, 0.019, 0.012);
    }
    const sheath = box(body, black, -0.19, 0.67, -0.17, 0.053, 0.81, 0.059);
    sheath.rotation.z = -0.27;
    box(body, silver, -0.075, 1.04, -0.17, 0.14, 0.024, 0.08);
  }
  if (kind === 'reze') {
    box(body, black, 0, 0.44, 0, 0.31, 0.15, 0.24, 0.035);
    add(body, new THREE.CylinderGeometry(0.071, 0.071, 0.043, 16), black, 0, 0.83, 0);
    add(body, new THREE.TorusGeometry(0.024, 0.007, 6, 16), silver, 0, 0.824, 0.077);
    for (const side of [-1, 1]) {
      const collar = box(body, white, side * 0.044, 0.776, 0.14, 0.075, 0.085, 0.029);
      collar.rotation.z = side * 0.34;
    }
    for (const y of [0.58, 0.65, 0.72]) oval(body, black, 0, y, 0.181, 0.008, 0.008, 0.004);
  }
  face(body, character, kind);
  hair(body, character, kind);
  return root;
}
