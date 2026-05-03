/**
 * ui/notes-view.js
 *
 * Full notes interface. Two-pane: folders on the left, notes on the
 * right. Search across all notes. Inline edit. Move-via-dropdown
 * between folders. Add new notes and folders. Delete notes and
 * non-default folders.
 *
 * Implements Steps 8 + 9 in one pass — Step 8's "flat list, no
 * folders, no search" version would have been thrown away immediately,
 * so we go straight to the complete version.
 *
 * Module contract:
 *   mountNotesView({ parent, picker, onClose? }) → { unmount }
 *
 * Subscribes to game/state.js so any change (including notes added
 * from the clue panel while this view is open) re-renders both panes.
 * Picker freezes while the view is open, like the clue panel.
 *
 * Local state lives in module-private vars on this instance: which
 * folder is selected, the current search query, which note (if any)
 * is being inline-edited. None of this is persisted — refreshing
 * the page closes the view.
 */

import {
  subscribe,
  addNote, editNote, moveNote, deleteNote,
  addFolder, renameFolder, deleteFolder,
} from '../game/state.js';
import {
  listFolders, listNotes,
  isDefaultFolder, getFallbackFolderId,
  noteCount, noteCountInFolder,
} from '../game/notes.js';

const FOLDER_ALL_ID = '__all__';   // sentinel, not a real folder

