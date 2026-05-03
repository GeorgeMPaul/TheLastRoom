/**
 * ui/dev-overlay.js
 *
 * Activated by `?dev=1`. Mounts a small floating panel into #ui-root with
 * QA tools: level-skip dropdown, reveal-all-clues, mesh-name overlay
 * toggle, state reset, FPS counter.
 *
 * At Step 2, most actions are stubs — the loader, picker, and game state
 * don't exist yet. Buttons either work (FPS, reset) or render disabled
 * with a "stub" tag so it's obvious which step wires them up.
 *
 * Exports:
 *   isDevMode()                  → boolean — true if ?dev=1 in the URL
 *   mountDevOverlay(parent)      → { unmount }
 *
 * Visual styling is intentionally minimal — this is a debug tool, not
 * production UI. It shouldn't get a polish pass.
 */

const SAVE_KEY = 'last-room-save-v1';

// ─── Activation check ───────────────────────────────────────────────
export function isDevMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === '1';
}

// ─── Mount ──────────────────────────────────────────────────────────
export function mountDevOverlay(parent) {
  const root = document.createElement('div');
  root.className = 'dev-overlay';
  root.innerHTML = `
    <style>
      .dev-overlay {
        position: absolute; top: 8px; right: 8px;
        z-index: 20;
        pointer-events: auto;
        font: 11px/1.35 ui-monospace, Menlo, Consolas, monospace;
        color: #d4e0ff;
        background: rgba(8, 12, 24, 0.88);
        border: 1px solid #2a3a5a;
        border-radius: 4px;
        padding: 8px 10px;
        min-width: 180px;
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
      .dev-overlay__row {
        display: flex; justify-content: space-between; align-items: center;
        gap: 8px;
        margin: 4px 0;
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
      .dev-overlay__stub {
        font-size: 9px;
        color: #ffaa55;
        margin-left: 4px;
      }
      .dev-overlay--collapsed .dev-overlay__body { display: none; }
    </style>
    <div class="dev-overlay__title">
      <span>DEV ?dev=1</span>
      <button class="dev-overlay__collapse" data-action="toggle" title="Collapse">_</button>
    </div>
    <div class="dev-overlay__body">
      <div class="dev-overlay__row">
        <span class="dev-overlay__label">FPS</span>
        <span class="dev-overlay__value" data-fps>—</span>
      </div>
      <div class="dev-overlay__row">
        <span class="dev-overlay__label">Level</span>
        <select data-action="level-skip" disabled>
          <option>level-01 (only)</option>
        </select>
      </div>
      <div class="dev-overlay__row">
        <button data-action="reveal-all" disabled>Reveal all clues</button>
        <span class="dev-overlay__stub">stub</span>
      </div>
      <div class="dev-overlay__row">
        <button data-action="mesh-names" disabled>Mesh names</button>
        <span class="dev-overlay__stub">stub</span>
      </div>
      <div class="dev-overlay__row">
        <button data-action="reset">Reset state</button>
      </div>
    </div>
  `;
  parent.appendChild(root);

  // ─── FPS counter ──────────────────────────────────────────────────
  const fpsEl = root.querySelector('[data-fps]');
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

  // ─── Button wiring ────────────────────────────────────────────────
  root.addEventListener('click', (e) => {
    const action = e.target?.dataset?.action;
    if (!action) return;
    switch (action) {
      case 'toggle':
        root.classList.toggle('dev-overlay--collapsed');
        break;
      case 'reset':
        try { localStorage.removeItem(SAVE_KEY); } catch {}
        window.location.reload();
        break;
      // Other actions wired in later steps.
    }
  });

  return {
    unmount() {
      cancelAnimationFrame(rafId);
      root.remove();
    },
  };
}
