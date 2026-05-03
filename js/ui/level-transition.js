/**
 * ui/level-transition.js
 *
 * Full-screen fade between levels. Hides the GLB unload + reload from
 * the player, and spends the dwell time showing the previous level's
 * `outro.titleCard` + `outro.text`.
 *
 * Flow (the timing constants are tunable in TIMING below):
 *
 *   1. Mount over everything as a fade-in to opaque (FADE_MS).
 *      During this fade the player still sees the old scene dimming.
 *   2. Once opaque, swap content to the title card (titleCard + body),
 *      and call `onMidpoint()` — this is where the caller does the
 *      actual disposal + GLB load. We block on its returned promise.
 *   3. Hold the title card for HOLD_MS (or until onMidpoint resolves
 *      if it took longer).
 *   4. Fade out to transparent (FADE_MS) revealing the new level.
 *   5. Unmount + call `onComplete()`.
 *
 * Picker is frozen for the entire transition so a fast click can't
 * fire a clue mid-fade. The transition uses z-index 40 — above the
 * notes view (30), above modals (20), above the HUD (10).
 *
 * Module contract:
 *   mountLevelTransition({
 *     parent,                // typically uiRoot
 *     picker,                // for setInputBlocked
 *     outro,                 // { titleCard, text } — from the OUTGOING level
 *     nextTitle,             // optional string shown under the title card
 *     onMidpoint,            // async () => void — runs at peak opacity
 *     onComplete,            // optional () => void — fires after final fade
 *   }) → { unmount, promise }
 *
 * The returned `promise` resolves after onComplete fires (or rejects
 * if onMidpoint throws). Useful when callers want to await the whole
 * thing instead of registering onComplete.
 */

const TIMING = {
  FADE_MS: 700,
  HOLD_MS: 2200,
};

export function mountLevelTransition({
  parent,
  picker,
  outro = {},
  nextTitle = null,
  onMidpoint,
  onComplete,
}) {
  const titleCard = outro?.titleCard ?? '';
  const bodyText  = outro?.text ?? '';

  const root = document.createElement('div');
  root.className = 'level-transition';
  root.innerHTML = `
    <style>
      .level-transition {
        position: fixed; inset: 0;
        z-index: 40;
        pointer-events: auto;
        background: #05070f;
        opacity: 0;
        transition: opacity ${TIMING.FADE_MS}ms ease;
        display: flex; align-items: center; justify-content: center;
        font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
        color: #e6ecf6;
      }
      .level-transition--visible { opacity: 1; }
      .level-transition__card {
        max-width: 580px;
        width: calc(100% - 64px);
        text-align: center;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 600ms ease 200ms, transform 600ms ease 200ms;
      }
      .level-transition--text-in .level-transition__card {
        opacity: 1; transform: translateY(0);
      }
      .level-transition__eyebrow {
        font-size: 11px;
        letter-spacing: 0.24em; text-transform: uppercase;
        color: #6c7da0;
        margin-bottom: 14px;
      }
      .level-transition__title {
        font-size: 30px;
        font-weight: 600;
        color: #f0f4ff;
        letter-spacing: 0.02em;
        margin-bottom: 18px;
      }
      .level-transition__body {
        font-size: 15px;
        color: #b6c4e2;
        font-style: italic;
        margin-bottom: 22px;
      }
      .level-transition__next {
        font-size: 12px;
        letter-spacing: 0.18em; text-transform: uppercase;
        color: #6c7da0;
      }
    </style>

    <div class="level-transition__card" data-card>
      <div class="level-transition__eyebrow" data-eyebrow></div>
      <div class="level-transition__title"  data-title></div>
      <div class="level-transition__body"   data-body></div>
      <div class="level-transition__next"   data-next  hidden></div>
    </div>
  `;

  // Title card stays hidden until we hit peak opacity. Set the eyebrow
  // ahead of time so the layout is stable when we reveal it.
  root.querySelector('[data-eyebrow]').textContent = 'Time slips';
  root.querySelector('[data-title]').textContent   = titleCard;
  root.querySelector('[data-body]').textContent    = bodyText;
  if (nextTitle) {
    const nextEl = root.querySelector('[data-next]');
    nextEl.textContent = `Next: ${nextTitle}`;
    nextEl.hidden = false;
  }

  parent.appendChild(root);

  // Freeze player input for the entire transition.
  if (picker && typeof picker.setInputBlocked === 'function') {
    picker.setInputBlocked(true);
  }

  let unmounted = false;
  function unmount() {
    if (unmounted) return;
    unmounted = true;
    if (picker && typeof picker.setInputBlocked === 'function') {
      picker.setInputBlocked(false);
    }
    root.remove();
  }

  // ─── The transition sequence ─────────────────────────────────────
  // Done as an async function so onMidpoint's promise threads in
  // cleanly and exceptions land in one catch.
  const promise = (async () => {
    // Force a reflow so the opacity transition fires from the 0 baseline.
    void root.offsetWidth;
    root.classList.add('level-transition--visible');

    await wait(TIMING.FADE_MS);

    // Reveal the title card.
    root.classList.add('level-transition--text-in');

    // Run the caller's midpoint work (dispose old level, load new GLB)
    // in parallel with the title-card hold. Whichever takes longer
    // wins so we never reveal a half-loaded scene.
    const work = Promise.resolve().then(() => onMidpoint?.());
    await Promise.all([work, wait(TIMING.HOLD_MS)]);

    // Fade out to reveal the new level.
    root.classList.remove('level-transition--visible');
    await wait(TIMING.FADE_MS);

    unmount();
    if (typeof onComplete === 'function') onComplete();
  })().catch((err) => {
    console.error('[level-transition] failed:', err);
    unmount();
    throw err;
  });

  return { unmount, promise };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
