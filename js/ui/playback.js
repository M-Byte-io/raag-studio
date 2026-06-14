/**
 * PLAYBACK UI — Playback bar, beat dots, stat pills.
 * Fixes C5 (XSS): textContent used throughout.
 */

const PITCH_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── Cached DOM Refs ───────────────────────────────────────────────────────
let _playBtn, _buildPlayBtn, _loopBtn, _loopPill;
let _nowNote, _progressBar, _statPill, _cyclePill, _tempoPill, _pitchPill;
let _beatDotEls = [];

export function initPlaybackUI() {
  _playBtn      = document.getElementById('playBtn');
  _buildPlayBtn = document.getElementById('buildPlayBtn');
  _loopBtn      = document.getElementById('loopBtn');
  _loopPill     = document.getElementById('loopPill');
  _nowNote      = document.getElementById('nowNote');
  _progressBar  = document.getElementById('progressBar');
  _statPill     = document.getElementById('statPill');
  _cyclePill    = document.getElementById('cyclePill');
  _tempoPill    = document.getElementById('tempoPill');
  _pitchPill    = document.getElementById('pitchPill');
}

// ── Play Button ───────────────────────────────────────────────────────────

export function updatePlayBtn(playing) {
  if (_playBtn) {
    _playBtn.textContent = playing ? '⏹' : '▶';
    _playBtn.classList.toggle('playing', playing);
  }
  if (_buildPlayBtn) {
    _buildPlayBtn.textContent  = playing ? '⏹ Stop' : '▶ Play';
    _buildPlayBtn.className    = playing ? 'btn btn-danger' : 'btn btn-primary';
  }
}

// ── Loop ──────────────────────────────────────────────────────────────────

export function updateLoopUI(loopOn) {
  _loopBtn?.classList.toggle('active', loopOn);
  if (_loopPill) {
    _loopPill.textContent = loopOn ? '∞ Loop ON' : '∞ Loop OFF';
    _loopPill.classList.toggle('active', loopOn);
  }
}

// ── Now Playing ───────────────────────────────────────────────────────────

export function setNowNote(text) {
  if (_nowNote) _nowNote.textContent = text;
}

export function resetNowNote() {
  if (_nowNote) _nowNote.textContent = '—';
}

// ── Progress ──────────────────────────────────────────────────────────────

export function setProgress(pct) {
  if (_progressBar) _progressBar.style.width = `${Math.min(100, pct)}%`;
}

export function resetProgress() {
  if (_progressBar) _progressBar.style.width = '0%';
}

// ── Pills ─────────────────────────────────────────────────────────────────

export function setStatPill(text) {
  if (_statPill) _statPill.textContent = text;
}

export function setCyclePill(current, total) {
  if (_cyclePill) _cyclePill.textContent = `Note ${current}/${total}`;
}

export function resetCyclePill(repeats) {
  if (_cyclePill) _cyclePill.textContent = `Cycle 0/${repeats}`;
}

export function setTempoPill(bpm) {
  if (_tempoPill) _tempoPill.textContent = `${bpm} BPM`;
}

export function setPitchPill(pitchIdx) {
  if (_pitchPill) _pitchPill.textContent = `${PITCH_NAMES[pitchIdx] ?? 'C'} (Sa)`;
}

// ── Beat Dots ─────────────────────────────────────────────────────────────

export function initBeatDots(beatType) {
  const container = document.getElementById('beatDots');
  if (!container) return;
  container.innerHTML = '';
  _beatDotEls = [];
  for (let i = 0; i < beatType; i++) {
    const d = document.createElement('div');
    d.className = 'beat-dot';
    container.appendChild(d);
    _beatDotEls.push(d);
  }
}

export function updateBeatDots(activePhase) {
  _beatDotEls.forEach((el, i) => el.classList.toggle('on', i === activePhase));
}

export function resetBeatDots() {
  _beatDotEls.forEach(el => el.classList.remove('on'));
}

// ── Pitch Grid ────────────────────────────────────────────────────────────

export function renderPitchGrid(activePitch, onSelect) {
  const grid = document.getElementById('pitchGrid');
  if (!grid) return;

  grid.innerHTML = '';
  PITCH_NAMES.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className   = `pitch-btn${i === activePitch ? ' active' : ''}`;
    btn.dataset.pitch = i;
    btn.textContent = name;
    btn.addEventListener('click', () => onSelect(i));
    grid.appendChild(btn);
  });
}

export function setActivePitch(pitchIdx) {
  document.querySelectorAll('.pitch-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.pitch) === pitchIdx);
  });
}

// ── Saved Alankars ────────────────────────────────────────────────────────

/**
 * Render saved alankar list.
 * Fixes C5 (XSS): all name content via textContent.
 * @param {object[]} saved
 * @param {{ onLoad, onDelete }} callbacks
 */
export function renderSaved(saved, { onLoad, onDelete }) {
  const list = document.getElementById('savedList');
  if (!list) return;

  if (!saved.length) {
    list.innerHTML = '';
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:12px;color:var(--text3);text-align:center;padding:10px';
    empty.textContent = 'No saved alankars yet';
    list.appendChild(empty);
    return;
  }

  list.innerHTML = '';
  saved.forEach((a, i) => {
    const item = document.createElement('div');
    item.className = 'saved-item';

    const info = document.createElement('div');
    info.style.flex = '1';

    const nameEl = document.createElement('div');
    nameEl.className   = 'saved-name';
    nameEl.textContent = a.name; // safe — textContent not innerHTML

    const notesEl = document.createElement('div');
    notesEl.className   = 'saved-notes';
    notesEl.textContent = (a.pattern ?? []).map(n => n.id).join(' ');

    info.appendChild(nameEl);
    info.appendChild(notesEl);

    const playBtn = document.createElement('button');
    playBtn.className = 'icon-btn play';
    playBtn.title     = 'Load';
    playBtn.textContent = '▶';
    playBtn.addEventListener('click', e => { e.stopPropagation(); onLoad?.(i); });

    const delBtn = document.createElement('button');
    delBtn.className  = 'icon-btn';
    delBtn.title      = 'Delete';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', e => { e.stopPropagation(); onDelete?.(i); });

    item.appendChild(info);
    item.appendChild(playBtn);
    item.appendChild(delBtn);
    item.addEventListener('click', () => onLoad?.(i));

    list.appendChild(item);
  });
}
