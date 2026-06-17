import { ShrutiEngine } from './shruti-engine.js';

/**
 * ScaleMappingEngine
 * 
 * Maps the DAW Timeline Grid from Equal Temperament (12-TET) to 
 * Raga-specific Shruti Intonation.
 */
export class ScaleMappingEngine {
  constructor() {
    this.shrutiEngine = new ShrutiEngine();
    
    // Default 12-TET cents offsets
    this.currentScaleOffsets = {
      'S': 0, 'r': 100, 'R': 200, 'g': 300, 'G': 400,
      'm': 500, 'M': 600, 'P': 700, 'd': 800, 'D': 900,
      'n': 1000, 'N': 1100
    };
    
    this.ragaContext = 'EquallyTempered';
  }

  /**
   * Switches the active tuning map based on the selected Raga.
   * @param {string} ragaName 
   */
  setRagaContext(ragaName) {
    this.ragaContext = ragaName;
    this.currentScaleOffsets = this.shrutiEngine.getRagaIntonationMap(ragaName);
  }

  /**
   * Converts a perfect 12-TET MIDI note number to its Shruti-adjusted MIDI value.
   * E.g. MIDI 64 (E, Shuddh Ga) in 12-TET is exactly 64.0.
   * In Just Intonation (5/4), it is ~386 cents above C, not 400. 
   * So this returns 63.86.
   * @param {number} midiNote (Integer)
   * @param {number} saMidi (Integer) The root note, usually 60 (C4)
   */
  getAdjustedMidi(midiNote, saMidi = 60) {
    const swaraNames = ['S','r','R','g','G','m','M','P','d','D','n','N'];
    const interval = (midiNote - saMidi) % 12;
    const normalizedInterval = interval >= 0 ? interval : interval + 12;
    const octaveShift = Math.floor((midiNote - saMidi) / 12);
    
    const swara = swaraNames[normalizedInterval];
    
    if (this.ragaContext === 'EquallyTempered') {
      return midiNote;
    }

    const centsOffset = this.currentScaleOffsets[swara];
    
    // Base Sa in MIDI + octaves + fractional shruti adjustment
    return saMidi + (octaveShift * 12) + (centsOffset / 100);
  }
}
