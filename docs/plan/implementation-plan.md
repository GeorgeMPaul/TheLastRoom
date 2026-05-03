# The Last Room — Implementation Plan

## Context

You have two source documents: `game_dev_plan.md` (engineering blueprint — four-layer architecture, schemas, build sequence) and `game_story.md` (story bible — Mira Sen, seven scenes, the Tanya reveal). You also have a working Three.js prototype at `Game.html` that already loads `assets/models/level-01.glb`, runs orbit controls, time-of-day lighting, and click-to-highlight on named meshes.

The git repository root is `D:\MiniJamGame\TheLastRoom\`. The unrelated sphere-walking game in `D:\MiniJamGame\` (parent folder) is **outside this repo** and is not touched by this project.

This plan reconciles the dev plan and the prototype, settles eight foundational choices made in brainstorming, and lays out a step-by-step build sequence that ends with all seven levels playable end-to-end.

### Foundational decisions (locked in)

| # | Decision | Implication |
|---|---|---|
| 1 | **Three.js r0.158 + ESM importmap** (kept from `Game.html`, dev plan is updated to match) | Modules use `import * as THREE from 'three'` and `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'`. No global `window.THREE`. No build step still — importmap does the resolution. |
| 2 | **Seven distinct per-level GLBs** | Each level is a fully-authored frozen snapshot. Modeler workload is 7× but engine stays trivially simple — load + dispose, no state-override layer. |
| 3 | **`TheLastRoom/` IS the project root** *(revised from original "promote and archive" plan after discovering the git repo root is `TheLastRoom/`, not the parent `MiniJamGame/`)* | All work happens inside this repo as-is. Dev-plan paths (`js/`, `assets/`, `index.html`) apply literally — no prefix needed. The old sphere-walking code at `D:\MiniJamGame\` is outside this repo and stays untouched. |
| 4 | **UI styling deferred** | Each panel is built as a JS module with a clear behavioral contract (mount, props, events, unmount). Visual styling is left as a TODO in each component file — markup and CSS class hooks are in place but the look-and-feel pass happens later. |
| 5 | **Dev mode built in Step 2** | `?dev=1` URL flag enables level skip, reveal-all-clues, mesh-name overlay, state reset, FPS counter. Built before any level-1 polish so it's available for QA. |
| 6 | **First milestone = all 7 levels playable, polish later** | Optimize for end-to-end story coverage over per-level polish. Every system gets exercised on every level before any single level is "done." |
| 7 | **Strict downward-only layering** | `engine` knows nothing about story. `game` knows nothing about Three.js. `ui` never imports from `engine`. `content` is pure data. New levels are content-file + GLB only. |
| 8 | **State baked into each GLB** | Capo fret position, sticky-note text, presence/absence of cups — all baked into the per-level `.blend` files and exported. Engine has no state-override system. |

---

## Target file layout

Repo root is `D:\MiniJamGame\TheLastRoom\`. Step 0 has already moved assets into the structure shown below.

```
D:\MiniJamGame\TheLastRoom\        (git repo root)
├── Game.html                      (existing prototype — kept as a working scratch
│                                   page until index.html supersedes it in Step 1)
├── index.html                     (NEW in Step 1 — entry, loads main.js as module via importmap)
├── CLAUDE.md                      (NEW in Step 1 — written for The Last Room)
├── README.md                      (NEW in Step 1)
├── game_dev_plan.md               (existing — kept for reference)
├── game_story.md                  (existing — kept for reference)
│
├── js\                            (NEW — created from Step 1 onward)
│   ├── main.js                    bootstrap, orchestration
│   ├── engine\
│   │   ├── scene.js               renderer, scene, lights, resize, TOD presets
│   │   ├── loader.js              GLB load/cache/dispose
│   │   ├── picker.js              raycasting, hover, click → game action
│   │   └── camera-rig.js          limited orbit controls (lifted from Game.html)
│   ├── game\
│   │   ├── state.js               single store + actions + persistence + pubsub
│   │   ├── level-runner.js        loads a level's GLB+content, drives lifecycle
│   │   ├── progression.js         ordered level list, win condition
│   │   └── notes.js               notes data model + folder ops
│   ├── ui\
│   │   ├── overlay-root.js        owns #ui-root, z-index discipline
│   │   ├── clue-panel.js          opens on object click
│   │   ├── question-panel.js      per-level MCQ
│   │   ├── accusation-panel.js    level-7 only
│   │   ├── notes-view.js          full notes interface
│   │   ├── notes-button.js        persistent HUD button
│   │   ├── add-to-notes-button.js inline form on each clue
│   │   ├── character-card.js      suspect profile
│   │   ├── level-transition.js    fade between levels
│   │   ├── hud.js                 clue counter, notes button, hint
│   │   └── dev-overlay.js         ?dev=1 panel
│   └── content\
│       ├── index.js               exports ordered levels + character roster
│       ├── levels\
│       │   ├── level-01.js  …  level-07.js
│       └── characters\
│           ├── mira.js (victim — for portrait/credits)
│           ├── tanya.js, kabir.js, veer.js, neha.js, rohan.js
│
├── assets\                        (created in Step 0)
│   ├── models\
│   │   ├── level-01.glb           Crime Scene — Mon Mar 18 morning
│   │   │                          (in-repo today; was Models/1room.glb)
│   │   ├── level-02.glb           Two Nights Before — Sat Mar 16 night
│   │   ├── level-03.glb           Two Weeks Before — Sun Mar 3 afternoon
│   │   ├── level-04.glb           Five Weeks Before — Wed Feb 14 dusk
│   │   ├── level-05.glb           Three Months Before — Sun Dec 10 rainy
│   │   ├── level-06.glb           The Night Before — Sun Mar 17 night
│   │   └── level-07.glb           Final Accusation — Mon Mar 18 morning
│   ├── source\blender\            Authoring sources (kept for the modeler)
│   │   ├── source\                .blend files
│   │   └── textures\              baked PNGs/JPEGs
│   ├── audio\
│   │   ├── ambient\               (empty — populate per level)
│   │   └── sfx\                   (empty — populate during polish)
│   └── images\
│       ├── clues\                 (empty — populate per clue with a reveal image)
│       └── characters\            (empty — populate with portraits)
│
├── docs\                          (created in Step 0)
│   ├── plan\
│   │   └── implementation-plan.md (THIS FILE)
│   └── references\
│       └── dialogues\             person_1.png, person_1_options.png, person_2.png
│
└── prototypes\                    (NEW — static HTML for UI experiments)
```

**What Step 0 actually did:**
- `Models/1room.glb` → `assets/models/level-01.glb` (git-tracked rename)
- `roomfinalblender/` → `assets/source/blender/` (git-tracked rename, kept its `source/` + `textures/` subdivision)
- `references/` → `docs/references/` (filesystem move; was untracked)
- `Game.html` updated to load `assets/models/level-01.glb` so the prototype keeps working
- Created empty `assets/audio/{ambient,sfx}/`, `assets/images/{clues,characters}/`, `docs/plan/` for upcoming content drops

The old sphere-walking game at `D:\MiniJamGame\` (a sibling folder of this repo) was *not* moved — it lives outside the repo and is not in our concern.

---

## Core schemas

### Level content schema (`content/levels/level-NN.js`)

```js
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

  // Reuses TOD presets from Game.html
  lighting: { tod: 'day-overcast' },   // or { tod: 'dusk' }, etc.

  audio: {
    ambient:       'assets/audio/ambient/crime-scene-silence.mp3',
    ambientVolume: 0.3,
    music: null,
  },

  // Mesh names follow Interact_<Object>_<NNN> from Blender.
  // Picker only checks against the keys in this map.
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
    // …more
  },

  question: {                         // For levels 1-6
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

  outro: {
    titleCard: '6 hours earlier',
    text: 'You realize the scene tells a different story...',
  },
};
```

Level 7 swaps `question` for the accusation block:

```js
question: {
  type: 'accusation',
  prompt: 'Who killed her?',
  suspects: ['tanya', 'kabir', 'veer', 'neha', 'rohan'],
  solution: 'tanya',
  // No required-evidence list. Player consults notes, picks one suspect.
}
```

### Character schema (`content/characters/<id>.js`)

```js
export default {
  id: 'tanya',
  name: 'Tanya Sharma',
  age: 24,
  role: 'Best friend',
  portrait: 'assets/images/characters/tanya.jpg',
  basicInfo: 'Met Mira at NIFT Bangalore. Marketing exec at a D2C startup (Briq).',
};
```

Three public-info fields plus a portrait. Anything the player learns through gameplay lives in their notes, not here.

### Game state shape (`game/state.js`)

```js
{
  schemaVersion: 1,
  currentLevelId: 'level-01',
  cluesByLevel: {                                    // per level: which clueIds clicked
    'level-01': new Set(['clue-cup-residue', 'clue-guitar-capo']),
  },
  answeredLevels: new Set(['level-01']),             // levels answered correctly
  notes:   { 'note-abc123': { id, content, sourceClueId, levelDiscovered, folderId, createdAt } },
  folders: {
    'folder-suspects': { id, name: 'Suspects', createdAt },
    'folder-evidence': { id, name: 'Evidence', createdAt },
    'folder-timeline': { id, name: 'Timeline', createdAt },
    'folder-random':   { id, name: 'Random',   createdAt },
  },
  accusation: null,                                   // { suspectId, correct, timestamp } after L7
}
```

Actions: `discoverClue`, `addNote`, `editNote`, `moveNote`, `deleteNote`, `addFolder`, `renameFolder`, `deleteFolder`, `answerQuestion`, `advanceToLevel`, `submitAccusation`, `resetProgress`. Each mutates state, calls `persist()` (single localStorage key `last-room-save-v1`), notifies subscribers via a ~30-line pubsub.

---

## UI module contracts (visual styling deferred)

Each UI module is a plain function module that exports `mount(container, props)` and returns `{ unmount() }`. It subscribes to `game/state.js` for data and dispatches actions back. It never imports from `engine/`. Markup uses semantic class names (`.clue-panel`, `.clue-panel__title`, etc.) so styling can be applied later without touching component code.

| Module | Trigger | Props | Events / actions dispatched |
|---|---|---|---|
| `clue-panel.js` | Picker dispatches `clueDiscovered(clueId)` | `{ reveal, clueId }` | "Add to Notes" → opens `add-to-notes-button` form. Close (Escape / click-outside) → unmount, unblock picker. |
| `add-to-notes-button.js` | Embedded in clue panel | `{ defaultContent, sourceClueId }` | On save → `addNote(...)`. Folder dropdown reads `state.folders`. |
| `question-panel.js` | Player presses "Answer" in HUD, or clicks the question button when `requiredClues` are met | `{ question }` | On answer → `answerQuestion(correct)`. On correct → triggers `level-transition`. Wrong-answer shake animation. |
| `accusation-panel.js` | Level-7 only, replaces `question-panel` | `{ suspects, solution }` | Suspect cards (each is a `character-card`). Notes button still in HUD. Submit → `submitAccusation(suspectId)` → ending. |
| `notes-view.js` | Notes button click or `N` key | `{}` (reads `state.notes`/`state.folders`) | Two-pane (folders / notes). Search across all notes. Inline edit, drag-or-dropdown move, delete. New-note + new-folder buttons. |
| `notes-button.js` | Always mounted (HUD child) | `{}` | Click or `N` → mounts `notes-view`. Badge shows total note count. |
| `character-card.js` | Used in accusation panel | `{ character }` | Click → selectable state. |
| `level-transition.js` | `advanceToLevel` action | `{ outro, nextTitle }` | Full-screen fade. Hides GLB unload/reload. Calls `level-runner.loadLevel(nextId)` mid-fade. |
| `hud.js` | Always mounted | `{}` | Persistent: clue counter, notes button, hint button (optional), pause/menu. `pointer-events: none` on layer, `auto` on buttons. |
| `dev-overlay.js` | `?dev=1` only | `{}` | Level skip dropdown, reveal-all-clues, mesh-name overlay toggle, state reset, FPS counter. |
| `overlay-root.js` | Mounted once at boot | `{}` | Owns `#ui-root`, sets `pointer-events: none`, manages z-index hierarchy: canvas (0) → HUD (10) → modals (20) → notes-view (30) → level-transition (40). |

