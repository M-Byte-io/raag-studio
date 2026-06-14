/**
 * TANPURA — Authentic jawari-style drone synthesis.
 *
 * Fixes C4 (memory leak): nodes are tracked per-cycle and properly
 * cleaned up. The node array is bounded and stale entries pruned.
 */

import { getCtx, noteFreq } from './context.js';

/** @type {ReturnType<typeof setTimeout>|null} */
let _cycleTimer = null;

/** Active oscillator nodes — bounded, cleaned up after each string decays. */
let _nodes = [];

export function startTanpura(basePitch, startOctave, tanpuraVol, tuning) {
  stopTanpura();
  const ctx = getCtx(); if (!ctx) return;

  const semits = tuning === 'sa-pa' ? [0, 7, 12, 0]
               : tuning === 'sa-ma' ? [0, 5, 12, 0]
               :                      [0, 11, 12, 0];

  const CYCLE = 2.2; // seconds per pluck cycle
  const baseOct = startOctave - 1;

  function pluckCycle() {
    const now = ctx.currentTime;

    semits.forEach((s, i) => {
      const oct  = (s === 0 && i === 3) ? startOctave : baseOct;
      const freq = noteFreq(basePitch + (s % 12), s === 12 ? startOctave : oct);
      const delay = i * (CYCLE / semits.length);
      const vol  = tanpuraVol * 0.25 * (i === 0 || i === 3 ? 1 : 0.75);
      _pluckString(ctx, freq, vol, delay, now, CYCLE);
    });

    _cycleTimer = setTimeout(pluckCycle, CYCLE * 1000);
  }

  pluckCycle();
}

export function stopTanpura() {
  if (_cycleTimer !== null) { clearTimeout(_cycleTimer); _cycleTimer = null; }

  // Clean up all active nodes (FIX C4: properly bounded cleanup)
  for (const { oscs, gain } of _nodes) {
    try {
      gain.gain.cancelScheduledValues(0);
      gain.gain.setValueAtTime(0, 0);
    } catch { /* already disconnected */ }
    for (const osc of oscs) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
  }
  _nodes = [];
}

// ── Private ───────────────────────────────────────────────────────────────

function _pluckString(ctx, freq, vol, delay, now, maxDur) {
  // Jawari-style: 16-partial harmonic series with odd-harmonic boost
  const H    = 16;
  const real = new Float32Array(H + 1);
  const imag = new Float32Array(H + 1);
  const amps = [0,1.0,0.42,0.62,0.18,0.38,0.10,0.28,0.08,0.20,0.06,0.15,0.05,0.12,0.04,0.09,0.03];
  for (let k = 1; k <= H; k++) real[k] = amps[k] * Math.exp(-0.04 * k);
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

  const osc1 = ctx.createOscillator(); osc1.setPeriodicWave(wave); osc1.frequency.value = freq;
  const osc2 = ctx.createOscillator(); osc2.setPeriodicWave(wave); osc2.frequency.value = freq * 1.001; // +1.8 cents jawari shimmer
  const osc3 = ctx.createOscillator(); osc3.type = 'sine';         osc3.frequency.value = freq * 0.5;  // sub-octave body

  // Tremolo (slow amplitude modulation)
  const tremLfo = ctx.createOscillator();
  const tremG   = ctx.createGain();
  tremLfo.frequency.value = 0.3 + Math.random() * 0.15;
  tremG.gain.value        = vol * 0.04;
  tremLfo.connect(tremG);

  const g3 = ctx.createGain(); g3.gain.value = 0.12;

  const g = ctx.createGain();
  const t = now + delay;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.06);
  g.gain.setValueAtTime(vol * 0.9, t + 0.8);
  g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);

  osc1.connect(g); osc2.connect(g);
  osc3.connect(g3); g3.connect(g);
  tremG.connect(g);
  g.connect(ctx.destination);

  const stopAt = t + 3.0;
  [osc1, osc2, osc3, tremLfo].forEach(o => { o.start(t); o.stop(stopAt); });

  const entry = { oscs: [osc1, osc2, osc3, tremLfo], gain: g };
  _nodes.push(entry);

  // Auto-prune this entry after it has fully decayed (FIX C4)
  setTimeout(() => {
    _nodes = _nodes.filter(n => n !== entry);
  }, (stopAt - ctx.currentTime + 0.5) * 1000);
}
