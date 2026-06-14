/**
 * GENERATOR — Thaat-based alankar pattern generator UI.
 */

import { THAATS, THAAT_LABELS } from '../data/thaats.js';
import { getSw, swaraColor }    from '../data/swaras.js';

// ── Thaat Select ──────────────────────────────────────────────────────────

export function initThaatSelect(onChange) {
  const sel = document.getElementById('thaatSelect');
  if (!sel) return;

  sel.innerHTML = '';
  Object.keys(THAATS).forEach(name => {
    const opt = document.createElement('option');
    opt.value       = name;
    opt.textContent = THAAT_LABELS[name] ?? name;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => onChange?.(sel.value));
}

export function getThaatSelectValue() {
  return document.getElementById('thaatSelect')?.value ?? 'Bilawal';
}

// ── Thaat Notes Strip ─────────────────────────────────────────────────────

/**
 * Render the clickable thaat scale strip.
 * @param {string}   thaatName
 * @param {Function} onNoteClick — called with { id, thaatIdx }
 */
export function renderThaatStrip(thaatName, onNoteClick) {
  const strip = document.getElementById('thaatNotesStrip');
  if (!strip) return;

  strip.innerHTML = '';
  const notes = THAATS[thaatName] ?? [];

  notes.forEach((noteId, idx) => {
    const sw = getSw(noteId);
    if (!sw) return;
    const col = swaraColor(sw.type);

    const chip = document.createElement('div');
    chip.className = 'thaat-note-chip';
    chip.textContent = sw.label;
    chip.title       = sw.full;
    Object.assign(chip.style, { background: col.bg, color: col.fg, borderColor: col.bd });

    chip.addEventListener('click', () => onNoteClick?.({ id: noteId, thaatIdx: idx }));
    strip.appendChild(chip);
  });
}

// ── Generator Input Track ─────────────────────────────────────────────────

/**
 * Render the user's input note sequence.
 * @param {object[]} genInput — { id, thaatIdx }[]
 * @param {Function} onRemove — called with index
 */
export function renderGenInput(genInput, onRemove) {
  const track = document.getElementById('genInputTrack');
  if (!track) return;

  track.classList.toggle('empty', genInput.length === 0);
  track.innerHTML = '';

  genInput.forEach((item, i) => {
    const sw = getSw(item.id);
    if (!sw) return;
    const col = swaraColor(sw.type);

    const pill = document.createElement('div');
    pill.className = `gen-note-pill ${sw.type}`;
    Object.assign(pill.style, { background: col.bg, color: col.fg });

    const lbl = document.createElement('span');
    lbl.textContent = sw.label;
    pill.appendChild(lbl);

    const del = document.createElement('span');
    del.className   = 'del-g';
    del.textContent = '✕';
    del.addEventListener('click', e => { e.stopPropagation(); onRemove?.(i); });
    pill.appendChild(del);

    track.appendChild(pill);
  });
}

// ── Generated Results ─────────────────────────────────────────────────────

/**
 * Render the list of generated shift rows.
 * @param {object[][]} shifts
 * @param {{ onLoad, onPlay }} callbacks
 */
export function renderGenResults(shifts, { onLoad, onPlay }) {
  const container = document.getElementById('genResults');
  if (!container) return;

  container.innerHTML = '';
  if (!shifts.length) return;

  shifts.forEach((shift, idx) => {
    const row = document.createElement('div');
    row.className   = 'gen-row';
    row.dataset.idx = idx;

    // Row number
    const num = document.createElement('div');
    num.className   = 'gen-row-num';
    num.textContent = String(idx + 1);
    row.appendChild(num);

    // Note badges
    const notesEl = document.createElement('div');
    notesEl.className = 'gen-row-notes';
    shift.forEach((note, ni) => {
      const sw = getSw(note.id);
      if (!sw) return;
      const col = swaraColor(sw.type);
      const badge = document.createElement('span');
      badge.className = `gen-note-badge ${sw.type}`;
      Object.assign(badge.style, { background: col.bg, color: col.fg });
      badge.textContent = (note.o === 1 ? '⁺' : note.o === -1 ? '₋' : '') + sw.label;
      notesEl.appendChild(badge);
    });
    row.appendChild(notesEl);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'gen-row-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className   = 'gen-btn gen-btn-load';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => onLoad?.(idx));

    const playBtn = document.createElement('button');
    playBtn.className   = 'gen-btn gen-btn-play';
    playBtn.textContent = '▶';
    playBtn.addEventListener('click', () => onPlay?.(idx));

    actions.appendChild(loadBtn);
    actions.appendChild(playBtn);
    row.appendChild(actions);

    container.appendChild(row);
  });
}

/** Highlight active gen row and note badge during playback. */
export function highlightGenRow(shiftIdx, noteIdx) {
  document.querySelectorAll('.gen-row').forEach((el, i) => {
    el.classList.toggle('gen-row-active', i === shiftIdx);
    if (i === shiftIdx) {
      el.querySelectorAll('.gen-note-badge').forEach((b, j) => {
        b.classList.toggle('playing-badge', j === noteIdx);
      });
    } else {
      el.querySelectorAll('.gen-note-badge').forEach(b => b.classList.remove('playing-badge'));
    }
  });
}

// ── Gen Playback Strip ────────────────────────────────────────────────────

export function showGenPlaybackStrip(shift, shiftIdx) {
  const strip = document.getElementById('genPlaybackStrip');
  const lbl   = document.getElementById('genPlaybackLabel');
  if (!strip || !lbl) return;

  strip.innerHTML = '';
  strip.classList.remove('hidden');
  lbl.style.display = 'block';
  lbl.textContent   = `▶ Playing Shift ${shiftIdx + 1}`;

  shift.forEach(note => {
    const sw = getSw(note.id);
    if (!sw) return;
    const col  = swaraColor(sw.type);
    const span = document.createElement('span');
    span.className = 'gps-note';
    Object.assign(span.style, { color: col.fg, background: col.bg, border: `1px solid ${col.bd}` });
    span.textContent = (note.o === 1 ? '⁺' : note.o === -1 ? '₋' : '') + sw.label;
    strip.appendChild(span);
  });
}

export function highlightGenStripNote(noteIdx) {
  document.querySelectorAll('.gps-note').forEach((el, i) => {
    el.classList.toggle('active', i === noteIdx);
    el.classList.toggle('played', i < noteIdx);
  });
}

export function hideGenPlayback() {
  const strip = document.getElementById('genPlaybackStrip');
  const lbl   = document.getElementById('genPlaybackLabel');
  if (strip) strip.classList.add('hidden');
  if (lbl)   lbl.style.display = 'none';
  document.querySelectorAll('.gen-row').forEach(el => el.classList.remove('gen-row-active'));
  document.querySelectorAll('.gen-note-badge').forEach(el => el.classList.remove('playing-badge'));
}
