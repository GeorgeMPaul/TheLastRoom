/**
 * main.js
 *
 * Bootstrap. Imports the engine and game layers, initializes the
 * scene + camera rig + picker, loads Level 1's GLB, and starts the
 * render loop.
 *
 * Step 5: picker is wired to game/state.js — clicks dispatch
 * discoverClue, and a console subscriber logs the clue count.
 * Interactive mesh→clueId mapping is still hardcoded here; Step 7
 * pulls it from a level content file.
 */

import * as THREE from 'three';
import { initScene, applyTOD, renderer, scene, camera } from './engine/scene.js';
import { loadLevel, setupModel } from './engine/loader.js';
import { createCameraRig } from './engine/camera-rig.js';
import { createPicker } from './engine/picker.js';
import { isDevMode, mountDevOverlay } from './ui/dev-overlay.js';
import * as gameState from './game/state.js';

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

// ─── Hardcoded Level 1 interactives (Step 4 placeholder) ────────────
// These mesh names come from inspecting the current level-01.glb. The
// modeler hasn't yet renamed to Interact_<Object>_<NNN>, so we treat
// the working names as interactives until Step 7 lands the real
// content file with proper labels and reveal data.
const LEVEL_01_ID = 'level-01';
const LEVEL_01_INTERACTIVES = {
  'Laptop':         { clueId: 'clue-laptop',  label: 'Laptop' },
  'Ukulele':        { clueId: 'clue-ukulele', label: 'Ukulele' },
  'Rubick':         { clueId: 'clue-rubick',  label: "Rubik's cube" },
  'MarshallSpeaker':{ clueId: 'clue-speaker', label: 'Marshall speaker' },
  'TableLamp':      { clueId: 'clue-lamp',    label: 'Table lamp' },
};

// ─── Picker ──────────────────────────────────────────────────────────
const picker = createPicker(camera, renderer.domElement, scene, (meshName, descriptor) => {
  console.log(`[picker] click → ${meshName} (${descriptor.label})`);
  gameState.discoverClue(LEVEL_01_ID, descriptor.clueId);
});

// ─── State subscriber: log clue progress on every change ────────────
gameState.subscribe((state, action) => {
  if (action?.type !== 'discoverClue') return;
  const found = state.cluesByLevel[action.levelId]?.size ?? 0;
  console.log(`[state] ${action.levelId}: ${found} clue${found === 1 ? '' : 's'} discovered`);
});

// ─── Load Level 1 ───────────────────────────────────────────────────
loadLevel('assets/models/level-01.glb')
  .then((gltf) => {
    const modelRoot = setupModel(scene, gltf);
    picker.setRoot(modelRoot);
    picker.setInteractiveMap(LEVEL_01_INTERACTIVES);

    // Warn for any hardcoded interactive name not present anywhere in
    // the loaded scene graph. We check every named object — meshes,
    // groups, nodes — because GLTF often parks the human-readable name
    // on a parent Group and leaves the renderable mesh nameless. The
    // picker resolves a hit by walking up to the first interactive
    // ancestor, so the allowlist matches the same set we check here.
    const present = new Set();
    modelRoot.traverse((obj) => { if (obj.name) present.add(obj.name); });
    for (const name of Object.keys(LEVEL_01_INTERACTIVES)) {
      if (!present.has(name)) {
        console.warn(`[picker] interactive "${name}" not found in level-01.glb`);
      }
    }
  })
  .catch((err) => console.error('[main] failed to load level-01.glb:', err));

// ─── Render loop ────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  cameraRig.update();
  renderer.render(scene, camera);
}
loop();
