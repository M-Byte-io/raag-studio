import { test, assert, assertAlmostEqual } from './test-framework.js';
import { YinPitchDetector } from '../js/audio/pitch-detection-engine.js';

test('DSP - YinPitchDetector 440Hz Sine Wave', () => {
  const sr = 44100;
  const detector = new YinPitchDetector();
  const buffer = new Float32Array(4096);
  
  // Generate 440Hz sine wave
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * 440 * i) / sr);
  }
  
  const result = detector.process(buffer, sr);
  assert(result !== null, 'Should detect a pitch');
  
  // 440 Hz is exactly MIDI 69
  assertAlmostEqual(result.midi, 69.0, 0.1, 'Should detect 440Hz as MIDI 69');
});

test('DSP - YinPitchDetector 220Hz Sine Wave', () => {
  const sr = 44100;
  const detector = new YinPitchDetector();
  const buffer = new Float32Array(4096);
  
  // Generate 220Hz sine wave
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * 220 * i) / sr);
  }
  
  const result = detector.process(buffer, sr);
  assert(result !== null, 'Should detect a pitch');
  
  // 220 Hz is exactly MIDI 57
  assertAlmostEqual(result.midi, 57.0, 0.1, 'Should detect 220Hz as MIDI 57');
});

test('DSP - YinPitchDetector Silence Handling', () => {
  const sr = 44100;
  const detector = new YinPitchDetector();
  const buffer = new Float32Array(4096);
  
  // Zero buffer
  // Note: the YIN algorithm inside the engine might divide by zero or reject low RMS.
  // The PitchExtractionWorker does the RMS check, but let's see what YIN does directly.
  const result = detector.process(buffer, sr);
  assert(result === null, 'Should return null for absolute silence');
});
