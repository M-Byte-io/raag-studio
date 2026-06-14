/**
 * PALETTE — Swara palette rendering and interaction.
 */

import { SWARAS, KEY_TO_SWARA } from '../data/swaras.js';

/** @type {Map<string, HTMLElement>} swara id → chip element */
const _chips = new Map();

/**
 * Render the swara palette. Should be called once at init.
 * @param {object} opts
 * @param {Function} opts.onAdd   — called with swaraId when a chip is clicked
 * @param {Function} opts.onPreview — called with swaraId for immediate audio preview
 */
export function renderSwaraPalette({ onAdd, onPreview }) {
  const container = document.getElementById('swaraPalette');
  if (!container) return;

  container.innerHTML = '';
  _chips.clear();

  // Build keyboard hint map (reversed KEY_TO_SWARA)
  const keyHints = new Map(Object.entries(KEY_TO_SWARA).map(([k, id]) => [id, k]));

  SWARAS.forEach(sw => {
    const el = document.createElement('div');
    el.className = `swara-chip ${sw.type}`;
    el.dataset.id = sw.id;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', sw.full);
    el.setAttribute('title', `${sw.full} — press "${keyHints.get(sw.id) ?? ''}" to add`);

    const hint = keyHints.get(sw.id) ?? '';
    el.innerHTML =
      `<span class="sn">${_esc(sw.label)}</span>` +
      `<span class="ss">${_esc(sw.full)}</span>` +
      (hint ? `<span class="kbd">${_esc(hint)}</span>` : '');

    el.addEventListener('click', () => {
      onAdd(sw.id);
      onPreview(sw.id);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAdd(sw.id); onPreview(sw.id); }
    });

    container.appendChild(el);
    _chips.set(sw.id, el);
  });
}

/**
 * Highlight the active note during playback.
 * @param {string|null} swaraId — null to clear all
 */
export function highlightPaletteNote(swaraId) {
  for (const [id, el] of _chips) {
    el.classList.toggle('active-note', id === swaraId);
  }
}

// ── Utility ───────────────────────────────────────────────────────────────
/** Safe text escaping (fixes C5 XSS) */
function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
