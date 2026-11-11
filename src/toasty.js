import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const metal = (color, roughness = 0.48, metalness = 0.22) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const yellow = metal(0xf8be37, 0.34, 0.12);
const gold = metal(0xd88b26);
const silver = metal(0xa7b4b3, 0.33, 0.48);
const gunmetal = metal(0x465359, 0.37, 0.43);
const rubber = metal(0x242c30, 0.78, 0.03);
const red = metal(0xe44933, 0.31, 0.07);
const screen = metal(0x091e24, 0.27, 0.12);
const glow = new THREE.MeshBasicMaterial({ color: 0x8affeb, toneMapped: false });
const indicator = new THREE.MeshStandardMaterial({
  color: 0xe35739,
  emissive: 0xe35739,
  emissiveIntensity: 0.16,
});
const up = new THREE.Vector3(0, 1, 0);

function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = true;
  part.receiveShadow = true;
  parent.add(part);
  return part;
}

function box(parent, material, w, h, d, radius, x, y, z) {
  return mesh(parent, new RoundedBoxGeometry(w, h, d, 3, radius), material, x, y, z);
}

function joint(parent, material, radius, width, x, y, z) {
  const part = mesh(parent, new THREE.CylinderGeometry(radius, radius, width, 20), material, x, y, z);
  part.rotation.x = Math.PI / 2;
  return part;
}

function link(parent, material, start, end, width, depth, radius) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const middle = a.clone().lerp(b, 0.5);
  const part = box(parent, material, width, a.distanceTo(b), depth, radius, ...middle);
  part.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
  return part;
}

function makeLeg(parent, side, row) {
  const root = new THREE.Group();
  root.userData.phase = side * row;
  parent.add(root);
  const hip = [side * 0.73, 1.12, row * 0.54];
  const knee = [side * 1.19, 0.77, row * 0.70];
  const ankle = [side * 1.41, 0.19, row * 0.91];
  link(root, gunmetal, hip, knee, 0.24, 0.24, 0.055);
  link(root, silver, hip.map((v, i) => i === 2 ? v + row * 0.14 : v),
    knee.map((v, i) => i === 2 ? v + row * 0.14 : v), 0.105, 0.085, 0.028);
  joint(root, gold, 0.174, 0.27, ...knee);
  joint(root, gunmetal, 0.077, 0.285, ...knee);
  link(root, yellow, knee, ankle, 0.32, 0.31, 0.075);
  link(root, silver,
    [side * 1.21, 0.70, row * 0.88],
    [side * 1.36, 0.31, row * 1.025], 0.125, 0.048, 0.023);
  const pad = box(root, rubber, 0.37, 0.12, 0.42, 0.05, ankle[0], 0.065, ankle[2]);
  pad.rotation.y = -side * row * 0.18;
  return root;
}

function makeClaw(parent, side) {
  const arm = new THREE.Group();
  arm.position.set(side * 0.53, -0.65, 0.72);
  parent.add(arm);

  link(arm, gunmetal, [0, 0, 0], [side * 0.12, -0.47, 0.36], 0.17, 0.16, 0.04);
  link(arm, silver, [0, -0.12, 0.09], [side * 0.085, -0.35, 0.32], 0.12, 0.16, 0.04);

  const grip = new THREE.Group();
  grip.position.set(side * 0.13, -0.49, 0.38);
  arm.add(grip);
  joint(grip, gold, 0.183, 0.15, 0, 0, 0);
  joint(grip, gunmetal, 0.096, 0.16, 0, 0, 0.026);
  for (const finger of [-1, 1]) {
    const knuckle = box(grip, gunmetal, 0.104, 0.17, 0.12, 0.035, finger * 0.14, -0.12, 0.055);
    knuckle.rotation.z = finger * 0.44;
    const tip = box(grip, silver, 0.105, 0.11, 0.12, 0.025, finger * 0.115, -0.22, 0.07);
    tip.rotation.z = -finger * 0.48;
  }
  return arm;
}

function breadShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.56, -0.49);
  shape.quadraticCurveTo(-0.64, -0.49, -0.64, -0.40);
  shape.lineTo(-0.64, 0.07);
  shape.bezierCurveTo(-0.91, 0.45, -0.62, 0.66, 0, 0.66);
  shape.bezierCurveTo(0.62, 0.66, 0.91, 0.45, 0.64, 0.07);
  shape.lineTo(0.64, -0.40);
  shape.quadraticCurveTo(0.64, -0.49, 0.56, -0.49);
  shape.closePath();
  return shape;
}

