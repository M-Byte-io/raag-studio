/**
 * TALA UI — All rendering for the Tala Companion panel.
 *
 * Responsibilities:
 *  • Tala selector dropdown
 *  • Avarta ring (SVG circular progress)
 *  • Bol notation strip with live beat highlighting
 *  • Sam (X) and Khali (0) indicators
 *  • Vibhag separator bars
 *  • Beat counter pill
 *  • Cycle counter
 *  • Riyaz mode panel rendering and progress
 */

import { TALAS, TALA_NAMES, getVibhagBoundaries } from '../tala/definitions.js';

// ── Cached DOM refs ───────────────────────────────────────────────────────
let _els = {};

export function initTalaUI() {
  _els = {
    talaSelect:    document.getElementById('talaSelect'),
    talaStartBtn:  document.getElementById('talaStartBtn'),
    talaStatus:    document.getElementById('talaStatus'),
    bolStrip:      document.getElementById('bolStrip'),
    avartaRing:    document.getElementById('avartaRing'),
    beatCountPill: document.getElementById('talaCurrentBeat'),
    cyclePill:     document.getElementById('talaCurrentCycle'),
    talaBPMDisplay:document.getElementById('talaBPMDisplay'),
    talaBPMSlider: document.getElementById('talaBPMSlider'),
    talaVol:       document.getElementById('talaVol'),
    muteBayanBtn:  document.getElementById('muteBayanBtn'),
    muteDayanBtn:  document.getElementById('muteDayanBtn'),
    humanizeSlider:document.getElementById('humanizeSlider'),
    riyazToggle:   document.getElementById('riyazToggle'),
    riyazPanel:    document.getElementById('riyazPanel'),
    riyazStart:    document.getElementById('riyazStartBPM'),
    riyazTarget:   document.getElementById('riyazTargetBPM'),
    riyazStep:     document.getElementById('riyazStepBPM'),
    riyazInterval: document.getElementById('riyazIntervalSec'),
    riyazProgress: document.getElementById('riyazProgress'),
    riyazBPMBadge: document.getElementById('riyazCurrentBPM'),
  };
}

// ── Tala Selector ─────────────────────────────────────────────────────────

export function renderTalaSelector(activeName, onChange) {
  const sel = _els.talaSelect;
  if (!sel) return;
  sel.innerHTML = '';
  TALA_NAMES.forEach(name => {
    const opt = document.createElement('option');
    opt.value       = name;
    const t         = TALAS[name];
    opt.textContent = `${t.name} (${t.beats}) — ${t.hindiName}`;
    if (name === activeName) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => onChange?.(sel.value));
}

// ── Bol Strip ─────────────────────────────────────────────────────────────

/**
 * Render the full bol notation strip for the current tala.
 * Sam = gold X, Khali = teal 0, Vibhag boundary = separator bar.
 * @param {string} talaName
 */
export function renderBolStrip(talaName) {
  const strip = _els.bolStrip;
  if (!strip) return;
  strip.innerHTML = '';

  const tala = TALAS[talaName];
  if (!tala) return;

  const vibhagBounds = getVibhagBoundaries(tala);

  tala.bols.forEach((bol, i) => {
    // Vibhag separator
    if (i > 0 && vibhagBounds.includes(i)) {
      const sep = document.createElement('div');
      sep.className = 'bol-sep';
      strip.appendChild(sep);
    }

    const cell = document.createElement('div');
    cell.className  = 'bol-cell';
    cell.dataset.idx = i;

    // Beat marker row (X / 0 / vibhag number)
    const marker = document.createElement('div');
    marker.className = 'bol-marker';
    if (i === tala.sam) {
      marker.textContent = 'X';
      marker.classList.add('sam');
    } else if (tala.khali.includes(i)) {
      marker.textContent = '0';
      marker.classList.add('khali');
    } else if (vibhagBounds.includes(i) && i !== 0) {
      // Taali number
      const vIdx = vibhagBounds.indexOf(i) + 1;
      marker.textContent = vIdx;
      marker.classList.add('taali');
    } else {
      marker.textContent = i + 1;
    }

    // Bol name
    const bolEl = document.createElement('div');
    bolEl.className   = 'bol-name';
    bolEl.textContent = bol || '—';

    cell.appendChild(marker);
    cell.appendChild(bolEl);
    strip.appendChild(cell);
  });
}

/**
 * Highlight the currently playing beat in the bol strip.
 * @param {number} beatIdx
 * @param {boolean} isSam
 * @param {boolean} isKhali
 */
export function highlightBolCell(beatIdx, isSam, isKhali) {
  if (!_els.bolStrip) return;
  _els.bolStrip.querySelectorAll('.bol-cell').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    el.classList.toggle('bol-active',  idx === beatIdx);
    el.classList.toggle('bol-played',  idx < beatIdx);
    el.classList.toggle('bol-sam-active',  idx === beatIdx && isSam);
    el.classList.toggle('bol-khali-active',idx === beatIdx && isKhali);
  });

  // Auto-scroll to keep active beat visible
  const activeEl = _els.bolStrip.querySelector('.bol-active');
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

