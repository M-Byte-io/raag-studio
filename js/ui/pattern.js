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
export function renderPattern(pattern, { onRemove, onPreview, onExtend }) {
  const track = document.getElementById('patternTrack');
  if (!track) return;

  track.classList.toggle('empty', pattern.length === 0);
  track.innerHTML = '';

  pattern.forEach((note, i) => {
    const sw = getSw(note.id);
    if (!sw) return;

    const dur = note.dur || 1;
    // Extended = any integer ≥ 2 (beats held); dur-half = exactly 2 with half-note icon
    const isExtended = dur > 1;
    const isEighth   = dur === 0.5;
    const durClass   = isEighth ? 'dur-eighth' : isExtended ? 'dur-extended' : '';
    const octBadge   = note.o === -1 ? '₋' : note.o === 1 ? '⁺' : '';

    const el = document.createElement('div');
    el.className = `pattern-note ${sw.type} ${durClass}`;
    el.title     = `${sw.full} · ${dur === 0.5 ? '½ beat' : dur + (dur === 1 ? ' beat' : ' beats')} — click to preview`;
    el.setAttribute('role', 'button');
    el.dataset.idx = i;
    // Scale chip width with duration (each extra beat = +18px)
    if (isExtended) el.style.minWidth = (38 + (Math.floor(dur) - 1) * 18) + 'px';

    // Oct badge
    if (octBadge) {
      const ob = document.createElement('span');
      ob.className = 'oct-badge';
      ob.textContent = octBadge;
      el.appendChild(ob);
    }

    // Note label
    const lbl = document.createElement('span');
    lbl.className = 'note-lbl';
    lbl.textContent = sw.label;
    el.appendChild(lbl);

    // Extended: render sustain dashes inside the chip
    if (isExtended) {
      const extra = Math.floor(dur) - 1; // number of extra beats
      const dashes = document.createElement('span');
      dashes.className = 'sustain-dashes';
      dashes.textContent = '—'.repeat(extra);
      el.appendChild(dashes);
    }

    // Duration badge (beats count shown bottom-right for extended notes)
    if (isEighth) {
      const db = document.createElement('span');
      db.className = 'dur-badge';
      db.textContent = '½';
      el.appendChild(db);
    } else if (isExtended) {
      const db = document.createElement('span');
      db.className = 'dur-badge';
      db.textContent = `${dur}b`;
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

    const dur = note.dur || 1;
    const el = document.createElement('span');
    el.className   = 'flow-note';
    el.textContent = (note.o === -1 ? '₋' : note.o === 1 ? '⁺' : '') + sw.label;
    container.appendChild(el);

    // Show sustain dashes in flow preview for extended notes
    if (dur > 1) {
      for (let d = 1; d < Math.floor(dur); d++) {
        const dash = document.createElement('span');
        dash.className = 'flow-note flow-sustain';
        dash.textContent = '—';
        dash.title = `Sustain beat ${d + 1}`;
        container.appendChild(dash);
      }
    }

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