function makeToast(parent) {
  const toast = new THREE.Group();
  const shape = breadShape();
  const crust = metal(0xa94f25, 0.9, 0);
  const crumb = metal(0xf7be69, 0.91, 0);
  mesh(toast, new THREE.ExtrudeGeometry(shape, {
    depth: 0.13, bevelEnabled: true, bevelThickness: 0.026, bevelSize: 0.028,
    bevelSegments: 2, curveSegments: 12,
  }), crust, 0, 0, -0.065);
  const front = mesh(toast, new THREE.ShapeGeometry(shape, 12), crumb, 0, 0, 0.092);
  front.scale.setScalar(0.88);
  const back = front.clone();
  back.rotation.y = Math.PI;
  back.position.z *= -1;
  toast.add(back);
  toast.scale.setScalar(0.88);
  parent.add(toast);
  return toast;
}

export function createToasty() {
  const root = new THREE.Group();
  const legs = [];
  for (const side of [-1, 1]) {
    for (const row of [-1, 1]) legs.push(makeLeg(root, side, row));
  }

  const shell = new THREE.Group();
  shell.position.y = 1.86;
  root.add(shell);
  box(shell, gunmetal, 1.82, 0.28, 1.22, 0.09, 0, -0.80, 0);
  box(shell, gold, 2.22, 0.23, 1.60, 0.105, 0, -0.68, 0);
  box(shell, yellow, 2.22, 1.50, 1.60, 0.15, 0, 0, 0);

  // Face bezel and display.
  box(shell, gold, 1.88, 0.93, 0.11, 0.05, 0, -0.13, 0.789);
  box(shell, silver, 1.78, 0.84, 0.12, 0.047, 0, -0.13, 0.827);
  box(shell, gunmetal, 1.66, 0.73, 0.09, 0.037, 0, -0.13, 0.863);
  box(shell, screen, 1.57, 0.64, 0.075, 0.032, 0, -0.13, 0.888);
  const eyes = [-0.35, 0.35].map((x) => {
    const eye = mesh(shell, new THREE.SphereGeometry(1, 20, 12), glow, x, -0.108, 0.934);
    eye.scale.set(0.069, 0.135, 0.017);
    eye.castShadow = false;
    return eye;
  });
  const smilePath = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.103, -0.19, 0.934),
    new THREE.Vector3(0, -0.316, 0.941),
    new THREE.Vector3(0.103, -0.19, 0.934),
  );
  mesh(shell, new THREE.TubeGeometry(smilePath, 16, 0.017, 8), glow).castShadow = false;
  box(shell, silver, 0.12, 0.25, 0.085, 0.024, -1.00, 0.40, 0.761);
  mesh(shell, new THREE.SphereGeometry(0.044, 12, 8), indicator, 0.90, 0.39, 0.792);

  // Two dark wells and their metal rails.
  box(shell, gunmetal, 1.98, 0.115, 1.39, 0.05, 0, 0.737, 0);
  for (const z of [-0.33, 0.29]) {
    box(shell, rubber, 1.73, 0.052, 0.41, 0.025, 0, 0.806, z);
    for (const rail of [-0.229, 0.229]) {
      box(shell, silver, 1.87, 0.085, 0.10, 0.041, 0, 0.831, z + rail);
    }
  }

  // Side vents and sprung toast lever.
  box(shell, gold, 0.048, 1.17, 1.26, 0.02, 1.096, 0.025, -0.02);
  for (let i = 0; i < 4; i += 1) {
    const vent = box(shell, rubber, 0.037, 0.092, 0.47, 0.015, 1.124, 0.32 - i * 0.18, -0.36);
    vent.rotation.x = 0.30;
  }
  box(shell, silver, 0.054, 0.92, 0.27, 0.026, 1.126, 0.075, 0.36);
  box(shell, rubber, 0.057, 0.78, 0.12, 0.026, 1.151, 0.075, 0.36);
  const lever = new THREE.Group();
  lever.position.set(1.16, 0.30, 0.36);
  shell.add(lever);
  box(lever, gunmetal, 0.29, 0.105, 0.12, 0.042, 0.108, 0, 0);
  box(lever, red, 0.36, 0.146, 0.26, 0.069, 0.312, 0, 0);

  const claws = [-1, 1].map((side) => makeClaw(shell, side));
  const toast = makeToast(shell);
  toast.visible = false;

  return { root, shell, eyes, claws, lever, toast, indicator, legs };
}
