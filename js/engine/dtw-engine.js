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
   * Optimized with Sakoe-Chiba band for O(N*W) complexity.
   * @param {import('./architecture/track-schema.js').BasePitchTrack} sourceTrack (e.g. User)
   * @param {import('./architecture/track-schema.js').BasePitchTrack} targetTrack (e.g. Reference)
   * @returns {Array<{ sourceIdx: number, targetIdx: number }>}
   */
  align(sourceTrack, targetTrack) {
    const sourceArr = sourceTrack.lod1.avg;
    const targetArr = targetTrack.lod1.avg;
    
    const n = sourceArr.length;
    const m = targetArr.length;
    
    if (n === 0 || m === 0) return [];

    // lod1 runs at 10 fps
    const fps = 10;
    const trackDurationSec = n / fps;
    
    // Dynamic Window W: min(max(0.1 * track_length, 2 sec), 10 sec)
    const windowSec = Math.min(Math.max(0.1 * trackDurationSec, 2.0), 10.0);
    const windowFrames = Math.ceil(windowSec * fps);
    
    // Sakoe-Chiba band size 'W' (max absolute difference between i and j scaled by length ratio)
    // To handle tracks of different lengths (n != m), the band is centered around the diagonal j = i * (m/n).
    // The width of the band is W frames on either side.
    const W = Math.max(windowFrames, Math.abs(n - m));

    // Cost matrix (we still use a 1D typed array, but size is (n+1)*(m+1))
    // Note: For extreme memory optimization on 1+ hour files, this should be mapped to an O(W) sliding ring buffer
    // but a band constraint drastically cuts the computation time to O(N*W).
    // Let's allocate the full matrix but fill it sparsely.
    const cost = new Float32Array((n + 1) * (m + 1));
    cost.fill(Infinity);
    cost[0] = 0; // cost[0][0]

    // Fill the cost matrix using Sakoe-Chiba band
    for (let i = 1; i <= n; i++) {
      // The center of the band for this i
      const centerJ = Math.round(i * (m / n));
      const startJ = Math.max(1, centerJ - W);
      const endJ = Math.min(m, centerJ + W);

      for (let j = startJ; j <= endJ; j++) {
        const sVal = sourceArr[i - 1];
        const tVal = targetArr[j - 1];
        
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
