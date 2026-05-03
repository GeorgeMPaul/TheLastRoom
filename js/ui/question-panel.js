/**
 * ui/question-panel.js
 *
 * The per-level multiple-choice question. Modal dialog with the
 * level's prompt and 2-4 options. On a wrong answer: shake animation
 * and (per content's `onWrong: { disable: true }`) disable the
 * incorrect option so the player can't keep clicking it. On a correct
 * answer: dispatch `answerQuestion(levelId, true)` and call the
 * caller-supplied `onCorrect` (which today just logs an
 * `advanceToLevel` placeholder — Step 12 wires real transitions).
 *
 * Module contract:
 *   mountQuestionPanel({ parent, levelContent, picker, onCorrect?, onClose? })
 *     → { unmount }
 *
 * Required-clue gating belongs to the HUD button that opens this
 * panel — by the time we're mounted, the player has earned the
 * right to attempt the question. We do still receive the level's
 * full content so the panel can read prompt/options/onWrong.
 *
 * Picker freezes while the panel is open, like every other modal.
 */

import { answerQuestion } from '../game/state.js';

export function mountQuestionPanel({ parent, levelContent, picker, onCorrect, onClose }) {
  const q = levelContent?.question ?? {};
  const prompt  = q.prompt  ?? 'Question';
  const options = Array.isArray(q.options) ? q.options : [];
  const onWrong = q.onWrong ?? { shake: true, disable: true };
  const levelId = levelContent?.id;

  // ─── DOM ──────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'question-panel';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.innerHTML = `
    <style>
      .question-panel {
        position: fixed; inset: 0;
        z-index: 25;
        pointer-events: auto;
        display: flex; align-items: center; justify-content: center;
        background: rgba(4, 6, 14, 0.78);
        font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
        color: #e6ecf6;
      }
      .question-panel__card {
        background: #11162a;
        border: 1px solid #2a3553;
        border-radius: 6px;
        max-width: 560px;
        width: calc(100% - 48px);
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.62);
        overflow: hidden;
      }
      .question-panel__card--shake {
        animation: question-panel-shake 0.45s ease;
      }
      @keyframes question-panel-shake {
        0%, 100% { transform: translateX(0); }
        15%      { transform: translateX(-10px); }
        30%      { transform: translateX(10px); }
        45%      { transform: translateX(-7px); }
        60%      { transform: translateX(7px); }
        80%      { transform: translateX(-3px); }
      }
      .question-panel__header {
        padding: 16px 20px 12px;
        border-bottom: 1px solid #232c44;
      }
      .question-panel__eyebrow {
        font-size: 11px;
        letter-spacing: 0.12em; text-transform: uppercase;
        color: #8294b8;
        margin-bottom: 4px;
      }
      .question-panel__prompt {
        font-size: 18px; font-weight: 600;
        color: #f0f4ff;
      }
      .question-panel__options {
        padding: 14px 20px;
        display: flex; flex-direction: column; gap: 8px;
      }
      .question-panel__option {
        font: inherit; text-align: left;
        background: #161c2c; color: #d8e0f0;
        border: 1px solid #2a3553; border-radius: 4px;
        padding: 11px 14px;
        cursor: pointer;
        transition: background 0.12s ease, border-color 0.12s ease;
      }
      .question-panel__option:hover:not(:disabled) {
        background: #1d2543; border-color: #3b4a72;
      }
      .question-panel__option--wrong {
        background: #2a1620; border-color: #6b2533; color: #d8a4ad;
      }
      .question-panel__option--correct {
        background: #16291f; border-color: #2f6b48; color: #a4d8b6;
      }
      .question-panel__option:disabled { cursor: not-allowed; opacity: 0.55; }
      .question-panel__footer {
        padding: 12px 20px;
        border-top: 1px solid #232c44;
        display: flex; justify-content: space-between; align-items: center;
        color: #6c7da0; font-size: 12px;
      }
      .question-panel__close {
        font: inherit;
        background: transparent; color: #8294b8;
        border: 0; cursor: pointer;
        padding: 4px 8px;
      }
      .question-panel__close:hover { color: #e6ecf6; }
      .question-panel__hint {
        color: #6c7da0; font-style: italic;
      }
    </style>

    <div class="question-panel__card" data-card>
      <header class="question-panel__header">
        <div class="question-panel__eyebrow">${escapeHtml(levelContent?.title ?? '')}</div>
        <div class="question-panel__prompt" data-prompt></div>
      </header>
      <div class="question-panel__options" data-options></div>
      <footer class="question-panel__footer">
        <span class="question-panel__hint" data-hint>Pick the answer the room is telling you.</span>
        <button class="question-panel__close" data-action="close">Close</button>
      </footer>
    </div>
  `;
  root.querySelector('[data-prompt]').textContent = prompt;

  // Build the option buttons (textContent, no HTML injection).
  const optionsEl = root.querySelector('[data-options]');
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.className = 'question-panel__option';
    btn.dataset.optionId = opt.id;
    btn.dataset.correct  = opt.correct ? '1' : '0';
    btn.textContent = opt.text;
    optionsEl.appendChild(btn);
  }

  parent.appendChild(root);

  // ─── Picker freeze ───────────────────────────────────────────────
  if (picker && typeof picker.setInputBlocked === 'function') {
    picker.setInputBlocked(true);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────
  let unmounted = false;
  function unmount() {
    if (unmounted) return;
    unmounted = true;
    document.removeEventListener('keydown', onKeyDown);
    if (picker && typeof picker.setInputBlocked === 'function') {
      picker.setInputBlocked(false);
    }
    root.remove();
    if (typeof onClose === 'function') onClose();
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); unmount(); }
  };
  document.addEventListener('keydown', onKeyDown);

  // ─── Answer handling ─────────────────────────────────────────────
  const card = root.querySelector('[data-card]');
  const hintEl = root.querySelector('[data-hint]');

  function shake() {
    card.classList.remove('question-panel__card--shake');
    // Force reflow so the animation restarts on consecutive wrong answers.
    void card.offsetWidth;
    card.classList.add('question-panel__card--shake');
  }

  optionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-option-id]');
    if (!btn || btn.disabled) return;
    const correct = btn.dataset.correct === '1';

    if (correct) {
      btn.classList.add('question-panel__option--correct');
      // Disable everything; we're advancing.
      for (const b of optionsEl.querySelectorAll('button')) b.disabled = true;
      hintEl.textContent = 'Correct.';
      if (levelId) answerQuestion(levelId, true);
      // Brief pause so the player sees the correct state, then close.
      setTimeout(() => {
        unmount();
        if (typeof onCorrect === 'function') onCorrect();
      }, 700);
      return;
    }

    // Wrong path.
    if (onWrong?.shake) shake();
    if (onWrong?.disable) {
      btn.disabled = true;
      btn.classList.add('question-panel__option--wrong');
    }
    hintEl.textContent = 'Not that one. Look again.';
    if (levelId) answerQuestion(levelId, false);
  });

  root.addEventListener('click', (e) => {
    if (e.target?.dataset?.action === 'close') unmount();
  });

  return { unmount };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
