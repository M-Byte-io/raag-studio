/**
 * PRESETS UI — Preset grid rendering.
 * Fixes C5 (XSS): all content inserted via textContent or safe DOM methods.
 */

import { PRESETS } from '../data/presets.js';

let _activeFilter = 'beginner';

/**
 * Render filter buttons.
 * @param {Function} onFilter — called with level string
 */
export function renderPresetsFilter(onFilter) {
  const container = document.getElementById('presetsFilter');
  if (!container) return;

  container.innerHTML = '';
  ['beginner', 'intermediate', 'advanced'].forEach(level => {
    const btn = document.createElement('button');
    btn.className   = 'filter-btn' + (level === _activeFilter ? ' active' : '');
    btn.textContent = level[0].toUpperCase() + level.slice(1);
    btn.dataset.level = level;
    btn.addEventListener('click', () => {
      _activeFilter = level;
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.level === level));
      _applyFilter();
      onFilter?.(level);
    });
    container.appendChild(btn);
  });
}

/**
 * Render the preset cards.
 * @param {Function} onLoad — called with preset object when card clicked
 */
export function renderPresets(onLoad) {
  const grid = document.getElementById('presetsGrid');
  if (!grid) return;

  grid.innerHTML = '';
  PRESETS.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'preset-card' + (p.level !== _activeFilter ? ' hidden' : '');
    card.dataset.idx   = idx;
    card.dataset.level = p.level;

    // Name
    const name = document.createElement('div');
    name.className   = 'preset-name';
    name.textContent = p.name;
    card.appendChild(name);

    // Notes preview
    const noteStr = document.createElement('div');
    noteStr.className   = 'preset-notes';
    noteStr.textContent = p.notes.map(n => (n.o === 1 ? '+' : n.o === -1 ? '-' : '') + n.id).join('–');
    card.appendChild(noteStr);

    // Tags
    const tagRow = document.createElement('div');
    tagRow.className = 'preset-tags';
    p.tags.forEach(t => {
      const tag = document.createElement('span');
      const tc  = t.toLowerCase();
      tag.className   = `tag ${tc === 'beginner' ? 'beginner' : tc === 'intermediate' ? 'intermediate' : tc === 'advanced' ? 'advanced' : ''}`;
      tag.textContent = t;
      tagRow.appendChild(tag);
    });
    card.appendChild(tagRow);

    card.addEventListener('click', () => {
      grid.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      onLoad?.(p);
    });

    grid.appendChild(card);
  });
}

function _applyFilter() {
  document.querySelectorAll('.preset-card').forEach(card => {
    card.classList.toggle('hidden', card.dataset.level !== _activeFilter);
  });
}
