/**
 * WESTERN NOTE ENGINE
 *
 * Handles bidirectional conversions between frequency (Hz),
 * MIDI note numbers, and Scientific Pitch Notation (e.g., "C4").
 */

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class WesternNoteEngine {
  /**
   * Converts a frequency to exact MIDI note (float)
   * @param {number} hz 
   * @returns {number} Float MIDI note (e.g. 60.5)
   */
  static hzToMidi(hz) {
    return 12 * Math.log2(hz / 440) + 69;
  }

  /**
   * Converts a MIDI note number to frequency
   * @param {number} midi 
   * @returns {number} Hz
   */
  static midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Parses a float MIDI note into its components: nearest note name, octave, cents deviation.
   * @param {number} midiFloat
   * @returns {{ midiRound: number, noteName: string, octave: number, cents: number, fullNotation: string }}
   */
  static parseMidi(midiFloat) {
    const midiRound  = Math.round(midiFloat);
    const cents      = Math.round((midiFloat - midiRound) * 100);
    const semitInOct = ((midiRound % 12) + 12) % 12;
    const octave     = Math.floor(midiRound / 12) - 1;
    const noteName   = NOTES[semitInOct];

    return {
      midiRound,
      noteName,
      octave,
      cents,
      fullNotation: `${noteName}${octave}`
    };
  }

  /**
   * Convenience method to get full scientific notation directly from Hz.
   * @param {number} hz
   */
  static hzToNotation(hz) {
    return this.parseMidi(this.hzToMidi(hz));
  }
}
