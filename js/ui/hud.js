/**
 * ui/hud.js
 *
 * Persistent HUD layer. Mounted once per level. Hosts:
 *   - The clue counter ("3 / 11 clues")
 *   - The notes button (delegated to notes-button.js)
 *   - The "Answer the question" button — disabled until all of the
 *     level's `requiredClues` are in state.cluesByLevel[levelId].
 *
 * The HUD layer itself is `pointer-events: none` so 3D clicks fall
 * through to the canvas; only the buttons inside opt back in via
 * `pointer-events: auto`.
 *
 * Module contract:
 *   mountHud({ parent, levelContent, picker, onAnswer? }) → { unmount }
 *
 * `onAnswer` is called when the player clicks the answer button (with
 * the question button enabled). main.js uses this hook to mount the
 * question-panel.
 */

import { getState, subscribe } from '../game/state.js';
import { mountNotesButton } from './notes-button.js';

export function mountHud({ parent, levelContent, picker, onAnswer }) {
  const levelId       = levelContent?.id;
  const interactives  = levelContent?.interactives ?? {};
  const totalClues    = Object.keys(interactives).length;
  const requiredClues = levelContent?.question?.requiredClues ?? [];

  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <style>
      .hud {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        z-index: 10;
        pointer-events: none;
        padding: 16px;
        display: flex; justify-content: space-between; align-items: flex-end;
        gap: 12px;
        font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
        color: #e6ecf6;
      }
      .hud__left {
        pointer-events: auto;
        background: rgba(17, 22, 42, 0.88);
        border: 1px solid #2a3553;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 12px;
        color: #b6c4e2;
        letter-spacing: 0.04em;
      }
      .hud__center {
        display: flex; gap: 10px;
      }
      .hud__right {
        display: flex; gap: 10px; align-items: center;
      }
      .hud__answer {
        pointer-events: auto;
        font: inherit;
        background: #2e5cff; color: #f4f7ff;
        border: 1px solid #4c75ff; border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
      }
      .hud__answer:hover:not(:disabled) { background: #3d6cff; }
      .hud__answer:disabled {
        background: #1a2240; color: #6c7da0;
        border-color: #2a3553;
        cursor: not-allowed;
      }
      .hud__answer-meta {
        font-size: 11px; color: #8294b8;
        margin-top: 4px;
      }
    </style>

    <div class="hud__left" data-counter>—</div>
    <div class="hud__center"></div>
    <div class="hud__right">
      <div data-notes-slot></div>
      <div>
        <button class="hud__answer" data-action="answer" disabled>Answer</button>
        <div class="hud__answer-meta" data-answer-meta></div>
      </div>
    </div>
  `;
  parent.appendChild(root);

  // Mount the notes button into its slot.
  const notesSlot = root.querySelector('[data-notes-slot]');
  const notesBtn  = mountNotesButton({ parent: notesSlot, picker });

  const counterEl    = root.querySelector('[data-counter]');
  const answerBtn    = root.querySelector('[data-action="answer"]');
  const answerMetaEl = root.querySelector('[data-answer-meta]');

  function refresh() {
    const state = getState();
    const found = state.cluesByLevel[levelId]?.size ?? 0;
    counterEl.textContent = `${found} / ${totalClues} clues`;

    const missing = requiredClues.filter(id => !state.cluesByLevel[levelId]?.has(id));
    const ready   = missing.length === 0;
    const answered = state.answeredLevels.has(levelId);

    answerBtn.disabled = !ready || answered;

    if (answered) {
      answerMetaEl.textContent = 'Answered ✓';
    } else if (ready) {
      answerMetaEl.textContent = 'You\'ve seen what you need.';
    } else {
      answerMetaEl.textContent = `${missing.length} key clue${missing.length === 1 ? '' : 's'} still missing.`;
    }
  }
  refresh();

  answerBtn.addEventListener('click', () => {
    if (answerBtn.disabled) return;
    if (typeof onAnswer === 'function') onAnswer();
  });

  const unsubscribe = subscribe((_state, action) => {
    if (!action) return;
    if (action.type === 'discoverClue' || action.type === 'answerQuestion'
     || action.type === 'resetProgress') {
      refresh();
    }
  });

  return {
    unmount() {
      unsubscribe();
      notesBtn.unmount();
      root.remove();
    },
  };
}
