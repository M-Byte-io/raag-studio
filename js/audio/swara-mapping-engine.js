import { SWARAS } from '../data/swaras.js';

/**
 * SWARA MAPPING ENGINE
 *
 * Maps a MIDI note to the corresponding Hindustani Swara based on the selected basePitch (Sa).
 */
export class SwaraMappingEngine {
  /**
   * Translates a MIDI pitch (float) to its Swara equivalent relative to Sa.
   * 
   * @param {number} midiFloat 
   * @param {number} basePitchOffset - Semitones from C (0 = C, 1 = C#, ..., 11 = B)
   * @returns {{ id: string, label: string, full: string, type: string, octOffset: number, centsFromSwara: number, tuneStatus: string }}
   */
  static getSwaraFromMidi(midiFloat, basePitchOffset) {
    // C4 = midi 60. Sa is at basePitch above C in octave 4.
    const saMidi = 60 + basePitchOffset;
    
    // How many semitones above Sa is this pitch?
    const semiAboveSa = midiFloat - saMidi;
    const semiRound   = Math.round(semiAboveSa);
    
    // Normalize to 0–11 + octave offset
    const octOffset   = Math.floor(semiRound / 12);
    const degree      = ((semiRound % 12) + 12) % 12;
    
    const sw          = SWARAS.find(s => s.semit === degree) || SWARAS[0];
    const centsFromSw = Math.round((semiAboveSa - semiRound) * 100);

    let tuneStatus = 'missed';
    if (Math.abs(centsFromSw) <= 15) tuneStatus = 'perfect';
    else if (Math.abs(centsFromSw) <= 30) tuneStatus = 'good';
    else if (centsFromSw > 0) tuneStatus = 'sharp';
    else tuneStatus = 'flat';

    return {
      id: sw.id,
      label: sw.label,
      full: sw.full,
      type: sw.type,
      octOffset,
      centsFromSwara: centsFromSw,
      tuneStatus
    };
  }

  /**
   * Helper to get total semitones above C0 for a given swara degree and octave offset,
   * accounting for the base pitch. Useful for positioning target bars on the canvas grid.
   * 
   * @param {number} swaraSemitoneDegree - (0 for S, 1 for r, etc.)
   * @param {number} octOffset - (-1 for Mandra, 0 for Madhya, etc.)
   * @param {number} basePitchOffset - (0 for C, 1 for C#)
   * @returns {number} The absolute MIDI note number (integer)
   */
  static getAbsoluteMidiFromSwara(swaraSemitoneDegree, octOffset, basePitchOffset) {
    const saMidi4 = 60 + basePitchOffset;
    return saMidi4 + swaraSemitoneDegree + (octOffset * 12);
  }
}
