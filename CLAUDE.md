# CLAUDE.md

## Project: The Last Room

A point-and-click mystery game set in a single studio apartment in Bangalore, across seven different time periods. Each level is the same room at a different moment in the timeline of one woman's death. The player explores by clicking objects, reading the clues those objects reveal, and saving meaningful information to a personal notes system. Each level ends with a multiple-choice question; answering correctly advances to the next time period. The final level (Level 7) is an accusation — the player picks a suspect from a fixed character roster, using their accumulated notes as their reference.

The core loop is: **observe → click → read → take notes → answer**. The puzzle isn't mechanical; it's cognitive.

The full story bible is in `game_story.md`. The original engineering blueprint is in `game_dev_plan.md`. The reconciled, in-flight implementation plan is in `docs/plan/implementation-plan.md` — that document is authoritative when it disagrees with the older two.

## Running

```bash
python -m http.server 8000
```

…then open `http://localhost:8000`. ES modules require a real HTTP origin; double-clicking `index.html` will not work.

## Tech stack

- **Three.js r0.158** loaded as an ES module via `<script type="importmap">` from unpkg. Every JS module starts with `import * as THREE from 'three';`. GLTFLoader is `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';`.
- **No build step. No bundler. No package manager.** Files are served as-is. The importmap does the resolution.
- Vanilla HTML/CSS for all UI overlays. No framework, no preprocessor.
- Desktop browsers first, tablet support secondary.

The original engineering plan called for r128 with a global `window.THREE`. We deliberately kept r0.158 + ESM importmap because the prototype already works that way and the importmap pattern is cleaner. Don't switch back to globals.

## Architecture: four layers, downward-only

```
┌─────────────────────────────────────────────┐
│  CONTENT  (data files: levels, characters)  │
└─────────────────────────────────────────────┘
                     ▲
┌─────────────────────────────────────────────┐
│  UI  (overlays, panels, notes view, HUD)    │
└─────────────────────────────────────────────┘
                     ▲
┌─────────────────────────────────────────────┐
│  GAME  (state store, level runner, notes)   │
└─────────────────────────────────────────────┘
                     ▲
┌─────────────────────────────────────────────┐
│  ENGINE  (Three.js: scene, loader, picker)  │
└─────────────────────────────────────────────┘
```

Higher layers may import from lower layers. Lower layers must never know about higher ones.

- **Engine** knows about Three.js, GLB loading, raycasting, cameras, lighting, rendering. Knows nothing about story, puzzles, or notes.
- **Game** owns the state — current level, discovered clues, saved notes, answered questions. Exposes actions and a subscribe mechanism so UI can react.
- **UI** is HTML/CSS — the clue panel, notes view, HUD, level transitions. UI subscribes to game state and dispatches actions. **UI never imports Three.js.**
- **Content** is pure data — one file per level, one file per character. Adding a new level should be a content file + a GLB, with no engine or game changes.

Litmus test: can you ship a new level by adding only a content file and a GLB? If not, the engine is leaking specifics that should have been data.

## Repo layout

```
.
├── index.html              entry; importmap + #canvas-container + #ui-root
├── Game.html               original prototype, kept as a scratch page; deletable once superseded
├── CLAUDE.md               this file
├── README.md
├── game_dev_plan.md        original engineering blueprint (older — see docs/plan/ for current)
├── game_story.md           full story bible
│
├── js/
│   ├── main.js             bootstrap
│   ├── engine/             Three.js wrappers — scene, loader, picker, camera-rig, audio
│   ├── game/               state, level-runner, progression, notes
│   ├── ui/                 every overlay panel; styling deferred (see plan)
│   └── content/            levels/level-01.js … level-07.js, characters/<id>.js
│
├── assets/
│   ├── models/             level-NN.glb — one per level, pre-baked state
│   ├── source/blender/     authoring sources (.blend + textures)
│   ├── audio/{ambient,sfx}/
│   └── images/{clues,characters}/
│
├── docs/
│   ├── plan/               implementation-plan.md — authoritative working spec
│   └── references/         designer mockups
│
└── prototypes/             standalone HTML for UI experiments
```

