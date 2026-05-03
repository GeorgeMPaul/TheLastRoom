/**
 * main.js
 *
 * Bootstrap. Imports the engine layer, initializes the scene, applies
 * the default time-of-day, and starts the render loop.
 *
 * Step 1: empty canvas with Day TOD lighting + a reference grid.
 * Later steps will add the loader, picker, game state, and UI.
 */

import { initScene, applyTOD, renderer, scene, camera } from './engine/scene.js';
import { isDevMode, mountDevOverlay } from './ui/dev-overlay.js';

const container = document.getElementById('canvas-container');
if (!container) {
  throw new Error('main.js: #canvas-container not found in DOM');
}

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) {
  throw new Error('main.js: #ui-root not found in DOM');
}

initScene(container);
applyTOD('day');

if (isDevMode()) {
  mountDevOverlay(uiRoot);
}

function loop() {
  requestAnimationFrame(loop);
  renderer.render(scene, camera);
}
loop();
