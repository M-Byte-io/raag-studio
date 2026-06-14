/**
 * TALA ENGINE — Look-ahead scheduler for authentic tabla accompaniment.
 *
 * Architecture:
 *  • Runs completely independently from the melody Scheduler.
 *  • Both share the same AudioContext → perfect passive synchronisation.
 *  • 25ms scheduling tick, 120ms look-ahead (same proven pattern as scheduler.js).
 *  • Fires UI callbacks via requestAnimationFrame (decoupled from audio clock).
 *
 * Usage:
 *   const engine = new TalaEngine(() => getCtx());
 *   engine.onBeat  = (beatIdx, bol, isSam, isKhali) => updateUI(beatIdx, bol);
 *   engine.onCycle = (cycleNum) => incrementCounter(cycleNum);
 *   engine.start('Teentaal', 80);
 *   engine.stop();
 *
 * Riyaz Mode:
 *   engine.setRiyazMode({ enabled: true, startBPM: 60, targetBPM: 140, stepBPM: 5, stepIntervalSec: 30 });
 *   // Engine auto-ramps tempo and fires engine.onTempoChange(bpm) on each step.
 */

import { TALAS }              from './definitions.js';
import { playBol, setMasterVolume } from './synth.js';

const SCHEDULE_AHEAD = 0.12; // seconds — same as melody scheduler
const TICK_MS        = 25;

