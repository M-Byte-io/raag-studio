import { YinPitchDetector } from './pitch-detection-engine.js';

/**
 * PitchExtractionWorker
 * 
 * Operates entirely offline in a Web Worker to extract the foundational
 * Logarithmic PitchTrack and calculate derived FeatureTracks (slope, curvature)
 * over the entire audio buffer at high speed.
 */

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
