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
 *  11 — audio engine + click-to-begin gate (unlocks audio + boots level)
 *  12 — level transition + Level 2 stub (dispose + reload through fade)
 */

import * as THREE from 'three';
import { initScene, applyTOD, renderer, scene, camera } from './engine/scene.js';
import { loadLevel, setupModel, disposeLevel } from './engine/loader.js';
import { createCameraRig } from './engine/camera-rig.js';
import { createPicker } from './engine/picker.js';
import { initAudio, unlock as unlockAudio, playAmbient } from './engine/audio.js';
import { isDevMode, mountDevOverlay } from './ui/dev-overlay.js';
import { mountCluePanel } from './ui/clue-panel.js';
import { mountHud } from './ui/hud.js';
import { mountQuestionPanel } from './ui/question-panel.js';
import { mountLevelTransition } from './ui/level-transition.js';
import { loadLevelById } from './game/level-runner.js';
import * as gameState from './game/state.js';

import level01 from './content/levels/level-01.js';
import level02 from './content/levels/level-02.js';

// Static ordered roster of levels available so far. content/index.js
// will own this once Step 14 brings the rest online.
const LEVELS = [level01, level02];
const nextLevelOf = (id) => {
  const idx = LEVELS.findIndex((lvl) => lvl.id === id);
  return idx >= 0 && idx + 1 < LEVELS.length ? LEVELS[idx + 1] : null;
};
const prevLevelOf = (id) => {
  const idx = LEVELS.findIndex((lvl) => lvl.id === id);
  return idx > 0 ? LEVELS[idx - 1] : null;
};

const container = document.getElementById('canvas-container');
if (!container) throw new Error('main.js: #canvas-container not found in DOM');

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('main.js: #ui-root not found in DOM');

initScene(container);
initAudio();

// Camera state still seeded here for now — Step 14 pushes this into
// the level-runner and reads it from level content.camera.
camera.position.set(8, 8, 8);
const cameraRig = createCameraRig(camera, renderer.domElement);
cameraRig.setTarget(new THREE.Vector3(0, 1, 0));

// ─── Picker + clue panel ─────────────────────────────────────────────
// The picker's interactive map is set by the level-runner once content
// is in hand. On click, we dispatch discoverClue (deduped by state.js)
// AND open the clue panel — opening from the click rather than from a
// state subscriber means re-clicking an already-discovered object
// reopens the panel.
let activeLevelId  = null;
let activeLevel    = null;
let activeModelRoot = null;
let activeCluePanel = null;
let activeHud      = null;
let activeQuestionPanel = null;

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

