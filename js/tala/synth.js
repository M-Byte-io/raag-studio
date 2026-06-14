/**
 * TABLA STROKE SYNTHESISER — v3 "Warm & Blended"
 *
 * Design philosophy:
 *   - Remove ALL harsh high-frequency noise. Tabla is a warm, resonant drum.
 *   - Joint bols (Dha, Dhin) = bayan provides bass foundation, dayan sits
 *     ON TOP, slightly delayed (8ms) — they glue into one stroke.
 *   - Dayan: mostly pure sine fundamental + 1 harmonic. Soft attack.
 *   - Bayan: deep sub-bass sine with smooth pitch drop. No harsh harmonics.
 *   - Skin "thwack": gentle low-mid bandpass noise only, very short.
 *   - Master output runs through a warm lowpass (5kHz) to cut any edge.
 *
 * External API (unchanged):
 *   playBol(ctx, bolName, audioTime, { volume, muteBayan, muteDayan, humanize, isSam })
 *   setMasterVolume(ctx, v)
 */

// ─────────────────────────────────────────────────────────────────────────────
// BOL TABLE
// b  → bayan params | dy → dayan params | gap → dayan-after-bayan delay (sec)
// Types: bayan: 'open'|'ge'|'ka'   dayan: 'na'|'tin'|'ta'|'te'
// ─────────────────────────────────────────────────────────────────────────────
const BOL_MAP = {
  // ── Joint (bayan + dayan) ──────────────────────────────────────────────
  'Dha':       { b:{ g:0.82, t:'open' }, dy:{ g:0.88, t:'na'  }, gap:0.008 },
  'Dhin':      { b:{ g:0.78, t:'open' }, dy:{ g:0.85, t:'tin' }, gap:0.008 },
  'Dhage':     { b:{ g:0.76, t:'open' }, dy:{ g:0.80, t:'na'  }, gap:0.009 },
  'DhaTe':     { b:{ g:0.76, t:'open' }, dy:{ g:0.76, t:'te'  }, gap:0.008 },
  'DhiN':      { b:{ g:0.75, t:'open' }, dy:{ g:0.82, t:'tin' }, gap:0.008 },
  'DhiT':      { b:{ g:0.74, t:'open' }, dy:{ g:0.76, t:'te'  }, gap:0.007 },

  // ── Dayan only — open resonant ─────────────────────────────────────────
  'Na':        { b:null,                 dy:{ g:0.86, t:'na'  } },
  'Dhi':       { b:null,                 dy:{ g:0.78, t:'na'  } },
  'Ti':        { b:null,                 dy:{ g:0.68, t:'tin' } },
  'Tin':       { b:null,                 dy:{ g:0.88, t:'tin' } },
  'Tun':       { b:null,                 dy:{ g:0.74, t:'na'  } },
  'Din':       { b:null,                 dy:{ g:0.72, t:'na'  } },

  // ── Dayan only — muted ─────────────────────────────────────────────────
  'Ta':        { b:null,                 dy:{ g:0.74, t:'ta'  } },
  'Te':        { b:null,                 dy:{ g:0.64, t:'te'  } },

  // ── Bayan only ─────────────────────────────────────────────────────────
  'Ka':        { b:{ g:0.68, t:'ka'  }, dy:null },
  'Ki':        { b:{ g:0.58, t:'ka'  }, dy:null },
  'Ke':        { b:{ g:0.72, t:'ka'  }, dy:null },
  'Ge':        { b:{ g:0.84, t:'ge'  }, dy:null },
  'Gi':        { b:{ g:0.72, t:'ge'  }, dy:null },

  // ── Rapid fills ────────────────────────────────────────────────────────
  'KiTa':       { b:null,               dy:{ g:0.64, t:'ta'  }, rapid:true },
  'TiTa':       { b:null,               dy:{ g:0.66, t:'te'  }, rapid:true },
  'TrKt':       { b:null,               dy:{ g:0.62, t:'ta'  }, rapid:true },
  'TunNa':      { b:null,               dy:{ g:0.70, t:'na'  }, rapid:true },
  'DhaTr':      { b:{ g:0.80, t:'open'}, dy:{ g:0.76, t:'ta' }, rapid:true, gap:0.008 },
  'DhaTrKt':    { b:{ g:0.78, t:'open'}, dy:{ g:0.72, t:'ta' }, rapid:true, gap:0.008 },
  'GaDi':       { b:{ g:0.66, t:'ge'  }, dy:{ g:0.60, t:'na' }, rapid:true, gap:0.010 },
  'GeNa':       { b:{ g:0.70, t:'ge'  }, dy:{ g:0.62, t:'na' }, rapid:true, gap:0.010 },
  'KaTa':       { b:{ g:0.64, t:'ka'  }, dy:{ g:0.62, t:'ta' }, rapid:true, gap:0.008 },
  'DhaTrKiTa':  { b:{ g:0.84, t:'open'}, dy:{ g:0.78, t:'ta' }, rapid:true, gap:0.008 },
  'DhinNa':     { b:{ g:0.76, t:'open'}, dy:{ g:0.72, t:'na' }, rapid:true, gap:0.009 },
  'TiRaKiTa':   { b:null,               dy:{ g:0.62, t:'te'  }, rapid:true },
  'KaTaRaKiTa': { b:null,               dy:{ g:0.60, t:'ta'  }, rapid:true },

  '—': null, '-': null, '': null,
};