export class TalaEngine {
  /**
   * @param {() => AudioContext} getCtx
   */
  constructor(getCtx) {
    this._getCtx    = getCtx;
    this._timerID   = null;
    this._rafID     = null;

    // Playback state
    this._running   = false;
    this._tala      = null;
    this._tempo     = 80;       // BPM
    this._beatIdx   = 0;        // 0-indexed position within avarta
    this._nextTime  = 0;        // AudioContext time of next scheduled beat
    this._cycleCount= 0;

    // UI queue: { beatIdx, bol, isSam, isKhali, audioTime }[]
    this._uiQueue   = [];
    this._lastUIBeat= -1;

    // Options
    this.volume    = 0.75;
    this.muteBayan = false;
    this.muteDayan = false;
    this.humanize  = 0.010;  // seconds of timing jitter
    this.swing     = 0;      // reserved for future use

    // Callbacks (set by consumer)
    this.onBeat        = null; // (beatIdx, bol, isSam, isKhali, cycleCount)
    this.onCycle       = null; // (cycleCount)
    this.onTempoChange = null; // (bpm)

    // Riyaz mode internal state
    this._riyaz = {
      enabled: false,
      startBPM: 60,
      targetBPM: 140,
      stepBPM: 5,
      stepIntervalSec: 30,
      _stepTimer: null,
      _currentBPM: 60,
    };
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Start the engine.
   * @param {string} talaName — key from TALAS
   * @param {number} tempo    — BPM
   */
  start(talaName, tempo) {
    this.stop();
    this._tala      = TALAS[talaName];
    if (!this._tala) { console.error(`TalaEngine: unknown tala "${talaName}"`); return; }

    this._tempo     = tempo;
    this._beatIdx   = 0;
    this._cycleCount= 0;
    this._uiQueue   = [];
    this._lastUIBeat= -1;
    this._running   = true;

    const ctx = this._getCtx();
    if (!ctx) return;

    setMasterVolume(ctx, this.volume);
    this._nextTime = ctx.currentTime + 0.08; // tiny lead-in

    if (this._riyaz.enabled) this._startRiyaz();

    this._tick();
    this._uiLoop();
  }

  /** Gracefully stop the engine. */
  stop() {
    this._running = false;
    clearTimeout(this._timerID);
    cancelAnimationFrame(this._rafID);
    this._timerID = null;
    this._rafID   = null;
    this._uiQueue = [];
    this._stopRiyaz();
  }

  setTempo(bpm) {
    this._tempo = Math.max(20, Math.min(500, bpm));
    const ctx = this._getCtx();
    if (ctx) setMasterVolume(ctx, this.volume);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    const ctx = this._getCtx();
    if (ctx) setMasterVolume(ctx, this.volume);
  }

  /**
   * Configure Riyaz (progressive tempo training) mode.
   * Call before or after start(); updates take effect immediately.
   */
  setRiyazMode({ enabled, startBPM, targetBPM, stepBPM, stepIntervalSec }) {
    if (enabled !== undefined)         this._riyaz.enabled          = enabled;
    if (startBPM !== undefined)        this._riyaz.startBPM         = startBPM;
    if (targetBPM !== undefined)       this._riyaz.targetBPM        = targetBPM;
    if (stepBPM !== undefined)         this._riyaz.stepBPM          = stepBPM;
    if (stepIntervalSec !== undefined) this._riyaz.stepIntervalSec  = stepIntervalSec;

    if (!enabled) this._stopRiyaz();
    else if (this._running) { this._stopRiyaz(); this._startRiyaz(); }
  }

  /** Current tala object (read-only). */
  get tala() { return this._tala; }
  get beatIndex() { return this._beatIdx; }
  get cycleCount() { return this._cycleCount; }
  get tempo() { return this._tempo; }
  get running() { return this._running; }

  // ── Scheduling tick (audio-thread accurate) ───────────────────────────

  _tick() {
    if (!this._running) return;
    const ctx  = this._getCtx();
    const now  = ctx.currentTime;
    const tala = this._tala;

    while (this._nextTime < now + SCHEDULE_AHEAD) {
      const idx    = this._beatIdx;
      const bol    = tala.bols[idx];
      const isSam  = idx === tala.sam;
      const isKhali= tala.khali.includes(idx);

      // Schedule audio
      playBol(ctx, bol, this._nextTime, {
        volume:    this.volume,
        muteBayan: this.muteBayan || (isKhali && idx !== tala.sam),
        muteDayan: this.muteDayan,
        humanize:  this.humanize,
        isSam,
      });

      // Enqueue for UI
      this._uiQueue.push({
        beatIdx:   idx,
        bol,
        isSam,
        isKhali,
        audioTime: this._nextTime,
        cycleCount:this._cycleCount,
      });

      // Advance
      const beatDur   = 60 / this._tempo;
      this._nextTime += beatDur;
      this._beatIdx++;

      if (this._beatIdx >= tala.beats) {
        this._beatIdx = 0;
        this._cycleCount++;
        this.onCycle?.(this._cycleCount);
      }
    }

    this._timerID = setTimeout(() => this._tick(), TICK_MS);
  }

  // ── UI loop (frame-rate accurate) ────────────────────────────────────

  _uiLoop() {
    if (!this._running && !this._uiQueue.length) return;

    const ctx = this._getCtx();
    const now = ctx?.currentTime ?? 0;
    const cutoff = now - 0.3;

    // Find what's playing right now
    for (const entry of this._uiQueue) {
      const beatDur = 60 / this._tempo;
      if (entry.audioTime <= now && now < entry.audioTime + beatDur) {
        if (entry.beatIdx !== this._lastUIBeat) {
          this._lastUIBeat = entry.beatIdx;
          this.onBeat?.(entry.beatIdx, entry.bol, entry.isSam, entry.isKhali, entry.cycleCount);
        }
        break;
      }
    }

    // Prune old entries
    while (this._uiQueue.length && this._uiQueue[0].audioTime + (60/this._tempo) < cutoff) {
      this._uiQueue.shift();
    }

    this._rafID = requestAnimationFrame(() => this._uiLoop());
  }

  // ── Riyaz mode ────────────────────────────────────────────────────────

  _startRiyaz() {
    this._riyaz._currentBPM = this._riyaz.startBPM;
    this.setTempo(this._riyaz._currentBPM);
    this.onTempoChange?.(this._riyaz._currentBPM);
    this._riyazStep();
  }

  _riyazStep() {
    if (!this._riyaz.enabled) return;
    if (this._riyaz._currentBPM >= this._riyaz.targetBPM) {
      this.onTempoChange?.('done');
      return;
    }
    this._riyaz._stepTimer = setTimeout(() => {
      this._riyaz._currentBPM = Math.min(
        this._riyaz.targetBPM,
        this._riyaz._currentBPM + this._riyaz.stepBPM
      );
      this.setTempo(this._riyaz._currentBPM);
      this.onTempoChange?.(this._riyaz._currentBPM);
      this._riyazStep();
    }, this._riyaz.stepIntervalSec * 1000);
  }

  _stopRiyaz() {
    clearTimeout(this._riyaz._stepTimer);
    this._riyaz._stepTimer = null;
  }
}

// ── Module-level singleton for the app ────────────────────────────────────
let _instance = null;
export function getTalaEngine() { return _instance; }
export function createTalaEngine(getCtx) {
  _instance = new TalaEngine(getCtx);
  return _instance;
}
