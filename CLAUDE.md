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
│   ├── main.js             bootstrap (orchestrates engine + level-runner + UI)
│   ├── engine/             Three.js wrappers — scene, loader, picker, camera-rig (audio in Step 11)
│   ├── game/               state (single store + actions), level-runner (one level's lifecycle),
│   │                       notes (read-side selectors over state)
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
- **GLTF puts names on parent groups, not meshes.** When a Blender object exports through GLTF, the human-readable name almost always lands on a parent `Group` node, and the renderable child mesh is either nameless or generically named (`Plane.004`, `Mesh_5`). The picker accounts for this by walking the parent chain of every raycast hit until it finds an interactive name in the level's allowlist. Allowlist names should match the *Blender object name* (the parent Group), not the inner mesh name. The Step-7 "log a warning at level load when a content key has no matching mesh" rule must therefore check every named object in the scene graph (`obj.name`), not just `obj.isMesh && obj.name`.
- **Units and scale:** Blender set to meters. Apply transforms before export. One Three.js unit = one meter. Eye level ≈ 1.6 m.
- **Coordinate system:** Three.js is right-handed Y-up. Export GLBs with +Y up.
- **Camera-and-occlusion as a level-design constraint:** every interactive object must be reachable by raycast from somewhere within the level's allowed camera range. The picker raycasts against *all* meshes recursively, walks the parent chain of the closest hit to find an interactive ancestor, and discards the click if the closest hit's parent chain has no interactive name — meaning a non-interactive mesh in front of an interactive one will block the click. This is the modeler's responsibility; QA it by clicking every interactive in dev mode before signing off.
- **Disposal is not optional.** Three.js doesn't garbage-collect GPU resources. `loader.disposeLevel()` walks the scene graph and disposes geometries, materials, and textures. Skip this on level transitions and mobile browsers will crash within a few transitions.
- **Audio unlock on first user click.** Browsers block playback until a user gesture. The boot sequence shows a "Click to begin" gate that doubles as the audio unlock.
- **Asset paths are always relative from the repo root** (`assets/models/level-01.glb`), never absolute. Always referenced through level content files, never hardcoded in engine or UI code.

## Per-level GLBs and baked state

Each level ships as a complete, self-contained GLB. Per-scene differences — capo on a different fret, sticky note text, presence/absence of a second cup, lipstick mark on the mirror — are **baked into the .blend file** and exported as part of that level's GLB. The engine has no state-override system. The seven GLBs *will* duplicate most of the room geometry. That cost is accepted in exchange for a trivially simple engine.

## UI

All UI lives under `<div id="ui-root">` with `pointer-events: none` by default and `auto` only on active interactive panels. Z-index hierarchy: canvas (0) → HUD (10) → modals (20) → notes-view (30) → level-transition (40).

Each UI module is a plain function module exporting `mount(container, props)` returning `{ unmount() }`. It subscribes to `game/state.js` and dispatches actions back. **It never imports from `engine/`.**

Visual styling is being deferred — modules are structured first with semantic class names (`.clue-panel`, `.clue-panel__title`), and the look-and-feel pass happens later. The current temporary look is a dark-mystery palette (`#11162a` cards on `#0a0e1a`, `#2e5cff` for primary actions, `#e6ecf6` text). Don't try to make panels look polished when building them — that pass is intentionally separate, and the user has said they'll redo the visuals manually.

`js/ui/dev-overlay.js` is the reference shape every UI module follows:

- Vanilla HTML + CSS + ESM. **Zero** npm / Tailwind / JSX / preprocessor.
- Default export (or named `mount*`) takes a single options object: `mount({ parent, ...props }) → { unmount }`.
- Build the DOM with one `innerHTML` template literal and a scoped `<style>` block at the top. Class names are BEM-ish (`.notes-view__folder--active`).
- Bind events via delegation on the root, dispatching on `e.target.dataset.action`. Use `data-` attributes, not IDs (multiple instances would collide).
- Modal panels MUST freeze the picker: `picker.setInputBlocked(true)` on mount, `false` on unmount. Forgetting unblocks lets the player click through the modal into the 3D scene. `setInputBlocked` is the *only* engine API a UI module is allowed to touch.
- Always populate user-controlled text via `textContent`, never `innerHTML` interpolation. If you must build markup with strings, run untrusted text through a local `escapeHtml` helper.
- Subscribe to `game/state.js` if the panel needs to live-update; remember to call the returned unsubscribe in `unmount`.

**Mount UI from the input event, not from a state subscriber, when responding to user intent.** The picker → clue-panel chain in `main.js` opens the panel from the picker callback even though it also dispatches `discoverClue`. If we mounted from the subscriber instead, re-clicking an already-discovered clue wouldn't reopen the panel — `discoverClue` is deduped and only notifies on the first discovery. The same logic applies to anything where the user expects "click again to see it again": the click is the trigger, not the state delta.

**Clear local view state BEFORE dispatching a state action that triggers a re-render.** `state.js`'s `commit()` calls subscribers *synchronously*. If a UI panel keeps local state (e.g. `editingNoteId`, `draftOpen`, `activeFolderId`) that the render function reads, set it to its post-action value first, then dispatch — otherwise the subscriber re-renders against the pre-action value and the UI looks stuck. There are three instances of this pattern in `notes-view.js` worth referencing if you hit a "save did nothing visible" bug.

## Dev mode

Activated by `?dev=1` in the URL. Live at `js/ui/dev-overlay.js`. The purpose is **one-click access to every panel that has been built**, plus state manipulation and inspection — so you never have to play through a level to test a panel you authored ten minutes ago.

The overlay is grouped into three sections:

- **Panels** — pick any clue from the dropdown to open its clue panel; "Open question panel" bypasses the `requiredClues` gate; "Open notes view" is a shortcut for the HUD's notes button.
- **State** — "Reveal all clues" dispatches `discoverClue` for every entry in the active level's interactives map (which also unlocks the Answer button); "Mark level answered" toggles the level into `answeredLevels`; "Advance to next level" runs the same fade + dispose + load that the question panel triggers on a correct answer (uses the *current* level's `outro` for the title card); "Reset all state + reload" wipes localStorage.
- **Inspect** — live FPS, clue counter, note counter; "Toggle mesh-name overlay" shows every interactive name in the active level alongside whether the GLB actually contains a node with that name (✓ = CURRENT, ✗ = PENDING); "console.log(state)" dumps the live store.

