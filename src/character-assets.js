import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { CHARACTERS } from './characters.js';

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
  root.userData.assetRig = { vrm };
  root.add(vrm.scene);
  vrm.scene.traverse((part) => {
    if (!part.isMesh) return;
    part.frustumCulled = false;
    part.castShadow = true;
    part.receiveShadow = true;
  });
  applyPose(vrm, 0, false, 'idle', true);
  vrm.update(0);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(vrm.scene, true);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error('Invalid model bounds for ' + asset.name);
  vrm.scene.position.y -= bounds.min.y;
  root.scale.setScalar(asset.height / height);
  return root;
}

function applyPose(vrm, time, moving, action, reducedMotion) {
  const stride = moving && !reducedMotion ? Math.sin(time * 10) : 0;
  const greeting = !moving && action !== 'idle';
  const wave = greeting && !reducedMotion ? Math.sin(time * 7) : 0;
  const leftArm = new THREE.Euler(stride * 0.18, 0, 1.30);
  const rightArm = new THREE.Euler(-stride * 0.18, 0, -1.30);
  if (greeting) {
    if (action === 'dance' || action === 'cheer') {
      leftArm.z = (action === 'cheer' ? -0.40 : 0.35) + wave * 0.10;
      rightArm.z = (action === 'cheer' ? 0.40 : -0.35) + wave * 0.10;
    }
    if (action === 'wave') rightArm.z = 0.25 + wave * 0.16;
  }
  const rotation = (euler) => ({ rotation: new THREE.Quaternion().setFromEuler(euler).toArray() });
  vrm.humanoid.setNormalizedPose({
    leftUpperArm: rotation(leftArm),
    rightUpperArm: rotation(rightArm),
    leftLowerArm: rotation(new THREE.Euler(-0.12, 0, -0.06)),
    rightLowerArm: rotation(new THREE.Euler(action === 'wave' && greeting ? -0.8 : -0.12, 0, 0.06)),
    leftUpperLeg: rotation(new THREE.Euler(stride * 0.25, 0, 0)),
    rightUpperLeg: rotation(new THREE.Euler(-stride * 0.25, 0, 0)),
    leftLowerLeg: rotation(new THREE.Euler(Math.max(0, -stride) * 0.28, 0, 0)),
    rightLowerLeg: rotation(new THREE.Euler(Math.max(0, stride) * 0.28, 0, 0)),
    spine: rotation(new THREE.Euler(0, 0, greeting ? wave * 0.025 : 0)),
    head: rotation(new THREE.Euler(greeting && action === 'nod' ? Math.abs(wave) * 0.18 : 0,
      0, greeting ? wave * 0.035 : 0)),
  });
  const blink = reducedMotion ? 0 : Math.exp(-Math.pow(((time % 4.7) - 3.4) / 0.075, 2));
  vrm.expressionManager?.setValue('blink', blink);
  vrm.expressionManager?.setValue('happy', greeting ? 0.25 : 0);
}

export function animateAuthoredFigure(root, { time, delta, moving, angle, action, reducedMotion }) {
  const { vrm } = root.userData.assetRig;
  const difference = Math.atan2(Math.sin(angle - root.rotation.y), Math.cos(angle - root.rotation.y));
  root.rotation.y += difference * (reducedMotion ? 1 : 1 - Math.exp(-delta * 12));
  applyPose(vrm, time, moving, action, reducedMotion);
  vrm.update(delta);
}
