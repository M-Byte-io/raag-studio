/**
 * TABLA STROKE SYNTHESISER — v2, High-Fidelity Web Audio Model
 *
 * Acoustic model based on tabla membrane physics:
 *
 * DAYAN (right/treble):
 *   - Syahi patch creates inharmonic partials (characteristic "singing" tone)
 *   - Strike produces sharp transient + upward pitch glide (finger pressure)
 *   - Multiple oscillators at inharmonic ratios: 1, 1.51, 2.0, 2.74, 3.46
 *   - Bandpass resonator shapes the body
 *   - Long decay on open strokes (Na, Tin), short on muted (Ta, Te)
 *
 * BAYAN (left/bass):
 *   - Larger membrane, lower fundamental (~100–180 Hz)
 *   - Wrist-press pitch bend: quick downward sweep on Ge/Ka
 *   - On Dha/Dhin: heavy bass thud + open ring
 *   - Thump noise + sub-bass oscillator + mid-resonance
 *
 * External API (unchanged from v1):
 *   playBol(ctx, bolName, audioTime, { volume, muteBayan, muteDayan, humanize, isSam })
 *   setMasterVolume(ctx, v)
 */

// ── Bol catalogue ─────────────────────────────────────────────────────────
const BOL_MAP = {
  // Both drums
  'Dha':   { b: { g:1.00, d:1.0, t:'open' }, dy: { g:0.90, d:1.0, t:'na'  } },
  'Dhin':  { b: { g:0.90, d:1.0, t:'open' }, dy: { g:0.85, d:1.0, t:'tin' } },
  'Dhage': { b: { g:0.88, d:1.0, t:'open' }, dy: { g:0.80, d:1.0, t:'na'  } },
  'DhaTe': { b: { g:0.88, d:1.0, t:'open' }, dy: { g:0.75, d:1.0, t:'te'  } },
  'DhiN':  { b: { g:0.82, d:1.0, t:'open' }, dy: { g:0.80, d:1.0, t:'tin' } },
  'DhiT':  { b: { g:0.80, d:0.9, t:'open' }, dy: { g:0.75, d:1.0, t:'te'  } },

  // Dayan open (resonant ring)
  'Na':    { b: null,                         dy: { g:0.82, d:1.0, t:'na'  } },
  'Dhi':   { b: null,                         dy: { g:0.75, d:1.0, t:'na'  } },
  'Ti':    { b: null,                         dy: { g:0.65, d:1.0, t:'tin' } },
  'Tin':   { b: null,                         dy: { g:0.85, d:1.0, t:'tin' } },
  'Tun':   { b: null,                         dy: { g:0.72, d:0.9, t:'na'  } },
  'Din':   { b: null,                         dy: { g:0.70, d:1.0, t:'na'  } },

  // Dayan muted (deadened)
  'Ta':    { b: null,                         dy: { g:0.72, d:1.0, t:'ta'  } },
  'Te':    { b: null,                         dy: { g:0.62, d:1.0, t:'te'  } },

  // Bayan only
  'Ka':    { b: { g:0.65, d:1.0, t:'ka'  }, dy: null },
  'Ki':    { b: { g:0.55, d:1.0, t:'ki'  }, dy: null },
  'Ke':    { b: { g:0.72, d:1.0, t:'ka'  }, dy: null },
  'Ge':    { b: { g:0.82, d:1.0, t:'ge'  }, dy: null },
  'Gi':    { b: { g:0.70, d:1.0, t:'ge'  }, dy: null },

  // Rapid fills (two micro-hits in quick succession)
  'KiTa':      { b: null,                       dy: { g:0.62, d:1.0, t:'ta'  }, rapid: true },
  'TiTa':      { b: null,                       dy: { g:0.64, d:1.0, t:'te'  }, rapid: true },
  'TrKt':      { b: null,                       dy: { g:0.60, d:1.0, t:'ta'  }, rapid: true },
  'TunNa':     { b: null,                       dy: { g:0.70, d:1.0, t:'na'  }, rapid: true },
  'DhaTr':     { b: { g:0.88, d:1.0, t:'open'}, dy: { g:0.80, d:1.0, t:'ta' }, rapid: true },
  'DhaTrKt':   { b: { g:0.85, d:1.0, t:'open'}, dy: { g:0.75, d:1.0, t:'ta' }, rapid: true },
  'GaDi':      { b: { g:0.65, d:1.0, t:'ge'  }, dy: { g:0.55, d:1.0, t:'na' }, rapid: true },
  'GeNa':      { b: { g:0.70, d:1.0, t:'ge'  }, dy: { g:0.60, d:1.0, t:'na' }, rapid: true },
  'KaTa':      { b: { g:0.62, d:1.0, t:'ka'  }, dy: { g:0.60, d:1.0, t:'ta' }, rapid: true },
  'DhaTrKiTa': { b: { g:0.88, d:1.0, t:'open'}, dy: { g:0.78, d:1.0, t:'ta' }, rapid: true },
  'DhinNa':    { b: { g:0.82, d:1.0, t:'open'}, dy: { g:0.75, d:1.0, t:'na' }, rapid: true },
  'TiRaKiTa':  { b: null,                       dy: { g:0.60, d:1.0, t:'te' },  rapid: true },
  'KaTaRaKiTa':{ b: null,                       dy: { g:0.58, d:1.0, t:'ta' },  rapid: true },

  // Silence
  '—': null, '-': null, '': null,
};

