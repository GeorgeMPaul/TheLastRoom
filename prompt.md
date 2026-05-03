UI Component Prompt Guide — The Last Room
Drop this into your agent's prompt verbatim
You are building UI for The Last Room, a Three.js point-and-click mystery game. Read CLAUDE.md and docs/plan/implementation-plan.md before writing code. Then follow the rules below — they are non-negotiable.

Stack (no exceptions)
Vanilla HTML + CSS + ES modules. No React, Vue, Svelte, JSX, TypeScript, Tailwind, preprocessors, or any build step. Files are served as-is via python -m http.server.
No npm, no node_modules, no package.json. If you reach for a library, stop.
No imports from three or anything in js/engine/. UI is forbidden from touching Three.js. If you need data from a 3D click, it arrives via a game/state.js action dispatched by the picker — never directly.
All component CSS lives inside the component's own JS file as a <style> tag injected once (scoped via a unique root class like .clue-panel). No global stylesheet edits beyond index.html.
Module contract — every UI file must follow this exactly

// js/ui/<name>.js
import { subscribe, getState, /* relevant actions */ } from '../game/state.js';

export function mount(container, props = {}) {
  const root = document.createElement('div');
  root.className = '<name>';
  root.innerHTML = `<style>/* scoped */</style> <!-- markup -->`;
  container.appendChild(root);

  // wire DOM listeners; subscribe to state if needed
  const unsub = subscribe((state, action) => { /* re-render or patch */ });

  return {
    unmount() {
      unsub();
      root.remove();
      // cancel timers, remove window listeners, etc.
    },
  };
}
Rules:

mount(container, props) → { unmount } is the only public surface. No classes.
Read game data via getState(); mutate only via exported actions in js/game/state.js. Never write state.x = ....
Subscribe in mount, unsubscribe in unmount. Same for addEventListener on window/document/timers.
Markup uses semantic BEM-ish class names: .clue-panel, .clue-panel__title, .clue-panel__body, .clue-panel--open. Styling is deferred — write the structure now, the look-and-feel pass happens later. Do not try to make it pretty. Minimal CSS for layout/positioning only.
No emojis, no decorative copy. Real story copy comes from level content files.
Z-index discipline (set in overlay-root.js, don't override)

canvas (0) → HUD (10) → modals/clue+question (20) → notes-view (30) → level-transition (40)
#ui-root has pointer-events: none. Each component sets pointer-events: auto on its interactive surface only. A full-screen overlay (modal) takes auto on its backdrop; a floating button takes auto on the button itself.

Picker coordination
When a modal (clue panel, question panel, notes view, accusation panel) opens, the 3D picker must freeze. The pattern: the component imports a setInputBlocked(bool) from js/engine/picker.js — this is the one engine import UI is allowed, and only for input blocking, never for scene/mesh/camera access. Block on mount, unblock on unmount. Also handle Escape and click-on-backdrop to close.

Data flow per component (use this table)
Component	Reads	Dispatches	Triggered by
clue-panel	props.reveal, props.clueId	(none — child form does addNote)	Picker → discoverClue → caller mounts panel
add-to-notes-button	state.folders	addNote({ content, sourceClueId, levelDiscovered, folderId })	Embedded in clue-panel
question-panel	props.question, state.cluesByLevel[currentLevelId] for gating	answerQuestion(levelId, correct)	HUD button when requiredClues satisfied
accusation-panel	props.suspects, props.solution	submitAccusation(suspectId, correct)	Level 7 only
notes-view	state.notes, state.folders	addNote, editNote, moveNote, deleteNote, addFolder, renameFolder, deleteFolder	notes-button click or N key
notes-button	state.notes (count badge)	(mounts notes-view)	Always in HUD
character-card	props.character	(selection callback via props.onSelect)	Used inside accusation-panel
hud	state.cluesByLevel, state.currentLevelId	(none directly — children do)	Always mounted at boot
level-transition	props.outro, props.nextTitle	advanceToLevel(nextId) mid-fade	answerQuestion(correct=true) subscriber
If you need state your component doesn't fit into the existing actions, stop and ask before adding to js/game/state.js — the schema is versioned (schemaVersion: 1) and adding fields breaks saves.

Build order & validation
Prototype in prototypes/<name>.html first — a standalone HTML file with fake props inline. Iterate on layout/interaction there. Then port the markup into js/ui/<name>.js and wire it to real state.
Verify the contract before claiming done:
Mount, then unmount → no leftover DOM, no leftover listeners (check getEventListeners(window) in DevTools).
Subscribe round-trip: dispatch an action from console, confirm UI updates.
Picker freeze: with modal open, clicking the canvas does nothing.
Reload mid-state: localStorage last-room-save-v1 round-trips correctly.
No console.log left in committed code. Warnings for genuine misconfigurations (e.g., missing folder ID) are fine.
What "done" looks like for one component
A new file at js/ui/<name>.js that:

exports mount returning { unmount },
has zero imports from three or js/engine/* (except picker.js's setInputBlocked),
subscribes/unsubscribes cleanly,
uses semantic class names, minimal layout-only CSS,
has a matching standalone prototypes/<name>.html showing it works with mock data,
is mentioned by name in the build sequence step it belongs to (Steps 6, 8, 9, 10, 12, 15 in the plan).
Reference: the one component that already exists in your shape
Read js/ui/dev-overlay.js for the exact module shape (mount, scoped <style> block, internal click delegation, unmount cleanup with cancelAnimationFrame). Match its conventions.