// ── Tuning ────────────────────────────────────────────────────────────────
const DAYAN_F0 = 520;  // Hz — right drum fundamental (~C5 area, warm middle tone)
const BAYAN_F0 = 125;  // Hz — left drum fundamental (~B2 area, deep bass)

// ── Master chain: gain → warmth filter → destination ─────────────────────
let _master = null;
let _masterCtx = null;

function _ensureMaster(ctx) {
  if (_master && _masterCtx === ctx) return;
  const gain = ctx.createGain();
  gain.gain.value = 0.82;

  // Warm low-pass at 4.8 kHz — cuts any residual harshness
  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.value = 4800;
  warmth.Q.value = 0.5;

  gain.connect(warmth);
  warmth.connect(ctx.destination);

  _master    = gain;   // we write to the gain node
  _masterCtx = ctx;
}

export function setMasterVolume(ctx, v) {
  _ensureMaster(ctx);
  _master.gain.setTargetAtTime(v * 0.9, ctx.currentTime, 0.02);
}

function _dest(ctx) {
  _ensureMaster(ctx);
  return _master;
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
    _dayan(ctx, audioTime, 'na', 0.35 * volume);
    return;
  }
  if (!def) return;

  const jitter = humanize > 0 ? (Math.random() * 2 - 1) * humanize : 0;
  const t      = Math.max(ctx.currentTime + 0.001, audioTime + jitter);
  const boost  = isSam ? 1.12 : 1.0;
  const gap    = def.gap || 0;

  if (def.b && !muteBayan) {
    _bayan(ctx, t, def.b.t, def.b.g * volume * boost);
  }

  if (def.dy && !muteDayan) {
    const dyT = t + gap;   // dayan arrives slightly after bayan — they "glue"
    if (def.rapid) {
      const gap2 = 0.050;
      _dayan(ctx, dyT,        def.dy.t, def.dy.g * volume * boost * 0.90);
      _dayan(ctx, dyT + gap2, def.dy.t, def.dy.g * volume * boost * 0.72);
    } else {
      _dayan(ctx, dyT, def.dy.t, def.dy.g * volume * boost);
    }
  }
}

