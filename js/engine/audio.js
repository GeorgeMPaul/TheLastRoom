/**
 * engine/audio.js
 *
 * Per-level ambient audio. One track at a time, looping, with a soft
 * crossfade when levels swap. Knows nothing about levels or content —
 * callers pass URLs, the audio system loads, decodes (via <audio>),
 * and plays.
 *
 * Browser autoplay policy means no audio plays until the user produces
 * a gesture. We expose a one-shot `unlock()` that the boot UI calls
 * from a real click handler; before that, every `playAmbient` call is
 * queued and flushed on unlock.
 *
 * Step 11 scope: ambient only. SFX (clue discovery, note save) lands
 * in Step 13's polish pass.
 *
 * Exports:
 *   initAudio()                                    set up the singleton; safe to call multiple times
 *   unlock()                                       call from a user-gesture handler; resolves a queued ambient
 *   isUnlocked()                                   → boolean
 *   playAmbient(url, { volume, fadeMs } = {})     fades out current, fades in new; null url = stop
 *   stopAmbient({ fadeMs } = {})                  fade out and clear
 *   setMasterVolume(v)                             0..1, multiplies all tracks
 *
 * The track is an HTMLAudioElement, not a WebAudio buffer. For a
 * single looping ambient stem this is plenty, and it sidesteps the
 * AudioContext suspended-state churn.
 */

let inited       = false;
let unlocked     = false;
let masterVolume = 1.0;

let currentEl     = null;       // HTMLAudioElement currently playing (post-fade-in)
let currentUrl    = null;
let currentVolume = 0;          // intended pre-master volume of currentEl
let pendingPlay   = null;       // { url, volume, fadeMs } queued until unlock

const fadeTimers = new Set();

export function initAudio() {
  if (inited) return;
  inited = true;
}

export function isUnlocked() { return unlocked; }

export function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (pendingPlay) {
    const { url, volume, fadeMs } = pendingPlay;
    pendingPlay = null;
    playAmbient(url, { volume, fadeMs });
  }
}

export function setMasterVolume(v) {
  masterVolume = clamp01(v);
  if (currentEl) currentEl.volume = currentVolume * masterVolume;
}

/**
 * Start playing `url` as the looping ambient. Cross-fades from any
 * existing track. Pass `null` to stop the current track entirely.
 *
 * Before unlock(), the most recent call is queued and applied on unlock.
 */
export function playAmbient(url, { volume = 0.5, fadeMs = 800 } = {}) {
  if (!inited) initAudio();

  if (!unlocked) {
    pendingPlay = { url, volume, fadeMs };
    return;
  }

  // Same track already playing — adjust volume only.
  if (url && url === currentUrl && currentEl) {
    currentVolume = clamp01(volume);
    currentEl.volume = currentVolume * masterVolume;
    return;
  }

  // Fade out the outgoing track (if any) and dispose it.
  if (currentEl) {
    const outgoing = currentEl;
    fadeTo(outgoing, 0, fadeMs, () => {
      try { outgoing.pause(); } catch {}
      outgoing.src = '';
    });
  }

  if (!url) {
    currentEl     = null;
    currentUrl    = null;
    currentVolume = 0;
    return;
  }

  // Start the new track at zero volume and fade in.
  const next = new Audio(url);
  next.loop = true;
  next.preload = 'auto';
  next.volume = 0;
  // Some browsers reject .play() if it's called before the element is
  // ready; .play() returns a promise we just swallow on rejection.
  const playPromise = next.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((err) => {
      console.warn('[audio] ambient play rejected:', err);
    });
  }

  currentEl     = next;
  currentUrl    = url;
  currentVolume = clamp01(volume);
  fadeTo(next, currentVolume * masterVolume, fadeMs);
}

export function stopAmbient({ fadeMs = 600 } = {}) {
  playAmbient(null, { fadeMs });
}

// ─── Fade helper ─────────────────────────────────────────────────────
// Linear volume ramp in 16ms steps. Stores its timer in fadeTimers so
// successive fades on the same element cancel cleanly.
function fadeTo(el, targetVolume, ms, onDone) {
  if (!el) return;
  const startVolume = el.volume;
  const start = performance.now();
  const dur = Math.max(1, ms);

  // Cancel any in-flight fade on this element.
  for (const t of fadeTimers) {
    if (t.el === el) {
      cancelAnimationFrame(t.raf);
      fadeTimers.delete(t);
    }
  }

  const handle = { el, raf: 0 };
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    el.volume = clamp01(startVolume + (targetVolume - startVolume) * t);
    if (t < 1) {
      handle.raf = requestAnimationFrame(step);
    } else {
      fadeTimers.delete(handle);
      if (onDone) onDone();
    }
  };
  handle.raf = requestAnimationFrame(step);
  fadeTimers.add(handle);
}

function clamp01(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
