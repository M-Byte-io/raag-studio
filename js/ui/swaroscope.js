/**
 * SWAROSCOPE RENDERER — Real-time vocal pitch visualization
 *
 * Renders a scrolling piano-roll style canvas:
 *   Y axis  — pitch (semitones from Sa, −3 to +15)
 *   X axis  — time (last 8 seconds, scrolling leftward)
 *
 * Two modes:
 *   'monitor'  — standalone: just the voice trace + swara grid
 *   'guided'   — overlay: target swara bars + voice trace
 *
 * Usage:
 *   const scope = new Swaroscope('swaroscopeCanvas');
 *   scope.setMode('monitor');
 *   scope.setBasePitch(0);
 *   scope.start(pitchEngine, audioCtx);
 *   // In guided mode, also call:
 *   scope.setTargetSequence(notes, startTime, bpm);
 *   scope.stop();
 */

import { SWARAS, swaraColor } from '../data/swaras.js';

// ── Layout constants ──────────────────────────────────────────────────────────

const SEMI_MIN   = -3;   // Mandra Ni
const SEMI_MAX   = 16;   // Taar Re+
const SEMI_RANGE = SEMI_MAX - SEMI_MIN;
const LABEL_W    = 44;   // px left margin for swara labels
const TIME_WIN   = 8;    // seconds visible

const SWARA_COLORS = {
  'pa-sa':  '#34d399',
  'komal':  '#f87171',
  'teevra': '#fbbf24',
  'shuddh': '#c084fc',
};

const TUNE_COLORS = {
  perfect: '#34d399',
  good:    '#86efac',
  sharp:   '#fbbf24',
  flat:    '#fb923c',
  missed:  '#f87171',
};

// ── Swaroscope ────────────────────────────────────────────────────────────────

export class Swaroscope {
  /**
   * @param {string} canvasId — id of <canvas> element
   */
  constructor(canvasId) {
    this._canvas  = document.getElementById(canvasId);
    this._ctx2d   = this._canvas?.getContext('2d');
    this._rafId   = null;
    this._running = false;

    this._engine      = null;   // PitchEngine
    this._audioCtx    = null;

    this._mode        = 'monitor';   // 'monitor' | 'guided'
    this._basePitch   = 0;           // semitone of Sa from C
    this._targetSeq   = [];          // [{ semit, octOffset, durationSec }]
    this._seqStartT   = null;        // audioCtx.currentTime when sequence started
    this._bpm         = 80;

    this._dpr         = window.devicePixelRatio || 1;

    if (this._canvas) {
      this._resize();
      window.addEventListener('resize', () => this._resize());
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  setMode(mode) { this._mode = mode; }
  setBasePitch(semit) { this._basePitch = semit; }

  /**
   * Set target note sequence for guided mode.
   * @param {Array<{semit:number, octOffset:number, durationBeats:number}>} notes
   * @param {number} startTime — audioCtx.currentTime when first note starts
   * @param {number} bpm
   */
  setTargetSequence(notes, startTime, bpm) {
    this._bpm       = bpm;
    this._seqStartT = startTime;

    const secPerBeat = 60 / bpm;
    let cumTime      = 0;
    this._targetSeq  = notes.map(n => {
      const entry = {
        semit:       n.semit,
        octOffset:   n.octOffset ?? 0,
        startSec:    cumTime,
        durationSec: n.durationBeats * secPerBeat,
        type:        n.type || 'shuddh',
        label:       n.label || '',
      };
      cumTime += entry.durationSec;
      return entry;
    });
  }

  /**
   * Start the render loop.
   * @param {import('../audio/pitch-engine.js').PitchEngine} engine
   * @param {AudioContext} audioCtx
   */
  start(engine, audioCtx) {
    this._engine   = engine;
    this._audioCtx = audioCtx;
    this._running  = true;
    this._loop();
  }

  stop() {
    this._running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._drawIdle();
  }

  // ── Render loop ─────────────────────────────────────────────────────────────

  _loop() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._loop());
    this._render();
  }

