/**
 * AUDIO CONTEXT — Singleton AudioContext manager.
 *
 * Web Audio API requires a single shared AudioContext per page.
 * This module owns that context and provides helpers.
 */

/** @type {AudioContext|null} */
let _ctx = null;

/**
 * Ensure the AudioContext exists and is running.
 * Must be called from a user gesture on first invocation (iOS requirement).
 * @returns {AudioContext}
 */
export function ensureAudio() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume suspended context (iOS Safari locks it until gesture)
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {/* handled below */});
  }
  return _ctx;
}

/** @returns {AudioContext|null} */
export function getCtx() { return _ctx; }

/**
 * Calculate the frequency in Hz for a given semitone + octave.
 * Formula: MIDI note → frequency via equal temperament.
 *
 * @param {number} semit   — semitone offset from C (0–12)
 * @param {number} octave  — MIDI octave (4 = middle octave)
 * @returns {number} Hz
 */
export function noteFreq(semit, octave) {
  const midi = (octave + 1) * 12 + semit;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
