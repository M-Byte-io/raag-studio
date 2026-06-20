import { IAIFeedbackEngine } from './architecture/engine-interfaces.js';
import { AIErrorAnnotation } from './architecture/annotation-schema.js';
import { DTWEngine } from './dtw-engine.js';

/**
 * AIFeedbackEngine
 * 
 * Analyzes a UserPitchTrack against a ReferencePitchTrack.
 * Currently uses rule-based heuristics to generate annotations.
 * Designed to easily plug into WebLLM or a remote API in the future.
 */
export class AIFeedbackEngine extends IAIFeedbackEngine {
  constructor(scaleMappingEngine) {
    super();
    this.dtw = new DTWEngine();
    this.scaleMappingEngine = scaleMappingEngine; // Optional: To check Shruti stability
  }

  /**
   * Generates AIErrorAnnotations by evaluating the performance.
   * @param {import('./architecture/track-schema.js').UserPitchTrack} userTrack 
   * @param {import('./architecture/track-schema.js').ReferencePitchTrack} refTrack 
   * @param {import('./architecture/annotation-schema.js').BaseAnnotation[]} existingAnnotations 
   * @returns {import('./architecture/annotation-schema.js').AIErrorAnnotation[]}
   */
  analyze(userTrack, refTrack, existingAnnotations = []) {
    const annotations = [];
    
    // 1. Align the tracks via DTW
    const path = this.dtw.align(userTrack, refTrack);
    if (path.length === 0) return annotations;

    // 2. Shruti Stability & Intonation Analysis
    let sustainedErrorFrames = 0;
    let sumCentsError = 0;
    let errorStartIdx = -1;

    for (const node of path) {
      const uVal = userTrack.lod1.avg[node.sourceIdx];
      const rVal = refTrack.lod1.avg[node.targetIdx];

      if (uVal !== 0 && rVal !== 0) {
        // If scaleMappingEngine is provided, we can grade against the perfect Shruti instead of just the teacher
        let targetMidi = rVal;
        if (this.scaleMappingEngine) {
          const nearestMidi = Math.round(uVal);
          targetMidi = this.scaleMappingEngine.getAdjustedMidi(nearestMidi, 48);
        }

        const centsDev = (uVal - targetMidi) * 100;

        if (Math.abs(centsDev) > 30) { // Off by more than 30 cents from the pure Shruti
          if (sustainedErrorFrames === 0) errorStartIdx = node.sourceIdx;
          sustainedErrorFrames++;
          sumCentsError += centsDev;
        } else {
          // If we had a sustained error block of at least 1.5 seconds
          if (sustainedErrorFrames >= 15) {
            annotations.push(this._createIntonationAnnotation(errorStartIdx, node.sourceIdx, sumCentsError, sustainedErrorFrames));
          }
          sustainedErrorFrames = 0;
          sumCentsError = 0;
        }
      } else {
        sustainedErrorFrames = 0;
        sumCentsError = 0;
      }
    }

    // 3. Gamak Grading
    const gamaks = existingAnnotations.filter(a => a.type === 'GamakAnnotation');
    for (const gamak of gamaks) {
      // Check consistency of oscillation
      if (gamak.speedHz < 3.0) {
        const ann = new AIErrorAnnotation();
        ann.startSec = gamak.startSec;
        ann.endSec = gamak.endSec;
        ann.severity = 2;
        ann.aiCritique = `Gamak oscillation is too slow (${gamak.speedHz.toFixed(1)} Hz).`;
        ann.suggestedFix = `Practice Andalons on a single swara to build vocal agility up to 4-5 Hz.`;
        annotations.push(ann);
      }
    }

    // 4. Meend Quality Analysis
    // Look for slope drops/rises that are too abrupt compared to the reference track
    const uSlope = userTrack.features?.slope?.data;
    const rSlope = refTrack.features?.slope?.data;
    if (uSlope && rSlope) {
      for (let i = 0; i < uSlope.length; i += 10) { // check every 10 frames
        const uS = Math.abs(uSlope[i]);
        const rS = Math.abs(rSlope[i]);
        
        // If user slope is extremely steep but reference slope is gentle (smooth Meend)
        if (uS > 1.5 && rS > 0 && rS < 0.5) {
          const ann = new AIErrorAnnotation();
          ann.startSec = i / userTrack.sampleRate;
          ann.endSec = (i + 20) / userTrack.sampleRate;
          ann.severity = 3;
          ann.aiCritique = `Meend is too abrupt.`;
          ann.suggestedFix = `Glide smoothly between the swaras without jerking your voice. Maintain breath support.`;
          annotations.push(ann);
          break; // Avoid spamming
        }
      }
    }

    return annotations;
  }

  _createIntonationAnnotation(startIdx, endIdx, sumCents, frames) {
    const avgCents = sumCents / frames;
    const direction = avgCents > 0 ? "Sharp" : "Flat";
    
    const annotation = new AIErrorAnnotation();
    annotation.startSec = startIdx * 0.1; // LOD1 is 10fps
    annotation.endSec = endIdx * 0.1;
    annotation.severity = Math.abs(avgCents) > 50 ? 4 : 2;
    annotation.aiCritique = `Intonation is ${direction} by ~${Math.round(Math.abs(avgCents))} cents.`;
    annotation.suggestedFix = `Listen to the Tanpura. Your Shruti is destabilizing here.`;
    
    return annotation;
  }
}
