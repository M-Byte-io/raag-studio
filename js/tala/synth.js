/**
 * TABLA STROKE SYNTHESISER — Web Audio API implementation.
 *
 * Architecture: Each bol maps to one or more primitive drum strokes.
 * Primitive strokes are synthesised using oscillators + noise bursts
 * tuned to the characteristic acoustic properties of the tabla.
 *
 * Upgrade path: Replace `_playBayan` / `_playDayan` with sample
 * lookups once real samples are available — all call sites remain unchanged.
 *
 * External API:
 *   playBol(ctx, bolName, audioTime, { volume, muteBayan, muteDayan, humanize })
 */

// ── Bol catalogue ─────────────────────────────────────────────────────────
//
// Each entry defines:
//   bayan:  { gain, decay, pitch } — null if stroke has no bayan component
//   dayan:  { gain, decay, pitch, muted } — null if no dayan component
//   rapid:  if true, two quick sub-beat hits are produced

const BOL_MAP = {
  // ── Both drums (open) ─────────────────────────────────────────────────
  'Dha':  { bayan:{ gain:1.0, decay:0.85, pitch:1.0  }, dayan:{ gain:0.85, decay:0.32, pitch:1.0  } },
  'Dhin': { bayan:{ gain:0.85,decay:1.10, pitch:0.95 }, dayan:{ gain:0.80, decay:0.48, pitch:0.98 } },
  'Dhage':{ bayan:{ gain:0.90,decay:0.95, pitch:0.98 }, dayan:{ gain:0.78, decay:0.38, pitch:0.99 } },
  'DhaTr':{ bayan:{ gain:0.90,decay:0.90, pitch:1.0  }, dayan:{ gain:0.80, decay:0.35, pitch:1.0  }, rapid:true },
  'DhaTe':{ bayan:{ gain:0.88,decay:0.88, pitch:0.99 }, dayan:{ gain:0.75, decay:0.33, pitch:1.0  } },
  'DhiT': { bayan:{ gain:0.80,decay:0.90, pitch:0.97 }, dayan:{ gain:0.75, decay:0.30, pitch:0.98 } },

  // ── Dayan only — open ─────────────────────────────────────────────────
  'Na':   { bayan:null,                                  dayan:{ gain:0.75, decay:0.28, pitch:1.0  } },
  'Dhi':  { bayan:null,                                  dayan:{ gain:0.75, decay:0.38, pitch:1.02 } },
  'Ti':   { bayan:null,                                  dayan:{ gain:0.65, decay:0.20, pitch:1.05 } },
  'Tin':  { bayan:null,                                  dayan:{ gain:0.80, decay:0.60, pitch:1.03 } },
  'Tun':  { bayan:null,                                  dayan:{ gain:0.70, decay:0.55, pitch:0.97 } },
  'TunNa':{ bayan:null,                                  dayan:{ gain:0.68, decay:0.50, pitch:0.98 }, rapid:true },
  'Din':  { bayan:null,                                  dayan:{ gain:0.72, decay:0.30, pitch:1.0  } },

  // ── Dayan only — muted ────────────────────────────────────────────────
  'Ta':   { bayan:null,                                  dayan:{ gain:0.70, decay:0.18, pitch:1.08, muted:true } },
  'Te':   { bayan:null,                                  dayan:{ gain:0.60, decay:0.15, pitch:1.06, muted:true } },

  // ── Bayan only ────────────────────────────────────────────────────────
  'Ka':   { bayan:{ gain:0.65, decay:0.28, pitch:1.0  }, dayan:null },
  'Ki':   { bayan:{ gain:0.55, decay:0.22, pitch:1.05 }, dayan:null },
  'Ke':   { bayan:{ gain:0.70, decay:0.35, pitch:0.98 }, dayan:null },
  'Ge':   { bayan:{ gain:0.80, decay:0.55, pitch:0.95 }, dayan:null },
  'Gi':   { bayan:{ gain:0.70, decay:0.42, pitch:0.97 }, dayan:null },

  // ── Rapid fills (two sub-beat hits) ──────────────────────────────────
  'KiTa':  { bayan:null,                                 dayan:{ gain:0.60, decay:0.16, pitch:1.04 }, rapid:true },
  'TiTa':  { bayan:null,                                 dayan:{ gain:0.62, decay:0.18, pitch:1.06 }, rapid:true },
  'TrKt':  { bayan:null,                                 dayan:{ gain:0.58, decay:0.15, pitch:1.04 }, rapid:true },
  'DhaTr': { bayan:{ gain:0.85, decay:0.80, pitch:1.0  }, dayan:{ gain:0.75, decay:0.30, pitch:1.0  }, rapid:true },
  'DhaTrKt':{ bayan:{ gain:0.85,decay:0.80, pitch:1.0  }, dayan:{ gain:0.75, decay:0.30, pitch:1.0  }, rapid:true },
  'GaDi':  { bayan:{ gain:0.65, decay:0.40, pitch:0.96 }, dayan:{ gain:0.55, decay:0.20, pitch:1.0  }, rapid:true },
  'GeNa':  { bayan:{ gain:0.70, decay:0.45, pitch:0.95 }, dayan:{ gain:0.58, decay:0.22, pitch:1.0  }, rapid:true },
  'KaTa':  { bayan:{ gain:0.60, decay:0.28, pitch:1.0  }, dayan:{ gain:0.60, decay:0.16, pitch:1.06, muted:true }, rapid:true },
  'DhiN':  { bayan:{ gain:0.80, decay:1.0,  pitch:0.96 }, dayan:{ gain:0.78, decay:0.45, pitch:0.99 } },
  'DhiT':  { bayan:{ gain:0.78, decay:0.88, pitch:0.97 }, dayan:{ gain:0.75, decay:0.28, pitch:0.99 } },

  // ── Compound bols (vilambit / Ektal specific) ─────────────────────────
  'DhaTrKiTa': { bayan:{ gain:0.88, decay:0.85, pitch:1.0 }, dayan:{ gain:0.80, decay:0.30, pitch:1.0 }, rapid:true },
  'DhinNa':    { bayan:{ gain:0.82, decay:0.95, pitch:0.96 }, dayan:{ gain:0.78, decay:0.40, pitch:0.99 }, rapid:true },
  'DhaTr':     { bayan:{ gain:0.88, decay:0.85, pitch:1.0  }, dayan:{ gain:0.80, decay:0.30, pitch:1.0  }, rapid:true },
  'KaTaRaKiTa':{ bayan:null,                                  dayan:{ gain:0.60, decay:0.15, pitch:1.04 }, rapid:true },
  'TiRaKiTa':  { bayan:null,                                  dayan:{ gain:0.58, decay:0.14, pitch:1.05 }, rapid:true },

  // ── Silence ───────────────────────────────────────────────────────────
  '—': null,
  '-': null,
  '': null,
};

