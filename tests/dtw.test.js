import { test, assert } from './test-framework.js';
import { DTWEngine } from '../js/engine/dtw-engine.js';
import { BasePitchTrack } from '../js/engine/architecture/track-schema.js';

test('DTWEngine - Identical Tracks', () => {
  const engine = new DTWEngine();
  const t1 = new BasePitchTrack();
  const t2 = new BasePitchTrack();
  
  t1.lod1.avg = new Float32Array([60, 61, 62, 63]);
  t2.lod1.avg = new Float32Array([60, 61, 62, 63]);
  
  const path = engine.align(t1, t2);
  
  assert(path.length === 4, 'Path should be length 4');
  assert(path[0].sourceIdx === 0 && path[0].targetIdx === 0, 'First element matches');
  assert(path[3].sourceIdx === 3 && path[3].targetIdx === 3, 'Last element matches');
});

test('DTWEngine - Shifted Tracks (Temporal Deviation)', () => {
  const engine = new DTWEngine();
  const t1 = new BasePitchTrack();
  const t2 = new BasePitchTrack();
  
  // t1 is delayed by 1 frame
  t1.lod1.avg = new Float32Array([0, 60, 61, 62]);
  t2.lod1.avg = new Float32Array([60, 61, 62, 0]);
  
  const path = engine.align(t1, t2);
  
  // Find where 60 matches 60
  const match60 = path.find(p => t1.lod1.avg[p.sourceIdx] === 60 && t2.lod1.avg[p.targetIdx] === 60);
  assert(match60 !== undefined, 'Should find alignment for 60');
  assert(match60.sourceIdx === 1 && match60.targetIdx === 0, 'Source index 1 aligns with target index 0');
});

test('DTWEngine - Silence Penalty', () => {
  const engine = new DTWEngine();
  const t1 = new BasePitchTrack();
  const t2 = new BasePitchTrack();
  
  t1.lod1.avg = new Float32Array([60, 60, 60]);
  t2.lod1.avg = new Float32Array([0, 0, 0]);
  
  const path = engine.align(t1, t2);
  assert(path.length > 0, 'Should still produce a path even if totally unmatched');
  // It shouldn't crash, but cost is high.
});
