import { IComparisonEngine } from './architecture/engine-interfaces.js';

/**
 * ComparisonEngine
 * 
 * Compares two fractional MIDI pitches or compares a live pitch to a 
 * historical ReferencePitchTrack at a specific timestamp.
 */
export class ComparisonEngine extends IComparisonEngine {
  constructor() {
    super();
    this.toleranceCents = 30; // +/- 30 cents is considered a "hit"
  }

  /**
   * Compares a live MIDI pitch against a ReferencePitchTrack at a specific time.
   * Interpolates the reference track since the exact time may fall between frames.
   * 
   * @param {number} liveMidi 
   * @param {import('./architecture/track-schema.js').BasePitchTrack} referenceTrack 
   * @param {number} timeSec 
   * @returns {{ centsDeviation: number, isHit: boolean, targetMidi: number }}
   */
  compareInstant(liveMidi, referenceTrack, timeSec) {
    if (!liveMidi || liveMidi === 0) {
      return { centsDeviation: 0, isHit: false, targetMidi: 0 };
    }

    // 1. Find the target MIDI by interpolating the reference track
    const targetMidi = this._interpolateTrackAtTime(referenceTrack, timeSec);
    
    if (targetMidi === 0) {
      // The reference is silent here
      return { centsDeviation: 0, isHit: false, targetMidi: 0 };
    }

    // 2. Calculate cents deviation
    // 1 semitone = 100 cents
    const centsDeviation = (liveMidi - targetMidi) * 100;
    const isHit = Math.abs(centsDeviation) <= this.toleranceCents;

    return { centsDeviation, isHit, targetMidi };
  }

  /**
   * Linear interpolation of a PitchTrack at a specific second.
   */
  _interpolateTrackAtTime(track, timeSec) {
    const sr = track.sampleRate;
    const exactFrame = timeSec * sr;
    
    const indexFloor = Math.floor(exactFrame);
    const indexCeil = Math.ceil(exactFrame);
    
    if (indexFloor < 0 || indexCeil >= track.midiTrack.length) return 0;
    
    const val1 = track.midiTrack[indexFloor];
    const val2 = track.midiTrack[indexCeil];
    
    if (val1 === 0 || val2 === 0) {
      return val1; // Don't interpolate across silence boundaries
    }
    
    const fraction = exactFrame - indexFloor;
    return val1 + (val2 - val1) * fraction;
  }
}
