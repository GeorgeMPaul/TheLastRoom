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
 *   The current level-01.glb uses the modeler's working names
 *   (Laptop, Ukulele, Rubick, MarshallSpeaker, TableLamp, Cup, Window,
 *   Mirror, Fotos, BasePoster1, Book, Plant, etc.) rather than the
 *   Interact_<Object>_<NNN> convention from CLAUDE.md. All 11
 *   narrative clues from the story bible now resolve to a real mesh
 *   in the GLB. Several clues have additional sibling meshes (Saucer,
 *   Tea, MirrorFrame, LipStickMark, Book.001/.002, PlantPot, the
 *   four PictureMirawith… portraits) that currently route nowhere —
 *   fan them to the canonical clue if testers click the wrong piece.
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
        title: 'An expensive gift',
        body:
          'It\'s her most expensive possession.',
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

    // CURRENT — Cup, Saucer, and Tea are three sibling meshes at the
    // root of the GLB; we route the canonical pick at Cup. If players
    // start clicking the saucer or tea and expect a response, fan
    // those mesh names to the same clue in a follow-up.
    'Cup': {
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

    // CURRENT — Window (pane), WindowClosed (alternate state), and
    // Persiana (blind) are sibling meshes; canonical pick is Window.
    'Window': {
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

    // CURRENT — Mirror (glass), MirrorFrame, MirrorStand, and
    // LipStickMark are sibling meshes; canonical pick is Mirror. The
    // lipstick heart itself (LipStickMark) is its own mesh — fan it
    // in if testers click directly on the mark.
    'Mirror': {
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

    // CURRENT — the pinboard ships as four individual portrait meshes:
    // PictureMirawith{Kabir,Tanya,Veer,Family}, each with a sibling
    // …Frame mesh. Each portrait is now its own clue. If testers click
    // a frame instead of the photo, fan the *Frame mesh names to the
    // matching clue in a follow-up.

    'PictureMirawithKabir': {
      label: 'Photo: Mira and Kabir',
      reveal: {
        type: 'text-with-image',
        title: 'On stage with Kabir',
        body:
          'Mira and a boy on stage, arms around each other, both grinning into the lights. ' +
          'This is Kabir — her on-and-off, the one who gave her the Marshall speaker.',
        image: null,
      },
      clueId: 'clue-photo-kabir',
    },

    'PictureMirawithTanya': {
      label: 'Photo: Mira and Tanya',
      reveal: {
        type: 'text-with-image',
        title: 'Rooftop with Tanya',
        body:
          'Mira and a girl on a rooftop, mid-cackle, drinks in hand. ' +
          'This is Tanya — her best friend since NIFT.',
        image: null,
      },
      clueId: 'clue-photo-tanya',
    },

    'PictureMirawithVeer': {
      label: 'Photo: Mira and Veer',
      reveal: {
        type: 'text-with-image',
        title: 'In the studio with Veer',
        body:
          'Mira in a recording studio with a well-dressed older man at the console. ' +
          'This is Veer — the producer she\'d been working with on her debut single.',
        image: null,
      },
      clueId: 'clue-photo-veer',
    },

    'PictureMirawithFamily': {
      label: 'Photo: Mira with family',
      reveal: {
        type: 'text-with-image',
        title: 'Family',
        body:
          'A family photo: Mira, an older neater woman beside her, and two elderly people behind them. ' +
          'Her sister Neha, and their late parents.',
        image: null,
      },
      clueId: 'clue-photo-family',
    },

    // CURRENT — BasePoster1 is the framed Whiplash / Star is Born
    // poster mesh shipped in the GLB.
    'BasePoster1': {
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

    // CURRENT — Book, Book.001, and Book.002 are three sibling meshes
    // (one for each title). Canonical pick is Book; fan to the others
    // if testers click the wrong spine.
    'Book': {
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

    // CURRENT — Plant (foliage) and PlantPot are sibling meshes;
    // canonical pick is Plant.
    'Plant': {
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
    // Story-bible required clues: the cup residue (means of death
    // was here) and the rug impressions (someone else was here).
    // Both meshes are now CURRENT in level-01.glb.
    requiredClues: [],
    onWrong: { shake: true, disable: true },
  },

  outro: {
    titleCard: '6 hours earlier',
    text: 'The room didn\'t fight back. Neither did she. She had no reason to.',
  },
};
