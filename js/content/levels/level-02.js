/**
 * content/levels/level-02.js
 *
 * Level 2 — Two Nights Before.
 * Saturday, March 16, 2024 — late night. Warm bedside lamp, fairy
 * lights doing their actual job.
 *
 * Step 12 stub: this is the minimal level needed to prove that
 * transitioning Level 1 → Level 2 → Level 1 doesn't leak GPU memory.
 * It deliberately reuses the level-01 GLB (an authored level-02.glb
 * placeholder copy is in assets/models/level-02.glb but is currently
 * byte-identical) and only authors a couple of demonstrative clues so
 * the level is still "playable" end-to-end (clue → notes → MCQ).
 *
 * Step 14 will replace this file wholesale with the real authored
 * Level 2 from the story bible.
 */

export default {
  schemaVersion: 1,
  id: 'level-02',
  title: 'Two Nights Before',
  subtitle: 'Saturday, March 16 — 11:42 PM',

  model: 'assets/models/level-02.glb',

  camera: {
    initial: { position: [8, 8, 8], lookAt: [0, 1, 0] },
    constraints: {
      type: 'limited-orbit',
      minPolar: 0.6, maxPolar: 1.5,
      minAzimuth: -Math.PI, maxAzimuth: Math.PI,
      minDistance: 4.0, maxDistance: 14.0,
    },
  },

  // Story-bible TOD for this scene is "warm late night" — closest
  // built-in preset is dusk (warm directional, low ambient). Real
  // per-level lighting tuning lands in Step 14.
  lighting: { tod: 'dusk' },

  audio: {
    // Drop in once authored: assets/audio/ambient/saturday-night.mp3
    // — distant traffic + wind + a hint of music from a neighbour.
    ambient: null,
    ambientVolume: 0.4,
    music: null,
  },

  // Stub interactives — reuse the names that exist in the level-01
  // placeholder GLB so the picker has something to chew on. Real
  // Level-2-specific clues land in Step 14 with a real GLB.
  interactives: {
    'Ukulele': {
      label: 'Guitar (capo on 2nd fret)',
      reveal: {
        type: 'text-with-image',
        title: 'The capo is in its usual place',
        body:
          'The capo is on the 2nd fret — Mira\'s default position for her own songs. ' +
          'Two nights before, the room is still hers.',
        image: null,
      },
      clueId: 'clue-l2-guitar-capo',
    },

    'Laptop': {
      label: 'Laptop on the desk',
      reveal: {
        type: 'text-with-image',
        title: 'Saturday night, working late',
        body:
          'Lid open, screen glowing — a half-finished email to her sister Neha and three browser tabs open ' +
          'on lawyer profiles in Bangalore. She was preparing for a fight.',
        image: null,
      },
      clueId: 'clue-l2-laptop',
    },

    'TableLamp': {
      label: 'Bedside lamp',
      reveal: {
        type: 'text-with-image',
        title: 'On',
        body: 'Lamp on, fairy lights on, no signs of distress in the room. A normal late night.',
        image: null,
      },
      clueId: 'clue-l2-lamp',
    },
  },

  question: {
    type: 'mcq',
    prompt: 'On the night of March 16, who was the one Mira was preparing to confront?',
    options: [
      { id: 'a', text: 'Tanya — about her finances.',           correct: false },
      { id: 'b', text: 'Kabir — about ending things for good.', correct: true  },
      { id: 'c', text: 'Veer — about the recording deal.',      correct: false },
      { id: 'd', text: 'Neha — about their mother.',            correct: false },
    ],
    requiredClues: ['clue-l2-laptop'],
    onWrong: { shake: true, disable: true },
  },

  outro: {
    titleCard: 'Two weeks earlier',
    text: 'The fight didn\'t start that night. It started long before.',
  },
};