/** Reset all highlights. */
export function resetBolStrip() {
  _els.bolStrip?.querySelectorAll('.bol-cell').forEach(el => {
    el.classList.remove('bol-active','bol-played','bol-sam-active','bol-khali-active');
  });
}

// ── Avarta Ring (SVG) ─────────────────────────────────────────────────────

const RING_R  = 46;   // radius
const RING_CX = 60;   // SVG centre
const RING_CY = 60;

/**
 * Build the SVG avarta ring for the current tala.
 * @param {string} talaName
 */
export function renderAvartaRing(talaName) {
  const svg = _els.avartaRing;
  if (!svg) return;
  svg.innerHTML = '';

  const tala  = TALAS[talaName];
  if (!tala) return;

  const beats = tala.beats;
  const TAU   = Math.PI * 2;

  // Background track
  const bgCircle = _svgEl('circle', {
    cx: RING_CX, cy: RING_CY, r: RING_R,
    fill: 'none', stroke: 'rgba(255,255,255,0.07)', 'stroke-width': 6,
  });
  svg.appendChild(bgCircle);

  // Beat tick marks
  for (let i = 0; i < beats; i++) {
    const angle = (i / beats) * TAU - Math.PI / 2;
    const inner = RING_R - 5;
    const outer = RING_R + 3;
    const x1 = RING_CX + inner * Math.cos(angle);
    const y1 = RING_CY + inner * Math.sin(angle);
    const x2 = RING_CX + outer * Math.cos(angle);
    const y2 = RING_CY + outer * Math.sin(angle);

    const isSam   = i === tala.sam;
    const isKhali = tala.khali.includes(i);

    const tick = _svgEl('line', {
      x1, y1, x2, y2,
      stroke: isSam ? '#f59e0b' : isKhali ? '#38bdf8' : 'rgba(255,255,255,0.25)',
      'stroke-width': isSam ? 3 : isKhali ? 2.5 : 1.5,
      'stroke-linecap': 'round',
      'data-beat': i,
    });
    svg.appendChild(tick);

    // Sam label
    if (isSam) {
      const lx = RING_CX + (RING_R + 14) * Math.cos(angle);
      const ly = RING_CY + (RING_R + 14) * Math.sin(angle);
      const lbl = _svgEl('text', {
        x: lx, y: ly, fill: '#f59e0b', 'font-size': 8,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
      });
      lbl.textContent = 'X';
      svg.appendChild(lbl);
    }
  }

  // Active arc element (updated per-beat)
  const arcPath = _svgEl('path', {
    id: 'talaArc',
    fill: 'none',
    stroke: 'url(#talaGrad)',
    'stroke-width': 5,
    'stroke-linecap': 'round',
  });
  svg.appendChild(arcPath);

  // Active beat dot
  const dot = _svgEl('circle', { id: 'talaDot', r: 5, fill: '#c084fc' });
  svg.appendChild(dot);

  // Gradient def
  const defs = _svgEl('defs');
  defs.innerHTML = `
    <linearGradient id="talaGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>`;
  svg.insertBefore(defs, svg.firstChild);

  // Centre text: beat count
  const centre = _svgEl('text', {
    id: 'talaCentreText',
    x: RING_CX, y: RING_CY - 5,
    fill: 'rgba(255,255,255,0.9)', 'font-size': 13, 'font-weight': 700,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
    'font-family': 'Outfit, sans-serif',
  });
  centre.textContent = '—';
  svg.appendChild(centre);

  const subText = _svgEl('text', {
    id: 'talaCentreSubText',
    x: RING_CX, y: RING_CY + 10,
    fill: 'rgba(255,255,255,0.45)', 'font-size': 8,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
    'font-family': 'Outfit, sans-serif',
  });
  subText.textContent = `/${beats}`;
  svg.appendChild(subText);
}