// ── Constants ─────────────────────────────────────────────────────────────
// Dayan fundamental — tuned to C#5 area (~550 Hz), adjusted by pitch type
const DAYAN_F0 = 550;
// Bayan fundamental — tuned to D2 area (~140 Hz)
const BAYAN_F0 = 140;

// Inharmonic partial ratios for dayan (syahi effect)
// Ratios measured from real tabla recordings (Ravi Bellare et al.)
const DAYAN_PARTIALS = [
  { ratio: 1.000, gainMul: 1.00, decayMul: 1.00 },
  { ratio: 1.513, gainMul: 0.45, decayMul: 0.60 },
  { ratio: 1.983, gainMul: 0.25, decayMul: 0.45 },
  { ratio: 2.742, gainMul: 0.12, decayMul: 0.30 },
];

// ── Master gain ───────────────────────────────────────────────────────────
let _masterGain = null;
let _masterCtx  = null;

export function setMasterVolume(ctx, v) {
  _ensureMaster(ctx);
  _masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

function _ensureMaster(ctx) {
  if (_masterGain && _masterCtx === ctx) return;
  _masterGain = ctx.createGain();
  _masterGain.gain.value = 0.85;
  _masterGain.connect(ctx.destination);
  _masterCtx = ctx;
}

function _dest(ctx) {
  _ensureMaster(ctx);
  return _masterGain;
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
    // Unknown bol — gentle tap so rhythm isn't lost
    _dayan(ctx, audioTime, 'na', 0.35 * volume, false);
    return;
  }
  if (def === null) return; // rest

  const jitter = humanize > 0 ? (Math.random() * 2 - 1) * humanize : 0;
  const t      = Math.max(ctx.currentTime + 0.001, audioTime + jitter);
  const boost  = isSam ? 1.15 : 1.0;

  if (def.b && !muteBayan) {
    _bayan(ctx, t, def.b.t, def.b.g * volume * boost);
  }

  if (def.dy && !muteDayan) {
    const gap = 0.052; // ~52ms between rapid sub-hits
    if (def.rapid) {
      _dayan(ctx, t,       def.dy.t, def.dy.g * volume * boost * 0.88, def.dy.t === 'ta' || def.dy.t === 'te');
      _dayan(ctx, t + gap, def.dy.t, def.dy.g * volume * boost * 0.70, def.dy.t === 'ta' || def.dy.t === 'te');
    } else {
      _dayan(ctx, t, def.dy.t, def.dy.g * volume * boost, false);
    }
  }
}

