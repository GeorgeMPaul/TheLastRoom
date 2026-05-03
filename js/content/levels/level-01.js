/**
 * content/levels/level-01.js
 *
 * Level 1 — The Crime Scene.
 * Monday, March 18, 2024 — 9:15 AM. Overcast.
 *
 * Per CLAUDE.md / implementation-plan.md: this is pure data. The
 * level-runner consumes it to configure camera, lighting, audio, and
 * the picker's interactive map. No engine code lives here.
 *
 * Mesh-name reality (May 2026):
 *   The current level-01.glb still uses the modeler's working names
 *   (Laptop, Ukulele, Rubick, MarshallSpeaker, TableLamp). The
 *   Interact_<Object>_<NNN> rename hasn't happened yet. We author all
 *   11 narrative clues from the story bible here so the content file
 *   is ready, but only the 5 entries marked CURRENT will resolve at
 *   runtime — main.js's load-time warning lists the rest as "not found".
 *   When the modeler ships the rename, swap the keys and delete the
 *   marker comments.
 */

export default {
  schemaVersion: 1,
  id: 'level-01',
  title: 'The Crime Scene',
  subtitle: 'Monday, March 18 — 9:15 AM',

  model: 'assets/models/level-01.glb',

  // Camera state lifted from main.js's hardcoded values (Step 3/4).
  camera: {
    initial: { position: [8, 8, 8], lookAt: [0, 1, 0] },
    constraints: {
      type: 'limited-orbit',
      // Tighten these once the room geometry is in its final scale.
      minPolar: 0.6, maxPolar: 1.5,
      minAzimuth: -Math.PI, maxAzimuth: Math.PI,
      minDistance: 4.0, maxDistance: 14.0,
    },
  },

  lighting: { tod: 'day' },   // overcast morning — closest preset is 'day'

  audio: {
    ambient: 'assets/audio/ambient/crime-scene-silence.mp3',
    ambientVolume: 0.3,
    music: null,
  },

  // Keys must match the Blender object name (parent Group), not the
  // inner mesh name — picker walks the parent chain to resolve.
  // CURRENT = mesh exists in level-01.glb today; PENDING = waiting on
  // modeler rename to Interact_<Object>_<NNN>.
  interactives: {

    // ─── Investigation clues ──────────────────────────────────────────

    // CURRENT — mapped to the Marshall mesh as the closest stand-in
    // for "the cup on the chair beside the bed" until a real cup mesh
    // is authored. Swap the key when Interact_Cup_001 lands.
    'MarshallSpeaker': {
      label: 'Vintage Marshall speaker',
      reveal: {
        type: 'text-with-image',
        title: 'A gift from K — don\'t let him take it back',
        body:
          'A faint sticky note on the back: "a gift from K — don\'t let him take it back." Kabir gave her this. ' +
          'It\'s her most expensive possession. The fact that it\'s labeled suggests she was prepared for him to ask for it.',
        image: null,
      },
      clueId: 'clue-speaker-sticky',
    },

    // CURRENT — same stand-in note. The capo position is the game's
    // most elegant continuity thread; Interact_Guitar_001 will own
    // it once the rename lands.
    'Ukulele': {
      label: 'Guitar',
      reveal: {
        type: 'text-with-image',
        title: 'The capo is in the wrong place',
        body:
          'The capo is clipped on the 5th fret. In every photo and video on Mira\'s Instagram, the capo is always on the 2nd fret — ' +
          'her default for her own songs. Someone else played it, or adjusted it, and left it that way.',
        image: null,
      },
      clueId: 'clue-guitar-capo',
    },

    // CURRENT — Rubik's cube is in the room across all timelines and
    // tracks Mira's mental state arc. In Level 1 it is fully solved.
    'Rubick': {
      label: "Rubik's cube",
      reveal: {
        type: 'text-with-image',
        title: 'Solved',
        body:
          'Fully solved. A small sticky on the desk in Mira\'s handwriting reads: "proof I did it once." ' +
          'She kept it untouched after solving it the first time.',
        image: null,
      },
      clueId: 'clue-rubiks-cube',
    },

    // CURRENT — the laptop is the source for several investigation
    // beats; Step 14 will likely split this into multiple distinct
    // interactives once the room is re-modeled.
    'Laptop': {
      label: 'Laptop (open on the rug)',
      reveal: {
        type: 'text-with-image',
        title: 'Two cushion dents on the rug',
        body:
          'Mira\'s laptop is here, lid open, screen black — battery dead. There are two distinct impressions ' +
          'in the rug\'s pile, both facing the bed, close together. Two people sat on this rug for some time.',
        image: null,
      },
      clueId: 'clue-rug-impressions',
    },

    // CURRENT — the lamp is off in the crime scene. Used here as a
    // stand-in for the fairy-lights timer override clue.
    'TableLamp': {
      label: 'Fairy lights (still on at 9 AM)',
      reveal: {
        type: 'text-with-image',
        title: 'The timer was overridden',
        body:
          'The fairy lights above the bed are still on at 9 AM. They run on a timer, 6 PM to 6 AM. ' +
          'The timer plug is visibly unplugged from the extension board and the lights are connected directly. ' +
          'Someone physically overrode the timer to leave the lights on.',
        image: null,
      },
      clueId: 'clue-fairy-lights',
    },

    // PENDING — author Interact_Cup_001 in level-01.blend.
    'Interact_Cup_001': {
      label: 'Cup and saucer',
      reveal: {
        type: 'text-with-image',
        title: 'A faint powdery film',
        body:
          'A mug of something — chamomile, or honey-coloured. At the very bottom, a faint powdery film coats the inside. ' +
          'The saucer has a faint ring from a second cup — but there is no second cup in the room. ' +
          'Someone else was drinking here and took their cup with them when they left.',
        image: null,
      },
      clueId: 'clue-cup-residue',
    },

    // PENDING — author Interact_Window_001.
    'Interact_Window_001': {
      label: 'Window',
      reveal: {
        type: 'text-with-image',
        title: 'Latched from the inside',
        body:
          'Closed. Latched from the inside. No signs of forced entry on the latch or the frame. ' +
          'The only entry and exit is the main door. This was not a break-in.',
        image: null,
      },
      clueId: 'clue-window-latched',
    },

    // PENDING — author Interact_Mirror_001.
    'Interact_Mirror_001': {
      label: 'Mirror',
      reveal: {
        type: 'text-with-image',
        title: 'A small lipstick heart',
        body:
          'A tiny heart drawn in lipstick on the lower corner — the kind you do absentmindedly. ' +
          'The shade is a burnt coral-orange. Mira wears browns and nudes in every photo in the room. ' +
          'The lipstick belongs to someone who visited.',
        image: null,
      },
      clueId: 'clue-mirror-heart',
    },

    // ─── Character clues (the pinboard, posters, books, plant) ────────
    // All PENDING until the modeler authors named meshes.

    'Interact_Portraits_001': {
      label: 'Portraits on the wall',
      reveal: {
        type: 'text-with-image',
        title: 'A pinboard of faces',
        body:
          'Mira and a boy on stage, arms around each other — Kabir. ' +
          'Mira and a girl on a rooftop, mid-cackle — Tanya. ' +
          'Mira in a recording studio with a well-dressed older man — Veer. ' +
          'A family photo: Mira, an older neater woman, and two elderly people — Neha, and their late parents.',
        image: null,
      },
      clueId: 'clue-portraits',
    },

    'Interact_MoviePoster_001': {
      label: 'Movie posters',
      reveal: {
        type: 'text-with-image',
        title: 'Whiplash. A Star is Born.',
        body:
          'Two posters. Both stories of musicians who burn bright and destroy themselves reaching for something. ' +
          'She knew what she was aiming for and had made peace with the cost.',
        image: null,
      },
      clueId: 'clue-movie-posters',
    },

    'Interact_Books_001': {
      label: 'Books',
      reveal: {
        type: 'text-with-image',
        title: 'Three titles',
        body:
          '"So You Want to Talk About Money" by Erin Lowry — bookmark 60% in. ' +
          '"This Is Marketing" by Seth Godin — spine cracked, annotated. ' +
          '"Maybe You Should Talk to Someone" — dog-eared. ' +
          'She was working on her finances, her career, and her mental health — all simultaneously.',
        image: null,
      },
      clueId: 'clue-books',
    },

    'Interact_Plant_001': {
      label: 'Plant and flower pot',
      reveal: {
        type: 'text-with-image',
        title: '"water me every 3 days or i will haunt you"',
        body:
          'The plant is thriving and recently watered — soil still moist. ' +
          'A small sticky note on the flower pot, in Mira\'s handwriting: "water me every 3 days or i will haunt you — Mira." ' +
          'She was alive and planning ahead as recently as a few days ago.',
        image: null,
      },
      clueId: 'clue-plant-note',
    },
  },

  question: {
    type: 'mcq',
    prompt: 'Was Mira murdered here, in this room? Or was her body moved?',
    options: [
      { id: 'a', text: 'She died elsewhere and was moved here.',          correct: false },
      { id: 'b', text: 'She was murdered here, in this room.',            correct: true  },
      { id: 'c', text: 'She died of natural causes — there is no crime.', correct: false },
      { id: 'd', text: 'Not enough evidence to say.',                     correct: false },
    ],
    // Story-bible required clues are the cup residue (means of death
    // was here) and the rug impressions (someone else was here). The
    // cup mesh isn't in the GLB yet (PENDING Interact_Cup_001), so
    // gating on it would make Level 1 unanswerable today. Until the
    // modeler ships the rename, gate on two CURRENT stand-in clues
    // so Step 10's question panel is testable end-to-end. Restore to
    // ['clue-cup-residue', 'clue-rug-impressions'] when the cup mesh
    // exists.
    requiredClues: ['clue-rug-impressions', 'clue-guitar-capo'],
    onWrong: { shake: true, disable: true },
  },

  outro: {
    titleCard: '6 hours earlier',
    text: 'The room didn\'t fight back. Neither did she. She had no reason to.',
  },
};
