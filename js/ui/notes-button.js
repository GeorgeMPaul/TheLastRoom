/**
 * ui/notes-button.js
 *
 * Persistent HUD button. Click (or N keyboard shortcut) opens the
 * notes view. Badge shows current note count, updated live via the
 * state subscription.
 *
 * Module contract:
 *   mountNotesButton({ parent, picker }) → { unmount }
 *
 * The N hotkey is captured at the document level but ignored when
 * the player is typing into a text field, so it doesn't fight the
 * notes textarea inside the clue panel or any other input.
 */

import { subscribe } from '../game/state.js';
import { noteCount } from '../game/notes.js';
import { mountNotesView } from './notes-view.js';

export function mountNotesButton({ parent, picker }) {
  const root = document.createElement('div');
  root.className = 'notes-button';
  root.innerHTML = `
    <style>
      .notes-button {
        pointer-events: auto;
        font: 13px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      .notes-button__btn {
        font: inherit;
        background: rgba(17, 22, 42, 0.92);
        color: #e6ecf6;
        border: 1px solid #2a3553;
        border-radius: 4px;
        padding: 8px 14px;
        cursor: pointer;
        display: inline-flex; align-items: center; gap: 8px;
      }
      .notes-button__btn:hover { background: #1a2240; }
      .notes-button__badge {
        background: #2e5cff; color: #f4f7ff;
        border-radius: 10px;
        font-size: 11px;
        padding: 1px 7px;
        min-width: 20px; text-align: center;
      }
      .notes-button__badge--zero {
        background: #2a3553; color: #8294b8;
      }
      .notes-button__hint {
        font-size: 10px; color: #8294b8;
        margin-left: 4px;
      }
    </style>
    <button class="notes-button__btn" data-action="open" title="Open notes (N)">
      <span>Notes</span>
      <span class="notes-button__badge" data-badge>0</span>
      <span class="notes-button__hint">N</span>
    </button>
  `;
  parent.appendChild(root);

  const badgeEl = root.querySelector('[data-badge]');

  function refreshBadge() {
    const n = noteCount();
    badgeEl.textContent = String(n);
    badgeEl.classList.toggle('notes-button__badge--zero', n === 0);
  }
  refreshBadge();

  let activeView = null;
  function open() {
    if (activeView) return;
    const uiRoot = document.getElementById('ui-root') || parent;
    activeView = mountNotesView({
      parent: uiRoot,
      picker,
      onClose: () => { activeView = null; },
    });
  }

  root.addEventListener('click', (e) => {
    if (e.target?.dataset?.action === 'open') open();
  });

  // N hotkey — ignore when typing in inputs/textareas.
  const onKeyDown = (e) => {
    if (e.key !== 'n' && e.key !== 'N') return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || ae.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    if (activeView) {
      activeView.unmount();
    } else {
      open();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  const unsubscribe = subscribe((_state, action) => {
    if (!action) return;
    const t = action.type;
    if (t === 'addNote' || t === 'deleteNote' || t === 'resetProgress') refreshBadge();
  });

  return {
    unmount() {
      if (activeView) { activeView.unmount(); activeView = null; }
      unsubscribe();
      document.removeEventListener('keydown', onKeyDown);
      root.remove();
    },
  };
}
