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
