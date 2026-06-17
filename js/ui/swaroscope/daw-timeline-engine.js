import { globalEventBus, EVENTS } from '../../engine/architecture/event-bus.js';
import { syncManager } from '../../engine/synchronization-manager.js';

/**
 * DAWTimelineEngine
 * 
 * Replaces the old VisualizationEngine. Operates on an absolute timeline
 * using seconds as the X-axis and fractional MIDI as the Y-axis.
 * Supports LOD rendering, infinite zoom, panning, and multi-track overlays.
 */
export class DAWTimelineEngine {
  /**
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    
    // Viewport settings (Time and Pitch)
    this.viewport = {
      startSec: 0,
      endSec: 10,       // Zoom level: 10 seconds wide
      centerMidi: 60.0, // C4
      midiRange: 24     // Zoom level: 2 octaves high
    };

    this.tracks = [];   // Active BasePitchTrack objects
    this.regions = [];  // Active Region objects
    
    this._rafId = null;
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(canvas.parentElement);
    
    this._bindEvents();
  }

  _bindEvents() {
    globalEventBus.on(EVENTS.PLAYBACK_STARTED, () => this.startRenderLoop());
    globalEventBus.on(EVENTS.PLAYBACK_PAUSED, () => this.stopRenderLoop());
    
    // Mouse dragging for panning
    let isDragging = false;
    let lastX = 0;
    this.canvas.addEventListener('mousedown', (e) => { isDragging = true; lastX = e.clientX; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      
      // Convert pixels to seconds
      const secPerPixel = (this.viewport.endSec - this.viewport.startSec) / this.canvas.width;
      const shiftSec = dx * secPerPixel;
      
      this.viewport.startSec -= shiftSec;
      this.viewport.endSec -= shiftSec;
      
      if (!syncManager._isRunning) this.render(); // force render if paused
    });
  }

  loadProject(sessionProject) {
    this.tracks = sessionProject.trackGroups.flatMap(g => g.tracks);
    this.regions = sessionProject.annotations;
    this.render();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.render();
  }

  startRenderLoop() {
    if (this._rafId) return;
    const loop = () => {
      this.render();
      this._rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopRenderLoop() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this.render(); // One final render
  }

  render() {
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;

    // Auto-pan if playing
    const currentTime = syncManager.getCurrentTime();
    if (syncManager._isRunning) {
      // Keep playhead at 20% of the screen
      const viewWidth = this.viewport.endSec - this.viewport.startSec;
      this.viewport.startSec = currentTime - (viewWidth * 0.2);
      this.viewport.endSec = this.viewport.startSec + viewWidth;
    }

    // 1. Clear
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, w, h);

    // 2. Draw Regions (Background)
    this._drawRegions(w, h);

    // 3. Draw Grid Lines (Y-axis Swaras / X-axis Seconds)
    this._drawGrid(w, h);

    // 4. Draw Tracks (LOD strategy)
    for (const track of this.tracks) {
      if (track.isVisible) this._drawTrack(track, w, h);
    }

    // 5. Draw Playhead
    this._drawPlayhead(currentTime, w, h);
  }

  _drawRegions(w, h) {
    // Implement region drawing (Phrases, Loops)
  }

  _drawGrid(w, h) {
    // Implement WesternNote/Swara grid based on centerMidi and midiRange
  }

  _drawTrack(track, w, h) {
    const viewDur = this.viewport.endSec - this.viewport.startSec;
    const secPerPixel = viewDur / w;
    
    // Choose LOD based on zoom level
    let activeTrack = track.midiTrack;
    if (secPerPixel > 0.1) activeTrack = track.lod1.avg;
    if (secPerPixel > 1.0) activeTrack = track.lod2.avg;

    // Efficient Path2D rendering
    // ... logic to draw the Float32Array over the viewport ...
  }

  _drawPlayhead(t, w, h) {
    const viewDur = this.viewport.endSec - this.viewport.startSec;
    const x = ((t - this.viewport.startSec) / viewDur) * w;
    
    if (x >= 0 && x <= w) {
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
  }
}
