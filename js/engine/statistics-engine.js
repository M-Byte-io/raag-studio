import { IStatisticsEngine } from './architecture/engine-interfaces.js';

/**
 * StatisticsEngine
 * 
 * Ingests a continuous stream of live comparison results from the ComparisonEngine
 * and maintains the rolling `SessionStatistics`.
 */
export class StatisticsEngine extends IStatisticsEngine {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this._stats = {
      totalPracticeTimeSec: 0,
      overallAccuracy: 0
    };
    
    // Internal rolling counters
    this._totalFrames = 0;
    this._hitFrames = 0;
    this._lastTimeSec = 0;
  }

  /**
   * Updates the session statistics based on a single frame's comparison.
   * @param {{ centsDeviation: number, isHit: boolean, targetMidi: number }} comparisonResult 
   * @param {number} currentTimeSec
   */
  feed(comparisonResult, currentTimeSec) {
    if (this._lastTimeSec > 0 && currentTimeSec > this._lastTimeSec) {
      this._stats.totalPracticeTimeSec += (currentTimeSec - this._lastTimeSec);
    }
    this._lastTimeSec = currentTimeSec;

    // Only count frames where the target was actually singing something
    if (comparisonResult.targetMidi !== 0) {
      this._totalFrames++;
      if (comparisonResult.isHit) {
        this._hitFrames++;
      }
      
      this._stats.overallAccuracy = Math.round((this._hitFrames / this._totalFrames) * 100);
    }
  }

  /**
   * @returns {import('./architecture/session-schema.js').SessionStatistics}
   */
  getStats() {
    return { ...this._stats };
  }
}
