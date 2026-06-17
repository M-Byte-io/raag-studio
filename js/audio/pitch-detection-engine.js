import { IPitchDetector } from '../engine/architecture/engine-interfaces.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_FREQ        = 60;      // Hz  — below this is floor hum
const MAX_FREQ        = 1200;    // Hz  — practical vocal upper limit
const YIN_THRESHOLD   = 0.15;    // aperiodicity threshold (lower = stricter)

/**
 * Pure DSP implementation of the YIN algorithm.
 * Implements IPitchDetector interface.
 * Optimized for Float32Array processing. Zero DOM/AudioContext dependencies.
 */
export class YinPitchDetector extends IPitchDetector {
  
  /**
   * Processes a buffer and returns fractional MIDI or null.
   * @param {Float32Array} buf - PCM audio data.
   * @param {number} sr - Sample rate (e.g., 44100).
   * @returns {{ midi: number, confidence: number } | null}
   */
  process(buf, sr) {
    const decimationFactor = 4;
    const decimatedSR = sr / decimationFactor;
    const decimatedBuffer = new Float32Array(Math.floor(buf.length / decimationFactor));
    for (let i = 0; i < decimatedBuffer.length; i++) {
      decimatedBuffer[i] = buf[i * decimationFactor];
    }

    const rawHz = this._yin(decimatedBuffer, decimatedSR);
    if (rawHz === null) return null;
    
    // We don't have the full confidence score from the simplified YIN easily,
    // but a low YIN_THRESHOLD implies high confidence. 
    // We'll return 1.0 for now, but a real implementation would use the actual dip depth.
    return {
      midi: this._hzToMidi(rawHz),
      confidence: 1.0 // Placeholder for proper confidence extraction
    };
  }

  // ── YIN algorithm ──────────────────────────────────────────────────────────
  
  _yin(buf, sr) {
    const n      = buf.length;
    const half   = Math.floor(n / 2);
    const lagMin = Math.floor(sr / MAX_FREQ);
    const lagMax = Math.min(Math.ceil(sr / MIN_FREQ), half - 1);

    // Step 1: difference function
    const diff = new Float32Array(half);
    for (let τ = lagMin; τ <= lagMax; τ++) {
      let s = 0;
      for (let j = 0; j < half; j++) {
        const d = buf[j] - buf[j + τ];
        s += d * d;
      }
      diff[τ] = s;
    }

    // Step 2: cumulative mean normalized (d')
    const cmndf   = new Float32Array(half);
    cmndf[0]      = 1;
    let runSum    = 0;
    for (let τ = 1; τ < half; τ++) {
      runSum   += diff[τ];
      cmndf[τ]  = runSum > 0 ? diff[τ] * τ / runSum : 1;
    }

    // Step 3: find first dip below threshold
    let τ_best = -1;
    for (let τ = lagMin; τ <= lagMax; τ++) {
      if (cmndf[τ] < YIN_THRESHOLD) {
        // find local minimum
        while (τ + 1 <= lagMax && cmndf[τ + 1] < cmndf[τ]) τ++;
        τ_best = τ;
        break;
      }
    }

    if (τ_best < 0) {
      // No clear dip — find global minimum as fallback, reject if too high
      let minVal = Infinity;
      for (let τ = lagMin; τ <= lagMax; τ++) {
        if (cmndf[τ] < minVal) { minVal = cmndf[τ]; τ_best = τ; }
      }
      if (minVal > 0.35) return null;  // still too uncertain
    }

    // Step 4: parabolic interpolation
    const prev = τ_best > 0     ? cmndf[τ_best - 1] : cmndf[τ_best];
    const cur  = cmndf[τ_best];
    const next = τ_best < half - 1 ? cmndf[τ_best + 1] : cmndf[τ_best];

    const denom    = prev - 2 * cur + next;
    const τAccurate = denom !== 0
      ? τ_best + (prev - next) / (2 * denom)
      : τ_best;

    return sr / τAccurate;
  }

  _hzToMidi(hz) { 
    return 12 * Math.log2(hz / 440) + 69; 
  }
}