function openQuestionPanel(levelContent) {
  if (activeQuestionPanel) {
    activeQuestionPanel.unmount();
    activeQuestionPanel = null;
  }
  activeQuestionPanel = mountQuestionPanel({
    parent: uiRoot,
    levelContent,
    picker,
    onCorrect: () => onLevelAnswered(levelContent),
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

// ─── Dev overlay (mounted after picker so the ctx can capture it) ──
// Pass closures (not bare values) so the overlay always reads the
// CURRENT active level/model rather than the level-01 we have at boot.
if (isDevMode()) {
  mountDevOverlay(uiRoot, {
    getActiveLevel: () => activeLevel,
    getModelRoot:   () => activeModelRoot,
    picker,
    uiRoot,
    openCluePanel,
    openQuestionPanel,
    advanceToNextLevel: () => {
      const next = nextLevelOf(activeLevelId);
      if (!next) {
        console.warn('[dev] no next level after', activeLevelId);
        return;
      }
      transitionToLevel(next, activeLevel?.outro);
    },
    goToPreviousLevel: () => {
      const prev = prevLevelOf(activeLevelId);
      if (!prev) {
        console.warn('[dev] no previous level before', activeLevelId);
        return;
      }
      // No outro card going backward — just the next-title fade.
      transitionToLevel(prev, null);
    },
  });
}

// ─── Level loading ──────────────────────────────────────────────────
// Wraps loadLevelById, updates the bookkeeping main.js needs (active
// level/model, HUD remount, picker root). Returns a promise so the
// transition can await the GLB load before fading out.
function loadAndMountLevel(level, { previousModelRoot = null } = {}) {
  return loadLevelById({
    levelContent: level,
    scene,
    picker,
    applyTOD,
    loadLevel,
    setupModel,
    disposeLevel,
    playAmbient,
    previousModelRoot,
  }).then(({ modelRoot }) => {
    console.log(`[main] level "${level.id}" loaded; root has ${modelRoot.children.length} children`);
    activeLevelId   = level.id;
    activeLevel     = level;
    activeModelRoot = modelRoot;
    gameState.advanceToLevel(level.id);

    if (activeHud) activeHud.unmount();
    activeHud = mountHud({
      parent: uiRoot,
      levelContent: level,
      picker,
      onAnswer: () => openQuestionPanel(level),
    });

    return modelRoot;
  });
}

// Called by question-panel's onCorrect (and the dev overlay).
function onLevelAnswered(currentLevel) {
  const next = nextLevelOf(currentLevel.id);
  if (!next) {
    console.log(`[main] level ${currentLevel.id} answered; no next level wired yet`);
    return;
  }
  transitionToLevel(next, currentLevel.outro);
}

function transitionToLevel(next, outro) {
  const previousModelRoot = activeModelRoot;
  // Block clue-panel/notes-view re-opens on the residual model.
  activeModelRoot = null;

  mountLevelTransition({
    parent: uiRoot,
    picker,
    outro: outro ?? {},
    nextTitle: next.title,
    onMidpoint: () => loadAndMountLevel(next, { previousModelRoot }),
  });
}

// ─── Boot gate: "Click to begin" ────────────────────────────────────
// Doubles as the audio-unlock gesture browsers require. The very first
// click anywhere in the gate calls unlockAudio() (which flushes the
// queued ambient track from the first level-runner pass) and kicks off
// loading Level 1.
function mountBootGate() {
  const gate = document.createElement('div');
  gate.className = 'boot-gate';
  gate.innerHTML = `
    <style>
      .boot-gate {
        position: fixed; inset: 0;
        z-index: 50;
        pointer-events: auto;
        background: #05070f;
        display: flex; align-items: center; justify-content: center;
        font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
        color: #e6ecf6;
        cursor: pointer;
      }
      .boot-gate__card {
        text-align: center;
        max-width: 480px;
        padding: 0 32px;
      }
      .boot-gate__title {
        font-size: 32px; font-weight: 600;
        color: #f0f4ff;
        letter-spacing: 0.06em;
        margin-bottom: 18px;
      }
      .boot-gate__body {
        color: #b6c4e2;
        font-size: 15px;
        margin-bottom: 28px;
      }
      .boot-gate__cta {
        font: inherit;
        background: #2e5cff; color: #f4f7ff;
        border: 1px solid #4c75ff; border-radius: 4px;
        padding: 12px 28px;
        font-size: 14px;
        letter-spacing: 0.08em; text-transform: uppercase;
        cursor: pointer;
      }
      .boot-gate__cta:hover { background: #3d6cff; }
    </style>
    <div class="boot-gate__card">
      <div class="boot-gate__title">The Last Room</div>
      <div class="boot-gate__body">
        Seven moments, one room. Click an object to look closer. Save what matters to your notes.
      </div>
      <button class="boot-gate__cta" data-action="begin">Click to begin</button>
    </div>
  `;
  uiRoot.appendChild(gate);

  function dismiss() {
    unlockAudio();
    gate.remove();
    // Boot Level 1.
    loadAndMountLevel(level01)
      .catch((err) => console.error('[main] failed to load level-01:', err));
  }

  gate.addEventListener('click', dismiss, { once: true });
}

mountBootGate();

// ─── Render loop ────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  cameraRig.update();
  renderer.render(scene, camera);
}
loop();