---

## Engine module contracts

| Module | Exports | Notes |
|---|---|---|
| `scene.js` | `initScene()`, `resize()`, `applyTOD(name)`, `applyTODSlider(v)`, `setExposure(x)`, exports `{ renderer, scene, camera, ambientLight, sunLight, fillLight, rimLight }` | Lift the `TOD` table and `applyTOD` / `applySlider` functions verbatim from `Game.html`. PCF soft shadows, ACES tone mapping, sRGB output. Resize handler attached. |
| `loader.js` | `loadLevel(url, onProgress) → Promise<gltf>`, `disposeLevel(scene)` | Wraps `GLTFLoader`. Caches by URL in a `Map`. Dispose walks geometries, materials, textures — **not optional**. |
| `picker.js` | `createPicker(camera, domElement, scene, onPick) → { setInteractiveMap, setRoot, setInputBlocked, dispose }` | Raycasts against `raycastRoot` (the level's `modelRoot`) recursively. For the closest hit, walks the parent chain looking for an interactive name in the allowlist — required because GLTF parks names on parent `Group`s rather than the renderable mesh. On `pointermove`: hover cursor + emissive bump on the visible mesh. On `pointerup`: invoke `onPick(name, descriptor)` (caller dispatches `discoverClue`). Reads `inputBlocked` so modals freeze the picker. Reuses the click/drag-distance discriminator from `Game.html` (>4px = drag, ignore). |
| `camera-rig.js` | `initCamera(constraints)`, `update()` | Limited-orbit controls — lift the `OrbitControls` class from `Game.html` and wire it to read polar/azimuth/distance constraints from the level's `camera.constraints`. |

---

## Build sequence (16 steps — each leaves the game runnable, commit after each)

| # | Step | Goal | Acceptance |
|---|---|---|---|
| **0** ✅ | **Reorganize in-place (DONE)** | Move `Models/1room.glb` → `assets/models/level-01.glb`; `roomfinalblender/` → `assets/source/blender/`; `references/` → `docs/references/`. Create empty `assets/audio/{ambient,sfx}/`, `assets/images/{clues,characters}/`. Update `Game.html` to point to the new GLB path. | `python -m http.server` from repo root + open `Game.html` loads the room exactly as before. ✅ done. |
| **1** ✅ | **Bootstrap** | New `index.html` with importmap, `<div id="ui-root">`, `<div id="canvas-container">`. New `js/main.js` that imports `engine/scene.js` and shows an empty canvas with the Day TOD lighting. New `CLAUDE.md` (see content below). New `README.md`. `Game.html` may stay as a scratch page or be deleted — your call. | Empty canvas renders at `index.html`. No console errors. |
| **2** ✅ | **Dev mode** | `js/ui/dev-overlay.js` activated by `?dev=1`. Level skip is a stub for now (only one level exists). Reveal-all, state-reset, FPS counter, mesh-name overlay all work. | `?dev=1` shows the overlay. Buttons either work or are clearly stubbed. |
| **3** ✅ | **Loader + Level 1 GLB** | Lift `loadGLBFromURL` and `setupModel` from `Game.html` into `engine/loader.js`. `main.js` calls `loader.loadLevel('assets/models/level-01.glb')`. Camera rig loaded with hardcoded constraints for now. | Level 1 GLB renders. Orbit controls work. |
| **4** ✅ | **Picker** | `engine/picker.js` with raycasting + hover emissive (lift from `Game.html`'s `selectObject` + click handler). For now, hardcode 3-5 interactive mesh names from `level-01.glb` (whatever's actually in the file). Click logs the name to console. **Important**: GLTF parks human-readable names on the parent `Group`, not the renderable mesh — the picker walks the parent chain of every raycast hit looking for an interactive name in the allowlist (see CLAUDE.md "Engine conventions"). The current allowlist uses 5 hardcoded Blender object names: `Laptop`, `Ukulele`, `Rubick`, `MarshallSpeaker`, `TableLamp`. | Hovering an interactive mesh changes cursor. Clicking logs to console. |
| **5** ✅ | **Game state store** | `js/game/state.js` with the pubsub (~30 lines), actions, localStorage persistence under `last-room-save-v1`, `schemaVersion: 1`. Wire picker to dispatch `discoverClue(clueId)`. | Console-log subscribers see clue counts incrementing. Reload preserves state. |
| **6** | **Clue panel (structural only)** | `js/ui/clue-panel.js` with `mount/unmount` contract per `prompt.md`. Bare HTML markup with semantic classes, no styling pass. Opens on `discoverClue` if state has the reveal data. Closes on Escape and click-outside. Sets picker's `inputBlocked`. | Clicking interactive object opens panel showing title + body. Closes correctly. Picker doesn't fire while panel is open. |
| **7** | **Level content schema + Level 1 content** | `js/content/levels/level-01.js` per the schema above with all 6 investigation clues + 5 character clues from the story bible. `js/game/level-runner.js` reads the content file, configures camera/picker/audio, loads the GLB. Replace hardcoded picker mesh list with content-driven map. Log a warning at load when a content key has no matching mesh in the GLB — check every named object in the scene graph (`obj.name`), not just `obj.isMesh && obj.name`, because GLTF puts names on parent groups. **Coordinate with the modeler**: the current GLB's working names (`Laptop`, `Ukulele`, …) need to be renamed to the `Interact_<Object>_<NNN>` convention before this step lands. | Level 1 fully content-driven. All ~11 clues clickable and show real story text. |
| **8** | **Notes — foundation** | `js/game/notes.js` data model. "Add to Notes" button in clue panel — `js/ui/add-to-notes-button.js`. Simplest possible `notes-view.js`: a flat list, no folders, no search. Notes button in HUD. Persists with the rest of state. | Saving a note from a clue panel adds it to the list. Reload preserves notes. |
| **9** | **Notes — complete** | Folders (default: Suspects/Evidence/Timeline/Random), drag-or-dropdown reassignment, search across all notes, inline edit, new-note button, new-folder button. | All notes operations work. Search filters. Drag-and-drop or dropdown reassignment moves a note between folders. |
| **10** | **Question panel** | `js/ui/question-panel.js` with the MCQ. Wrong-answer shake. `requiredClues` gating — answer button disabled until all required clueIds are in `cluesByLevel`. Correct → triggers placeholder transition. | Answering wrong shakes; answering right calls a placeholder `advanceToLevel`. |
| **11** | **Audio system** | `js/engine/audio.js` plays one ambient track per level (looping). First-click unlock gate. Level 1's ambient track wired in. | Audio plays after first click. Loops. |
| **12** | **Level transition + Level 2 stub** | `js/ui/level-transition.js` with fade + title card + outro text. Properly disposes Level 1's GLB before loading Level 2's. Author a *minimal* `level-02.js` and `level-02.glb` (can be a copy of level-01 for now — the goal is to prove transitions don't leak GPU memory). | Transitioning Level 1 → Level 2 → back to Level 1 doesn't crash and doesn't grow renderer.info.memory unboundedly. |
| **13** | **Level 1 polish (hover/SFX, clue images)** | Polish hover effect, add SFX on clue discovery and note save, image zoom in clue panels, transition pacing. The structural clue panel grows real visuals here. | Level 1 feels good to play through end-to-end. |
| **14** | **Author Levels 2-6 GLBs + content** | The bulk of the remaining work. Replace the Step-12 Level-2 stub with the real authored Level 2, then author 3-6. Each level is a Blender export + a `level-NN.js` content file per the story bible. State (capo, cups, sticky notes) is baked into each `.blend`. TOD per the story's per-scene atmosphere (overcast, warm-night, sharp-day, dusk, rainy, golden-night). Test each end-to-end through clue → notes → MCQ. | All 6 levels (1-6) playable end-to-end. Each level's `requiredClues`-gated MCQ answer from the story bible works. |
| **15** | **Accusation panel + Level 7** | `js/ui/accusation-panel.js` (suspect cards in a grid + submit). `level-07.js` with the `accusation` question type. Author Level 7's GLB (returns to crime scene visuals). | Picking a suspect submits. Picking Tanya triggers the win path. |
| **16** | **Endings, credits, cross-level QA** | Win-state and lose-state screens. Final credits. Full end-to-end playthrough. Stress-test notes over a full playthrough. Save/load at every level boundary. Tablet test if possible. | One full real playthrough completes without crashes or save corruption. |

Steps 0-13 are foundation (~3-4 weeks per spec). Steps 14-16 are content + polish.

---

## Critical files to create or modify

**Lift wholesale from `Game.html` (these already work):**
- TOD config + `applyTOD` / `applySlider` → `js/engine/scene.js`
- `OrbitControls` class → `js/engine/camera-rig.js`
- `loadGLBFromURL` + `setupModel` → `js/engine/loader.js`
- `selectObject` + click/raycast handler → `js/engine/picker.js`
- Loading screen markup + drag-and-drop GLB swap (drag-and-drop kept dev-mode only) → `index.html`

**Author from scratch:**
- `js/main.js`, `js/game/state.js`, `js/game/level-runner.js`, `js/game/progression.js`, `js/game/notes.js`
- All `js/ui/*.js`
- All `js/content/levels/*.js` and `js/content/characters/*.js`
- `index.html` (new), `CLAUDE.md` (new), `README.md` (new)

**Already moved (Step 0 complete):**
- `Models/1room.glb` → `assets/models/level-01.glb` (then 6 more authored siblings)
- `roomfinalblender/` → `assets/source/blender/`
- `references/dialogues/*.png` → `docs/references/dialogues/`

---

## CLAUDE.md (new — to write at Step 1)

The new root `CLAUDE.md` must document:

- Game concept and core loop (observe → click → read → take notes → answer)
- Four-layer architecture (engine / game / ui / content) and the strict downward-only dependency rule
- Loader strategy: r0.158 ESM via importmap (NOT r128 globals — the dev plan is wrong on this one point and was updated)
- Level content schema with a small worked example
- Character schema (basic info only — no progressive dossier)
- Notes system as the player's working memory and Level 7's reference
- Mesh-naming convention: `Interact_<Object>_<NNN>`
- Unit (meters) and coordinate (Y-up, right-handed) conventions
- Camera-and-occlusion design rule: every interactive must be reachable from the level's allowed camera range
- Disposal discipline on level transitions
- Audio-unlock-on-first-click rule
- Save schema versioning + graceful reset on mismatch
- Dev mode (`?dev=1`) and what it enables
- "No build step" rule remains, but importmap is the resolution mechanism (NOT a script-tag global)
- Note that the parent folder `D:\MiniJamGame\` contains an unrelated sphere-walking project that lives outside this repo. Never reference it from new code.

---

## Verification

End-to-end test plan:

1. **Boot test:** `python -m http.server 8000` from repo root → `http://localhost:8000` loads the canvas with Day TOD lighting and no console errors.
2. **Level 1 vertical:** Click each interactive in Level 1 → clue panel opens with story text → "Add to Notes" saves → notes view shows it → answer the MCQ correctly → transition fires.
3. **Save/load:** After Step 5, refresh mid-level — clues already discovered stay discovered, notes persist.
4. **Disposal:** After Step 12, transition L1→L2→L1→L2 ten times. Open browser dev tools → `renderer.info.memory.geometries` should not grow unboundedly.
5. **Picker isolation:** With clue panel open, clicking the canvas behind it should do nothing (picker `inputBlocked: true`).
6. **Dev mode:** `?dev=1` shows overlay. Level skip jumps directly. State-reset clears localStorage and reloads.
7. **Notes search:** With ~10 notes across folders, search bar filters across all folders.
8. **Required-clues gating:** In Level 1, the answer button is disabled until all `requiredClues` are discovered. Discovering them enables it.
9. **Level 7 accusation:** Submit Tanya → win path. Submit any other → lose path.
10. **Schema mismatch:** Manually bump `schemaVersion` in code, reload — should show "we updated the game and reset progress" and start fresh without crashing.

There is no automated test suite in scope for the game jam timeline. Verification is manual playthrough at each step boundary.
