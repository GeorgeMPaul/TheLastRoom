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
  const reveal      = descriptor?.reveal ?? {};
  const objectName  = descriptor?.label ?? 'Unknown Object';
  const clueTitle   = reveal.title ?? '';
  const body        = reveal.body  ?? '';
  const image       = reveal.image ?? null;

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
        background: rgba(4, 6, 14, 0.75);
        font: 14px/1.5 'Georgia', 'Times New Roman', serif;
        color: #c8d0e0;
      }
      .clue-panel__card {
        background: #0f1320;
        border: 1px solid #1e2a40;
        border-top: 2px solid #3a4a6a;
        border-radius: 4px;
        max-width: 600px;
        width: calc(100% - 48px);
        max-height: calc(100vh - 80px);
        overflow: auto;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.03);
      }
      .clue-panel__header {
        padding: 16px 20px 12px;
        border-bottom: 1px solid #1a2236;
        display: flex; align-items: center; gap: 10px;
      }
      .clue-panel__header-icon {
        flex-shrink: 0;
        width: 18px; height: 18px;
        opacity: 0.5;
      }
      .clue-panel__object-name {
        font-size: 11px;
        font-weight: 400;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #6a7a9a;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .clue-panel__content {
        display: flex;
        gap: 0;
        min-height: 160px;
      }
      .clue-panel__image-col {
        flex: 0 0 180px;
        border-right: 1px solid #1a2236;
        display: flex; align-items: center; justify-content: center;
        background: #090d18;
        min-height: 160px;
      }
      .clue-panel__image {
        display: block;
        width: 100%; height: 100%;
        object-fit: cover;
      }
      .clue-panel__image-placeholder {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 8px;
        color: #2a3550;
        width: 100%; height: 100%;
        padding: 24px;
      }
      .clue-panel__image-placeholder svg {
        width: 40px; height: 40px;
        stroke: #2a3550; fill: none;
      }
      .clue-panel__details-col {
        flex: 1;
        padding: 16px 20px;
        display: flex; flex-direction: column; gap: 8px;
      }
      .clue-panel__clue-title {
        font-size: 15px;
        font-weight: 600;
        color: #d4dce8;
        font-style: italic;
        line-height: 1.3;
        border-bottom: 1px solid #1a2236;
        padding-bottom: 8px;
        margin-bottom: 2px;
      }
      .clue-panel__body {
        font-size: 13px;
        color: #8a96a8;
        line-height: 1.6;
        white-space: pre-wrap;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .clue-panel__notes-slot {
        padding: 0 20px;
        border-top: 0;
        overflow: hidden;
        max-height: 0;
        transition: max-height 0.2s ease, padding 0.2s ease;
      }
      .clue-panel__notes-slot.is-open {
        padding: 12px 20px;
        border-top: 1px solid #1a2236;
        max-height: 400px;
      }
      /* Hide the notes form's own button row — we drive it from clue-panel__actions */
      .clue-panel__notes-slot .add-to-notes__btn-row { display: none; }
      .clue-panel__actions {
        padding: 12px 20px;
        border-top: 1px solid #1a2236;
        display: flex; justify-content: flex-end; gap: 8px;
        background: #0c1018;
      }
      .clue-panel__btn {
        font: 12px/1 system-ui, -apple-system, sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 8px 16px;
        border-radius: 3px;
        cursor: pointer;
        border: 1px solid;
        transition: background 0.15s, color 0.15s;
      }
      .clue-panel__btn--notes {
        background: #1e3a7a;
        color: #7aaeff;
        border-color: #2a4e96;
      }
      .clue-panel__btn--notes:hover {
        background: #243f85;
        color: #a0c4ff;
      }
      .clue-panel__btn--notes.is-open {
        background: #0c1018;
        color: #4a5670;
        border-color: #1e2a40;
      }
      .clue-panel__btn--cancel {
        background: transparent;
        color: #4a5670;
        border-color: #1e2a40;
      }
      .clue-panel__btn--cancel:hover {
        background: #1a2236;
        color: #8a96a8;
      }
    </style>

    <div class="clue-panel__card" data-card>
      <header class="clue-panel__header">
        <svg class="clue-panel__header-icon" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="7"/>
          <line x1="16.5" y1="16.5" x2="21" y2="21"/>
        </svg>
        <div class="clue-panel__object-name" data-object-name></div>
      </header>

      <div class="clue-panel__content">
        <div class="clue-panel__image-col">
          ${ image
            ? `<img class="clue-panel__image" data-image alt="">`
            : `<div class="clue-panel__image-placeholder">
                <svg viewBox="0 0 24 24" stroke-width="1.2" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
              </div>`
          }
        </div>
        <div class="clue-panel__details-col">
          <div class="clue-panel__clue-title" data-clue-title></div>
          <div class="clue-panel__body" data-body></div>
        </div>
      </div>

      <div class="clue-panel__notes-slot" data-notes-slot></div>

      <div class="clue-panel__actions">
        <button class="clue-panel__btn clue-panel__btn--notes" data-action="toggle-notes">Add to Notes</button>
        <button class="clue-panel__btn clue-panel__btn--cancel" data-action="cancel">Close</button>
      </div>
    </div>
  `;

  // Populate text content via textContent (avoids HTML injection).
  root.querySelector('[data-object-name]').textContent = objectName;
  root.querySelector('[data-clue-title]').textContent  = clueTitle;
  root.querySelector('[data-body]').textContent        = body;
  if (image) {
    const img = root.querySelector('[data-image]');
    img.src = image;
  }

  parent.appendChild(root);

  // Embed the add-to-notes form. Pre-fill content with title + body.
  const notesSlot = root.querySelector('[data-notes-slot]');
  const notesForm = mountAddToNotesButton({
    parent: notesSlot,
    defaultContent: `${objectName}: ${clueTitle}\n\n${body}`,
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
  const card        = root.querySelector('[data-card]');
  const notesBtn    = root.querySelector('[data-action="toggle-notes"]');

  // Programmatically open the embedded notes form by simulating a click
  // on its own internal "Add to Notes" trigger, which lives in notesSlot.
  const getNotesOpenBtn = () => notesSlot.querySelector('[data-action="open"]');
  const getNotesForm    = () => notesSlot.querySelector('.add-to-notes');

  root.addEventListener('click', (e) => {
    if (!card.contains(e.target)) {
      unmount();
      return;
    }
    const action = e.target?.dataset?.action;
    if (action === 'cancel') {
      unmount();
    } else if (action === 'toggle-notes') {
      const form = getNotesForm();
      const isOpen = form?.classList.contains('add-to-notes--open');
      if (isOpen) {
        notesSlot.querySelector('[data-action="cancel"]')?.click();
        notesBtn.classList.remove('is-open');
        notesBtn.textContent = 'Add to Notes';
        notesSlot.classList.remove('is-open');
      } else {
        getNotesOpenBtn()?.click();
        notesBtn.classList.add('is-open');
        notesBtn.textContent = 'Cancel Notes';
        notesSlot.classList.add('is-open');
      }
    }
  });

  return { unmount };
}