// ── Dayan synthesiser ─────────────────────────────────────────────────────
// Types: 'na' (open resonant), 'tin' (high resonant), 'ta' (muted slap),
//        'te' (muted finger), 'na' default
function _dayan(ctx, t, type, gain, _ignoredMuted) {
  const dest = _dest(ctx);

  // Frequency and decay vary by stroke type
  let f0, decayTime, muted, pitchGlide;
  switch (type) {
    case 'tin': f0 = DAYAN_F0 * 1.06; decayTime = 0.90; muted = false; pitchGlide =  0.08; break;
    case 'ta':  f0 = DAYAN_F0 * 1.04; decayTime = 0.14; muted = true;  pitchGlide = -0.01; break;
    case 'te':  f0 = DAYAN_F0 * 1.02; decayTime = 0.10; muted = true;  pitchGlide = -0.01; break;
    default:    f0 = DAYAN_F0 * 1.00; decayTime = 0.65; muted = false; pitchGlide =  0.05; break;
  }

  const totalDur = decayTime + 0.08;

  // ── Master envelope for this stroke
  const masterEnv = ctx.createGain();
  masterEnv.gain.setValueAtTime(0, t);
  masterEnv.gain.linearRampToValueAtTime(gain, t + 0.004);
  if (muted) {
    masterEnv.gain.exponentialRampToValueAtTime(0.0001, t + decayTime);
  } else {
    masterEnv.gain.exponentialRampToValueAtTime(gain * 0.7,  t + 0.06);
    masterEnv.gain.exponentialRampToValueAtTime(gain * 0.25, t + decayTime * 0.5);
    masterEnv.gain.exponentialRampToValueAtTime(0.0001,      t + totalDur);
  }
  masterEnv.connect(dest);

  // ── Inharmonic partials (the syahi signature)
  DAYAN_PARTIALS.forEach(({ ratio, gainMul, decayMul }) => {
    const freq = f0 * ratio;

    const osc = ctx.createOscillator();
    osc.type = 'sine';

    // Pitch glide: brief upward bend on impact then settle (finger membrane physics)
    osc.frequency.setValueAtTime(freq * (1 + pitchGlide * 1.8), t);
    osc.frequency.exponentialRampToValueAtTime(freq * (1 + pitchGlide * 0.3), t + 0.018);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.065);

    const partialGain = ctx.createGain();
    partialGain.gain.value = gainMul;

    osc.connect(partialGain);
    partialGain.connect(masterEnv);
    osc.start(t);
    osc.stop(t + totalDur + 0.06);
  });

  // ── Percussive attack transient (finger slap noise burst)
  const slap = _noiseSource(ctx, 0.055);
  const slapFilt = ctx.createBiquadFilter();
  slapFilt.type = 'bandpass';
  slapFilt.frequency.value = f0 * 3.2;
  slapFilt.Q.value = 3.5;

  const slapEnv = ctx.createGain();
  slapEnv.gain.setValueAtTime(gain * 0.70, t);
  slapEnv.gain.exponentialRampToValueAtTime(0.0001, t + (muted ? 0.022 : 0.050));

  slap.connect(slapFilt);
  slapFilt.connect(slapEnv);
  slapEnv.connect(dest);
  slap.start(t);
  slap.stop(t + 0.056);

  // ── High-frequency skin click (very short)
  const click = _noiseSource(ctx, 0.012);
  const clickFilt = ctx.createBiquadFilter();
  clickFilt.type = 'highpass';
  clickFilt.frequency.value = 4500;

  const clickEnv = ctx.createGain();
  clickEnv.gain.setValueAtTime(gain * 0.35, t);
  clickEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

  click.connect(clickFilt);
  clickFilt.connect(clickEnv);
  clickEnv.connect(dest);
  click.start(t);
  click.stop(t + 0.013);

  // ── Resonant body (simulate drum shell + air column)
  if (!muted) {
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.value = f0 * 0.498; // sub-octave body resonance
    const bodyEnv = ctx.createGain();
    bodyEnv.gain.setValueAtTime(gain * 0.08, t + 0.010);
    bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t + totalDur * 0.6);
    body.connect(bodyEnv);
    bodyEnv.connect(dest);
    body.start(t + 0.008);
    body.stop(t + totalDur * 0.6);
  }
}

