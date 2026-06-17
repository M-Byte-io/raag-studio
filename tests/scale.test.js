import { test, assert, assertAlmostEqual } from './test-framework.js';
import { ShrutiEngine } from '../js/engine/shruti-engine.js';
import { ScaleMappingEngine } from '../js/engine/scale-mapping-engine.js';

test('ShrutiEngine - Ratio to Cents Conversion', () => {
  const engine = new ShrutiEngine();
  // Pa should be exactly 701.955 cents
  const paCents = engine.getShrutiCents('Pa');
  assertAlmostEqual(paCents, 701.955, 0.01, 'Pa is 3/2');
});

test('ScaleMappingEngine - Darbari Kanada Mapping', () => {
  const engine = new ScaleMappingEngine();
  engine.setRagaContext('Darbari'); // Darbari uses ati-komal Ga (g1) and Dha (d1)
  
  // Sa is 60. g is MIDI 63 (Eb). 
  // g1 in Darbari is 32/27 = 294.13 cents above Sa.
  // So MIDI 63 should map to 60 + 2.9413 = 62.9413
  const targetMidi = engine.getAdjustedMidi(63, 60);
  assertAlmostEqual(targetMidi, 62.941, 0.01, 'Ati-komal Ga calculation');
});

test('ScaleMappingEngine - Dynamic Sa Base Shift', () => {
  const engine = new ScaleMappingEngine();
  engine.setRagaContext('Yaman'); // Yaman uses Teevra Ma (M2)
  
  // If Sa is D4 (62), then Teevra Ma is G#4 (68).
  // M2 is 729/512 = 611.73 cents above Sa.
  // So it should map to 62 + 6.1173 = 68.1173
  const targetMidi = engine.getAdjustedMidi(68, 62);
  assertAlmostEqual(targetMidi, 68.117, 0.01, 'Teevra Ma with shifted Sa');
});

test('ScaleMappingEngine - Octave Transitions', () => {
  const engine = new ScaleMappingEngine();
  engine.setRagaContext('EquallyTempered');
  
  assert(engine.getAdjustedMidi(72, 60) === 72, 'Higher octave Sa');
  assert(engine.getAdjustedMidi(48, 60) === 48, 'Lower octave Sa');
});