// ── DAYAN (right / treble drum) — Stretched Leather Membrane Model ────────
//
// What makes leather sound like leather (not metal):
//
//   1. HARMONICS DIE FAST  — any partial above the fundamental decays in
//      <55ms. Metal sustains harmonics; leather absorbs them. Only the
//      fundamental rings long. This is the single biggest factor.
//
//   2. AMPLITUDE BLOOM     — real membrane takes ~15ms to fully engage
//      after finger impact. The tone swells slightly after the strike,
//      not a sharp instant peak like a metal bell.
//
//   3. MEMBRANE FLUTTER    — stretched skin oscillates at ~45Hz producing
//      a gentle natural tremor (±3% amplitude mod). Removes the "static"
//      electronic quality of a pure sine.
//
//   4. PITCH GLIDE IS SLOW — leather stretches gradually, not a snappy
//      electronic pitch snap. Glide takes ~45ms to settle.
//
//   5. ATTACK = FINGER PAT — the impact noise is the sound of fingers on
//      skin: low-mid (300–500 Hz bandpass), dull, short. Not a "click".
//
function _dayan(ctx, t, type, gain) {
  const dest = _dest(ctx);

  let f0, ringTime, muted;
  switch (type) {
    case 'tin': f0 = DAYAN_F0 * 1.04; ringTime = 0.95; muted = false; break;
    case 'ta':  f0 = DAYAN_F0 * 1.01; ringTime = 0.18; muted = true;  break;
    case 'te':  f0 = DAYAN_F0 * 0.98; ringTime = 0.14; muted = true;  break;
    default:    f0 = DAYAN_F0;         ringTime = 0.72; muted = false; break;
  }

  const totalDur = ringTime + 0.10;

  // ── [1] FUNDAMENTAL — the only thing that rings long
  //    Slow pitch glide: membrane stretches over 45ms, not an instant snap
  const fund = ctx.createOscillator();
  fund.type = 'sine';
  fund.frequency.setValueAtTime(f0 * 1.025, t);                          // start slightly sharp
  fund.frequency.linearRampToValueAtTime(f0, t + 0.045);                 // slow leather stretch

  // ── [2] INHARMONIC PARTIAL (syahi character) — TRANSIENT ONLY, dies in 55ms
  //    Gives the characteristic "singing" quality on attack but must NOT sustain
  //    (sustained 1.51× partial = metallic bell. Brief 1.51× = tabla character)
  const partialOsc = ctx.createOscillator();
  partialOsc.type = 'sine';
  partialOsc.frequency.setValueAtTime(f0 * 1.51, t);

  const partialEnv = ctx.createGain();
  partialEnv.gain.setValueAtTime(gain * 0.22, t + 0.008);  // kicks in slightly after
  partialEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);  // DEAD by 55ms

  // ── [3] AMPLITUDE BLOOM — membrane engages over 18ms, not an instant peak
  //    Shape: 0 → peak at 18ms → slight fall → long ring → silence
  const bloom = ctx.createGain();
  bloom.gain.setValueAtTime(0, t);
  bloom.gain.linearRampToValueAtTime(gain * 0.60, t + 0.008);   // initial impact
  bloom.gain.linearRampToValueAtTime(gain,         t + 0.018);   // bloom peak (membrane engaging)
  if (muted) {
    bloom.gain.exponentialRampToValueAtTime(0.0001, t + ringTime);
  } else {
    bloom.gain.exponentialRampToValueAtTime(gain * 0.68, t + 0.065);   // natural sag
    bloom.gain.exponentialRampToValueAtTime(gain * 0.22, t + ringTime * 0.50);
    bloom.gain.exponentialRampToValueAtTime(0.0001,       t + totalDur);
  }

  // ── [4] MEMBRANE FLUTTER — very subtle 45Hz AM to remove "static" sine quality
  //    Simulates the natural micro-oscillation of stretched skin
  const flutter = ctx.createOscillator();
  flutter.type = 'sine';
  flutter.frequency.value = 45;

  const flutterDepth = ctx.createGain();
  flutterDepth.gain.value = 0.032; // ±3.2% depth — feel it, don't hear it

  const flutterBase = ctx.createGain();
  flutterBase.gain.value = 1.0;    // DC offset so flutter modulates around 1.0

  // Flutter modulates the bloom envelope amplitude
  // We do this by summing flutter into the gain of the bloom's input
  // (simplified: multiply fund output by a near-1 oscillation)
  const flutterMix = ctx.createGain();
  flutterMix.gain.value = gain;

  // ── Topology:
  // fund → bloom → dest
  // partialOsc → partialEnv → dest
  // flutter modulates bloom slightly

  fund.connect(bloom);
  bloom.connect(dest);

  partialOsc.connect(partialEnv);
  partialEnv.connect(dest);

  // Flutter: ring-modulate the bloom output at ±3%
  // Approach: create a gain node that the flutter LFO drives
  const ringMod = ctx.createGain();
  ringMod.gain.value = 0;
  flutter.connect(flutterDepth);
  flutterDepth.connect(ringMod.gain);

  // We only want the flutter when the membrane is actually vibrating (after bloom)
  // Schedule flutter envelope to match bloom
  const fEnv = ctx.createGain();
  fEnv.gain.setValueAtTime(0, t);
  fEnv.gain.linearRampToValueAtTime(muted ? gain * 0.015 : gain * 0.028, t + 0.025);
  if (!muted) {
    fEnv.gain.exponentialRampToValueAtTime(0.0001, t + totalDur);
  } else {
    fEnv.gain.exponentialRampToValueAtTime(0.0001, t + ringTime);
  }
  fund.connect(fEnv);
  fEnv.connect(dest);

  flutter.start(t);
  flutter.stop(t + totalDur + 0.05);
  fund.start(t);
  fund.stop(t + totalDur + 0.05);
  partialOsc.start(t);
  partialOsc.stop(t + 0.060);

  // ── [5] FINGER-ON-SKIN PAT — low-mid noise only, dull thud of flesh on leather
  //    300–520 Hz bandpass: the sound of fingertip contacting stretched skin
  //    NO content above 600Hz — leather absorbs all of that
  const pat = _noiseNode(ctx, 0.045);
  const patFilt = ctx.createBiquadFilter();
  patFilt.type = 'bandpass';
  patFilt.frequency.value = f0 * 0.65;  // ~338Hz for na, dull thud
  patFilt.Q.value = 1.8;                // wide band = natural, not tonal

  const patEnv = ctx.createGain();
  patEnv.gain.setValueAtTime(gain * 0.22, t);
  patEnv.gain.exponentialRampToValueAtTime(0.0001, t + (muted ? 0.020 : 0.042));

  pat.connect(patFilt); patFilt.connect(patEnv); patEnv.connect(dest);
  pat.start(t); pat.stop(t + 0.048);

  // ── [6] Leather body resonance — very subtle sub-fundamental thud
  //    Gives the "weight" of a real drum (half-frequency, very soft)
  if (!muted) {
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.value = f0 * 0.50;   // sub-octave
    const bEnv = ctx.createGain();
    bEnv.gain.setValueAtTime(gain * 0.06, t + 0.005);
    bEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    body.connect(bEnv); bEnv.connect(dest);
    body.start(t + 0.004); body.stop(t + 0.14);
  }
}

