import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { CHARACTERS } from './characters.js';
import { createFigureMotion, updateFigureMotion } from './character-motion.js';

export async function loadAuthoredFigure(kind) {
  const asset = CHARACTERS[kind];
  if (!asset) throw new Error('Unknown character model: ' + kind);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(asset.url);
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error(asset.name + ' model is missing its VRM humanoid rig.');
  VRMUtils.rotateVRM0(vrm);
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  const root = new THREE.Group();
  root.name = asset.name;
  root.userData.figure = kind;
  const motion = createFigureMotion();
  root.userData.assetRig = { vrm, motion };
  root.add(vrm.scene);
  vrm.scene.traverse((part) => {
    if (!part.isMesh) return;
    part.frustumCulled = false;
    part.castShadow = true;
    part.receiveShadow = true;
  });
  updateFigureMotion(vrm, motion, { time: 0, delta: 0, reducedMotion: true, snap: true });
  vrm.update(0);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(vrm.scene, true);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error('Invalid model bounds for ' + asset.name);
  vrm.scene.position.y -= bounds.min.y;
  root.scale.setScalar(asset.height / height);
  return root;
}

export function animateAuthoredFigure(root, { time, delta, moving, angle, action, reducedMotion }) {
  const { vrm, motion } = root.userData.assetRig;
  const difference = Math.atan2(Math.sin(angle - root.rotation.y), Math.cos(angle - root.rotation.y));
  root.rotation.y += THREE.MathUtils.clamp(difference * (1 - Math.exp(-delta * 9)), -delta * 3.4, delta * 3.4);
  const distance = motion.position ? root.position.distanceTo(motion.position) : 0;
  motion.position = root.position.clone();
  updateFigureMotion(vrm, motion, { time, delta, moving, action, reducedMotion, distance: distance < 0.5 ? distance : 0 });
  vrm.update(delta);
}
