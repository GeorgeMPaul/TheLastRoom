/**
 * engine/camera-rig.js
 *
 * Limited-orbit camera controls. Lifted from the OrbitControls class
 * in Game.html and extended with azimuth (theta) clamping so per-level
 * constraints can lock the player to a wedge of the room rather than
 * letting them spin all the way around.
 *
 * Exports:
 *   createCameraRig(camera, domElement, constraints) → {
 *     update(), setConstraints(c), resetTo(pos, target),
 *     setTarget(v), zoomIn(), zoomOut(),
 *     get autoRotate() / set autoRotate(v),
 *     dispose()
 *   }
 *
 * Constraints (all optional — defaults match Game.html behaviour):
 *   minPolar      (rad)   — phi lower bound       default 0.1
 *   maxPolar      (rad)   — phi upper bound       default Math.PI / 2.2
 *   minAzimuth    (rad)   — theta lower bound, or null for unbounded
 *   maxAzimuth    (rad)   — theta upper bound, or null for unbounded
 *   minDistance   (units) — radius lower bound    default 2
 *   maxDistance   (units) — radius upper bound    default 30
 *
 * Caller is responsible for calling update() each frame and dispose()
 * when tearing the rig down.
 */

import * as THREE from 'three';

const DEFAULTS = {
  minPolar:    0.1,
  maxPolar:    Math.PI / 2.2,
  minAzimuth:  null,
  maxAzimuth:  null,
  minDistance: 2,
  maxDistance: 30,
};

export function createCameraRig(camera, domElement, constraints = {}) {
  const c = { ...DEFAULTS, ...constraints };

  const target = new THREE.Vector3();
  const spherical      = new THREE.Spherical();
  const sphericalDelta = new THREE.Spherical();
  const rotateStart    = new THREE.Vector2();
  const rotateEnd      = new THREE.Vector2();
  const rotateDelta    = new THREE.Vector2();

  let scaleStep    = 1;
  let isDragging   = false;
  let autoRotate   = false;
  const autoRotateSpeed = 1.2;
  const dampingFactor   = 0.08;

  // Initialise spherical from current camera position relative to target.
  spherical.setFromVector3(camera.position.clone().sub(target));

  // ─── Pointer / touch / wheel handlers ─────────────────────────────
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    rotateStart.set(e.clientX, e.clientY);
    domElement.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    rotateEnd.set(e.clientX, e.clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(0.005);
    sphericalDelta.theta -= rotateDelta.x;
    sphericalDelta.phi   -= rotateDelta.y;
    rotateStart.copy(rotateEnd);
  };

  const onPointerUp = () => { isDragging = false; };

  const onWheel = (e) => {
    e.preventDefault();
    scaleStep *= e.deltaY > 0 ? 1.1 : 0.9;
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      rotateStart.set(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length !== 1 || !isDragging) return;
    rotateEnd.set(e.touches[0].clientX, e.touches[0].clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(0.005);
    sphericalDelta.theta -= rotateDelta.x;
    sphericalDelta.phi   -= rotateDelta.y;
    rotateStart.copy(rotateEnd);
  };

  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerup',   onPointerUp);
  domElement.addEventListener('wheel',       onWheel, { passive: false });
  domElement.addEventListener('touchstart',  onTouchStart, { passive: false });
  domElement.addEventListener('touchmove',   onTouchMove,  { passive: false });

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const rig = {
    target,

    update() {
      if (autoRotate) sphericalDelta.theta -= 0.008 * (autoRotateSpeed / 10);

      spherical.theta += sphericalDelta.theta;
      spherical.phi   += sphericalDelta.phi;
      spherical.phi    = clamp(spherical.phi, c.minPolar, c.maxPolar);
      if (c.minAzimuth != null && c.maxAzimuth != null) {
        spherical.theta = clamp(spherical.theta, c.minAzimuth, c.maxAzimuth);
      }
      spherical.radius *= scaleStep;
      spherical.radius  = clamp(spherical.radius, c.minDistance, c.maxDistance);

      sphericalDelta.theta *= (1 - dampingFactor);
      sphericalDelta.phi   *= (1 - dampingFactor);
      scaleStep = 1;

      const offset = new THREE.Vector3().setFromSpherical(spherical);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);
    },

    setConstraints(next) {
      Object.assign(c, next);
    },

    setTarget(v) {
      target.copy(v);
      spherical.setFromVector3(camera.position.clone().sub(target));
    },

    resetTo(pos, newTarget) {
      target.copy(newTarget);
      const offset = pos.clone().sub(newTarget);
      spherical.setFromVector3(offset);
      sphericalDelta.set(0, 0, 0);
      scaleStep = 1;
    },

    zoomIn()  { scaleStep *= 0.85; },
    zoomOut() { scaleStep *= 1.18; },

    get autoRotate() { return autoRotate; },
    set autoRotate(v) { autoRotate = !!v; },

    dispose() {
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup',   onPointerUp);
      domElement.removeEventListener('wheel',       onWheel);
      domElement.removeEventListener('touchstart',  onTouchStart);
      domElement.removeEventListener('touchmove',   onTouchMove);
    },
  };

  return rig;
}