The parent folder `D:\MiniJamGame\` contains an unrelated sphere-walking game. It lives outside this repo. **Never reference it from new code.**

## Level content schema

```js
// js/content/levels/level-01.js
export default {
  schemaVersion: 1,
  id: 'level-01',
  title: 'The Crime Scene',
  subtitle: 'Monday, March 18 — 9:15 AM',

  model: 'assets/models/level-01.glb',

  camera: {
    initial:    { position: [0, 1.6, 3.2], lookAt: [0, 1.2, 0] },
    constraints: {
      type: 'limited-orbit',
      minPolar: 1.0, maxPolar: 1.8,
      minAzimuth: -0.6, maxAzimuth: 0.6,
      minDistance: 2.5, maxDistance: 4.0,
    },
  },

  lighting: { tod: 'day' },   // one of: dawn / day / dusk / night

  audio: {
    ambient:       'assets/audio/ambient/crime-scene-silence.mp3',
    ambientVolume: 0.3,
    music: null,
  },

  // Mesh names follow Interact_<Object>_<NNN> from Blender.
  // The picker only checks against the keys in this map.
  interactives: {
    'Interact_Cup_001': {
      label: 'Coffee cup',
      reveal: {
        type: 'text-with-image',
        title: 'A single cup',
        body: 'Cold coffee. White powder residue at the bottom. One cup, not two.',
        image: 'assets/images/clues/cup-residue.jpg',
      },
      clueId: 'clue-cup-residue',
    },
  },

  question: {
    type: 'mcq',
    prompt: 'What killed her?',
    options: [
      { id: 'a', text: 'Overdose',       correct: false },
      { id: 'b', text: 'Poisoning',      correct: true  },
      { id: 'c', text: 'Natural causes', correct: false },
      { id: 'd', text: 'Suicide',        correct: false },
    ],
    requiredClues: ['clue-cup-residue', 'clue-guitar-capo'],
    onWrong: { shake: true, disable: true },
  },

  outro: { titleCard: '6 hours earlier', text: '…' },
};
```

`schemaVersion` is non-optional — it's how outdated saves and outdated level files are detected. `requiredClues` is an array of clue IDs (not a count) so specific load-bearing clues can be required individually. `interactives` keys must exactly match the mesh names in the GLB; this is the contract between modeler and game, and the most common bug source — log a warning at level load when a content key has no matching mesh.

Level 7 swaps `question` for an `accusation` block (suspects + a single solution).

## Character schema

```js
// js/content/characters/tanya.js
export default {
  id: 'tanya',
  name: 'Tanya Sharma',
  age: 24,
  role: 'Best friend',
  portrait: 'assets/images/characters/tanya.jpg',
  basicInfo: 'Met Mira at NIFT Bangalore. Marketing exec at a D2C startup (Briq).',
};
```

Three fields of basic public info plus a portrait. Anything the player learns *about* a character through gameplay lives in the player's notes if they choose to save it. **The game does not maintain a hidden dossier that fills in as clues are found.** A player who doesn't take notes will have a harder time at Level 7. That's intended.

## Notes system

Notes are the most important feature. The data model is owned by `game/state.js`:

- `notes`: flat dict of `{ id, content, sourceClueId, levelDiscovered, folderId, createdAt }`
- `folders`: flat dict of `{ id, name, createdAt }`. **Single-level folders only — no nesting.**
- Default folders on a new game: Suspects, Evidence, Timeline, Random.
- "Add to Notes" pre-fills the form with the clue's title and body — players will not save anything if they have to retype.
- Persistent Notes button in the HUD; `N` keyboard shortcut also opens the view.
- Notes view: two-pane (folders / notes), search bar, inline edit, drag-or-dropdown reassignment, new-note + new-folder buttons.

**Do not gate any progress behind notes.** A player with perfect memory should be able to complete the game without ever opening the notes view. Notes are a tool, not a checkpoint.

## Game state

A single store, mutated only through actions, persisted to localStorage on every change under the key `last-room-save-v1`.

```js
{
  schemaVersion: 1,
  currentLevelId: 'level-01',
  cluesByLevel:   { 'level-01': new Set([...]) },
  answeredLevels: new Set([...]),
  notes:          { 'note-...': { ... } },
  folders:        { 'folder-...': { ... } },
  accusation:     null,   // { suspectId, correct, timestamp } after L7
}
```

Actions: `discoverClue`, `addNote`, `editNote`, `moveNote`, `deleteNote`, `addFolder`, `renameFolder`, `deleteFolder`, `answerQuestion`, `advanceToLevel`, `submitAccusation`, `resetProgress`. Each mutates state, calls `persist()`, and notifies subscribers via a small pub/sub. **Don't bring in a state library** — there's no build step and the surface area is small.

If `schemaVersion` doesn't match on load, show a "we updated the game and reset progress" message and start fresh. Notes are part of the save — don't store them separately.

## Engine conventions

- **Mesh naming:** interactive meshes follow `Interact_<Object>_<NNN>`, e.g. `Interact_Diary_001`. Non-interactive meshes can be named anything; consistent prefixes (`Wall_`, `Furniture_`, `Decor_`) help.
- **Units and scale:** Blender set to meters. Apply transforms before export. One Three.js unit = one meter. Eye level ≈ 1.6 m.
- **Coordinate system:** Three.js is right-handed Y-up. Export GLBs with +Y up.
- **Camera-and-occlusion as a level-design constraint:** every interactive object must be reachable by raycast from somewhere within the level's allowed camera range. The picker raycasts against *all* meshes and checks whether the closest hit is interactive — if a non-interactive blocks an interactive, the click does nothing. This is the modeler's responsibility; QA it by clicking every interactive in dev mode before signing off.
- **Disposal is not optional.** Three.js doesn't garbage-collect GPU resources. `loader.disposeLevel()` walks the scene graph and disposes geometries, materials, and textures. Skip this on level transitions and mobile browsers will crash within a few transitions.
- **Audio unlock on first user click.** Browsers block playback until a user gesture. The boot sequence shows a "Click to begin" gate that doubles as the audio unlock.
- **Asset paths are always relative from the repo root** (`assets/models/level-01.glb`), never absolute. Always referenced through level content files, never hardcoded in engine or UI code.

## Per-level GLBs and baked state

Each level ships as a complete, self-contained GLB. Per-scene differences — capo on a different fret, sticky note text, presence/absence of a second cup, lipstick mark on the mirror — are **baked into the .blend file** and exported as part of that level's GLB. The engine has no state-override system. The seven GLBs *will* duplicate most of the room geometry. That cost is accepted in exchange for a trivially simple engine.

## UI

All UI lives under `<div id="ui-root">` with `pointer-events: none` by default and `auto` only on active interactive panels. Z-index hierarchy: canvas (0) → HUD (10) → modals (20) → notes-view (30) → level-transition (40).

Each UI module is a plain function module exporting `mount(container, props)` returning `{ unmount() }`. It subscribes to `game/state.js` and dispatches actions back. **It never imports from `engine/`.**

Visual styling is being deferred — modules are structured first with semantic class names (`.clue-panel`, `.clue-panel__title`), and the look-and-feel pass happens later. Don't try to make panels look polished when building them; that pass is intentionally separate.

Build each panel as a static prototype in `prototypes/` first, then wire it in.

## Dev mode

Activated by `?dev=1` in the URL. Enables a level-skip menu, reveal-all-clues, mesh-name overlay, state-reset, FPS counter, recent-state-mutations console. Built early (Step 2 of the implementation plan) because it pays for itself in QA time. Live at `js/ui/dev-overlay.js`.

## Build sequence

See `docs/plan/implementation-plan.md`. Step 0 (reorganize repo) and Step 1 (bootstrap empty canvas) are complete. Don't reorder steps — each is designed to leave the game runnable, and earlier steps unblock later ones.
