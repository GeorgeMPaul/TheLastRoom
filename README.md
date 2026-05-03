# The Last Room

A point-and-click mystery game set in one room across seven moments in time. Built with vanilla Three.js (r0.158, ESM via importmap). No build step, no bundler, no package manager.

## Run

```bash
python -m http.server 8000
```

Open <http://localhost:8000>. Double-clicking `index.html` will not work — ES modules require a real HTTP origin.

## Project documents

- [`game_story.md`](game_story.md) — full story bible (characters, scenes, clue-by-clue breakdown).
- [`game_dev_plan.md`](game_dev_plan.md) — original engineering blueprint.
- [`docs/plan/implementation-plan.md`](docs/plan/implementation-plan.md) — current authoritative plan; reconciles the two above with decisions made during brainstorming. **Read this first.**
- [`CLAUDE.md`](CLAUDE.md) — architecture, conventions, and the rules that hold across the whole codebase.

## Status

Step 1 of 16 — bootstrap. `index.html` loads `js/main.js`, which initializes the engine and renders an empty canvas with day-time lighting. Levels, picker, notes, and UI panels follow in subsequent steps.

The original prototype lives in `Game.html` and still loads `assets/models/level-01.glb` — useful as a scratch page for testing GLB authoring against the same scene setup.
