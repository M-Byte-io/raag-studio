/**
 * FREQUENCY AXIS ENGINE
 *
 * Manages the vertical scaling, zooming, and panning for the Swaroscope.
 * Translates MIDI note values to canvas Y-coordinates and vice-versa.
 */

export class FrequencyAxisEngine {
  constructor(canvasHeight, minMidi = 36, maxMidi = 72) {
    this.canvasHeight = canvasHeight;
    
    // The total range of MIDI notes we care about (C2 = 36, C5 = 72)
    this.absoluteMinMidi = 24; // C1
    this.absoluteMaxMidi = 96; // C7
    
    // The currently visible range
    this.visibleMinMidi = minMidi;
    this.visibleMaxMidi = maxMidi;
  }

  resize(newHeight) {
    this.canvasHeight = newHeight;
  }

  get visibleRange() {
    return this.visibleMaxMidi - this.visibleMinMidi;
  }

  /**
   * Converts a MIDI float value to a Y pixel coordinate.
   * Higher pitches have smaller Y values (top of canvas).
   */
  midiToY(midiFloat) {
    const fraction = (midiFloat - this.visibleMinMidi) / this.visibleRange;
    return this.canvasHeight - (fraction * this.canvasHeight);
  }

  /**
   * Converts a Y pixel coordinate back to a MIDI float.
   */
  yToMidi(yPixel) {
    const fraction = (this.canvasHeight - yPixel) / this.canvasHeight;
    return this.visibleMinMidi + (fraction * this.visibleRange);
  }

  /**
   * Returns the height in pixels of a single semitone.
   */
  get semitoneHeight() {
    return this.canvasHeight / this.visibleRange;
  }

  /**
   * Zooms the vertical axis in or out around a central MIDI pitch.
   * @param {number} factor - >1 to zoom out, <1 to zoom in.
   * @param {number} centerMidi - The pitch to keep stationary.
   */
  zoom(factor, centerMidi) {
    const currentRange = this.visibleRange;
    let newRange = currentRange * factor;
    
    // Clamp zoom levels
    newRange = Math.max(12, Math.min(newRange, this.absoluteMaxMidi - this.absoluteMinMidi));

    const centerFraction = (centerMidi - this.visibleMinMidi) / currentRange;
    
    let newMin = centerMidi - (newRange * centerFraction);
    let newMax = centerMidi + (newRange * (1 - centerFraction));

    // Clamp bounds
    if (newMin < this.absoluteMinMidi) {
      newMin = this.absoluteMinMidi;
      newMax = newMin + newRange;
    }
    if (newMax > this.absoluteMaxMidi) {
      newMax = this.absoluteMaxMidi;
      newMin = newMax - newRange;
    }

    this.visibleMinMidi = newMin;
    this.visibleMaxMidi = newMax;
  }

  /**
   * Pans the vertical axis up or down.
   * @param {number} semitonesDelta - Positive to pan up (see higher pitches).
   */
  pan(semitonesDelta) {
    const range = this.visibleRange;
    let newMin = this.visibleMinMidi + semitonesDelta;
    let newMax = this.visibleMaxMidi + semitonesDelta;

    if (newMin < this.absoluteMinMidi) {
      newMin = this.absoluteMinMidi;
      newMax = newMin + range;
    }
    if (newMax > this.absoluteMaxMidi) {
      newMax = this.absoluteMaxMidi;
      newMin = newMax - range;
    }

    this.visibleMinMidi = newMin;
    this.visibleMaxMidi = newMax;
  }
}
