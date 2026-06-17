import { IDTWEngine } from './architecture/engine-interfaces.js';

/**
 * DTWEngine
 * 
 * Performs Dynamic Time Warping to align two PitchTracks.
 * Uses the decimated LOD1 arrays (10 frames per second) to compute 
 * the warping path in O(N*M) time without blowing up RAM.
 */
export class DTWEngine extends IDTWEngine {
  
  /**
   * Generates a warping path mapping indices of source to target.
   * @param {import('./architecture/track-schema.js').BasePitchTrack} sourceTrack (e.g. User)
   * @param {import('./architecture/track-schema.js').BasePitchTrack} targetTrack (e.g. Reference)
   * @returns {Array<{ sourceIdx: number, targetIdx: number }>}
   */
  align(sourceTrack, targetTrack) {
    // We use LOD1.avg (10 FPS) to keep the cost matrix small
    const sourceArr = sourceTrack.lod1.avg;
    const targetArr = targetTrack.lod1.avg;
    
    const n = sourceArr.length;
    const m = targetArr.length;
    
    if (n === 0 || m === 0) return [];

    // Cost matrix (using 1D typed array for performance)
    const cost = new Float32Array((n + 1) * (m + 1));
    cost.fill(Infinity);
    cost[0] = 0; // cost[0][0]

    // Fill the cost matrix
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const sVal = sourceArr[i - 1];
        const tVal = targetArr[j - 1];
        
        // Distance function:
        // If one is silent and other is pitched, high penalty.
        // Otherwise, absolute difference in MIDI.
        let dist = 0;
        if ((sVal === 0) !== (tVal === 0)) {
          dist = 100; // High penalty for silence mismatch
        } else if (sVal !== 0 && tVal !== 0) {
          dist = Math.abs(sVal - tVal);
        }

        const costIdx = i * (m + 1) + j;
        
        const ins = cost[i * (m + 1) + (j - 1)];     // insertion
        const del = cost[(i - 1) * (m + 1) + j];     // deletion
        const mat = cost[(i - 1) * (m + 1) + (j - 1)]; // match

        cost[costIdx] = dist + Math.min(ins, del, mat);
      }
    }

    // Backtrack to find the optimal path
    const path = [];
    let i = n;
    let j = m;

    while (i > 0 && j > 0) {
      path.push({ sourceIdx: i - 1, targetIdx: j - 1 });
      
      const ins = cost[i * (m + 1) + (j - 1)];
      const del = cost[(i - 1) * (m + 1) + j];
      const mat = cost[(i - 1) * (m + 1) + (j - 1)];
      
      const minCost = Math.min(ins, del, mat);
      
      if (minCost === mat) {
        i--;
        j--;
      } else if (minCost === ins) {
        j--;
      } else {
        i--;
      }
    }

    return path.reverse();
  }
}
