/**
 * ui/dev-overlay.js
 *
 * Activated by `?dev=1`. Mounts a small floating panel into #ui-root
 * with QA shortcuts to every UI surface in the game, plus state
 * inspection and manipulation. The whole point: open everything that's
 * been built without having to play through the level to get to it.
 *
 * Sections:
 *   PANELS      one-click opens for clue / question / notes
 *   STATE       reveal-all-clues, mark-answered, reset
 *   INSPECT     mesh-names overlay, FPS, state dump
 *
 * Exports:
 *   isDevMode()                        → boolean
 *   mountDevOverlay(parent, ctx)       → { unmount }
 *
 * ctx fields:
 *   getActiveLevel()  → level content (after main.js loads it)
 *   getModelRoot()    → THREE.Object3D (after level GLB loads), or null
 *   picker            → engine picker instance (for setInputBlocked)
 *   uiRoot            → where spawned panels mount
 *   openCluePanel(descriptor)          → main.js-owned mount
 *   openQuestionPanel(levelContent)    → main.js-owned mount
 *   advanceToNextLevel?()              → main.js-owned next-level transition (Step 12)
 *
 * The dev overlay does NOT own the clue/question panel instances —
 * main.js does, so existing one-at-a-time semantics keep working. We
 * own the notes-view instance directly because nothing else cares.
 *
 * Visual styling is intentionally minimal — this is a debug tool.
 * It shouldn't get a polish pass.
 */

import * as gameState from '../game/state.js';
import { mountNotesView } from './notes-view.js';

const SAVE_KEY = 'last-room-save-v1';

// ─── Activation check ───────────────────────────────────────────────
export function isDevMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === '1';
}