/**
 * Update the avarta ring to show the active beat.
 * @param {string} talaName
 * @param {number} beatIdx
 * @param {boolean} isSam
 */
export function updateAvartaRing(talaName, beatIdx, isSam) {
  const tala = TALAS[talaName];
  if (!tala) return;

  const beats = tala.beats;
  const TAU   = Math.PI * 2;
  const frac  = beatIdx / beats;

  // Active dot position
  const dotAngle = frac * TAU - Math.PI / 2;
  const dotX     = RING_CX + RING_R * Math.cos(dotAngle);
  const dotY     = RING_CY + RING_R * Math.sin(dotAngle);

  const dot = document.getElementById('talaDot');
  if (dot) {
    dot.setAttribute('cx', dotX);
    dot.setAttribute('cy', dotY);
    dot.setAttribute('fill', isSam ? '#f59e0b' : '#c084fc');
    dot.setAttribute('r', isSam ? 7 : 5);
  }

  // Arc from sam to current beat
  const arcPath = document.getElementById('talaArc');
  if (arcPath) {
    const samFrac = tala.sam / beats;
    arcPath.setAttribute('d', _describeArc(RING_CX, RING_CY, RING_R, samFrac * TAU - Math.PI/2, frac * TAU - Math.PI/2));
  }

  // Centre text
  const cText = document.getElementById('talaCentreText');
  if (cText) cText.textContent = beatIdx + 1;
}

// ── Beat / Cycle counters ─────────────────────────────────────────────────

export function updateTalaBeatCounter(beatIdx, totalBeats) {
  if (_els.beatCountPill) _els.beatCountPill.textContent = `${beatIdx + 1}/${totalBeats}`;
}

export function updateTalaCycleCounter(n) {
  if (_els.cyclePill) _els.cyclePill.textContent = `Cycle ${n}`;
}

// ── Start/Stop button ─────────────────────────────────────────────────────

export function updateTalaStartBtn(running) {
  const btn = _els.talaStartBtn;
  if (!btn) return;
  btn.textContent = running ? '⏹ Stop' : '▶ Start';
  btn.classList.toggle('running', running);
}

export function updateTalaStatus(text, cls = '') {
  const el = _els.talaStatus;
  if (!el) return;
  el.textContent = text;
  el.className   = `tala-status ${cls}`;
}

// ── BPM display ───────────────────────────────────────────────────────────

export function setTalaDisplay(bpm) {
  if (_els.talaBPMDisplay) _els.talaBPMDisplay.textContent = Math.round(bpm);
  if (_els.talaBPMSlider)  _els.talaBPMSlider.value        = bpm;
}

// ── Mute buttons ──────────────────────────────────────────────────────────

export function setMuteButtons(muteBayan, muteDayan) {
  _els.muteBayanBtn?.classList.toggle('muted', muteBayan);
  _els.muteDayanBtn?.classList.toggle('muted', muteDayan);
}

// ── Riyaz panel ───────────────────────────────────────────────────────────

export function toggleRiyazPanel(show) {
  _els.riyazPanel?.classList.toggle('visible', show);
}

export function updateRiyazProgress(currentBPM, startBPM, targetBPM) {
  const pct = ((currentBPM - startBPM) / Math.max(1, targetBPM - startBPM)) * 100;
  if (_els.riyazProgress) _els.riyazProgress.style.width = `${Math.min(100, pct)}%`;
  if (_els.riyazBPMBadge) _els.riyazBPMBadge.textContent = `${Math.round(currentBPM)} BPM`;
}

export function markRiyazComplete() {
  if (_els.riyazProgress) _els.riyazProgress.style.width = '100%';
  if (_els.riyazBPMBadge) _els.riyazBPMBadge.textContent = '✓ Complete!';
}

// ── SVG helpers ───────────────────────────────────────────────────────────

function _svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function _describeArc(cx, cy, r, startAngle, endAngle) {
  // Clamp arc length slightly to avoid degenerate path
  if (Math.abs(endAngle - startAngle) < 0.01) return '';
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = (endAngle - startAngle + Math.PI * 4) % (Math.PI * 2) > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}