// ── Physical tuning ───────────────────────────────────────────────────────
const BAYAN_BASE_FREQ  = 195;  // Hz — tunable bass drum (D below middle C area)
const DAYAN_BASE_FREQ  = 448;  // Hz — tunable treble drum (A4 area)

// ── Master gain node (created lazily) ─────────────────────────────────────
let _masterGain = null;
let _masterCtx  = null;

export function setMasterVolume(ctx, v) {
  if (!_masterGain || _masterCtx !== ctx) {
    _masterGain = ctx.createGain();
    _masterGain.connect(ctx.destination);
    _masterCtx = ctx;
  }
  _masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

function _dest(ctx) {
  if (_masterGain && _masterCtx === ctx) return _masterGain;
  return ctx.destination;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Schedule a tabla bol stroke at a precise AudioContext time.
 *
 * @param {AudioContext} ctx
 * @param {string} bolName     — one of the BOL_MAP keys
 * @param {number} audioTime   — AudioContext.currentTime target
 * @param {object} opts
 *   @param {number}  opts.volume    — 0..1 master volume multiplier
 *   @param {boolean} opts.muteBayan — silence bayan component
 *   @param {boolean} opts.muteDayan — silence dayan component
 *   @param {number}  opts.humanize  — max timing jitter in seconds (0..0.03)
 *   @param {number}  opts.swing     — swing offset multiplier for off-beats (0..0.15)
 *   @param {boolean} opts.isSam    — is this the sam beat? (slight accent)
 */
export function playBol(ctx, bolName, audioTime, {
  volume    = 0.8,
  muteBayan = false,
  muteDayan = false,
  humanize  = 0,
  isSam     = false,
} = {}) {
  const def = BOL_MAP[bolName];
  if (def === undefined) {
    // Unknown bol — fall back to a light dayan tap so rhythm isn't silenced
    _playDayan(ctx, audioTime, { gain: 0.4 * volume, decay: 0.2, pitch: 1.0 });
    return;
  }
  if (def === null) return; // explicit rest/silence

  // Apply humanization jitter
  const jitter = humanize > 0 ? (Math.random() * 2 - 1) * humanize : 0;
  const t = Math.max(ctx.currentTime, audioTime + jitter);

  // Sam accent: +10% gain
  const samBoost = isSam ? 1.12 : 1.0;

  if (def.bayan && !muteBayan) {
    _playBayan(ctx, t, {
      gain:  def.bayan.gain  * volume * samBoost,
      decay: def.bayan.decay,
      pitch: def.bayan.pitch,
    });
  }

  if (def.dayan && !muteDayan) {
    if (def.rapid) {
      // Two quick hits spanning the beat
      const gap = 0.055;
      _playDayan(ctx, t, {
        gain:  def.dayan.gain  * volume * samBoost * 0.85,
        decay: def.dayan.decay * 0.8,
        pitch: def.dayan.pitch,
        muted: def.dayan.muted,
      });
      _playDayan(ctx, t + gap, {
        gain:  def.dayan.gain  * volume * samBoost * 0.70,
        decay: def.dayan.decay * 0.8,
        pitch: def.dayan.pitch * 1.02,
        muted: def.dayan.muted,
      });
    } else {
      _playDayan(ctx, t, {
        gain:  def.dayan.gain  * volume * samBoost,
        decay: def.dayan.decay,
        pitch: def.dayan.pitch,
        muted: def.dayan.muted,
      });
    }
  }
}

// ── Primitive synthesisers ────────────────────────────────────────────────

/**
 * Bayan (left, bass drum) — tuned membrane with pitch fall on impact.
 */
function _playBayan(ctx, t, { gain = 0.7, decay = 0.85, pitch = 1.0 }) {
  const dest = _dest(ctx);
  const freq = BAYAN_BASE_FREQ * pitch;
  const dur  = decay + 0.12;

  // Primary membrane tone (sine, pitch-drops on strike)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq * 1.45, t);
  osc1.frequency.exponentialRampToValueAtTime(freq, t + 0.05);

  // 2nd harmonic for richness
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2.9, t);
  osc2.frequency.exponentialRampToValueAtTime(freq * 2.0, t + 0.04);
  const hGain = ctx.createGain();
  hGain.gain.value = 0.12;

  // Low-pass colour filter
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 900;
  filt.Q.value = 0.6;

  // Envelope
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.009);
  env.gain.exponentialRampToValueAtTime(gain * 0.75, t + 0.06);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc1.connect(env);
  osc2.connect(hGain); hGain.connect(env);
  env.connect(filt); filt.connect(dest);

  osc1.start(t); osc1.stop(t + dur + 0.05);
  osc2.start(t); osc2.stop(t + dur + 0.05);
}

