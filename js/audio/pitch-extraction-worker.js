/**
 * PitchExtractionWorker
 * 
 * Operates entirely offline in a Web Worker to extract the foundational
 * Logarithmic PitchTrack and calculate derived FeatureTracks (slope, curvature)
 * over the entire audio buffer at high speed.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_FREQ        = 60;      // Hz  — below this is floor hum
const MAX_FREQ        = 1200;    // Hz  — practical vocal upper limit
const YIN_THRESHOLD   = 0.15;    // aperiodicity threshold (lower = stricter)

class YinPitchDetector {
  process(buf, sr) {
    const decimationFactor = 4;
    const decimatedSR = sr / decimationFactor;
    const decimatedBuffer = new Float32Array(Math.floor(buf.length / decimationFactor));
    for (let i = 0; i < decimatedBuffer.length; i++) {
      decimatedBuffer[i] = buf[i * decimationFactor];
    }

    const rawHz = this._yin(decimatedBuffer, decimatedSR);
    if (rawHz === null) return null;
    
    return {
      midi: this._hzToMidi(rawHz),
      confidence: 1.0
    };
  }

  _yin(buf, sr) {
    const n      = buf.length;
    const half   = Math.floor(n / 2);
    const lagMin = Math.floor(sr / MAX_FREQ);
    const lagMax = Math.min(Math.ceil(sr / MIN_FREQ), half - 1);

    const diff = new Float32Array(half);
    for (let τ = lagMin; τ <= lagMax; τ++) {
      let s = 0;
      for (let j = 0; j < half; j++) {
        const d = buf[j] - buf[j + τ];
        s += d * d;
      }
      diff[τ] = s;
    }

    const cmndf   = new Float32Array(half);
    cmndf[0]      = 1;
    let runSum    = 0;
    for (let τ = 1; τ < half; τ++) {
      runSum   += diff[τ];
      cmndf[τ]  = runSum > 0 ? diff[τ] * τ / runSum : 1;
    }

    let τ_best = -1;
    for (let τ = lagMin; τ <= lagMax; τ++) {
      if (cmndf[τ] < YIN_THRESHOLD) {
        while (τ + 1 <= lagMax && cmndf[τ + 1] < cmndf[τ]) τ++;
        τ_best = τ;
        break;
      }
    }

    if (τ_best < 0) {
      let minVal = Infinity;
      for (let τ = lagMin; τ <= lagMax; τ++) {
        if (cmndf[τ] < minVal) { minVal = cmndf[τ]; τ_best = τ; }
      }
      if (minVal > 0.35) return null;
    }

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

const detector = new YinPitchDetector();

self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  if (type === 'EXTRACT_REFERENCE') {
    const { buffer, sampleRate, id } = payload;
    
    try {
      const pitchTrack = extractFullTrack(buffer, sampleRate, id);
      self.postMessage({ type: 'EXTRACTION_COMPLETE', payload: pitchTrack });
    } catch (error) {
      self.postMessage({ type: 'EXTRACTION_ERROR', error: error.message });
    }
  }
};

/**
 * Runs the YIN algorithm over the entire buffer with a sliding window.
 * @param {Float32Array} pcmData 
 * @param {number} sampleRate 
 * @param {string} id 
 */
function extractFullTrack(pcmData, sampleRate, id) {
  const windowSize = 4096;
  const hopSize = Math.floor(sampleRate / 100); // 100 FPS
  
  const numFrames = Math.floor((pcmData.length - windowSize) / hopSize) + 1;
  
  const midiTrack = new Float32Array(numFrames);
  const confidenceTrack = new Float32Array(numFrames);
  const rmsTrack = new Float32Array(numFrames);
  
  const windowBuf = new Float32Array(windowSize);
  
  // 1. Raw Extraction
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    // Copy chunk
    windowBuf.set(pcmData.subarray(start, start + windowSize));
    
    // RMS
    let sum = 0;
    for (let j = 0; j < windowSize; j++) sum += windowBuf[j] * windowBuf[j];
    const rms = Math.sqrt(sum / windowSize);
    rmsTrack[i] = rms;
    
    // Pitch
    if (rms > 0.010) {
      const result = detector.process(windowBuf, sampleRate);
      if (result) {
        midiTrack[i] = result.midi;
        confidenceTrack[i] = result.confidence;
      } else {
        midiTrack[i] = 0;
        confidenceTrack[i] = 0;
      }
    } else {
      midiTrack[i] = 0;
      confidenceTrack[i] = 0;
    }
  }
  
  // 2. Compute Derivatives (Slope and Curvature Feature Tracks)
  const slopeTrack = computeDerivative(midiTrack);
  const curvatureTrack = computeDerivative(slopeTrack);
  
  // Calculate LODs (Level of Detail)
  const lod1 = decimate(midiTrack, 10);  // 10:1 reduction (10fps)
  const lod2 = decimate(midiTrack, 100); // 100:1 reduction (1fps)
  
  return {
    id,
    type: 'ReferencePitchTrack',
    sampleRate: 100,
    durationSec: pcmData.length / sampleRate,
    midiTrack,
    features: {
      confidence: { type: 'confidence', data: confidenceTrack, minValue: 0, maxValue: 1 },
      rms: { type: 'rms', data: rmsTrack, minValue: 0, maxValue: 1 },
      slope: { type: 'slope', data: slopeTrack, minValue: -50, maxValue: 50 },
      curvature: { type: 'curvature', data: curvatureTrack, minValue: -10, maxValue: 10 }
    },
    lod1,
    lod2
  };
}

/**
 * Computes the first derivative (slope).
 * @param {Float32Array} track 
 */
function computeDerivative(track) {
  const diff = new Float32Array(track.length);
  for (let i = 1; i < track.length - 1; i++) {
    // Central difference if neither is 0 (unpitched)
    if (track[i+1] !== 0 && track[i-1] !== 0 && track[i] !== 0) {
      diff[i] = (track[i+1] - track[i-1]) / 2;
    } else {
      diff[i] = 0;
    }
  }
  return diff;
}

/**
 * Computes Min/Max/Avg blocks.
 * @param {Float32Array} track 
 * @param {number} factor 
 */
function decimate(track, factor) {
  const len = Math.floor(track.length / factor);
  const min = new Float32Array(len);
  const max = new Float32Array(len);
  const avg = new Float32Array(len);
  
  for (let i = 0; i < len; i++) {
    const start = i * factor;
    let localMin = Infinity;
    let localMax = -Infinity;
    let sum = 0;
    let count = 0;
    
    for (let j = 0; j < factor; j++) {
      const val = track[start + j];
      if (val !== 0) {
        if (val < localMin) localMin = val;
        if (val > localMax) localMax = val;
        sum += val;
        count++;
      }
    }
    
    if (count > 0) {
      min[i] = localMin;
      max[i] = localMax;
      avg[i] = sum / count;
    } else {
      min[i] = max[i] = avg[i] = 0;
    }
  }
  
  return { min, max, avg };
}
