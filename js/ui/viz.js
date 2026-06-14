/**
 * VIZ — Header audio visualizer.
 *
 * Fixes H6: animation pauses when the tab is hidden.
 * Fixes P4: DOM elements are cached at init time (not queried per frame).
 */

const VIZ_BARS = 16;

/** @type {HTMLElement[]} Cached bar elements */
let _bars = [];
let _target  = new Float32Array(VIZ_BARS).fill(2);
let _current = new Float32Array(VIZ_BARS).fill(2);
let _rafID   = null;
let _playing = false;

export function initViz() {
  const container = document.getElementById('vizBars');
  if (!container) return;

  container.innerHTML = '';
  _bars = [];
  for (let i = 0; i < VIZ_BARS; i++) {
    const b = document.createElement('div');
    b.className = 'viz-bar';
    container.appendChild(b);
    _bars.push(b);
  }

  // Pause animation when tab is hidden (H6 fix)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(_rafID);
    } else {
      _animate();
    }
  });

  _animate();
}

/** Call when playback starts to activate animated bars. */
export function setVizPlaying(playing) { _playing = playing; }

/** Trigger a spike on a random bar (called once per note). */
export function vizPulse() {
  const i = Math.floor(Math.random() * VIZ_BARS);
  _target[i] = 18 + Math.random() * 26;
}

// ── Private ───────────────────────────────────────────────────────────────

function _animate() {
  for (let i = 0; i < VIZ_BARS; i++) {
    _current[i] += (_target[i] - _current[i]) * 0.18;

    const el = _bars[i]; // O(1) cached access — no DOM query per frame (P4 fix)
    if (!el) continue;

    el.style.height     = `${_current[i]}px`;
    el.style.background = _playing
      ? `hsl(${265 + i * 7}, 75%, 65%)`
      : 'rgba(192,132,252,0.18)';

    _target[i] = Math.max(2, _target[i] * 0.83 + (_playing ? Math.random() * 2 : 0));
  }

  _rafID = requestAnimationFrame(_animate);
}

/** Gentle idle animation when not playing */
export function vizIdle() {
  for (let i = 0; i < VIZ_BARS; i++) {
    _target[i] = 2 + Math.random() * 3;
  }
}
