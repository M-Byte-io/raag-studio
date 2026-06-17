import { globalEventBus, EVENTS } from '../../engine/architecture/event-bus.js';
import { syncManager } from '../../engine/synchronization-manager.js';
import { DTWEngine } from '../../engine/dtw-engine.js';
import { ScaleMappingEngine } from '../../engine/scale-mapping-engine.js';

/**
 * DAWTimelineEngine
 * 
 * Replaces the old VisualizationEngine. Operates on an absolute timeline
 * using seconds as the X-axis and fractional MIDI as the Y-axis.
 * Supports LOD rendering, infinite zoom, panning, multi-track overlays, 
 * and Raga-specific Shruti rendering.
 */
export class DAWTimelineEngine {
  /**
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    
    // Priority 7: HTML Overlay Layer
    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.pointerEvents = 'none'; // Let clicks pass through
    this.canvas.parentElement.style.position = 'relative';
    this.canvas.parentElement.appendChild(this.overlay);
    this.overlayNodes = new Map(); // cache DOM elements by annotation ID

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
    if (canvas.parentElement) {
      this._resizeObserver.observe(canvas.parentElement);
    }
    
    this._bindEvents();

    this.dtwEngine = new DTWEngine();
    this.dtwPath = [];
    this.scaleEngine = new ScaleMappingEngine();
    
    // Set a default raga to demonstrate Shruti Intonation
    this.scaleEngine.setRagaContext('Yaman');
  }

  _bindEvents() {
    globalEventBus.on(EVENTS.PLAYBACK_STARTED, () => this.startRenderLoop());
    globalEventBus.on(EVENTS.PLAYBACK_PAUSED, () => this.stopRenderLoop());
    
    // Mouse dragging for panning
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    this.canvas.addEventListener('mousedown', (e) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      
      // Convert pixels to seconds/midi
      const secPerPixel = (this.viewport.endSec - this.viewport.startSec) / this.canvas.width;
      const midiPerPixel = this.viewport.midiRange / this.canvas.height;
      
      this.viewport.startSec -= dx * secPerPixel;
      this.viewport.endSec -= dx * secPerPixel;
      
      this.viewport.centerMidi += dy * midiPerPixel;
      
      if (!syncManager._isRunning) this.render();
    });

    // Priority 5: DAWTimeline Navigation (Mouse Wheel Zoom & Pan)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const isZoom = e.ctrlKey || e.metaKey;
      const isVertical = e.shiftKey;
      
      if (isZoom) {
        // Zooming
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        
        if (isVertical) {
          // Vertical Zoom (around center)
          const rect = this.canvas.getBoundingClientRect();
          const y = e.clientY - rect.top;
          
          // Math to keep the mouse Y coordinate fixed while zooming
          const midiAtCursor = this.viewport.centerMidi + (this.viewport.midiRange / 2) - (y / this.canvas.height) * this.viewport.midiRange;
          
          this.viewport.midiRange *= zoomFactor;
          // Clamp
          this.viewport.midiRange = Math.max(12, Math.min(this.viewport.midiRange, 60));
          
          const newCenterMidi = midiAtCursor - (this.viewport.midiRange / 2) + (y / this.canvas.height) * this.viewport.midiRange;
          this.viewport.centerMidi = newCenterMidi;
        } else {
          // Horizontal Zoom (Cursor-centered)
          const rect = this.canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          
          const secPerPixel = (this.viewport.endSec - this.viewport.startSec) / this.canvas.width;
          const timeAtCursor = this.viewport.startSec + x * secPerPixel;
          
          let duration = this.viewport.endSec - this.viewport.startSec;
          duration *= zoomFactor;
          // Clamp
          duration = Math.max(0.5, Math.min(duration, 300));
          
          const fraction = x / this.canvas.width;
          this.viewport.startSec = timeAtCursor - (duration * fraction);
          this.viewport.endSec = this.viewport.startSec + duration;
        }
      } else {
        // Panning via trackpad or scroll wheel
        const secPerPixel = (this.viewport.endSec - this.viewport.startSec) / this.canvas.width;
        const midiPerPixel = this.viewport.midiRange / this.canvas.height;
        
        this.viewport.startSec += e.deltaX * secPerPixel;
        this.viewport.endSec += e.deltaX * secPerPixel;
        
        this.viewport.centerMidi -= e.deltaY * midiPerPixel;
      }
      
      if (!syncManager._isRunning) this.render();
    }, { passive: false });

    // Phase 14 / Priority 8: Teacher Workflow (Right-click to add annotation)
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      const secPerPixel = (this.viewport.endSec - this.viewport.startSec) / this.canvas.width;
      const clickedTime = this.viewport.startSec + (x * secPerPixel);
      
      // Native DOM Input for Creation (No window.prompt)
      this._showCommentInput(e.clientX, e.clientY, '', (commentText) => {
        if (commentText) {
          globalEventBus.emit('TEACHER_COMMENT_ADDED', {
            time: clickedTime,
            comment: commentText
          });
        }
      });
    });
  }

  _showCommentInput(clientX, clientY, initialText, onSubmit) {
    const inputContainer = document.createElement('div');
    inputContainer.style.position = 'absolute';
    inputContainer.style.left = `${clientX}px`;
    inputContainer.style.top = `${clientY}px`;
    inputContainer.style.backgroundColor = '#2d2d2d';
    inputContainer.style.border = '1px solid #555';
    inputContainer.style.padding = '8px';
    inputContainer.style.borderRadius = '6px';
    inputContainer.style.zIndex = '1000';
    inputContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = initialText;
    input.placeholder = '🧑‍🏫 Add Comment...';
    input.style.width = '200px';
    input.style.padding = '6px';
    input.style.border = '1px solid #444';
    input.style.backgroundColor = '#1e1e1e';
    input.style.color = '#fff';
    input.style.outline = 'none';

    inputContainer.appendChild(input);
    document.body.appendChild(inputContainer);

    input.focus();

    const cleanup = () => {
      if (inputContainer.parentNode) {
        document.body.removeChild(inputContainer);
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        onSubmit(input.value.trim());
        cleanup();
      } else if (e.key === 'Escape') {
        cleanup();
      }
    });

    input.addEventListener('blur', () => {
      onSubmit(input.value.trim());
      cleanup();
    });
  }

  loadProject(sessionProject) {
    this.sessionProject = sessionProject;
    this.tracks = sessionProject.trackGroups.flatMap(g => g.tracks);
    this.regions = sessionProject.annotations;
    
    const refTrack = this.tracks.find(t => t.type === 'ReferencePitchTrack');
    const userTrack = this.tracks.find(t => t.type === 'UserPitchTrack');
    if (refTrack && userTrack) {
      this.dtwPath = this.dtwEngine.align(userTrack, refTrack);
    } else {
      this.dtwPath = [];
    }
    
    this.render();
  }

  resize() {
    if (!this.canvas.parentElement) return;
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
    const saMidi = this.sessionProject?.metadata?.saMidi || 60;
    this._drawGrid(w, h, saMidi);

    // 4. Draw DTW alignment paths (Phase 10)
    if (this.dtwPath.length > 0 && this.tracks.length >= 2) {
      this._drawDTW(w, h);
    }

    // 5. Draw Tracks (LOD strategy)
    for (const track of this.tracks) {
      if (track.isVisible) this._drawTrack(track, w, h);
    }

    // 6. Draw Playhead
    this._drawPlayhead(currentTime, w, h);

    // 7. Update HTML Overlays
    this._renderHTMLOverlays(w, h);
  }

  _drawDTW(w, h) {
    const viewDur = this.viewport.endSec - this.viewport.startSec;
    const minMidi = this.viewport.centerMidi - (this.viewport.midiRange / 2);
    
    const userTrack = this.tracks.find(t => t.type === 'UserPitchTrack');
    const refTrack = this.tracks.find(t => t.type === 'ReferencePitchTrack');
    if (!userTrack || !refTrack || !userTrack.lod1 || !refTrack.lod1) return;

    // lod1 runs at 10 fps
    const sampleRate = 10; 

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    // Draw a connection line for every 5th path point to avoid visual clutter
    for (let i = 0; i < this.dtwPath.length; i += 5) {
      const mapping = this.dtwPath[i];
      const uVal = userTrack.lod1.avg[mapping.sourceIdx];
      const rVal = refTrack.lod1.avg[mapping.targetIdx];
      
      if (uVal === 0 || rVal === 0) continue;

      const uTime = mapping.sourceIdx / sampleRate;
      const rTime = mapping.targetIdx / sampleRate;

      // Only draw if within viewport
      if (
        (uTime < this.viewport.startSec && rTime < this.viewport.startSec) ||
        (uTime > this.viewport.endSec && rTime > this.viewport.endSec)
      ) continue;

      const uX = ((uTime - this.viewport.startSec) / viewDur) * w;
      const uY = h - ((uVal - minMidi) / this.viewport.midiRange) * h;
      
      const rX = ((rTime - this.viewport.startSec) / viewDur) * w;
      const rY = h - ((rVal - minMidi) / this.viewport.midiRange) * h;

      this.ctx.moveTo(uX, uY);
      this.ctx.lineTo(rX, rY);
    }

    this.ctx.stroke();
  }

  _drawRegions(w, h) {
    const viewDur = this.viewport.endSec - this.viewport.startSec;

    for (const region of this.regions) {
      if (!region.isVisible) continue;

      // Check if visible
      if (region.endSec < this.viewport.startSec || region.startSec > this.viewport.endSec) continue;

      const xStart = Math.max(0, ((region.startSec - this.viewport.startSec) / viewDur) * w);
      const xEnd = Math.min(w, ((region.endSec - this.viewport.startSec) / viewDur) * w);
      const width = xEnd - xStart;

      // Background Highlight
      this.ctx.fillStyle = region.color + '33'; // 20% opacity
      this.ctx.fillRect(xStart, 0, width, h);

      // Border
      this.ctx.strokeStyle = region.color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(xStart, 0);
      this.ctx.lineTo(xStart, h);
      this.ctx.moveTo(xEnd, 0);
      this.ctx.lineTo(xEnd, h);
      this.ctx.stroke();

      // Label & AI Feedback
      this.ctx.fillStyle = region.color;
      this.ctx.font = 'bold 12px sans-serif';
      
      let text = region.label || region.type;
      if (region.type === 'AIErrorAnnotation') text = `🤖 ${region.aiCritique}`;
      if (region.type === 'TeacherCommentAnnotation') text = `🧑‍🏫 ${region.textComment}`;
      if (region.type === 'GamakAnnotation') text = `〰️ Gamak (${region.speedHz.toFixed(1)} Hz)`;
      
      this.ctx.fillText(text, xStart + 5, 20);
    }
  }

  _drawGrid(w, h, saMidi) {
    this.ctx.strokeStyle = '#222222';
    this.ctx.lineWidth = 1;
    this.ctx.font = '10px sans-serif';
    this.ctx.fillStyle = '#666666';

    const minMidi = this.viewport.centerMidi - (this.viewport.midiRange / 2);
    const maxMidi = this.viewport.centerMidi + (this.viewport.midiRange / 2);

    for (let m = Math.floor(minMidi); m <= Math.ceil(maxMidi); m++) {
      // Phase 13: Adjust the Y position based on Shruti Mapping, using Dynamic Sa
      const shrutiMidi = this.scaleEngine.getAdjustedMidi(m, saMidi);
      const y = h - ((shrutiMidi - minMidi) / this.viewport.midiRange) * h;
      
      // Grid line
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();

      // Note label
      const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      const name = noteNames[m % 12] + Math.floor(m / 12 - 1);
      
      // Show cents deviation if it's microtonally shifted
      const shift = Math.round((shrutiMidi - m) * 100);
      const label = shift !== 0 ? `${name} (${shift > 0 ? '+':''}${shift}¢)` : name;
      
      this.ctx.fillText(label, 5, y - 2);
    }
  }

  _drawTrack(track, w, h) {
    const viewDur = this.viewport.endSec - this.viewport.startSec;
    const secPerPixel = viewDur / w;
    
    // Choose LOD based on zoom level
    let activeTrack = track.midiTrack;
    let sampleRate = track.sampleRate;

    if (secPerPixel > 0.1 && track.lod1) {
      activeTrack = track.lod1.avg;
      sampleRate = track.sampleRate / 10;
    }
    if (secPerPixel > 1.0 && track.lod2) {
      activeTrack = track.lod2.avg;
      sampleRate = track.sampleRate / 100;
    }

    if (!activeTrack) return;

    // Set colors based on track type (Phase 9)
    if (track.type === 'ReferencePitchTrack') {
      this.ctx.strokeStyle = '#3b82f6'; // Blue
      this.ctx.lineWidth = 3;
    } else if (track.type === 'UserPitchTrack') {
      this.ctx.strokeStyle = '#10b981'; // Green
      this.ctx.lineWidth = 2;
    } else {
      this.ctx.strokeStyle = '#a855f7'; // Purple fallback
      this.ctx.lineWidth = 2;
    }

    this.ctx.beginPath();
    
    const minMidi = this.viewport.centerMidi - (this.viewport.midiRange / 2);
    let isDrawing = false;

    // Efficient drawing: only loop through visible time range
    const startIndex = Math.max(0, Math.floor(this.viewport.startSec * sampleRate));
    const endIndex = Math.min(activeTrack.length, Math.ceil(this.viewport.endSec * sampleRate));

    for (let i = startIndex; i < endIndex; i++) {
      const val = activeTrack[i];
      if (val === 0) {
        isDrawing = false; // unpitched
        continue;
      }
      
      const t = i / sampleRate;
      const x = ((t - this.viewport.startSec) / viewDur) * w;
      const y = h - ((val - minMidi) / this.viewport.midiRange) * h;

      if (!isDrawing) {
        this.ctx.moveTo(x, y);
        isDrawing = true;
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.stroke();
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

  _renderHTMLOverlays(w, h) {
    const secPerPixel = (this.viewport.endSec - this.viewport.startSec) / w;
    const activeIds = new Set();

    this.regions.forEach((region, index) => {
      // Create a stable ID for the region if it doesn't have one
      if (!region._domId) region._domId = `annot_${index}_${Math.random().toString(36).substring(2, 9)}`;
      activeIds.add(region._domId);

      let el = this.overlayNodes.get(region._domId);
      if (!el) {
        el = document.createElement('div');
        el.className = 'annotation-overlay';
        el.style.position = 'absolute';
        
        // Stagger Y position to avoid overlap based on index
        const yOffset = 10 + (index % 5) * 35;
        el.style.top = `${yOffset}px`;
        
        el.style.height = '30px';
        el.style.backgroundColor = region.type === 'TeacherCommentAnnotation' ? 'rgba(255, 165, 0, 0.8)' : 'rgba(16, 185, 129, 0.5)';
        el.style.border = '1px solid ' + (region.type === 'TeacherCommentAnnotation' ? '#ff8c00' : '#059669');
        el.style.borderRadius = '4px';
        el.style.color = '#ffffff';
        el.style.padding = '4px 8px';
        el.style.fontSize = '12px';
        el.style.fontFamily = 'sans-serif';
        el.style.overflow = 'hidden';
        el.style.whiteSpace = 'nowrap';
        el.style.textOverflow = 'ellipsis';
        el.style.pointerEvents = 'auto'; // Make it interactive
        el.style.boxSizing = 'border-box';
        el.style.userSelect = 'none';

        // Add label
        const span = document.createElement('span');
        span.textContent = region.type === 'TeacherCommentAnnotation' ? `🧑‍🏫 ${region.textComment}` : region.label;
        el.appendChild(span);

        // Priority 8: CRUD & Dragging handles
        if (region.type === 'TeacherCommentAnnotation') {
          el.style.cursor = 'grab';

          // Delete button
          const delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.style.position = 'absolute';
          delBtn.style.right = '4px';
          delBtn.style.top = '4px';
          delBtn.style.background = 'none';
          delBtn.style.border = 'none';
          delBtn.style.color = '#fff';
          delBtn.style.cursor = 'pointer';
          delBtn.style.padding = '0';
          delBtn.style.lineHeight = '1';
          delBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.sessionProject) {
              this.sessionProject.annotations = this.sessionProject.annotations.filter(a => a !== region);
              this.loadProject(this.sessionProject);
              globalEventBus.emit('ANNOTATION_UPDATED');
            }
          };
          el.appendChild(delBtn);

          // Dragging logic
          let isDragging = false;
          let startX = 0;
          let initialStartSec = 0;
          let initialEndSec = 0;
          
          el.onmousedown = (e) => {
            if (e.target === delBtn) return;
            isDragging = true;
            startX = e.clientX;
            initialStartSec = region.startSec;
            initialEndSec = region.endSec;
            el.style.cursor = 'grabbing';
            e.stopPropagation();
          };
          
          window.addEventListener('mouseup', () => { 
            if (isDragging) {
              isDragging = false;
              el.style.cursor = 'grab';
              globalEventBus.emit('ANNOTATION_UPDATED');
            }
          });
          
          window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const shiftSec = dx * ((this.viewport.endSec - this.viewport.startSec) / this.canvas.width);
            region.startSec = initialStartSec + shiftSec;
            region.endSec = initialEndSec + shiftSec;
            this.render(); // Re-render to update DOM position immediately
          });

          // Double click to edit
          el.ondblclick = (e) => {
            e.stopPropagation();
            this._showCommentInput(e.clientX, e.clientY, region.textComment, (newText) => {
              if (newText && newText !== region.textComment) {
                region.textComment = newText;
                span.textContent = `🧑‍🏫 ${newText}`;
                globalEventBus.emit('ANNOTATION_UPDATED');
              }
            });
          };
        }

        this.overlay.appendChild(el);
        this.overlayNodes.set(region._domId, el);
      }

      // Update position dynamically
      const xPx = (region.startSec - this.viewport.startSec) / secPerPixel;
      const widthPx = (region.endSec - region.startSec) / secPerPixel;
      
      el.style.left = `${xPx}px`;
      el.style.width = `${Math.max(widthPx, 30)}px`; // Minimum width 30px
      
      // Hide if outside viewport
      if (xPx + widthPx < 0 || xPx > w) {
        el.style.display = 'none';
      } else {
        el.style.display = 'block';
      }
    });

    // Cleanup removed annotations
    for (const [id, el] of this.overlayNodes.entries()) {
      if (!activeIds.has(id)) {
        el.remove();
        this.overlayNodes.delete(id);
      }
    }
  }
}
