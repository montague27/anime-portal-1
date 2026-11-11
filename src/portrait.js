import * as THREE from 'three';
import { createToasty } from './toasty.js';

export function createPortrait(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff5de, 0x587e99, 2.1));
  const key = new THREE.DirectionalLight(0xffe9c3, 3.2);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xaff0ff, 2);
  rim.position.set(4, 3, -2);
  scene.add(rim);
  const bot = createToasty();
  scene.add(bot.root);
  const camera = new THREE.OrthographicCamera(-2.05, 2.05, 2.05, -2.05, 0.1, 30);
  camera.position.set(4.1, 3.5, 7);
  camera.lookAt(0, 1.35, 0);
  new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width && height) renderer.setSize(width, height, false);
  }).observe(canvas);
  return (time, reducedMotion) => {
    bot.root.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.65) * 0.12;
    const blink = reducedMotion ? 0 : Math.exp(-Math.pow(((time % 4.6) - 2.9) / 0.087, 2));
    bot.eyes.forEach((eye) => { eye.scale.y = 0.135 * (1 - blink * 0.89); });
    renderer.render(scene, camera);
  };
}

// Render the live VRM from the front without cloning its rig or moving it out of the world.
export function createEncounterPortrait(canvas, scene) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.03, 10);
  camera.layers.set(1);
  const head = new THREE.Vector3(), facing = new THREE.Vector3(), rotation = new THREE.Quaternion();
  let previous = null;
  return (model) => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(bounds.width * ratio) || canvas.height !== Math.floor(bounds.height * ratio)) {
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / bounds.height;
      camera.updateProjectionMatrix();
    }
    if (previous !== model) {
      previous?.traverse((part) => { if (part.isMesh) part.layers.disable(1); });
      model.traverse((part) => { if (part.isMesh) part.layers.enable(1); });
      previous = model;
    }
    scene.traverse((part) => { if (part.isLight) part.layers.enable(1); });
    model.updateWorldMatrix(true, true);
    const vrm = model.userData.assetRig.vrm;
    const bone = vrm.humanoid.getRawBoneNode('head');
    if (bone) bone.getWorldPosition(head);
    else head.copy(model.position).add(new THREE.Vector3(0, 1.5, 0));
    head.y += 0.035;
    model.getWorldQuaternion(rotation);
    facing.set(0, 0, 1).applyQuaternion(rotation);
    camera.position.copy(head).addScaledVector(facing, 0.95);
    camera.position.y += 0.04;
    camera.lookAt(head.x, head.y - 0.08, head.z);
    const background = scene.background;
    try {
      scene.background = null;
      renderer.render(scene, camera);
    } finally {
      scene.background = background;
    }
  };
}
