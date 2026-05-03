/**
 * game/state.js
 *
 * Single source of truth for game progression. Owns: which clues have
 * been discovered per level, which levels have been answered, all
 * notes and folders, and the level-7 accusation result. Mutations
 * happen ONLY through the action functions exported below — every
 * action persists to localStorage and notifies subscribers.
 *
 * Design rules (from CLAUDE.md / implementation-plan.md):
 *   - Single localStorage key: 'last-room-save-v1'
 *   - schemaVersion mismatch → wipe and start fresh (graceful reset)
 *   - Sets are JSON-unfriendly; we round-trip them as arrays
 *   - No external state library — small surface area, no build step
 *
 * Exports:
 *   getState()                              → live reference (do not mutate)
 *   subscribe(fn) → unsubscribe              fn(state, action) on every change
 *
 *   discoverClue(levelId, clueId)
 *   addNote({ content, sourceClueId, levelDiscovered, folderId })
 *   editNote(noteId, patch)                 patch = partial { content, folderId }
 *   moveNote(noteId, folderId)
 *   deleteNote(noteId)
 *   addFolder(name)                          → folderId
 *   renameFolder(folderId, name)
 *   deleteFolder(folderId)                   notes in deleted folder fall back to 'folder-random'
 *   answerQuestion(levelId, correct)
 *   advanceToLevel(levelId)
 *   submitAccusation(suspectId, correct)
 *   resetProgress()
 */

const SAVE_KEY        = 'last-room-save-v1';
const SCHEMA_VERSION  = 1;

const DEFAULT_FOLDERS = [
  { id: 'folder-suspects', name: 'Suspects' },
  { id: 'folder-evidence', name: 'Evidence' },
  { id: 'folder-timeline', name: 'Timeline' },
  { id: 'folder-random',   name: 'Random'   },
];
const FALLBACK_FOLDER_ID = 'folder-random';

// ─── Default state factory ──────────────────────────────────────────
function makeDefaultState() {
  const now = Date.now();
  const folders = {};
  for (const f of DEFAULT_FOLDERS) {
    folders[f.id] = { id: f.id, name: f.name, createdAt: now };
  }
  return {
    schemaVersion:   SCHEMA_VERSION,
    currentLevelId:  'level-01',
    cluesByLevel:    {},     // levelId → Set<clueId>
    answeredLevels:  new Set(),
    notes:           {},     // noteId  → { id, content, sourceClueId, levelDiscovered, folderId, createdAt }
    folders,
    accusation:      null,   // { suspectId, correct, timestamp }
  };
}

// ─── Serialization (Sets ↔ arrays) ──────────────────────────────────
function serialize(state) {
  return JSON.stringify({
    ...state,
    cluesByLevel: Object.fromEntries(
      Object.entries(state.cluesByLevel).map(([k, v]) => [k, [...v]]),
    ),
    answeredLevels: [...state.answeredLevels],
  });
}

function deserialize(json) {
  const raw = JSON.parse(json);
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    console.warn(
      `[state] save schemaVersion=${raw.schemaVersion} but code is ${SCHEMA_VERSION} — resetting progress.`,
    );
    return null;
  }
  return {
    ...raw,
    cluesByLevel: Object.fromEntries(
      Object.entries(raw.cluesByLevel || {}).map(([k, v]) => [k, new Set(v)]),
    ),
    answeredLevels: new Set(raw.answeredLevels || []),
    notes:    raw.notes    || {},
    folders:  raw.folders  || {},
    accusation: raw.accusation ?? null,
  };
}

// ─── Module-scoped store + load ─────────────────────────────────────
let state;
try {
  const json = localStorage.getItem(SAVE_KEY);
  state = json ? (deserialize(json) || makeDefaultState()) : makeDefaultState();
} catch (err) {
  console.warn('[state] load failed, starting fresh:', err);
  state = makeDefaultState();
}

// ─── Pubsub ─────────────────────────────────────────────────────────
const subscribers = new Set();

function notify(action) {
  for (const fn of subscribers) {
    try { fn(state, action); }
    catch (err) { console.error('[state] subscriber threw:', err); }
  }
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getState() { return state; }

// ─── Persistence ────────────────────────────────────────────────────
function persist() {
  try { localStorage.setItem(SAVE_KEY, serialize(state)); }
  catch (err) { console.warn('[state] persist failed:', err); }
}

function commit(action) {
  persist();
  notify(action);
}

// ─── ID helpers ─────────────────────────────────────────────────────
const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Actions ────────────────────────────────────────────────────────
export function discoverClue(levelId, clueId) {
  if (!levelId || !clueId) return;
  if (!state.cluesByLevel[levelId]) state.cluesByLevel[levelId] = new Set();
  if (state.cluesByLevel[levelId].has(clueId)) return;
  state.cluesByLevel[levelId].add(clueId);
  commit({ type: 'discoverClue', levelId, clueId });
}

export function addNote({ content, sourceClueId = null, levelDiscovered = null, folderId = FALLBACK_FOLDER_ID }) {
  const id = uid('note');
  const finalFolder = state.folders[folderId] ? folderId : FALLBACK_FOLDER_ID;
  state.notes[id] = {
    id, content,
    sourceClueId,
    levelDiscovered,
    folderId: finalFolder,
    createdAt: Date.now(),
  };
  commit({ type: 'addNote', noteId: id });
  return id;
}

export function editNote(noteId, patch = {}) {
  const note = state.notes[noteId];
  if (!note) return;
  if ('content'  in patch) note.content  = patch.content;
  if ('folderId' in patch && state.folders[patch.folderId]) note.folderId = patch.folderId;
  commit({ type: 'editNote', noteId });
}

export function moveNote(noteId, folderId) {
  const note = state.notes[noteId];
  if (!note || !state.folders[folderId]) return;
  note.folderId = folderId;
  commit({ type: 'moveNote', noteId, folderId });
}

export function deleteNote(noteId) {
  if (!state.notes[noteId]) return;
  delete state.notes[noteId];
  commit({ type: 'deleteNote', noteId });
}

export function addFolder(name) {
  const id = uid('folder');
  state.folders[id] = { id, name, createdAt: Date.now() };
  commit({ type: 'addFolder', folderId: id });
  return id;
}

export function renameFolder(folderId, name) {
  const folder = state.folders[folderId];
  if (!folder) return;
  folder.name = name;
  commit({ type: 'renameFolder', folderId });
}

export function deleteFolder(folderId) {
  if (!state.folders[folderId])      return;
  if (folderId === FALLBACK_FOLDER_ID) return;
  for (const note of Object.values(state.notes)) {
    if (note.folderId === folderId) note.folderId = FALLBACK_FOLDER_ID;
  }
  delete state.folders[folderId];
  commit({ type: 'deleteFolder', folderId });
}

export function answerQuestion(levelId, correct) {
  if (correct) state.answeredLevels.add(levelId);
  commit({ type: 'answerQuestion', levelId, correct });
}

export function advanceToLevel(levelId) {
  state.currentLevelId = levelId;
  commit({ type: 'advanceToLevel', levelId });
}

export function submitAccusation(suspectId, correct) {
  state.accusation = { suspectId, correct, timestamp: Date.now() };
  commit({ type: 'submitAccusation', suspectId, correct });
}

export function resetProgress() {
  state = makeDefaultState();
  commit({ type: 'resetProgress' });
}