  _render() {
    const ctx = this._ctx2d;
    if (!ctx || !this._canvas) return;

    const W  = this._canvas.width  / this._dpr;
    const H  = this._canvas.height / this._dpr;
    const cw = W - LABEL_W;   // content width (right of labels)

    ctx.save();
    ctx.scale(this._dpr, this._dpr);

    // Background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);

    // Draw swara grid
    this._drawGrid(ctx, W, H, cw);

    // Draw target bars (guided mode)
    if (this._mode === 'guided' && this._seqStartT !== null && this._audioCtx) {
      this._drawTargetBars(ctx, W, H, cw);
    }

    // Draw voice trace
    if (this._engine) {
      this._drawVoiceTrace(ctx, W, H, cw);
    }

    // Draw time cursor (right edge line)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(LABEL_W + cw, 0);
    ctx.lineTo(LABEL_W + cw, H);
    ctx.stroke();

    ctx.restore();
  }

  // ── Grid ────────────────────────────────────────────────────────────────────

  _drawGrid(ctx, W, H, cw) {
    for (let semi = SEMI_MIN; semi <= SEMI_MAX; semi++) {
      const y = this._semiToY(semi, H);

      // Highlight Sa, Pa, Taar Sa rows
      const degInOct = ((semi % 12) + 12) % 12;
      const sw = SWARAS.find(s => s.semit === degInOct);

      if (sw) {
        // Subtle row band for Sa and Pa
        if (sw.id === 'S' || sw.id === 'P') {
          ctx.fillStyle = sw.id === 'S'
            ? 'rgba(52,211,153,0.06)'
            : 'rgba(192,132,252,0.04)';
          ctx.fillRect(LABEL_W, y - this._semiHeight(H) / 2,
                        cw, this._semiHeight(H));
        }

        // Grid line
        ctx.strokeStyle = sw.id === 'S' || sw.id === "S'"
          ? 'rgba(52,211,153,0.25)'
          : 'rgba(255,255,255,0.05)';
        ctx.lineWidth = sw.id === 'S' ? 1.5 : 0.5;
        ctx.setLineDash(sw.id === 'S' ? [] : [2, 4]);
        ctx.beginPath();
        ctx.moveTo(LABEL_W, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        const col = SWARA_COLORS[sw.type] || '#c084fc';
        ctx.fillStyle   = col;
        ctx.font        = `${semi % 12 === 0 ? '700' : '500'} 10px Outfit, sans-serif`;
        ctx.textAlign   = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(sw.label, LABEL_W - 5, y);
      }
    }

    // Octave markers
    ctx.fillStyle    = 'rgba(255,255,255,0.12)';
    ctx.font         = '9px Outfit, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    const octLabels  = [[-1,'M'],[0,'M'],[1,'T']]; // rough
    for (const [semi, lbl] of [[-1,'♭Sa'], [12,"Sa'"]]) {
      const y = this._semiToY(semi, H);
      ctx.fillText(lbl, 2, y);
    }
  }

  // ── Target bars ─────────────────────────────────────────────────────────────

  _drawTargetBars(ctx, W, H, cw) {
    const now       = this._audioCtx.currentTime;
    const elapsed   = now - this._seqStartT;
    const pxPerSec  = cw / TIME_WIN;

    for (const note of this._targetSeq) {
      // x position: note.startSec relative to elapsed, right-anchored
      const noteLeft  = elapsed - note.startSec;  // how many sec ago note started
      const x1 = LABEL_W + cw - noteLeft * pxPerSec;
      const x2 = x1 + note.durationSec * pxPerSec;

      // Only draw if visible
      if (x2 < LABEL_W || x1 > W) continue;

      // Semitone: basePitch is Sa=0, note.semit is offset
      const totalSemi = note.semit + (note.octOffset ?? 0) * 12;
      const y    = this._semiToY(totalSemi, H);
      const barH = Math.max(4, this._semiHeight(H) * 0.65);

      const col = SWARA_COLORS[note.type] || '#c084fc';

      // Bar fill
      ctx.fillStyle = col.replace(')', ', 0.22)').replace('rgb', 'rgba')
        || `${col}38`;
      // Simpler approach:
      ctx.globalAlpha = 0.25;
      ctx.fillRect(
        Math.max(LABEL_W, x1),
        y - barH / 2,
        Math.min(x2, W) - Math.max(LABEL_W, x1),
        barH
      );
      ctx.globalAlpha = 1;

      // Bar border
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.7;
      ctx.strokeRect(
        Math.max(LABEL_W, x1) + 0.5,
        y - barH / 2 + 0.5,
        Math.min(x2, W) - Math.max(LABEL_W, x1) - 1,
        barH - 1
      );
      ctx.globalAlpha = 1;

      // Label on bar (if wide enough)
      const barW = Math.min(x2, W) - Math.max(LABEL_W, x1);
      if (barW > 22) {
        ctx.fillStyle    = col;
        ctx.font         = '700 11px Outfit, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha  = 0.9;
        ctx.fillText(note.label,
          Math.max(LABEL_W, x1) + barW / 2, y);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Voice trace ─────────────────────────────────────────────────────────────

  _drawVoiceTrace(ctx, W, H, cw) {
    const history   = this._engine.getHistory();
    if (history.length < 2) return;

    const now       = this._audioCtx?.currentTime ?? performance.now() / 1000;
    const pxPerSec  = cw / TIME_WIN;
    const cutoff    = now - TIME_WIN;

    // Convert history to canvas points
    const pts = [];
    for (const h of history) {
      if (h.t < cutoff) continue;
      const x    = LABEL_W + cw - (now - h.t) * pxPerSec;
      const semi = _hzToSemiAboveSa(h.hz, this._basePitch);
      const y    = this._semiToY(semi, H);
      const col  = TUNE_COLORS[h.swara?.tuneStatus] || '#c084fc';
      pts.push({ x, y, col, tuneStatus: h.swara?.tuneStatus });
    }

    if (pts.length < 2) return;

    // Draw segmented trace (colored by tune status)
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];

      // Gap detection: if time gap too large, don't draw line
      const dx = p1.x - p0.x;
      if (dx > pxPerSec * 0.25) continue; // >250ms gap = skip

      const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grad.addColorStop(0, p0.col);
      grad.addColorStop(1, p1.col);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    // Draw tip dot (most recent)
    const tip = pts[pts.length - 1];
    if (tip) {
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
      ctx.fillStyle   = tip.col;
      ctx.shadowColor = tip.col;
      ctx.shadowBlur  = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ── Idle state ──────────────────────────────────────────────────────────────

  _drawIdle() {
    const ctx = this._ctx2d;
    if (!ctx || !this._canvas) return;
    const W = this._canvas.width / this._dpr;
    const H = this._canvas.height / this._dpr;
    ctx.save();
    ctx.scale(this._dpr, this._dpr);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
    this._drawGrid(ctx, W, H, W - LABEL_W);
    ctx.fillStyle    = 'rgba(255,255,255,0.2)';
    ctx.font         = '13px Outfit, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Enable microphone to start Swaroscope', W / 2, H / 2);
    ctx.restore();
  }

  // ── Coordinate helpers ──────────────────────────────────────────────────────

  /** Semitones above Sa → Y pixel (higher pitch = higher on canvas) */
  _semiToY(semi, H) {
    const frac = (semi - SEMI_MIN) / SEMI_RANGE;
    return H - frac * H;  // invert: high pitch at top
  }

  _semiHeight(H) { return H / SEMI_RANGE; }

  _resize() {
    if (!this._canvas) return;
    this._dpr = window.devicePixelRatio || 1;
    const rect = this._canvas.getBoundingClientRect();
    this._canvas.width  = rect.width  * this._dpr;
    this._canvas.height = rect.height * this._dpr;
    this._ctx2d = this._canvas.getContext('2d');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _hzToSemiAboveSa(hz, basePitch) {
  // Sa at octave 4: midi = 60 + basePitch
  const saMidi = 60 + basePitch;
  return 12 * Math.log2(hz / (440 * Math.pow(2, (saMidi - 69) / 12)));
}
