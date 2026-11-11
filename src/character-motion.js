import * as THREE from 'three';

export function createFigureMotion() {
  return { phase: 0, walk: 0, expression: 0, action: 'idle', gestureTime: 0, rotations: new Map(), position: null };
}

// Keep a continuous walk cycle and blend every joint, including when a greeting ends.
export function updateFigureMotion(vrm, state, { delta, time, distance = 0, moving = false, action = 'idle', reducedMotion = false, snap = false }) {
  const dt = Math.min(Math.max(delta, 0), 0.05);
  state.walk = THREE.MathUtils.damp(state.walk, moving && !reducedMotion ? 1 : 0, 10, dt);
  state.phase = (state.phase + Math.max(0, Math.min(distance, 0.3)) / 1.15 * Math.PI * 2) % (Math.PI * 2);
  const gesture = moving || reducedMotion ? 'idle' : action;
  if (gesture !== state.action) { state.action = gesture; state.gestureTime = 0; }
  state.gestureTime += dt;
  const stride = Math.sin(state.phase) * state.walk;
  const liftL = Math.max(0, Math.sin(state.phase)) * state.walk;
  const liftR = Math.max(0, -Math.sin(state.phase)) * state.walk;
  const joints = {
    leftUpperArm: [stride * 0.19, 0, 1.34], rightUpperArm: [-stride * 0.19, 0, -1.34],
    leftLowerArm: [-0.15, 0, -0.04], rightLowerArm: [-0.15, 0, 0.04],
    leftHand: [0, 0, -0.04], rightHand: [0, 0, 0.04],
    leftUpperLeg: [-stride * 0.43, 0, 0], rightUpperLeg: [stride * 0.43, 0, 0],
    leftLowerLeg: [liftL * 0.64, 0, 0], rightLowerLeg: [liftR * 0.64, 0, 0],
    leftFoot: [stride * 0.16 - liftL * 0.20, 0, 0], rightFoot: [-stride * 0.16 - liftR * 0.20, 0, 0],
    spine: [moving ? 0.025 * state.walk : 0, 0, Math.sin(state.phase) * state.walk * 0.012],
    chest: [0, -stride * 0.028, 0],
    head: [0, stride * 0.015, 0],
  };
  // Small, recognizable gestures with bent elbows rather than full-arm flailing.
  const t = state.gestureTime;
  const wave = Math.sin(t * 5.2);
  if (gesture === 'wave') {
    joints.rightUpperArm = [-0.24, 0, -0.68];
    joints.rightLowerArm = [-1.05, 0.12, 0.10 + wave * 0.16];
    joints.rightHand = [0, wave * 0.12, 0.06];
  } else if (gesture === 'cheer') {
    joints.leftUpperArm = [-0.15, 0, 0.92];
    joints.rightUpperArm = [-0.15, 0, -0.92];
    joints.leftLowerArm = [-0.65 + wave * 0.05, 0, 0];
    joints.rightLowerArm = [-0.65 + wave * 0.05, 0, 0];
    joints.head = [-0.035, 0, wave * 0.018];
  } else if (gesture === 'dance') {
    joints.leftUpperArm = [-0.10, 0, 1.17 + wave * 0.025];
    joints.rightUpperArm = [-0.10, 0, -1.17 + wave * 0.025];
    joints.leftLowerArm = [-0.40, 0, -0.08];
    joints.rightLowerArm = [-0.40, 0, 0.08];
    joints.chest = [0, Math.sin(t * 2.6) * 0.055, 0];
    joints.head = [0, 0, Math.sin(t * 2.6) * 0.025];
  } else if (gesture === 'nod') {
    joints.head = [Math.sin(Math.min(t / 1.15, 1) * Math.PI * 2) * 0.095, 0, 0];
  }
  const pose = {};
  for (const [name, values] of Object.entries(joints)) {
    const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(...values));
    const current = state.rotations.get(name) || target.clone();
    if (snap) current.copy(target);
    else current.slerp(target, 1 - Math.exp(-dt * (name.includes('Leg') || name.includes('Foot') ? 18 : 8)));
    state.rotations.set(name, current);
    pose[name] = { rotation: current.toArray() };
  }
  vrm.humanoid.setNormalizedPose(pose);
  state.expression = THREE.MathUtils.damp(state.expression, gesture === 'idle' ? 0 : 0.18, 4, dt);
  const blink = reducedMotion ? 0 : Math.exp(-Math.pow(((time % 4.7) - 3.4) / 0.085, 2));
  vrm.expressionManager?.setValue('blink', blink);
  vrm.expressionManager?.setValue('happy', state.expression);
}