export function mountNotesView({ parent, picker, onClose }) {
  // ─── DOM ──────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'notes-view';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.innerHTML = `
    <style>
      .notes-view {
        position: fixed; inset: 0;
        z-index: 30;
        pointer-events: auto;
        display: flex; align-items: center; justify-content: center;
        background: rgba(4, 6, 14, 0.72);
        font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
        color: #e6ecf6;
      }
      .notes-view__card {
        background: #11162a;
        border: 1px solid #2a3553;
        border-radius: 6px;
        width: min(960px, calc(100vw - 48px));
        height: min(640px, calc(100vh - 48px));
        display: flex; flex-direction: column;
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.62);
        overflow: hidden;
      }
      .notes-view__header {
        padding: 12px 16px;
        border-bottom: 1px solid #232c44;
        display: flex; align-items: center; gap: 12px;
      }
      .notes-view__title {
        font-size: 16px; font-weight: 600;
        letter-spacing: 0.04em; text-transform: uppercase;
        color: #b6c4e2;
      }
      .notes-view__search {
        flex: 1;
        font: inherit; color: inherit;
        background: #0c1120;
        border: 1px solid #2a3553; border-radius: 4px;
        padding: 6px 10px;
      }
      .notes-view__close {
        font: inherit;
        background: transparent; color: #8294b8;
        border: 0; cursor: pointer;
        padding: 4px 8px;
      }
      .notes-view__close:hover { color: #e6ecf6; }

      .notes-view__body {
        flex: 1; min-height: 0;
        display: grid; grid-template-columns: 220px 1fr;
      }

      /* ─── Left pane: folders ──────────────────────────────────── */
      .notes-view__folders {
        border-right: 1px solid #232c44;
        background: #0d1224;
        display: flex; flex-direction: column;
        overflow: hidden;
      }
      .notes-view__folders-list {
        flex: 1; overflow-y: auto;
        padding: 6px 0;
      }
      .notes-view__folder {
        padding: 6px 14px;
        cursor: pointer;
        display: flex; justify-content: space-between; align-items: center;
        gap: 8px;
        color: #c9d3e6;
        border-left: 2px solid transparent;
      }
      .notes-view__folder:hover { background: #141b35; }
      .notes-view__folder--active {
        background: #182142;
        border-left-color: #4c75ff;
        color: #ffffff;
      }
      .notes-view__folder-name { flex: 1; min-width: 0; word-break: break-word; }
      .notes-view__folder-count {
        font-size: 11px;
        color: #8294b8;
      }
      .notes-view__folder-delete {
        font: inherit;
        background: transparent; color: #6c7da0;
        border: 0; cursor: pointer;
        font-size: 12px; padding: 0 2px;
        display: none;
      }
      .notes-view__folder:hover .notes-view__folder-delete { display: inline-block; }
      .notes-view__folder-delete:hover { color: #ff8088; }
      .notes-view__folders-actions {
        padding: 8px 12px;
        border-top: 1px solid #232c44;
      }
      .notes-view__add-folder-btn {
        font: inherit;
        width: 100%;
        background: #1f2a48; color: #e6ecf6;
        border: 1px solid #2f3c60; border-radius: 4px;
        padding: 6px 10px;
        cursor: pointer;
      }
      .notes-view__add-folder-btn:hover { background: #2a3760; }
      .notes-view__new-folder-form {
        display: none;
      }
      .notes-view__new-folder-form--open { display: block; }
      .notes-view__new-folder-input {
        width: 100%;
        font: inherit; color: inherit;
        background: #0c1120;
        border: 1px solid #2a3553; border-radius: 4px;
        padding: 5px 8px;
        margin-bottom: 6px;
      }
      .notes-view__new-folder-actions {
        display: flex; gap: 6px;
      }
      .notes-view__new-folder-actions button {
        flex: 1;
        font: inherit;
        background: #1f2a48; color: #e6ecf6;
        border: 1px solid #2f3c60; border-radius: 4px;
        padding: 5px 8px;
        cursor: pointer;
      }
      .notes-view__new-folder-actions button:hover { background: #2a3760; }

      /* ─── Right pane: notes ───────────────────────────────────── */
      .notes-view__notes {
        display: flex; flex-direction: column;
        overflow: hidden;
      }
      .notes-view__notes-toolbar {
        padding: 8px 16px;
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid #232c44;
        background: #0d1224;
      }
      .notes-view__notes-context { color: #8294b8; font-size: 12px; }
      .notes-view__add-note-btn {
        font: inherit;
        background: #2e5cff; color: #f4f7ff;
        border: 1px solid #4c75ff; border-radius: 4px;
        padding: 5px 12px;
        cursor: pointer;
      }
      .notes-view__add-note-btn:hover { background: #3d6cff; }

      .notes-view__notes-list {
        flex: 1; overflow-y: auto;
        padding: 12px;
        display: flex; flex-direction: column; gap: 10px;
      }
      .notes-view__note {
        background: #161c2c;
        border: 1px solid #232c44; border-radius: 4px;
        padding: 10px 12px;
      }
      .notes-view__note-content {
        white-space: pre-wrap;
        color: #d8e0f0;
        margin-bottom: 8px;
      }
      .notes-view__note-edit {
        width: 100%;
        font: inherit; color: inherit;
        background: #0c1120;
        border: 1px solid #2a3553; border-radius: 4px;
        padding: 8px 10px;
        min-height: 80px;
        resize: vertical;
        margin-bottom: 8px;
      }
      .notes-view__note-meta {
        display: flex; justify-content: space-between; align-items: center;
        gap: 8px;
        color: #6c7da0; font-size: 11px;
      }
      .notes-view__note-meta select {
        font: inherit; font-size: 12px;
        background: #0c1120; color: #d8e0f0;
        border: 1px solid #2a3553; border-radius: 4px;
        padding: 3px 6px;
      }
      .notes-view__note-actions {
        display: flex; gap: 6px;
      }
      .notes-view__note-actions button {
        font: inherit; font-size: 12px;
        background: transparent; color: #8294b8;
        border: 0; cursor: pointer;
        padding: 2px 6px;
      }
      .notes-view__note-actions button:hover { color: #e6ecf6; }
      .notes-view__note-actions button.danger:hover { color: #ff8088; }

      .notes-view__empty {
        padding: 36px 24px;
        color: #6c7da0;
        text-align: center;
      }
    </style>

    <div class="notes-view__card" data-card>
      <header class="notes-view__header">
        <div class="notes-view__title">Notes</div>
        <input class="notes-view__search" type="search" data-search
               placeholder="Search all notes…" />
        <button class="notes-view__close" data-action="close" title="Close (Esc)">✕</button>
      </header>

      <div class="notes-view__body">
        <aside class="notes-view__folders">
          <div class="notes-view__folders-list" data-folders-list></div>
          <div class="notes-view__folders-actions">
            <button class="notes-view__add-folder-btn" data-action="show-new-folder">+ New folder</button>
            <div class="notes-view__new-folder-form" data-new-folder-form>
              <input class="notes-view__new-folder-input" type="text" data-new-folder-input
                     placeholder="Folder name…" />
              <div class="notes-view__new-folder-actions">
                <button data-action="cancel-new-folder">Cancel</button>
                <button data-action="save-new-folder">Create</button>
              </div>
            </div>
          </div>
        </aside>

        <section class="notes-view__notes">
          <div class="notes-view__notes-toolbar">
            <span class="notes-view__notes-context" data-context></span>
            <button class="notes-view__add-note-btn" data-action="add-note">+ New note</button>
          </div>
          <div class="notes-view__notes-list" data-notes-list></div>
        </section>
      </div>
    </div>
  `;
  parent.appendChild(root);

  // ─── Local view state ────────────────────────────────────────────
  let activeFolderId = FOLDER_ALL_ID;     // 'all' | folder-id
  let searchQuery    = '';
  let editingNoteId  = null;              // noteId being inline-edited
  let draftOpen      = false;             // "+ New note" inline draft visible

  // ─── Picker freeze ───────────────────────────────────────────────
  if (picker && typeof picker.setInputBlocked === 'function') {
    picker.setInputBlocked(true);
  }

  // ─── Render helpers ──────────────────────────────────────────────
  const foldersListEl  = root.querySelector('[data-folders-list]');
  const notesListEl    = root.querySelector('[data-notes-list]');
  const contextEl      = root.querySelector('[data-context]');
  const searchInput    = root.querySelector('[data-search]');
  const newFolderForm  = root.querySelector('[data-new-folder-form]');
  const newFolderInput = root.querySelector('[data-new-folder-input]');

  function renderFolders() {
    const folders = listFolders();
    foldersListEl.innerHTML = '';

    // "All notes" pseudo-folder.
    const allRow = document.createElement('div');
    allRow.className = 'notes-view__folder' + (activeFolderId === FOLDER_ALL_ID ? ' notes-view__folder--active' : '');
    allRow.dataset.folderId = FOLDER_ALL_ID;
    const allCount = noteCount();
    allRow.innerHTML = `
      <span class="notes-view__folder-name">All notes</span>
      <span class="notes-view__folder-count">${allCount}</span>
    `;
    foldersListEl.appendChild(allRow);

    for (const f of folders) {
      const row = document.createElement('div');
      row.className = 'notes-view__folder' + (activeFolderId === f.id ? ' notes-view__folder--active' : '');
      row.dataset.folderId = f.id;
      const count = noteCountInFolder(f.id);
      const canDelete = !isDefaultFolder(f.id);
      row.innerHTML = `
        <span class="notes-view__folder-name" data-folder-name></span>
        <span class="notes-view__folder-count">${count}</span>
        ${ canDelete
            ? `<button class="notes-view__folder-delete" data-action="delete-folder" title="Delete folder">×</button>`
            : '' }
      `;
      row.querySelector('[data-folder-name]').textContent = f.name;
      foldersListEl.appendChild(row);
    }
  }

  function renderNotes() {
    const folderId = activeFolderId === FOLDER_ALL_ID ? null : activeFolderId;
    const notes = listNotes({ folderId, search: searchQuery });

    // Toolbar context line.
    const folderName =
      activeFolderId === FOLDER_ALL_ID
        ? 'All notes'
        : (listFolders().find(f => f.id === activeFolderId)?.name ?? 'Folder');
    const suffix = searchQuery ? ` · matching "${searchQuery}"` : '';
    contextEl.textContent = `${folderName} · ${notes.length} note${notes.length === 1 ? '' : 's'}${suffix}`;

    notesListEl.innerHTML = '';

    // Draft pseudo-card: appears at the top when "+ New note" is clicked.
    if (draftOpen) {
      const folders = listFolders();
      const draftFolder =
        activeFolderId !== FOLDER_ALL_ID && folders.find(f => f.id === activeFolderId)
          ? activeFolderId
          : getFallbackFolderId();
      const folderOptions = folders.map(f =>
        `<option value="${f.id}"${f.id === draftFolder ? ' selected' : ''}>${escapeHtml(f.name)}</option>`,
      ).join('');
      const draftCard = document.createElement('div');
      draftCard.className = 'notes-view__note';
      draftCard.dataset.draft = '1';
      draftCard.innerHTML = `
        <textarea class="notes-view__note-edit" data-draft-textarea
                  placeholder="What did you notice?"></textarea>
        <div class="notes-view__note-meta">
          <select data-draft-folder>${folderOptions}</select>
          <div class="notes-view__note-actions">
            <button data-action="save-draft">Save</button>
            <button data-action="cancel-draft">Cancel</button>
          </div>
        </div>
      `;
      notesListEl.appendChild(draftCard);
      // Defer focus so the textarea is in the DOM tree.
      queueMicrotask(() => draftCard.querySelector('[data-draft-textarea]')?.focus());
    }

    if (notes.length === 0 && !draftOpen) {
      const empty = document.createElement('div');
      empty.className = 'notes-view__empty';
      empty.textContent = searchQuery
        ? 'No notes match your search.'
        : 'No notes here yet. Click an object in the room and use Add to Notes — or use + New note above.';
      notesListEl.appendChild(empty);
      return;
    }

    const folders = listFolders();

    for (const note of notes) {
      const card = document.createElement('div');
      card.className = 'notes-view__note';
      card.dataset.noteId = note.id;

      const isEditing = editingNoteId === note.id;

      const folderOptions = folders.map(f =>
        `<option value="${f.id}"${f.id === note.folderId ? ' selected' : ''}>${escapeHtml(f.name)}</option>`,
      ).join('');

      card.innerHTML = `
        ${ isEditing
            ? `<textarea class="notes-view__note-edit" data-edit-textarea></textarea>`
            : `<div class="notes-view__note-content" data-content></div>` }
        <div class="notes-view__note-meta">
          <select data-folder-select title="Move to folder">${folderOptions}</select>
          <div class="notes-view__note-actions">
            ${ isEditing
                ? `<button data-action="save-edit">Save</button>
                   <button data-action="cancel-edit">Cancel</button>`
                : `<button data-action="edit">Edit</button>
                   <button data-action="delete" class="danger">Delete</button>` }
          </div>
        </div>
      `;

      if (isEditing) {
        const ta = card.querySelector('[data-edit-textarea]');
        ta.value = note.content;
      } else {
        card.querySelector('[data-content]').textContent = note.content;
      }

      notesListEl.appendChild(card);
    }
  }

  function renderAll() {
    renderFolders();
    renderNotes();
  }

  // ─── Event delegation ────────────────────────────────────────────

  // Folders pane (left).
  foldersListEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-folder-id]');
    if (!row) return;
    const folderId = row.dataset.folderId;

    if (e.target?.dataset?.action === 'delete-folder') {
      e.stopPropagation();
      if (folderId === FOLDER_ALL_ID || isDefaultFolder(folderId)) return;
      const folder = listFolders().find(f => f.id === folderId);
      const count  = noteCountInFolder(folderId);
      const msg    = count > 0
        ? `Delete folder "${folder?.name}"? Its ${count} note${count === 1 ? '' : 's'} will move to Random.`
        : `Delete folder "${folder?.name}"?`;
      if (!window.confirm(msg)) return;
      if (activeFolderId === folderId) activeFolderId = FOLDER_ALL_ID;
      deleteFolder(folderId);
      // re-render driven by state subscriber.
      return;
    }

    activeFolderId = folderId;
    renderAll();
  });

  // Notes pane (right) — handles edit/save/delete/move per card.
  notesListEl.addEventListener('click', (e) => {
    const card = e.target.closest('[data-note-id]');
    if (!card) return;
    const noteId = card.dataset.noteId;
    const action = e.target?.dataset?.action;

    if (action === 'edit') {
      editingNoteId = noteId;
      renderNotes();
      const ta = notesListEl.querySelector(`[data-note-id="${noteId}"] [data-edit-textarea]`);
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    } else if (action === 'save-edit') {
      const ta = card.querySelector('[data-edit-textarea]');
      const content = (ta?.value ?? '').trim();
      // Clear editing state BEFORE the dispatch — the state subscriber
      // re-renders synchronously inside commit() and reads editingNoteId.
      editingNoteId = null;
      if (content) editNote(noteId, { content });
      else renderNotes();   // dispatch was skipped, render manually.
    } else if (action === 'cancel-edit') {
      editingNoteId = null;
      renderNotes();
    } else if (action === 'delete') {
      if (!window.confirm('Delete this note?')) return;
      deleteNote(noteId);
    }
  });

  // Move-via-dropdown (change event, not click).
  notesListEl.addEventListener('change', (e) => {
    if (!e.target.matches('[data-folder-select]')) return;
    const card = e.target.closest('[data-note-id]');
    if (!card) return;
    moveNote(card.dataset.noteId, e.target.value);
  });

  // Header / toolbar / new-folder form.
  root.addEventListener('click', (e) => {
    if (!root.contains(e.target)) return;
    const action = e.target?.dataset?.action;
    switch (action) {
      case 'close':
        unmount();
        break;
      case 'add-note': {
        // Open the inline draft. We don't insert a real note until
        // the user clicks Save — avoids leaving a phantom empty note
        // behind when they cancel.
        draftOpen = true;
        renderNotes();
        break;
      }
      case 'cancel-draft':
        draftOpen = false;
        renderNotes();
        break;
      case 'save-draft': {
        const draftCard = notesListEl.querySelector('[data-draft="1"]');
        if (!draftCard) break;
        const ta = draftCard.querySelector('[data-draft-textarea]');
        const sel = draftCard.querySelector('[data-draft-folder]');
        const content = (ta?.value ?? '').trim();
        if (!content) break;        // ignore empty save attempts
        // Close the draft BEFORE dispatching — the state subscriber
        // re-renders synchronously inside commit() and reads draftOpen.
        draftOpen = false;
        addNote({ content, folderId: sel?.value, levelDiscovered: null });
        break;
      }
      case 'show-new-folder':
        newFolderForm.classList.add('notes-view__new-folder-form--open');
        newFolderInput.value = '';
        newFolderInput.focus();
        break;
      case 'cancel-new-folder':
        newFolderForm.classList.remove('notes-view__new-folder-form--open');
        break;
      case 'save-new-folder': {
        const name = newFolderInput.value.trim();
        if (!name) return;
        newFolderForm.classList.remove('notes-view__new-folder-form--open');
        const id = addFolder(name);
        // Subscriber already re-rendered with the new folder. Now flip
        // the active selection and re-render so it highlights.
        activeFolderId = id;
        renderAll();
        break;
      }
    }
  });

  // Search.
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderNotes();
  });

  // Click-on-backdrop closes (only if click is outside the card).
  const card = root.querySelector('[data-card]');
  root.addEventListener('mousedown', (e) => {
    if (!card.contains(e.target)) unmount();
  });

  // ─── Lifecycle ───────────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (e.key !== 'Escape') return;
    const ae = document.activeElement;
    // If the user is typing somewhere in the panel, let them keep typing.
    if (ae && root.contains(ae) && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT')) return;
    e.preventDefault();
    unmount();
  };
  document.addEventListener('keydown', onKeyDown);

  const unsubscribe = subscribe((_state, action) => {
    // Re-render on any change that could affect the notes view.
    if (!action) return;
    const t = action.type;
    if (t === 'addNote' || t === 'editNote' || t === 'moveNote' || t === 'deleteNote'
     || t === 'addFolder' || t === 'renameFolder' || t === 'deleteFolder'
     || t === 'resetProgress') {
      renderAll();
    }
  });

  let unmounted = false;
  function unmount() {
    if (unmounted) return;
    unmounted = true;
    unsubscribe();
    document.removeEventListener('keydown', onKeyDown);
    if (picker && typeof picker.setInputBlocked === 'function') {
      picker.setInputBlocked(false);
    }
    root.remove();
    if (typeof onClose === 'function') onClose();
  }

  // Initial render.
  renderAll();

  return { unmount };
}

// ─── Local utilities ────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
