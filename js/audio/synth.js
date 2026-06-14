/**
 * SYNTH — Fallback synthesized instrument voices.
 * Used when real samples haven't loaded yet.
 *
 * Voices:
 *  • Sitar    — Karplus-Strong plucked string
 *  • Bansuri  — Sine + breath noise + vibrato
 *  • Sarangi  — Bowed PeriodicWave + vibrato LFO + rosin noise
 *  • Harmonium — Reed PeriodicWave + chorus detuning + body EQ
 */

import { getCtx } from './context.js';

// ── SITAR — Karplus-Strong plucked string ─────────────────────────────────
export function playSitar(freq, dur, t) {
  const ctx = getCtx(); if (!ctx) return;
  const sr  = ctx.sampleRate;
  const N   = Math.max(2, Math.round(sr / freq));
  const bufLen = Math.ceil(sr * Math.min(dur + 0.8, 4));
  const buf = ctx.createBuffer(1, bufLen, sr);
  const d   = buf.getChannelData(0);

  // Noise burst excitation
  for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;

  // Karplus-Strong averaging — damping tuned for sitar-like decay
  const damp = 0.4985 + 0.0008 * Math.log2(freq / 80);
  for (let i = N; i < bufLen; i++) {
    const prev = i - N;
    d[i] = damp * (d[prev] + d[Math.max(0, prev - 1)]);
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;

  // Gentle EQ: boost mid harmonics (sitar brightness)
  const eq = ctx.createBiquadFilter();
  eq.type = 'peaking'; eq.frequency.value = freq * 3; eq.gain.value = 4; eq.Q.value = 2;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(dur + 0.5, 3.5));

  src.connect(eq); eq.connect(g); g.connect(ctx.destination);
  src.start(t);
}

// ── BANSURI (FLUTE) — Sine + breath noise + vibrato ──────────────────────
export function playFlute(freq, dur, t) {
  const ctx = getCtx(); if (!ctx) return;
  const sr  = ctx.sampleRate;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;

  // Vibrato LFO
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 5.2;
  lfoG.gain.value = freq * 0.006;
  lfo.connect(lfoG); lfoG.connect(osc.frequency);

  // Breath noise
  const noise = ctx.createBuffer(1, sr, sr);
  const nd    = noise.getChannelData(0);
  for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;
  const nSrc  = ctx.createBufferSource();
  nSrc.buffer = noise; nSrc.loop = true;
  const nFilt = ctx.createBiquadFilter();
  nFilt.type = 'bandpass'; nFilt.frequency.value = freq * 1.5; nFilt.Q.value = 8;
  const nGain = ctx.createGain(); nGain.gain.value = 0.035;
  nSrc.connect(nFilt); nFilt.connect(nGain);

  // 2nd harmonic
  const osc2  = ctx.createOscillator();
  osc2.type = 'sine'; osc2.frequency.value = freq * 2;
  const osc2G = ctx.createGain(); osc2G.gain.value = 0.06;
  osc2.connect(osc2G);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.3, t + 0.04);
  g.gain.setValueAtTime(0.3, t + dur * 0.82);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.connect(g); nGain.connect(g); osc2G.connect(g);
  g.connect(ctx.destination);

  [osc, osc2, lfo].forEach(o => { o.start(t); o.stop(t + dur + 0.1); });
  nSrc.start(t); nSrc.stop(t + dur + 0.1);
}

// ── SARANGI — Bowed string with vibrato ───────────────────────────────────
export function playSarangi(freq, dur, t) {
  const ctx = getCtx(); if (!ctx) return;

  // Rich bowed-string harmonic series (1/k amplitude)
  const H    = 14;
  const real = new Float32Array(H + 1);
  const imag = new Float32Array(H + 1);
  for (let k = 1; k <= H; k++) {
    real[k] = (1 / k) * (k % 2 === 0 ? 0.65 : 1.0) * Math.exp(-0.08 * k);
  }
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(wave); osc.frequency.value = freq;

  // Bow vibrato LFO (starts after attack)
  const lfo  = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 5.8;
  lfoG.gain.setValueAtTime(0, t);
  lfoG.gain.linearRampToValueAtTime(freq * 0.009, t + dur * 0.35);
  lfo.connect(lfoG); lfoG.connect(osc.frequency);

  // Rosin/bow noise
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd    = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const nSrc  = ctx.createBufferSource();
  nSrc.buffer = noise; nSrc.loop = true;
  const nFilt = ctx.createBiquadFilter();
  nFilt.type = 'bandpass'; nFilt.frequency.value = freq * 4; nFilt.Q.value = 12;
  const nGain = ctx.createGain(); nGain.gain.value = 0.018;
  nSrc.connect(nFilt); nFilt.connect(nGain);

  const body = ctx.createBiquadFilter();
  body.type = 'peaking'; body.frequency.value = 400; body.gain.value = 5; body.Q.value = 1.2;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.28, t + 0.09);
  g.gain.setValueAtTime(0.28, t + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.connect(body); nGain.connect(body); body.connect(g);
  g.connect(ctx.destination);

  [osc, lfo].forEach(o => { o.start(t); o.stop(t + dur + 0.2); });
  nSrc.start(t); nSrc.stop(t + dur + 0.2);
}

// ── HARMONIUM — Reed synthesis with PeriodicWave ──────────────────────────
export function playHarmonium(freq, dur, t) {
  const ctx = getCtx(); if (!ctx) return;

  const H    = 10;
  const real = new Float32Array(H + 1);
  const imag = new Float32Array(H + 1);
  const hProfile = [0, 1.0, 0.75, 0.5, 0.35, 0.22, 0.15, 0.09, 0.06, 0.04, 0.02];
  for (let k = 1; k <= H; k++) real[k] = hProfile[k];
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(wave); osc.frequency.value = freq;

  // Detuned second oscillator (bellows chorusing)
  const osc2  = ctx.createOscillator();
  osc2.setPeriodicWave(wave); osc2.frequency.value = freq * 1.0008;
  const osc2G = ctx.createGain(); osc2G.gain.value = 0.25;
  osc2.connect(osc2G);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = Math.min(freq * 10, 6000); lp.Q.value = 0.6;

  const body = ctx.createBiquadFilter();
  body.type = 'peaking'; body.frequency.value = 300; body.gain.value = 4; body.Q.value = 0.8;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(0.38, t + 0.07);
  g.gain.setValueAtTime(0.36, t + dur * 0.88);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.connect(lp); osc2G.connect(lp);
  lp.connect(body); body.connect(g);
  g.connect(ctx.destination);

  [osc, osc2].forEach(o => { o.start(t); o.stop(t + dur + 0.1); });
}

/**
 * Play a synthesized note using the current instrument voice.
 * Called as fallback when real samples aren't loaded yet.
 *
 * @param {string} wave - instrument id
 * @param {number} freq - frequency in Hz
 * @param {number} dur  - note duration in seconds
 * @param {number} t    - AudioContext.currentTime to start at
 */
export function playSynth(wave, freq, dur, t) {
  switch (wave) {
    case 'sitar':     playSitar(freq, dur, t);     break;
    case 'flute':     playFlute(freq, dur, t);     break;
    case 'sarangi':   playSarangi(freq, dur, t);   break;
    case 'harmonium': playHarmonium(freq, dur, t); break;
    default:          playSitar(freq, dur, t);
  }
}
