import * as THREE from 'three';
import { createToasty } from './toasty.js';
import { createRoom } from './room.js';
import { createWorkshop, movePlayer, worldPosition, DIRECTIONS, WIDTH, HEIGHT, CELL_SIZE } from './workshop.js';
import './style.css';

const viewport = document.querySelector('#viewport');
const status = document.querySelector('#status');
const reset = document.querySelector('#reset');
const directionButtons = [...document.querySelectorAll('[data-direction]')];
const keyDirections = {
  KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right',
  ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right',
};
const STEP_SECONDS = 0.20;

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Move Toasty with WASD or arrow keys. Push crates and the Miku, Emu Otori, Aki, and Reze figures one grid cell at a time.');
  viewport.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x152f35);
  const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 80);
  camera.position.set(10, 14, 15);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff2d4, 0x537e86, 2.4));
  const light = new THREE.DirectionalLight(0xffe5b4, 3.4);
  light.position.set(-5, 13, 7);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 40 });
  light.shadow.normalBias = 0.025;
  scene.add(light);
  scene.add(new THREE.DirectionalLight(0xb2e9e9, 1.3));

  let state = createWorkshop();
  const crates = createRoom(scene, state);
  const bot = createToasty();
  bot.root.scale.setScalar(0.29);
  scene.add(bot.root);
  const selectedTile = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.47, 48),
    new THREE.MeshBasicMaterial({ color: 0xffde80, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  selectedTile.rotation.x = -Math.PI / 2;
  selectedTile.position.y = 0.012;
  scene.add(selectedTile);

  // Fit the room's projected corners, keeping movement directions consistent.
  const fitCamera = () => {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    camera.updateMatrixWorld();
    let projectedWidth = 0;
    let projectedHeight = 0;
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const point = new THREE.Vector3(
          x * (WIDTH * CELL_SIZE / 2 + 0.5), 0,
          z * (HEIGHT * CELL_SIZE / 2 + 0.5),
        ).applyMatrix4(camera.matrixWorldInverse);
        projectedWidth = Math.max(projectedWidth, Math.abs(point.x));
        projectedHeight = Math.max(projectedHeight, Math.abs(point.y));
      }
    }
    const aspect = width / height;
    const roomHeight = Math.max(projectedHeight + 1.1, projectedWidth / aspect + 0.7);
    camera.left = -roomHeight * aspect;
    camera.right = roomHeight * aspect;
    camera.top = roomHeight;
    camera.bottom = -roomHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  new ResizeObserver(fitCamera).observe(viewport);
  fitCamera();

  const held = new Map();
  let queuedDirection = '';
  let step = null;
  let targetAngle = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setPosition = (object, cell) => {
    const [x, z] = worldPosition(cell.x, cell.z);
    object.position.set(x, 0, z);
  };
  const syncPositions = () => {
    setPosition(bot.root, state.player);
    state.crates.forEach((crate) => setPosition(crates[crate.id], crate));
    selectedTile.position.x = bot.root.position.x;
    selectedTile.position.z = bot.root.position.z;
  };
  syncPositions();

  const releaseInputs = () => {
    held.clear();
    queuedDirection = '';
    directionButtons.forEach((button) => button.classList.remove('active'));
  };
  reset.addEventListener('click', () => {
    releaseInputs();
    state = createWorkshop();
    step = null;
    targetAngle = 0;
    bot.root.rotation.y = 0;
    syncPositions();
    status.textContent = 'Workshop reset.';
  });
  window.addEventListener('keydown', (event) => {
    const direction = keyDirections[event.code];
    if (!direction || event.ctrlKey || event.metaKey || event.altKey ||
        event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    if (event.repeat) return;
    held.set(event.code, direction);
    queuedDirection = direction;
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', releaseInputs);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseInputs();
  });
  for (const button of directionButtons) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      const direction = button.dataset.direction;
      held.set(event.pointerId, direction);
      queuedDirection = direction;
      button.classList.add('active');
    });
    const release = (event) => {
      held.delete(event.pointerId);
      button.classList.remove('active');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }

  let lastTime = performance.now() / 1000;
  renderer.setAnimationLoop(() => {
    const now = performance.now() / 1000;
    const delta = Math.min(now - lastTime, 0.05);
    lastTime = now;
    let progress = 0;
    if (step) {
      progress = THREE.MathUtils.clamp((now - step.startedAt) / STEP_SECONDS, 0, 1);
      const blend = reducedMotion.matches ? 1 : THREE.MathUtils.smoothstep(progress, 0, 1);
      const [x, z] = worldPosition(state.player.x, state.player.z);
      bot.root.position.lerpVectors(step.botStart, new THREE.Vector3(x, 0, z), blend);
      if (step.crate !== undefined) {
        const cell = state.crates[step.crate];
        const [cx, cz] = worldPosition(cell.x, cell.z);
        crates[step.crate].position.lerpVectors(step.crateStart, new THREE.Vector3(cx, 0, cz), blend);
      }
      if (progress >= 1) step = null;
    }

    if (!step) {
      const direction = queuedDirection || [...held.values()].at(-1);
      queuedDirection = '';
      if (direction) {
        targetAngle = DIRECTIONS[direction].angle;
        const botStart = bot.root.position.clone();
        const crateStarts = crates.map((crate) => crate.position.clone());
        const result = movePlayer(state, direction);
        if (result.moved) {
          step = { startedAt: now, botStart, crate: result.pushed, crateStart: crateStarts[result.pushed] };
          status.textContent = result.pushed === undefined
            ? ''
            : (state.crates[result.pushed].name || 'Crate') + ' moved.';
        } else {
          status.textContent = 'Blocked.';
        }
      }
    }

    const angleDifference = Math.atan2(
      Math.sin(targetAngle - bot.root.rotation.y), Math.cos(targetAngle - bot.root.rotation.y),
    );
    bot.root.rotation.y += angleDifference * (reducedMotion.matches ? 1 : 1 - Math.exp(-delta * 22));
    const moving = step !== null && !reducedMotion.matches;
    const gait = Math.sin(progress * Math.PI * 2);
    bot.legs.forEach((leg) => {
      leg.position.y = moving ? Math.max(0, gait * leg.userData.phase) * 0.17 : 0;
      leg.position.z = moving ? gait * leg.userData.phase * 0.10 : 0;
    });
    bot.shell.position.y = 1.86 + (moving ? Math.sin(progress * Math.PI) * 0.075 : 0);
    bot.claws.forEach((claw) => { claw.rotation.x = step?.crate !== undefined ? -0.42 : 0; });
    const blink = reducedMotion.matches ? 0 : Math.exp(-Math.pow(((now % 4.6) - 2.9) / 0.087, 2));
    bot.eyes.forEach((eye) => { eye.scale.y = 0.135 * (1 - blink * 0.89); });
    selectedTile.position.x = bot.root.position.x;
    selectedTile.position.z = bot.root.position.z;
    renderer.render(scene, camera);
  });
}

try {
  start();
} catch (error) {
  console.error(error);
  document.querySelector('#render-error').hidden = false;
  reset.disabled = true;
  directionButtons.forEach((button) => { button.disabled = true; });
}
