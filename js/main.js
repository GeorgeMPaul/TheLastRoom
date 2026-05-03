/**
 * main.js
 *
 * Bootstrap. Imports the engine and game layers, initializes the
 * scene + camera rig + picker, hands a level content file to the
 * level-runner, and mounts the per-level UI (clue panel on click,
 * HUD with notes button + answer button, question panel on demand).
 *
 * Steps wired in here:
 *   3 — loader + scene + camera rig
 *   4 — picker (driven by content-supplied interactive map)
 *   5 — game/state.js subscriber + persistence
 *   6 — clue panel mounts on click, freezes picker
 *   7 — level-runner loads level-01 content + GLB + warns missing meshes
 *   8 — clue panel embeds add-to-notes form
 *   9 — notes view (folders, search, edit, move, delete) via HUD
 *  10 — question panel triggered by HUD button gated on requiredClues
 */

import * as THREE from 'three';
import { initScene, applyTOD, renderer, scene, camera } from './engine/scene.js';
import { loadLevel, setupModel } from './engine/loader.js';
import { createCameraRig } from './engine/camera-rig.js';
import { createPicker } from './engine/picker.js';
import { isDevMode, mountDevOverlay } from './ui/dev-overlay.js';
import { mountCluePanel } from './ui/clue-panel.js';
import { mountHud } from './ui/hud.js';
import { mountQuestionPanel } from './ui/question-panel.js';
import { loadLevelById } from './game/level-runner.js';
import * as gameState from './game/state.js';

import level01 from './content/levels/level-01.js';

const container = document.getElementById('canvas-container');
if (!container) throw new Error('main.js: #canvas-container not found in DOM');

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('main.js: #ui-root not found in DOM');

initScene(container);

// Camera state still seeded here for now — Step 14 pushes this into
// the level-runner and reads it from level content.camera.
camera.position.set(8, 8, 8);
const cameraRig = createCameraRig(camera, renderer.domElement);
cameraRig.setTarget(new THREE.Vector3(0, 1, 0));

if (isDevMode()) {
  mountDevOverlay(uiRoot);
}

// ─── Picker + clue panel ─────────────────────────────────────────────
// The picker's interactive map is set by the level-runner once content
// is in hand. On click, we dispatch discoverClue (deduped by state.js)
// AND open the clue panel — opening from the click rather than from a
// state subscriber means re-clicking an already-discovered object
// reopens the panel.
let activeLevelId = null;
let activeCluePanel = null;

function openCluePanel(descriptor) {
  if (activeCluePanel) {
    activeCluePanel.unmount();
    activeCluePanel = null;
  }
  activeCluePanel = mountCluePanel({
    parent: uiRoot,
    descriptor,
    levelId: activeLevelId,
    picker,
    onClose: () => { activeCluePanel = null; },
  });
}

let activeQuestionPanel = null;
function openQuestionPanel(levelContent) {
  if (activeQuestionPanel) {
    activeQuestionPanel.unmount();
    activeQuestionPanel = null;
  }
  activeQuestionPanel = mountQuestionPanel({
    parent: uiRoot,
    levelContent,
    picker,
    onCorrect: () => {
      // Step 12 will mount level-transition + load the next level here.
      console.log(`[main] correct answer for ${levelContent.id} — advanceToLevel placeholder`);
    },
    onClose: () => { activeQuestionPanel = null; },
  });
}

const picker = createPicker(camera, renderer.domElement, scene, (meshName, descriptor) => {
  if (!activeLevelId) return;
  console.log(`[picker] click → ${meshName} (${descriptor.label})`);
  // Always open the panel on click — even for already-discovered
  // clues — so the player can re-read at any time. The state action
  // deduplicates internally; only the first discovery notifies subs.
  gameState.discoverClue(activeLevelId, descriptor.clueId);
  openCluePanel(descriptor);
});

// State subscriber: log discovery progress. Panel mounting lives in
// the picker callback above so re-clicks reopen the panel.
gameState.subscribe((state, action) => {
  if (action?.type !== 'discoverClue') return;
  const found = state.cluesByLevel[action.levelId]?.size ?? 0;
  console.log(`[state] ${action.levelId}: ${found} clue${found === 1 ? '' : 's'} discovered`);
});

// ─── Load Level 1 via the level-runner ──────────────────────────────
activeLevelId = level01.id;

let activeHud = null;

loadLevelById({
  levelContent: level01,
  scene,
  picker,
  applyTOD,
  loadLevel,
  setupModel,
})
  .then(({ modelRoot }) => {
    console.log(`[main] level "${level01.id}" loaded; root has ${modelRoot.children.length} children`);

    // Mount the HUD once the level is ready. The HUD owns the notes
    // button + answer button and is the only thing that triggers the
    // question panel.
    if (activeHud) activeHud.unmount();
    activeHud = mountHud({
      parent: uiRoot,
      levelContent: level01,
      picker,
      onAnswer: () => openQuestionPanel(level01),
    });
  })
  .catch((err) => console.error('[main] failed to load level-01:', err));

// ─── Render loop ────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  cameraRig.update();
  renderer.render(scene, camera);
}
loop();
