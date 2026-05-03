/**
 * main.js
 *
 * Bootstrap. Imports the engine layer, initializes the scene + camera
 * rig, loads Level 1's GLB, and starts the render loop.
 *
 * Step 3: real GLB renders with limited-orbit controls. Camera
 * constraints are still hardcoded — Step 7 wires them to per-level
 * content.
 */

import * as THREE from 'three';
import { initScene, applyTOD, renderer, scene, camera } from './engine/scene.js';
import { loadLevel, setupModel } from './engine/loader.js';
import { createCameraRig } from './engine/camera-rig.js';
import { isDevMode, mountDevOverlay } from './ui/dev-overlay.js';

const container = document.getElementById('canvas-container');
if (!container) throw new Error('main.js: #canvas-container not found in DOM');

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('main.js: #ui-root not found in DOM');

initScene(container);
applyTOD('day');

camera.position.set(8, 8, 8);
const cameraRig = createCameraRig(camera, renderer.domElement);
cameraRig.setTarget(new THREE.Vector3(0, 1, 0));

if (isDevMode()) {
  mountDevOverlay(uiRoot);
}

// ─── Load Level 1 ───────────────────────────────────────────────────
loadLevel('assets/models/level-01.glb')
  .then((gltf) => setupModel(scene, gltf))
  .catch((err) => console.error('[main] failed to load level-01.glb:', err));

// ─── Render loop ────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  cameraRig.update();
  renderer.render(scene, camera);
}
loop();