// ── Bayan synthesiser ─────────────────────────────────────────────────────
// Types: 'open' (Dha/Dhin), 'ge' (resonant palm), 'ka'/'ki' (muted thump)
function _bayan(ctx, t, type, gain) {
  const dest = _dest(ctx);

  let f0, decayTime, pitchStart, pitchEnd, pitchTime;
  switch (type) {
    case 'ge':   // Deep resonant open palm — long wah
      f0 = BAYAN_F0 * 0.85; decayTime = 1.1;
      pitchStart = f0 * 1.60; pitchEnd = f0 * 0.72; pitchTime = 0.15;
      break;
    case 'ka':   // Muted bass thump
    case 'ki':
      f0 = BAYAN_F0 * 1.05; decayTime = 0.22;
      pitchStart = f0 * 1.3;  pitchEnd = f0;         pitchTime = 0.04;
      break;
    default:     // 'open' — Dha/Dhin companion stroke
      f0 = BAYAN_F0;         decayTime = 0.80;
      pitchStart = f0 * 1.45; pitchEnd = f0 * 0.88; pitchTime = 0.08;
  }

  const muted  = (type === 'ka' || type === 'ki');
  const totalDur = decayTime + 0.10;

  // ── Sub-bass fundamental
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(pitchStart, t);
  sub.frequency.exponentialRampToValueAtTime(pitchEnd, t + pitchTime);

  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0, t);
  subEnv.gain.linearRampToValueAtTime(gain, t + 0.006);
  if (muted) {
    subEnv.gain.exponentialRampToValueAtTime(0.0001, t + decayTime);
  } else {
    subEnv.gain.exponentialRampToValueAtTime(gain * 0.65, t + 0.08);
    subEnv.gain.exponentialRampToValueAtTime(gain * 0.20, t + decayTime * 0.55);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, t + totalDur);
  }
  sub.connect(subEnv); subEnv.connect(dest);
  sub.start(t); sub.stop(t + totalDur + 0.06);

  // ── Second harmonic for warmth
  const harm2 = ctx.createOscillator();
  harm2.type = 'sine';
  harm2.frequency.setValueAtTime(pitchStart * 2.0, t);
  harm2.frequency.exponentialRampToValueAtTime(pitchEnd * 2.0, t + pitchTime);

  const h2Env = ctx.createGain();
  h2Env.gain.setValueAtTime(gain * 0.22, t + 0.003);
  h2Env.gain.exponentialRampToValueAtTime(0.0001, t + (muted ? decayTime * 0.5 : totalDur * 0.6));

  harm2.connect(h2Env); h2Env.connect(dest);
  harm2.start(t); harm2.stop(t + totalDur * 0.6 + 0.05);

  // ── Thump attack noise
  const thump = _noiseSource(ctx, 0.05);
  const thumpFilt = ctx.createBiquadFilter();
  thumpFilt.type = 'lowpass';
  thumpFilt.frequency.value = 600;
  thumpFilt.Q.value = 1.2;

  const thumpEnv = ctx.createGain();
  thumpEnv.gain.setValueAtTime(gain * 0.80, t);
  thumpEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

  thump.connect(thumpFilt); thumpFilt.connect(thumpEnv); thumpEnv.connect(dest);
  thump.start(t); thump.stop(t + 0.052);

  // ── Ge "wah" resonance: sweep resonant filter for palm-pressure effect
  if (type === 'ge') {
    const wahOsc = ctx.createOscillator();
    wahOsc.type = 'sine';
    wahOsc.frequency.setValueAtTime(f0 * 2.85, t);
    wahOsc.frequency.exponentialRampToValueAtTime(f0 * 1.60, t + 0.18);

    const wahEnv = ctx.createGain();
    wahEnv.gain.setValueAtTime(gain * 0.18, t + 0.01);
    wahEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    wahOsc.connect(wahEnv); wahEnv.connect(dest);
    wahOsc.start(t + 0.005); wahOsc.stop(t + 0.36);
  }
}

// ── Noise buffer cache ────────────────────────────────────────────────────
const _noiseCache = new WeakMap();

function _noiseSource(ctx, dur) {
  const frames = Math.ceil(ctx.sampleRate * dur);
  // Check cache keyed by frame count
  let ctxCache = _noiseCache.get(ctx);
  if (!ctxCache) { ctxCache = {}; _noiseCache.set(ctx, ctxCache); }
  if (!ctxCache[frames]) {
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    ctxCache[frames] = buf;
  }
  const src = ctx.createBufferSource();
  src.buffer = ctxCache[frames];
  return src;
}
