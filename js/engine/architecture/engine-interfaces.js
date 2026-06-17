/**
 * Engine Interfaces
 * 
 * Defines the strict contracts for the analytical engine suite.
 * Since JS lacks true interfaces, these classes throw errors if unimplemented.
 */

/**
 * Interface for all Pitch Detectors (YIN, CREPE, McLeod).
 * Must operate entirely on Float32Arrays and return Fractional MIDI.
 */
export class IPitchDetector {
  /**
   * Processes a buffer and returns fractional MIDI or null.
   * @param {Float32Array} buffer - PCM audio data.
   * @param {number} sampleRate - e.g. 44100
   * @returns {{ midi: number, confidence: number } | null}
   */
  process(buffer, sampleRate) {
    throw new Error('Not implemented');
  }
}

/**
 * Engine for evaluating live cents deviation against a target track.
 */
export class IComparisonEngine {
  /**
   * Compares a live MIDI pitch against a ReferencePitchTrack at a specific time.
   * @param {number} liveMidi 
   * @param {import('./track-schema.js').BasePitchTrack} referenceTrack 
   * @param {number} timeSec 
   * @returns {{ centsDeviation: number, isHit: boolean }}
   */
  compareInstant(liveMidi, referenceTrack, timeSec) {
    throw new Error('Not implemented');
  }
}

/**
 * Engine for Dynamic Time Warping.
 * Aligns two PitchTracks of differing lengths/tempos.
 */
export class IDTWEngine {
  /**
   * Generates a warping path mapping indices of source to target.
   * @param {import('./track-schema.js').BasePitchTrack} sourceTrack 
   * @param {import('./track-schema.js').BasePitchTrack} targetTrack 
   * @returns {Array<{ sourceIdx: number, targetIdx: number }>}
   */
  align(sourceTrack, targetTrack) {
    throw new Error('Not implemented');
  }
}

/**
 * Real-time evaluation of accuracy (cents deviation, hit rate).
 */
export class IStatisticsEngine {
  /**
   * Ingests a continuous stream of comparison results to update SessionStats.
   * @param {{ centsDeviation: number, isHit: boolean }} comparisonResult 
   */
  feed(comparisonResult) {
    throw new Error('Not implemented');
  }

  /**
   * @returns {import('./session-schema.js').SessionStatistics}
   */
  getStats() {
    throw new Error('Not implemented');
  }
}

/**
 * Consumes aligned tracks and FeatureTracks to generate AIErrorAnnotations.
 */
export class IAIFeedbackEngine {
  /**
   * Evaluates a user track against a reference track.
   * @param {import('./track-schema.js').UserPitchTrack} userTrack 
   * @param {import('./track-schema.js').ReferencePitchTrack} refTrack 
   * @returns {import('./annotation-schema.js').AIErrorAnnotation[]}
   */
  analyze(userTrack, refTrack) {
    throw new Error('Not implemented');
  }
}
