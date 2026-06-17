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
  constructor() {
    super();
    this.dtw = new DTWEngine();
  }

  /**
   * Generates AIErrorAnnotations by evaluating the performance.
   * @param {import('./architecture/track-schema.js').UserPitchTrack} userTrack 
   * @param {import('./architecture/track-schema.js').ReferencePitchTrack} refTrack 
   * @returns {import('./architecture/annotation-schema.js').AIErrorAnnotation[]}
   */
  analyze(userTrack, refTrack) {
    const annotations = [];
    
    // 1. Align the tracks via DTW
    const path = this.dtw.align(userTrack, refTrack);
    if (path.length === 0) return annotations;

    // 2. Heuristic Analysis: Sustained Flat/Sharp Notes
    // Group adjacent DTW nodes and check cents deviation
    let sustainedErrorFrames = 0;
    let sumCentsError = 0;
    let errorStartIdx = -1;

    for (const node of path) {
      const uVal = userTrack.lod1.avg[node.sourceIdx];
      const rVal = refTrack.lod1.avg[node.targetIdx];

      if (uVal !== 0 && rVal !== 0) {
        const centsDev = (uVal - rVal) * 100;

        if (Math.abs(centsDev) > 40) { // Off by more than 40 cents
          if (sustainedErrorFrames === 0) errorStartIdx = node.sourceIdx;
          sustainedErrorFrames++;
          sumCentsError += centsDev;
        } else {
          // If we had a sustained error block of at least 1 second (10 frames at LOD1)
          if (sustainedErrorFrames >= 10) {
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

    // 3. (Future) Gamak/Meend analysis using slopeTrack and curvatureTrack

    return annotations;
  }

  _createIntonationAnnotation(startIdx, endIdx, sumCents, frames) {
    const avgCents = sumCents / frames;
    const direction = avgCents > 0 ? "Sharp" : "Flat";
    
    const annotation = new AIErrorAnnotation();
    annotation.startSec = startIdx * 0.1; // LOD1 is 10fps
    annotation.endSec = endIdx * 0.1;
    annotation.severity = Math.abs(avgCents) > 70 ? 4 : 2;
    annotation.aiCritique = `Consistently ${direction} by ~${Math.round(Math.abs(avgCents))} cents.`;
    annotation.suggestedFix = `Lower your jaw slightly and focus on grounding the Swara from the diaphragm.`;
    
    return annotation;
  }
}