// ─── Mount ──────────────────────────────────────────────────────────
export function mountDevOverlay(parent, ctx = {}) {
  const {
    getActiveLevel = () => null,
    getModelRoot   = () => null,
    picker         = null,
    uiRoot         = parent,
    openCluePanel,
    openQuestionPanel,
    advanceToNextLevel,
  } = ctx;

  const root = document.createElement('div');
  root.className = 'dev-overlay';
  root.innerHTML = `
    <style>
      .dev-overlay {
        position: absolute; top: 8px; right: 8px;
        z-index: 35;
        pointer-events: auto;
        font: 11px/1.35 ui-monospace, Menlo, Consolas, monospace;
        color: #d4e0ff;
        background: rgba(8, 12, 24, 0.92);
        border: 1px solid #2a3a5a;
        border-radius: 4px;
        padding: 8px 10px;
        min-width: 220px; max-width: 260px;
        user-select: none;
      }
      .dev-overlay__title {
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #88a8ff;
        margin-bottom: 6px;
        display: flex; justify-content: space-between; align-items: center;
      }
      .dev-overlay__collapse {
        cursor: pointer;
        background: transparent; color: inherit; border: 0;
        font: inherit; padding: 0 4px;
      }
      .dev-overlay__section {
        font-size: 9px;
        letter-spacing: 0.12em; text-transform: uppercase;
        color: #6a7eaa;
        margin: 8px 0 3px;
        border-top: 1px solid #1c2640;
        padding-top: 6px;
      }
      .dev-overlay__section:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
      .dev-overlay__row {
        display: flex; justify-content: space-between; align-items: center;
        gap: 6px;
        margin: 3px 0;
      }
      .dev-overlay__row--col {
        flex-direction: column; align-items: stretch;
      }
      .dev-overlay__label { color: #8aa0c8; }
      .dev-overlay__value { color: #d4e0ff; }
      .dev-overlay button, .dev-overlay select {
        font: inherit;
        background: #1a2540; color: #d4e0ff;
        border: 1px solid #2a3a5a; border-radius: 3px;
        padding: 3px 6px;
        cursor: pointer;
      }
      .dev-overlay button:hover:not(:disabled),
      .dev-overlay select:hover:not(:disabled) { background: #243358; }
      .dev-overlay button:disabled,
      .dev-overlay select:disabled {
        opacity: 0.45; cursor: not-allowed;
      }
      .dev-overlay__btn--wide { width: 100%; text-align: left; }
      .dev-overlay__select { width: 100%; }
      .dev-overlay__danger { color: #ffa0a8; border-color: #5a2a30; }
      .dev-overlay__danger:hover:not(:disabled) { background: #3a1a20; }
      .dev-overlay--collapsed .dev-overlay__body { display: none; }
    </style>

    <div class="dev-overlay__title">
      <span>DEV ?dev=1</span>
      <button class="dev-overlay__collapse" data-action="toggle" title="Collapse">_</button>
    </div>

    <div class="dev-overlay__body">

      <div class="dev-overlay__section">Panels</div>
      <div class="dev-overlay__row dev-overlay__row--col">
        <select class="dev-overlay__select" data-clue-select>
          <option value="">— pick a clue to open —</option>
        </select>
      </div>
      <div class="dev-overlay__row">
        <button class="dev-overlay__btn--wide" data-action="open-question">Open question panel</button>
      </div>
      <div class="dev-overlay__row">
        <button class="dev-overlay__btn--wide" data-action="open-notes">Open notes view</button>
      </div>

      <div class="dev-overlay__section">State</div>
      <div class="dev-overlay__row">
        <button class="dev-overlay__btn--wide" data-action="reveal-all">Reveal all clues</button>
      </div>
      <div class="dev-overlay__row">
        <button class="dev-overlay__btn--wide" data-action="mark-answered">Mark level answered</button>
      </div>
      <div class="dev-overlay__row">
        <button class="dev-overlay__btn--wide" data-action="advance">Advance to next level</button>
      </div>
      <div class="dev-overlay__row">
        <button class="dev-overlay__btn--wide dev-overlay__danger" data-action="reset">Reset all state + reload</button>
      </div>

      <div class="dev-overlay__section">Inspect</div>
      <div class="dev-overlay__row">
        <span class="dev-overlay__label">FPS</span>
        <span class="dev-overlay__value" data-fps>—</span>
      </div>
      <div class="dev-overlay__row">
        <span class="dev-overlay__label">Clues</span>
        <span class="dev-overlay__value" data-clue-count>0 / 0</span>
      </div>
      <div class="dev-overlay__row">
        <span class="dev-overlay__label">Notes</span>
        <span class="dev-overlay__value" data-note-count>0</span>
      </div>
      <div class="dev-overlay__row">
        <button class="dev-overlay__btn--wide" data-action="mesh-names">Toggle mesh-name overlay</button>
      </div>
      <div class="dev-overlay__row">
        <button class="dev-overlay__btn--wide" data-action="dump-state">console.log(state)</button>
      </div>

    </div>
  `;
  parent.appendChild(root);

  // ─── Element references ───────────────────────────────────────────
  const fpsEl        = root.querySelector('[data-fps]');
  const clueCountEl  = root.querySelector('[data-clue-count]');
  const noteCountEl  = root.querySelector('[data-note-count]');
  const clueSelect   = root.querySelector('[data-clue-select]');

  // ─── FPS counter ──────────────────────────────────────────────────
  let frames = 0;
  let lastSampleAt = performance.now();
  let rafId = 0;
  const tick = (now) => {
    frames++;
    const elapsed = now - lastSampleAt;
    if (elapsed >= 500) {
      const fps = Math.round((frames * 1000) / elapsed);
      fpsEl.textContent = String(fps);
      frames = 0;
      lastSampleAt = now;
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  // ─── Clue dropdown population ─────────────────────────────────────
  // Repopulated whenever the level changes (Step 12+) or when the
  // overlay is first ready and the level has loaded.
  function populateClueSelect() {
    const level = getActiveLevel();
    clueSelect.innerHTML = '<option value="">— pick a clue to open —</option>';
    if (!level?.interactives) return;
    for (const [meshName, descriptor] of Object.entries(level.interactives)) {
      const opt = document.createElement('option');
      // Use mesh name as the value; we re-look up the descriptor on
      // change so a level swap doesn't leave stale closures.
      opt.value = meshName;
      const label = descriptor?.label ?? descriptor?.clueId ?? meshName;
      opt.textContent = `${label}  [${descriptor?.clueId ?? meshName}]`;
      clueSelect.appendChild(opt);
    }
  }

  // ─── Counters refresh ─────────────────────────────────────────────
  function refreshCounters() {
    const state = gameState.getState();
    const level = getActiveLevel();
    const found = level ? (state.cluesByLevel[level.id]?.size ?? 0) : 0;
    const total = level ? Object.keys(level.interactives ?? {}).length : 0;
    clueCountEl.textContent = `${found} / ${total}`;
    noteCountEl.textContent = String(Object.keys(state.notes).length);
  }
  refreshCounters();

  const unsubscribe = gameState.subscribe((_state, action) => {
    refreshCounters();
    // Level swap → repopulate the clue dropdown so the dev shortcut
    // points at the new level's interactives. Stale mesh-name overlay
    // gets dropped too.
    if (action?.type === 'advanceToLevel') {
      // Defer one tick so main.js has time to update activeLevel
      // (level-runner resolves before main.js writes activeLevel = ...).
      setTimeout(() => populateClueSelect(), 0);
      if (meshNameOverlay) { meshNameOverlay.remove(); meshNameOverlay = null; }
    }
  });

  // The overlay mounts before the level loads. Poll briefly for the
  // first level to populate the clue dropdown — much simpler than
  // adding a "level loaded" hook to main.js for one consumer.
  let initialPollTimer = setInterval(() => {
    if (getActiveLevel()) {
      populateClueSelect();
      refreshCounters();
      clearInterval(initialPollTimer);
      initialPollTimer = null;
    }
  }, 200);

  // ─── Mesh-name overlay ────────────────────────────────────────────
  // Toggleable text layer that lists every interactive mesh name in the
  // active level alongside whether it resolves in the current GLB.
  // Helps spot the CURRENT vs PENDING mismatch without console hunting.
  let meshNameOverlay = null;
  function toggleMeshNameOverlay() {
    if (meshNameOverlay) {
      meshNameOverlay.remove();
      meshNameOverlay = null;
      return;
    }
    const level     = getActiveLevel();
    const modelRoot = getModelRoot();
    if (!level || !modelRoot) return;

    const present = new Set();
    modelRoot.traverse((obj) => { if (obj.name) present.add(obj.name); });

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute; left: 8px; top: 8px;
      z-index: 34; pointer-events: none;
      font: 10px/1.4 ui-monospace, Menlo, Consolas, monospace;
      color: #d4e0ff;
      background: rgba(8, 12, 24, 0.85);
      border: 1px solid #2a3a5a; border-radius: 4px;
      padding: 8px 10px;
      max-width: 320px;
      max-height: calc(100vh - 24px);
      overflow: auto;
    `;
    const lines = ['Mesh names — interactives in level content:'];
    for (const name of Object.keys(level.interactives)) {
      const ok = present.has(name);
      lines.push(`${ok ? '✓' : '✗'}  ${name}${ok ? '' : '   (PENDING)'}`);
    }
    overlay.textContent = lines.join('\n');
    overlay.style.whiteSpace = 'pre';
    uiRoot.appendChild(overlay);
    meshNameOverlay = overlay;
  }

  // ─── Notes view (overlay-owned instance) ──────────────────────────
  let activeNotesView = null;
  function openNotesView() {
    if (activeNotesView) return;
    activeNotesView = mountNotesView({
      parent: uiRoot,
      picker,
      onClose: () => { activeNotesView = null; },
    });
  }

  // ─── Action wiring ────────────────────────────────────────────────
  root.addEventListener('click', (e) => {
    const action = e.target?.dataset?.action;
    if (!action) return;
    switch (action) {
      case 'toggle':
        root.classList.toggle('dev-overlay--collapsed');
        break;

      case 'open-question': {
        const level = getActiveLevel();
        if (!level || !openQuestionPanel) {
          console.warn('[dev] no active level or openQuestionPanel hook');
          return;
        }
        openQuestionPanel(level);
        break;
      }

      case 'open-notes':
        openNotesView();
        break;

      case 'reveal-all': {
        const level = getActiveLevel();
        if (!level?.interactives) return;
        for (const descriptor of Object.values(level.interactives)) {
          if (descriptor?.clueId) gameState.discoverClue(level.id, descriptor.clueId);
        }
        break;
      }

      case 'mark-answered': {
        const level = getActiveLevel();
        if (!level) return;
        gameState.answerQuestion(level.id, true);
        break;
      }

      case 'advance':
        if (typeof advanceToNextLevel !== 'function') {
          console.warn('[dev] no advanceToNextLevel hook');
          return;
        }
        // Repopulating the clue dropdown / dropping the mesh-name
        // overlay is handled by the advanceToLevel subscriber above.
        advanceToNextLevel();
        break;

      case 'reset':
        if (!window.confirm('Wipe all save state and reload?')) return;
        try { localStorage.removeItem(SAVE_KEY); } catch {}
        window.location.reload();
        break;

      case 'mesh-names':
        toggleMeshNameOverlay();
        break;

      case 'dump-state':
        // Direct console output — easier than building an in-overlay viewer.
        // eslint-disable-next-line no-console
        console.log('[dev] state:', gameState.getState());
        break;
    }
  });

  // Clue-select change → open clue panel for that interactive.
  clueSelect.addEventListener('change', () => {
    const meshName = clueSelect.value;
    if (!meshName) return;
    const level = getActiveLevel();
    const descriptor = level?.interactives?.[meshName];
    if (!descriptor || !openCluePanel) {
      console.warn(`[dev] no descriptor for "${meshName}" or no openCluePanel hook`);
      return;
    }
    // Mark it discovered too — opening from dev shouldn't leave the
    // game thinking the player hasn't seen this object.
    if (descriptor.clueId) gameState.discoverClue(level.id, descriptor.clueId);
    openCluePanel(descriptor);
    // Reset the select so picking the same clue again re-fires.
    clueSelect.value = '';
  });

  return {
    unmount() {
      cancelAnimationFrame(rafId);
      if (initialPollTimer) clearInterval(initialPollTimer);
      unsubscribe();
      if (meshNameOverlay) { meshNameOverlay.remove(); meshNameOverlay = null; }
      if (activeNotesView) { activeNotesView.unmount(); activeNotesView = null; }
      root.remove();
    },
  };
}
