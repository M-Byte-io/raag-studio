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

// ── DAYAN (right / treble drum) ───────────────────────────────────────────
//
// The characteristic tabla sound.  Kept deliberately SIMPLE:
//   • 1 main sine oscillator (fundamental)
//   • 1 gentle harmonic at 1.51× (just enough inharmonicity for "singing")
//   • 1 very soft skin-thwack (low-mid bandpass noise, SHORT)
//   • NO high-frequency content
//
function _dayan(ctx, t, type, gain) {
  const dest = _dest(ctx);

  let f0, ringTime, muted;
  switch (type) {
    case 'tin': f0 = DAYAN_F0 * 1.05; ringTime = 1.00; muted = false; break;
    case 'ta':  f0 = DAYAN_F0 * 1.02; ringTime = 0.16; muted = true;  break;
    case 'te':  f0 = DAYAN_F0 * 0.99; ringTime = 0.12; muted = true;  break;
    default:    f0 = DAYAN_F0;         ringTime = 0.70; muted = false; break;
  }

  const totalDur = ringTime + 0.08;

  // ── Fundamental (sine, warm)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  // Slight upward pitch glide on strike then settle (membrane stretch)
  osc1.frequency.setValueAtTime(f0 * 1.04, t);
  osc1.frequency.exponentialRampToValueAtTime(f0, t + 0.028);

  // ── Inharmonic 2nd partial — light (gives "singing" quality without harshness)
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(f0 * 1.51 * 1.03, t);
  osc2.frequency.exponentialRampToValueAtTime(f0 * 1.51, t + 0.022);

  const g2 = ctx.createGain();
  g2.gain.value = 0.18;   // very subtle — blend, not compete

  // ── Amplitude envelope
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.006);    // soft attack (not a click)

  if (muted) {
    env.gain.exponentialRampToValueAtTime(0.0001, t + ringTime);
  } else {
    env.gain.setValueAtTime(gain, t + 0.010);
    env.gain.exponentialRampToValueAtTime(gain * 0.55, t + 0.08);
    env.gain.exponentialRampToValueAtTime(gain * 0.15, t + ringTime * 0.55);
    env.gain.exponentialRampToValueAtTime(0.0001,       t + totalDur);
  }

  osc1.connect(env);
  osc2.connect(g2); g2.connect(env);
  env.connect(dest);
  osc1.start(t); osc1.stop(t + totalDur + 0.05);
  osc2.start(t); osc2.stop(t + totalDur + 0.05);

  // ── Skin thwack — LOW-MID ONLY (1.2–2.8× f0), very short & soft
  const thwack = _noiseNode(ctx, 0.040);
  const thwFilt = ctx.createBiquadFilter();
  thwFilt.type = 'bandpass';
  thwFilt.frequency.value = f0 * 1.8;   // mid, not harsh
  thwFilt.Q.value = 2.2;

  const thwEnv = ctx.createGain();
  thwEnv.gain.setValueAtTime(gain * 0.28, t);            // subtle, not dominant
  thwEnv.gain.exponentialRampToValueAtTime(0.0001, t + (muted ? 0.018 : 0.038));

  thwack.connect(thwFilt); thwFilt.connect(thwEnv); thwEnv.connect(dest);
  thwack.start(t); thwack.stop(t + 0.042);
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
