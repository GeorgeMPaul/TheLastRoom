/**
 * content/levels/level-02.js
 *
 * Level 2 — Two Nights Before.
 * Saturday, March 16, 2024 — 11:42 PM. Warm bedside lamp, fairy lights
 * on, the Marshall playing low. Mira is cross-legged on the rug
 * laughing at something on her laptop, a visitor (silhouette) beside
 * her. Two cups, half-eaten donut, comfortable disorder.
 *
 * Task: WEAPON — How was Mira killed? (Answer: poisoning.)
 *
 * Mesh-name reality (May 2026):
 *   level-02.glb ships with the L1 room shell plus L2-specific objects:
 *   Donut, Culprit (visitor silhouette), Mira / Mira.001 (alive,
 *   animated), Saucer.001 / Cup.001 / Tea.001 (visitor's white cup),
 *   Saucer.002, and handbag / Handbag / HandbagBrand (the Briq tote).
 *   Sibling fan-out (Saucer/Tea -> Cup, Saucer.001/Tea.001 -> Cup.001,
 *   etc.) is not authored yet — the picker only resolves the canonical
 *   mesh names listed below. If testers click a sibling and get
 *   nothing, fan it to the matching clue in a follow-up.
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

  // Story-bible TOD for this scene is "Night. Warm indoor light." The
  // 'night' preset is cold-blue moonlight, which fights the warm-lamp
  // mood; 'dusk' (warm orange directional, low ambient) reads closer
  // to a lamp-lit late evening. Real per-level lighting tuning lands
  // when the scene gets its dedicated pass.
  lighting: { tod: 'dusk' },

  audio: {
    // Drop in once authored: assets/audio/ambient/saturday-night.mp3
    // — distant traffic + wind + a hint of music from a neighbour.
    ambient: null,
    ambientVolume: 0.4,
    music: null,
  },

  interactives: {

    // ─── Investigation clues ──────────────────────────────────────────

    // Mira's blue enamel mug. Powder residue near the rim — added
    // from above into liquid that was already there.
    'Cup': {
      label: 'Mira\'s cup (blue enamel)',
      reveal: {
        type: 'text-with-image',
        title: 'A pale powder along the rim',
        body:
          'Her usual blue enamel mug, sitting on the rug. Faint pale powder clings to the inside of the rim — ' +
          'not at the bottom where tea dregs settle, but near the top. Something was dropped in from above ' +
          'while there was already liquid in the cup, and dissolved as it fell.',
        image: null,
      },
      clueId: 'clue-l2-cup-residue',
    },

    // The visitor's cup. White ceramic, no residue. The killer used
    // a clean cup.
    'Cup.001': {
      label: 'White ceramic mug (visitor\'s)',
      reveal: {
        type: 'text-with-image',
        title: 'Clean inside',
        body:
          'A plain white ceramic mug from Mira\'s kitchen — the one she pulls out for guests. ' +
          'It\'s closer to where the visitor sat. Nothing unusual inside it: no powder, no film. ' +
          'Whatever was in Mira\'s cup wasn\'t in this one.',
        image: null,
      },
      clueId: 'clue-l2-visitor-cup',
    },

    // Donut eaten from the top. Mira eats from the bottom up — her
    // Instagram has the receipts. The visitor ate this.
    'Donut': {
      label: 'Half-eaten donut',
      reveal: {
        type: 'text-with-image',
        title: 'Eaten the wrong way',
        body:
          'On a plate beside the cups. Eaten from the top down — frosting first. ' +
          'Mira\'s food posts on Instagram are very clear: she always eats donuts from the bottom up, ' +
          '"so the frosting hits different as the finale." She didn\'t eat this one. The visitor did.',
        image: null,
      },
      clueId: 'clue-l2-donut',
    },

    // Laptop — Gmail draft to Veer about Clause 7B. Unsent.
    'Laptop': {
      label: 'Laptop (open on the rug)',
      reveal: {
        type: 'text-with-image',
        title: 'An email she never sent',
        body:
          'Lid open, YouTube playing one of her own covers. Behind it, a minimised Gmail tab — a draft to ' +
          'veer@hollowmountain.in, subject "Question about the contract — urgent." The body asks for a lawyer ' +
          'to review clause 7B before the EP release. It was never sent.',
        image: null,
      },
      clueId: 'clue-l2-laptop',
    },

    // Marshall — sticky note "a gift from K — don't let him take it back."
    'MarshallSpeaker': {
      label: 'Vintage Marshall speaker',
      reveal: {
        type: 'text-with-image',
        title: '"a gift from K — don\'t let him take it back"',
        body:
          'Playing something lo-fi at low volume. On the back, a faint sticky in Mira\'s handwriting: ' +
          '"a gift from K — don\'t let him take it back." She labelled her most expensive possession because ' +
          'she expected him to come asking.',
        image: null,
      },
      clueId: 'clue-l2-marshall',
    },

    // Guitar — capo on 2nd fret (Mira's position). The continuity
    // thread that makes the L1 5th-fret reading meaningful.
    'Ukulele': {
      label: 'Guitar (leaning against the wall)',
      reveal: {
        type: 'text-with-image',
        title: 'Capo on the 2nd fret',
        body:
          'Leaning against the wall, capo clipped on the 2nd fret — Mira\'s default for her own songs. ' +
          'Two nights from now, on Monday morning, it will be on the 5th. Tonight the room is still hers.',
        image: null,
      },
      clueId: 'clue-l2-guitar-capo',
    },

    // The visitor — silhouette with coral nail polish.
    'Culprit': {
      label: 'The visitor',
      reveal: {
        type: 'text-with-image',
        title: 'A silhouette, and a colour',
        body:
          'You can\'t see their face yet. But you can see their hands — short nails, painted a bright ' +
          'coral-orange. The same shade as the lipstick heart that will appear on the mirror by morning.',
        image: null,
      },
      clueId: 'clue-l2-visitor-silhouette',
    },

    // Briq tote at the door — Tanya's startup logo.
    'Handbag': {
      label: 'Tote bag by the door',
      reveal: {
        type: 'text-with-image',
        title: 'A logo on the strap',
        body:
          'A canvas tote dropped near the entryway. The logo on the strap reads "Briq" — a small Bangalore ' +
          'D2C startup. Mira doesn\'t work there. Someone she knows does.',
        image: null,
      },
      clueId: 'clue-l2-briq-tote',
    },

    // Mirror — coral lipstick heart, drawn earlier in the evening.
    'Mirror': {
      label: 'Mirror',
      reveal: {
        type: 'text-with-image',
        title: 'A small coral-orange heart',
        body:
          'In the lower corner of the glass, a small heart drawn in lipstick — coral-orange, the same colour ' +
          'as the visitor\'s nails. It looks confident, quickly done. Something they always do on each other\'s mirrors.',
        image: null,
      },
      clueId: 'clue-l2-mirror-heart',
    },

    // ─── Character clues ──────────────────────────────────────────────

    // Mira herself — alive, laughing.
    'Mira': {
      label: 'Mira',
      reveal: {
        type: 'text-with-image',
        title: 'Cross-legged on the rug',
        body:
          'Mira, in a worn t-shirt and sleep shorts, cross-legged on the rug, laughing at her laptop. ' +
          'Her cup is at her left hand. She has no idea what is in it, and no idea this is the second-to-last ' +
          'night of her life.',
        image: null,
      },
      clueId: 'clue-l2-mira-alive',
    },

    // Pinboard — Kabir's face covered with a sticky note.
    'PictureMirawithKabir': {
      label: 'Photo: Mira and Kabir',
      reveal: {
        type: 'text-with-image',
        title: '"processing 🙃"',
        body:
          'The photo of Mira and Kabir on stage has a sticky note placed over his face — recently, in Mira\'s ' +
          'lowercase handwriting: "processing 🙃." Three months out from the breakup, she was still working through it.',
        image: null,
      },
      clueId: 'clue-l2-kabir-covered',
    },

    // The "Money" book with the WhatsApp printout tucked inside.
    'Book': {
      label: '"So You Want to Talk About Money"',
      reveal: {
        type: 'text-with-image',
        title: 'A folded printout',
        body:
          'Erin Lowry\'s personal-finance book, bookmark a little further in than it was last time. ' +
          'A folded sheet is tucked inside: a printed WhatsApp screenshot. Partially visible — ' +
          '"—you know that was a loan right mira" / "tanya i literally asked you at the time" / "I have the texts—" ' +
          'The rest is hidden by the fold. A dispute, documented.',
        image: null,
      },
      clueId: 'clue-l2-loan-printout',
    },

    // Pillow — sewn-on musical-note patch.
    'Pillows': {
      label: 'Pillow hug toy',
      reveal: {
        type: 'text-with-image',
        title: 'A musical-note patch',
        body:
          'Tossed on the bed beside her guitar jacket. There\'s a small fabric patch sewn onto it — shaped like a ' +
          'musical note, not factory-original. She did it herself. She kept childhood things and made them more hers.',
        image: null,
      },
      clueId: 'clue-l2-pillow-patch',
    },

    // Plant — the same self-haunting sticky note from L1.
    'Plant': {
      label: 'Plant and flower pot',
      reveal: {
        type: 'text-with-image',
        title: '"water me every 3 days or i will haunt you"',
        body:
          'Soil is moist. The sticky note on the pot in Mira\'s handwriting: "water me every 3 days or i will haunt you — Mira." ' +
          'Two days from now it will still be there, and so will the note, and only the writer will be missing.',
        image: null,
      },
      clueId: 'clue-l2-plant-note',
    },

    // Movie posters — same Whiplash / Star is Born pair, re-read in
    // light of what's about to happen.
    'BasePoster1': {
      label: 'Movie posters',
      reveal: {
        type: 'text-with-image',
        title: 'Whiplash. A Star is Born.',
        body:
          'Both posters: musicians who burn bright reaching for something that costs them everything. ' +
          'Tonight she still thinks the cost is exhaustion, contracts, lawyers. She has not yet been told the real bill.',
        image: null,
      },
      clueId: 'clue-l2-movie-posters',
    },
  },

  question: {
    type: 'mcq',
    prompt: 'How was Mira killed?',
    options: [
      { id: 'a', text: 'A violent assault — a struggle that was cleaned up.', correct: false },
      { id: 'b', text: 'Poisoning — something dissolved into her drink.',     correct: true  },
      { id: 'c', text: 'Suicide — she took her own medication deliberately.', correct: false },
      { id: 'd', text: 'Natural causes — heart failure in her sleep.',        correct: false },
    ],
    // The powder in Mira's cup proves the means; the donut proves the
    // visitor was eating from her plate (and therefore present and
    // close enough to drop something into her drink). Either alone is
    // ambiguous; together they fix the answer.
    requiredClues: ['clue-l2-cup-residue', 'clue-l2-donut'],
    onWrong: { shake: true, disable: true },
  },

  outro: {
    titleCard: 'Two weeks earlier',
    text: 'She thought she had time. She\'d always had time before.',
  },
};
