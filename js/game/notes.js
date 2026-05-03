/**
 * game/notes.js
 *
 * Notes-domain selectors and derived helpers. The actual state
 * mutations (addNote / editNote / moveNote / deleteNote / addFolder /
 * renameFolder / deleteFolder) live in `state.js` — this module is a
 * thin read-side facade that:
 *
 *   1. Hides the underlying state shape from UI modules.
 *   2. Provides sorted views (notes by createdAt desc, folders by
 *      createdAt asc with default folders first).
 *   3. Computes counts and search matches.
 *
 * The whole point: when the state shape changes (e.g. nested folders
 * land later), only this file changes, not every UI panel.
 */

import { getState } from './state.js';

const DEFAULT_FOLDER_IDS = new Set([
  'folder-suspects',
  'folder-evidence',
  'folder-timeline',
  'folder-random',
]);

const FALLBACK_FOLDER_ID = 'folder-random';

// ─── Folders ────────────────────────────────────────────────────────
export function listFolders() {
  const folders = Object.values(getState().folders);
  // Default folders first (in their plan-defined order), then
  // user-created folders by createdAt asc.
  const defaultOrder = ['folder-suspects', 'folder-evidence', 'folder-timeline', 'folder-random'];
  const defaults = defaultOrder
    .map(id => folders.find(f => f.id === id))
    .filter(Boolean);
  const custom = folders
    .filter(f => !DEFAULT_FOLDER_IDS.has(f.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  return [...defaults, ...custom];
}

export function isDefaultFolder(folderId) {
  return DEFAULT_FOLDER_IDS.has(folderId);
}

export function getFallbackFolderId() {
  return FALLBACK_FOLDER_ID;
}

// ─── Notes ──────────────────────────────────────────────────────────
export function listNotes({ folderId = null, search = '' } = {}) {
  const all = Object.values(getState().notes)
    .sort((a, b) => b.createdAt - a.createdAt);

  let filtered = all;
  if (folderId) filtered = filtered.filter(n => n.folderId === folderId);

  const q = (search || '').trim().toLowerCase();
  if (q) filtered = filtered.filter(n => n.content.toLowerCase().includes(q));

  return filtered;
}

export function noteCount() {
  return Object.keys(getState().notes).length;
}

export function noteCountInFolder(folderId) {
  let n = 0;
  for (const note of Object.values(getState().notes)) {
    if (note.folderId === folderId) n++;
  }
  return n;
}
