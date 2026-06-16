/**
 * PITCH UI — Live pitch detection display
 *
 * Renders three components:
 *   1. Swara name + octave badge (large display)
 *   2. Tuner needle — cents deviation (-50 to +50)
 *   3. Pitch history canvas — scrolling trace of last ~6 seconds
 *
 * Usage:
 *   import { initPitchUI, updatePitchUI, clearPitchUI } from './pitch-ui.js';
 *   initPitchUI();               // call once after DOM ready
 *   updatePitchUI(result);       // call from PitchDetector.onResult
 *   clearPitchUI();              // call when mic is stopped
 */

import { swaraColor } from '../data/swaras.js';

// ── State ────────────────────────────────────────────────────────────────────

let _canvas   = null;
let _canvasCtx = null;
let _history  = [];            // { cents, swara, time }[]
const HISTORY_SEC  = 6;        // seconds of pitch history shown
const CANVAS_H     = 90;       // px height of pitch canvas
const NOTE_COLORS = {
  'pa-sa':  '#34d399',
  'komal':  '#f87171',
  'teevra': '#fbbf24',
  'shuddh': '#c084fc',
};

// ── Public API ────────────────────────────────────────────────────────────────

export function initPitchUI() {
  _canvas    = document.getElementById('pitchCanvas');
  if (!_canvas) return;
  _canvasCtx = _canvas.getContext('2d');
  _resizeCanvas();
  window.addEventListener('resize', _resizeCanvas);
  _drawIdleCanvas();
}

/**
 * Update all pitch UI components.
 * @param {object|null} result — from PitchDetector.onResult
 */
export function updatePitchUI(result) {
  _updateSwaraDisplay(result);
  _updateNeedle(result);
  _updateHistory(result);
}

export function clearPitchUI() {
  _updateSwaraDisplay(null);
  _updateNeedle(null);
  _history = [];
  _drawIdleCanvas();
}

// ── Swara display ─────────────────────────────────────────────────────────────

function _updateSwaraDisplay(result) {
  const el      = document.getElementById('pitchSwaraName');
  const subEl   = document.getElementById('pitchSwaraFull');
  const freqEl  = document.getElementById('pitchFreq');
  const octEl   = document.getElementById('pitchOctave');
  if (!el) return;

  if (!result || !result.swara) {
    el.textContent    = '—';
    el.style.color    = 'var(--text3)';
    if (subEl)  subEl.textContent  = 'Listening…';
    if (freqEl) freqEl.textContent = '';
    if (octEl)  octEl.textContent  = '';
    return;
  }

  const { swara, freq, cents } = result;
  const col = NOTE_COLORS[swara.type] || '#c084fc';

  el.textContent    = swara.label;
  el.style.color    = col;

  if (subEl) {
    const octNames = { '-1': 'Mandra', 0: 'Madhya', 1: 'Taar' };
    const octName  = octNames[swara.octOffset] || '';
    subEl.textContent = `${swara.full}${octName ? ' · ' + octName : ''}`;
  }
  if (freqEl) freqEl.textContent = `${freq} Hz`;
  if (octEl) {
    const sign  = cents >= 0 ? '+' : '';
    octEl.textContent = `${sign}${cents}¢`;
    octEl.style.color = Math.abs(cents) < 10 ? '#34d399'
                      : Math.abs(cents) < 25 ? '#fbbf24'
                      :                        '#f87171';
  }
}

// ── Tuner needle ──────────────────────────────────────────────────────────────

function _updateNeedle(result) {
  const needle  = document.getElementById('tunerNeedle');
  const track   = document.getElementById('tunerTrack');
  if (!needle || !track) return;

  if (!result || !result.swara) {
    needle.style.left       = '50%';
    needle.style.background = 'var(--text3)';
    track.dataset.active    = 'false';
    return;
  }

  const cents   = result.swara.centsFromSwara;  // -50..+50
  const pct     = ((cents + 50) / 100) * 100;  // 0..100%
  const inTune  = Math.abs(cents) < 10;
  const nearTune= Math.abs(cents) < 25;
  const color   = inTune ? '#34d399' : nearTune ? '#fbbf24' : '#f87171';

  needle.style.left        = `${pct}%`;
  needle.style.background  = color;
  needle.style.boxShadow   = `0 0 8px ${color}`;
  track.dataset.active     = 'true';
}

// ── Pitch history canvas ──────────────────────────────────────────────────────

function _updateHistory(result) {
  const now = performance.now() / 1000;  // seconds

  // Prune old history
  const cutoff = now - HISTORY_SEC;
  _history = _history.filter(h => h.time > cutoff);

  if (result?.swara) {
    _history.push({
      cents: result.swara.centsFromSwara,
      type:  result.swara.type,
      time:  now,
    });
  }

  _drawHistory(now);
}

function _drawHistory(now) {
  if (!_canvasCtx || !_canvas) return;
  const w = _canvas.width;
  const h = _canvas.height;
  const ctx = _canvasCtx;

  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = 'rgba(18,18,30,0.0)';
  ctx.fillRect(0, 0, w, h);

  // Centre line (in-tune reference)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // ±25¢ zone (acceptable range)
  ctx.fillStyle = 'rgba(52,211,153,0.05)';
  ctx.fillRect(0, h * 0.25, w, h * 0.5);

  if (_history.length < 2) return;

  // Draw pitch trace
  ctx.beginPath();
  let first = true;
  for (const point of _history) {
    const x = ((point.time - (now - HISTORY_SEC)) / HISTORY_SEC) * w;
    const y = ((50 - point.cents) / 100) * h;  // invert: +50¢ = top
    if (first) { ctx.moveTo(x, y); first = false; }
    else ctx.lineTo(x, y);
  }

  // Gradient stroke based on latest type
  const lastType = _history[_history.length - 1]?.type || 'shuddh';
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(192,132,252,0)');
  grad.addColorStop(0.4, 'rgba(192,132,252,0.4)');
  grad.addColorStop(1, NOTE_COLORS[lastType] || '#c084fc');
  ctx.strokeStyle = grad;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Latest point dot
  const last = _history[_history.length - 1];
  if (last) {
    const x   = ((last.time - (now - HISTORY_SEC)) / HISTORY_SEC) * w;
    const y   = ((50 - last.cents) / 100) * h;
    const col = NOTE_COLORS[last.type] || '#c084fc';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle   = col;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function _drawIdleCanvas() {
  if (!_canvasCtx || !_canvas) return;
  const w = _canvas.width, h = _canvas.height;
  const ctx = _canvasCtx;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle   = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, h * 0.25, w, h * 0.5);

  ctx.fillStyle    = 'rgba(255,255,255,0.2)';
  ctx.font         = '12px Outfit, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Enable mic to see pitch history', w / 2, h / 2);
}

function _resizeCanvas() {
  if (!_canvas) return;
  const rect = _canvas.getBoundingClientRect();
  _canvas.width  = rect.width  * (window.devicePixelRatio || 1);
  _canvas.height = CANVAS_H    * (window.devicePixelRatio || 1);
  _canvas.style.height = CANVAS_H + 'px';
  _canvasCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  _drawIdleCanvas();
}
