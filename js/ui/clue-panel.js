/**
 * ui/clue-panel.js
 *
 * The clue panel — opens when an interactive is clicked, shows the
 * clue's reveal data (title, body, image), and embeds the
 * add-to-notes-button form so the player can save what they noticed
 * without leaving the panel.
 *
 * Step 6 shipped the structural shell; Step 8 swaps the placeholder
 * textarea for the real `add-to-notes-button.js` form (which knows
 * how to dispatch addNote and pick a folder).
 *
 * Picker freezes while the panel is open (setInputBlocked(true)), and
 * the panel closes on:
 *   - Cancel button
 *   - Escape key
 *   - Click on the backdrop (outside the panel)
 *
 * Module contract:
 *   mountCluePanel({ parent, descriptor, levelId, picker, onClose? })
 *     → { unmount }
 *
 * `levelId` is forwarded to the notes form as `levelDiscovered` so
 * the resulting note knows which scene it came from. Caller (main.js)
 * dispatches discoverClue before mounting and ensures only one panel
 * is open at a time.
 */

import { mountAddToNotesButton } from './add-to-notes-button.js';

export function mountCluePanel({ parent, descriptor, levelId = null, picker, onClose }) {
  const reveal = descriptor?.reveal ?? {};
  const title  = reveal.title ?? descriptor?.label ?? 'Clue';
  const body   = reveal.body  ?? '';
  const image  = reveal.image ?? null;

  // ─── DOM ──────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'clue-panel';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.innerHTML = `
    <style>
      .clue-panel {
        position: fixed; inset: 0;
        z-index: 20;
        pointer-events: auto;
        display: flex; align-items: center; justify-content: center;
        background: rgba(6, 9, 18, 0.62);
        font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
        color: #e6ecf6;
      }
      .clue-panel__card {
        background: #161c2c;
        border: 1px solid #2a3553;
        border-radius: 6px;
        max-width: 520px;
        width: calc(100% - 48px);
        max-height: calc(100vh - 96px);
        overflow: auto;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
      }
      .clue-panel__header {
        padding: 14px 18px 10px;
        border-bottom: 1px solid #232c44;
      }
      .clue-panel__title {
        font-size: 18px;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      .clue-panel__image {
        display: block;
        width: 100%;
        height: auto;
        background: #0c1120;
        border-bottom: 1px solid #232c44;
      }
      .clue-panel__body {
        padding: 14px 18px;
        color: #c9d3e6;
        white-space: pre-wrap;
      }
      .clue-panel__notes-slot {
        padding: 0 18px 14px;
      }
      .clue-panel__actions {
        padding: 12px 18px;
        border-top: 1px solid #232c44;
        display: flex; justify-content: flex-end; gap: 8px;
      }
      .clue-panel__btn {
        font: inherit;
        padding: 7px 14px;
        background: #1f2a48; color: #e6ecf6;
        border: 1px solid #2f3c60; border-radius: 4px;
        cursor: pointer;
      }
      .clue-panel__btn:hover { background: #2a3760; }
    </style>

    <div class="clue-panel__card" data-card>
      <header class="clue-panel__header">
        <div class="clue-panel__title" data-title></div>
      </header>
      ${ image ? `<img class="clue-panel__image" data-image alt="">` : '' }
      <div class="clue-panel__body" data-body></div>
      <div class="clue-panel__notes-slot" data-notes-slot></div>

      <div class="clue-panel__actions">
        <button class="clue-panel__btn" data-action="cancel">Cancel</button>
      </div>
    </div>
  `;

  // Populate text content via textContent (avoids HTML injection).
  root.querySelector('[data-title]').textContent = title;
  root.querySelector('[data-body]').textContent  = body;
  if (image) {
    const img = root.querySelector('[data-image]');
    img.src = image;
  }

  parent.appendChild(root);

  // Embed the add-to-notes form. Pre-fill content with title + body.
  const notesSlot = root.querySelector('[data-notes-slot]');
  const notesForm = mountAddToNotesButton({
    parent: notesSlot,
    defaultContent: `${title}\n\n${body}`,
    sourceClueId: descriptor?.clueId ?? null,
    levelDiscovered: levelId,
  });

  // ─── Picker freeze ────────────────────────────────────────────────
  if (picker && typeof picker.setInputBlocked === 'function') {
    picker.setInputBlocked(true);
  }

  // ─── Close lifecycle ──────────────────────────────────────────────
  let unmounted = false;
  const unmount = () => {
    if (unmounted) return;
    unmounted = true;
    document.removeEventListener('keydown', onKeyDown);
    notesForm.unmount();
    if (picker && typeof picker.setInputBlocked === 'function') {
      picker.setInputBlocked(false);
    }
    root.remove();
    if (typeof onClose === 'function') onClose();
  };

  const onKeyDown = (e) => {
    // Don't intercept Escape if the player is typing in the notes textarea —
    // they may be trying to cancel an in-progress edit, and the form's own
    // Cancel button handles that. Conservative check: any focused input
    // inside the panel.
    if (e.key !== 'Escape') return;
    const ae = document.activeElement;
    if (ae && root.contains(ae) && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT')) return;
    e.preventDefault();
    unmount();
  };
  document.addEventListener('keydown', onKeyDown);

  // ─── Button + backdrop wiring ─────────────────────────────────────
  const card = root.querySelector('[data-card]');

  root.addEventListener('click', (e) => {
    if (!card.contains(e.target)) {
      unmount();
      return;
    }
    if (e.target?.dataset?.action === 'cancel') unmount();
  });

  return { unmount };
}
