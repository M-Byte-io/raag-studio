/**
 * SCHEDULER — Look-ahead Web Audio API scheduler.
 *
 * Fixes C1 (setTimeout timing drift). Based on Chris Wilson's
 * "A Tale of Two Clocks" pattern — the gold standard for Web Audio timing.
 *
 * Architecture:
 *  • A fast setTimeout loop (25ms) schedules notes 120ms ahead of playback.
 *    Audio events are scheduled at precise AudioContext.currentTime values,
 *    so timing is sample-accurate regardless of JavaScript GC pauses.
 *
 *  • A requestAnimationFrame loop reads AudioContext.currentTime to find
 *    which note is "now" and fires the UI callback. This decouples audio
 *    precision from animation frame timing.
 *
 * Usage:
 *   const sched = new Scheduler(getCtx);
 *   sched.start(queue, {
 *     onSchedule: (note, audioTime, idx, dur) => playNote(note, audioTime, dur),
 *     onUINote:   (note, idx) => highlightNote(note, idx),
 *     onComplete: () => stopPlay(),
 *     loop: false,
 *   });
 *   sched.stop();
 */

/** How far ahead (seconds) to schedule audio events. */
const SCHEDULE_AHEAD = 0.12;

/** How often (ms) the scheduler tick runs. */
const TICK_INTERVAL = 25;

export class Scheduler {
  /**
   * @param {() => AudioContext} getCtx
   */
  constructor(getCtx) {
    this._getCtx      = getCtx;
    this._timerID     = null;
    this._rafID       = null;

    /** @type {Array<{note,startTime,duration,idx}>} Notes scheduled but not yet played in UI */
    this._uiQueue     = [];
    this._lastUIIdx   = -1;

    this._queue       = [];
    this._nextIdx     = 0;
    this._nextTime    = 0;

    this._loop        = false;
    this._onSchedule  = null;
    this._onUINote    = null;
    this._onComplete  = null;
    this._running     = false;
  }

  /**
   * Start playback.
   * @param {object[]} queue  — note objects, each must have `_durationSec` set
   * @param {{ onSchedule, onUINote, onComplete, loop }} opts
   */
  start(queue, { onSchedule, onUINote, onComplete, loop = false } = {}) {
    this.stop();

    this._queue      = queue;
    this._onSchedule = onSchedule;
    this._onUINote   = onUINote;
    this._onComplete = onComplete;
    this._loop       = loop;
    this._nextIdx    = 0;
    this._uiQueue    = [];
    this._lastUIIdx  = -1;
    this._running    = true;

    const ctx = this._getCtx();
    this._nextTime = ctx.currentTime + 0.05; // small initial offset

    this._tick();
    this._uiLoop();
  }

  stop() {
    this._running = false;
    clearTimeout(this._timerID);
    cancelAnimationFrame(this._rafID);
    this._uiQueue   = [];
    this._lastUIIdx = -1;
    this._queue     = [];
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _tick() {
    if (!this._running) return;
    const ctx = this._getCtx();

    while (this._nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      if (this._nextIdx >= this._queue.length) {
        if (this._loop) {
          this._nextIdx = 0;
          if (!this._queue.length) break; // safety: don't spin on empty loop
          continue;
        }

        // Sequence done — fire onComplete after last note finishes
        this._running = false;
        const last = this._uiQueue[this._uiQueue.length - 1];
        const delay = last
          ? Math.max(0, (last.startTime + last.duration) - ctx.currentTime) * 1000 + 100
          : 0;
        this._timerID = setTimeout(() => this._onComplete?.(), delay);
        return;
      }

      const note = this._queue[this._nextIdx];
      const dur  = note._durationSec ?? 0.5;

      // Schedule audio at precise future time
      this._onSchedule?.(note, this._nextTime, this._nextIdx, dur);

      // Enqueue for UI update
      this._uiQueue.push({
        note,
        startTime: this._nextTime,
        duration:  dur,
        idx:       this._nextIdx,
      });

      this._nextTime += dur;
      this._nextIdx++;
    }

    this._timerID = setTimeout(() => this._tick(), TICK_INTERVAL);
  }

  _uiLoop() {
    if (!this._running && !this._uiQueue.length) return;

    const ctx = this._getCtx();
    const now = ctx?.currentTime ?? 0;

    // Find the note that should be highlighted right now
    let current = null;
    for (const entry of this._uiQueue) {
      if (entry.startTime <= now && now < entry.startTime + entry.duration) {
        current = entry;
        break;
      }
    }

    if (current && current.idx !== this._lastUIIdx) {
      this._lastUIIdx = current.idx;
      this._onUINote?.(current.note, current.idx);
    }

    // Prune entries that have fully decayed (keep buffer of 0.3s)
    const cutoff = now - 0.3;
    while (this._uiQueue.length && this._uiQueue[0].startTime + this._uiQueue[0].duration < cutoff) {
      this._uiQueue.shift();
    }

    this._rafID = requestAnimationFrame(() => this._uiLoop());
  }
}
