/**
 * ui/add-to-notes-button.js
 *
 * Inline "Add to Notes" form, embedded inside the clue panel. Two
 * states:
 *
 *   1. Closed — a single button that says "Add to Notes".
 *   2. Open   — a textarea pre-filled with the clue's title + body,
 *               a folder dropdown (defaults to Evidence), and
 *               Save / Cancel buttons.
 *
 * On Save: dispatches `addNote(...)` and shows a brief "Saved ✓"
 * confirmation, then collapses back to the closed state.
 *
 * Module contract (matches dev-overlay / clue-panel):
 *   mountAddToNotesButton({ parent, defaultContent, sourceClueId,
 *                           levelDiscovered }) → { unmount }
 *
 * Caller positions the returned element however it wants — this
 * module owns no positioning, only the inline form behavior.
 */

import { addNote } from '../game/state.js';
import { listFolders } from '../game/notes.js';

const DEFAULT_FOLDER_FOR_CLUE = 'folder-evidence';

export function mountAddToNotesButton({ parent, defaultContent = '', sourceClueId = null, levelDiscovered = null }) {
  const root = document.createElement('div');
  root.className = 'add-to-notes';
  root.innerHTML = `
    <style>
      .add-to-notes { font: inherit; color: inherit; }
      .add-to-notes__btn-row {
        display: flex; justify-content: flex-end;
      }
      .add-to-notes__open {
        font: inherit;
        padding: 7px 14px;
        background: #2e5cff; color: #f4f7ff;
        border: 1px solid #4c75ff; border-radius: 4px;
        cursor: pointer;
      }
      .add-to-notes__open:hover { background: #3d6cff; }
      .add-to-notes__form { display: none; }
      .add-to-notes--open .add-to-notes__form { display: block; }
      .add-to-notes--open .add-to-notes__btn-row { display: none; }
      .add-to-notes__textarea {
        width: 100%;
        min-height: 110px;
        padding: 8px 10px;
        font: inherit; color: inherit;
        background: #0c1120;
        border: 1px solid #2a3553; border-radius: 4px;
        resize: vertical;
      }
      .add-to-notes__row {
        display: flex; align-items: center; gap: 8px;
        margin-top: 8px;
      }
      .add-to-notes__row label {
        font-size: 12px; color: #8294b8;
      }
      .add-to-notes__select {
        font: inherit;
        background: #0c1120; color: #e6ecf6;
        border: 1px solid #2a3553; border-radius: 4px;
        padding: 5px 8px;
      }
      .add-to-notes__actions {
        margin-top: 10px;
        display: flex; justify-content: flex-end; gap: 8px;
      }
      .add-to-notes__btn {
        font: inherit;
        padding: 6px 12px;
        background: #1f2a48; color: #e6ecf6;
        border: 1px solid #2f3c60; border-radius: 4px;
        cursor: pointer;
      }
      .add-to-notes__btn:hover { background: #2a3760; }
      .add-to-notes__btn--primary {
        background: #2e5cff; border-color: #4c75ff;
      }
      .add-to-notes__btn--primary:hover { background: #3d6cff; }
      .add-to-notes__confirm {
        margin-top: 8px;
        font-size: 12px; color: #6ad48f;
        opacity: 0; transition: opacity 0.2s ease;
      }
      .add-to-notes--saved .add-to-notes__confirm { opacity: 1; }
    </style>

    <div class="add-to-notes__btn-row">
      <button class="add-to-notes__open" data-action="open">Add to Notes</button>
    </div>

    <div class="add-to-notes__form">
      <textarea class="add-to-notes__textarea" data-textarea
                placeholder="What do you want to remember about this?"></textarea>
      <div class="add-to-notes__row">
        <label>Folder
          <select class="add-to-notes__select" data-folder></select>
        </label>
      </div>
      <div class="add-to-notes__actions">
        <button class="add-to-notes__btn"                                 data-action="cancel">Cancel</button>
        <button class="add-to-notes__btn add-to-notes__btn--primary"      data-action="save">Save</button>
      </div>
      <div class="add-to-notes__confirm">Saved to notes ✓</div>
    </div>
  `;
  parent.appendChild(root);

  const ta       = root.querySelector('[data-textarea]');
  const select   = root.querySelector('[data-folder]');
  ta.value = defaultContent;

  // Populate folder dropdown from current state.
  const populateFolders = () => {
    const folders = listFolders();
    select.innerHTML = '';
    for (const f of folders) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      if (f.id === DEFAULT_FOLDER_FOR_CLUE) opt.selected = true;
      select.appendChild(opt);
    }
  };
  populateFolders();

  // ─── State transitions ───────────────────────────────────────────
  const open = () => {
    populateFolders();   // refresh in case folders were added since mount
    root.classList.add('add-to-notes--open');
    root.classList.remove('add-to-notes--saved');
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  };
  const close = () => {
    root.classList.remove('add-to-notes--open');
    root.classList.remove('add-to-notes--saved');
    // Reset textarea to defaultContent so reopening doesn't show stale edits.
    ta.value = defaultContent;
  };
  const save = () => {
    const content  = ta.value.trim();
    if (!content) return;       // don't save empty notes
    const folderId = select.value;
    addNote({ content, sourceClueId, levelDiscovered, folderId });
    root.classList.add('add-to-notes--saved');
    // Keep the form open briefly to show the confirmation, then close.
    setTimeout(() => { close(); }, 700);
  };

  root.addEventListener('click', (e) => {
    const action = e.target?.dataset?.action;
    if (action === 'open')   open();
    else if (action === 'cancel') close();
    else if (action === 'save')   save();
  });

  // Cmd/Ctrl-Enter inside the textarea saves.
  ta.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });

  return {
    unmount() { root.remove(); },
  };
}
