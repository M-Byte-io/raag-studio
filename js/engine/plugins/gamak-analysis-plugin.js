import { AnalysisPlugin } from '../architecture/plugin-architecture.js';
import { GamakAnnotation } from '../architecture/annotation-schema.js';

export class GamakAnalysisPlugin extends AnalysisPlugin {
  constructor() {
    super('gamak-analysis-plugin');
  }

  /**
   * Identifies regions of heavy oscillation (Gamak) using curvature.
   * @param {import('../architecture/session-schema.js').SessionProject} session 
   */
  analyze(session) {
    const userTrack = session.trackGroups.flatMap(g => g.tracks).find(t => t.type === 'UserPitchTrack');
    if (!userTrack || !userTrack.features || !userTrack.features.curvature) return;

    const curvature = userTrack.features.curvature.data;
    const midiTrack = userTrack.midiTrack;
    const sampleRate = userTrack.sampleRate; // usually 100 fps
    
    // Priority 6: Smoothing filter to prevent noise false positives
    const smoothedCurvature = new Float32Array(curvature.length);
    const windowSize = 5;
    for (let i = 2; i < curvature.length - 2; i++) {
      smoothedCurvature[i] = (curvature[i-2] + curvature[i-1] + curvature[i] + curvature[i+1] + curvature[i+2]) / 5;
    }

    let isOscillating = false;
    let oscStartFrame = 0;
    let zeroCrossings = 0;
    let lastSign = 0;
    
    // Track amplitude
    let localMaxMidi = -Infinity;
    let localMinMidi = Infinity;
    
    const newAnnotations = [];

    for (let i = 0; i < smoothedCurvature.length; i++) {
      const c = smoothedCurvature[i];
      const m = midiTrack[i];
      
      if (c === 0 || m === 0) {
        if (isOscillating) {
          this._finalizeGamak(newAnnotations, oscStartFrame, i, zeroCrossings, sampleRate, localMaxMidi, localMinMidi);
          isOscillating = false;
        }
        continue;
      }

      if (isOscillating) {
        if (m > localMaxMidi) localMaxMidi = m;
        if (m < localMinMidi) localMinMidi = m;
      }

      const sign = Math.sign(c);
      
      if (!isOscillating && Math.abs(c) > 0.2) { // Lowered threshold since we smoothed
        isOscillating = true;
        oscStartFrame = i;
        zeroCrossings = 0;
        lastSign = sign;
        localMaxMidi = m;
        localMinMidi = m;
      } else if (isOscillating) {
        if (sign !== lastSign) {
          zeroCrossings++;
          lastSign = sign;
        }
        
        // If we haven't crossed zero for 0.4 seconds, oscillation stopped
        if (i - oscStartFrame > sampleRate * 0.4 && zeroCrossings < 2) {
          isOscillating = false; 
        }
      }
    }

    if (isOscillating) {
      this._finalizeGamak(newAnnotations, oscStartFrame, smoothedCurvature.length, zeroCrossings, sampleRate, localMaxMidi, localMinMidi);
    }

    session.annotations = session.annotations.filter(a => a.type !== 'GamakAnnotation');
    session.annotations.push(...newAnnotations);
  }

  _finalizeGamak(annotations, startFrame, endFrame, zeroCrossings, sampleRate, maxMidi, minMidi) {
    const durationSec = (endFrame - startFrame) / sampleRate;
    
    // Calculate amplitude (vibrato depth) in cents
    const depthCents = (maxMidi - minMidi) * 100;
    
    // Priority 6: Amplitude threshold (reject noise micro-fluctuations under 20 cents)
    if (durationSec > 0.4 && zeroCrossings >= 3 && depthCents >= 20) {
      const hz = (zeroCrossings / 2) / durationSec; 
      
      const annotation = new GamakAnnotation();
      annotation.startSec = startFrame / sampleRate;
      annotation.endSec = endFrame / sampleRate;
      annotation.speedHz = hz;
      annotation.depthCents = depthCents;
      annotation.label = `Gamak (${hz.toFixed(1)} Hz, ${Math.round(depthCents)}¢)`;
      
      annotations.push(annotation);
    }
  }
}