/**
 * Dayan (right, treble drum) — high-pitched membrane + percussive slap noise.
 */
function _playDayan(ctx, t, { gain = 0.7, decay = 0.32, pitch = 1.0, muted = false }) {
  const dest = _dest(ctx);
  const freq = DAYAN_BASE_FREQ * pitch;
  const dur  = (muted ? 0.18 : decay) + 0.08;

  // Main tone: triangle (richer than sine for struck drum)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq * 1.12, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.018);

  // Tone envelope
  const tEnv = ctx.createGain();
  tEnv.gain.setValueAtTime(0, t);
  tEnv.gain.linearRampToValueAtTime(gain, t + 0.006);
  if (muted) {
    tEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  } else {
    tEnv.gain.setValueAtTime(gain, t + 0.012);
    tEnv.gain.exponentialRampToValueAtTime(gain * 0.4, t + 0.08);
    tEnv.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // Slap noise (short, broadband attack)
  const nBuf = _makeNoiseBuffer(ctx, 0.06);
  const nSrc = ctx.createBufferSource();
  nSrc.buffer = nBuf;

  const nFilt = ctx.createBiquadFilter();
  nFilt.type = 'bandpass';
  nFilt.frequency.value = freq * 2.8;
  nFilt.Q.value = 4;

  const nEnv = ctx.createGain();
  nEnv.gain.setValueAtTime(gain * 0.55, t);
  nEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.048);

  osc.connect(tEnv); tEnv.connect(dest);
  nSrc.connect(nFilt); nFilt.connect(nEnv); nEnv.connect(dest);

  osc.start(t); osc.stop(t + dur + 0.05);
  nSrc.start(t); nSrc.stop(t + 0.06);
}

/** Cached noise buffer — reused across strokes (P2 perf optimisation). */
const _noiseCache = new WeakMap();
function _makeNoiseBuffer(ctx, dur) {
  const key = Math.round(dur * 100);
  if (_noiseCache.has(ctx)) {
    const c = _noiseCache.get(ctx);
    if (c[key]) return c[key];
  }
  const frames = Math.ceil(ctx.sampleRate * dur);
  const buf    = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const cache = _noiseCache.get(ctx) || {};
  cache[key] = buf;
  _noiseCache.set(ctx, cache);
  return buf;
}
