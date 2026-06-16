import { FrequencyAxisEngine } from './frequency-axis-engine.js';
import { ReferenceGridRenderer } from './reference-grid-renderer.js';
import { PitchContourRenderer } from './pitch-contour-renderer.js';
import { TargetBarRenderer } from './target-bar-renderer.js';

/**
 * VISUALIZATION ENGINE
 *
 * The main orchestrator for the Swaroscope.
 * Manages the canvas, the requestAnimationFrame loop, interaction events (zoom/pan),
 * and delegates drawing to specialized renderers.
 */
export class VisualizationEngine {
  constructor(canvasElement, stateObj, pitchEngine, audioCtx) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    // External dependencies
    this.pitchEngine = pitchEngine;
    this.audioCtx = audioCtx;
    this._state = stateObj; // { basePitch, sequence, beatPhase, etc }

    // Internal state
    this.isRunning = false;
    this.mode = 'monitor'; // 'monitor' | 'guided'
    
    // History buffer for the contour
    this.history = [];
    this.historySeconds = 4.0;

    // Orchestrator Modules
    // Initialize axis to show roughly C3 (48) to G5 (79)
    this.axisEngine = new FrequencyAxisEngine(this.canvas.height, 46, 81);
    this.gridRenderer = new ReferenceGridRenderer();
    this.contourRenderer = new PitchContourRenderer();
    this.targetBarRenderer = new TargetBarRenderer();

    this._bindEvents();
    this._setupResize();
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.history = [];
    this._drawLoop();
  }

  stop() {
    this.isRunning = false;
  }

  _bindEvents() {
    // Zoom and Pan via Mouse Wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const centerMidi = this.axisEngine.yToMidi(y);
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        this.axisEngine.zoom(zoomFactor, centerMidi);
      } else {
        // Pan
        // 100px wheel delta roughly equals 1 semitone pan
        const panSemitones = (e.deltaY / 100);
        this.axisEngine.pan(-panSemitones); // negative because up scroll = see higher pitches
      }
    }, { passive: false });

    // Keyboard controls for zoom/pan when canvas is focused or hovered
    // We'll attach to document and check if mouse is over canvas
    let isHovered = false;
    this.canvas.addEventListener('mouseenter', () => isHovered = true);
    this.canvas.addEventListener('mouseleave', () => isHovered = false);

    document.addEventListener('keydown', (e) => {
      if (!isHovered && document.activeElement !== this.canvas) return;
      
      switch (e.key) {
        case '=':
        case '+':
          this.axisEngine.zoom(0.9, this.axisEngine.yToMidi(this.canvas.height / 2));
          e.preventDefault();
          break;
        case '-':
        case '_':
          this.axisEngine.zoom(1.1, this.axisEngine.yToMidi(this.canvas.height / 2));
          e.preventDefault();
          break;
        case 'ArrowUp':
          this.axisEngine.pan(1);
          e.preventDefault();
          break;
        case 'ArrowDown':
          this.axisEngine.pan(-1);
          e.preventDefault();
          break;
      }
    });

    // Make canvas focusable to accept keyboard events directly if clicked
    if (!this.canvas.hasAttribute('tabindex')) {
      this.canvas.setAttribute('tabindex', '0');
    }
  }

  _setupResize() {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const rect = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.axisEngine.resize(rect.height);
      }
    });
    observer.observe(this.canvas);
  }

  _drawLoop = () => {
    if (!this.isRunning) return;

    // 1. Gather new data
    const res = this.pitchEngine.lastResult;
    if (res && res.hz > 0) {
      // Avoid duplicate timestamps
      if (this.history.length === 0 || this.history[this.history.length - 1].t !== res.t) {
        this.history.push({
          t: res.t,
          midi: res.midi,
          swara: res.swara
        });
      }
    }

    // Trim history older than what we need to render
    const now = performance.now() / 1000;
    while (this.history.length > 0 && (now - this.history[0].t) > this.historySeconds + 1) {
      this.history.shift();
    }

    // 2. Render
    const W = this.canvas.width / (window.devicePixelRatio || 1);
    const H = this.canvas.height / (window.devicePixelRatio || 1);
    const LABEL_W = this.gridRenderer.labelWidth;
    const CONTENT_W = W - LABEL_W;

    this.ctx.clearRect(0, 0, W, H);

    // Render Grid
    this.gridRenderer.render(this.ctx, W, H, this.axisEngine, this._state.basePitch);

    // Render Target Bars (if in Guided Mode)
    if (this.mode === 'guided' && this._state.sequence) {
      this.targetBarRenderer.render(
        this.ctx, W, H, this.axisEngine, 
        this._state.sequence, this._state.beatPhase, this._state.basePitch,
        LABEL_W, CONTENT_W
      );
    }

    // Render Voice Contour
    this.contourRenderer.render(
      this.ctx, W, H, this.axisEngine, 
      this.history, CONTENT_W, LABEL_W, this.historySeconds
    );

    requestAnimationFrame(this._drawLoop);
  }
}
