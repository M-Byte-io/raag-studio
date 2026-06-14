/**
 * SEQUENCE — Build playback queues from patterns.
 * Pure functions — no side effects.
 */

/**
 * Expand a pattern into a flat playback sequence honoring direction and repeats.
 *
 * @param {object[]} pattern   — array of { id, o, dur }
 * @param {'up'|'down'|'both'} direction
 * @param {number}   repeats   — number of cycles
 * @returns {object[]}
 */
export function buildSequence(pattern, direction, repeats) {
  if (!pattern.length) return [];
  const base = pattern.map(p => ({ ...p }));
  const rev  = [...base].reverse();
  const seq  = [];

  for (let i = 0; i < repeats; i++) {
    if (direction === 'up')   { seq.push(...base); }
    if (direction === 'down') { seq.push(...rev);  }
    if (direction === 'both') { seq.push(...base, ...rev); }
  }
  return seq;
}

/**
 * Attach computed duration (in seconds) to every note in a queue.
 * This must be done before handing the queue to the scheduler.
 *
 * @param {object[]} queue
 * @param {number}   tempo — BPM
 * @returns {object[]}  same array, mutated in place for performance
 */
export function stampDurations(queue, tempo) {
  const beatSec = 60 / tempo;
  for (const note of queue) {
    note._durationSec = beatSec * (note.dur || 1);
  }
  return queue;
}

/**
 * Build the shift queue for the generator's "play all" feature.
 *
 * @param {object[][]} shifts
 * @param {'aaroh'|'avroh'|'both'} direction
 * @param {number} reps  — repetitions per shift
 * @returns {{ queue: object[], shiftMap: object[] }}
 */
export function buildShiftQueue(shifts, direction, reps) {
  const queue    = [];
  const shiftMap = [];

  shifts.forEach((shift, si) => {
    for (let r = 0; r < reps; r++) {
      if (direction === 'aaroh' || direction === 'both') {
        shift.forEach((note, ni) => {
          queue.push(note);
          shiftMap.push({ shiftIdx: si, noteIdx: ni });
        });
      }
      if (direction === 'avroh' || direction === 'both') {
        [...shift].reverse().forEach((note, ni) => {
          queue.push(note);
          shiftMap.push({ shiftIdx: si, noteIdx: shift.length - 1 - ni });
        });
      }
    }
  });

  return { queue, shiftMap };
}

/**
 * Build a single-shift queue (for "play" button on individual gen row).
 */
export function buildSingleShiftQueue(shift, si, direction, reps) {
  return buildShiftQueue([shift], direction, reps);
}