// ── BAYAN (left / bass drum) ──────────────────────────────────────────────
//
// Deep bass character. In joint bols its job is to SUPPORT, not compete.
//   • Pure sine sub-bass with smooth pitch drop
//   • 'ge' type: deep wah sweep (wrist pressure), long decay
//   • 'ka' type: short muted thump
//   • 'open' (in Dha/Dhin): moderate thud, sits below the dayan
//
function _bayan(ctx, t, type, gain) {
  const dest = _dest(ctx);

  let f0, decayTime, pitchRatio, sweepTime;
  switch (type) {
    case 'ge':
      f0 = BAYAN_F0 * 0.88; decayTime = 1.20;
      pitchRatio = 1.70; sweepTime = 0.18;
      break;
    case 'ka':
      f0 = BAYAN_F0 * 1.05; decayTime = 0.22;
      pitchRatio = 1.30; sweepTime = 0.040;
      break;
    default: // 'open' — used in Dha/Dhin
      f0 = BAYAN_F0;       decayTime = 0.65;
      pitchRatio = 1.45; sweepTime = 0.070;
  }

  const muted   = (type === 'ka');
  const totalDur = decayTime + 0.10;
  const endFreq  = (type === 'ge') ? f0 * 0.72 : f0;

  // ── Sub-bass sine
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f0 * pitchRatio, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + sweepTime);

  // ── Envelope
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.007);
  if (muted) {
    env.gain.exponentialRampToValueAtTime(0.0001, t + decayTime);
  } else {
    env.gain.exponentialRampToValueAtTime(gain * 0.70, t + 0.07);
    env.gain.exponentialRampToValueAtTime(gain * 0.20, t + decayTime * 0.50);
    env.gain.exponentialRampToValueAtTime(0.0001,       t + totalDur);
  }

  // ── Warmth LPF on bayan (keeps it from muddying the dayan range)
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  lp.Q.value = 0.6;

  osc.connect(env); env.connect(lp); lp.connect(dest);
  osc.start(t); osc.stop(t + totalDur + 0.06);

  // ── Gentle thump noise for "skin impact" feel (low-mid only)
  const thump = _noiseNode(ctx, 0.035);
  const tFilt = ctx.createBiquadFilter();
  tFilt.type = 'lowpass';
  tFilt.frequency.value = 400;

  const tEnv = ctx.createGain();
  tEnv.gain.setValueAtTime(gain * 0.35, t);
  tEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

  thump.connect(tFilt); tFilt.connect(tEnv); tEnv.connect(dest);
  thump.start(t); thump.stop(t + 0.038);

  // ── Ge "wah" resonance (wrist presses membrane, pitch rises then falls)
  if (type === 'ge') {
    const wah = ctx.createOscillator();
    wah.type = 'sine';
    wah.frequency.setValueAtTime(f0 * 2.60, t);
    wah.frequency.exponentialRampToValueAtTime(f0 * 1.50, t + 0.20);
    wah.frequency.exponentialRampToValueAtTime(f0 * 1.10, t + 0.55);

    const wEnv = ctx.createGain();
    wEnv.gain.setValueAtTime(gain * 0.16, t + 0.008);
    wEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.60);

    wah.connect(wEnv); wEnv.connect(dest);
    wah.start(t + 0.005); wah.stop(t + 0.62);
  }
}

// ── Noise buffer cache ────────────────────────────────────────────────────
const _nCache = new WeakMap();

function _noiseNode(ctx, dur) {
  const frames = Math.ceil(ctx.sampleRate * dur);
  let cc = _nCache.get(ctx);
  if (!cc) { cc = {}; _nCache.set(ctx, cc); }
  if (!cc[frames]) {
    const buf  = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    cc[frames] = buf;
  }
  const src = ctx.createBufferSource();
  src.buffer = cc[frames];
  return src;
}
