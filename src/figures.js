import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const surface = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
const skin = surface(0xffdec6);
const white = surface(0xfffaf0);
const black = surface(0x202332);
const pink = surface(0xf28ab5);
const dressPink = surface(0xed5eaa);
const teal = surface(0x39c5c5);
const gold = surface(0xf8c65d);
const silver = surface(0xa7bdc5);
const navy = surface(0x283348);
const violet = surface(0x493d65);
const suitFabric = surface(0x303b40);
const blush = surface(0xf3a2a1);
const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
const characters = {
  miku: { name: 'Miku', hair: teal, eyes: teal, outfit: white },
  emu: { name: 'Emu Otori', hair: pink, eyes: pink, outfit: white },
  aki: { name: 'Aki', hair: navy, eyes: surface(0x658faf), outfit: suitFabric },
  reze: { name: 'Reze', hair: violet, eyes: surface(0x6d9c6d), outfit: white },
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

function fringe(parent, material, x, y, width, length, sweep = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.bezierCurveTo(-width * 0.60, -length * 0.35, sweep - width * 0.2, -length * 0.88, sweep, -length);
  shape.bezierCurveTo(sweep + width * 0.3, -length * 0.70, width * 0.65, -length * 0.22, width / 2, 0);
  shape.closePath();
  return add(parent, new THREE.ExtrudeGeometry(shape, {
    depth: 0.025, bevelEnabled: true, bevelThickness: 0.008,
    bevelSize: 0.009, bevelSegments: 2, curveSegments: 10,
  }), material, x, y, 0.235);
}

function face(parent, character, kind) {
  const eyes = [];
  oval(parent, skin, 0, 1.04, 0, 0.305, 0.29, 0.255);
  for (const side of [-1, 1]) {
    oval(parent, skin, side * 0.295, 1.02, 0, 0.038, 0.058, 0.043);
    const eye = new THREE.Group();
    eye.position.set(side * 0.112, 1.045, 0.237);
    parent.add(eye);
    eyes.push(eye);
    const height = kind === 'aki' ? 0.065 : 0.081;
    oval(eye, black, 0, 0, 0, 0.064, height, 0.016);
    oval(eye, white, 0, -0.006, 0.012, 0.055, height * 0.86, 0.009);
    oval(eye, character.eyes, 0, -0.006, 0.022, 0.042, height * 0.81, 0.008);
    oval(eye, black, 0, 0.004, 0.029, 0.017, height * 0.49, 0.005);
    oval(eye, eyeWhite, -0.015, 0.025, 0.035, 0.017, 0.022, 0.005);
    oval(eye, eyeWhite, 0.015, -0.032, 0.034, 0.008, 0.009, 0.004);
    if (kind !== 'aki') strand(eye, black, [[side * 0.035, 0.053, 0.015], [side * 0.070, 0.067, 0.010]], 0.009);
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
  return eyes;
}

function hair(parent, character, kind) {
  const tails = [];
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
  if (kind === 'reze') {
    fringe(parent, violet, -0.13, 1.28, 0.20, 0.34, -0.07);
    fringe(parent, violet, 0.025, 1.30, 0.14, 0.20, 0.07);
    fringe(parent, violet, 0.17, 1.27, 0.15, 0.30, 0.08);
  } else if (kind === 'aki') {
    fringe(parent, navy, -0.16, 1.29, 0.16, 0.29, -0.06);
    fringe(parent, navy, -0.035, 1.31, 0.16, 0.20, 0.01);
    fringe(parent, navy, 0.10, 1.30, 0.15, 0.23, 0.045);
    fringe(parent, navy, 0.23, 1.26, 0.10, 0.17, 0.025);
  } else {
    for (let i = 0; i < 5; i += 1) {
      fringe(parent, character.hair, (i - 2) * 0.098, 1.28 + (2 - Math.abs(i - 2)) * 0.012,
        0.125, kind === 'emu' ? 0.15 + (i % 2) * 0.035 : 0.17 + (i % 2) * 0.047, (i - 2) * 0.012);
    }
  }

  if (kind === 'miku') {
    for (const side of [-1, 1]) {
      const tail = new THREE.Group();
      tail.position.set(side * 0.29, 1.20, -0.045);
      parent.add(tail);
      tails.push(tail);
      strand(tail, teal, [[0, 0, 0], [side * 0.13, -0.21, -0.035],
        [side * 0.14, -0.59, -0.055], [side * 0.12, -1.02, 0.085]], 0.108, 0.014);
      strand(tail, surface(0x80dedb), [[side * 0.015, -0.05, 0.09],
        [side * 0.145, -0.43, 0.045], [side * 0.13, -0.91, 0.10]], 0.013, 0.003);
      const clip = box(parent, black, side * 0.300, 1.22, 0.009, 0.10, 0.19, 0.13);
      clip.rotation.z = -side * 0.16;
      box(parent, pink, side * 0.305, 1.22, 0.082, 0.058, 0.12, 0.015);
    }
  }
  if (kind === 'emu') {
    for (const side of [-1, 1]) {
      oval(parent, pink, side * 0.235, 0.96, -0.048, 0.10, 0.18, 0.19);
    }
    ribbon(parent, white, 0.285, 1.23, 0.10, 0.10);
    ribbon(parent, gold, 0.29, 1.18, 0.17, 0.075);
  }
  if (kind === 'aki') {
    strand(parent, navy, [[0.03, 1.32, -0.13], [0.09, 1.49, -0.15], [0.17, 1.58, -0.17]], 0.050, 0.006);
    box(parent, black, 0.055, 1.34, -0.13, 0.09, 0.035, 0.09);
  }
  if (kind === 'reze') {
    oval(parent, violet, -0.12, 0.86, -0.18, 0.18, 0.15, 0.13);
    ribbon(parent, black, -0.16, 0.80, -0.21, 0.062);
  }
  return tails;
}

export function createFigure(kind) {
  const character = characters[kind];
  if (!character) throw new Error('Unknown figure: ' + kind);
  const root = new THREE.Group();
  root.name = character.name;
  root.userData.figure = kind;
  const body = new THREE.Group();
  body.position.y = -0.075;
  root.add(body);
  const rig = { body, arms: [], legs: [], eyes: [], tails: [] };
  root.userData.rig = rig;
  const suit = kind === 'aki';
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.105, 0.43, 0);
    body.add(leg);
    rig.legs.push(leg);
    oval(leg, suit ? suitFabric : skin, 0, -0.15, 0, 0.067, 0.19, 0.068);
    if (kind === 'miku' || kind === 'reze') {
      oval(leg, black, 0, -0.19, 0.003, 0.069, 0.135, 0.071);
      if (kind === 'miku') box(leg, teal, 0, -0.06, 0.008, 0.126, 0.025, 0.12);
    }
    if (kind === 'emu') {
      oval(leg, white, 0, -0.19, 0, 0.069, 0.14, 0.070);
      if (side === -1) {
        for (const y of [-0.09, -0.15, -0.21, -0.27]) {
          add(leg, new THREE.CylinderGeometry(0.070, 0.070, 0.027, 16), pink, 0, y, 0);
        }
      }
    }
    box(leg, kind === 'emu' ? dressPink : black, 0, -0.305, 0.04, 0.145, 0.10, 0.20, 0.035);
    if (suit) {
      box(leg, white, 0, -0.343, 0.04, 0.15, 0.027, 0.205);
      box(leg, white, 0, -0.30, 0.122, 0.13, 0.061, 0.048);
      for (const y of [-0.27, -0.29]) box(leg, white, 0, y, 0.086, 0.09, 0.008, 0.06, 0.003);
    }
  }
  add(body, new THREE.CylinderGeometry(0.145, 0.185, 0.35, 16), character.outfit, 0, 0.63, 0);
  oval(body, skin, 0, 0.825, 0, 0.068, 0.08, 0.065);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.155, 0.75, 0);
    arm.rotation.z = side * 0.15;
    body.add(arm);
    rig.arms.push(arm);
    oval(arm, suit ? suitFabric : skin, side * 0.035, -0.11, 0, 0.055, 0.15, 0.058);
    if (kind === 'miku') oval(arm, black, side * 0.045, -0.17, 0, 0.062, 0.11, 0.063);
    if (kind === 'emu') {
      oval(arm, surface(0xf07891), side * 0.02, -0.035, 0, 0.090, 0.08, 0.075);
      for (const y of [-0.01, -0.055]) oval(arm, white, side * 0.02, y, 0.07, 0.013, 0.013, 0.008);
      oval(arm, white, side * 0.045, -0.19, 0, 0.059, 0.10, 0.062);
    }
    oval(arm, skin, side * 0.055, -0.26, 0.008, 0.062, 0.064, 0.057);
  }

  if (kind === 'miku' || kind === 'emu') {
    const skirt = add(body, new THREE.CylinderGeometry(0.16, 0.255, 0.21, 16),
      kind === 'miku' ? black : dressPink, 0, 0.45, 0);
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
    for (const side of [-1, 1]) {
      const panel = box(body, white, side * 0.105, 0.51, 0.141, 0.13, 0.17, 0.055);
      panel.rotation.z = side * 0.15;
      for (let i = 0; i < 3; i += 1) {
        box(rig.arms[side === -1 ? 0 : 1], teal, side * 0.045, -0.15 - i * 0.035, 0.060, 0.035, 0.014, 0.010, 0.003);
      }
    }
    box(rig.arms[0], pink, -0.058, -0.04, 0.055, 0.042, 0.046, 0.010);
  }
  if (kind === 'emu') {
    box(body, dressPink, 0, 0.64, 0.162, 0.16, 0.25, 0.04, 0.025);
    ribbon(body, black, 0, 0.77, 0.188, 0.05);
    ribbon(body, gold, 0, 0.55, 0.20, 0.12);
    oval(body, dressPink, 0, 0.425, 0, 0.27, 0.15, 0.23);
    for (let i = 0; i < 10; i += 1) {
      const angle = i * Math.PI / 5;
      ribbon(body, i % 2 ? teal : gold, Math.sin(angle) * 0.235, 0.33, Math.cos(angle) * 0.21, 0.033);
      strand(body, white, [[Math.sin(angle) * 0.16, 0.54, Math.cos(angle) * 0.15],
        [Math.sin(angle) * 0.27, 0.43, Math.cos(angle) * 0.23],
        [Math.sin(angle) * 0.22, 0.33, Math.cos(angle) * 0.21]], 0.008, 0.006);
    }
    for (const y of [0.60, 0.68]) oval(body, gold, 0, y, 0.190, 0.017, 0.017, 0.008);
  }
  if (kind === 'aki') {
    box(body, white, 0, 0.70, 0.144, 0.12, 0.21, 0.035);
    strand(body, black, [[0, 0.79, 0.17], [0, 0.68, 0.18], [0, 0.55, 0.19]], 0.024, 0.014);
    for (const side of [-1, 1]) {
      const lapel = box(body, suitFabric, side * 0.075, 0.69, 0.174, 0.050, 0.21, 0.020);
      lapel.rotation.z = side * -0.24;
      oval(body, silver, side * 0.294, 0.98, 0.039, 0.012, 0.019, 0.012);
    }
    const sheath = box(body, black, -0.19, 0.67, -0.17, 0.053, 0.81, 0.059);
    sheath.rotation.z = -0.27;
    box(body, silver, -0.075, 1.04, -0.17, 0.14, 0.024, 0.08);
    for (const y of [0.52, 0.58]) oval(body, black, 0.025, y, 0.17, 0.010, 0.010, 0.006);
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
    ribbon(body, black, 0, 0.775, 0.188, 0.045);
    for (const side of [-1, 1]) {
      strand(body, black, [[side * 0.018, 0.77, 0.19], [side * 0.043, 0.69, 0.19],
        [side * 0.055, 0.64, 0.185]], 0.013, 0.006);
    }
  }
  const head = new THREE.Group();
  rig.eyes = face(head, character, kind);
  rig.tails = hair(head, character, kind);
  for (const part of head.children) part.position.y -= 0.84;
  head.position.y = 0.84;
  body.add(head);
  rig.head = head;
  return root;
}

