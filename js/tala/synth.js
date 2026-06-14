/**
 * TABLA STROKE SAMPLER — v4, Real Sample Playback
 *
 * Uses the 8 real recorded tabla WAV files:
 *   dha.wav, dhin.wav, ghe.wav, ka.wav, na.wav, ta.wav, te.wav, tin.wav
 *
 * Architecture:
 *   - Samples are fetched from /samples/tabla/ on first use
 *   - AudioBuffers are cached in memory for the session
 *   - Each bol maps to one or more samples with gain/playback-rate tuning
 *   - Falls back gracefully if a sample hasn't loaded yet
 *
 * External API (unchanged):
 *   playBol(ctx, bolName, audioTime, { volume, muteBayan, muteDayan, humanize, isSam })
 *   setMasterVolume(ctx, v)
 *   preloadSamples(ctx)   ← call once on app start
 */

// ── Base path for samples (computed to work at any subpath) ───────────────
// In the browser, import.meta.url gives us the JS file location.
// We derive /samples/tabla/ relative to the site root.
const _SAMPLE_BASE = (() => {
  try {
    // e.g. https://m-byte-io.github.io/raag-studio/js/tala/synth.js
    // → https://m-byte-io.github.io/raag-studio/samples/tabla/
    const url = new URL(import.meta.url);
    return url.href.replace(/\/js\/tala\/synth\.js.*$/, '/samples/tabla/');
  } catch {
    return '/samples/tabla/';
  }
})();

// ── Sample definitions ────────────────────────────────────────────────────
// All 8 real files we have
const SAMPLE_FILES = ['dha', 'dhin', 'ghe', 'ka', 'na', 'ta', 'te', 'tin'];

// ── Bol → sample mapping ──────────────────────────────────────────────────
// Each entry: array of { sample, gain, rate, delay }
//   sample  — key into _buffers
//   gain    — amplitude multiplier (0–1)
//   rate    — playback rate (pitch adjust: 1.0 = original)
//   delay   — seconds after stroke time to play this component
const BOL_MAP = {
  // ── Both drums ────────────────────────────────────────────────────────
  'Dha':        [{ s:'dha',  g:1.00, r:1.00, d:0 }],
  'Dhin':       [{ s:'dhin', g:1.00, r:1.00, d:0 }],
  'Dhage':      [{ s:'dha',  g:0.90, r:0.98, d:0 }],
  'DhaTe':      [{ s:'dha',  g:0.88, r:1.00, d:0 }, { s:'te', g:0.55, r:1.0, d:0.055 }],
  'DhiN':       [{ s:'dhin', g:0.92, r:1.00, d:0 }],
  'DhiT':       [{ s:'dhin', g:0.85, r:0.98, d:0 }, { s:'ta', g:0.45, r:1.0, d:0.055 }],

  // ── Dayan open ────────────────────────────────────────────────────────
  'Na':         [{ s:'na',   g:1.00, r:1.00, d:0 }],
  'Dhi':        [{ s:'na',   g:0.85, r:0.97, d:0 }],
  'Ti':         [{ s:'tin',  g:0.75, r:1.02, d:0 }],
  'Tin':        [{ s:'tin',  g:1.00, r:1.00, d:0 }],
  'Tun':        [{ s:'na',   g:0.80, r:0.95, d:0 }],
  'Din':        [{ s:'na',   g:0.78, r:0.98, d:0 }],

  // ── Dayan muted ───────────────────────────────────────────────────────
  'Ta':         [{ s:'ta',   g:1.00, r:1.00, d:0 }],
  'Te':         [{ s:'te',   g:1.00, r:1.00, d:0 }],

  // ── Bayan ─────────────────────────────────────────────────────────────
  'Ka':         [{ s:'ka',   g:1.00, r:1.00, d:0 }],
  'Ki':         [{ s:'ka',   g:0.75, r:1.04, d:0 }],
  'Ke':         [{ s:'ka',   g:0.88, r:0.98, d:0 }],
  'Ge':         [{ s:'ghe',  g:1.00, r:1.00, d:0 }],
  'Gi':         [{ s:'ghe',  g:0.82, r:0.97, d:0 }],

  // ── Rapid fills (two quick hits) ──────────────────────────────────────
  'KiTa':       [{ s:'ta',   g:0.70, r:1.00, d:0 }, { s:'ta',  g:0.55, r:1.02, d:0.050 }],
  'TiTa':       [{ s:'tin',  g:0.70, r:1.01, d:0 }, { s:'ta',  g:0.55, r:1.00, d:0.050 }],
  'TrKt':       [{ s:'ta',   g:0.65, r:1.00, d:0 }, { s:'te',  g:0.50, r:1.01, d:0.048 }],
  'TunNa':      [{ s:'na',   g:0.75, r:0.97, d:0 }, { s:'na',  g:0.60, r:1.00, d:0.050 }],
  'DhaTr':      [{ s:'dha',  g:0.90, r:1.00, d:0 }, { s:'ta',  g:0.60, r:1.00, d:0.052 }],
  'DhaTrKt':    [{ s:'dha',  g:0.88, r:1.00, d:0 }, { s:'ta',  g:0.55, r:1.00, d:0.050 }, { s:'te', g:0.42, r:1.01, d:0.100 }],
  'GaDi':       [{ s:'ghe',  g:0.80, r:1.00, d:0 }, { s:'na',  g:0.65, r:0.98, d:0.052 }],
  'GeNa':       [{ s:'ghe',  g:0.82, r:1.00, d:0 }, { s:'na',  g:0.68, r:1.00, d:0.052 }],
  'KaTa':       [{ s:'ka',   g:0.78, r:1.00, d:0 }, { s:'ta',  g:0.65, r:1.00, d:0.052 }],
  'DhaTrKiTa':  [{ s:'dha',  g:0.90, r:1.00, d:0 }, { s:'ta',  g:0.58, r:1.00, d:0.050 }, { s:'te', g:0.44, r:1.01, d:0.100 }],
  'DhinNa':     [{ s:'dhin', g:0.88, r:1.00, d:0 }, { s:'na',  g:0.65, r:1.00, d:0.052 }],
  'TiRaKiTa':   [{ s:'tin',  g:0.68, r:1.01, d:0 }, { s:'ta',  g:0.52, r:1.00, d:0.050 }],
  'KaTaRaKiTa': [{ s:'ka',   g:0.72, r:1.00, d:0 }, { s:'ta',  g:0.55, r:1.00, d:0.050 }, { s:'te', g:0.42, r:1.00, d:0.100 }],

  '—': null, '-': null, '': null,
};