When you build a new UI panel or content surface, **add a one-click trigger to the dev overlay in the same change**. That is the contract: dev mode is the test harness for everything you author. The overlay receives a `ctx` from `main.js` carrying `getActiveLevel` / `getModelRoot` / `picker` / `uiRoot` plus the same `openCluePanel` / `openQuestionPanel` instance-managers main.js owns — extend `ctx` rather than letting the overlay reach into module internals.

## Build sequence

See `docs/plan/implementation-plan.md` for the full per-step ledger and acceptance criteria. Steps 0–12 are done; Step 13 (Level 1 polish) is deferred. Step 14 is partially done: Levels 1 and 2 are real-authored (GLB + content). Levels 3–7 are not yet authored (GLBs absent, no content files yet).

**Standing caveats** that future-you will trip over if not remembered:

- `level-01.js` `requiredClues` is now the story-bible `['clue-cup-residue', 'clue-rug-impressions']` — the cup mesh (`Cup`) shipped in the GLB along with `Window`, `Mirror`, `Plant`, `Book`, and `BasePoster1`, so all 11 narrative clues now resolve. The pinboard's four portraits each have their own clue (`PictureMirawith{Kabir,Tanya,Veer,Family}` → `clue-photo-{kabir,tanya,veer,family}`), so the distinct-clue count in Level 1 is 14, not 11. Several have sibling meshes that currently route nowhere (Saucer, Tea, MirrorFrame/Stand, LipStickMark, Book.001/.002, PlantPot, the four `PictureMirawith…Frame` meshes) — fan them to the canonical clue if testers click the wrong piece.
- `level-02.js` is now real-authored against `level-02.glb` (Saturday-night hangout). 15 interactives wired; the L2-specific meshes are `Donut`, `Culprit` (visitor silhouette), `Mira` / `Mira.001` (Mira herself, alive), `Cup.001` / `Saucer.001` / `Tea.001` (visitor's white guest cup), `Saucer.002`, and `handbag` / `Handbag` / `HandbagBrand` (Briq tote). `requiredClues` gates on `clue-l2-cup-residue` + `clue-l2-donut` (powder + top-eaten donut → poisoning). The MCQ matches the story bible's "WEAPON: how was she killed?" question, **not** the old stub's "who was she preparing to confront?". Sibling fan-out (Saucer/Tea → Cup, Saucer.001/Tea.001 → Cup.001, frames → portraits, etc.) is not authored yet — the picker resolves only the canonical mesh names listed in `interactives`. Fan them in if testers click siblings and get nothing.
- Camera initial position + constraints are seeded by `main.js` with hardcoded values, not read from `level.camera`. Move into `level-runner.js` when the remaining levels (3-7) bring more diverse per-level GLBs.
- Levels 3-5 placeholder GLBs were deleted from `assets/models/` during the L2 cycle and have not been re-added. Until L3 ships, do not attempt to advance beyond L2 from gameplay or the dev-overlay's "Advance to next level" — the loader will 404. Recreate or skip when authoring L3.
- All `level.audio.ambient` URLs are currently `null`. The audio system handles null fine (no playback, no errors), but every level will be silent until the audio drops land in `assets/audio/ambient/`. Track names referenced in level files: `crime-scene-silence.mp3` (L1), `saturday-night.mp3` (L2).
- Loader cache is single-use: `loadLevel(url)` caches the gltf, `disposeLevel()` evicts it. This means revisiting a level re-downloads + re-parses the GLB. Fine for the jam; if preloading becomes important, switch to `SkeletonUtils.clone(gltf.scene)` per revisit and drop the eviction.

**Auditing what's actually in a GLB** — the picker silently no-ops on mesh keys that don't resolve, so when authoring a `level-NN.js` against a fresh export, dump the real node names first instead of guessing. From the repo root:

```bash
node -e "const fs=require('fs');const b=fs.readFileSync('assets/models/level-02.glb');const len=b.readUInt32LE(12);const j=JSON.parse(b.slice(20,20+len).toString('utf8'));(j.nodes||[]).map(n=>n.name).filter(Boolean).forEach(n=>console.log(n));"
```

Reads the GLB's JSON chunk directly — no Three.js needed, runs in milliseconds. Useful when the modeler ships new objects and you need the canonical names before writing content.

**Don't reorder steps** — each is designed to leave the game runnable, and earlier steps unblock later ones.
