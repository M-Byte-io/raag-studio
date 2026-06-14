/**
 * PATTERN — Pattern builder rendering and interaction.
 * Fixes C5 (XSS): never uses innerHTML with user-controlled strings.
 */

import { SWARAS, getSw } from '../data/swaras.js';
import { buildSequence } from '../engine/sequence.js';

// ── Pattern Track ─────────────────────────────────────────────────────────

/**
 * Re-render the pattern track.
 * @param {object[]} pattern — { id, o, dur }[]
 * @param {{ onRemove, onPreview }} callbacks
 */
export function renderPattern(pattern, { onRemove, onPreview }) {
  const track = document.getElementById('patternTrack');
  if (!track) return;

  track.classList.toggle('empty', pattern.length === 0);
  track.innerHTML = '';

  pattern.forEach((note, i) => {
    const sw = getSw(note.id);
    if (!sw) return;

    const durClass  = note.dur === 2 ? 'dur-half' : note.dur === 0.5 ? 'dur-eighth' : '';
    const durBadge  = note.dur === 2 ? '½' : note.dur === 0.5 ? '2×' : '';
    const octBadge  = note.o === -1 ? '₋' : note.o === 1 ? '⁺' : '';
    const durTitle  = note.dur === 2 ? ' (Half note)' : note.dur === 0.5 ? ' (Eighth note)' : '';

    const el = document.createElement('div');
    el.className = `pattern-note ${sw.type} ${durClass}`;
    el.title     = `${sw.full}${durTitle} — click to preview`;
    el.setAttribute('role', 'button');

    // Oct badge
    if (octBadge) {
      const ob = document.createElement('span');
      ob.className = 'oct-badge';
      ob.textContent = octBadge;
      el.appendChild(ob);
    }

    // Note label
    const lbl = document.createElement('span');
    lbl.textContent = sw.label;
    el.appendChild(lbl);

    // Duration badge
    if (durBadge) {
      const db = document.createElement('span');
      db.className = 'dur-badge';
      db.textContent = durBadge;
      el.appendChild(db);
    }

    // Delete button
    const del = document.createElement('span');
    del.className   = 'del-x';
    del.textContent = '✕';
    del.setAttribute('aria-label', `Remove ${sw.full}`);
    del.addEventListener('click', e => { e.stopPropagation(); onRemove(i); });
    el.appendChild(del);

    el.addEventListener('click', () => onPreview(note));

    track.appendChild(el);
  });
}

/**
 * Highlight the pattern note at playback index.
 * @param {number} patternIdx — index within state.pattern (not the full queue)
 */
export function highlightPatternNote(patternIdx) {
  document.querySelectorAll('.pattern-note').forEach((el, i) => {
    el.classList.toggle('playing-note', i === patternIdx);
  });
}

// ── Flow Notes ────────────────────────────────────────────────────────────

/**
 * Render the full-sequence preview strip.
 * @param {object[]} pattern
 * @param {string}   direction
 * @param {number}   repeats
 */
export function renderFlowNotes(pattern, direction, repeats) {
  const container = document.getElementById('flowNotes');
  if (!container) return;

  const seq = buildSequence(pattern, direction, repeats);
  container.innerHTML = '';

  seq.forEach((note, i) => {
    const sw = getSw(note.id);
    if (!sw) return;

    const el = document.createElement('span');
    el.className   = 'flow-note';
    el.textContent = (note.o === -1 ? '₋' : note.o === 1 ? '⁺' : '') + sw.label;
    container.appendChild(el);

    if (i < seq.length - 1) {
      const sep = document.createElement('span');
      sep.className   = 'flow-sep';
      sep.textContent = '·';
      container.appendChild(sep);
    }
  });
}

/**
 * Highlight flow note at playback queue index.
 * @param {number} queueIdx
 */
export function highlightFlowNote(queueIdx) {
  document.querySelectorAll('.flow-note').forEach((el, i) => {
    el.classList.toggle('active', i === queueIdx);
    el.classList.toggle('played', i < queueIdx);
  });
}