// ── Buffer cache ──────────────────────────────────────────────────────────
const _buffers = {};         // key → AudioBuffer
const _loading = {};         // key → Promise
let   _masterGain = null;
let   _masterCtx  = null;

// ── Master chain ──────────────────────────────────────────────────────────
function _ensureMaster(ctx) {
  if (_masterGain && _masterCtx === ctx) return;
  _masterGain = ctx.createGain();
  _masterGain.gain.value = 0.88;
  _masterGain.connect(ctx.destination);
  _masterCtx = ctx;
}

export function setMasterVolume(ctx, v) {
  _ensureMaster(ctx);
  _masterGain.gain.setTargetAtTime(v * 0.9, ctx.currentTime, 0.02);
}

// ── Sample loader ─────────────────────────────────────────────────────────
async function _loadSample(ctx, key) {
  if (_buffers[key]) return _buffers[key];
  if (_loading[key]) return _loading[key];

  _loading[key] = fetch(`${_SAMPLE_BASE}${key}.wav`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${key}.wav`);
      return r.arrayBuffer();
    })
    .then(ab => ctx.decodeAudioData(ab))
    .then(buf => {
      _buffers[key] = buf;
      return buf;
    })
    .catch(err => {
      console.warn(`[tabla] Failed to load ${key}.wav:`, err);
      return null;
    });

  return _loading[key];
}

/**
 * Preload all samples in the background.
 * Call once after AudioContext is created (e.g. on first user interaction).
 */
export async function preloadSamples(ctx) {
  _ensureMaster(ctx);
  await Promise.all(SAMPLE_FILES.map(k => _loadSample(ctx, k)));
  console.log('[tabla] All samples loaded ✓');
}

// ── Public API ────────────────────────────────────────────────────────────
export function playBol(ctx, bolName, audioTime, {
  volume    = 0.8,
  muteBayan = false,
  muteDayan = false,
  humanize  = 0,
  isSam     = false,
} = {}) {
  const def = BOL_MAP[bolName];
  if (def === undefined) {
    // Unknown bol — play Na as fallback
    _playBuffer(ctx, 'na', audioTime, 0.35 * volume, 1.0);
    return;
  }
  if (!def) return; // rest/silence

  const jitter = humanize > 0 ? (Math.random() * 2 - 1) * humanize : 0;
  const t0     = Math.max(ctx.currentTime + 0.001, audioTime + jitter);
  const boost  = isSam ? 1.15 : 1.0;

  for (const layer of def) {
    // Respect muteBayan / muteDayan based on sample type
    const isBayan = (layer.s === 'ghe' || layer.s === 'ka');
    if (isBayan && muteBayan) continue;
    if (!isBayan && muteDayan) continue;

    _playBuffer(ctx, layer.s, t0 + layer.d, layer.g * volume * boost, layer.r);
  }
}

// ── Internal playback ─────────────────────────────────────────────────────
function _playBuffer(ctx, key, time, gain, rate) {
  _ensureMaster(ctx);

  const buf = _buffers[key];
  if (!buf) {
    // Buffer not yet loaded — trigger load for next time, skip this hit
    _loadSample(ctx, key);
    return;
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;

  const gainNode = ctx.createGain();
  gainNode.gain.value = Math.min(1.0, gain);

  src.connect(gainNode);
  gainNode.connect(_masterGain);

  src.start(time);
}
