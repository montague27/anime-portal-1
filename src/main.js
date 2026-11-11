import * as THREE from 'three';
import { createToasty } from './toasty.js';
import { createPortrait } from './portrait.js';
import { createAircraft, createSky } from './aircraft.js';
import { loadAuthoredFigure, animateAuthoredFigure } from './character-assets.js';
import {
  createWorkshop, movePlayer, worldPosition, DIRECTIONS, WIDTH, HEIGHT, CELL_SIZE,
  updateNpcs, greetNpc, motionActive,
} from './workshop.js';
import './style.css';

const viewport = document.querySelector('#viewport');
const status = document.querySelector('#status');
const reset = document.querySelector('#reset');
const loading = document.querySelector('#loading');
const directionButtons = [...document.querySelectorAll('[data-direction]')];
const keyDirections = {
  KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right',
  ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right',
};
const STEP_SECONDS = 0.20;
const DEFAULT_ZOOM = 1;

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Move Toasty with WASD or arrow keys. Push equipment or click a character to greet them. Scroll to zoom.');
  viewport.append(renderer.domElement);
  const renderPortrait = createPortrait(document.querySelector('#toasty-portrait'));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb9e4fa);
  const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 80);
  camera.zoom = DEFAULT_ZOOM;
  camera.position.set(10, 14, 15);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0x537e86, 1.8));
  const light = new THREE.DirectionalLight(0xfff0df, 2.6);
  light.position.set(-5, 13, 7);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 0.5, far: 60 });
  light.shadow.normalBias = 0.025;
  scene.add(light);
  scene.add(new THREE.DirectionalLight(0xb2e9e9, 1.3));

  let state = createWorkshop();
  let charactersReady = false;
  let loadingCharacters = false;
  const aircraft = createAircraft(scene, state);
  const { crates } = aircraft;
  const updateSky = createSky(scene);
  const npcModels = state.npcs.map((npc) => {
    const model = new THREE.Group();
    model.userData.npcId = npc.id;
    scene.add(model);
    return model;
  });
  const loadCharacters = async () => {
    if (loadingCharacters) return;
    loadingCharacters = true;
    loading.hidden = false;
    loading.textContent = 'Loading characters…';
    const results = await Promise.allSettled(state.npcs.map(async (npc) => {
      if (npcModels[npc.id].userData.assetRig) return;
      const model = await loadAuthoredFigure(npc.figure);
      const previous = npcModels[npc.id];
      model.position.copy(previous.position);
      model.rotation.copy(previous.rotation);
      model.userData.npcId = npc.id;
      npcModels[npc.id] = model;
      scene.add(model);
      scene.remove(previous);
    }));
    const failures = results.filter((result) => result.status === 'rejected');
    charactersReady = failures.length === 0;
    loadingCharacters = false;
    loading.hidden = charactersReady;
    if (!charactersReady) {
      failures.forEach((result) => console.error('Character loading failed:', result.reason));
      loading.textContent = 'A character could not load. Press reset to retry.';
    }
  };
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

  // Fit the actual silhouette instead of an oversized rectangular sky area.
  const fitCamera = () => {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    camera.updateMatrixWorld();
    const halfW = WIDTH * CELL_SIZE / 2, halfD = HEIGHT * CELL_SIZE / 2;
    const outline = [[0, 1.6, -halfD - 7.4], [0, 2, halfD + 2.7]];
    for (const side of [-1, 1]) {
      for (const z of [-halfD, halfD]) outline.push([side * (halfW + 0.6), 0, z]);
      for (const z of [-2.4, 4.4]) outline.push([side * (halfW + 5.4), -0.7, z]);
    }
    const projected = outline.map((point) => new THREE.Vector3(...point).applyMatrix4(camera.matrixWorldInverse));
    const minX = Math.min(...projected.map((point) => point.x));
    const maxX = Math.max(...projected.map((point) => point.x));
    const minY = Math.min(...projected.map((point) => point.y));
    const maxY = Math.max(...projected.map((point) => point.y));
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    const aspect = width / height;
    const roomHeight = Math.max((maxY - minY) / 2 + 1.5, (maxX - minX) / (aspect * 2) + 1.0);
    camera.left = centerX - roomHeight * aspect;
    camera.right = centerX + roomHeight * aspect;
    camera.top = centerY + roomHeight;
    camera.bottom = centerY - roomHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  new ResizeObserver(fitCamera).observe(viewport);
  fitCamera();
  renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    const bounds = renderer.domElement.getBoundingClientRect();
    const point = new THREE.Vector3(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1, 0,
    );
    const before = point.clone().unproject(camera);
    camera.zoom = THREE.MathUtils.clamp(camera.zoom * Math.exp(-event.deltaY * 0.001), 1, 3.5);
    camera.updateProjectionMatrix();
    const after = point.unproject(camera);
    camera.position.add(before.sub(after));
    if (camera.zoom === 1) camera.position.set(10, 14, 15);
    camera.updateMatrixWorld();
  }, { passive: false });

  const held = new Map();
  let queuedDirection = '';
  let step = null;
  let targetAngle = 0;
  let simulationTime = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setPosition = (object, cell) => {
    const [x, z] = worldPosition(cell.x, cell.z);
    object.position.set(x, 0, z);
  };
  const syncPositions = () => {
    setPosition(bot.root, state.player);
    state.crates.forEach((crate) => setPosition(crates[crate.id], crate));
    state.npcs.forEach((npc) => {
      const model = npcModels[npc.id];
      setPosition(model, npc);
      model.rotation.y = npc.angle;
    });
    selectedTile.position.x = bot.root.position.x;
    selectedTile.position.z = bot.root.position.z;
  };
  syncPositions();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (!charactersReady) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(npcModels, true)[0];
    if (!hit) return;
    let model = hit.object;
    while (model.userData.npcId === undefined && model.parent) model = model.parent;
    const npc = state.npcs[model.userData.npcId];
    if (npc) {
      greetNpc(state, npc, simulationTime);
      status.textContent = 'Greeting ' + npc.name + '.';
    }
  });

  const releaseInputs = () => {
    held.clear();
    queuedDirection = '';
    directionButtons.forEach((button) => button.classList.remove('active'));
  };
  reset.addEventListener('click', () => {
    releaseInputs();
    state = createWorkshop();
    simulationTime = 0;
    camera.zoom = DEFAULT_ZOOM;
    camera.position.set(10, 14, 15);
    camera.updateProjectionMatrix();
    step = null;
    targetAngle = 0;
    bot.root.rotation.y = 0;
    syncPositions();
    status.textContent = 'Aircraft reset.';
    if (!charactersReady) void loadCharacters();
  });
  window.addEventListener('keydown', (event) => {
    if (!charactersReady) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]') ||
        event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = keyDirections[event.code];
    if (!direction) return;
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
      if (!charactersReady) return;
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
    const realTime = performance.now() / 1000;
    const delta = Math.min(realTime - lastTime, 0.05);
    lastTime = realTime;
    if (document.hidden) return;
    renderPortrait(realTime, reducedMotion.matches);
    if (!reducedMotion.matches) {
      updateSky(delta);
      aircraft.update(delta);
    }
    if (!charactersReady) {
      renderer.render(scene, camera);
      return;
    }
    simulationTime += delta;
    const now = simulationTime;
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
        const result = movePlayer(state, direction, now);
        if (result.moved) {
          step = { startedAt: now, botStart, crate: result.pushed, crateStart: crateStarts[result.pushed] };
          status.textContent = result.pushed === undefined
            ? ''
            : (state.crates[result.pushed].name || 'Crate') + ' moved.';
        } else if (result.interacted !== undefined) {
          status.textContent = 'Greeting ' + state.npcs[result.interacted].name + '.';
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
    updateNpcs(state, now);
    for (const npc of state.npcs) {
      const model = npcModels[npc.id];
      const [x, z] = worldPosition(npc.x, npc.z);
      model.position.set(x, 0, z);
      if (motionActive(npc, now)) {
        const [fromX, fromZ] = worldPosition(npc.motion.fromX, npc.motion.fromZ);
        const blend = reducedMotion.matches ? 1 : THREE.MathUtils.smoothstep(
          (now - npc.motion.startedAt) / npc.motion.duration, 0, 1,
        );
        model.position.x = THREE.MathUtils.lerp(fromX, x, blend);
        model.position.z = THREE.MathUtils.lerp(fromZ, z, blend);
      }
      animateAuthoredFigure(model, {
        time: now + npc.id * 0.7, delta, moving: Boolean(motionActive(npc, now)),
        angle: npc.angle, action: now < npc.greetingUntil ? npc.action : 'idle',
        reducedMotion: reducedMotion.matches,
      });
    }
    selectedTile.position.x = bot.root.position.x;
    selectedTile.position.z = bot.root.position.z;
    renderer.render(scene, camera);
  });
  void loadCharacters();
}

try {
  start();
} catch (error) {
  console.error(error);
  document.querySelector('#render-error').hidden = false;
  loading.hidden = true;
  reset.disabled = true;
  directionButtons.forEach((button) => { button.disabled = true; });
}