export function animateFigure(root, { time, delta, moving, angle, action, reducedMotion }) {
  const rig = root.userData.rig;
  const kind = root.userData.figure;
  const turn = Math.atan2(Math.sin(angle - root.rotation.y), Math.cos(angle - root.rotation.y));
  root.rotation.y += turn * (reducedMotion ? 1 : 1 - Math.exp(-delta * 12));
  const gait = moving && !reducedMotion ? Math.sin(time * (kind === 'emu' ? 19 : 13)) : 0;
  const greeting = !moving && action !== 'idle';
  const wave = greeting && !reducedMotion ? Math.sin(time * 10) : 0;
  rig.body.position.y = -0.075 + (reducedMotion ? 0 : moving ? Math.abs(gait) * 0.028 : Math.sin(time * 2.2) * 0.008);
  rig.body.rotation.z = greeting && action === 'dance' ? wave * 0.07 : 0;
  rig.head.rotation.x = greeting && action === 'nod' ? Math.abs(wave) * 0.20 : 0;
  rig.head.rotation.z = greeting && action === 'wave' ? -0.08 : 0;
  rig.legs.forEach((leg, index) => { leg.rotation.x = gait * (index ? -0.34 : 0.34); });
  rig.arms.forEach((arm, index) => {
    const side = index ? 1 : -1;
    arm.rotation.x = gait * (index ? 0.28 : -0.28);
    arm.rotation.z = side * 0.15;
    if (greeting && ['cheer', 'dance'].includes(action)) arm.rotation.z = side * (1.8 + wave * 0.18);
    if (greeting && action === 'wave' && index === 1) arm.rotation.z = 2.15 + wave * 0.20;
  });
  rig.tails.forEach((tail, index) => {
    tail.rotation.x = reducedMotion ? 0 : Math.sin(time * 3.5 + index) * 0.07 + gait * 0.07;
    tail.rotation.z = greeting ? wave * (index ? -0.035 : 0.035) : 0;
  });
  const blink = reducedMotion ? 0 : Math.exp(-Math.pow(((time % 4.7) - 3.4) / 0.075, 2));
  rig.eyes.forEach((eye) => { eye.scale.y = 1 - blink * 0.94; });
}
